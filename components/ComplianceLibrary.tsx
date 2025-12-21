
import React, { useState, useMemo } from 'react';
import type { ComplianceStandard } from '../types';
import { ShieldCheckIcon, DocumentCheckIcon } from './icons';

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
  
  // Regulatory & Statutory Safety
  { domain: 'Workplace Safety', standard: 'OSHA General Duty Clause', code: 'Section 5(a)(1)', scope: 'Maintain workplace free of recognized hazards', applicability: 'All facilities' },
  { domain: 'Workplace Safety', standard: 'OSHA General Industry', code: '29 CFR 1910', scope: 'Hazard assessment, PPE, emergency action, fire prevention, electrical safety', applicability: 'Building operations' },
  { domain: 'Telecom Safety', standard: 'OSHA Telecommunications', code: '29 CFR 1910.268', scope: 'Worker safety, telecom installations, cabling, practices', applicability: 'Contact center telecom rooms, MDF/IDF' },
  { domain: 'Malaysia Safety', standard: 'DOSH OSHA Act', code: 'Act 514 (1994)', scope: 'Employer duties, safety committees, risk control, self-regulation', applicability: 'Malaysia workplaces' },
  
  // Fire & Life Safety (NFPA)
  { domain: 'Fire Code', standard: 'NFPA 1', code: 'NFPA 1 Fire Code', scope: 'General fire safety, occupancy, operations', applicability: 'Building-wide compliance' },
  { domain: 'Life Safety', standard: 'NFPA 101', code: 'NFPA 101 Life Safety Code', scope: 'Means of egress, occupancy features, emergency planning', applicability: 'All building levels' },
  { domain: 'Electrical Install', standard: 'NFPA 70', code: 'NFPA 70 NEC', scope: 'Electrical installations, grounding, bonding, clearances', applicability: 'Panels, feeders, building electrical' },
  { domain: 'Electrical Maintenance', standard: 'NFPA 70B', code: 'NFPA 70B:2023', scope: 'Mandatory inspection and maintenance programs', applicability: 'Preventive/condition-based PMs' },
  { domain: 'Fire Alarm', standard: 'NFPA 72', code: 'NFPA 72', scope: 'Design, installation, testing, maintenance of fire alarm systems', applicability: 'Alarm systems and documentation' },
  { domain: 'Sprinklers', standard: 'NFPA 13', code: 'NFPA 13', scope: 'Sprinkler installation standards', applicability: 'Water-based fire protection systems' },
  { domain: 'Sprinklers ITM', standard: 'NFPA 25', code: 'NFPA 25', scope: 'Inspection, testing, maintenance of water-based systems', applicability: 'Sprinklers, standpipes, fire pumps' },
  { domain: 'HVAC Fire Protection', standard: 'NFPA 90A', code: 'NFPA 90A', scope: 'Fire protection of HVAC systems, dampers, detectors', applicability: 'HVAC and smoke control' },
  { domain: 'Emergency Power', standard: 'NFPA 110', code: 'NFPA 110', scope: 'Emergency/standby power systems, generator classification, testing', applicability: 'Podium L2 & Basement B2 gensets' },
  { domain: 'IT Equipment', standard: 'NFPA 75', code: 'NFPA 75', scope: 'Protection of IT equipment rooms, fire detection/suppression', applicability: 'Data floors, server rooms' },
  { domain: 'Telecom Facilities', standard: 'NFPA 76', code: 'NFPA 76:2024', scope: 'Fire protection of telecom facilities, cable routing, suppression', applicability: 'Contact center telecom infrastructure' },
  { domain: 'Electrical Safety', standard: 'NFPA 70E', code: 'NFPA 70E', scope: 'Arc flash, electrical safety work practices', applicability: 'Electrical maintenance staff' },
];

const ComplianceLibrary: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('All');

  const domains = useMemo(() => {
    const d = new Set(COMPLIANCE_STANDARDS.map(s => s.domain));
    return ['All', ...Array.from(d).sort()];
  }, []);

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

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <ShieldCheckIcon className="w-7 h-7 mr-3 text-blue-400" />
              Regulatory Compliance Library
            </h2>
            <p className="text-gray-400 mt-1">Cross-reference technical tasks with international and local standards (ISO, NFPA, OSHA).</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select 
              value={selectedDomain} 
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input 
              type="text" 
              placeholder="Search standards or clauses..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStandards.map((std, idx) => (
            <div key={idx} className="bg-gray-900/50 border border-gray-700 rounded-xl p-5 hover:border-blue-500/50 transition-all group">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">
                  {std.domain}
                </span>
                <span className="text-[10px] font-mono text-gray-500">{std.code}</span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors mb-2">{std.standard}</h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                <span className="text-gray-500 font-semibold">Scope:</span> {std.scope}
              </p>
              <div className="pt-3 border-t border-gray-800">
                <p className="text-[11px] text-gray-500 italic">
                  <span className="not-italic font-bold text-gray-400 mr-1 uppercase">Applicability:</span> {std.applicability}
                </p>
              </div>
            </div>
          ))}
          {filteredStandards.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-500 italic">
              No regulatory standards or clauses found matching your search criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplianceLibrary;
