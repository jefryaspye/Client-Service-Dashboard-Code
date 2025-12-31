
import React, { useState, useMemo, useEffect } from 'react';
import type { FmeaRecord, ViewType } from '../types.ts';
import { PuzzleIcon, ChevronRightIcon, BeakerIcon, DownloadIcon, ShieldCheckIcon, ExclamationTriangleIcon, ChartBarIcon } from './icons.tsx';
import { GoogleGenAI, Type } from "@google/genai";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const INITIAL_RECORDS: FmeaRecord[] = [
    {
        id: '1',
        systemPart: 'HVAC - Chiller Unit',
        failureMode: 'Coolant Leak',
        potentialEffects: 'Complete facility overheating, server room shutdown.',
        severity: 9,
        potentialCauses: '1. Seal degradation due to thermal cycling.\n2. Mechanical fatigue in pipe joints from vibration.',
        occurrence: 3,
        currentControls: 'Weekly manual inspections.',
        detection: 4,
        rpn: 108,
        recommendedActions: '1. Replace seals with high-temp synthetic variants.\n2. Install anti-vibration mountings on all joint junctions.',
        responsibility: 'M&E Maintenance Team'
    },
    {
        id: '2',
        systemPart: 'Helpdesk Software',
        failureMode: 'Database Connection Timeout',
        potentialEffects: 'Inability to log service requests, delay in incident response.',
        severity: 7,
        potentialCauses: '1. Excessive concurrent query load.\n2. Network latency spikes between app and DB tier.',
        occurrence: 4,
        currentControls: 'Standard error logging.',
        detection: 2,
        rpn: 56,
        recommendedActions: '1. Implement query caching and read-replicas.\n2. Upgrade to low-latency dedicated interconnect.',
        responsibility: 'IT Infrastructure Group'
    }
];

const SYSTEM_CATEGORIES = [
    'HVAC & M&E Systems',
    'IT & Data Infrastructure',
    'Security & Access Control',
    'Plumbing & Water Systems',
    'Fire Safety & Life Protection',
    'Soft Services (Cleaning/Pest)',
    'Structural & Building Fabric',
    'Energy & Power Distribution'
];

const getRpnClass = (rpn: number) => {
    if (rpn >= 200) return 'bg-red-500 text-white border-red-400';
    if (rpn >= 100) return 'bg-orange-500 text-white border-orange-400';
    if (rpn >= 50) return 'bg-yellow-500 text-gray-900 border-yellow-400';
    return 'bg-green-500 text-white border-green-400';
};

