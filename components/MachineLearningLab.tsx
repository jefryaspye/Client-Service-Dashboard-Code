
import React, { useState, useMemo } from 'react';
import { 
  SparklesIcon, 
  BeakerIcon, 
  ChartBarIcon, 
  FireIcon, 
  ClockIcon, 
  ShieldCheckIcon,
  ChevronRightIcon,
  PuzzleIcon
} from './icons.tsx';
import { GoogleGenAI, Type } from "@google/genai";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import type { HistoricalTicket } from '../types.ts';

interface MachineLearningLabProps {
  historicalData: HistoricalTicket[];
}

interface ForecastResult {
  nextMonthVolume: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  seasonalInsight: string;
  predictedPeakDays: string[];
}

interface FailureProbability {
  systemPart: string;
  probability: number;
  reasoning: string;
  suggestedAction: string;
}

const MachineLearningLab: React.FC<MachineLearningLabProps> = ({ historicalData }) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'forecast' | 'predictive' | 'optimization'>('forecast');
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [failures, setFailures] = useState<FailureProbability[]>([]);
  const [optimizations, setOptimizations] = useState<string[]>([]);

  // Simple historical graph for baseline
  const historicalTrends = useMemo(() => {
    const months: Record<string, number> = {};
    historicalData.forEach(t => {
      const d = new Date(t.createdOn);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months[key] = (months[key] || 0) + 1;
      }
    });
    return Object.entries(months)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-6);
  }, [historicalData]);

  const runMlEngine = async () => {
    setIsAiLoading(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Extract technical data for ML training context
        const context = historicalData.slice(-50).map(t => ({
            subj: t.subject,
            tags: t.tags,
            date: t.createdOn,
            time: t.timeSpent,
            risk: (parseInt(t.riskLikelihood || '0') * parseInt(t.riskImpact || '0'))
        }));

        const prompt = `Act as a Neural Operations Architect. Perform advanced Machine Learning Analysis on the provided facility maintenance dataset.

ANALYSIS TASKS:
1. TIME-SERIES FORECAST: Predict next month's total ticket volume and identify potential peak days.
2. FAILURE PROBABILITY: Based on keywords in subjects, identify top 3 system components likely to experience a "Critical Breach" in the next 15 days.
3. RESOURCE OPTIMIZATION: Suggest 3 specific tactical shifts to improve technician utilization.

DATA CONTEXT:
${JSON.stringify(context)}

OUTPUT SCHEMA:
Return a strictly valid JSON object matching this structure:
{
  "forecast": { "nextMonthVolume": number, "confidence": number (0-100), "trend": "up"|"down"|"stable", "seasonalInsight": string, "predictedPeakDays": string[] },
  "failures": [ { "systemPart": string, "probability": number (0-100), "reasoning": string, "suggestedAction": string } ],
  "optimizations": string[]
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        forecast: {
                            type: Type.OBJECT,
                            properties: {
                                nextMonthVolume: { type: Type.NUMBER },
                                confidence: { type: Type.NUMBER },
                                trend: { type: Type.STRING },
                                seasonalInsight: { type: Type.STRING },
                                predictedPeakDays: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ["nextMonthVolume", "confidence", "trend", "seasonalInsight", "predictedPeakDays"]
                        },
                        failures: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    systemPart: { type: Type.STRING },
                                    probability: { type: Type.NUMBER },
                                    reasoning: { type: Type.STRING },
                                    suggestedAction: { type: Type.STRING }
                                },
                                required: ["systemPart", "probability", "reasoning", "suggestedAction"]
                            }
                        },
                        optimizations: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["forecast", "failures", "optimizations"]
                }
            }
        });

        const result = JSON.parse(response.text || '{}');
        setForecast(result.forecast);
        setFailures(result.failures || []);
        setOptimizations(result.optimizations || []);
    } catch (e) {
        console.error("ML Error:", e);
        alert("ML Engine failed to resolve. Check dataset volume.");
    } finally {
        setIsAiLoading(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Lab Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-gray-800/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-gray-700/50 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
            <SparklesIcon className="w-64 h-64 text-brand-400" />
        </div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-brand-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-500/20">
            <SparklesIcon className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Strategic ML Lab</h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">Predictive Infrastructure Intelligence Engine</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 relative z-10">
            <div className="px-4 py-2 bg-gray-950 rounded-xl border border-gray-800 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Neural Training Buffer Active</span>
            </div>
            <button 
                onClick={runMlEngine}
                disabled={isAiLoading}
                className="px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all flex items-center gap-4 shadow-brand-900/40 transform active:scale-95 disabled:opacity-50"
            >
                {isAiLoading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        Training Global Model...
                    </>
                ) : (
                    <>
                        <BeakerIcon className="w-4 h-4" />
                        Run Predictive Analytics
                    </>
                )}
            </button>
        </div>
      </div>

      {/* Lab Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Nav */}
          <div className="space-y-4">
              <button 
                onClick={() => setActiveTab('forecast')}
                className={`w-full text-left p-6 rounded-3xl border transition-all flex items-center gap-4 ${activeTab === 'forecast' ? 'bg-brand-600 border-brand-500 text-white shadow-xl shadow-brand-900/30' : 'bg-gray-800/40 border-gray-700/50 text-gray-400 hover:bg-gray-800'}`}
              >
                  <ChartBarIcon className="w-6 h-6" />
                  <div>
                      <span className="text-[10px] font-black uppercase tracking-widest block opacity-60">Module 01</span>
                      <span className="text-sm font-black uppercase tracking-tight">Demand Forecast</span>
                  </div>
              </button>
              <button 
                onClick={() => setActiveTab('predictive')}
                className={`w-full text-left p-6 rounded-3xl border transition-all flex items-center gap-4 ${activeTab === 'predictive' ? 'bg-brand-600 border-brand-500 text-white shadow-xl shadow-brand-900/30' : 'bg-gray-800/40 border-gray-700/50 text-gray-400 hover:bg-gray-800'}`}
              >
                  <FireIcon className="w-6 h-6" />
                  <div>
                      <span className="text-[10px] font-black uppercase tracking-widest block opacity-60">Module 02</span>
                      <span className="text-sm font-black uppercase tracking-tight">Risk Projection</span>
                  </div>
              </button>
              <button 
                onClick={() => setActiveTab('optimization')}
                className={`w-full text-left p-6 rounded-3xl border transition-all flex items-center gap-4 ${activeTab === 'optimization' ? 'bg-brand-600 border-brand-500 text-white shadow-xl shadow-brand-900/30' : 'bg-gray-800/40 border-gray-700/50 text-gray-400 hover:bg-gray-800'}`}
              >
                  <PuzzleIcon className="w-6 h-6" />
                  <div>
                      <span className="text-[10px] font-black uppercase tracking-widest block opacity-60">Module 03</span>
                      <span className="text-sm font-black uppercase tracking-tight">Resource Tuning</span>
                  </div>
              </button>
          </div>

          {/* Main Lab Display */}
          <div className="lg:col-span-3 space-y-8">
              
              {activeTab === 'forecast' && (
                  <div className="bg-gray-800/40 backdrop-blur-md rounded-[2.5rem] p-10 border border-gray-700/50 shadow-2xl animate-in zoom-in-95 duration-500">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Load Velocity Forecaster</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Next 30-Day Predictive Analysis</p>
                        </div>
                        {forecast && (
                            <div className="bg-gray-900 border border-brand-500/20 rounded-2xl px-6 py-4 flex flex-col items-center">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Confidence Score</span>
                                <span className="text-3xl font-black text-brand-400">{forecast.confidence}%</span>
                            </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                          <div className="bg-gray-950 p-8 rounded-[2rem] border border-gray-800 flex flex-col items-center text-center">
                              <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-4">Predicted Volume</span>
                              <span className="text-5xl font-black text-white tabular-nums">{forecast?.nextMonthVolume || '---'}</span>
                              <div className={`mt-4 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${forecast?.trend === 'up' ? 'bg-red-950/20 text-red-500' : forecast?.trend === 'down' ? 'bg-green-950/20 text-green-500' : 'bg-gray-900 text-gray-500'}`}>
                                  {forecast?.trend === 'up' ? '▲ Upward Momentum' : forecast?.trend === 'down' ? '▼ Reduction Trend' : '• Stable Load'}
                              </div>
                          </div>
                          <div className="md:col-span-2 bg-gray-950/40 p-8 rounded-[2rem] border border-gray-800/50">
                               <div className="h-[200px] w-full">
                                   <ResponsiveContainer width="100%" height="100%">
                                       <AreaChart data={historicalTrends}>
                                           <defs>
                                               <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                   <stop offset="5%" stopColor="#0e91e9" stopOpacity={0.3}/>
                                                   <stop offset="95%" stopColor="#0e91e9" stopOpacity={0}/>
                                               </linearGradient>
                                           </defs>
                                           <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                           <XAxis dataKey="date" stroke="#475569" fontSize={10} tickFormatter={(val) => val.split('-')[1]} />
                                           <YAxis stroke="#475569" fontSize={10} />
                                           <Tooltip 
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                                itemStyle={{ color: '#0e91e9', fontSize: '12px', fontWeight: 'bold' }}
                                           />
                                           <Area type="monotone" dataKey="count" stroke="#0e91e9" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} isAnimationActive={false} />
                                       </AreaChart>
                                   </ResponsiveContainer>
                               </div>
                               <div className="text-center mt-6">
                                   <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Historical Learning Basis (Trailing 6 Months)</span>
                               </div>
                          </div>
                      </div>

                      {forecast && (
                          <div className="bg-brand-950/20 border border-brand-500/30 rounded-[1.5rem] p-8">
                             <div className="flex items-center gap-3 mb-4">
                                 <SparklesIcon className="w-5 h-5 text-brand-400" />
                                 <h3 className="text-xs font-black text-white uppercase tracking-widest">Neural Insights</h3>
                             </div>
                             <p className="text-sm text-gray-300 italic leading-relaxed">"{forecast.seasonalInsight}"</p>
                             <div className="mt-6 flex flex-wrap gap-3">
                                 {forecast.predictedPeakDays.map((day, idx) => (
                                     <span key={idx} className="bg-gray-950 border border-gray-800 px-4 py-2 rounded-xl text-[10px] font-black text-brand-400 uppercase tracking-widest flex items-center gap-2">
                                         <ClockIcon className="w-3 h-3" />
                                         Predicted Peak: {day}
                                     </span>
                                 ))}
                             </div>
                          </div>
                      )}
                  </div>
              )}

              {activeTab === 'predictive' && (
                  <div className="bg-gray-800/40 backdrop-blur-md rounded-[2.5rem] p-10 border border-gray-700/50 shadow-2xl animate-in slide-in-from-right-8 duration-500">
                    <div className="mb-10">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">ML Failure Probability</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Anomaly Detection & Life-Cycle Prediction</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {failures.length > 0 ? failures.map((f, idx) => (
                            <div key={idx} className="bg-gray-950 border border-gray-800 rounded-[2rem] p-8 group hover:border-red-500/30 transition-all">
                                <div className="flex justify-between items-start mb-6">
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-red-400 transition-colors">{f.systemPart}</h3>
                                    <div className="px-4 py-2 bg-red-950/20 border border-red-900/30 rounded-xl">
                                        <span className="text-xl font-black text-red-500">{f.probability}%</span>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-2">Neural Reasoning</span>
                                        <p className="text-xs text-gray-400 leading-relaxed italic">"{f.reasoning}"</p>
                                    </div>
                                    <div className="pt-6 border-t border-gray-800 flex items-center gap-4">
                                        <div className="w-10 h-10 bg-green-950/20 border border-green-900/30 rounded-xl flex items-center justify-center text-green-500">
                                            <ShieldCheckIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black text-green-600 uppercase tracking-widest block">Mitigation Plan</span>
                                            <span className="text-[11px] font-bold text-gray-200 uppercase tracking-tight">{f.suggestedAction}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-2 py-24 text-center">
                                <FireIcon className="w-16 h-16 text-gray-800 mx-auto mb-6" />
                                <p className="text-sm text-gray-600 font-black uppercase tracking-widest">Execute Neural Scan to identify system failure probabilities</p>
                            </div>
                        )}
                    </div>
                  </div>
              )}

              {activeTab === 'optimization' && (
                  <div className="bg-gray-800/40 backdrop-blur-md rounded-[2.5rem] p-10 border border-gray-700/50 shadow-2xl animate-in slide-in-from-left-8 duration-500">
                    <div className="mb-10">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Resource Optimization Hub</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Genetic Algorithm technician load tuning</p>
                    </div>

                    <div className="space-y-6">
                        {optimizations.length > 0 ? optimizations.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-6 bg-gray-950 border border-gray-800 p-8 rounded-[2rem] hover:bg-brand-950/10 transition-all border-l-4 border-l-brand-600">
                                <div className="w-12 h-12 bg-brand-600/10 rounded-2xl flex items-center justify-center text-brand-400 shrink-0">
                                    <SparklesIcon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <span className="text-[9px] font-black text-brand-500 uppercase tracking-widest block mb-1">Strategic Lever {idx + 1}</span>
                                    <p className="text-sm font-bold text-gray-200 leading-relaxed uppercase tracking-tight">{opt}</p>
                                </div>
                                <ChevronRightIcon className="w-6 h-6 text-gray-700" />
                            </div>
                        )) : (
                            <div className="py-24 text-center">
                                <PuzzleIcon className="w-16 h-16 text-gray-800 mx-auto mb-6" />
                                <p className="text-sm text-gray-600 font-black uppercase tracking-widest">Model ready for resource tuning inputs</p>
                            </div>
                        )}
                    </div>
                  </div>
              )}
          </div>
      </div>

      {/* Logic Charter */}
      <div className="bg-gray-950 p-12 rounded-[2.5rem] border border-gray-800 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-brand-600 to-transparent"></div>
        <h3 className="text-sm font-black text-white uppercase tracking-[0.5em] mb-6">Neural Governance Architecture</h3>
        <p className="text-xs text-gray-600 max-w-3xl mx-auto leading-relaxed uppercase font-black tracking-widest">
            Strategic Machine Learning operates as an overlay to human audit controls. Predictions are derived from Bayesian probability models and pattern clustering to ensure 99.9% operational uptime across mission-critical facility sectors.
        </p>
      </div>
    </div>
  );
};

export default MachineLearningLab;
