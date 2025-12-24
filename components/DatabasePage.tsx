
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UploadIcon, DocumentCheckIcon, ExclamationTriangleIcon, ShieldCheckIcon, ChartBarIcon, BeakerIcon, DatabaseIcon, ChevronRightIcon } from './icons';
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

const DatabasePage: React.FC<DatabasePageProps> = ({ currentCSV, onSave, onReset }) => {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [text, setText] = useState(currentCSV);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiProposal, setAiProposal] = useState<{ data: string, insight: string, suggestions?: IsoSuggestion[] } | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

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
    if (format === 'csv') setText(currentCSV);
    else {
        try {
            const parsed = parseCSV(currentCSV);
            setText(JSON.stringify(parsed, null, 2));
        } catch(e) { setText("[]"); }
    }
  }, [currentCSV]);

  const askAiForHelp = async (task: 'fix' | 'risk_audit' | 'iso_mapping') => {
    setIsAiLoading(true);
    setAiProposal(null);
    setShowAiPanel(true);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const systemPrompt = `You are an elite ISO 41001/45001 Data Integrity Architect. 
PROCESS the provided dataset based on the following task:

TASK TYPE: ${task.toUpperCase()}

INSTRUCTIONS:
1. ISO MAPPING: Analyze the 'subject' and 'remarks' (or 'activities').
   - Building systems/Asset maintenance/Repairs -> 'ISO 9001 (Clause 7.1.3)'
   - FM Operations/Soft services/Cleaning -> 'ISO 41001 (Clause 8.1)'
   - Safety Hazards/Personal Injury/Risk Control -> 'ISO 45001 (Clause 8.1.1)'
   - Environmental/Waste/Chemicals -> 'ISO 14001'
2. DATA HEALING: Ensure 'isoClause' is corrected in the 'data' payload.
3. SUGGESTIONS: Provide a clear list of mapping suggestions for user confirmation.
4. ROOT CAUSE: For closed tickets, infer 'rootCause' if missing.

Format: Output as valid ${format} in the 'data' field.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Dataset:\n${text}`,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        data: { type: Type.STRING, description: "The full corrected dataset in ${format} format" },
                        insight: { type: Type.STRING, description: "A high-level summary of the changes made" },
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
            suggestions: result.suggestions
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
        setMessage({ type: 'success', text: 'Database synchronized.' });
    } catch (e: any) {
        setMessage({ type: 'error', text: `Sync failed: ${e.message}` });
    } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      <div className="flex-grow bg-gray-800 rounded-[2.5rem] shadow-2xl p-8 border border-gray-700/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-6">
            <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center">
                   <DatabaseIcon className="w-8 h-8 mr-3 text-blue-500" />
                   Database Hub
                </h2>
                <p className="text-gray-500 text-sm mt-1 font-bold uppercase tracking-widest">ISO 41001/45001 Compliance Engine</p>
            </div>
            <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setShowAiPanel(true)}
                  className="flex items-center bg-brand-600 hover:bg-brand-500 text-white font-black py-3.5 px-8 rounded-2xl transition-all text-xs border border-brand-400/30 uppercase tracking-widest"
                >
                  <span className="mr-2">✨</span> AI AUTO-CORRECT
                </button>
            </div>
        </div>

        <div className="grid gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 bg-gray-950 rounded-[1.25rem] p-1.5 border border-gray-800">
                    <button onClick={() => setFormat('csv')} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${format === 'csv' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-600 hover:text-white'}`}>CSV</button>
                    <button onClick={() => setFormat('json')} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${format === 'json' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-600 hover:text-white'}`}>JSON</button>
                </div>
            </div>

            <div className="relative w-full h-[550px] rounded-[2rem] border border-gray-700 bg-gray-950 overflow-hidden shadow-inner">
                <pre ref={preRef} className="absolute inset-0 pointer-events-none p-4 text-[11px] font-mono leading-5 whitespace-pre overflow-auto" dangerouslySetInnerHTML={{ __html: highlightedCode }} />
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onScroll={handleScroll}
                    className="absolute inset-0 bg-transparent border-0 outline-none resize-none p-4 text-[11px] font-mono leading-5 text-transparent caret-brand-500 selection:bg-brand-500/20"
                    spellCheck={false}
                />
            </div>
            
            <div className="flex items-center justify-end space-x-6 pt-8 border-t border-gray-700/50">
                <button onClick={onReset} className="text-xs font-black uppercase text-gray-500 hover:text-white transition-all">Reset Factory</button>
                <button onClick={handleSave} disabled={isSaving} className="flex items-center px-12 py-4 bg-brand-600 hover:bg-brand-500 text-white font-black uppercase text-xs rounded-2xl shadow-xl transition-all">
                    {isSaving ? 'PERSISTING...' : 'COMMIT DATABASE'}
                </button>
            </div>
        </div>
      </div>

      {showAiPanel && (
          <aside className="w-full lg:w-[420px] bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-700 overflow-hidden flex flex-col animate-in slide-in-from-right-16 max-h-[90vh]">
            <div className="p-8 border-b border-gray-800 flex items-center justify-between bg-gray-950/40 sticky top-0 z-10">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Neural Intelligence</h3>
                <button onClick={() => setShowAiPanel(false)} className="text-gray-500 hover:text-white transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            
            <div className="p-8 space-y-6 flex-grow overflow-y-auto custom-scrollbar">
                <div className="grid gap-3">
                    <button onClick={() => askAiForHelp('iso_mapping')} disabled={isAiLoading} className="w-full text-left p-6 bg-gray-800 rounded-2xl border border-gray-700 hover:border-brand-500 transition-all group">
                        <div className="flex items-center mb-2">
                            <ShieldCheckIcon className="w-5 h-5 mr-3 text-brand-500" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">ISO Clause Mapping</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">Auto-map relevant clauses based on ticket subject and technical remarks.</p>
                    </button>

                    <button onClick={() => askAiForHelp('risk_audit')} disabled={isAiLoading} className="w-full text-left p-6 bg-gray-800 rounded-2xl border border-gray-700 hover:border-red-500 transition-all">
                        <div className="flex items-center mb-2">
                            <ExclamationTriangleIcon className="w-5 h-5 mr-3 text-red-500" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Risk Inference</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">Assign Likelihood & Impact scores based on incident severity.</p>
                    </button>
                </div>

                {isAiLoading && <div className="py-10 text-center animate-pulse text-brand-400 text-xs font-black uppercase tracking-[0.3em]">Neural Engine Processing...</div>}

                {aiProposal && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-gray-950 border border-brand-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
                            <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Strategic Insight</span>
                            <p className="text-xs text-white leading-relaxed italic">"{aiProposal.insight}"</p>
                        </div>

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
                                                <span className="text-[10px] font-black text-teal-400 bg-teal-950/40 px-2 py-0.5 rounded border border-teal-800/30">
                                                    {s.suggestedClause}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 leading-relaxed italic">Reason: {s.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={() => { setText(aiProposal.data); setAiProposal(null); }} 
                            className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-black uppercase rounded-2xl shadow-xl transition-all transform active:scale-95"
                        >
                            Accept & Implement Corrections
                        </button>
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
