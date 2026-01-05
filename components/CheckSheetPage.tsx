
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheckIcon, 
  ShieldCheckIcon, 
  BeakerIcon, 
  PrinterIcon, 
  ExclamationTriangleIcon, 
  ChevronDownIcon, 
  FilePdfIcon,
  ChartBarIcon,
  ShieldExclamationIcon,
  FireIcon
} from './icons.tsx';
import type { CheckSheetItem } from '../types.ts';
import { GoogleGenAI } from "@google/genai";
import { generatePdfFromElement } from '../utils/pdfGenerator.ts';

const ISO_TEMPLATES: Record<string, CheckSheetItem[]> = {
    'ISO 41001: Facility Management': [
        { id: '41-1', category: 'Environment', requirement: 'Ambient noise levels at workstations < 45dB', isoClause: 'Clause 8.1', status: 'N/A', criticality: 'Standard', remarks: '' },
        { id: '41-2', category: 'Utilities', requirement: 'UPS/Generator operational check for server/network rack', isoClause: 'Clause 7.1.3', status: 'N/A', criticality: 'Vital', remarks: '' },
        { id: '41-3', category: 'Workspace', requirement: 'Cleanliness and hygiene of shared headsets/keyboards', isoClause: 'Clause 8.2', status: 'N/A', criticality: 'Standard', remarks: '' },
        { id: '41-4', category: 'Maintenance', requirement: 'HVAC filters inspected and cleaned per schedule', isoClause: 'Clause 8.1', status: 'N/A', criticality: 'Critical', remarks: '' },
        { id: '41-5', category: 'Safety', requirement: 'Pest control services verified and logged', isoClause: 'Clause 8.1', status: 'N/A', criticality: 'Standard', remarks: '' },
    ],
    'ISO 9001: Quality Management': [
        { id: '9-1', category: 'Process', requirement: 'Standard Operating Procedures (SOPs) available at workstations', isoClause: 'Clause 7.5', status: 'N/A', criticality: 'Critical', remarks: '' },
        { id: '9-2', category: 'Customer', requirement: 'Customer feedback register updated for current month', isoClause: 'Clause 9.1.2', status: 'N/A', criticality: 'Standard', remarks: '' },
        { id: '9-3', category: 'Resource', requirement: 'Equipment calibration certificates current and valid', isoClause: 'Clause 7.1.5', status: 'N/A', criticality: 'Vital', remarks: '' },
        { id: '9-4', category: 'Control', requirement: 'Non-conformance reports (NCR) closed within 30 days', isoClause: 'Clause 10.2', status: 'N/A', criticality: 'Vital', remarks: '' },
    ],
    'ISO 45001: Health & Safety': [
        { id: '45-1', category: 'Emergency', requirement: 'First aid kits inspected and fully stocked', isoClause: 'Clause 8.2', status: 'N/A', criticality: 'Vital', remarks: '' },
        { id: '45-2', category: 'Fire', requirement: 'Fire exits and emergency routes clearly marked and unblocked', isoClause: 'Clause 8.2', status: 'N/A', criticality: 'Vital', remarks: '' },
        { id: '45-3', category: 'Ergonomics', requirement: 'Adjustable chairs and monitor risers provided for all agents', isoClause: 'Clause 8.1', status: 'N/A', criticality: 'Standard', remarks: '' },
        { id: '45-4', category: 'Hazard', requirement: 'Trip hazards (cables, loose tiles) identified and mitigated', isoClause: 'Clause 8.1.2', status: 'N/A', criticality: 'Critical', remarks: '' },
    ]
};

const getCriticalityStyles = (level: string) => {
  switch(level) {
    case 'Vital': return 'bg-red-950/20 text-red-500 border-red-500/30';
    case 'Critical': return 'bg-orange-950/20 text-orange-500 border-orange-500/30';
    default: return 'bg-blue-950/20 text-blue-400 border-blue-500/30';
  }
};

