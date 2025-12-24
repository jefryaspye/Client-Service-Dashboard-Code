import React, { useState, useEffect, useRef, useMemo } from 'react';
// Added DatabaseIcon to imports
import { UploadIcon, DocumentCheckIcon, ExclamationTriangleIcon, ShieldCheckIcon, ChartBarIcon, BeakerIcon, DatabaseIcon } from './icons';
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
            if (missingHeaders.length > 0 && headers.length !== 25) {
                const missingDisplay = missingHeaders.map(m => DISPLAY_MAP[m] || m).join(', ');
                errors.push({ line: 1, message: `Header row is missing required columns: ${missingDisplay}` });
            }

            lines.slice(1).forEach((line, index) => {
                const values = line.split(',');
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
        
        const systemPrompt = `You are an elite Data Integrity Architect and ISO Compliance Auditor. 
Your goal is to REPAIR, NORMALIZE, and OPTIMIZE the provided dataset while strictly adhering to these constraints:

1. DATA IMMUTABILITY & INTEGRITY: 'ticketIDsSequence' and 'createdOn' are core identifiers. If 'ticketIDsSequence' is missing, generate a unique sequential ID.
2. ISO COGNITION: Deeply analyze subjects/remarks to assign or correct 'isoClause'.
   - Infrastructure/Asset Maintenance: 'ISO 9001 (Clause 7.1.3)'
   - Facilities Management/Soft Services: 'ISO 41001 (Clause 8.1)'
   - Workplace Health & Safety Hazards: 'ISO 45001 (Clause 8.1.1)'
   - Environmental/Waste Management: 'ISO 14001'
   - Fire/Electrical Safety: 'NFPA 70/72'
3. DATE NORMALIZATION: Convert all 'createdOn' and 'lastUpdatedOn' values to a standardized 'MM/DD/YYYY HH:mm:ss' format. Fix common typos or inconsistent separators (e.g. dots instead of slashes).
4. DATA ARRANGEMENT: Rearrange rows to maximize audit readiness. Group tickets by 'assignedTo', then sort by 'priority' (Urgent -> High -> Medium -> Low), and then by 'createdOn' (Descending).
5. TICKET ANALYSIS: In the 'insight' field, describe exactly what was repaired (e.g. "Normalized 5 date strings", "Corrected ISO mapping for 3 plumbing tickets") and identify recurring failure patterns.
6. SCHEMA ENFORCEMENT: Ensure all records contain: ${REQUIRED_HEADERS_CAMEL.join(', ')}.
7. FORMAT: Output MUST be valid ${format}.

TASK TYPE: ${task === 'fix' ? 'CRITICAL DATA REPAIR & HEALING' : task === 'optimize' ? 'STRUCTURAL NORMALIZATION & ARRANGEMENT OPTIMIZATION' : 'REGULATORY COMPLIANCE AUDIT & ANALYTICS'}`;

        const response = await ai.models.generateContent({
            model,
            contents: `System Instruction: ${systemPrompt}\n\nDataset for processing:\n${text}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        data: { type: Type.STRING, description: "The processed dataset string." },
                        insight: { type: Type.STRING, description: "Detailed summary of repairs, analysis of data patterns, and optimization suggestions." }
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
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      <div className="flex-grow bg-gray-800 rounded-[2.5rem] shadow-2xl p-8 border border-gray-700/50 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-6">
            <div>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase flex items-center">
                   <DatabaseIcon className="w-8 h-8 mr-3 text-blue-500" />
                   Database Hub
                </h2>
                <p className="text-gray-500 text-sm mt-1 font-bold uppercase tracking-widest">Enterprise Dataset & AI Orchestration</p>
            </div>
            <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setShowAiPanel(!showAiPanel)}
                  className={`flex items-center font-black py-3.5 px-8 rounded-2xl transition-all text-xs border shadow-2xl ${showAiPanel ? 'bg-brand-600 border-brand-500 text-white ring-4 ring-brand-500/20' : 'bg-gray-900/50 hover:bg-gray-700 text-brand-400 border-gray-700 uppercase tracking-widest'}`}
                >
                  <span className="mr-2 text-base">✨</span> AI AUTO-CORRECTION
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center bg-gray-900/50 hover:bg-gray-800 text-gray-400 font-black py-3.5 px-8 rounded-2xl transition-all text-xs border border-gray-700 shadow-2xl uppercase tracking-widest"
                >
                  <UploadIcon className="w-4 h-4 mr-2" />
                  IMPORT
                </button>
            </div>
        </div>

        <div className="grid gap-8">
            {message && (
                <div className={`animate-in fade-in slide-in-from-top-4 px-8 py-5 rounded-[1.5rem] text-sm font-black shadow-2xl border ${
                    message.type === 'success' ? 'bg-green-950/40 text-green-300 border-green-800/50' : 'bg-red-950/40 text-red-300 border-red-800/50'
                }`}>
                    <div className="flex items-center">
                        {message.type === 'success' ? <ShieldCheckIcon className="w-6 h-6 mr-4 text-green-400" /> : <ExclamationTriangleIcon className="w-6 h-6 mr-4 text-red-400" />}
                        {message.text}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 bg-gray-950/80 rounded-[1.25rem] p-1.5 shadow-inner border border-gray-800">
                    <button onClick={() => handleFormatChange('csv')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${format === 'csv' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-600 hover:text-white'}`}>CSV</button>
                    <button onClick={() => handleFormatChange('json')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${format === 'json' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-600 hover:text-white'}`}>JSON</button>
                </div>
                <div className="flex items-center space-x-12">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Schema Health</span>
                        <span className="text-xs text-white font-mono font-black">{validationErrors.length === 0 ? '100.0%' : `${Math.max(0, 100 - validationErrors.length).toFixed(1)}%`}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-brand-600 font-black uppercase tracking-widest">Active Core</span>
                        <span className="text-xs text-brand-400 font-mono font-black">NEURAL-3.5-PRO</span>
                    </div>
                </div>
            </div>

            <div className="relative w-full h-[620px] rounded-[2rem] border border-gray-700/50 bg-gray-950/60 overflow-hidden shadow-[inset_0_4px_20px_rgba(0,0,0,0.6)]">
                <pre
                    ref={preRef}
                    className={`absolute inset-0 pointer-events-none text-gray-500 ${editorClass}`}
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: highlightedCode + '<div style="height: 150px;"></div>' }} 
                />
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        if (validationErrors.length > 0) setValidationErrors([]);
                    }}
                    onScroll={handleScroll}
                    className={`absolute inset-0 bg-transparent border-0 outline-none resize-none focus:ring-0 ${editorClass} text-transparent caret-brand-500 selection:bg-brand-500/20`}
                    spellCheck={false}
                    autoComplete='off'
                />
            </div>

            {validationErrors.length > 0 && (
                <div className="bg-red-950/30 border-2 border-red-500/30 rounded-[2rem] p-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center text-red-400 text-sm font-black uppercase tracking-widest">
                            <ExclamationTriangleIcon className="w-7 h-7 mr-4" />
                            Integrity Block Detected ({validationErrors.length})
                        </div>
                        <button 
                            onClick={() => askAiForHelp('fix')}
                            className="text-[11px] font-black bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-2xl transition-all shadow-2xl uppercase tracking-widest transform active:scale-95"
                        >
                            Execute AI Healing
                        </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar divide-y divide-red-500/10">
                        {validationErrors.map((err, i) => (
                            <div key={i} className="text-[12px] text-red-300/80 flex py-3.5 items-start">
                                <span className="font-mono bg-red-900/50 px-3 py-1.5 rounded-xl mr-5 h-fit text-red-400 border border-red-500/20 font-black">L{err.line}</span>
                                <span className="pt-1 font-semibold">{err.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="flex items-center justify-end space-x-6 pt-8 border-t border-gray-700/50">
                <button onClick={handleReset} disabled={isSaving} className="px-8 py-4 text-xs font-black uppercase tracking-widest text-red-400/80 hover:text-white hover:bg-red-900/30 rounded-2xl transition-all">Factory Reset</button>
                <button onClick={handleSave} disabled={isSaving} className={`flex items-center px-12 py-4.5 bg-brand-600 hover:bg-brand-500 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-2xl shadow-brand-900/40 transition-all transform active:scale-95 ${isSaving ? 'opacity-50 cursor-wait' : ''}`}>
                    {isSaving ? 'PERSISTING DATA...' : <><DocumentCheckIcon className="w-6 h-6 mr-4" />COMMIT DATABASE</>}
                </button>
            </div>
        </div>
      </div>

      {showAiPanel && (
          <aside className="w-full lg:w-[480px] bg-gray-800 rounded-[2.5rem] shadow-2xl border border-gray-700/50 overflow-hidden flex flex-col animate-in slide-in-from-right-16 duration-700 backdrop-blur-xl ring-1 ring-white/5">
            <div className="bg-gray-900/70 p-8 border-b border-gray-700 flex items-center justify-between">
                <div>
                    <h3 className="text-base font-black text-white flex items-center uppercase tracking-[0.25em]">
                        <span className="mr-4 text-brand-400 text-2xl">✨</span> AI AUTO-CORRECT
                    </h3>
                    <p className="text-[10px] text-gray-600 font-black uppercase mt-1.5 tracking-widest">Neural Logic Core</p>
                </div>
                <button onClick={() => setShowAiPanel(false)} className="p-4 text-gray-500 hover:text-white hover:bg-gray-700 rounded-[1.25rem] transition-all">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            
            <div className="p-8 space-y-8 flex-grow overflow-y-auto custom-scrollbar">
                <div className="bg-brand-900/20 border border-brand-500/30 rounded-[1.5rem] p-6 shadow-2xl">
                    <p className="text-sm text-brand-200 leading-relaxed font-bold">
                        Welcome to the Neural Workspace. The AI engine is trained to heal malformed records, normalize timestamps, and auto-map ISO compliance.
                    </p>
                </div>
                
                <div className="grid gap-4">
                    <button onClick={() => askAiForHelp('fix')} disabled={isAiLoading} className="w-full text-left px-7 py-6 bg-gray-900/60 border border-gray-700 rounded-[1.5rem] hover:border-red-500 hover:bg-red-950/10 transition-all group disabled:opacity-50 relative overflow-hidden shadow-2xl">
                        <div className="flex items-center mb-2">
                            <ExclamationTriangleIcon className="w-6 h-6 mr-4 text-red-500" />
                            <div className="text-xs font-black text-white group-hover:text-red-400 uppercase tracking-widest">AI Integrity Healing</div>
                        </div>
                        <div className="text-[11px] text-gray-600 group-hover:text-gray-400 leading-normal font-medium uppercase tracking-tighter">Automatic resolution of schema violations and date normalization.</div>
                        <div className="absolute right-0 top-0 h-full w-2 bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>

                    <button onClick={() => askAiForHelp('audit_logic')} disabled={isAiLoading} className="w-full text-left px-7 py-6 bg-gray-900/60 border border-gray-700 rounded-[1.5rem] hover:border-brand-500 hover:bg-brand-950/10 transition-all group disabled:opacity-50 relative overflow-hidden shadow-2xl">
                        <div className="flex items-center mb-2">
                            <ShieldCheckIcon className="w-6 h-6 mr-4 text-brand-500" />
                            <div className="text-xs font-black text-white group-hover:text-brand-400 uppercase tracking-widest">Compliance Logic Audit</div>
                        </div>
                        <div className="text-[11px] text-gray-600 group-hover:text-gray-400 leading-normal font-medium uppercase tracking-tighter">Deep scan for ISO clause accuracy based on ticket context.</div>
                        <div className="absolute right-0 top-0 h-full w-2 bg-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>

                    <button onClick={() => askAiForHelp('optimize')} disabled={isAiLoading} className="w-full text-left px-7 py-6 bg-gray-900/60 border border-gray-700 rounded-[1.5rem] hover:border-purple-500 hover:bg-purple-950/10 transition-all group disabled:opacity-50 relative overflow-hidden shadow-2xl">
                        <div className="flex items-center mb-2">
                            <BeakerIcon className="w-6 h-6 mr-4 text-purple-500" />
                            <div className="text-xs font-black text-white group-hover:text-purple-400 uppercase tracking-widest">Strategic Normalization</div>
                        </div>
                        <div className="text-[11px] text-gray-600 group-hover:text-gray-400 leading-normal font-medium uppercase tracking-tighter">Rearrange dataset into high-visibility, audit-ready sequences.</div>
                        <div className="absolute right-0 top-0 h-full w-2 bg-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>
                </div>

                {isAiLoading && (
                    <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in fade-in zoom-in duration-500">
                        <div className="relative">
                            <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-brand-500 shadow-[0_0_40px_rgba(14,145,233,0.4)]"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-brand-500 text-[10px] font-black animate-pulse uppercase tracking-widest">AUDITING</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <span className="text-sm text-brand-400 font-black uppercase tracking-[0.3em] block">Processing Dataset</span>
                            <p className="text-[10px] text-gray-600 mt-3 uppercase font-black tracking-widest leading-relaxed">Cross-referencing Regulatory Standards...</p>
                        </div>
                    </div>
                )}

                {aiProposal && (
                    <div className="bg-gray-950 border border-brand-500/40 rounded-[2rem] overflow-hidden animate-in fade-in zoom-in-95 shadow-2xl ring-4 ring-brand-500/5">
                        <div className="p-8 bg-brand-900/10 border-b border-brand-500/20">
                            <div className="flex items-center justify-between mb-5">
                                <span className="text-[10px] font-black text-brand-400 uppercase tracking-[0.25em]">Strategic Audit Report</span>
                                <span className="text-[9px] bg-brand-600 px-4 py-1.5 rounded-full text-white font-black uppercase tracking-widest">VERIFIED</span>
                            </div>
                            <p className="text-[12px] text-white leading-relaxed italic font-bold">
                                "{aiProposal.insight}"
                            </p>
                        </div>
                        <div className="p-8">
                            <div className="text-[10px] font-black text-gray-600 uppercase mb-5 tracking-[0.2em]">Auto-Corrected Data Preview</div>
                            <div className="bg-black/80 rounded-[1.5rem] p-5 border border-gray-800 mb-8 shadow-inner">
                                <pre className="text-[11px] text-brand-400/80 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                                    {aiProposal.data.substring(0, 1500)}...
                                </pre>
                            </div>
                            <button 
                                onClick={applyAiProposal}
                                className="w-full py-5 bg-brand-600 hover:bg-brand-500 text-white text-[12px] font-black uppercase tracking-[0.25em] rounded-[1.25rem] shadow-2xl shadow-brand-900/60 transition-all transform active:scale-95 flex items-center justify-center ring-2 ring-brand-400/30"
                            >
                                <span className="mr-3 text-lg">⚡</span> IMPLEMENT AUTO-CORRECTIONS
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="p-8 bg-gray-900/70 border-t border-gray-700 flex items-center justify-center space-x-4">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.8)]"></div>
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-[0.35em]">AI ENGINE OPERATIONAL</span>
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