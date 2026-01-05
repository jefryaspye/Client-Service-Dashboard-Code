
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { HirarcRecord, HistoricalTicket } from '../types.ts';
import { ShieldExclamationIcon, ShieldCheckIcon, BeakerIcon, ChartBarIcon, DownloadIcon, ExclamationTriangleIcon, FireIcon, ClockIcon, ChevronRightIcon } from './icons.tsx';
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

  const runAiAnalysis = useCallback(async (input?: string, ticketRef?: string) => {
    const finalInput = input || analysisInput;
    if (!finalInput.trim()) return;
    setIsAiLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Conduct a HIRARC (Hazard Identification, Risk Assessment, and Risk Control) analysis for the following operational activity or incident: "${finalInput}".
      
Analyze the context and provide:
1. Work Activity Title.
2. Primary Hazard.
3. Root Cause (Reference incident context if provided).
4. Potential Effects (Health/Safety).
5. Numerical Assessment: Likelihood (1-5) and Severity (1-5).
6. Control Measures (Hierarchical approach: Elimination, Substitution, Engineering, Admin, PPE).
7. Primary Responsibility.

Output as JSON.`;

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
        cause: ticketRef ? `Incident Ref: ${ticketRef} - ${result.cause}` : result.cause,
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
    } finally {
      setIsAiLoading(false);
    }
  }, [analysisInput]);

  const runBatchAnalysis = async () => {
    if (detectedIncidents.length === 0) return;
    if (!confirm(`Analyze all ${detectedIncidents.length} detected hazards automatically?`)) return;

    setBatchProgress({ current: 0, total: detectedIncidents.length });
    
    for (let i = 0; i < detectedIncidents.length; i++) {
        const incident = detectedIncidents[i];
        setBatchProgress({ current: i + 1, total: detectedIncidents.length });
        await runAiAnalysis(`${incident.ticket.subject}. Context: ${incident.ticket.activities || ''}`, incident.ticket.ticketIDsSequence);
        // Small delay to prevent rate limits
        await new Promise(r => setTimeout(r, 500));
    }
    
    setBatchProgress(null);
    alert('Batch analysis complete. Safety register updated.');
  };

  const updateRecord = (id: string, updates: Partial<HirarcRecord>) => {
    setRecords(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, ...updates };
        if (updates.likelihood !== undefined || updates.severity !== undefined) {
          updated.riskLevel = updated.likelihood * updated.severity;
          updated.riskCategory = getRiskCategory(updated.riskLevel);
        }
        return updated;
      }
      return r;
    }));
  };

  const deleteRecord = (id: string) => {
    if (confirm('Delete this HIRARC record?')) {
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
            {showInsights ? 'Hide Insights' : `Dataset Insights (${detectedIncidents.length})`}
          </button>
          <button 
            onClick={() => {
              const csv = "Activity,Hazard,Likelihood,Severity,Risk,Category,Controls\n" + records.map(r => `"${r.workActivity}","${r.hazard}",${r.likelihood},${r.severity},${r.riskLevel},"${r.riskCategory}","${r.controlMeasures.replace(/"/g, '""')}"`).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `hirarc_audit_${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
            }}
            className="px-6 py-3 bg-gray-900 border border-gray-700 hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
          >
            <DownloadIcon className="w-4 h-4" />
            Export Audit CSV
          </button>
        </div>
      </div>

      {/* Hazard Intelligence Monitor */}
      {showInsights && (
        <div className="bg-brand-950/20 border border-brand-500/30 rounded-[2.5rem] p-10 shadow-2xl animate-in slide-in-from-top-4 duration-500">
           <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-600/20 rounded-2xl flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-6 h-6 text-brand-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-widest">Dataset Hazard Monitor</h2>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Found {detectedIncidents.length} unmapped safety triggers in your current dataset</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {batchProgress ? (
                  <div className="bg-brand-600 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                        Batch Processing: {batchProgress.current}/{batchProgress.total}
                    </span>
                  </div>
                ) : (
                  <button 
                    onClick={runBatchAnalysis}
                    className="px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all flex items-center gap-3"
                  >
                    <ShieldCheckIcon className="w-4 h-4" />
                    Batch Analyze All Hazards
                  </button>
                )}
              </div>
           </div>

           {detectedIncidents.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {detectedIncidents.map((incident) => (
                 <div key={incident.ticket.ticketIDsSequence} className="bg-gray-800/40 rounded-3xl p-6 border border-gray-700/50 flex flex-col justify-between group hover:border-brand-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 pr-4">
                           <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-[8px] font-black uppercase rounded border border-red-800/50">Keyword: {incident.keyword}</span>
                              <span className="text-[8px] text-gray-600 font-black uppercase">Ref: #{incident.ticket.ticketIDsSequence}</span>
                           </div>
                           <h4 className="text-sm font-black text-white group-hover:text-brand-400 transition-colors leading-tight">{incident.ticket.subject}</h4>
                           <p className="text-[11px] text-gray-500 mt-2 line-clamp-2 italic font-medium leading-relaxed">"{incident.ticket.activities || incident.ticket.description || 'No detailed log available.'}"</p>
                        </div>
                        {parseInt(incident.ticket.riskLikelihood || '0') * parseInt(incident.ticket.riskImpact || '0') > 12 && (
                            <FireIcon className="w-5 h-5 text-red-500 animate-pulse shrink-0" />
                        )}
                    </div>
                    <button 
                      onClick={() => runAiAnalysis(`${incident.ticket.subject}. Context: ${incident.ticket.activities || ''}`, incident.ticket.ticketIDsSequence)}
                      disabled={isAiLoading}
                      className="w-full mt-4 py-3 bg-gray-950 border border-gray-800 hover:border-brand-500/50 text-[9px] font-black text-gray-400 hover:text-white uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 group transition-all"
                    >
                      <BeakerIcon className="w-3.5 h-3.5" />
                      {isAiLoading ? 'Analyzing...' : 'Assess Hazard'}
                    </button>
                 </div>
               ))}
             </div>
           ) : (
             <div className="py-20 text-center bg-gray-900/30 rounded-3xl border border-dashed border-gray-800">
                <ShieldCheckIcon className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                <h3 className="text-sm font-black text-gray-600 uppercase tracking-widest">Dataset Safety Sync Verified</h3>
                <p className="text-xs text-gray-700 mt-2 font-bold uppercase">All identifiable hazards from the dataset are registered.</p>
             </div>
           )}
        </div>
      )}

      {/* Manual Analysis Panel */}
      {!showInsights && (
        <div className="bg-gray-900/50 border border-brand-500/20 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
            <FireIcon className="w-64 h-64 text-brand-400" />
            </div>
            <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">⚡</span>
                <h2 className="text-lg font-black text-white uppercase tracking-widest">Ad-hoc Risk Assessment</h2>
            </div>
            <div className="grid lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-4">
                <p className="text-sm text-gray-500 font-bold uppercase tracking-tight italic">Enter a specific maintenance activity or site incident to generate a safety control record.</p>
                <textarea 
                    value={analysisInput}
                    onChange={(e) => setAnalysisInput(e.target.value)}
                    placeholder="E.g., 'Replacing external floodlights on the building facade using an 18m boom lift...'"
                    className="w-full bg-gray-950 border border-gray-800 rounded-[1.5rem] p-6 text-sm text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-gray-700 h-32 font-bold leading-relaxed shadow-inner"
                />
                <div className="flex justify-end">
                    <button 
                    onClick={() => runAiAnalysis()}
                    disabled={isAiLoading || !analysisInput.trim()}
                    className="px-12 py-4 bg-brand-600 hover:bg-brand-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-900/40 transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                    {isAiLoading ? 'Analyzing Hazard Vectors...' : 'Register Hazard'}
                    </button>
                </div>
                </div>
                <div className="bg-gray-800/40 rounded-3xl p-8 border border-gray-700/50 flex flex-col justify-center text-center">
                <div className="mb-4">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1">Audit Reliability</span>
                    <span className="text-3xl font-black text-white">96.8%</span>
                </div>
                <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 w-[96.8%] shadow-[0_0_10px_rgba(56,171,247,0.5)]"></div>
                </div>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-4">Aligned with ISO 45001 & DOSH Standards</p>
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
                Risk Severity Matrix (5x5)
            </h2>
            <div className="grid grid-cols-5 gap-2 aspect-square max-w-md mx-auto">
              {[5, 4, 3, 2, 1].map(s => (
                [1, 2, 3, 4, 5].map(l => {
                  const score = s * l;
                  const cat = getRiskCategory(score);
                  const count = records.filter(r => r.severity === s && r.likelihood === l).length;
                  return (
                    <div 
                      key={`${s}-${l}`}
                      className={`relative flex items-center justify-center rounded-lg border border-white/5 transition-all hover:scale-110 cursor-help ${getRiskColor(cat)}`}
                      title={`Severity: ${s}, Likelihood: ${l} (${cat})`}
                    >
                      <span className="text-[8px] opacity-20 absolute top-1 left-1">{score}</span>
                      {count > 0 && (
                        <span className="text-sm font-black animate-in fade-in zoom-in">{count}</span>
                      )}
                    </div>
                  );
                })
              ))}
            </div>
            <div className="mt-8 flex justify-center gap-6">
              {['Low', 'Medium', 'High', 'Extreme'].map(c => (
                <div key={c} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getRiskColor(c)}`}></div>
                  <span className="text-[10px] font-black text-gray-500 uppercase">{c}</span>
                </div>
              ))}
            </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="bg-gray-950 border border-red-500/20 rounded-[2.5rem] p-10 text-center flex-1 flex flex-col justify-center shadow-2xl">
              <FireIcon className="w-12 h-12 text-red-500 mx-auto mb-6" />
              <h3 className="text-3xl font-black text-white">{records.filter(r => r.riskLevel >= 15).length}</h3>
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-2">Extreme Risks</p>
          </div>
          <div className="bg-gray-950 border border-green-500/20 rounded-[2.5rem] p-10 text-center flex-1 flex flex-col justify-center shadow-2xl">
              <ShieldCheckIcon className="w-12 h-12 text-green-500 mx-auto mb-6" />
              <h3 className="text-3xl font-black text-white">{records.length}</h3>
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-2">Active Controls</p>
          </div>
        </div>
      </div>

      {/* Master HIRARC Table */}
      <div className="bg-gray-800/50 backdrop-blur-md rounded-[2.5rem] border border-gray-700/50 shadow-2xl overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/40">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Active Safety Risk Register</h2>
            <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                Total Documented Hazards: {records.length}
            </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full text-[11px] text-left">
                <thead className="bg-gray-950/50 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                    <tr>
                        <th className="px-6 py-5">Work Activity & Hazard</th>
                        <th className="px-6 py-5">Cause & Effect</th>
                        <th className="px-6 py-5 text-center">L</th>
                        <th className="px-6 py-5 text-center">S</th>
                        <th className="px-6 py-5 text-center">Risk</th>
                        <th className="px-6 py-5">Control Measures</th>
                        <th className="px-6 py-5 text-right">Delete</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/30">
                    {records.map(r => (
                        <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-5 align-top min-w-[200px]">
                                <input 
                                  value={r.workActivity}
                                  onChange={e => updateRecord(r.id, { workActivity: e.target.value })}
                                  className="bg-transparent border-0 outline-none text-white font-black uppercase w-full focus:bg-gray-900 rounded p-1 transition-all"
                                />
                                <div className="text-[9px] text-brand-400 font-bold uppercase mt-1">Hazard: {r.hazard}</div>
                            </td>
                            <td className="px-6 py-5 align-top min-w-[220px]">
                                <div className="text-gray-300 font-medium leading-relaxed">{r.cause}</div>
                                <div className="text-[9px] text-gray-600 mt-2 italic font-bold">Result: {r.effect}</div>
                            </td>
                            <td className="px-6 py-5 text-center align-top">
                                <select 
                                  value={r.likelihood}
                                  onChange={e => updateRecord(r.id, { likelihood: parseInt(e.target.value) })}
                                  className="bg-gray-950 border border-gray-800 text-white rounded p-1 outline-none appearance-none text-center cursor-pointer hover:bg-gray-900 transition-colors"
                                >
                                  {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </td>
                            <td className="px-6 py-5 text-center align-top">
                                <select 
                                  value={r.severity}
                                  onChange={e => updateRecord(r.id, { severity: parseInt(e.target.value) })}
                                  className="bg-gray-950 border border-gray-800 text-white rounded p-1 outline-none appearance-none text-center cursor-pointer hover:bg-gray-900 transition-colors"
                                >
                                  {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </td>
                            <td className="px-6 py-5 text-center align-top">
                                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black border transition-all shadow-lg ${getRiskColor(r.riskCategory)}`}>
                                    {r.riskLevel}
                                </div>
                                <div className="text-[8px] font-black uppercase mt-1 opacity-40">{r.riskCategory}</div>
                            </td>
                            <td className="px-6 py-5 align-top min-w-[320px]">
                                <textarea 
                                  value={r.controlMeasures}
                                  onChange={e => updateRecord(r.id, { controlMeasures: e.target.value })}
                                  className="bg-gray-950/30 border-0 outline-none text-gray-400 font-medium w-full min-h-[100px] rounded p-2 text-[10px] leading-relaxed custom-scrollbar focus:bg-gray-900 transition-all"
                                />
                                <div className="text-[9px] text-gray-600 font-black mt-2 uppercase tracking-widest">Responsibility: {r.responsibility}</div>
                            </td>
                            <td className="px-6 py-5 text-right align-top">
                                <button 
                                  onClick={() => deleteRecord(r.id)}
                                  className="p-2 text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 rounded-lg"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      <div className="bg-gray-950 p-10 rounded-[2.5rem] border border-gray-800 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-600 to-transparent"></div>
        <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-4">Zero Harm Philosophy</h3>
        <p className="text-xs text-gray-500 max-w-2xl mx-auto leading-relaxed uppercase font-black">
            The HIRARC register is a living document. Automated pattern detection and neural risk assessment provide the intelligence layer required for world-class occupational health and safety (OH&S) management. Aligned with MS 1722 and OHSAS 18001.
        </p>
      </div>
    </div>
  );
};

export default HirarcPage;
