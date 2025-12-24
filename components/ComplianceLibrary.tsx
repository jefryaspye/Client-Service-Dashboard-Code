import React, { useState, useMemo } from 'react';
import type { ComplianceStandard, HistoricalTicket } from '../types';
import { ShieldCheckIcon, DocumentCheckIcon, ChevronRightIcon, ClockIcon } from './icons';
import { GoogleGenAI, Type } from "@google/genai";

interface ComplianceLibraryProps {
  historicalData: HistoricalTicket[];
}

export const COMPLIANCE_STANDARDS: ComplianceStandard[] = [
  // ISO 41001 - Facility Management
  { domain: 'Facility Management', standard: 'ISO 41001 (Clause 8.1)', code: 'ISO 41001:2018', scope: 'Operational planning and control: establishment of criteria for FM processes and implementation of control.', applicability: 'Core FM delivery and service scheduling' },
  { domain: 'Facility Management', standard: 'ISO 41001 (Clause 8.2)', code: 'ISO 41001:2018', scope: 'Management of facility management processes and activities to ensure service quality.', applicability: 'Helpdesk workflow and task execution' },
  { domain: 'Facility Management', standard: 'ISO 41001', code: 'ISO 41001:2018', scope: 'FM policy, leadership, planning, operation, performance evaluation, improvement', applicability: 'Organization-wide FM system backbone' },
  
  // ISO 9001 - Quality Management
  { domain: 'Quality Management', standard: 'ISO 9001 (Clause 7.1.3)', code: 'ISO 9001:2015', scope: 'Infrastructure: determine, provide and maintain the infrastructure necessary for operation of processes.', applicability: 'General building and systems maintenance' },
  { domain: 'Quality Management', standard: 'ISO 9001 (Clause 8.5.1)', code: 'ISO 9001:2015', scope: 'Control of production and service provision under controlled conditions.', applicability: 'Service level agreements and delivery quality' },
  { domain: 'Quality Management', standard: 'ISO 9001', code: 'ISO 9001:2015', scope: 'Quality management principles: customer focus, leadership, engagement, improvement.', applicability: 'Customer satisfaction and audit compliance' },

  // ISO 45001 - Health & Safety
  { domain: 'Workplace Safety', standard: 'ISO 45001 (Clause 8.1.1)', code: 'ISO 45001:2018', scope: 'General OH&S operational planning and control to eliminate hazards and reduce risks.', applicability: 'Risk assessments and safe work practices' },
  { domain: 'Workplace Safety', standard: 'ISO 45001', code: 'ISO 45001:2018', scope: 'Occupational health and safety (OH&S) management system requirements.', applicability: 'Worker safety and health protection protocols' },

  // ISO 14001 - Environmental
  { domain: 'Environmental Management', standard: 'ISO 14001', code: 'ISO 14001:2015', scope: 'Environmental management system: enhancement of environmental performance and fulfillment of obligations.', applicability: 'Waste management, energy efficiency, and spills' },

  // Specialized Contact Center Standards
  { domain: 'Contact Center', standard: 'ISO 18295-1', code: 'ISO 18295-1:2017', scope: 'Customer interaction standards, performance metrics, complaints handling, outsourced provider controls', applicability: 'Contact center operations and SLAs' },
  { domain: 'Contact Center', standard: 'ISO 10002', code: 'ISO 10002:2018', scope: 'Complaints handling process, continual improvement', applicability: 'Customer service and CCC support' },
  
  // IT & Information Security
  { domain: 'Information Security', standard: 'ISO 27001', code: 'ISO/IEC 27001:2022', scope: 'ISMS requirements, risk assessment, controls', applicability: 'Data handling in CCC and IT facilities' },

  // --- Added November 2025 ---
  { domain: 'IT Service Management', standard: 'ISO/IEC 20000-1', code: 'ISO/IEC 20000-1:2018', scope: 'Establishes a service management system (SMS) for IT service delivery, including incident, change, and service level management.', applicability: 'IT helpdesk operations, SLA adherence, and change control processes.' },
  { domain: 'Business Continuity', standard: 'ISO 22301', code: 'ISO 22301:2019', scope: 'Requirements for a business continuity management system (BCMS) to handle disruptive incidents.', applicability: 'Critical system failures, disaster recovery planning, power outages, and supply chain disruptions.' },
  { domain: 'Risk Management', standard: 'ISO 31000', code: 'ISO 31000:2018', scope: 'Provides principles and a framework for effective risk management. It is a guidance document, not for certification.', applicability: 'Framework for identifying, assessing, and treating risks mentioned in other ISO standards (e.g., ISO 45001).' },
  { domain: 'Energy Management', standard: 'ISO 50001', code: 'ISO 50001:2018', scope: 'Framework for establishing and improving an energy management system (EnMS) to enhance energy performance.', applicability: 'HVAC management, lighting systems, power consumption monitoring, and facility sustainability initiatives.' },
  { domain: 'Information Security', standard: 'ISO 27001 (Annex A.12.1.2)', code: 'ISO/IEC 27001:2022', scope: 'Requires implementation of detective, preventive, and recovery controls to protect against malware, supported by user awareness.', applicability: 'IT helpdesk response to virus/malware incidents, endpoint security management, and user training.' },
];

