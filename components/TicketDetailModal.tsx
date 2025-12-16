
import React, { useEffect, useRef } from 'react';
import type { AnyTicket } from '../types';

interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: AnyTicket | null;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ isOpen, onClose, ticket }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  // Store the element that had focus before opening the modal
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focus the modal container or the first focusable element
      if (modalRef.current) {
        modalRef.current.focus();
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (!modalRef.current) return;

        if (e.key === 'Escape') {
          onClose();
          return;
        }

        if (e.key === 'Tab') {
          // Find all focusable elements inside the modal
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          // If shift + tab and on first element, move to last
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } 
          // If tab and on last element, move to first
          else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        // Return focus to the previous element when closing
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !ticket) return null;

  // Helper to render a detail item, avoiding empty rows
  const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
      <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
        <dt className="text-sm font-medium text-gray-400">{label}</dt>
        <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2">{value}</dd>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden transform transition-all outline-none"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
        tabIndex={-1}
      >
        <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-white" id="modal-title">
                Ticket Details: {ticket.ticketNumber}
              </h3>
              <div className="mt-4 border-t border-gray-700">
                <dl>
                  <DetailItem label="Item" value={ticket.item} />
                  <DetailItem label="Status" value={ticket.status} />
                  <DetailItem label="Priority" value={ticket.priority} />
                  <DetailItem label="Assignee" value={ticket.assignee} />
                  <DetailItem label="Created By" value={ticket.createdBy} />
                  {'createdOn' in ticket && <DetailItem label="Created On" value={ticket.createdOn} />}
                  <DetailItem label="Duration" value={ticket.duration} />
                  <DetailItem label="Team" value={ticket.team} />
                  {'collab' in ticket && <DetailItem label="Collaborator" value={ticket.collab} />}
                  <DetailItem label="Ticket Age (Hours)" value={ticket.ticketAgeHours} />
                  <DetailItem label="Escalation" value={ticket.escalation} />
                  <DetailItem label="Remarks" value={ticket.remarks} />
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-800 text-base font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;
