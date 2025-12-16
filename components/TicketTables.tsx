
import React, { useState, useEffect } from 'react';
import type { MainTicket, CollabTicket, PendingTicket, TechTeamMetric, UpcomingProject, SortConfig } from '../types';
import { ArrowUpIcon, ArrowDownIcon, SwitchVerticalIcon, FireIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

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
  if (s.includes('hold') || s.includes('scheduled')) return 'bg-purple-500/80 text-white';
  return 'bg-gray-500/80 text-white';
};

const TableWrapper: React.FC<{ title: string; children: React.ReactNode; footer?: React.ReactNode }> = ({ title, children, footer }) => (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col">
        <h2 className="text-xl font-semibold p-4 bg-gray-700/50 text-white">{title}</h2>
        <div className="overflow-x-auto">
            {children}
        </div>
        {footer && (
            <div className="bg-gray-800 p-4 border-t border-gray-700">
                {footer}
            </div>
        )}
    </div>
);

const Table: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <table className="min-w-full text-sm text-left text-gray-300">
        {children}
    </table>
);

const NoDataRow: React.FC<{ colSpan: number; message?: string }> = ({ colSpan, message = "No tickets match the current filters." }) => (
    <tr className="border-b border-gray-700">
        <td colSpan={colSpan} className="px-4 py-4 text-center text-gray-400">{message}</td>
    </tr>
);

