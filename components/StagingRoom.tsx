
import { normalizeDate } from '../hooks/useTicketData';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UploadIcon, DocumentCheckIcon, ExclamationTriangleIcon, ShieldExclamationIcon, ShieldCheckIcon, ClockIcon } from './icons';
import { parseCSV, jsonToCSV } from '../hooks/useTicketData';
import type { HistoricalTicket } from '../types';
import { COMPLIANCE_STANDARDS } from './ComplianceLibrary';
import { GoogleGenAI, Type } from "@google/genai";

interface AnalyzedRow {
  data: Record<string, any>;
  status: 'valid' | 'warning' | 'error';
  issues: string[];
  isDuplicate: boolean;
  aiSuggestion?: {
    clause: string;
    reason: string;
    confidenceScore: 'High' | 'Medium' | 'Low';
  };
}

const MANDATORY_CRITICAL = [
    { key: 'ticketIDsSequence', label: 'Ticket ID' },
    { key: 'createdOn', label: 'Creation Date' },
    { key: 'subject', label: 'Subject' },
    { key: 'stage', label: 'Status' }
];

const MANDATORY_WARNING = [
    { key: 'assignedTo', label: 'Assignee' },
    { key: 'priority', label: 'Priority' }
];

const RECOGNIZED_ISO_STANDARDS = [
    'ISO 9001',
    'ISO 14001',
    'ISO 41001',
    'ISO 45001',
    'ISO 18295-1',
    'ISO 10002',
    'ISO 27001',
    'ISO 20000-1',
    'ISO 22301',
    'ISO 31000',
    'ISO 50001'
];

