
// Updated: Enhanced responsive design for all ticket tables. 
// Introduced a dedicated MobileTicketCard for small screens to better display metadata.
// Columns are hidden responsively on larger screens, while mobile users get a rich card view.
import React, { useState, useMemo } from 'react';
import type { MainTicket, TechTeamMetric, UpcomingProject, SortConfig } from '../types';
import { ChevronDownIcon, ChevronRightIcon, ClockIcon } from './icons';

const getPriorityClass = (priority: string) => {
  const p = (priority || '').toLowerCase();
  if (p.includes('urgent') || p.includes('critical')) return 'bg-red-500/80 text-white';
  if (p.includes('high')) return 'bg-orange-500/80 text-white';
  if (p.includes('medium')) return 'bg-yellow-500/80 text-gray-900';
  return 'bg-blue-500/80 text-white';
};

const getStatusClass = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s.includes('closed') || s.includes('resolved')) return 'bg-green-500/80 text-white';
  if (s.includes('progress') || s.includes('open')) return 'bg-blue-400/80 text-white';
  return 'bg-gray-500/80 text-white';
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-white/10 ${getStatusClass(status)}`}>
    {status}
  </span>
);

const PriorityBadge = ({ priority }: { priority: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-white/10 ${getPriorityClass(priority)}`}>
    {priority}
  </span>
);

