
import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { AnyTicket, HistoricalTicket, MainTicket, CollabTicket } from '../types';
import { COMPLIANCE_STANDARDS } from './ComplianceLibrary';
import { ShieldCheckIcon, FireIcon } from './icons';

interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: AnyTicket | null;
  onUpdateTicket?: (ticketNumber: string, assignee: string, updates: Partial<HistoricalTicket>) => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ isOpen, onClose, ticket, onUpdateTicket }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isEditingRCA, setIsEditingRCA] = useState(false);
  const [rcaValues, setRcaValues] = useState({ rca: '', ca: '', pa: '' });

  useEffect(() => {
    if (ticket) {
        setRcaValues({
            rca: ticket.rootCause || '',
            ca: ticket.correctiveAction || '',
            pa: ticket.preventiveAction || ''
        });
    }
  }, [ticket]);

  if (!isOpen || !ticket) return null;

  const handleSaveISO = () => {
    if (onUpdateTicket) {
      onUpdateTicket(ticket.ticketNumber, ticket.assignee, {
          rootCause: rcaValues.rca,
          correctiveAction: rcaValues.ca,
          preventiveAction: rcaValues.pa
      });
    }
    setIsEditingRCA(false);
  };

  const getRiskColor = (score: number) => {
      if (score >= 15) return 'text-red-500';
      if (score >= 8) return 'text-orange-500';
      return 'text-green-500';
  };

  const GroupHeader = ({ title }: { title: string }) => (
    <div className="mt-8 mb-3 pb-1.5 border-b border-gray-700/50">
      <h4 className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.2em]">{title}</h4>
    </div>
  );

  const DetailItem = ({ label, value, isHighlighted = false }: { label: string; value?: string | number | null; isHighlighted?: boolean }) => (
      <div className="py-2.5 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-700/30 last:border-0">
        <dt className="text-sm font-medium text-gray-400">{label}</dt>
        <dd className={`mt-1 text-sm sm:mt-0 sm:col-span-2 ${isHighlighted ? 'text-teal-300 font-mono font-black' : 'text-gray-100'}`}>
            {value || 'N/A'}
        </dd>
      </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden border border-gray-700 flex flex-col max-h-[92vh] animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-gray-800/80 px-8 py-6 border-b border-gray-700 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Technical Audit View</h3>
            <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-blue-400 font-mono font-black">#{ticket.ticketNumber}</span>
                <div className={`flex items-center text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getRiskColor(ticket.riskLevel || 0)} border-current bg-current/5`}>
                    <FireIcon className="w-3 h-3 mr-1" />
                    Risk Level: {ticket.riskLevel}
                </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-gray-500 hover:text-white transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>

        {/* Content */}
        <div className="px-8 py-4 overflow-y-auto custom-scrollbar flex-grow space-y-6 pb-12">
            <dl>
                <GroupHeader title="Incident Summary" />
                <DetailItem label="Subject" value={ticket.item} />
                <DetailItem label="Status" value={ticket.status} />
                <DetailItem label="Priority" value={ticket.priority} />
                
                <GroupHeader title="Regulatory Documentation" />
                <DetailItem label="ISO Clause" value={ticket.isoClause} isHighlighted />
                <DetailItem label="Hazard Category" value={ticket.hazardCategory} />
                <DetailItem label="Objective Link" value={ticket.objectiveID} />

                <GroupHeader title="ISO 10.2 Corrective Action Log" />
                {!isEditingRCA ? (
                    <div className="space-y-4">
                        <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-700">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Root Cause Analysis (RCA)</span>
                            <p className="text-sm text-gray-300 italic">{ticket.rootCause || 'No RCA documented.'}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-700">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Corrective Action</span>
                                <p className="text-sm text-gray-300">{ticket.correctiveAction || 'Pending implementation.'}</p>
                            </div>
                            <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-700">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Preventive Action</span>
                                <p className="text-sm text-gray-300">{ticket.preventiveAction || 'No preventative plan recorded.'}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsEditingRCA(true)} className="w-full py-4 border border-dashed border-gray-600 text-xs font-black text-gray-400 hover:text-white transition-all uppercase tracking-widest">Update Audit Findings</button>
                    </div>
                ) : (
                    <div className="space-y-4 bg-gray-900/50 p-6 rounded-2xl border border-blue-500/30">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase block mb-1.5">Root Cause</label>
                                <textarea value={rcaValues.rca} onChange={e => setRcaValues(v => ({...v, rca: e.target.value}))} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none h-20" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase block mb-1.5">Corrective Action</label>
                                <textarea value={rcaValues.ca} onChange={e => setRcaValues(v => ({...v, ca: e.target.value}))} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none h-20" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button onClick={() => setIsEditingRCA(false)} className="text-xs font-black uppercase text-gray-500 hover:text-white">Cancel</button>
                            <button onClick={handleSaveISO} className="px-6 py-2 bg-brand-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg">Save Audit Data</button>
                        </div>
                    </div>
                )}
            </dl>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-700 bg-gray-800/80 backdrop-blur-md flex justify-end">
          <button onClick={onClose} className="px-10 py-3 bg-gray-900 hover:bg-gray-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">Dismiss Overview</button>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;
