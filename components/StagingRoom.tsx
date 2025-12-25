import { normalizeDate } from '../hooks/useTicketData';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UploadIcon, DocumentCheckIcon, ExclamationTriangleIcon, ShieldExclamationIcon, ShieldCheckIcon, ClockIcon } from './icons';
import { parseCSV, jsonToCSV } from '../hooks/useTicketData';
import type { HistoricalTicket } from '../types';
import { COMPLIANCE_STANDARDS } from './ComplianceLibrary';
import { GoogleGenAI, Type } from "@google/genai";

interface StagingRoomProps {
  historicalData: HistoricalTicket[];
  onCommit: (csv: string) => void;
}

interface AnalyzedRow {
  data: Record<string, any>;
  status: 'valid' | 'warning' | 'error';
  issues: string[];
  isDuplicate: boolean;
  aiSuggestion?: {
    suggestedClause: string;
    reason: string;
    confidence: 'High' | 'Medium' | 'Low' | string;
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
    return analysis.filter(row => row.aiSuggestion?.confidence === 'High').length;
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
        return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const standardsList = COMPLIANCE_STANDARDS.map(s => `- ${s.standard}: ${s.scope}`).join('\n');
        const ticketList = ticketsToAnalyze.map(t => {
            const subject = t.data.subject;
            const activities = t.data.activities;
            let context = `Subject: "${subject}"`;
            if (activities) {
                context += `, Activities: "${activities}"`;
            }
            return `- ID: ${t.data.ticketIDsSequence}, ${context}`;
        }).join('\n');
        
        const prompt = `You are a compliance expert specializing in facility management standards.
Your task is to map technical helpdesk tickets to the most relevant ISO clause from a predefined list.

**Approved ISO Standards:**
${standardsList}

**Tickets for Analysis:**
${ticketList}

**Instructions:**
For each ticket, analyze its subject and any provided activities/remarks to suggest the single most appropriate clause.
Then, provide a confidence score and a detailed reason based on the following criteria:

- **Reasoning Requirement (CRITICAL):** The 'reason' field must provide a comprehensive justification. It should:
    1.  **Quote Keywords:** Directly quote the specific words/phrases from the ticket's 'Subject' or 'Activities' that influenced the decision.
    2.  **Connect to Scope:** Explicitly link these keywords to the official scope of the suggested ISO standard.
    3.  **Provide Rationale:** Clearly explain the logical connection. For example: "The keyword 'power trip' from the subject directly relates to the maintenance of 'Infrastructure', which is the core scope of ISO 9001 (Clause 7.1.3)." Vague reasons like "Related to facilities" are unacceptable.

- **Confidence Score Criteria:**
    - **High Confidence**: The ticket subject or activities contain explicit keywords directly matching an ISO standard's scope (e.g., "power trip," "cooling failure," "safety hazard," "malware").
    - **Medium Confidence**: The subject/activities are related to a standard but lack specific keywords, requiring inference (e.g., "broken chair," "light flickering," "system access").
    - **Low Confidence**: The subject/activities are very generic or ambiguous, making the mapping a best-effort guess (e.g., "check request," "general inquiry").

**Output Format:**
Provide your response as a single JSON object with a key "suggestions", which is an array. Each element must be an object with keys: "ticketId", "suggestedClause", "reason", and "confidence".
Only include suggestions if you have at least 'Low' confidence.`;
        
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
                                    suggestedClause: { type: Type.STRING },
                                    reason: { type: Type.STRING },
                                    confidence: { type: Type.STRING }
                                },
                                required: ["ticketId", "suggestedClause", "reason", "confidence"]
                            }
                        }
                    },
                    required: ["suggestions"]
                }
            }
        });

        const result = JSON.parse(response.text || '{"suggestions":[]}');
        const suggestionsMap = new Map<string, { suggestedClause: string; reason: string; confidence: string }>(
            result.suggestions.map((s: any) => [s.ticketId, { suggestedClause: s.suggestedClause, reason: s.reason, confidence: s.confidence }])
        );

        setAnalysis(prev => {
            if (!prev) return prev;
            return prev.map(row => {
                const suggestion = suggestionsMap.get(row.data.ticketIDsSequence);
                if (suggestion) {
                    return { ...row, aiSuggestion: suggestion as AnalyzedRow['aiSuggestion'] };
                }
                return row;
            });
        });
    } catch (e) {
        console.error("AI analysis failed:", e);
        alert("AI clause analysis failed. Please check the console for details.");
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

    if (!confirm(`Are you sure you want to apply ${highConfidenceSuggestionsCount} high-confidence suggestions at once? This action cannot be undone.`)) {
      return;
    }

    setAnalysis(prevAnalysis => {
      if (!prevAnalysis) return null;
      return prevAnalysis.map(row => {
        if (row.aiSuggestion?.confidence === 'High') {
          const newRow = { ...row, data: { ...row.data, isoClause: row.aiSuggestion.suggestedClause } };
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

  const handleCommit = async (mode: 'append' | 'replace') => {
    if (!analysis) return;

    const validRows = analysis.filter(r => r.status !== 'error').map(r => r.data);
    
    if (validRows.length === 0) {
        alert("No valid rows to commit! Please fix critical errors (empty ID, Date, Status, or Subject).");
        return;
    }

    const errorCount = analysis.filter(r => r.status === 'error').length;
    if (errorCount > 0) {
        if (!confirm(`${errorCount} rows with critical errors will be SKIPPED. Do you want to continue?`)) {
            return;
        }
    }

    if (mode === 'replace') {
        if (!confirm("This will permanently replace all existing historical data with the clean rows from this batch. Proceed?")) {
            return;
        }
    }

    setCommitStatus({ type: 'committing', message: mode === 'replace' ? 'Replacing history...' : 'Appending data...' });

    try {
        await new Promise(resolve => setTimeout(resolve, 800));
        let finalCSV = '';
        if (mode === 'append') {
            finalCSV = jsonToCSV([...historicalData, ...validRows] as any[]);
        } else {
            finalCSV = jsonToCSV(validRows as any[]);
        }
        setCommitStatus({ type: 'success', message: 'History successfully updated!' });
        timerRef.current = window.setTimeout(() => onCommit(finalCSV), 1200);
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
                <span>{commitStatus.message} Redirecting to Dashboard...</span>
            </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <ShieldCheckIcon className="w-8 h-8 mr-3 text-blue-400" />
            Data Reconciliation & Staging
          </h2>
          <p className="text-gray-400 mt-2">
            Audit your helpdesk export. The system flags rows with missing statuses, IDs, unparseable dates, or non-standard ISO clauses.
          </p>
        </div>

        {!analysis ? (
          <div className="space-y-4">
            <textarea
              className="w-full h-64 bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-sm text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Paste CSV content here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button
              onClick={runAnalysis}
              disabled={!inputText.trim() || isProcessing}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                 <span className="animate-pulse">Auditing Rows...</span>
              ) : (
                <>
                  <DocumentCheckIcon className="w-5 h-5" />
                  <span>Analyze Data Integrity</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 text-center">
                <div className="text-2xl font-bold text-white">{stats?.total}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Total Rows</div>
              </div>
              <div className="bg-green-900/20 p-4 rounded-lg border border-green-900/30 text-center">
                <div className="text-2xl font-bold text-green-400">{stats?.valid}</div>
                <div className="text-xs text-green-500 uppercase tracking-wider">Verified</div>
              </div>
              <div className="bg-red-900/20 p-4 rounded-lg border border-red-900/30 text-center">
                <div className="text-2xl font-bold text-red-400">{stats?.errors}</div>
                <div className="text-xs text-red-500 uppercase tracking-wider">Critical</div>
              </div>
              <div className="bg-orange-900/20 p-4 rounded-lg border border-orange-900/30 text-center">
                <div className="text-2xl font-bold text-orange-400">{stats?.warnings}</div>
                <div className="text-xs text-orange-500 uppercase tracking-wider">Warnings</div>
              </div>
              <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-900/30 text-center">
                <div className="text-2xl font-bold text-blue-400">{Math.round(((stats?.valid || 0) + (stats?.warnings || 0)) / (stats?.total || 1) * 100)}%</div>
                <div className="text-xs text-blue-500 uppercase tracking-wider">Health Score</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center border-b border-gray-700">
                <div className="flex">
                   <button onClick={() => setActiveTab('all')} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'all' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-white'}`}>All Rows</button>
                   <button onClick={() => setActiveTab('errors')} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'errors' ? 'border-red-500 text-red-400' : 'border-transparent text-gray-500 hover:text-white'}`}>Critical ({stats?.errors})</button>
                   <button onClick={() => setActiveTab('warnings')} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'warnings' ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-500 hover:text-white'}`}>Warnings ({stats?.warnings})</button>
                   <button onClick={() => setActiveTab('duplicates')} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'duplicates' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-white'}`}>Conflicts ({stats?.duplicates})</button>
                </div>
                <div className="flex items-center gap-2">
                    {highConfidenceSuggestionsCount > 0 && (
                        <button
                            onClick={handleBatchApplyHighConfidence}
                            className="px-4 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2 animate-in fade-in"
                        >
                           <ShieldCheckIcon className="w-4 h-4" />
                           {`Apply ${highConfidenceSuggestionsCount} High Confidence`}
                        </button>
                    )}
                    <button
                      onClick={runAiClauseAnalysis}
                      disabled={isAiAnalyzing}
                      className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isAiAnalyzing ? 'Analyzing...' : '✨ Run AI Clause Analysis'}
                    </button>
                </div>
            </div>

            <div className="max-h-[400px] overflow-auto rounded-lg border border-gray-700 bg-gray-900/50">
               <table className="min-w-full text-xs text-left text-gray-400">
                  <thead className="bg-gray-800 text-gray-300 uppercase sticky top-0">
                    <tr>
                      <th className="px-4 py-2 w-16">Row ID</th>
                      <th className="px-4 py-2">Preview</th>
                      <th className="px-4 py-2">Audit Feedback</th>
                      <th className="px-4 py-2 text-center w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredAnalysis.map((row, i) => (
                      <tr key={i} className={`${row.status === 'error' ? 'bg-red-900/10' : row.status === 'warning' ? 'bg-orange-900/10' : ''} hover:bg-white/5 transition-colors`}>
                        <td className="px-4 py-3 font-mono text-gray-300">{row.data.ticketIDsSequence || <span className="text-red-500">EMPTY</span>}</td>
                        <td className="px-4 py-3 truncate max-w-[250px]">{row.data.subject || <span className="text-red-500 italic">EMPTY</span>}</td>
                        <td className="px-4 py-3">
                           {row.isDuplicate && <span className="text-purple-400 font-bold block mb-1">ID exists in history</span>}
                           {row.issues.map((msg, j) => (
                             <span key={j} className={`${row.status === 'error' ? 'text-red-400' : 'text-orange-400'} block font-medium`}>• {msg}</span>
                           ))}
                           {row.issues.length === 0 && !row.isDuplicate && <span className="text-green-500 font-medium">Clear</span>}
                           {row.aiSuggestion && (
                              <div className="mt-2 p-3 bg-blue-900/20 rounded-lg border border-blue-800/50 animate-in fade-in">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <span className="text-xs font-bold text-blue-300 block">✨ AI Suggestion</span>
                                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${getConfidenceClass(row.aiSuggestion.confidence)}`}>
                                            {row.aiSuggestion.confidence} Confidence
                                          </span>
                                      </div>
                                      <button 
                                          onClick={() => handleApplySuggestion(row.data.ticketIDsSequence, row.aiSuggestion!.suggestedClause)}
                                          className="px-2 py-1 text-[9px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
                                      >
                                          Apply
                                      </button>
                                  </div>
                                  <p className="text-blue-400 font-mono text-xs mt-2">{row.aiSuggestion.suggestedClause}</p>
                                  <p className="text-gray-500 text-[11px] italic mt-1">"{row.aiSuggestion.reason}"</p>
                              </div>
                           )}
                        </td>
                        <td className="px-4 py-3 text-center">
                           <div className="flex justify-center">
                               {row.status === 'error' ? (
                                   <ShieldExclamationIcon className="w-5 h-5 text-red-500" />
                               ) : row.status === 'warning' ? (
                                   <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
                               ) : (
                                   <ShieldCheckIcon className="w-5 h-5 text-green-500" />
                               )}
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-700">
              <button
                onClick={() => setAnalysis(null)}
                disabled={commitStatus.type !== 'idle'}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Reset & Paste New
              </button>
              <div className="flex-grow"></div>
              <button
                onClick={() => handleCommit('append')}
                disabled={commitStatus.type !== 'idle'}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {commitStatus.type === 'committing' ? <span className="animate-pulse">Processing...</span> : (
                  <>
                    <DocumentCheckIcon className="w-5 h-5" />
                    <span>Append Verified</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleCommit('replace')}
                disabled={commitStatus.type !== 'idle'}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg transition-all disabled:opacity-50"
              >
                {commitStatus.type === 'committing' ? 'Replacing...' : 'Replace History'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StagingRoom;
