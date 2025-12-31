
import React, { useState, useEffect, useMemo } from 'react';
import { ClipboardCheckIcon, ShieldCheckIcon, BeakerIcon, PrinterIcon, ExclamationTriangleIcon, ChevronDownIcon, FilePdfIcon } from './icons.tsx';
import type { CheckSheetItem } from '../types.ts';
import { GoogleGenAI } from "@google/genai";
import { generatePdfFromElement } from '../utils/pdfGenerator.ts';

const ISO_TEMPLATES: Record<string, CheckSheetItem[]> = {
    'ISO 41001: Facility Management': [
        { id: '41-1', category: 'Environment', requirement: 'Ambient noise levels at workstations < 45dB', isoClause: 'Clause 8.1', status: 'N/A', remarks: '' },
        { id: '41-2', category: 'Utilities', requirement: 'UPS/Generator operational check for server/network rack', isoClause: 'Clause 7.1.3', status: 'N/A', remarks: '' },
        { id: '41-3', category: 'Workspace', requirement: 'Cleanliness and hygiene of shared headsets/keyboards', isoClause: 'Clause 8.2', status: 'N/A', remarks: '' },
        { id: '41-4', category: 'Maintenance', requirement: 'HVAC filters inspected and cleaned per schedule', isoClause: 'Clause 8.1', status: 'N/A', remarks: '' },
        { id: '41-5', category: 'Safety', requirement: 'Pest control services verified and logged', isoClause: 'Clause 8.1', status: 'N/A', remarks: '' },
    ],
    'ISO 9001: Quality Management': [
        { id: '9-1', category: 'Process', requirement: 'Standard Operating Procedures (SOPs) available at workstations', isoClause: 'Clause 7.5', status: 'N/A', remarks: '' },
        { id: '9-2', category: 'Customer', requirement: 'Customer feedback register updated for current month', isoClause: 'Clause 9.1.2', status: 'N/A', remarks: '' },
        { id: '9-3', category: 'Resource', requirement: 'Equipment calibration certificates current and valid', isoClause: 'Clause 7.1.5', status: 'N/A', remarks: '' },
        { id: '9-4', category: 'Control', requirement: 'Non-conformance reports (NCR) closed within 30 days', isoClause: 'Clause 10.2', status: 'N/A', remarks: '' },
    ],
    'ISO 14001: Environmental': [
        { id: '14-1', category: 'Waste', requirement: 'Hazardous waste stored in designated, labeled containers', isoClause: 'Clause 8.1', status: 'N/A', remarks: '' },
        { id: '14-2', category: 'Energy', requirement: 'Light and HVAC shutdown protocols followed after hours', isoClause: 'Clause 6.1.2', status: 'N/A', remarks: '' },
        { id: '14-3', category: 'Emergency', requirement: 'Spill kits accessible and inventory complete', isoClause: 'Clause 8.2', status: 'N/A', remarks: '' },
        { id: '14-4', category: 'Compliance', requirement: 'Environmental impact register reviewed in last quarter', isoClause: 'Clause 6.1.2', status: 'N/A', remarks: '' },
    ],
    'ISO 45001: Health & Safety': [
        { id: '45-1', category: 'Emergency', requirement: 'First aid kits inspected and fully stocked', isoClause: 'Clause 8.2', status: 'N/A', remarks: '' },
        { id: '45-2', category: 'Fire', requirement: 'Fire exits and emergency routes clearly marked and unblocked', isoClause: 'Clause 8.2', status: 'N/A', remarks: '' },
        { id: '45-3', category: 'Ergonomics', requirement: 'Adjustable chairs and monitor risers provided for all agents', isoClause: 'Clause 8.1', status: 'N/A', remarks: '' },
        { id: '45-4', category: 'Hazard', requirement: 'Trip hazards (cables, loose tiles) identified and mitigated', isoClause: 'Clause 8.1.2', status: 'N/A', remarks: '' },
    ],
    'ISO 27001: Info Security': [
        { id: '27-1', category: 'Physical', requirement: 'Clear desk and clear screen policy followed', isoClause: 'Annex A.7.15', status: 'N/A', remarks: '' },
        { id: '27-2', category: 'Access', requirement: 'Server room visitor log signed and verified', isoClause: 'Annex A.7.4', status: 'N/A', remarks: '' },
        { id: '27-3', category: 'Media', requirement: 'Shredder bins locked and scheduled for disposal', isoClause: 'Annex A.7.14', status: 'N/A', remarks: '' },
        { id: '27-4', category: 'Inventory', requirement: 'Asset tags present on all portable devices (laptops)', isoClause: 'Annex A.5.9', status: 'N/A', remarks: '' },
    ]
};

