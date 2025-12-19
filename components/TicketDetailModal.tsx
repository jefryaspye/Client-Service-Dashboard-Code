import React, { useEffect, useRef, useState } from 'react';
import type { AnyTicket, HistoricalTicket } from '../types';

interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: AnyTicket | null;
  onUpdateTicket?: (ticketNumber: string, assignee: string, updates: Partial<HistoricalTicket>) => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ isOpen, onClose, ticket, onUpdateTicket }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [tempRemarks, setTempRemarks] = useState('');

  // Comprehensive selector for focusable elements
  const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), [contenteditable]:not([contenteditable="false"])';

  useEffect(() => {
    if (isOpen) {
      // Capture the element that triggered the modal to restore focus later
      previousFocusRef.current = document.activeElement as HTMLElement;
      setIsEditingRemarks(false);
      setTempRemarks(ticket?.remarks || '');
      
      // Focus the modal container itself for screen readers
      if (modalRef.current) {
        modalRef.current.focus();
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (!modalRef.current) return;

        // Escape to close
        if (e.key === 'Escape') {
          onClose();
          return;
        }

        // Focus Trap Logic
        if (e.key === 'Tab') {
          const focusableElements = Array.from(
            modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
          );
          
          if (focusableElements.length === 0) {
            e.preventDefault();
            return;
          }

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement || document.activeElement === modalRef.current) {
              e.preventDefault();
              lastElement.focus();
            }
          } 
          else { // Tab
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      
      // Prevent scrolling of the background body
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalStyle;
        
        // Restore focus to the trigger element
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose, ticket]);

  if (!isOpen || !ticket) return null;

  const handleSaveRemarks = () => {
    if (onUpdateTicket) {
      const worker = ('collab' in ticket && ticket.collab) ? ticket.collab : ticket.assignee;
      onUpdateTicket(ticket.ticketNumber, worker, { resolution: tempRemarks });
    }
    setIsEditingRemarks(false);
  };

  const handleCancelRemarks = () => {
    setTempRemarks(ticket.remarks || '');
    setIsEditingRemarks(false);
  };

  const DetailItem = ({ label, value, isHighlighted = false }: { label: string; value?: string | number | null; isHighlighted?: boolean }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
      <div className="py-2.5 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-700/30 last:border-0">
        <dt className="text-sm font-medium text-gray-400 self-center">{label}</dt>
        <dd className={`mt-1 text-sm sm:mt-0 sm:col-span-2 ${
            isHighlighted 
            ? 'text-teal-300 font-mono bg-teal-900/40 px-3 py-1.5 rounded border border-teal-700/50 inline-block shadow-sm' 
            : 'text-gray-100'
        }`}>
            {value}
        </dd>
      </div>
    );
  };

  const GroupHeader = ({ title }: { title: string }) => (
    <div className="mt-8 mb-3 pb-1.5 border-b border-gray-700/50">
      <h4 className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.2em]">{title}</h4>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden transform transition-all outline-none border border-gray-700/50 max-h-[92vh] flex flex-col animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header Section */}
        <div className="bg-gray-800/80 px-6 py-5 border-b border-gray-700 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight" id="modal-title">
              Ticket Details
            </h3>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 font-mono">ID: {ticket.ticketNumber}</span>
                <span className="w-1 h-1 rounded-full bg-gray-600" aria-hidden="true"></span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    ticket.status.toLowerCase().includes('closed') ? 'bg-green-900/30 text-green-400 border border-green-800/50' : 'bg-blue-900/30 text-blue-400 border border-blue-800/50'
                }`}>
                    {ticket.status}
                </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditingRemarks && (
              <button 
                onClick={() => setIsEditingRemarks(true)}
                className="hidden sm:flex items-center text-xs text-gray-300 hover:text-white font-semibold px-3 py-1.5 border border-gray-600 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-all shadow-sm focus:ring-2 focus:ring-blue-500"
              >
                Edit Remarks
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors focus:ring-2 focus:ring-blue-500 outline-none"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-6 py-2 overflow-y-auto flex-grow custom-scrollbar">
          <dl className="divide-y divide-gray-700/20">
            <GroupHeader title="Incident Summary" />
            <DetailItem label="Subject" value={ticket.item} />
            <DetailItem label="Category" value={ticket.category} />
            <DetailItem label="Priority" value={ticket.priority} />
            
            <GroupHeader title="Ownership & History" />
            <DetailItem label="Assignee" value={ticket.assignee} />
            {'collab' in ticket && <DetailItem label="Collaborator" value={ticket.collab} />}
            <DetailItem label="Technical Team" value={ticket.team} />
            <DetailItem label="Reporter" value={ticket.createdBy} />
            {'createdOn' in ticket && <DetailItem label="Timestamp" value={ticket.createdOn} />}

            <GroupHeader title="Client Information" />
            <DetailItem label="Customer / Account" value={ticket.customer} />

            <GroupHeader title="Site Details" />
            <DetailItem label="Location" value={ticket.location} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <DetailItem label="Zone" value={ticket.zone} />
                <DetailItem label="Unit" value={ticket.unit} />
            </div>

            <GroupHeader title="Operations & Compliance" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <DetailItem label="Resolution (H)" value={ticket.duration} />
                <DetailItem label="Open Age (H)" value={ticket.ticketAgeHours} />
            </div>
            <DetailItem label="Escalation Status" value={ticket.escalation} />
            <DetailItem 
              label="ISO Standard Clause" 
              value={ticket.isoClause} 
              isHighlighted={ticket.isoClause !== 'N/A' && ticket.isoClause !== ''}
            />
            
            <GroupHeader title="Technical Remarks & Resolution" />
            <div className="py-4">
              {isEditingRemarks ? (
                <div className="space-y-4 bg-gray-900/30 p-4 rounded-xl border border-gray-700/50 shadow-inner">
                  <div className="flex items-center justify-between">
                    <label htmlFor="ticket-remarks-edit" className="text-xs font-bold text-gray-500 uppercase">Work Log / Solution</label>
                  </div>
                  <textarea
                    id="ticket-remarks-edit"
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none h-40 transition-all font-sans"
                    value={tempRemarks}
                    onChange={(e) => setTempRemarks(e.target.value)}
                    placeholder="Enter resolution details or work progress..."
                    autoFocus
                  />
                  <div className="flex justify-end items-center gap-3">
                    <button
                      onClick={handleCancelRemarks}
                      className="px-4 py-2 text-sm text-gray-400 hover:text-white font-medium transition-colors focus:ring-2 focus:ring-gray-500 rounded"
                    >
                      Discard Changes
                    </button>
                    <button
                      onClick={handleSaveRemarks}
                      className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20 focus:ring-2 focus:ring-blue-400"
                    >
                      Update Remarks
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900/30 p-5 rounded-2xl border border-gray-700/50 min-h-[100px] leading-relaxed relative group">
                  <div className="text-gray-200 text-sm whitespace-pre-wrap">
                    {ticket.remarks || <span className="text-gray-600 italic font-light">No historical remarks recorded for this ticket.</span>}
                  </div>
                  <button 
                    onClick={() => setIsEditingRemarks(true)}
                    className="sm:hidden mt-4 w-full py-2 bg-gray-700/50 text-gray-300 text-xs font-bold rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500"
                  >
                    Edit Notes
                  </button>
                </div>
              )}
            </div>
          </dl>
          <div className="h-8" aria-hidden="true"></div> {/* Spacer for bottom of scroll */}
        </div>

        {/* Footer */}
        <div className="bg-gray-800/80 px-6 py-4 sm:flex sm:flex-row-reverse border-t border-gray-700 gap-3 backdrop-blur-md">
          <button
            type="button"
            className="w-full sm:w-auto inline-flex justify-center rounded-xl px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50"
            onClick={onClose}
            disabled={isEditingRemarks}
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;