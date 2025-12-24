import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UploadIcon, DocumentCheckIcon, ExclamationTriangleIcon, ShieldCheckIcon, ChartBarIcon, BeakerIcon, DatabaseIcon, ChevronRightIcon, SwitchVerticalIcon, DownloadIcon } from './icons';
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

interface LogicSuggestion {
  type: 'compliance' | 'optimization' | 'data_integrity';
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  affectedIds?: string[];
}

interface IsoSuggestion {
  ticketId: string;
  subject: string;
  currentClause: string;
  suggestedClause: string;
  reason: string;
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
                    if (/:$/.test(match)) cls = 'text-blue-400 font-semibold';
                    else cls = 'text-green-400';
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

const DRAFT_TEXT_KEY = 'db_editor_draft_text';
const DRAFT_FORMAT_KEY = 'db_editor_draft_format';

const DatabasePage: React.FC<DatabasePageProps> = ({ currentCSV, onSave, onReset }) => {
  const [format, setFormat] = useState<'csv' | 'json'>(() => {
    return (localStorage.getItem(DRAFT_FORMAT_KEY) as 'csv' | 'json') || 'csv';
  });
  const [text, setText] = useState(() => {
    return localStorage.getItem(DRAFT_TEXT_KEY) || currentCSV;
  });
  
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiProposal, setAiProposal] = useState<{ data: string, insight: string, suggestions?: IsoSuggestion[], logicOptimizations?: LogicSuggestion[] } | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const isFirstMount = useRef(true);

  // Persistence logic: Save to localStorage whenever text or format changes
  useEffect(() => {
    localStorage.setItem(DRAFT_TEXT_KEY, text);
    localStorage.setItem(DRAFT_FORMAT_KEY, format);
  }, [text, format]);

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

  // Sync logic: Only auto-update text from props if it's the first mount and NO draft exists, 
  // OR if the user explicitly switches format and we need to transform.
  useEffect(() => {
    if (isFirstMount.current) {
      const hasDraft = localStorage.getItem(DRAFT_TEXT_KEY);
      if (!hasDraft) {
        if (format === 'csv') setText(currentCSV);
        else {
          try {
            const parsed = parseCSV(currentCSV);
            setText(JSON.stringify(parsed, null, 2));
          } catch(e) { setText("[]"); }
        }
      }
      isFirstMount.current = false;
      return;
    }
  }, [currentCSV]);