const MobileTicketCard: React.FC<{ ticket: MainTicket; onClick: () => void }> = ({ ticket, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="p-4 border-b border-gray-700/30 hover:bg-gray-700/20 active:bg-gray-700/40 transition-colors cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 pr-4">
          <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
            #{ticket.ticketNumber}
          </div>
          <h4 className="text-sm font-bold text-white leading-snug truncate">
            {ticket.item}
          </h4>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <PriorityBadge priority={ticket.priority} />
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-900/50 rounded-full border border-gray-700/50 text-[10px] text-gray-400 font-bold uppercase">
          <ClockIcon className="w-3 h-3" />
          {ticket.duration}h
        </div>
      </div>

      {/* Refined Location Details Section */}
      {(ticket.zone || ticket.unit) && (
        <div className="bg-gray-900/40 rounded-xl p-3 border border-gray-700/30">
          <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="w-1 h-[1px] bg-gray-700"></span>
            Location Details
          </div>
          <div className="grid grid-cols-2 gap-4">
            {ticket.zone && (
              <div>
                <span className="block text-[8px] text-gray-600 uppercase font-bold tracking-tighter">Zone</span>
                <span className="text-[11px] text-gray-300 font-bold truncate block">{ticket.zone}</span>
              </div>
            )}
            {ticket.unit && (
              <div>
                <span className="block text-[8px] text-gray-600 uppercase font-bold tracking-tighter">Unit</span>
                <span className="text-[11px] text-gray-300 font-bold truncate block">{ticket.unit}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <div className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest flex items-center gap-1">
          View Details <ChevronRightIcon className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
};

const GroupHeaderRow: React.FC<{ 
    name: string; 
    count: number; 
    isExpanded: boolean; 
    onToggle: () => void;
    colSpan: number;
}> = ({ name, count, isExpanded, onToggle, colSpan }) => (
    <tr onClick={onToggle} className="bg-gray-700/40 hover:bg-gray-700/60 cursor-pointer transition-colors border-y border-gray-700/50">
        <td colSpan={colSpan} className="px-4 py-3">
            <div className="flex items-center gap-3">
                <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                    <ChevronDownIcon className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-sm font-bold text-white uppercase tracking-wider">{name || 'Unassigned'}</span>
                <span className="text-[10px] font-bold bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800/50">
                    {count} {count === 1 ? 'Record' : 'Records'}
                </span>
            </div>
        </td>
    </tr>
);

interface TableProps<T extends MainTicket> {
    tickets: T[];
    onTicketClick: (ticket: T) => void;
    sortConfig: SortConfig;
    onSort: (key: string) => void;
    title: string;
}

const GenericTicketsTable = <T extends MainTicket>({ tickets, onTicketClick, title }: TableProps<T>) => {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Unassigned']));
    
    const grouped = useMemo(() => {
        const groups: Record<string, T[]> = {};
        tickets.forEach(t => {
            const key = t.assignee || 'Unassigned';
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });
        return groups;
    }, [tickets]);

    const toggleGroup = (name: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    return (
        <div className="bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-700/50">
            <div className="px-6 py-5 bg-gray-700/30 border-b border-gray-700/50 flex items-center justify-between">
                <h2 className="text-lg font-black text-white tracking-tight uppercase">{title}</h2>
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-950/50 border-b border-gray-700/50">
                        <tr>
                            <th className="px-4 py-4 w-12 text-center text-[10px] font-black tracking-widest">#</th>
                            <th className="px-4 py-4 min-w-[200px] font-black tracking-widest">Subject</th>
                            <th className="px-4 py-4 font-black tracking-widest">ID</th>
                            <th className="px-4 py-4 font-black tracking-widest text-center">Status</th>
                            <th className="px-4 py-4 font-black tracking-widest text-center">Priority</th>
                            <th className="hidden xl:table-cell px-4 py-4 font-black tracking-widest">ISO Clause</th>
                            <th className="hidden lg:table-cell px-4 py-4 text-right font-black tracking-widest">Hours</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/30">
                        {(Object.entries(grouped) as [string, T[]][]).map(([name, items]) => (
                            <React.Fragment key={name}>
                                <GroupHeaderRow 
                                    name={name} 
                                    count={items.length} 
                                    isExpanded={expandedGroups.has(name)} 
                                    onToggle={() => toggleGroup(name)} 
                                    colSpan={8}
                                />
                                {expandedGroups.has(name) && items.map((t, i) => (
                                    <tr 
                                        key={t.id} 
                                        onClick={() => onTicketClick(t)} 
                                        className="hover:bg-gray-700/20 cursor-pointer transition-colors group border-l-4 border-l-transparent hover:border-l-blue-500"
                                    >
                                        <td className="px-4 py-5 text-gray-500 text-center text-[11px] font-bold">{i + 1}</td>
                                        <td className="px-4 py-5">
                                            <div className="font-bold text-white group-hover:text-blue-400 truncate max-w-xs transition-colors" title={t.item}>
                                                {t.item}
                                            </div>
                                            <div className="mt-1 flex items-center gap-3">
                                                {t.zone && (
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                                                        Z: <span className="text-gray-400">{t.zone}</span>
                                                    </span>
                                                )}
                                                {t.unit && (
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                                                        U: <span className="text-gray-400">{t.unit}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 font-mono text-[11px] font-black text-blue-400/80">#{t.ticketNumber}</td>
                                        <td className="px-4 py-5 text-center"><StatusBadge status={t.status} /></td>
                                        <td className="px-4 py-5 text-center"><PriorityBadge priority={t.priority} /></td>
                                        <td className="hidden xl:table-cell px-4 py-5">
                                          {t.isoClause && t.isoClause !== 'N/A' ? (
                                            <span className="text-[10px] font-mono text-teal-400 bg-teal-950/40 px-2.5 py-1 rounded-lg border border-teal-800/30 shadow-sm">
                                              {t.isoClause}
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">None</span>
                                          )}
                                        </td>
                                        <td className="hidden lg:table-cell px-4 py-5 text-right font-mono font-black text-gray-100">{t.duration}h</td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden">
                {(Object.entries(grouped) as [string, T[]][]).map(([name, items]) => (
                    <div key={name}>
                        <div 
                          onClick={() => toggleGroup(name)}
                          className="bg-gray-900/50 px-4 py-3 flex items-center justify-between border-y border-gray-700/50 cursor-pointer"
                        >
                            <div className="flex items-center gap-2">
                                <ChevronDownIcon className={`w-3 h-3 text-blue-400 transition-transform ${expandedGroups.has(name) ? '' : '-rotate-90'}`} />
                                <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest">{name || 'Unassigned'}</span>
                            </div>
                            <span className="text-[9px] font-black bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full border border-blue-800/30">
                                {items.length}
                            </span>
                        </div>
                        {expandedGroups.has(name) && items.map((t) => (
                            <MobileTicketCard key={t.id} ticket={t} onClick={() => onTicketClick(t)} />
                        ))}
                    </div>
                ))}
            </div>

            {tickets.length === 0 && (
                <div className="px-6 py-16 text-center">
                    <div className="text-gray-600 text-sm font-bold uppercase tracking-widest">Null Record Set</div>
                    <p className="text-gray-700 text-xs mt-1 italic">No operational data matches the current criteria.</p>
                </div>
            )}
        </div>
    );
};

export const MainTicketsTable: React.FC<any> = (props) => <GenericTicketsTable {...props} title="Incident Service Tickets" />;
export const PmTicketsTable: React.FC<any> = (props) => <GenericTicketsTable {...props} title="Preventive Maintenance" />;
export const CollabTicketsTable: React.FC<any> = (props) => <GenericTicketsTable {...props} title="Team Collaboration" />;
export const PendingTicketsTable: React.FC<any> = (props) => <GenericTicketsTable {...props} title="Service Backlog" />;

export const TeamMetricsTable: React.FC<{ metrics: TechTeamMetric[] }> = ({ metrics }) => (
    <div className="bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-700/50">
        <div className="px-6 py-5 bg-gray-700/30 border-b border-gray-700/50">
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Resource Allocation</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-950/50 text-xs font-black uppercase text-gray-500 tracking-widest">
                    <tr>
                        <th className="px-6 py-4">Technician</th>
                        <th className="px-6 py-4 text-center">Active</th>
                        <th className="hidden sm:table-cell px-6 py-4 text-center">Total</th>
                        <th className="px-6 py-4 text-right">Work Hours</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/30">
                    {metrics.map(m => (
                        <tr key={m.id} className="hover:bg-gray-700/20 transition-colors">
                            <td className="px-6 py-4 font-black text-white">{m.name}</td>
                            <td className="px-6 py-4 text-center text-blue-400 font-black">{m.inProgress}</td>
                            <td className="hidden sm:table-cell px-6 py-4 text-center font-bold text-gray-500">{m.totalTickets}</td>
                            <td className="px-6 py-4 text-right font-mono font-black text-gray-100">{m.totalWorkHours}h</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

export const UpcomingProjectsTable: React.FC<{ projects: UpcomingProject[] }> = ({ projects }) => null;
