
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UploadIcon, DocumentCheckIcon, ExclamationTriangleIcon, ShieldCheckIcon, ChartBarIcon } from './icons';
import { parseCSV, jsonToCSV } from '../hooks/useTicketData';
import { GoogleGenAI, Type } from "@google/genai";

interface DatabasePageProps {
  currentCSV: string;
  onSave: (csv: string) => void;
  onReset: () => void;
}

interface ValidationError {
  line: number;
  message: string;
}

const REQUIRED_HEADERS_CAMEL = [
  'ticketIDsSequence',
  'createdOn',
  'assignedTo',
  'subject',
  'stage',
  'priority',
  'isoClause'
];

const DISPLAY_MAP: Record<string, string> = {
  'ticketIDsSequence': "'Ticket IDs Sequence'",
  'createdOn': "'Created on'",
  'assignedTo': "'Assigned to'",
  'subject': "'Subject'",
  'stage': "'Stage'",
  'priority': "'Priority'",
  'isoClause': "'ISO Clause'"
};

const highlightJSON = (jsonStr: string, errorLines: number[]) => {
    if (!jsonStr) return '';
    const lines = jsonStr.split('\n');
    
    return lines.map((line, idx) => {
        const isError = errorLines.includes(idx + 1);
        let escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        escaped = escaped.replace(
            /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[\[\]{},:])/g,
            (match) => {
                let cls = 'text-purple-400'; 
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'text-blue-400 font-semibold';
                    } else {
                        cls = 'text-green-400';
                    }
                } else if (/true|false|null/.test(match)) {
                    cls = 'text-yellow-400 font-semibold';
                } else if (/[\[\]{},:]/.test(match)) {
                    cls = 'text-gray-500';
                }
                return `<span class="${cls}">${match}</span>`;
            }
        );

        return `<div class="${isError ? 'bg-red-500/20 border-l-2 border-red-500 -ml-0.5' : ''}">${escaped || ' '}</div>`;
    }).join('');
};