const SortableHeader: React.FC<{
    sortKey: string;
    title: string;
    sortConfig: SortConfig;
    onSort: (key: string) => void;
}> = ({ sortKey, title, sortConfig, onSort }) => {
    const isSorting = sortConfig.key === sortKey;
    const ariaSort = isSorting ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none';
    
    return (
        <th scope="col" className="px-4 py-3" aria-sort={ariaSort}>
            <button
                onClick={() => onSort(sortKey)}
                className="flex items-center gap-1.5 group focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1 -mx-1"
                aria-label={`Sort by ${title}${isSorting ? `, currently ${ariaSort}` : ''}`}
            >
                <span>{title}</span>
                {isSorting ? (
                    sortConfig.direction === 'asc' ? (
                        <ArrowUpIcon className="w-3 h-3 text-white" />
                    ) : (
                        <ArrowDownIcon className="w-3 h-3 text-white" />
                    )
                ) : (
                    <SwitchVerticalIcon className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
            </button>
        </th>
    );
};

const FilterHeader: React.FC<{
    options: string[];
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
}> = ({ options, value, onChange, placeholder }) => (
    <th scope="col" className="px-4 py-3 min-w-[140px]">
        <div className="flex flex-col gap-1">
             <label className="text-xs font-semibold uppercase text-gray-400 sr-only">{placeholder}</label>
             <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-gray-900/50 border border-gray-600 text-white text-xs rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-1.5 cursor-pointer hover:bg-gray-800 transition-colors"
                aria-label={`Filter by ${placeholder}`}
             >
                <option value="all">{placeholder} (All)</option>
                {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
             </select>
        </div>
    </th>
);

const PaginationControls: React.FC<{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
                Page <span className="font-medium text-white">{currentPage}</span> of <span className="font-medium text-white">{totalPages}</span>
            </span>
            <div className="flex gap-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-white text-xs font-medium"
                >
                    <ChevronLeftIcon className="w-4 h-4 mr-1" />
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-white text-xs font-medium"
                >
                    Next
                    <ChevronRightIcon className="w-4 h-4 ml-1" />
                </button>
            </div>
        </div>
    );
};

interface TableProps<T extends { escalation: string }> {
    tickets: T[];
    onTicketClick: (ticket: T) => void;
    sortConfig: SortConfig;
    onSort: (key: string) => void;
    statuses: string[];
    priorities: string[];
    currentStatus: string;
    currentPriority: string;
    onStatusChange: (val: string) => void;
    onPriorityChange: (val: string) => void;
}

const TicketItemCell: React.FC<{ ticket: { item: string; escalation: string }; onClick: () => void }> = ({ ticket, onClick }) => (
    <th scope="row" className="px-4 py-3 font-medium text-white whitespace-nowrap">
        <button 
            onClick={onClick} 
            className="text-left hover:underline cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 rounded p-1 -m-1"
            aria-label={`View details for ticket item: ${ticket.item}${ticket.escalation?.toLowerCase() === 'yes' ? ', Escalated' : ''}`}
        >
            <div className="flex items-center gap-2">
                <span>{ticket.item}</span>
                {(ticket.escalation || '').toLowerCase() === 'yes' && (
                    <div title="Escalated" aria-hidden="true">
                        <FireIcon className="w-4 h-4 text-red-500" />
                    </div>
                )}
            </div>
        </button>
    </th>
);


export const MainTicketsTable: React.FC<TableProps<MainTicket>> = ({ 
    tickets, onTicketClick, sortConfig, onSort,
    statuses, priorities, currentStatus, currentPriority, onStatusChange, onPriorityChange
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    useEffect(() => {
        setCurrentPage(1);
    }, [tickets]);

    const totalPages = Math.ceil(tickets.length / itemsPerPage);
    const paginatedTickets = tickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;

    return (
        <TableWrapper 
            title="Main Tickets"
            footer={<PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
        >
            <Table>
                <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                    <tr>
                        <th scope="col" className="px-4 py-3">#</th>
                        <th scope="col" className="px-4 py-3">Item</th>
                        <th scope="col" className="px-4 py-3">Ticket No.</th>
                        <th scope="col" className="px-4 py-3">Assignee</th>
                        <FilterHeader 
                            options={statuses} 
                            value={currentStatus} 
                            onChange={onStatusChange} 
                            placeholder="Status" 
                        />
                        <FilterHeader 
                            options={priorities} 
                            value={currentPriority} 
                            onChange={onPriorityChange} 
                            placeholder="Priority" 
                        />
                        <th scope="col" className="px-4 py-3">Team</th>
                        <SortableHeader sortKey="ticketAgeHours" title="Age (Hours)" sortConfig={sortConfig} onSort={onSort} />
                    </tr>
                </thead>
                <tbody>
                    {paginatedTickets.length > 0 ? paginatedTickets.map((ticket, index) => (
                        <tr key={ticket.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                            <td className="px-4 py-3">{startIndex + index + 1}</td>
                            <TicketItemCell ticket={ticket} onClick={() => onTicketClick(ticket)} />
                            <td className="px-4 py-3">{ticket.ticketNumber}</td>
                            <td className="px-4 py-3">{ticket.assignee}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(ticket.status)}`}>{ticket.status}</span>
                            </td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityClass(ticket.priority)}`}>{ticket.priority}</span>
                            </td>
                            <td className="px-4 py-3">{ticket.team}</td>
                            <td className="px-4 py-3">{ticket.ticketAgeHours}</td>
                        </tr>
                    )) : <NoDataRow colSpan={8} />}
                </tbody>
            </Table>
        </TableWrapper>
    );
};

export const CollabTicketsTable: React.FC<TableProps<CollabTicket>> = ({ 
    tickets, onTicketClick, sortConfig, onSort,
    statuses, priorities, currentStatus, currentPriority, onStatusChange, onPriorityChange
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    useEffect(() => {
        setCurrentPage(1);
    }, [tickets]);

    const totalPages = Math.ceil(tickets.length / itemsPerPage);
    const paginatedTickets = tickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;

    return (
        <TableWrapper 
            title="Collaboration Tickets"
            footer={<PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
        >
            <Table>
                 <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                    <tr>
                        <th scope="col" className="px-4 py-3">#</th>
                        <th scope="col" className="px-4 py-3">Item</th>
                        <th scope="col" className="px-4 py-3">Ticket No.</th>
                        <th scope="col" className="px-4 py-3">Assignee</th>
                        <th scope="col" className="px-4 py-3">Collaborator</th>
                        <FilterHeader 
                            options={statuses} 
                            value={currentStatus} 
                            onChange={onStatusChange} 
                            placeholder="Status" 
                        />
                        <FilterHeader 
                            options={priorities} 
                            value={currentPriority} 
                            onChange={onPriorityChange} 
                            placeholder="Priority" 
                        />
                        <SortableHeader sortKey="ticketAgeHours" title="Age (Hours)" sortConfig={sortConfig} onSort={onSort} />
                    </tr>
                </thead>
                <tbody>
                    {paginatedTickets.length > 0 ? paginatedTickets.map((ticket, index) => (
                        <tr key={ticket.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                            <td className="px-4 py-3">{startIndex + index + 1}</td>
                            <TicketItemCell ticket={ticket} onClick={() => onTicketClick(ticket)} />
                            <td className="px-4 py-3">{ticket.ticketNumber}</td>
                            <td className="px-4 py-3">{ticket.assignee}</td>
                            <td className="px-4 py-3">{ticket.collab}</td>
                            <td className="px-4 py-3">
                                 <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(ticket.status)}`}>{ticket.status}</span>
                            </td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityClass(ticket.priority)}`}>{ticket.priority}</span>
                            </td>
                            <td className="px-4 py-3">{ticket.ticketAgeHours}</td>
                        </tr>
                    )) : <NoDataRow colSpan={8} />}
                </tbody>
            </Table>
        </TableWrapper>
    );
};

export const PendingTicketsTable: React.FC<TableProps<PendingTicket>> = ({ 
    tickets, onTicketClick, sortConfig, onSort,
    statuses, priorities, currentStatus, currentPriority, onStatusChange, onPriorityChange
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    useEffect(() => {
        setCurrentPage(1);
    }, [tickets]);

    const totalPages = Math.ceil(tickets.length / itemsPerPage);
    const paginatedTickets = tickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;

    return (
        <TableWrapper 
            title="Pending / On-Hold Tickets"
            footer={<PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
        >
            <Table>
                <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                    <tr>
                        <th scope="col" className="px-4 py-3">Item</th>
                        <th scope="col" className="px-4 py-3">Ticket No.</th>
                        <th scope="col" className="px-4 py-3">Created On</th>
                        <th scope="col" className="px-4 py-3">Assignee</th>
                        <FilterHeader 
                            options={statuses} 
                            value={currentStatus} 
                            onChange={onStatusChange} 
                            placeholder="Status" 
                        />
                        <FilterHeader 
                            options={priorities} 
                            value={currentPriority} 
                            onChange={onPriorityChange} 
                            placeholder="Priority" 
                        />
                        <SortableHeader sortKey="ticketAgeHours" title="Age (Hours)" sortConfig={sortConfig} onSort={onSort} />
                    </tr>
                </thead>
                <tbody>
                    {paginatedTickets.length > 0 ? paginatedTickets.map((ticket) => (
                        <tr key={ticket.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                            <TicketItemCell ticket={ticket} onClick={() => onTicketClick(ticket)} />
                            <td className="px-4 py-3">{ticket.ticketNumber}</td>
                            <td className="px-4 py-3">{ticket.createdOn}</td>
                            <td className="px-4 py-3">{ticket.assignee}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(ticket.status)}`}>{ticket.status}</span>
                            </td>
                            <td className="px-4 py-3">
                               <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityClass(ticket.priority)}`}>{ticket.priority}</span>
                            </td>
                            <td className="px-4 py-3">{ticket.ticketAgeHours}</td>
                        </tr>
                    )) : <NoDataRow colSpan={7} />}
                </tbody>
            </Table>
        </TableWrapper>
    );
};

export const UpcomingProjectsTable: React.FC<{ projects: UpcomingProject[] }> = ({ projects }) => (
    <TableWrapper title="Upcoming Projects">
        <Table>
            <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                <tr>
                    <th scope="col" className="px-4 py-3">Item</th>
                    <th scope="col" className="px-4 py-3">Ticket No.</th>
                    <th scope="col" className="px-4 py-3">Assignee</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Deadline</th>
                    <th scope="col" className="px-4 py-3">Due Date</th>
                </tr>
            </thead>
            <tbody>
                {projects.map((project) => (
                    <tr key={project.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                        <th scope="row" className="px-4 py-3 font-medium text-white whitespace-nowrap">{project.item}</th>
                        <td className="px-4 py-3">{project.ticketNumber}</td>
                        <td className="px-4 py-3">{project.assignee}</td>
                        <td className="px-4 py-3">
                             <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(project.status)}`}>{project.status}</span>
                        </td>
                        <td className="px-4 py-3">{project.deadline}</td>
                        <td className="px-4 py-3">{project.dueDate}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
    </TableWrapper>
);

export const TeamMetricsTable: React.FC<{ metrics: TechTeamMetric[] }> = ({ metrics }) => (
    <TableWrapper title="Tech Team Metrics">
        <Table>
            <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                <tr>
                    <th scope="col" className="px-4 py-3">Name</th>
                    <th scope="col" className="px-4 py-3">Open</th>
                    <th scope="col" className="px-4 py-3">In Progress</th>
                    <th scope="col" className="px-4 py-3">On Hold</th>
                    <th scope="col" className="px-4 py-3">Resolved</th>
                    <th scope="col" className="px-4 py-3">Closed</th>
                    <th scope="col" className="px-4 py-3">Total Tickets</th>
                    <th scope="col" className="px-4 py-3">Work Hours</th>
                </tr>
            </thead>
            <tbody>
                {metrics.map((metric) => (
                    <tr key={metric.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                        <th scope="row" className="px-4 py-3 font-medium text-white whitespace-nowrap">{metric.name}</th>
                        <td className="px-4 py-3 text-center">{metric.open}</td>
                        <td className="px-4 py-3 text-center">{metric.inProgress}</td>
                        <td className="px-4 py-3 text-center">{metric.onHold}</td>
                        <td className="px-4 py-3 text-center">{metric.resolved}</td>
                        <td className="px-4 py-3 text-center">{metric.closed}</td>
                        <td className="px-4 py-3 text-center font-bold">{metric.totalTickets}</td>
                        <td className="px-4 py-3 text-center">{metric.totalWorkHours}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
    </TableWrapper>
);