const getConfidenceClass = (confidence?: string) => {
    switch(confidence?.toLowerCase()) {
        case 'high': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        case 'low': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
}

interface StagingRoomProps {
  historicalData: HistoricalTicket[];
  onCommit: (csv: string) => void;
}

const StagingRoom: React.FC<StagingRoomProps> = ({ historicalData, onCommit }) => {
  const [inputText, setInputText] = useState('');
  const [analysis, setAnalysis] = useState<AnalyzedRow[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [commitStatus, setCommitStatus] = useState<{ type: 'idle' | 'committing' | 'success', message: string }>({ type: 'idle', message: '' });
  const [activeTab, setActiveTab] = useState<'all' | 'errors' | 'warnings' | 'duplicates'>('all');
  
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const stats = useMemo(() => {
    if (!analysis) return null;
    return {
      total: analysis.length,
      errors: analysis.filter(r => r.status === 'error').length,
      warnings: analysis.filter(r => r.status === 'warning').length,
      duplicates: analysis.filter(r => r.isDuplicate).length,
      valid: analysis.filter(r => r.status === 'valid' && !r.isDuplicate).length
    };
  }, [analysis]);
  
  const highConfidenceSuggestionsCount = useMemo(() => {
    if (!analysis) return 0;
    return analysis.filter(row => row.aiSuggestion?.confidenceScore === 'High').length;
  }, [analysis]);

  const filteredAnalysis = useMemo(() => {
    if (!analysis) return [];
    if (activeTab === 'errors') return analysis.filter(r => r.status === 'error');
    if (activeTab === 'warnings') return analysis.filter(r => r.status === 'warning');
    if (activeTab === 'duplicates') return analysis.filter(r => r.isDuplicate);
    return analysis;
  }, [analysis, activeTab]);

  const runAnalysis = () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    
    setTimeout(() => {
      try {
        const parsed = parseCSV(inputText);
        const existingIds = new Set(historicalData.map(h => h.ticketIDsSequence));
        
        const analyzed: AnalyzedRow[] = parsed.map((row): AnalyzedRow | null => {
          const issues: string[] = [];
          let status: 'valid' | 'warning' | 'error' = 'valid';
          
          const id = row.ticketIDsSequence;
          const isDuplicate = existingIds.has(id);

          // 1. Check for Empty Critical Fields
          for (const field of MANDATORY_CRITICAL) {
            const val = row[field.key];
            if (!val || val.toString().trim() === '') {
                issues.push(`Empty ${field.label}`);
                status = 'error';
            }
          }

          // 2. Check for Empty Warning Fields
          for (const field of MANDATORY_WARNING) {
            const val = row[field.key];
            if (!val || val.toString().trim() === '') {
                issues.push(`Empty ${field.label}`);
                if (status !== 'error') status = 'warning';
            }
          }
          
          // 3. Smart Date Normalization Check
          const dateVal = row.createdOn;
          const normalized = normalizeDate(dateVal);
          if (dateVal && !normalized) {
             issues.push("Unrecognized Date Format (Expected standard date or timestamp)");
             status = 'error';
          } else if (normalized && normalized.year < 2000) {
              issues.push(`Suspicious Date Year: ${normalized.year}`);
              if (status !== 'error') status = 'warning';
          }

          // 4. ISO Compliance Audit
          const isoVal = (row.isoClause || '').toString().trim();
          if (isoVal && isoVal !== 'N/A' && !RECOGNIZED_ISO_STANDARDS.some(std => isoVal.includes(std))) {
              issues.push(`Non-standard ISO Reference: ${isoVal}`);
              if (status !== 'error') status = 'warning';
          }

          const values = Object.values(row).filter(v => v && v.toString().trim() !== '');
          if (values.length === 0) {
              return null;
          }

          return { data: row, status, issues, isDuplicate };
        }).filter((r): r is AnalyzedRow => r !== null);

        setAnalysis(analyzed);
      } catch (e) {
        alert("Failed to parse data. Please check CSV format.");
      } finally {
        setIsProcessing(false);
      }
    }, 500);
  };

  const runAiClauseAnalysis = async () => {
    if (!analysis) return;
    setIsAiAnalyzing(true);

    const ticketsToAnalyze = analysis.filter(row => {
        const isoVal = (row.data.isoClause || '').trim();
        return !isoVal || isoVal === 'N/A' || !RECOGNIZED_ISO_STANDARDS.some(std => isoVal.includes(std));
    });

    if (ticketsToAnalyze.length === 0) {
        setIsAiAnalyzing(false);
        alert("All tickets in this batch already have verified ISO mapping.");
        return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const standardsList = COMPLIANCE_STANDARDS.map(s => `Standard: "${s.standard}", Domain: "${s.domain}", Context: "${s.scope}"`).join('\n');
        const ticketList = ticketsToAnalyze.map(t => {
            const subject = t.data.subject;
            const activities = t.data.activities || t.data.description || '';
            const tags = t.data.tags || '';
            return `- ID: ${t.data.ticketIDsSequence}, Subject: "${subject}", Activities: "${activities}", Tags: "${tags}"`;
        }).join('\n');
        
        const prompt = `Act as an expert ISO Compliance Auditor. Map the following technical helpdesk tickets to the most appropriate ISO standard from the provided reference list.

**REFERENCE STANDARDS:**
${standardsList}

**TICKETS TO ANALYZE:**
${ticketList}

**REQUIREMENTS:**
1. Match based on the core operational nature of the incident.
2. Assign a confidence score ('High', 'Medium', 'Low') based on explicit keyword alignment.
3. Return a strictly valid JSON object.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    ticketId: { type: Type.STRING },
                                    clause: { type: Type.STRING },
                                    reason: { type: Type.STRING },
                                    confidenceScore: { 
                                        type: Type.STRING, 
                                        enum: ["High", "Medium", "Low"] 
                                    }
                                },
                                required: ["ticketId", "clause", "reason", "confidenceScore"]
                            }
                        }
                    },
                    required: ["suggestions"]
                }
            }
        });

        const result = JSON.parse(response.text || '{"suggestions":[]}');
        const suggestionsMap = new Map<string, { clause: string; reason: string; confidenceScore: 'High' | 'Medium' | 'Low' }>(
            result.suggestions.map((s: any) => [String(s.ticketId), { 
                clause: s.clause, 
                reason: s.reason, 
                confidenceScore: s.confidenceScore as 'High' | 'Medium' | 'Low' 
            }])
        );

        setAnalysis(prev => {
            if (!prev) return prev;
            return prev.map(row => {
                const suggestion = suggestionsMap.get(String(row.data.ticketIDsSequence));
                if (suggestion) {
                    return { ...row, aiSuggestion: suggestion };
                }
                return row;
            });
        });
    } catch (e: any) {
        console.error("AI analysis failed:", e);
        alert(`AI analysis failed: ${e.message}`);
    } finally {
        setIsAiAnalyzing(false);
    }
  };

  const handleApplySuggestion = (ticketId: string, suggestedClause: string) => {
    setAnalysis(prevAnalysis => {
        if (!prevAnalysis) return null;
        return prevAnalysis.map(row => {
            if (row.data.ticketIDsSequence === ticketId) {
                const newRow = { ...row, data: { ...row.data, isoClause: suggestedClause } };
                delete newRow.aiSuggestion;
                
                const isoIssueIndex = newRow.issues.findIndex(issue => issue.startsWith('Non-standard ISO'));
                if (isoIssueIndex > -1) {
                    newRow.issues.splice(isoIssueIndex, 1);
                }
                
                if (newRow.issues.length === 0 && newRow.status !== 'error') {
                    newRow.status = 'valid';
                }
                return newRow;
            }
            return row;
        });
    });
  };

  const handleBatchApplyHighConfidence = () => {
    if (highConfidenceSuggestionsCount === 0) return;
    if (!confirm(`Apply ${highConfidenceSuggestionsCount} high-confidence suggestions?`)) return;

    setAnalysis(prevAnalysis => {
      if (!prevAnalysis) return null;
      return prevAnalysis.map(row => {
        if (row.aiSuggestion?.confidenceScore === 'High') {
          const newRow = { ...row, data: { ...row.data, isoClause: row.aiSuggestion.clause } };
          delete newRow.aiSuggestion;
          const isoIssueIndex = newRow.issues.findIndex(issue => issue.startsWith('Non-standard ISO'));
          if (isoIssueIndex > -1) newRow.issues.splice(isoIssueIndex, 1);
          if (newRow.issues.length === 0 && newRow.status !== 'error') newRow.status = 'valid';
          return newRow;
        }
        return row;
      });
    });
  };

  const handleCommit = async (mode: 'append' | 'replace') => {
    if (!analysis) return;
    const validRows = analysis.filter(r => r.status !== 'error').map(r => r.data);
    if (validRows.length === 0) {
        alert("No valid rows to commit! Please fix critical errors.");
        return;
    }
    const errorCount = analysis.filter(r => r.status === 'error').length;
    if (errorCount > 0 && !confirm(`${errorCount} rows with critical errors will be skipped. Continue?`)) return;
    if (mode === 'replace' && !confirm("Permanently replace history with these clean rows?")) return;

    setCommitStatus({ type: 'committing', message: mode === 'replace' ? 'Replacing history...' : 'Appending data...' });

    try {
        await new Promise(resolve => setTimeout(resolve, 800));
        const finalData = mode === 'append' ? [...historicalData, ...validRows] : validRows;
        onCommit(jsonToCSV(finalData as any[]));
        setCommitStatus({ type: 'success', message: 'History successfully updated!' });
        timerRef.current = window.setTimeout(() => {}, 1200);
    } catch (e: any) {
        alert("Commit failed: " + e.message);
        setCommitStatus({ type: 'idle', message: '' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700 relative overflow-hidden">
        {commitStatus.type === 'success' && (
            <div className="absolute inset-x-0 top-0 bg-green-600 text-white py-3 px-6 text-center font-bold text-sm flex items-center justify-center space-x-2 animate-in slide-in-from-top duration-300 z-20 shadow-lg">
                <ShieldCheckIcon className="w-5 h-5" />
                <span>{commitStatus.message} Redirecting...</span>
            </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <ShieldCheckIcon className="w-8 h-8 mr-3 text-blue-400" />
            Data Reconciliation & Staging
          </h2>
          <p className="text-gray-400 mt-2 font-bold uppercase text-[10px] tracking-widest">Helpdesk Audit Protocol v2.5</p>
        </div>

        {!analysis ? (
          <div className="space-y-4">
            <textarea
              className="w-full h-64 bg-gray-950 border border-gray-800 rounded-2xl p-6 font-mono text-xs text-gray-300 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all shadow-inner"
              placeholder="Paste raw helpdesk CSV data here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button
              onClick={runAnalysis}
              disabled={!inputText.trim() || isProcessing}
              className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white font-black uppercase text-xs rounded-2xl transition-all flex items-center justify-center space-x-3 shadow-xl shadow-brand-900/40 disabled:opacity-50"
            >
              {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span className="tracking-widest">Auditing Infrastructure Data...</span>
                  </>
              ) : (
                <><DocumentCheckIcon className="w-5 h-5" /><span className="tracking-widest">Validate Dataset Integrity</span></>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-950/50 p-6 rounded-2xl border border-gray-800 text-center flex flex-col justify-center">
                <div className="text-2xl font-black text-white tabular-nums">{stats?.total}</div>
                <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1">Total Records</div>
              </div>
              <div className="bg-green-950/20 p-6 rounded-2xl border border-green-800/30 text-center flex flex-col justify-center">
                <div className="text-2xl font-black text-green-400 tabular-nums">{stats?.valid}</div>
                <div className="text-[9px] text-green-600 font-black uppercase tracking-widest mt-1">Verified Clean</div>
              </div>
              <div className="bg-red-950/20 p-6 rounded-2xl border border-red-800/30 text-center flex flex-col justify-center">
                <div className="text-2xl font-black text-red-400 tabular-nums">{stats?.errors}</div>
                <div className="text-[9px] text-red-600 font-black uppercase tracking-widest mt-1">Critical Issues</div>
              </div>
              <div className="bg-orange-950/20 p-6 rounded-2xl border border-orange-800/30 text-center flex flex-col justify-center">
                <div className="text-2xl font-black text-orange-400 tabular-nums">{stats?.warnings}</div>
                <div className="text-[9px] text-orange-600 font-black uppercase tracking-widest mt-1">Compliance Flags</div>
              </div>
              <div className="bg-brand-950/20 p-6 rounded-2xl border border-brand-800/30 text-center flex flex-col justify-center">
                <div className="text-2xl font-black text-brand-400 tabular-nums">{Math.round(((stats?.valid || 0) + (stats?.warnings || 0)) / (stats?.total || 1) * 100)}%</div>
                <div className="text-[9px] text-brand-600 font-black uppercase tracking-widest mt-1">Quality Index</div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-700 gap-4">
                <div className="flex overflow-x-auto w-full sm:w-auto p-1 bg-gray-950/50 rounded-xl border border-gray-800">
                   <button onClick={() => setActiveTab('all')} className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'all' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:text-gray-300'}`}>All</button>
                   <button onClick={() => setActiveTab('errors')} className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'errors' ? 'bg-red-900/40 text-red-400' : 'text-gray-600 hover:text-gray-300'}`}>Critical</button>
                   <button onClick={() => setActiveTab('warnings')} className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'warnings' ? 'bg-orange-900/40 text-orange-400' : 'text-gray-600 hover:text-gray-300'}`}>Warnings</button>
                   <button onClick={() => setActiveTab('duplicates')} className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'duplicates' ? 'bg-purple-900/40 text-purple-400' : 'text-gray-600 hover:text-gray-300'}`}>Conflicts</button>
                </div>
                <div className="flex items-center gap-3 pb-2 sm:pb-0">
                    {highConfidenceSuggestionsCount > 0 && (
                        <button onClick={handleBatchApplyHighConfidence} className="px-5 py-3 text-[9px] font-black uppercase tracking-widest text-white bg-green-600 hover:bg-green-500 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-green-900/20">
                           <ShieldCheckIcon className="w-3.5 h-3.5" />
                           {`Apply ${highConfidenceSuggestionsCount} High Suggestions`}
                        </button>
                    )}
                    <button 
                      onClick={runAiClauseAnalysis} 
                      disabled={isAiAnalyzing} 
                      className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-brand-900/30"
                    >
                      {isAiAnalyzing ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                          <span>Mapping Logic...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm">✨</span>
                          <span>Audit Mapping</span>
                        </>
                      )}
                    </button>
                </div>
            </div>

            <div className="max-h-[500px] overflow-auto rounded-[1.5rem] border border-gray-700 bg-gray-950/50 custom-scrollbar shadow-inner">
               <table className="min-w-full text-[11px] text-left text-gray-400">
                  <thead className="bg-gray-900 text-gray-400 uppercase font-black tracking-widest sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 w-20">Seq ID</th>
                      <th className="px-6 py-4">Context</th>
                      <th className="px-6 py-4">Audit Intel & ISO Mapping</th>
                      <th className="px-6 py-4 text-center w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredAnalysis.map((row, i) => (
                      <tr key={i} className={`${row.status === 'error' ? 'bg-red-950/10' : row.status === 'warning' ? 'bg-orange-950/10' : ''} hover:bg-white/5 transition-colors group`}>
                        <td className="px-6 py-6 font-mono text-gray-300 align-top font-bold">#{row.data.ticketIDsSequence || <span className="text-red-500 font-black underline">MISSING</span>}</td>
                        <td className="px-6 py-6 align-top">
                          <div className="max-w-[220px] font-black text-gray-200 uppercase leading-tight">{row.data.subject || 'N/A'}</div>
                          <div className="text-[10px] text-gray-600 mt-2 font-bold uppercase tracking-tighter">Tags: {row.data.tags || 'None'}</div>
                        </td>
                        <td className="px-6 py-6 align-top">
                           {row.isDuplicate && <div className="text-purple-400 font-black uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></div> Sequence conflict</div>}
                           <div className="space-y-1 mb-4">
                            {row.issues.map((msg, j) => (
                                <span key={j} className={`${row.status === 'error' ? 'text-red-400' : 'text-orange-400'} block font-bold`}>⚡ {msg}</span>
                            ))}
                            {row.issues.length === 0 && !row.isDuplicate && !row.aiSuggestion && <span className="text-green-500 font-black uppercase text-[9px] tracking-widest">ISO 9001 Alignment Valid</span>}
                           </div>
                           
                           {row.aiSuggestion && (
                              <div className="p-5 bg-gray-950 rounded-2xl border border-blue-900/30 shadow-2xl animate-in slide-in-from-top-1 duration-300">
                                  <div className="flex justify-between items-center mb-4">
                                      <div>
                                          <div className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-black uppercase border tracking-tighter ${getConfidenceClass(row.aiSuggestion.confidenceScore)}`}>
                                            {row.aiSuggestion.confidenceScore} Accuracy Prediction
                                          </div>
                                      </div>
                                      <button 
                                        onClick={() => handleApplySuggestion(row.data.ticketIDsSequence, row.aiSuggestion!.clause)} 
                                        className="px-4 py-2 text-[9px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-lg active:scale-95"
                                      >
                                        Map Clause
                                      </button>
                                  </div>
                                  <div className="text-teal-400 font-mono text-[11px] font-black bg-teal-950/30 px-3 py-1.5 rounded-lg border border-teal-800/30 w-fit mb-3">
                                    {row.aiSuggestion.clause}
                                  </div>
                                  <p className="text-gray-500 text-[10px] leading-relaxed italic font-medium">
                                    "{row.aiSuggestion.reason}"
                                  </p>
                              </div>
                           )}
                        </td>
                        <td className="px-6 py-6 text-center align-top">
                           <div className="flex justify-center pt-1 group-hover:scale-125 transition-transform">
                               {row.status === 'error' ? <ShieldExclamationIcon className="w-6 h-6 text-red-500" /> : 
                                row.status === 'warning' ? <ExclamationTriangleIcon className="w-6 h-6 text-orange-500" /> : 
                                <ShieldCheckIcon className="w-6 h-6 text-green-500" />}
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-800">
              <button onClick={() => setAnalysis(null)} disabled={commitStatus.type !== 'idle'} className="px-8 py-3 bg-gray-900 border border-gray-700 hover:bg-gray-800 text-gray-500 hover:text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">Reset Buffer</button>
              <div className="flex-grow"></div>
              <button onClick={() => handleCommit('append')} disabled={commitStatus.type !== 'idle'} className="px-10 py-3 bg-brand-600 hover:bg-brand-500 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl shadow-brand-900/40 transition-all flex items-center justify-center gap-3">
                {commitStatus.type === 'committing' ? <span className="animate-pulse">Committing Ledger...</span> : <><DocumentCheckIcon className="w-4 h-4" /><span>Append to History</span></>}
              </button>
              <button onClick={() => handleCommit('replace')} disabled={commitStatus.type !== 'idle'} className="px-10 py-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl shadow-red-900/40 transition-all border border-red-500/20">Overwrite Database</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StagingRoom;
