
// Updated: Enhanced responsive design for all ticket tables. 
// Columns are now hidden responsively using Tailwind classes to prevent horizontal scrolling on mobile.
// Clicking a row still triggers the detailed modal view as requested.
import React, { useState, useMemo } from 'react';
import type { MainTicket, TechTeamMetric, UpcomingProject, SortConfig } from '../types';
import { ChevronDownIcon, ChevronRightIcon } from './icons';

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
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    
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
        <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700/50">
            <div className="px-6 py-4 bg-gray-700/30 border-b border-gray-700/50 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 border-b border-gray-700/50">
                        <tr>
                            <th className="hidden sm:table-cell px-4 py-4 w-12 text-center text-[10px] font-bold">#</th>
                            <th className="px-4 py-4 min-w-[150px]">Subject</th>
                            <th className="px-4 py-4">ID</th>
                            <th className="px-4 py-4">Status</th>
                            <th className="hidden md:table-cell px-4 py-4">Priority</th>
                            <th className="hidden lg:table-cell px-4 py-4 text-right">Hours</th>
                            <th className="sm:hidden px-4 py-4 w-10"></th>
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
                                    colSpan={7}
                                />
                                {expandedGroups.has(name) && items.map((t, i) => (
                                    <tr 
                                        key={t.id} 
                                        onClick={() => onTicketClick(t)} 
                                        className="hover:bg-gray-700/20 cursor-pointer transition-colors group"
                                    >
                                        <td className="hidden sm:table-cell px-4 py-4 text-gray-500 text-center text-[11px]">{i + 1}</td>
                                        <td className="px-4 py-4">
                                            <div className="font-bold text-white group-hover:text-blue-400 truncate max-w-[140px] sm:max-w-xs" title={t.item}>
                                                {t.item}
                                            </div>
                                            <div className="md:hidden mt-1 text-[10px] text-gray-500 flex gap-2">
                                                <span className="lg:hidden">{t.duration}h</span>
                                                <span className="font-semibold">{t.priority}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 font-mono text-[11px] font-bold text-blue-400">#{t.ticketNumber}</td>
                                        <td className="px-4 py-4"><StatusBadge status={t.status} /></td>
                                        <td className="hidden md:table-cell px-4 py-4"><PriorityBadge priority={t.priority} /></td>
                                        <td className="hidden lg:table-cell px-4 py-4 text-right font-mono font-bold text-gray-100">{t.duration}</td>
                                        <td className="sm:hidden px-4 py-4 text-center">
                                            <ChevronRightIcon className="w-4 h-4 text-gray-600 group-hover:text-blue-400" />
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                        {tickets.length === 0 && (
                            <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500 italic">No tickets found for this category.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const MainTicketsTable: React.FC<any> = (props) => <GenericTicketsTable {...props} title="Active Service Tickets" />;
export const CollabTicketsTable: React.FC<any> = (props) => <GenericTicketsTable {...props} title="Team Collaboration" />;
export const PendingTicketsTable: React.FC<any> = (props) => <GenericTicketsTable {...props} title="Service Backlog" />;

export const TeamMetricsTable: React.FC<{ metrics: TechTeamMetric[] }> = ({ metrics }) => (
    <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700/50">
        <div className="px-6 py-4 bg-gray-700/30 border-b border-gray-700/50">
            <h2 className="text-lg font-bold text-white">Resource Allocation</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-900/50 text-xs uppercase text-gray-500">
                    <tr>
                        <th className="px-4 py-3">Technician</th>
                        <th className="px-4 py-3 text-center">Active</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-center">Total</th>
                        <th className="px-4 py-3 text-right">Work Hours</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/30">
                    {metrics.map(m => (
                        <tr key={m.id} className="hover:bg-gray-700/20">
                            <td className="px-4 py-3 font-bold text-white">{m.name}</td>
                            <td className="px-4 py-3 text-center text-blue-400 font-bold">{m.inProgress}</td>
                            <td className="hidden sm:table-cell px-4 py-3 text-center">{m.totalTickets}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-100">{m.totalWorkHours}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

export const UpcomingProjectsTable: React.FC<{ projects: UpcomingProject[] }> = ({ projects }) => null;
