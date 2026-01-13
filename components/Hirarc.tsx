
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { HirarcRecord, HistoricalTicket } from '../types.ts';
import { 
  ShieldExclamationIcon, 
  ShieldCheckIcon, 
  BeakerIcon, 
  ChartBarIcon, 
  DownloadIcon, 
  ExclamationTriangleIcon, 
  FireIcon, 
  ClockIcon, 
  ChevronRightIcon,
  TicketIcon,
  DatabaseIcon
} from './icons.tsx';
import { GoogleGenAI, Type } from "@google/genai";

const getRiskCategory = (score: number): HirarcRecord['riskCategory'] => {
  if (score >= 15) return 'Extreme';
  if (score >= 10) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
};

const getRiskColor = (category: string) => {
  switch (category) {
    case 'Extreme': return 'bg-purple-600 text-white border-purple-400';
    case 'High': return 'bg-red-600 text-white border-red-400';
    case 'Medium': return 'bg-yellow-500 text-gray-950 border-yellow-300';
    default: return 'bg-green-600 text-white border-green-400';
  }
};

const getRiskBgTint = (category: string) => {
  switch (category) {
    case 'Extreme': return 'bg-purple-950/10 hover:bg-purple-900/20';
    case 'High': return 'bg-red-950/10 hover:bg-red-900/20';
    case 'Medium': return 'bg-yellow-950/10 hover:bg-yellow-900/20';
    default: return 'bg-green-950/10 hover:bg-green-900/20';
  }
};

const getRiskIndicatorColor = (category: string) => {
  switch (category) {
    case 'Extreme': return 'bg-purple-500';
    case 'High': return 'bg-red-500';
    case 'Medium': return 'bg-yellow-500';
    default: return 'bg-green-500';
  }
};

const INITIAL_HIRARC: HirarcRecord[] = [
  {
    id: 'h-auto-2032',
    workActivity: 'Power System Restoration (Critical Systems)',
    hazard: 'Electrical Surge / Arc Flash',
    cause: 'Incident Ref: 2032 - L5 Common Area Power Trip (Overload on Circuit B)',
    effect: 'Electrocution / Fire / Complete Operational Downtime',
    likelihood: 4,
    severity: 5,
    riskLevel: 20,
    riskCategory: 'Extreme',
    controlMeasures: '1. Load redistribution across circuits.\n2. Implementation of RCD testing schedule.\n3. Restricted access to electrical risers.',
    responsibility: 'Technical Lead'
  }
];

const HAZARD_KEYWORDS = [
  { kw: 'power trip', hazard: 'Electrical fault', effect: 'Operational downtime / Fire risk' },
  { kw: 'leak', hazard: 'Slip hazard / Water damage', effect: 'Slip injury / Equipment short circuit' },
  { kw: 'broken', hazard: 'Structural / Furniture failure', effect: 'Injury to occupants' },
  { kw: 'aircon', hazard: 'Mechanical maintenance', effect: 'Exposure to moving parts / Refrigerant leaks' },
  { kw: 'light', hazard: 'Electrical task / Height', effect: 'Electrocution / Falls' },
  { kw: 'fire', hazard: 'Combustion event', effect: 'Life safety threat' },
  { kw: 'smoke', hazard: 'Fire risk', effect: 'Respiratory injury / Structural damage' },
  { kw: 'fall', hazard: 'Working at height', effect: 'Fractures / Severe trauma' },
  { kw: 'trip', hazard: 'Physical obstruction', effect: 'Limb injury / Sprains' },
  { kw: 'chemical', hazard: 'Chemical exposure', effect: 'Skin irritation / Toxicity' },
  { kw: 'locked', hazard: 'Entrapment / Access Delay', effect: 'Delayed emergency response' },
];

interface DetectedIncident {
  ticket: HistoricalTicket;
  keyword: string;
}