const CheckSheetPage: React.FC = () => {
    const [selectedStandard, setSelectedStandard] = useState<string>(Object.keys(ISO_TEMPLATES)[0]);
    const [items, setItems] = useState<CheckSheetItem[]>([]);
    const [auditContext, setAuditContext] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [pdfProgress, setPdfProgress] = useState<number | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem(`app_checksheet_v2_${selectedStandard}`);
        if (saved) setItems(JSON.parse(saved));
        else setItems(ISO_TEMPLATES[selectedStandard]);
    }, [selectedStandard]);

    useEffect(() => {
        if (items.length > 0) {
            localStorage.setItem(`app_checksheet_v2_${selectedStandard}`, JSON.stringify(items));
        }
    }, [items, selectedStandard]);

    const stats = useMemo(() => {
        const total = items.length;
        const passed = items.filter(i => i.status === 'Pass').length;
        const failed = items.filter(i => i.status === 'Fail').length;
        const pending = items.filter(i => i.status === 'N/A').length;
        
        // Calculate Weighted Compliance
        let totalWeight = 0;
        let earnedWeight = 0;
        items.forEach(i => {
          if (i.status === 'N/A') return;
          const w = i.criticality === 'Vital' ? 10 : i.criticality === 'Critical' ? 5 : 2;
          totalWeight += w;
          if (i.status === 'Pass') earnedWeight += w;
        });

        const healthScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 100;

        return { total, passed, failed, pending, healthScore };
    }, [items]);

    const updateItem = (id: string, updates: Partial<CheckSheetItem>) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const runAiAuditor = async () => {
        setIsAiLoading(true);
        setAiReport(null);

        const failedItems = items.filter(i => i.status === 'Fail').map(i => `- ${i.criticality} Failure: ${i.requirement} (${i.remarks || 'No remarks provided'})`).join('\n');
        const passSummary = items.filter(i => i.status === 'Pass').length;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Conduct a technical audit summary for "${selectedStandard}".
CURRENT SNAPSHOT:
- Health Score: ${stats.healthScore}%
- Conforming Controls: ${passSummary}
- Non-Conformities: ${items.filter(i => i.status === 'Fail').length}
- Manual Observer Context: "${auditContext || 'None'}"

FAILED REQUIREMENTS:
${failedItems || 'None - all checked items passing.'}

REPORT STRUCTURE:
1. Executive Compliance Verdict (Formal).
2. Root Cause Analysis (Predictive) for Vital failures.
3. Corrective Action Plan (Reference ISO 10.2).
4. Continuous Improvement Recommendations.

Output in professional Markdown.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });

            setAiReport(response.text || 'Audit engine returned empty response.');
        } catch (e) {
            console.error(e);
            alert('AI auditing failed. Check API Key.');
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
      setPdfProgress(0);
      try {
        const fileName = `Audit_Report_${selectedStandard.split(':')[0].trim().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
        await generatePdfFromElement('master-checksheet-container', fileName, (p) => setPdfProgress(p));
      } catch (e) {
        alert('Failed to generate PDF.');
      } finally {
        setTimeout(() => setPdfProgress(null), 1000);
      }
    };

    const handleReset = () => {
        if (confirm(`Purge all audit data for ${selectedStandard}?`)) {
            setItems(ISO_TEMPLATES[selectedStandard]);
            localStorage.removeItem(`app_checksheet_v2_${selectedStandard}`);
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Header / Dashboard Overview */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-gray-800/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-gray-700/50 shadow-2xl print:hidden">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-brand-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-500/20">
                        <ClipboardCheckIcon className="w-10 h-10 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Regulatory Check Sheet</h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">Weighted Compliance Health Monitor</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                    <div className="relative group">
                        <select 
                            value={selectedStandard}
                            onChange={(e) => setSelectedStandard(e.target.value)}
                            className="appearance-none bg-gray-950 border border-gray-800 text-white px-6 py-3 pr-12 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-brand-500 transition-all cursor-pointer"
                        >
                            {Object.keys(ISO_TEMPLATES).map(std => <option key={std} value={std}>{std}</option>)}
                        </select>
                        <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                    
                    <button 
                        onClick={handleDownloadPdf}
                        disabled={pdfProgress !== null}
                        className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-brand-900/20"
                    >
                        <FilePdfIcon className="w-4 h-4" />
                        {pdfProgress !== null ? 'Syncing...' : 'Export Audit PDF'}
                    </button>
                    <button 
                        onClick={handleReset}
                        className="px-6 py-3 bg-red-950/20 border border-red-900/30 text-red-500 hover:bg-red-900/40 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        Purge Session
                    </button>
                </div>
            </div>

            {/* Compliance Health Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 print:hidden">
                <div className="md:col-span-2 lg:col-span-1 bg-gray-950 border border-gray-800 rounded-[2rem] p-8 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-brand-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-6">Health Score</div>
                    <div className="relative">
                        <svg className="w-32 h-32 transform -rotate-90">
                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-900" />
                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                    strokeDasharray={364.4} strokeDashoffset={364.4 - (364.4 * stats.healthScore) / 100}
                                    className={`${stats.healthScore > 85 ? 'text-green-500' : stats.healthScore > 60 ? 'text-orange-500' : 'text-red-500'} transition-all duration-1000`} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-3xl font-black text-white">{stats.healthScore}%</div>
                    </div>
                </div>

                <div className="bg-gray-800/40 p-8 rounded-[2rem] border border-gray-700/50 flex flex-col justify-center text-center">
                    <div className="w-10 h-10 bg-green-500/20 text-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <ShieldCheckIcon className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-black text-white">{stats.passed}</span>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">Conforming</span>
                </div>

                <div className="bg-gray-800/40 p-8 rounded-[2rem] border border-gray-700/50 flex flex-col justify-center text-center">
                    <div className="w-10 h-10 bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <ShieldExclamationIcon className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-black text-white">{stats.failed}</span>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">Non-Conforming</span>
                </div>

                <div className="bg-gray-800/40 p-8 rounded-[2rem] border border-gray-700/50 flex flex-col justify-center text-center">
                    <div className="w-10 h-10 bg-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <ChartBarIcon className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-black text-white">{stats.total}</span>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">Total Vectors</span>
                </div>

                <div className="bg-gray-950 p-8 rounded-[2rem] border border-gray-800 flex flex-col justify-center text-center">
                    <div className="w-10 h-10 bg-gray-800 text-gray-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <FireIcon className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-black text-white">{items.filter(i => i.criticality === 'Vital' && i.status === 'Fail').length}</span>
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-2">Vital Breaches</span>
                </div>
            </div>

            {/* Master Audit Container */}
            <div id="master-checksheet-container" className="bg-gray-800/50 backdrop-blur-md rounded-[2.5rem] border border-gray-700/50 shadow-2xl overflow-hidden print:shadow-none print:border-none print:bg-white print:text-black">
                
                {/* PDF Header Section (Visible on export) */}
                <div className="px-10 py-12 border-b border-gray-700 bg-gray-950/40 print:bg-white print:border-black flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg">
                           <ShieldCheckIcon className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight print:text-black leading-none">{selectedStandard} Audit</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-3">Documented Verification • {new Date().toDateString()}</p>
                        </div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center min-w-[180px] print:border-black">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 print:text-black">Health Index</span>
                        <span className={`text-4xl font-black ${stats.healthScore > 80 ? 'text-green-500' : 'text-orange-500'} print:text-black`}>{stats.healthScore}%</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-gray-950/50 text-[10px] font-black text-gray-600 uppercase tracking-widest print:bg-gray-100 print:text-black">
                            <tr>
                                <th className="px-10 py-6">Audit Path / Requirement</th>
                                <th className="px-10 py-6 text-center">Criticality</th>
                                <th className="px-10 py-6 text-center">Status</th>
                                <th className="px-10 py-6">Evidence & Observations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/30 print:divide-gray-200">
                            {items.map(item => (
                                <tr key={item.id} className="hover:bg-white/5 transition-colors group print:hover:bg-transparent break-inside-avoid">
                                    <td className="px-10 py-8">
                                        <div className="text-white font-black uppercase text-xs print:text-black leading-tight max-w-md">{item.requirement}</div>
                                        <div className="flex items-center gap-3 mt-3">
                                            <span className="text-[9px] text-brand-400 font-black uppercase tracking-widest">{item.category}</span>
                                            <span className="text-gray-700 text-[10px]">•</span>
                                            <span className="text-[9px] font-mono text-gray-500 font-black uppercase tracking-tighter">{item.isoClause}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-center">
                                        <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase border ${getCriticalityStyles(item.criticality)}`}>
                                            {item.criticality}
                                        </span>
                                    </td>
                                    <td className="px-10 py-8 text-center">
                                        <div className="flex justify-center gap-1.5 print:hidden">
                                            {['Pass', 'Fail', 'N/A'].map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => updateItem(item.id, { status: s as any })}
                                                    className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                                        item.status === s 
                                                            ? (s === 'Pass' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : s === 'Fail' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-gray-700 text-white')
                                                            : 'bg-gray-950 text-gray-600 hover:text-gray-400'
                                                    }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="hidden print:block font-black text-xs uppercase">{item.status}</div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="relative">
                                            <textarea 
                                                value={item.remarks}
                                                onChange={(e) => updateItem(item.id, { remarks: e.target.value })}
                                                placeholder="Document physical evidence or technical anomalies..."
                                                className="bg-gray-950/30 border border-gray-800 rounded-xl px-4 py-3 text-[11px] text-white w-full h-12 outline-none focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-gray-800 print:bg-transparent print:border-none print:text-black print:p-0 resize-none"
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Formal Signature Section (Visible on PDF) */}
                <div className="hidden print:grid grid-cols-2 gap-20 p-16 mt-12 border-t-2 border-gray-100">
                    <div className="flex flex-col items-center">
                        <div className="w-full h-[1px] bg-black mb-4"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Lead Auditor Approval</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-full h-[1px] bg-black mb-4"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Facility Operations Head</span>
                    </div>
                    <div className="col-span-2 text-center text-[8px] text-gray-400 mt-10 uppercase font-bold tracking-[0.3em]">
                        System Verification ID: {new Date().getTime().toString(16).toUpperCase()} • Document Controlled by ISO Registry
                    </div>
                </div>
            </div>

            {/* AI Strategic Auditor Console */}
            <div className="bg-gray-900/50 border border-brand-500/20 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden relative print:hidden">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                    <ShieldCheckIcon className="w-64 h-64 text-brand-400" />
                </div>
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🧠</span>
                            <h2 className="text-xl font-black text-white uppercase tracking-widest">Neural Compliance Scan</h2>
                        </div>
                        <button 
                            onClick={runAiAuditor}
                            disabled={isAiLoading}
                            className="px-10 py-4 bg-brand-600 hover:bg-brand-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-900/40 transition-all flex items-center gap-4 disabled:opacity-50 group"
                        >
                            {isAiLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    Syncing Regulatory Logic...
                                </>
                            ) : (
                                <>
                                    <BeakerIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                    Generate Strategic Audit Report
                                </>
                            )}
                        </button>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2 space-y-4">
                            <p className="text-sm text-gray-500 font-bold uppercase tracking-tight italic">Optionally provide additional management context for the AI engine.</p>
                            <textarea 
                                value={auditContext}
                                onChange={(e) => setAuditContext(e.target.value)}
                                placeholder={`Management observations for this ${selectedStandard} cycle...`}
                                className="w-full bg-gray-950 border border-gray-800 rounded-[1.5rem] p-6 text-sm text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-gray-700 h-32 font-bold leading-relaxed shadow-inner"
                            />
                        </div>
                        <div className="bg-gray-800/40 rounded-3xl p-8 border border-gray-700/50 flex flex-col justify-center min-h-[250px] relative overflow-hidden group">
                            {aiReport ? (
                                <div className="prose prose-invert prose-xs max-w-none animate-in fade-in zoom-in-95 duration-500 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <div className="bg-gray-950/80 p-8 rounded-2xl border border-teal-500/20 text-[11px] text-gray-300 leading-relaxed font-medium" 
                                         dangerouslySetInnerHTML={{ __html: aiReport.replace(/\n/g, '<br/>') }} />
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                        <ExclamationTriangleIcon className="w-8 h-8 text-gray-700" />
                                    </div>
                                    <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Neural Auditor Active</h3>
                                    <p className="text-[9px] text-gray-700 font-bold uppercase mt-2">Scanning item data for compliance anomalies</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Zero Harm Footer */}
            <div className="bg-gray-950 p-10 rounded-[2.5rem] border border-gray-800 text-center relative overflow-hidden shadow-2xl print:bg-white print:border-black print:text-black">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-600 to-transparent print:hidden"></div>
                <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-4 print:text-black">Audit Integrity Framework</h3>
                <p className="text-xs text-gray-500 max-w-2xl mx-auto leading-relaxed uppercase font-black print:text-black">
                    Continuous monitoring of facility vectors ensures alignment with ISO 41001 requirements. Non-conformities documented above must be remediated with documented proof of correction within the current auditing cycle.
                </p>
            </div>
        </div>
    );
};

export default CheckSheetPage;