const CheckSheetPage: React.FC = () => {
    const [selectedStandard, setSelectedStandard] = useState<string>(Object.keys(ISO_TEMPLATES)[0]);
    const [items, setItems] = useState<CheckSheetItem[]>([]);
    const [auditContext, setAuditContext] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [pdfProgress, setPdfProgress] = useState<number | null>(null);

    // Load initial data from storage or template
    useEffect(() => {
        const saved = localStorage.getItem(`app_checksheet_${selectedStandard}`);
        if (saved) {
            setItems(JSON.parse(saved));
        } else {
            setItems(ISO_TEMPLATES[selectedStandard]);
        }
    }, [selectedStandard]);

    // Save data whenever items change
    useEffect(() => {
        if (items.length > 0) {
            localStorage.setItem(`app_checksheet_${selectedStandard}`, JSON.stringify(items));
        }
    }, [items, selectedStandard]);

    const stats = useMemo(() => {
        return {
            total: items.length,
            passed: items.filter(i => i.status === 'Pass').length,
            failed: items.filter(i => i.status === 'Fail').length,
            pending: items.filter(i => i.status === 'N/A').length
        };
    }, [items]);

    const updateItem = (id: string, updates: Partial<CheckSheetItem>) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const runAiAuditor = async () => {
        if (!auditContext.trim()) return;
        setIsAiLoading(true);
        setAiReport(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Perform an Audit Compliance report for "${selectedStandard}" based on these findings: "${auditContext}".
Reference these current check sheet statuses for the specific requirements: 
${JSON.stringify(items.map(i => ({ req: i.requirement, status: i.status })))}.

Provide a formal executive summary in Markdown format, highlighting:
1. Compliance Health Score for ${selectedStandard}.
2. Critical Non-Conformities (NC) identified.
3. Recommended Engineering or Process Corrective Actions.
Ensure the tone is professional, technical, and regulatory-focused.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });

            setAiReport(response.text || 'Failed to generate report.');
        } catch (e) {
            console.error(e);
            alert('AI auditing failed.');
        } finally {
            setIsAiLoading(false);
        }
    };

    const handlePrint = () => window.print();

    const handleDownloadPdf = async () => {
      setPdfProgress(0);
      try {
        const fileName = `Checksheet_${selectedStandard.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        await generatePdfFromElement('master-checksheet-container', fileName, (p) => setPdfProgress(p));
      } catch (e) {
        alert('Failed to generate PDF.');
      } finally {
        setTimeout(() => setPdfProgress(null), 1000);
      }
    };

    const handleReset = () => {
        if (confirm(`Reset all entries for ${selectedStandard}?`)) {
            setItems(ISO_TEMPLATES[selectedStandard]);
            localStorage.removeItem(`app_checksheet_${selectedStandard}`);
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-gray-800/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-gray-700/50 shadow-2xl print:hidden">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-brand-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-500/20">
                        <ClipboardCheckIcon className="w-10 h-10 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Regulatory Check Sheet</h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">Multi-Standard Facility Compliance Hub</p>
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
                        className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                        <FilePdfIcon className="w-4 h-4" />
                        {pdfProgress !== null ? 'Exporting...' : 'Export PDF'}
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="px-6 py-3 bg-gray-900 border border-gray-700 text-gray-400 hover:text-white rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        <PrinterIcon className="w-4 h-4" />
                        Print
                    </button>
                    <button 
                        onClick={handleReset}
                        className="px-6 py-3 bg-red-950/20 border border-red-900/30 text-red-500 hover:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        Reset Sheet
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
                <div className="bg-gray-800/50 p-6 rounded-3xl border border-gray-700/50 text-center group hover:border-brand-500/50 transition-all">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Total Controls</span>
                    <span className="text-3xl font-black text-white">{stats.total}</span>
                </div>
                <div className="bg-green-900/10 p-6 rounded-3xl border border-green-500/20 text-center group hover:border-green-500/50 transition-all">
                    <span className="text-[10px] font-black text-green-500 uppercase tracking-widest block mb-2">Verified Conform</span>
                    <span className="text-3xl font-black text-green-400">{stats.passed}</span>
                </div>
                <div className="bg-red-900/10 p-6 rounded-3xl border border-red-500/20 text-center group hover:border-red-500/50 transition-all">
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-2">Non-Conformities</span>
                    <span className="text-3xl font-black text-red-400">{stats.failed}</span>
                </div>
                <div className="bg-gray-900/50 p-6 rounded-3xl border border-gray-800 text-center group hover:border-gray-700 transition-all">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-2">Awaiting Review</span>
                    <span className="text-3xl font-black text-gray-500">{stats.pending}</span>
                </div>
            </div>

            {/* Check Sheet Table Container for PDF */}
            <div id="master-checksheet-container" className="bg-gray-800/50 backdrop-blur-md rounded-[2.5rem] border border-gray-700/50 shadow-2xl overflow-hidden print:shadow-none print:border-none print:bg-white print:text-black">
                <div className="px-8 py-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/40 print:bg-white print:border-black">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-8 bg-brand-500 rounded-full"></div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-widest print:text-black">{selectedStandard} Register</h2>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Audit Log for {new Date().toDateString()}</p>
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest print:text-black">Reference: {selectedStandard.split(':')[0]}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-gray-950/50 text-[10px] font-black text-gray-600 uppercase tracking-widest print:bg-gray-100 print:text-black">
                            <tr>
                                <th className="px-8 py-5">Control Requirement</th>
                                <th className="px-8 py-5">Standard Ref</th>
                                <th className="px-8 py-5 text-center">Status</th>
                                <th className="px-8 py-5">Evidence / Observations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/30 print:divide-gray-200">
                            {items.map(item => (
                                <tr key={item.id} className="hover:bg-white/5 transition-colors group print:hover:bg-transparent">
                                    <td className="px-8 py-6">
                                        <div className="text-white font-black uppercase text-[11px] print:text-black leading-tight max-w-sm">{item.requirement}</div>
                                        <div className="text-[9px] text-brand-400 font-black uppercase tracking-widest mt-1.5">{item.category}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-[10px] font-mono text-gray-500 font-black">{item.isoClause}</span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex justify-center gap-1.5 print:hidden">
                                            {['Pass', 'Fail', 'N/A'].map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => updateItem(item.id, { status: s as any })}
                                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                                        item.status === s 
                                                            ? (s === 'Pass' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : s === 'Fail' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-gray-700 text-white')
                                                            : 'bg-gray-950 text-gray-600 hover:text-gray-400'
                                                    }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Print Status */}
                                        <div className="hidden print:block font-black text-xs uppercase">{item.status}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <input 
                                            value={item.remarks}
                                            onChange={(e) => updateItem(item.id, { remarks: e.target.value })}
                                            placeholder="Enter audit evidence..."
                                            className="bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-xs text-white w-full outline-none focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-gray-800/50 print:bg-transparent print:border-none print:text-black"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* AI Reporting Console */}
            <div className="bg-gray-900/50 border border-brand-500/20 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden relative print:hidden">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                    <ShieldCheckIcon className="w-64 h-64 text-brand-400" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-2xl">🧠</span>
                        <h2 className="text-lg font-black text-white uppercase tracking-widest">Neural Auditor Pro</h2>
                    </div>
                    <div className="grid lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2 space-y-4">
                            <p className="text-sm text-gray-500 font-bold uppercase tracking-tight italic">Provide high-level observations or specific site incidents. The AI will cross-reference your remarks against the selected standard.</p>
                            <textarea 
                                value={auditContext}
                                onChange={(e) => setAuditContext(e.target.value)}
                                placeholder={`Specific observations for ${selectedStandard} audit...`}
                                className="w-full bg-gray-950 border border-gray-800 rounded-[1.5rem] p-6 text-sm text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-gray-700 h-32 font-bold leading-relaxed shadow-inner"
                            />
                            <div className="flex justify-end">
                                <button 
                                    onClick={runAiAuditor}
                                    disabled={isAiLoading || !auditContext.trim()}
                                    className="px-12 py-4 bg-brand-600 hover:bg-brand-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-900/40 transition-all flex items-center gap-3 disabled:opacity-50"
                                >
                                    {isAiLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            Generating {selectedStandard} Insights...
                                        </>
                                    ) : (
                                        <>
                                            <BeakerIcon className="w-4 h-4" />
                                            Generate AI Summary
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="bg-gray-800/40 rounded-3xl p-8 border border-gray-700/50 flex flex-col justify-center min-h-[250px] relative overflow-hidden group">
                            {aiReport ? (
                                <div className="prose prose-invert prose-xs max-w-none animate-in fade-in zoom-in-95 duration-500 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <div className="bg-gray-950/60 p-6 rounded-2xl border border-teal-500/20 text-[11px] text-gray-300 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: aiReport.replace(/\n/g, '<br/>') }} />
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                        <ExclamationTriangleIcon className="w-8 h-8 text-gray-700" />
                                    </div>
                                    <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Neural processing ready</h3>
                                    <p className="text-[9px] text-gray-700 font-bold uppercase mt-2">Submit findings for technical analysis</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Disclaimer */}
            <div className="bg-gray-950 p-10 rounded-[2.5rem] border border-gray-800 text-center relative overflow-hidden shadow-2xl print:bg-white print:border-black print:text-black">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-600 to-transparent print:hidden"></div>
                <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-4 print:text-black">ISO Service Verification Framework</h3>
                <p className="text-xs text-gray-500 max-w-2xl mx-auto leading-relaxed uppercase font-black print:text-black">
                    Documented evidence of control as per international standards. All non-conformities must be recorded in the main incident database with a linked RCA (Root Cause Analysis).
                </p>
            </div>
        </div>
    );
};

export default CheckSheetPage;