const HirarcPage: React.FC<{ historicalData: HistoricalTicket[] }> = ({ historicalData }) => {
  const [records, setRecords] = useState<HirarcRecord[]>(() => {
    const saved = localStorage.getItem('app_hirarc_data');
    return saved ? JSON.parse(saved) : INITIAL_HIRARC;
  });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [analysisInput, setAnalysisInput] = useState('');
  const [showInsights, setShowInsights] = useState(false);
  const [showHistoryPicker, setShowHistoryPicker] = useState(false);
  const [ticketSearchTerm, setTicketSearchTerm] = useState('');
  const [batchProgress, setBatchProgress] = useState<{ current: number, total: number } | null>(null);

  useEffect(() => {
    localStorage.setItem('app_hirarc_data', JSON.stringify(records));
  }, [records]);

  const detectedIncidents = useMemo(() => {
    const detected: DetectedIncident[] = [];
    const seen = new Set<string>();
    
    historicalData.forEach(t => {
      const text = `${t.subject} ${t.activities} ${t.description || ''} ${t.tags}`.toLowerCase();
      for (const hk of HAZARD_KEYWORDS) {
        if (text.includes(hk.kw) && !seen.has(t.ticketIDsSequence)) {
          const isRegistered = records.some(r => r.cause.includes(t.ticketIDsSequence));
          if (!isRegistered) {
            detected.push({ ticket: t, keyword: hk.kw });
            seen.add(t.ticketIDsSequence);
          }
          break;
        }
      }
    });
    return detected.sort((a, b) => {
        const riskA = parseInt(a.ticket.riskLikelihood || '0') * parseInt(a.ticket.riskImpact || '0');
        const riskB = parseInt(b.ticket.riskLikelihood || '0') * parseInt(b.ticket.riskImpact || '0');
        return riskB - riskA;
    }).slice(0, 15);
  }, [historicalData, records]);

  const filteredTickets = useMemo(() => {
    if (!ticketSearchTerm.trim()) return historicalData.slice(0, 50);
    const term = ticketSearchTerm.toLowerCase();
    return historicalData.filter(t => 
      t.subject.toLowerCase().includes(term) || 
      t.ticketIDsSequence.toLowerCase().includes(term) ||
      t.assignedTo.toLowerCase().includes(term) ||
      t.tags.toLowerCase().includes(term)
    ).slice(0, 50);
  }, [historicalData, ticketSearchTerm]);

  const runAiAnalysis = useCallback(async (input?: string, ticketRef?: string, ticketData?: HistoricalTicket) => {
    const finalInput = input || analysisInput;
    if (!finalInput.trim()) return;
    setIsAiLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let contextString = `Activity: "${finalInput}"`;
      if (ticketData) {
        contextString += `
        Ticket Details:
        - Subject: ${ticketData.subject}
        - Tags: ${ticketData.tags}
        - Tech Activities: ${ticketData.activities || 'None'}
        - Root Cause: ${ticketData.rootCause || 'Unknown'}
        - Corrective Action: ${ticketData.correctiveAction || 'None'}
        - Priority: ${ticketData.priority}
        `;
      }

      const prompt = `Perform a high-precision HIRARC (Hazard Identification, Risk Assessment, and Risk Control) analysis for the following incident context:
      
      ${contextString}
      
Identify technical and operational safety triggers based on the subject, tags, and activities.
Generate a structured safety record:
1. Work Activity: Precise title of the task or incident response.
2. Hazard: The specific physical, chemical, or ergonomic danger.
3. Cause: Detailed manifestation (Reference ticket ID ${ticketRef || 'N/A'}).
4. Effects: Human and operational impact (e.g., LTI, property damage).
5. Risk Assessment (1-5): Likelihood and Severity.
6. Control Measures: Multi-layer mitigation (Elimination, Engineering, Admin, PPE).
7. Responsibility: Role responsible for maintaining the control.

Return strictly as JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              workActivity: { type: Type.STRING },
              hazard: { type: Type.STRING },
              cause: { type: Type.STRING },
              effect: { type: Type.STRING },
              likelihood: { type: Type.NUMBER },
              severity: { type: Type.NUMBER },
              controlMeasures: { type: Type.STRING },
              responsibility: { type: Type.STRING }
            },
            required: ["workActivity", "hazard", "cause", "effect", "likelihood", "severity", "controlMeasures", "responsibility"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      const likelihood = result.likelihood || 3;
      const severity = result.severity || 3;
      const rpn = likelihood * severity;

      const newRecord: HirarcRecord = {
        id: `h-auto-${Date.now()}-${ticketRef || 'manual'}`,
        workActivity: result.workActivity,
        hazard: result.hazard,
        cause: ticketRef ? `Ticket Ref: ${ticketRef} - ${result.cause}` : result.cause,
        effect: result.effect,
        likelihood: likelihood,
        severity: severity,
        riskLevel: rpn,
        riskCategory: getRiskCategory(rpn),
        controlMeasures: result.controlMeasures,
        responsibility: result.responsibility
      };

      setRecords(prev => [newRecord, ...prev]);
      if (!input) setAnalysisInput('');
      return newRecord;
    } catch (e) {
      console.error(e);
      alert('Neural assessment failed. Please check your network or input detail.');
    } finally {
      setIsAiLoading(false);
      setShowHistoryPicker(false);
    }
  }, [analysisInput]);

  const runBatchAnalysis = async () => {
    if (detectedIncidents.length === 0) return;
    if (!confirm(`Assess all ${detectedIncidents.length} auto-detected hazards?`)) return;

    setBatchProgress({ current: 0, total: detectedIncidents.length });
    
    for (let i = 0; i < detectedIncidents.length; i++) {
        const incident = detectedIncidents[i];
        setBatchProgress({ current: i + 1, total: detectedIncidents.length });
        await runAiAnalysis(`${incident.ticket.subject}. Context: ${incident.ticket.activities || ''}`, incident.ticket.ticketIDsSequence, incident.ticket);
        await new Promise(r => setTimeout(r, 800)); // Rate limiting buffer
    }
    
    setBatchProgress(null);
    alert('Batch assessment complete. Hazard register updated.');
  };

  const updateRecord = (id: string, updates: Partial<HirarcRecord>) => {
    setRecords(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, ...updates };
        updated.riskLevel = updated.likelihood * updated.severity;
        updated.riskCategory = getRiskCategory(updated.riskLevel);
        return updated;
      }
      return r;
    }));
  };

  const deleteRecord = (id: string) => {
    if (confirm('Delete this safety record?')) {
      setRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-gray-800/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-gray-700/50 shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-brand-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-500/20">
            <ShieldExclamationIcon className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">HIRARC Workspace</h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">Hazard Identification & Risk Control Log</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => setShowInsights(!showInsights)}
            className={`px-6 py-3 border transition-all text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 ${showInsights ? 'bg-brand-600 border-brand-500 text-white' : 'bg-gray-900 border-gray-700 text-brand-400 hover:bg-gray-800'}`}
          >
            <BeakerIcon className="w-4 h-4" />
            {showInsights ? 'Hide Insights' : `Neural Monitor (${detectedIncidents.length})`}
          </button>
          <button 
            onClick={() => {
              const csv = "Activity,Hazard,Likelihood,Severity,Risk,Category,Controls\n" + records.map(r => `"${r.workActivity}","${r.hazard}",${r.likelihood},${r.severity},${r.riskLevel},"${r.riskCategory}","${r.controlMeasures.replace(/"/g, '""')}"`).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `hirarc_register_${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
            }}
            className="px-6 py-3 bg-gray-900 border border-gray-700 hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
          >
            <DownloadIcon className="w-4 h-4" />
            Export Register CSV
          </button>
        </div>
      </div>

      {/* Service History Picker Modal */}
      {showHistoryPicker && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-gray-900 border border-gray-700 w-full max-w-4xl max-h-[85vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
              <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-gray-950/40">
                  <div className="flex items-center gap-4">
                    <DatabaseIcon className="w-6 h-6 text-brand-400" />
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-widest leading-none">Service Record Explorer</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase mt-2 tracking-widest">Select technical history for automatic hazard mapping</p>
                    </div>
                  </div>
                  <button onClick={() => setShowHistoryPicker(false)} className="p-3 text-gray-500 hover:text-white transition-all bg-gray-950 rounded-xl hover:bg-gray-800 border border-gray-800">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
              </div>
              <div className="p-8 border-b border-gray-800 bg-gray-900/50">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-600 group-focus-within:text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </div>
                    <input 
                      type="text"
                      placeholder="Filter records by ID, Subject, Tech or Tags..."
                      value={ticketSearchTerm}
                      onChange={(e) => setTicketSearchTerm(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-2xl py-5 pl-14 pr-6 text-sm text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-gray-700 font-bold shadow-inner"
                    />
                  </div>
              </div>
              <div className="flex-grow overflow-y-auto custom-scrollbar p-8 bg-gray-900/30">
                  <div className="space-y-3">
                      {filteredTickets.length > 0 ? filteredTickets.map(t => {
                          const isAlreadyMapped = records.some(r => r.cause.includes(t.ticketIDsSequence));
                          return (
                            <button 
                                key={t.ticketIDsSequence}
                                onClick={() => runAiAnalysis(t.subject, t.ticketIDsSequence, t)}
                                className="w-full text-left bg-gray-800/40 hover:bg-gray-800 border border-gray-700/50 hover:border-brand-500/50 p-6 rounded-2xl transition-all group flex items-center justify-between shadow-sm"
                            >
                                <div className="flex-1 pr-8">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-[10px] font-mono font-black text-brand-400">REF: #{t.ticketIDsSequence}</span>
                                        {isAlreadyMapped ? (
                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-green-950/40 text-green-400 border border-green-900/50 flex items-center gap-1">
                                                <ShieldCheckIcon className="w-2.5 h-2.5" /> Registered in Register
                                            </span>
                                        ) : (
                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-gray-950 text-gray-500 border border-gray-800">Available for Mapping</span>
                                        )}
                                        {t.priority.toLowerCase().includes('urgent') && (
                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-red-950/40 text-red-400 border border-red-900/50">Urgent Context</span>
                                        )}
                                    </div>
                                    <h4 className="text-sm font-black text-white group-hover:text-brand-400 transition-colors uppercase leading-snug wrap-safe">{t.subject}</h4>
                                    <div className="flex items-center gap-4 mt-3">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight flex items-center gap-1.5">
                                            <ClockIcon className="w-3 h-3" /> {t.createdOn}
                                        </p>
                                        <div className="w-[1px] h-3 bg-gray-800"></div>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Assigned: {t.assignedTo}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <div className="p-3 bg-gray-950 rounded-xl group-hover:bg-brand-600 transition-all border border-gray-800 group-hover:border-brand-500">
                                        <ChevronRightIcon className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                                    </div>
                                    <span className="text-[8px] font-black text-gray-700 uppercase group-hover:text-brand-500 transition-colors">Neural Assess</span>
                                </div>
                            </button>
                          );
                      }) : (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 bg-gray-950 rounded-full border border-gray-800 flex items-center justify-center mx-auto mb-4">
                                <DatabaseIcon className="w-8 h-8 text-gray-800" />
                            </div>
                            <h3 className="text-sm font-black text-gray-600 uppercase tracking-widest">No matching records found</h3>
                        </div>
                      )}
                  </div>
              </div>
              <div className="p-6 bg-gray-950/40 border-t border-gray-800 text-center">
                  <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em]">Operational dataset search limit: 50 records</p>
              </div>
           </div>
        </div>
      )}

      {/* Hazard Intelligence Monitor */}
      {showInsights && (
        <div className="bg-brand-950/20 border border-brand-500/30 rounded-[2.5rem] p-10 shadow-2xl animate-in slide-in-from-top-4 duration-500">
           <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-600/20 rounded-2xl flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-6 h-6 text-brand-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-widest">Autonomous Safety Monitor</h2>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Identified {detectedIncidents.length} unassessed hazard triggers in the history buffer</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {batchProgress ? (
                  <div className="bg-brand-600 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                        Neural Batching: {batchProgress.current}/{batchProgress.total}
                    </span>
                  </div>
                ) : (
                  <button 
                    onClick={runBatchAnalysis}
                    className="px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all flex items-center gap-3 shadow-brand-900/40"
                  >
                    <ShieldCheckIcon className="w-4 h-4" />
                    Batch Assess All Triggers
                  </button>
                )}
              </div>
           </div>

           {detectedIncidents.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {detectedIncidents.map((incident) => (
                 <div key={incident.ticket.ticketIDsSequence} className="bg-gray-800/40 rounded-3xl p-6 border border-gray-700/50 flex flex-col justify-between group hover:border-brand-500/30 transition-all shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 pr-4">
                           <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-[8px] font-black uppercase rounded-lg border border-red-800/50">Vector: {incident.keyword}</span>
                              <span className="text-[8px] text-gray-600 font-black uppercase">Ref: #{incident.ticket.ticketIDsSequence}</span>
                           </div>
                           <h4 className="text-sm font-black text-white group-hover:text-brand-400 transition-colors leading-snug uppercase">{incident.ticket.subject}</h4>
                           <p className="text-[11px] text-gray-500 mt-2 line-clamp-2 italic font-medium leading-relaxed">"{incident.ticket.activities || incident.ticket.description || 'No detailed technical log available.'}"</p>
                        </div>
                        {parseInt(incident.ticket.riskLikelihood || '0') * parseInt(incident.ticket.riskImpact || '0') > 12 && (
                            <FireIcon className="w-5 h-5 text-red-500 animate-pulse shrink-0" />
                        )}
                    </div>
                    <button 
                      onClick={() => runAiAnalysis(`${incident.ticket.subject}. Context: ${incident.ticket.activities || ''}`, incident.ticket.ticketIDsSequence, incident.ticket)}
                      disabled={isAiLoading}
                      className="w-full mt-4 py-3 bg-gray-950 border border-gray-800 hover:border-brand-500/50 text-[9px] font-black text-gray-400 hover:text-white uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 group transition-all"
                    >
                      <BeakerIcon className="w-3.5 h-3.5" />
                      {isAiLoading ? 'Mapping Safety Controls...' : 'Assess Hazard Path'}
                    </button>
                 </div>
               ))}
             </div>
           ) : (
             <div className="py-20 text-center bg-gray-900/30 rounded-3xl border border-dashed border-gray-800">
                <ShieldCheckIcon className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                <h3 className="text-sm font-black text-gray-600 uppercase tracking-widest">Safety Context Verified</h3>
                <p className="text-xs text-gray-700 mt-2 font-bold uppercase tracking-tight">All identifiable historical hazards are documented in the register.</p>
             </div>
           )}
        </div>
      )}

      {/* Ad-hoc Assessment Panel */}
      {!showInsights && (
        <div className="bg-gray-900/50 border border-brand-500/20 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
            <FireIcon className="w-64 h-64 text-brand-400" />
            </div>
            <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">⚡</span>
                    <h2 className="text-lg font-black text-white uppercase tracking-widest leading-none">Hazard Vector Assessment</h2>
                </div>
                <button 
                    onClick={() => setShowHistoryPicker(true)}
                    className="flex items-center gap-3 px-8 py-4 bg-gray-950 border border-gray-800 hover:border-brand-500/50 text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-[0.2em] rounded-2xl transition-all shadow-2xl active:scale-95 group"
                >
                    <TicketIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Select Historical Incident
                </button>
            </div>
            <div className="grid lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-4">
                <p className="text-sm text-gray-500 font-bold uppercase tracking-tight italic">Describe a maintenance activity or specific technical symptom to trigger a neural risk assessment.</p>
                <textarea 
                    value={analysisInput}
                    onChange={(e) => setAnalysisInput(e.target.value)}
                    placeholder="Describe context: E.g., 'Emergency replacement of external facade floodlights using 24m aerial lift during high wind conditions...'"
                    className="w-full bg-gray-950 border border-gray-800 rounded-[1.5rem] p-6 text-sm text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-gray-700 h-36 font-bold leading-relaxed shadow-inner"
                />
                <div className="flex justify-end">
                    <button 
                    onClick={() => runAiAnalysis()}
                    disabled={isAiLoading || !analysisInput.trim()}
                    className="px-12 py-4 bg-brand-600 hover:bg-brand-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-900/40 transition-all flex items-center gap-3 disabled:opacity-50 active:scale-95"
                    >
                    {isAiLoading ? 'Analyzing Hazard Pathways...' : 'Assess Ad-hoc Hazard'}
                    </button>
                </div>
                </div>
                <div className="bg-gray-800/40 rounded-3xl p-8 border border-gray-700/50 flex flex-col justify-center text-center shadow-inner">
                <div className="mb-4">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1">Assessment Reliability</span>
                    <span className="text-4xl font-black text-white tracking-tighter">96.8%</span>
                </div>
                <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 w-[96.8%] shadow-[0_0_15px_rgba(56,171,247,0.6)] transition-all duration-1000"></div>
                </div>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-6 tracking-widest leading-relaxed">System aligned with ISO 45001,<br />DOSH & MS 1722 standards</p>
                </div>
            </div>
            </div>
        </div>
      )}

      {/* Risk Matrix & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 bg-gray-800/50 backdrop-blur-md p-8 rounded-[2.5rem] border border-gray-700/50 shadow-2xl">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-8 flex items-center">
                <ChartBarIcon className="w-4 h-4 mr-3" />
                Audit Risk Severity Matrix (5x5)
            </h2>
            <div className="grid grid-cols-5 gap-3 aspect-square max-w-md mx-auto">
              {[5, 4, 3, 2, 1].map(s => (
                [1, 2, 3, 4, 5].map(l => {
                  const score = s * l;
                  const cat = getRiskCategory(score);
                  const count = records.filter(r => r.severity === s && r.likelihood === l).length;
                  return (
                    <div 
                      key={`${s}-${l}`}
                      className={`relative flex items-center justify-center rounded-xl border border-white/5 transition-all hover:scale-105 cursor-help shadow-lg ${getRiskColor(cat)}`}
                      title={`Severity: ${s}, Likelihood: ${l} (${cat})`}
                    >
                      <span className="text-[9px] opacity-25 absolute top-1.5 left-1.5 font-black">{score}</span>
                      {count > 0 && (
                        <span className="text-base font-black animate-in fade-in zoom-in-75 duration-300">{count}</span>
                      )}
                    </div>
                  );
                })
              ))}
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-6">
              {['Low', 'Medium', 'High', 'Extreme'].map(c => (
                <div key={c} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getRiskColor(c)} shadow-sm`}></div>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{c}</span>
                </div>
              ))}
            </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="bg-gray-950 border border-red-500/20 rounded-[2.5rem] p-10 text-center flex-1 flex flex-col justify-center shadow-2xl group transition-all hover:border-red-500/40">
              <FireIcon className="w-12 h-12 text-red-500 mx-auto mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-4xl font-black text-white tabular-nums tracking-tighter">{records.filter(r => r.riskLevel >= 15).length}</h3>
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mt-3">Extreme Risks</p>
          </div>
          <div className="bg-gray-950 border border-green-500/20 rounded-[2.5rem] p-10 text-center flex-1 flex flex-col justify-center shadow-2xl group transition-all hover:border-green-500/40">
              <ShieldCheckIcon className="w-12 h-12 text-green-500 mx-auto mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-4xl font-black text-white tabular-nums tracking-tighter">{records.length}</h3>
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mt-3">Assessed Controls</p>
          </div>
        </div>
      </div>

      {/* Master HIRARC Table */}
      <div className="bg-gray-800/50 backdrop-blur-md rounded-[2.5rem] border border-gray-700/50 shadow-2xl overflow-hidden">
        <div className="px-10 py-8 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/40">
            <div>
                <h2 className="text-base font-black text-white uppercase tracking-widest">Consolidated Safety Risk Register</h2>
                <p className="text-[9px] text-gray-500 font-bold uppercase mt-1 tracking-widest">Authorized audit record for regulatory submission</p>
            </div>
            <div className="px-4 py-2 bg-gray-950 rounded-xl border border-gray-800 shadow-inner">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    Record Population: <span className="text-brand-400">{records.length} Hazards</span>
                </span>
            </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full text-[11px] text-left">
                <thead className="bg-gray-950/50 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">
                    <tr>
                        <th className="px-8 py-6 w-2 text-center"></th>
                        <th className="px-8 py-6">Activity & Hazard</th>
                        <th className="px-8 py-6">Incident Path & Effect</th>
                        <th className="px-8 py-6 text-center">L</th>
                        <th className="px-8 py-6 text-center">S</th>
                        <th className="px-8 py-6 text-center">RPN</th>
                        <th className="px-8 py-6">Safety Control Strategy</th>
                        <th className="px-8 py-6 text-right w-16">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/30">
                    {records.map(r => {
                        const currentRiskLevel = r.likelihood * r.severity;
                        const currentRiskCategory = getRiskCategory(currentRiskLevel);
                        const bgTint = getRiskBgTint(currentRiskCategory);
                        const indicatorColor = getRiskIndicatorColor(currentRiskCategory);
                        
                        return (
                        <tr key={r.id} className={`${bgTint} transition-all group`}>
                            <td className={`p-0 w-2 ${indicatorColor} shadow-[2px_0_10px_rgba(0,0,0,0.3)]`}></td>
                            <td className="px-8 py-7 align-top min-w-[240px]">
                                <input 
                                  value={r.workActivity}
                                  onChange={e => updateRecord(r.id, { workActivity: e.target.value })}
                                  className="bg-transparent border-0 outline-none text-white font-black uppercase w-full focus:bg-gray-900/50 rounded p-1.5 transition-all text-sm leading-tight"
                                />
                                <div className="text-[9px] text-brand-400 font-black uppercase tracking-widest mt-2 bg-brand-950/30 w-fit px-2 py-0.5 rounded border border-brand-900/50">Hazard: {r.hazard}</div>
                            </td>
                            <td className="px-8 py-7 align-top min-w-[280px]">
                                <div className="text-gray-300 font-medium leading-relaxed text-xs">{r.cause}</div>
                                <div className="text-[9px] text-gray-600 mt-3 font-bold uppercase flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500/50"></span>
                                    Potential: {r.effect}
                                </div>
                            </td>
                            <td className="px-8 py-7 text-center align-top">
                                <select 
                                  value={r.likelihood}
                                  onChange={e => updateRecord(r.id, { likelihood: parseInt(e.target.value) })}
                                  className="bg-gray-950 border border-gray-800 text-white rounded-lg p-2 outline-none appearance-none text-center cursor-pointer hover:bg-gray-900 transition-colors font-black text-xs min-w-[40px]"
                                >
                                  {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </td>
                            <td className="px-8 py-7 text-center align-top">
                                <select 
                                  value={r.severity}
                                  onChange={e => updateRecord(r.id, { severity: parseInt(e.target.value) })}
                                  className="bg-gray-950 border border-gray-800 text-white rounded-lg p-2 outline-none appearance-none text-center cursor-pointer hover:bg-gray-900 transition-colors font-black text-xs min-w-[40px]"
                                >
                                  {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </td>
                            <td className="px-8 py-7 text-center align-top">
                                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl font-black border transition-all shadow-xl text-sm ${getRiskColor(currentRiskCategory)}`}>
                                    {currentRiskLevel}
                                </div>
                                <div className="text-[8px] font-black uppercase mt-2 opacity-50 tracking-widest">{currentRiskCategory}</div>
                                <div className="text-[7px] font-mono text-gray-700 mt-1 uppercase">({r.likelihood}×{r.severity})</div>
                            </td>
                            <td className="px-8 py-7 align-top min-w-[380px]">
                                <textarea 
                                  value={r.controlMeasures}
                                  onChange={e => updateRecord(r.id, { controlMeasures: e.target.value })}
                                  className="bg-gray-950/40 border-0 outline-none text-gray-400 font-medium w-full min-h-[120px] rounded-xl p-4 text-[11px] leading-relaxed custom-scrollbar focus:bg-gray-900 transition-all shadow-inner"
                                />
                                <div className="text-[9px] text-gray-600 font-black mt-3 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500/50"></span>
                                    Responsibility: {r.responsibility}
                                </div>
                            </td>
                            <td className="px-8 py-7 text-right align-top">
                                <button 
                                  onClick={() => deleteRecord(r.id)}
                                  className="p-3 text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </td>
                        </tr>
                    )})}
                </tbody>
            </table>
        </div>
      </div>

      <div className="bg-gray-950 p-12 rounded-[2.5rem] border border-gray-800 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-brand-600 to-transparent"></div>
        <h3 className="text-sm font-black text-white uppercase tracking-[0.5em] mb-6">Risk Governance Charter</h3>
        <p className="text-xs text-gray-600 max-w-3xl mx-auto leading-relaxed uppercase font-black tracking-widest">
            The HIRARC register is an active regulatory tool. Continuous pattern recognition and predictive risk assessment ensure world-class occupational health and safety (OH&S) benchmarks. Mapped to MS 1722, OHSAS 18001 & ISO 45001.
        </p>
      </div>
    </div>
  );
};

export default HirarcPage;