  const handleFormatSwitch = (newFormat: 'csv' | 'json') => {
    if (newFormat === format) return;
    
    // Transform current text to new format
    try {
      if (newFormat === 'json') {
        const parsed = parseCSV(text);
        setText(JSON.stringify(parsed, null, 2));
      } else {
        const json = JSON.parse(text);
        setText(jsonToCSV(json));
      }
      setFormat(newFormat);
    } catch (e) {
      setMessage({ type: 'error', text: 'Format transformation failed. Please check for syntax errors.' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const exportData = (targetFormat: 'csv' | 'json', sourceData?: string) => {
    let dataToExport = sourceData || text;
    let fileName = `dataset_export_${new Date().getTime()}`;
    
    try {
        if (targetFormat === 'csv') {
            // Check if we need to convert from JSON
            if (dataToExport.trim().startsWith('[') || dataToExport.trim().startsWith('{')) {
                const json = JSON.parse(dataToExport);
                dataToExport = jsonToCSV(Array.isArray(json) ? json : [json]);
            }
            fileName += '.csv';
        } else {
            // Check if we need to convert from CSV
            if (!dataToExport.trim().startsWith('[') && !dataToExport.trim().startsWith('{')) {
                const parsed = parseCSV(dataToExport);
                dataToExport = JSON.stringify(parsed, null, 2);
            }
            fileName += '.json';
        }

        const blob = new Blob([dataToExport], { type: targetFormat === 'csv' ? 'text/csv' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        
        setMessage({ type: 'success', text: `Exported as ${targetFormat.toUpperCase()}` });
        setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
        setMessage({ type: 'error', text: `Export failed: ${e.message}` });
        setTimeout(() => setMessage(null), 3000);
    }
  };

  const askAiForHelp = async (task: 'fix' | 'risk_audit' | 'iso_mapping' | 'logic_orchestrator') => {
    setIsAiLoading(true);
    setAiProposal(null);
    setShowAiPanel(true);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const systemPrompt = `You are an elite ISO 41001/45001 Data Integrity & Operations Architect. 
PROCESS the provided dataset based on the following task:

TASK TYPE: ${task.toUpperCase()}

INSTRUCTIONS:
1. ISO COGNITION: Analyze ticket subjects/remarks. Ensure proper mapping to ISO 9001 (Facilities), ISO 41001 (Operations), or ISO 45001 (Safety).
2. LOGIC ORCHESTRATION: If task is 'LOGIC_ORCHESTRATOR', look for:
   - Priority vs. Risk level contradictions (e.g., 'Urgent' priority but Risk Level 1).
   - Missing Root Cause Analysis (RCA) for 'Closed' tickets.
   - Categorization anomalies where subjects don't match helpdesk team assignment.
3. DATA HEALING: Correct fields in the 'data' payload while maintaining structural integrity.
4. OPTIMIZATION STRATEGY: Provide high-level 'logicOptimizations' suggesting how to better arrange teams or schedules.

Format: Output as valid ${format} in the 'data' field.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Dataset Context:\n${text}`,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        data: { type: Type.STRING, description: "The full corrected dataset" },
                        insight: { type: Type.STRING, description: "Strategy summary" },
                        suggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    ticketId: { type: Type.STRING },
                                    subject: { type: Type.STRING },
                                    currentClause: { type: Type.STRING },
                                    suggestedClause: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                },
                                required: ["ticketId", "subject", "suggestedClause", "reason"]
                            }
                        },
                        logicOptimizations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING },
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    impact: { type: Type.STRING },
                                    affectedIds: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ["type", "title", "description", "impact"]
                            }
                        }
                    },
                    required: ["data", "insight"]
                }
            }
        });

        const result = JSON.parse(response.text || '{}');
        setAiProposal({
            data: result.data || text,
            insight: result.insight || 'Processing completed.',
            suggestions: result.suggestions,
            logicOptimizations: result.logicOptimizations
        });
    } catch (e: any) {
        setAiProposal({ data: text, insight: `Error: ${e.message}` });
    } finally {
        setIsAiLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        let csvToSave = text;
        if (format === 'json') {
            const json = JSON.parse(text);
            csvToSave = jsonToCSV(json);
        }
        onSave(csvToSave);
        // Clear draft on successful commit
        localStorage.removeItem(DRAFT_TEXT_KEY);
        localStorage.removeItem(DRAFT_FORMAT_KEY);
        setMessage({ type: 'success', text: 'Database synchronized.' });
        setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
        setMessage({ type: 'error', text: `Sync failed: ${e.message}` });
    } finally { setIsSaving(false); }
  };

  const handleResetDraft = () => {
    if (confirm("This will discard all local unsaved changes. Continue?")) {
      localStorage.removeItem(DRAFT_TEXT_KEY);
      localStorage.removeItem(DRAFT_FORMAT_KEY);
      onReset();
      // Reset local text immediately
      setText(currentCSV);
      setFormat('csv');
    }
  };

  const hasUnsavedChanges = useMemo(() => {
    // Basic comparison to check if current editor text matches the committed CSV
    if (format === 'csv') return text !== currentCSV;
    // For JSON, we check if it's different from transformed CSV (approximated)
    return localStorage.getItem(DRAFT_TEXT_KEY) !== null;
  }, [text, currentCSV, format]);

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      <div className="flex-grow bg-gray-800 rounded-[2.5rem] shadow-2xl p-8 border border-gray-700/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-6">
            <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center">
                    <DatabaseIcon className="w-8 h-8 mr-3 text-blue-500" />
                    Database Workspace
                  </h2>
                  {hasUnsavedChanges && (
                    <span className="bg-brand-500/20 text-brand-400 text-[9px] font-black px-3 py-1 rounded-full border border-brand-500/30 uppercase tracking-[0.2em] animate-pulse">
                      Draft Active
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm mt-1 font-bold uppercase tracking-widest">ISO 41001/45001 Compliance Engine</p>
            </div>
            {message && (
                <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {message.text}
                </div>
            )}
            <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center bg-gray-950 border border-gray-800 rounded-2xl p-1 gap-1">
                    <button 
                        onClick={() => exportData('csv')}
                        title="Download as Cleaned CSV"
                        className="px-4 py-2.5 text-[9px] font-black uppercase text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-all flex items-center gap-2"
                    >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        CSV
                    </button>
                    <button 
                        onClick={() => exportData('json')}
                        title="Download as JSON"
                        className="px-4 py-2.5 text-[9px] font-black uppercase text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-all flex items-center gap-2"
                    >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        JSON
                    </button>
                </div>
                <button 
                  onClick={() => setShowAiPanel(true)}
                  className="flex items-center bg-brand-600 hover:bg-brand-500 text-white font-black py-3.5 px-6 rounded-2xl transition-all text-[10px] border border-brand-400/30 uppercase tracking-widest shadow-xl shadow-brand-900/40"
                >
                  <span className="mr-2">✨</span> AI ASSISTANT
                </button>
            </div>
        </div>

        <div className="grid gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 bg-gray-950 rounded-[1.25rem] p-1.5 border border-gray-800">
                    <button onClick={() => handleFormatSwitch('csv')} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${format === 'csv' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-600 hover:text-white'}`}>CSV Mode</button>
                    <button onClick={() => handleFormatSwitch('json')} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${format === 'json' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-600 hover:text-white'}`}>JSON Mode</button>
                </div>
                <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Auto-saving to local storage...</div>
            </div>

            <div className="relative w-full h-[550px] rounded-[2rem] border border-gray-700 bg-gray-950 overflow-hidden shadow-inner">
                <pre ref={preRef} className="absolute inset-0 pointer-events-none p-6 text-[11px] font-mono leading-5 whitespace-pre overflow-auto custom-scrollbar" dangerouslySetInnerHTML={{ __html: highlightedCode }} />
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onScroll={handleScroll}
                    className="absolute inset-0 bg-transparent border-0 outline-none resize-none p-6 text-[11px] font-mono leading-5 text-transparent caret-brand-500 selection:bg-brand-500/20"
                    spellCheck={false}
                />
            </div>
            
            <div className="flex items-center justify-end space-x-6 pt-8 border-t border-gray-700/50">
                <button onClick={handleResetDraft} className="text-xs font-black uppercase text-gray-500 hover:text-white transition-all tracking-widest">Reset To Baseline</button>
                <button onClick={handleSave} disabled={isSaving} className="flex items-center px-12 py-4 bg-brand-600 hover:bg-brand-500 text-white font-black uppercase text-xs rounded-2xl shadow-xl transition-all disabled:opacity-50">
                    {isSaving ? 'PERSISTING DATA...' : 'COMMIT CHANGES'}
                </button>
            </div>
        </div>
      </div>

      {showAiPanel && (
          <aside className="w-full lg:w-[450px] bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-700 overflow-hidden flex flex-col animate-in slide-in-from-right-16 max-h-[92vh]">
            <div className="p-8 border-b border-gray-800 flex items-center justify-between bg-gray-950/40 sticky top-0 z-10">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Neural Auditor</h3>
                <button onClick={() => setShowAiPanel(false)} className="text-gray-500 hover:text-white transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            
            <div className="p-8 space-y-8 flex-grow overflow-y-auto custom-scrollbar pb-12">
                <div className="grid gap-3">
                    <button onClick={() => askAiForHelp('logic_orchestrator')} disabled={isAiLoading} className="w-full text-left p-6 bg-blue-900/10 rounded-2xl border border-blue-500/20 hover:border-blue-500 transition-all group">
                        <div className="flex items-center mb-2">
                            <SwitchVerticalIcon className="w-5 h-5 mr-3 text-blue-500" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Logic Orchestrator</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">Analyze dataset for structural anomalies and suggest team allocation optimizations.</p>
                    </button>

                    <button onClick={() => askAiForHelp('iso_mapping')} disabled={isAiLoading} className="w-full text-left p-6 bg-teal-900/10 rounded-2xl border border-teal-500/20 hover:border-teal-500 transition-all">
                        <div className="flex items-center mb-2">
                            <ShieldCheckIcon className="w-5 h-5 mr-3 text-teal-500" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">ISO Compliance Audit</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">Heuristically map technical tasks to international regulatory clauses.</p>
                    </button>
                    
                    <button onClick={() => askAiForHelp('risk_audit')} disabled={isAiLoading} className="w-full text-left p-6 bg-red-900/10 rounded-2xl border border-red-500/20 hover:border-red-500 transition-all">
                        <div className="flex items-center mb-2">
                            <ExclamationTriangleIcon className="w-5 h-5 mr-3 text-red-500" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Risk Assessment Suite</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">Calculate Impact vs. Likelihood scores based on incident severity.</p>
                    </button>
                </div>

                {isAiLoading && (
                    <div className="py-20 flex flex-col items-center justify-center space-y-6">
                        <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
                        <div className="text-center animate-pulse text-brand-400 text-xs font-black uppercase tracking-[0.3em]">Processing Logic Layers...</div>
                    </div>
                )}

                {aiProposal && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
                        <div className="bg-gray-950 border border-brand-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
                            <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest flex items-center">
                                <ChartBarIcon className="w-3 h-3 mr-2" />
                                Operational Strategy
                            </span>
                            <p className="text-xs text-white leading-relaxed italic">"{aiProposal.insight}"</p>
                        </div>

                        {aiProposal.logicOptimizations && aiProposal.logicOptimizations.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Logic Optimizations</h4>
                                <div className="space-y-3">
                                    {aiProposal.logicOptimizations.map((opt, idx) => (
                                        <div key={idx} className="bg-gray-800/80 rounded-xl p-5 border border-blue-500/10 hover:border-blue-500/30 transition-all">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${opt.impact === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                    {opt.impact} Impact
                                                </span>
                                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{opt.type}</span>
                                            </div>
                                            <h5 className="text-[11px] font-black text-white uppercase mb-2">{opt.title}</h5>
                                            <p className="text-[11px] text-gray-400 leading-relaxed">{opt.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {aiProposal.suggestions && aiProposal.suggestions.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Mapping Proposals</h4>
                                <div className="space-y-3">
                                    {aiProposal.suggestions.map((s, idx) => (
                                        <div key={idx} className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[9px] font-mono font-black text-brand-400">#{s.ticketId}</span>
                                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">ISO SUGGESTION</span>
                                            </div>
                                            <div className="text-[11px] font-bold text-white mb-2 truncate" title={s.subject}>{s.subject}</div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-[10px] line-through text-gray-600">{s.currentClause || 'N/A'}</span>
                                                <ChevronRightIcon className="w-3 h-3 text-brand-500" />
                                                <span className="text-[10px] font-black text-teal-400 bg-teal-950/40 px-2 py-0.5 rounded border border-teal-800/30 shadow-sm">
                                                    {s.suggestedClause}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 leading-relaxed italic">Reason: {s.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="sticky bottom-0 bg-gray-900 pt-4 pb-2 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => exportData('csv', aiProposal.data)} 
                                    className="flex items-center justify-center gap-2 py-4 bg-gray-950 hover:bg-gray-800 text-gray-400 hover:text-white text-[9px] font-black uppercase rounded-2xl border border-gray-800 transition-all"
                                >
                                    <DownloadIcon className="w-3.5 h-3.5" />
                                    Export CSV
                                </button>
                                <button 
                                    onClick={() => exportData('json', aiProposal.data)} 
                                    className="flex items-center justify-center gap-2 py-4 bg-gray-950 hover:bg-gray-800 text-gray-400 hover:text-white text-[9px] font-black uppercase rounded-2xl border border-gray-800 transition-all"
                                >
                                    <DownloadIcon className="w-3.5 h-3.5" />
                                    Export JSON
                                </button>
                            </div>
                            <button 
                                onClick={() => { setText(aiProposal.data); setAiProposal(null); localStorage.removeItem(DRAFT_TEXT_KEY); }} 
                                className="w-full py-5 bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-black uppercase rounded-2xl shadow-2xl shadow-brand-900/50 transition-all transform active:scale-95 flex items-center justify-center gap-2 border border-brand-400/20"
                            >
                                <DocumentCheckIcon className="w-4 h-4" />
                                Accept & Apply Strategy
                            </button>
                            <p className="text-[9px] text-center text-gray-600 mt-4 uppercase font-bold tracking-widest">System will re-validate structural integrity upon commit.</p>
                        </div>
                    </div>
                )}
            </div>
          </aside>
      )}
      <input ref={fileInputRef} type='file' className="hidden" accept=".csv,.json" onChange={(e) => {}} />
    </div>
  );
};

export default DatabasePage;