const FmeaPage: React.FC = () => {
    const [records, setRecords] = useState<FmeaRecord[]>(() => {
        const saved = localStorage.getItem('app_fmea_data');
        return saved ? JSON.parse(saved) : INITIAL_RECORDS;
    });
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [brainstormInput, setBrainstormInput] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(SYSTEM_CATEGORIES[0]);

    useEffect(() => {
        localStorage.setItem('app_fmea_data', JSON.stringify(records));
    }, [records]);

    const chartData = useMemo(() => {
        return records.map(r => ({
            name: r.systemPart.length > 15 ? r.systemPart.substring(0, 15) + '...' : r.systemPart,
            fullName: r.systemPart,
            rpn: r.rpn
        })).sort((a, b) => b.rpn - a.rpn);
    }, [records]);

    const handleAddManual = () => {
        const newRecord: FmeaRecord = {
            id: Date.now().toString(),
            systemPart: 'New System Component',
            failureMode: 'Describe failure mode',
            potentialEffects: 'Describe effects',
            severity: 5,
            potentialCauses: 'Describe causes',
            occurrence: 5,
            currentControls: 'Describe controls',
            detection: 5,
            rpn: 125,
            recommendedActions: 'TBD',
            responsibility: 'Unassigned'
        };
        setRecords([newRecord, ...records]);
    };

    const updateRecord = (id: string, updates: Partial<FmeaRecord>) => {
        setRecords(prev => prev.map(r => {
            if (r.id === id) {
                const updated = { ...r, ...updates };
                updated.rpn = updated.severity * updated.occurrence * updated.detection;
                return updated;
            }
            return r;
        }));
    };

    const deleteRecord = (id: string) => {
        if (confirm('Delete this FMEA record?')) {
            setRecords(prev => prev.filter(r => r.id !== id));
        }
    };

    const runAiBrainstorm = async () => {
        if (!brainstormInput.trim()) return;
        setIsAiLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `As a world-class Reliability Engineer, perform a rigorous Failure Mode and Effects Analysis (FMEA).
            
CONTEXT:
System Category: "${selectedCategory}"
Scenario Description: "${brainstormInput}"

TASK:
1. Identify the most likely System Part and specific Failure Mode.
2. Determine Potential Effects (Operational, Safety, Financial).
3. Critical Step: Identify MULTIPLE distinct potential Root Causes.
4. For EVERY root cause identified, provide a unique, targeted Engineering Recommended Action. 
   - Each cause must have exactly one specific action. 
   - Do not combine multiple unrelated causes into a single list item.
5. Provide standard FMEA scores (1-10) for Severity, Occurrence, and Detection based on industry benchmarks.
6. Identify the primary Responsibility role for mitigation.

The output MUST be a structured JSON response reflecting this one-to-one cause-action mapping in the 'analysis' field.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: {
                    systemInstruction: "You are an expert FMEA consultant. You provide structured reliability data. You focus on identifying diverse failure paths and specific mitigations for each path.",
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            systemPart: { type: Type.STRING },
                            failureMode: { type: Type.STRING },
                            potentialEffects: { type: Type.STRING },
                            severity: { type: Type.NUMBER },
                            occurrence: { type: Type.NUMBER },
                            detection: { type: Type.NUMBER },
                            responsibility: { type: Type.STRING },
                            analysis: {
                                type: Type.ARRAY,
                                description: "Mapping of specific causes to unique actions.",
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        cause: { type: Type.STRING, description: "A unique root cause." },
                                        action: { type: Type.STRING, description: "The specific mitigation for this cause." }
                                    },
                                    required: ["cause", "action"]
                                }
                            }
                        },
                        required: ["systemPart", "failureMode", "potentialEffects", "severity", "occurrence", "detection", "responsibility", "analysis"]
                    }
                }
            });

            const textResponse = response.text.trim();
            const result = JSON.parse(textResponse);
            
            // Format multiple causes and actions into the record strings as numbered lists
            const potentialCauses = (result.analysis || []).map((item: any, idx: number) => `${idx + 1}. ${item.cause}`).join('\n');
            const recommendedActions = (result.analysis || []).map((item: any, idx: number) => `${idx + 1}. ${item.action}`).join('\n');

            const newRecord: FmeaRecord = {
                id: Date.now().toString(),
                systemPart: result.systemPart,
                failureMode: result.failureMode,
                potentialEffects: result.potentialEffects,
                severity: result.severity,
                potentialCauses: potentialCauses,
                occurrence: result.occurrence,
                currentControls: 'To be defined by local engineering',
                detection: result.detection,
                rpn: (result.severity || 5) * (result.occurrence || 5) * (result.detection || 5),
                recommendedActions: recommendedActions,
                responsibility: result.responsibility
            };
            setRecords([newRecord, ...records]);
            setBrainstormInput('');
        } catch (e) {
            console.error("FMEA AI Brainstorm Error:", e);
            alert('AI analysis failed. Please try a more descriptive technical scenario.');
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-gray-800/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-gray-700/50 shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-brand-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-500/20">
                        <PuzzleIcon className="w-10 h-10 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">FMEA Command Center</h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">Reliability Engineering • Risk Priority Hub</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <select 
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-[10px] font-black text-brand-400 uppercase tracking-widest outline-none focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer"
                        >
                            {SYSTEM_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <button 
                            onClick={handleAddManual}
                            className="w-full px-6 py-2.5 bg-gray-900 border border-gray-700 hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95"
                        >
                            Manual Entry
                        </button>
                    </div>
                </div>
            </div>

            {/* AI Brainstorming Console */}
            <div className="bg-gray-900/50 border border-brand-500/20 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
                    <BeakerIcon className="w-64 h-64 text-brand-400" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-2xl">🧠</span>
                        <h2 className="text-lg font-black text-white uppercase tracking-widest">Neural Failure Brainstorming</h2>
                    </div>
                    <div className="grid lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2 space-y-4">
                            <p className="text-sm text-gray-500 font-medium">Input a failure scenario or technical symptom. The AI will extrapolate potential root causes and assign distinct engineering mitigations for each, mapped 1:1 for audit transparency.</p>
                            <textarea 
                                value={brainstormInput}
                                onChange={(e) => setBrainstormInput(e.target.value)}
                                placeholder="E.g., 'Chilled water supply temperature is rising intermittently despite compressors running at 100% capacity...'"
                                className="w-full bg-gray-950 border border-gray-800 rounded-[1.5rem] p-6 text-sm text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-gray-700 h-32 font-bold leading-relaxed shadow-inner"
                            />
                            <div className="flex justify-end">
                                <button 
                                    onClick={runAiBrainstorm}
                                    disabled={isAiLoading || !brainstormInput.trim()}
                                    className="px-12 py-4 bg-brand-600 hover:bg-brand-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-900/40 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                    {isAiLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            Orchestrating Failure Models...
                                        </>
                                    ) : (
                                        <>
                                            <BeakerIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                            Generate Reliability Analysis
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="bg-gray-800/40 rounded-3xl p-8 border border-gray-700/50 flex flex-col justify-center">
                            <h3 className="text-[10px] font-black text-brand-400 uppercase tracking-[0.3em] mb-4">Prompt Intelligence</h3>
                            <ul className="space-y-4 text-xs text-gray-400 font-bold uppercase tracking-tight">
                                <li className="flex items-start gap-3">
                                    <ShieldCheckIcon className="w-4 h-4 text-brand-500 mt-0.5" />
                                    <span>Maps unique causes to individual actions</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <ShieldCheckIcon className="w-4 h-4 text-brand-500 mt-0.5" />
                                    <span>Applies multi-vector risk assessment</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <ShieldCheckIcon className="w-4 h-4 text-brand-500 mt-0.5" />
                                    <span>Standardizes data for ISO 31000 review</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-md p-8 rounded-[2.5rem] border border-gray-700/50 shadow-2xl">
                    <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-8 flex items-center">
                        <ChartBarIcon className="w-4 h-4 mr-3" />
                        RPN (Risk Priority Number) Distribution
                    </h2>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    stroke="#64748b" 
                                    fontSize={10} 
                                    angle={-45} 
                                    textAnchor="end" 
                                    interval={0} 
                                />
                                <YAxis stroke="#64748b" fontSize={10} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    formatter={(value: number) => [`RPN: ${value}`, 'Score']}
                                    labelFormatter={(label, payload) => payload[0]?.payload.fullName || label}
                                />
                                <Bar dataKey="rpn" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.rpn >= 200 ? '#ef4444' : entry.rpn >= 100 ? '#f97316' : '#3b82f6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-gray-950 border border-brand-500/20 rounded-[2.5rem] p-10 flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.02]">
                        <PuzzleIcon className="w-40 h-40" />
                    </div>
                    <h3 className="text-[10px] font-black text-brand-400 uppercase tracking-[0.3em] mb-4">Risk Evaluation Matrix</h3>
                    <p className="text-sm text-gray-400 leading-relaxed font-bold italic">
                        "Reliability engineering requires identifying distinct root causes. A consolidated action for multiple causes is an audit failure risk."
                    </p>
                    <div className="mt-8 grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-800/50 rounded-2xl border border-gray-700">
                            <span className="text-[9px] font-black text-gray-500 uppercase block mb-1 text-center">Highest RPN</span>
                            <span className="text-2xl font-black text-white block text-center">{Math.max(...records.map(r => r.rpn), 0)}</span>
                        </div>
                        <div className="p-4 bg-gray-800/50 rounded-2xl border border-gray-700">
                            <span className="text-[9px] font-black text-gray-500 uppercase block mb-1 text-center">FMEA Depth</span>
                            <span className="text-2xl font-black text-white block text-center">{records.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* FMEA Spreadsheet Table */}
            <div className="bg-gray-800/50 backdrop-blur-md rounded-[2.5rem] border border-gray-700/50 shadow-2xl overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/40">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">Master FMEA Register</h2>
                    <button 
                        onClick={() => {
                            const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `fmea_export_${new Date().toISOString().split('T')[0]}.json`;
                            link.click();
                        }}
                        className="flex items-center gap-2 text-[9px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-all"
                    >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        Export Audit Log
                    </button>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full text-[11px] text-left">
                        <thead className="bg-gray-950/50 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-5">System Asset / Part</th>
                                <th className="px-6 py-5">Failure Mode & operational effects</th>
                                <th className="px-6 py-5 text-center">S</th>
                                <th className="px-6 py-5 text-center">O</th>
                                <th className="px-6 py-5 text-center">D</th>
                                <th className="px-6 py-5 text-center">RPN</th>
                                <th className="px-6 py-5">Root Cause(s) & Recommended Action(s)</th>
                                <th className="px-6 py-5 text-right">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/30">
                            {records.map(record => (
                                <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-5 align-top">
                                        <input 
                                            value={record.systemPart} 
                                            onChange={e => updateRecord(record.id, { systemPart: e.target.value })}
                                            className="bg-transparent border-0 outline-none text-white font-black uppercase w-full focus:bg-gray-950/50 rounded p-1"
                                        />
                                        <div className="text-[9px] text-brand-400 mt-1 uppercase font-black tracking-widest">{record.responsibility}</div>
                                    </td>
                                    <td className="px-6 py-5 align-top min-w-[200px]">
                                        <textarea 
                                            value={record.failureMode} 
                                            onChange={e => updateRecord(record.id, { failureMode: e.target.value })}
                                            className="bg-transparent border-0 outline-none text-gray-300 font-bold w-full min-h-[40px] focus:bg-gray-950/50 rounded p-1 custom-scrollbar"
                                        />
                                        <div className="text-[9px] text-gray-600 mt-2 italic font-medium leading-relaxed">Impact: {record.potentialEffects}</div>
                                    </td>
                                    <td className="px-6 py-5 text-center align-top">
                                        <select 
                                            value={record.severity} 
                                            onChange={e => updateRecord(record.id, { severity: parseInt(e.target.value) })}
                                            className="bg-gray-950 border border-gray-800 text-white rounded p-1 outline-none appearance-none text-center cursor-pointer hover:bg-gray-900 transition-colors"
                                        >
                                            {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-6 py-5 text-center align-top">
                                        <select 
                                            value={record.occurrence} 
                                            onChange={e => updateRecord(record.id, { occurrence: parseInt(e.target.value) })}
                                            className="bg-gray-950 border border-gray-800 text-white rounded p-1 outline-none appearance-none text-center cursor-pointer hover:bg-gray-900 transition-colors"
                                        >
                                            {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-6 py-5 text-center align-top">
                                        <select 
                                            value={record.detection} 
                                            onChange={e => updateRecord(record.id, { detection: parseInt(e.target.value) })}
                                            className="bg-gray-950 border border-gray-800 text-white rounded p-1 outline-none appearance-none text-center cursor-pointer hover:bg-gray-900 transition-colors"
                                        >
                                            {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-6 py-5 text-center align-top">
                                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black border transition-all ${getRpnClass(record.rpn)} shadow-lg scale-90 group-hover:scale-100`}>
                                            {record.rpn}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 align-top min-w-[350px]">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-[8px] font-black text-gray-600 uppercase block mb-1">Causes</span>
                                                <textarea 
                                                    value={record.potentialCauses} 
                                                    onChange={e => updateRecord(record.id, { potentialCauses: e.target.value })}
                                                    className="bg-gray-950/30 border-0 outline-none text-gray-400 font-medium w-full min-h-[80px] focus:bg-gray-950/50 rounded p-1 whitespace-pre-line text-[10px] leading-relaxed custom-scrollbar"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[8px] font-black text-brand-600 uppercase block mb-1">Actions</span>
                                                <textarea 
                                                    value={record.recommendedActions} 
                                                    onChange={e => updateRecord(record.id, { recommendedActions: e.target.value })}
                                                    className="bg-gray-950/30 border-0 outline-none text-brand-400 font-bold w-full min-h-[80px] focus:bg-gray-950/50 rounded p-1 whitespace-pre-line text-[10px] leading-relaxed custom-scrollbar"
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right align-top">
                                        <button 
                                            onClick={() => deleteRecord(record.id)}
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
                <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-4">Integrity in Failure Analysis</h3>
                <p className="text-xs text-gray-500 max-w-2xl mx-auto leading-relaxed uppercase font-black">
                    Regulatory standards (ISO 31000) mandate that for every risk identified, a distinct mitigation owner and action must be assigned. Avoid "blanket" recommendations to ensure technical accountability.
                </p>
            </div>
        </div>
    );
};

export default FmeaPage;
