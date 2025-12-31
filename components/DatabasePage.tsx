
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UploadIcon, DocumentCheckIcon, ExclamationTriangleIcon, ShieldCheckIcon, ChartBarIcon, BeakerIcon, DatabaseIcon, ChevronRightIcon, SwitchVerticalIcon, DownloadIcon, ClockIcon } from './icons';
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

  // Persistence logic
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

  // Data Snapshot stats
  const dataStats = useMemo(() => {
    try {
      let count = 0;
      if (format === 'csv') {
        const rows = parseCSV(text);
        count = rows.length;
      } else {
        const json = JSON.parse(text);
        count = Array.isArray(json) ? json.length : 1;
      }
      const sizeKb = (text.length / 1024).toFixed(1);
      return { count, sizeKb, isValid: true };
    } catch (e) {
      return { count: 0, sizeKb: '0.0', isValid: false };
    }
  }, [text, format]);

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
    }
  }, [currentCSV]);

  const handleFormatSwitch = (newFormat: 'csv' | 'json') => {
    if (newFormat === format) return;
    try {
      if (newFormat === 'json') {
        const parsed = parseCSV(text);
        setText(JSON.stringify(parsed, null, 2));
      } else {
        const json = JSON.parse(text);
        setText(jsonToCSV(Array.isArray(json) ? json : [json]));
      }
      setFormat(newFormat);
    } catch (e) {
      setMessage({ type: 'error', text: 'Format transformation failed. Invalid data structure.' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target?.result as string;
        setText(content);
        setFormat('csv');
        setMessage({ type: 'success', text: `Imported '${file.name}'` });
        setTimeout(() => setMessage(null), 3000);
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };

  const exportData = (targetFormat: 'csv' | 'json', sourceData?: string) => {
    let dataToExport = sourceData || text;
    let fileName = `dataset_backup_${new Date().toISOString().slice(0, 10)}`;
    try {
        if (targetFormat === 'csv') {
            if (dataToExport.trim().startsWith('[') || dataToExport.trim().startsWith('{')) {
                const json = JSON.parse(dataToExport);
                dataToExport = jsonToCSV(Array.isArray(json) ? json : [json]);
            }
            fileName += '.csv';
        } else {
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
    } catch (e: any) {
        setMessage({ type: 'error', text: `Export failed: ${e.message}` });
        setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSave = async () => {
    if (!dataStats.isValid) {
      setMessage({ type: 'error', text: 'Cannot save invalid data format.' });
      return;
    }
    setIsSaving(true);
    try {
        let csvToSave = text;
        if (format === 'json') {
            const json = JSON.parse(text);
            csvToSave = jsonToCSV(Array.isArray(json) ? json : [json]);
        }
        onSave(csvToSave);
        localStorage.removeItem(DRAFT_TEXT_KEY);
        localStorage.removeItem(DRAFT_FORMAT_KEY);
        setMessage({ type: 'success', text: 'Changes committed to database.' });
        setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
        setMessage({ type: 'error', text: `Sync failed: ${e.message}` });
    } finally { setIsSaving(false); }
  };

  const handleResetDraft = () => {
    if (confirm("Discard unsaved changes and reload from committed database?")) {
      localStorage.removeItem(DRAFT_TEXT_KEY);
      localStorage.removeItem(DRAFT_FORMAT_KEY);
      onReset();
      setText(currentCSV);
      setFormat('csv');
    }
  };

  const askAiForHelp = async (task: 'fix' | 'risk_audit' | 'iso_mapping' | 'logic_orchestrator') => {
    setIsAiLoading(true);
    setAiProposal(null);
    setShowAiPanel(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const systemPrompt = `You are a Senior Data Engineer. Task: ${task.toUpperCase()}. Correct the dataset and provide high-level insights.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Dataset:\n${text}`,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        data: { type: Type.STRING },
                        insight: { type: Type.STRING },
                        logicOptimizations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING },
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    impact: { type: Type.STRING }
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
            insight: result.insight || 'Optimization completed.',
            logicOptimizations: result.logicOptimizations
        });
    } catch (e: any) {
        setAiProposal({ data: text, insight: `AI Processing Error: ${e.message}` });
    } finally { setIsAiLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 pb-20">
      <div className="flex-grow bg-gray-800 rounded-[2.5rem] shadow-2xl p-8 border border-gray-700/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-6">
            <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center">
                    <DatabaseIcon className="w-8 h-8 mr-3 text-blue-500" />
                    Dataset Master
                  </h2>
                </div>
                <p className="text-gray-500 text-sm mt-1 font-bold uppercase tracking-widest">Helpdesk Source Editor</p>
            </div>
            {message && (
                <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {message.text}
                </div>
            )}
            <div className="flex items-center space-x-3">
                <button onClick={() => fileInputRef.current?.click()} className="hidden sm:flex items-center bg-gray-950 border border-gray-800 rounded-2xl px-5 py-3 text-gray-400 hover:text-white hover:bg-gray-800 transition-all">
                    <UploadIcon className="w-4 h-4 mr-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Import CSV</span>
                </button>
                <div className="hidden sm:flex items-center bg-gray-950 border border-gray-800 rounded-2xl p-1">
                    <button onClick={() => exportData('csv')} className="px-4 py-2.5 text-[9px] font-black uppercase text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-all">Export CSV</button>
                    <button onClick={() => exportData('json')} className="px-4 py-2.5 text-[9px] font-black uppercase text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-all">Export JSON</button>
                </div>
                <button onClick={() => setShowAiPanel(true)} className="flex items-center bg-brand-600 hover:bg-brand-500 text-white font-black py-3.5 px-6 rounded-2xl transition-all text-[10px] border border-brand-400/30 uppercase tracking-widest shadow-xl shadow-brand-900/40">
                  ✨ AI AUDIT
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-950/50 p-4 rounded-2xl border border-gray-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DocumentCheckIcon className="w-5 h-5 text-gray-600" />
              <div>
                <span className="text-[9px] font-black text-gray-600 uppercase block tracking-tighter">Records</span>
                <span className="text-sm font-black text-white">{dataStats.count}</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-950/50 p-4 rounded-2xl border border-gray-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChartBarIcon className="w-5 h-5 text-gray-600" />
              <div>
                <span className="text-[9px] font-black text-gray-600 uppercase block tracking-tighter">Memory Size</span>
                <span className="text-sm font-black text-white">{dataStats.sizeKb} KB</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-950/50 p-4 rounded-2xl border border-gray-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClockIcon className="w-5 h-5 text-gray-600" />
              <div>
                <span className="text-[9px] font-black text-gray-600 uppercase block tracking-tighter">Draft Status</span>
                <span className={`text-[10px] font-black uppercase ${localStorage.getItem(DRAFT_TEXT_KEY) ? 'text-brand-400' : 'text-gray-500'}`}>
                  {localStorage.getItem(DRAFT_TEXT_KEY) ? 'Pending Sync' : 'Up to date'}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-gray-950/50 p-4 rounded-2xl border border-gray-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className={`w-5 h-5 ${dataStats.isValid ? 'text-green-500' : 'text-red-500'}`} />
              <div>
                <span className="text-[9px] font-black text-gray-600 uppercase block tracking-tighter">Structure</span>
                <span className={`text-[10px] font-black uppercase ${dataStats.isValid ? 'text-green-400' : 'text-red-400'}`}>
                  {dataStats.isValid ? 'Valid Integrity' : 'Syntax Error'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
            <div className="flex items-center bg-gray-950 rounded-[1.25rem] p-1.5 border border-gray-800 w-fit">
                <button onClick={() => handleFormatSwitch('csv')} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${format === 'csv' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-600 hover:text-white'}`}>CSV Interface</button>
                <button onClick={() => handleFormatSwitch('json')} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${format === 'json' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-600 hover:text-white'}`}>JSON Interface</button>
            </div>

            <div className="relative w-full h-[500px] rounded-[2rem] border border-gray-700 bg-gray-950 overflow-hidden shadow-inner group">
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
                <button onClick={handleResetDraft} className="text-xs font-black uppercase text-gray-500 hover:text-white transition-all tracking-widest">Discard Changes</button>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving || !dataStats.isValid} 
                    className="flex items-center px-12 py-4 bg-brand-600 hover:bg-brand-500 text-white font-black uppercase text-xs rounded-2xl shadow-xl transition-all disabled:opacity-50 active:scale-95"
                >
                    <ShieldCheckIcon className="w-4 h-4 mr-2" />
                    {isSaving ? 'Synching Database...' : 'Save & Synchronize'}
                </button>
            </div>
        </div>
      </div>

      {showAiPanel && (
          <aside className="w-full lg:w-[450px] bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-700 overflow-hidden flex flex-col animate-in slide-in-from-right-16 max-h-[92vh]">
            <div className="p-8 border-b border-gray-800 flex items-center justify-between bg-gray-950/40 sticky top-0 z-10">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Audit Assistant</h3>
                <button onClick={() => setShowAiPanel(false)} className="text-gray-500 hover:text-white transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            
            <div className="p-8 space-y-8 flex-grow overflow-y-auto custom-scrollbar">
                <div className="grid gap-3">
                    <button onClick={() => askAiForHelp('logic_orchestrator')} disabled={isAiLoading} className="w-full text-left p-6 bg-blue-900/10 rounded-2xl border border-blue-500/20 hover:border-blue-500 transition-all">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest block mb-1">Structural Repair</span>
                        <p className="text-[11px] text-gray-500">Auto-fix schema errors and malformed fields.</p>
                    </button>
                    <button onClick={() => askAiForHelp('iso_mapping')} disabled={isAiLoading} className="w-full text-left p-6 bg-teal-900/10 rounded-2xl border border-teal-500/20 hover:border-teal-500 transition-all">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest block mb-1">ISO Normalizer</span>
                        <p className="text-[11px] text-gray-500">Heuristically link incidents to ISO clauses.</p>
                    </button>
                </div>

                {isAiLoading && (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                        <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
                        <div className="text-brand-400 text-[10px] font-black uppercase tracking-widest">Processing...</div>
                    </div>
                )}

                {aiProposal && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-gray-950 border border-brand-500/30 rounded-2xl p-6">
                            <span className="text-[9px] font-black text-brand-500 uppercase block mb-2">Neural Insight</span>
                            <p className="text-xs text-white leading-relaxed italic">"{aiProposal.insight}"</p>
                        </div>
                        <button 
                            onClick={() => { setText(aiProposal.data); setAiProposal(null); }} 
                            className="w-full py-5 bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-black uppercase rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
                        >
                            <DocumentCheckIcon className="w-4 h-4" />
                            Accept & Inject Data
                        </button>
                    </div>
                )}
            </div>
          </aside>
      )}
      <input ref={fileInputRef} type='file' className="hidden" accept=".csv" onChange={handleFileImport} />
    </div>
  );
};

export default DatabasePage;