const ComplianceLibrary: React.FC<ComplianceLibraryProps> = ({ historicalData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ clause: string; reason: string } | null>(null);

  const domains = useMemo(() => {
    const d = new Set(COMPLIANCE_STANDARDS.map(s => s.domain));
    return ['All', ...Array.from(d).sort()];
  }, []);

  // Map historical data to standards
  const ticketCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    historicalData.forEach(t => {
      if (t.isoClause && t.isoClause !== 'N/A') {
        counts[t.isoClause] = (counts[t.isoClause] || 0) + 1;
      }
    });
    return counts;
  }, [historicalData]);

  const filteredStandards = useMemo(() => {
    return COMPLIANCE_STANDARDS.filter(s => {
      const matchSearch = 
        s.standard.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.scope.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDomain = selectedDomain === 'All' || s.domain === selectedDomain;
      return matchSearch && matchDomain;
    });
  }, [searchTerm, selectedDomain]);

  const askAiForClause = async () => {
    if (!aiInput.trim()) return;
    setIsAiLoading(true);
    setAiSuggestion(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const standardsList = COMPLIANCE_STANDARDS.map(s => s.standard).join(', ');
        const prompt = `Given this facility maintenance incident: "${aiInput}"
Identify the most relevant ISO clause from this specific list: [${standardsList}].
Provide the result as JSON.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        clause: { type: Type.STRING },
                        reason: { type: Type.STRING }
                    },
                    required: ["clause", "reason"]
                }
            }
        });

        const result = JSON.parse(response.text || '{}');
        setAiSuggestion(result);
    } catch (e) {
        console.error("AI Error:", e);
    } finally {
        setIsAiLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-500">
      
      {/* AI Mapping Assistant Section */}
      <section className="bg-gray-800 rounded-[2.5rem] border border-gray-700 shadow-2xl overflow-hidden">
        <div className="grid lg:grid-cols-2">
            <div className="p-10 lg:border-r border-gray-700/50 bg-brand-950/10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                        <span className="text-xl">✨</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">AI Clause Assistant</h2>
                        <p className="text-xs text-brand-400 font-bold uppercase tracking-widest mt-0.5">Neural Mapping Engine</p>
                    </div>
                </div>
                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                    Describe a technical incident or maintenance task. Our AI will heuristically map it to the most relevant ISO standard in the library.
                </p>
                <div className="space-y-4">
                    <textarea 
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        placeholder="Example: 'Server room cooling failure leads to high temperature alert...'"
                        className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-5 text-sm text-white focus:ring-2 focus:ring-brand-500 outline-none h-32 transition-all placeholder:text-gray-700"
                    />
                    <button 
                        onClick={askAiForClause}
                        disabled={isAiLoading || !aiInput.trim()}
                        className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white font-black uppercase text-xs rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {isAiLoading ? 'Analyzing Context...' : 'Recommend ISO Clause'}
                        <ChevronRightIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="p-10 bg-gray-900/40 flex flex-col justify-center">
                {aiSuggestion ? (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <span className="text-[10px] font-black text-teal-400 uppercase tracking-[0.3em] block mb-4">AI Recommendation</span>
                        <div className="inline-flex items-center px-4 py-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono font-black text-sm mb-6">
                            <ShieldCheckIcon className="w-4 h-4 mr-2" />
                            {aiSuggestion.clause}
                        </div>
                        <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800 italic text-gray-400 text-sm leading-relaxed">
                            "{aiSuggestion.reason}"
                        </div>
                        <button 
                            onClick={() => { setSearchTerm(aiSuggestion.clause); setAiSuggestion(null); }}
                            className="mt-6 text-[10px] font-black text-brand-400 hover:text-white uppercase tracking-widest transition-all"
                        >
                            Locate in Library →
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 border-2 border-dashed border-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ClockIcon className="w-6 h-6 text-gray-700" />
                        </div>
                        <p className="text-xs text-gray-600 font-bold uppercase tracking-widest leading-loose">
                            Enter an incident description<br />to trigger neural mapping
                        </p>
                    </div>
                )}
            </div>
        </div>
      </section>

      {/* Main Library Controls */}
      <div className="bg-gray-800 p-8 rounded-[2.5rem] border border-gray-700 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center">
              <DocumentCheckIcon className="w-7 h-7 mr-3 text-brand-500" />
              ISO Intelligence Library
            </h2>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Real-time Dashboard Linking Active</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select 
              value={selectedDomain} 
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="bg-gray-950 border border-gray-800 text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-2xl px-6 py-4 focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer hover:bg-gray-900 transition-all"
            >
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Filter standards..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-950 border border-gray-800 text-white text-xs font-bold rounded-2xl pl-6 pr-12 py-4 focus:ring-2 focus:ring-brand-500 outline-none w-full sm:w-80 transition-all placeholder:text-gray-700"
                />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStandards.map((std, idx) => {
            const count = ticketCounts[std.standard] || 0;
            return (
                <div key={idx} className={`bg-gray-950/40 border rounded-[2rem] p-8 transition-all group relative overflow-hidden ${count > 0 ? 'border-brand-500/30 ring-1 ring-brand-500/10' : 'border-gray-800 hover:border-gray-700'}`}>
                    {count > 0 && (
                        <div className="absolute top-0 right-0 p-6">
                            <div className="bg-brand-600 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg shadow-brand-900/40 uppercase tracking-widest animate-pulse">
                                {count} Active Tickets
                            </div>
                        </div>
                    )}
                    
                    <div className="flex justify-between items-start mb-6">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-400 bg-brand-900/30 px-3 py-1 rounded-lg border border-brand-800/50">
                            {std.domain}
                        </span>
                        <span className="text-[9px] font-mono font-black text-gray-600">{std.code}</span>
                    </div>
                    
                    <h3 className="text-xl font-black text-white group-hover:text-brand-400 transition-colors mb-4 uppercase tracking-tight leading-tight">
                        {std.standard}
                    </h3>
                    
                    <div className="space-y-4 mb-8">
                        <div>
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-1">Standard Scope</span>
                            <p className="text-xs text-gray-400 leading-relaxed font-medium">
                                {std.scope}
                            </p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-800/50">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2">Technical Applicability</span>
                        <p className="text-[11px] text-gray-500 font-bold leading-relaxed italic">
                            {std.applicability}
                        </p>
                    </div>
                </div>
            );
          })}
        </div>

        {filteredStandards.length === 0 && (
            <div className="py-24 text-center">
                <div className="w-20 h-20 bg-gray-950 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-800">
                    <ShieldCheckIcon className="w-8 h-8 text-gray-800" />
                </div>
                <h3 className="text-sm font-black text-gray-600 uppercase tracking-[0.3em]">No standards matched</h3>
                <button onClick={() => { setSearchTerm(''); setSelectedDomain('All'); }} className="mt-4 text-[10px] font-black text-brand-500 hover:text-white transition-all uppercase tracking-widest">Reset Library View</button>
            </div>
        )}
      </div>

      <div className="bg-gray-950 p-10 rounded-[2.5rem] border border-gray-800 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-600 to-transparent"></div>
        <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-4">Continual Improvement Protocol</h3>
        <p className="text-xs text-gray-500 max-w-2xl mx-auto leading-relaxed uppercase font-bold">
            Mapping technical tasks to ISO clauses ensures documented alignment with international quality (ISO 9001) and facilities management (ISO 41001) standards. This intelligence layer is critical for external certification audits.
        </p>
      </div>
    </div>
  );
};

export default ComplianceLibrary;