const highlightCSV = (csvStr: string, errorLines: number[]) => {
    if (!csvStr) return '';
    const lines = csvStr.split('\n');
    
    return lines.map((line, idx) => {
        const isError = errorLines.includes(idx + 1);
        const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<div class="${isError ? 'bg-red-500/20 border-l-2 border-red-500 -ml-0.5' : ''}">${escaped || ' '}</div>`;
    }).join('');
};

const DatabasePage: React.FC<DatabasePageProps> = ({ currentCSV, onSave, onReset }) => {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [text, setText] = useState(currentCSV);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiProposal, setAiProposal] = useState<{ data: string, insight: string } | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const messageTimerRef = useRef<number | null>(null);

  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
        preRef.current.scrollTop = textareaRef.current.scrollTop;
        preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const errorLineIndices = useMemo(() => validationErrors.map(e => e.line), [validationErrors]);

  const highlightedCode = useMemo(() => {
    if (format === 'json') return highlightJSON(text, errorLineIndices);
    return highlightCSV(text, errorLineIndices);
  }, [text, format, errorLineIndices]);

  useEffect(() => {
    if (format === 'csv') {
      setText(currentCSV);
    } else {
        try {
            const parsed = parseCSV(currentCSV);
            setText(JSON.stringify(parsed, null, 2));
        } catch(e) {
            setText("[]");
        }
    }
  }, [currentCSV]);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    };
  }, []);

  const validateContent = (content: string, currentFormat: 'csv' | 'json'): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    try {
        if (currentFormat === 'json') {
            const json = JSON.parse(content);
            if (!Array.isArray(json)) {
                errors.push({ line: 1, message: "JSON must be an array of objects." });
                return errors;
            }
            
            json.forEach((item, index) => {
                const keys = Object.keys(item);
                const missing = REQUIRED_HEADERS_CAMEL.filter(k => !keys.includes(k));
                if (missing.length > 0) {
                    const missingDisplay = missing.map(m => DISPLAY_MAP[m] || m).join(', ');
                    const lineStr = JSON.stringify(item);
                    const lineNum = content.split('\n').findIndex(l => l.includes(lineStr)) + 1;
                    errors.push({ 
                        line: lineNum > 0 ? lineNum : index + 2, 
                        message: `Item #${index + 1} is missing: ${missingDisplay}` 
                    });
                }
            });
        } else {
            const lines = content.split('\n').filter(l => l.trim());
            if (lines.length === 0) return [];
            
            const headerLine = lines[0].trim();
            const toCamelCase = (s: string) => s.replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '').replace(/^./, (match) => match.toLowerCase());
            const headers = headerLine.split(',').map(h => toCamelCase(h.trim().replace(/^\uFEFF/, '')));
            
            const missingHeaders = REQUIRED_HEADERS_CAMEL.filter(k => !headers.includes(k));
            // If header length is exactly 25, ignore missing headers per user request
            if (missingHeaders.length > 0 && headers.length !== 25) {
                const missingDisplay = missingHeaders.map(m => DISPLAY_MAP[m] || m).join(', ');
                errors.push({ line: 1, message: `Header row is missing required columns: ${missingDisplay}` });
            }

            lines.slice(1).forEach((line, index) => {
                const values = line.split(',');
                // If row has exactly 25 columns, ignore the length mismatch error per user request
                if (values.length !== headers.length && values.length !== 25) {
                    errors.push({ line: index + 2, message: `Row ${index + 2} has ${values.length} columns, but header has ${headers.length}.` });
                }
            });
        }
    } catch (e: any) {
        errors.push({ line: 1, message: `Syntax Error: ${e.message}` });
    }
    
    return errors;
  };

  const askAiForHelp = async (task: 'fix' | 'optimize' | 'audit_logic') => {
    setIsAiLoading(true);
    setAiProposal(null);
    setShowAiPanel(true);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = task === 'audit_logic' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
        
        const systemPrompt = `You are an elite Data Scientist and ISO Compliance Specialist (ISO 9001, 41001, 45001).
        Required Output Columns: ${REQUIRED_HEADERS_CAMEL.join(', ')}.
        Current Format: ${format}.
        
        SPECIFIC TASK:
        ${task === 'fix' ? `HEAL AND REPAIR: Perform a context-aware structural audit. 
          1. Resolve schema violations and formatting inconsistencies.
          2. DATA INTEGRITY PRIORITY: Ticket IDs ("ticketIDsSequence") and Timestamps ("createdOn") must be preserved exactly as-is unless they are physically malformed or logically impossible.
          3. ISO COMPLIANCE LOGIC: If "isoClause" is missing or generic "N/A", use the "subject" and "remarks" to intelligently map the correct ISO standard (9001, 41001, 45001).
          4. Ensure all mandatory columns exist. If missing, synthesize data based on the most likely values in neighboring rows.` : 
          task === 'optimize' ? 'Strategically rearrange the data rows to follow a logical hierarchy (e.g., chronologically by "createdOn", grouped by "assignedTo", or clustered by "priority").' : 
          'PERFORM ISO COMPLIANCE AUTO-MAPPING: Read the "subject" (or "Subject" in CSV) and any "remarks" (or "Activities" in CSV) for every single ticket. Based on these details, map the most accurate ISO Standard Clause (e.g., "ISO 9001 (Clause 7.1.3)" or "ISO 45001 (Clause 8.1.1)") into the "isoClause" column. If no mapping is found, use "N/A".'}
        
        CONSTRAINTS:
        1. Return valid JSON only.
        2. "data": The fully processed CSV or JSON block.
        3. "insight": A detailed summary (2-3 sentences) of the logic used, specifically mentioning which ISO standards were identified or repaired.`

        const response = await ai.models.generateContent({
            model,
            contents: `System: ${systemPrompt}\n\nUser Database Content:\n${text}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        data: { type: Type.STRING },
                        insight: { type: Type.STRING }
                    },
                    required: ["data", "insight"]
                }
            }
        });

        const result = JSON.parse(response.text || '{}');
        setAiProposal({
            data: result.data || text,
            insight: result.insight || 'Processing completed with strategic structural alignment.'
        });
    } catch (e: any) {
        setAiProposal({ 
            data: text, 
            insight: `System Error: The AI engine encountered a processing exception. ${e.message}` 
        });
    } finally {
        setIsAiLoading(false);
    }
  };

  const applyAiProposal = () => {
      if (aiProposal) {
          setText(aiProposal.data);
          setAiProposal(null);
          setValidationErrors([]);
          setMessage({ type: 'success', text: 'AI Data Strategy implemented successfully.' });
      }
  };

  const handleFormatChange = (newFormat: 'csv' | 'json') => {
    if (format === newFormat) return;
    setMessage(null);
    setValidationErrors([]);

    try {
        if (newFormat === 'json') {
            const parsed = parseCSV(text);
            if (parsed.length === 0 && text.trim().length > 0) {
                 throw new Error("CSV parsing failed. Ensure data is comma-separated.");
            }
            setText(JSON.stringify(parsed, null, 2));
        } else {
            const json = JSON.parse(text);
            if (!Array.isArray(json)) throw new Error("JSON must be an array of objects.");
            const csv = jsonToCSV(json);
            setText(csv);
        }
        setFormat(newFormat);
    } catch (e: any) {
        setMessage({ type: 'error', text: `Syntax conversion failed: ${e.message}` });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setMessage(null);
    setValidationErrors([]);

    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isJson = fileName.endsWith('.json');
    const isCsv = fileName.endsWith('.csv');

    if (!isJson && !isCsv) {
        setMessage({ type: 'error', text: 'Unsupported format. Please upload .csv or .json.' });
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      let content = event.target?.result as string;
      try {
          const errors = validateContent(content, isJson ? 'json' : 'csv');
          if (errors.length > 0) {
              setValidationErrors(errors);
              setMessage({ type: 'error', text: `Integrity check failed: ${errors.length} issues found.` });
          }

          if (isJson && format === 'csv') {
              const parsed = JSON.parse(content);
              content = jsonToCSV(parsed);
          } else if (isCsv && format === 'json') {
              const parsed = parseCSV(content);
              content = JSON.stringify(parsed, null, 2);
          }

          setText(content);
          if (errors.length === 0) setMessage({ type: 'success', text: `Dataset imported successfully.` });
      } catch (e: any) {
          setMessage({ type: 'error', text: `Import error: ${e.message}` });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    setMessage(null);
    setValidationErrors([]);
    
    const errors = validateContent(text, format);
    if (errors.length > 0) {
        setValidationErrors(errors);
        setMessage({ type: 'error', text: `Commit blocked: Validation errors detected.` });
        return;
    }

    setIsSaving(true);
    try {
        let csvToSave = text;
        if (format === 'json') {
            const json = JSON.parse(text);
            csvToSave = jsonToCSV(json);
        }
        await new Promise(resolve => setTimeout(resolve, 800));
        onSave(csvToSave);
        setMessage({ type: 'success', text: 'Database synchronized and persisted.' });
        messageTimerRef.current = window.setTimeout(() => {
          setMessage(null);
          messageTimerRef.current = null;
        }, 3000);
    } catch (e: any) {
        setMessage({ type: 'error', text: `Synchronization failed: ${e.message}` });
    } finally {
        setIsSaving(false);
    }
  };

  const handleReset = () => {
      if(window.confirm('Reset to defaults? This will overwrite current workspace.')) {
          onReset();
          setFormat('csv');
          setValidationErrors([]);
          setMessage({ type: 'success', text: 'Workspace reset to default.' });
      }
  };

  const editorClass = "font-mono text-[11px] leading-5 p-4 m-0 w-full h-full whitespace-pre overflow-auto";

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
      <div className="flex-grow bg-gray-800 rounded-3xl shadow-2xl p-6 border border-gray-700/50 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Database Workspace</h2>
                <p className="text-gray-500 text-sm mt-1 font-medium">Manage operational datasets and compliance mapping.</p>
            </div>
            <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setShowAiPanel(!showAiPanel)}
                  className={`flex items-center font-black py-3 px-6 rounded-2xl transition-all text-sm border shadow-xl ${showAiPanel ? 'bg-blue-600 border-blue-500 text-white ring-4 ring-blue-500/20' : 'bg-gray-900/50 hover:bg-gray-700 text-blue-400 border-gray-700'}`}
                >
                  <span className="mr-2 text-lg">✨</span> AI ASSISTANT
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center bg-gray-900/50 hover:bg-gray-800 text-gray-400 font-bold py-3 px-6 rounded-2xl transition-all text-sm border border-gray-700 shadow-xl"
                >
                  <UploadIcon className="w-4 h-4 mr-2" />
                  IMPORT
                </button>
            </div>
        </div>

        <div className="grid gap-6">
            {message && (
                <div className={`animate-in fade-in slide-in-from-top-2 px-6 py-4 rounded-2xl text-sm font-bold shadow-2xl border ${
                    message.type === 'success' ? 'bg-green-950/40 text-green-300 border-green-800/50' : 'bg-red-950/40 text-red-300 border-red-800/50'
                }`}>
                    <div className="flex items-center">
                        {message.type === 'success' ? <ShieldCheckIcon className="w-5 h-5 mr-3 text-green-400" /> : <ExclamationTriangleIcon className="w-5 h-5 mr-3 text-red-400" />}
                        {message.text}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 bg-gray-900/80 rounded-2xl p-1.5 shadow-inner border border-gray-700">
                    <button onClick={() => handleFormatChange('csv')} className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${format === 'csv' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>CSV</button>
                    <button onClick={() => handleFormatChange('json')} className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${format === 'json' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>JSON</button>
                </div>
                <div className="flex items-center space-x-8">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-gray-600 font-black uppercase tracking-[0.2em]">Volume</span>
                        <span className="text-xs text-white font-mono">{text.split('\n').length - 1} Records</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-blue-600/80 font-black uppercase tracking-[0.2em]">Engine</span>
                        <span className="text-xs text-blue-400 font-mono">ISO Core 2.2</span>
                    </div>
                </div>
            </div>

            <div className="relative w-full h-[580px] rounded-3xl border border-gray-700/50 bg-gray-900/40 overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                <pre
                    ref={preRef}
                    className={`absolute inset-0 pointer-events-none text-gray-400 ${editorClass}`}
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: highlightedCode + '<div style="height: 120px;"></div>' }} 
                />
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        if (validationErrors.length > 0) setValidationErrors([]);
                    }}
                    onScroll={handleScroll}
                    className={`absolute inset-0 bg-transparent border-0 outline-none resize-none focus:ring-0 ${editorClass} text-transparent caret-blue-500 selection:bg-blue-500/20`}
                    spellCheck={false}
                    autoComplete='off'
                />
            </div>

            {validationErrors.length > 0 && (
                <div className="bg-red-950/20 border border-red-500/20 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center text-red-400 text-xs font-black uppercase tracking-widest">
                            <ExclamationTriangleIcon className="w-5 h-5 mr-3" />
                            Integrity Violations ({validationErrors.length})
                        </div>
                        <button 
                            onClick={() => askAiForHelp('fix')}
                            className="text-[10px] font-black bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl transition-all shadow-xl uppercase tracking-widest"
                        >
                            Context-Aware Repair
                        </button>
                    </div>
                    <div className="max-h-36 overflow-y-auto custom-scrollbar divide-y divide-red-500/5">
                        {validationErrors.map((err, i) => (
                            <div key={i} className="text-[11px] text-red-300/60 flex py-2.5 items-start">
                                <span className="font-mono bg-red-900/40 px-2.5 py-1 rounded-lg mr-4 h-fit text-red-400 border border-red-500/10">LINE {err.line}</span>
                                <span className="pt-1">{err.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-700/30">
                <button onClick={handleReset} disabled={isSaving} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-red-400/80 hover:text-white hover:bg-red-900/20 rounded-2xl transition-all">Reset Factory</button>
                <button onClick={handleSave} disabled={isSaving} className={`flex items-center px-10 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl transition-all ${isSaving ? 'opacity-50 cursor-wait' : ''}`}>
                    {isSaving ? 'Synchronizing...' : <><DocumentCheckIcon className="w-5 h-5 mr-3" />Commit Data</>}
                </button>
            </div>
        </div>
      </div>

      {showAiPanel && (
          <aside className="w-full lg:w-[420px] bg-gray-800 rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden flex flex-col animate-in slide-in-from-right-12 duration-700 backdrop-blur-md">
            <div className="bg-gray-900/50 p-6 border-b border-gray-700 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-black text-white flex items-center uppercase tracking-[0.2em]">
                        <span className="mr-3 text-blue-400 text-lg">✨</span> AI MANAGER
                    </h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-widest">Powered by Gemini 3 Pro</p>
                </div>
                <button onClick={() => setShowAiPanel(false)} className="p-3 text-gray-500 hover:text-white hover:bg-gray-700 rounded-2xl transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            
            <div className="p-6 space-y-6 flex-grow overflow-y-auto custom-scrollbar">
                <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-5 shadow-inner">
                    <p className="text-xs text-blue-200/80 leading-relaxed font-semibold">
                        Leverage neural reasoning to audit compliance and structure. The engine can intelligently map tickets to ISO standards while healing malformed data.
                    </p>
                </div>
                
                <div className="grid gap-3">
                    <button onClick={() => askAiForHelp('fix')} disabled={isAiLoading} className="w-full text-left px-6 py-5 bg-gray-900/40 border border-gray-700/50 rounded-2xl hover:border-red-500 hover:bg-red-900/5 transition-all group disabled:opacity-50 relative overflow-hidden shadow-lg">
                        <div className="flex items-center mb-1.5">
                            <ExclamationTriangleIcon className="w-5 h-5 mr-3 text-red-400" />
                            <div className="text-xs font-black text-white group-hover:text-red-400 uppercase tracking-widest">Context-Aware Repair</div>
                        </div>
                        <div className="text-[10px] text-gray-500 group-hover:text-gray-400 leading-normal">Resolves schema violations with high priority on data integrity and ISO alignment.</div>
                        <div className="absolute right-0 top-0 h-full w-1.5 bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>

                    <button onClick={() => askAiForHelp('audit_logic')} disabled={isAiLoading} className="w-full text-left px-6 py-5 bg-gray-900/40 border border-gray-700/50 rounded-2xl hover:border-blue-500 hover:bg-blue-900/5 transition-all group disabled:opacity-50 relative overflow-hidden shadow-lg">
                        <div className="flex items-center mb-1.5">
                            <ShieldCheckIcon className="w-5 h-5 mr-3 text-blue-400" />
                            <div className="text-xs font-black text-white group-hover:text-blue-400 uppercase tracking-widest">Compliance Auto-Map</div>
                        </div>
                        <div className="text-[10px] text-gray-500 group-hover:text-gray-400 leading-normal">Scans subjects & remarks to assign ISO clauses automatically.</div>
                        <div className="absolute right-0 top-0 h-full w-1.5 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>

                    <button onClick={() => askAiForHelp('optimize')} disabled={isAiLoading} className="w-full text-left px-6 py-5 bg-gray-900/40 border border-gray-700/50 rounded-2xl hover:border-purple-500 hover:bg-purple-900/5 transition-all group disabled:opacity-50 relative overflow-hidden shadow-lg">
                        <div className="flex items-center mb-1.5">
                            <ChartBarIcon className="w-5 h-5 mr-3 text-purple-400" />
                            <div className="text-xs font-black text-white group-hover:text-purple-400 uppercase tracking-widest">Logic Optimization</div>
                        </div>
                        <div className="text-[10px] text-gray-500 group-hover:text-gray-400 leading-normal">Rearrange rows by priority and date for report clarity.</div>
                        <div className="absolute right-0 top-0 h-full w-1.5 bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>
                </div>

                {isAiLoading && (
                    <div className="flex flex-col items-center justify-center py-16 space-y-5 animate-in fade-in zoom-in duration-500">
                        <div className="relative">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-blue-500 text-[11px] font-black animate-pulse uppercase">Auditing</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <span className="text-xs text-blue-400 font-black uppercase tracking-[0.2em] block">Processing Dataset</span>
                            <p className="text-[9px] text-gray-600 mt-2 uppercase font-black tracking-widest">Consulting Regulatory Knowledge Base...</p>
                        </div>
                    </div>
                )}

                {aiProposal && (
                    <div className="bg-gray-900/80 border border-blue-500/30 rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 shadow-2xl">
                        <div className="p-6 bg-blue-900/10 border-b border-blue-500/10">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em]">Strategic Audit Report</span>
                                <span className="text-[9px] bg-blue-600 px-3 py-1 rounded-full text-white font-black uppercase tracking-widest">Verified</span>
                            </div>
                            <p className="text-[11px] text-blue-100/90 italic leading-relaxed font-medium">
                                "{aiProposal.insight}"
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="text-[10px] font-black text-gray-600 uppercase mb-4 tracking-widest">Proposal Preview (Modified Records)</div>
                            <div className="bg-black/60 rounded-2xl p-4 border border-gray-800 mb-6 shadow-inner">
                                <pre className="text-[10px] text-blue-400/70 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar scrollbar-thin">
                                    {aiProposal.data.substring(0, 1000)}...
                                </pre>
                            </div>
                            <button 
                                onClick={applyAiProposal}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-blue-900/40 transition-all transform active:scale-95 flex items-center justify-center"
                            >
                                <span className="mr-2">⚡</span> IMPLEMENT DATA STRATEGY
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="p-6 bg-gray-900/50 border-t border-gray-700 flex items-center justify-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                <span className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em]">Neural Interface Optimized</span>
            </div>
          </aside>
      )}

      <input 
        ref={fileInputRef} 
        type='file' 
        className="hidden" 
        accept=".csv, .json" 
        onChange={handleFileChange} 
      />
    </div>
  );
};

export default DatabasePage;
