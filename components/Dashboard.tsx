import React, { useMemo, useState } from 'react';
import type { DailyData, HistoricalTicket, AnyTicket, SortConfig, MainTicket, PendingTicket, CollabTicket } from '../types';
import KpiCard from './KpiCard';
import { TicketsByPriorityChart, TicketsByCategoryChart, TicketsByIsoChart } from './Charts';
import { MainTicketsTable, CollabTicketsTable, PendingTicketsTable, TeamMetricsTable, UpcomingProjectsTable } from './TicketTables';
import { TicketIcon, ClockIcon, DocumentCheckIcon, ChartBarIcon, ShieldCheckIcon } from './icons';
import FilterControls from './FilterControls';
import TicketDetailModal from './TicketDetailModal';

interface DashboardProps {
  dailyData: DailyData;
  historicalData: HistoricalTicket[];
  allMainTickets: MainTicket[];
  allPendingTickets: PendingTicket[];
  allCollabTickets: CollabTicket[];
  onUpdateTicket: (ticketNumber: string, assignee: string, updates: Partial<HistoricalTicket>) => void;
}

const SmartKpiItem = ({ letter, label, value, target, unit, inverse = false }: { letter: string, label: string, value: number, target: number, unit: string, inverse?: boolean }) => {
    const isGood = inverse ? value <= target : value >= target;
    const colorClass = isGood ? 'text-green-400' : 'text-red-400';
    const percent = Math.min(100, (value / (target || 1)) * 100);
    
    return (
        <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
            <div className="flex justify-between items-start mb-2">
                <span className="text-2xl font-bold text-blue-400">{letter}</span>
                <span className={`text-sm font-mono ${colorClass}`}>{value}{unit}</span>
            </div>
            <div className="text-xs text-gray-400 mb-2 h-8 leading-tight">{label}</div>
            <div className="w-full bg-gray-600 rounded-full h-1.5">
                <div 
                    className={`h-1.5 rounded-full ${isGood ? 'bg-green-500' : 'bg-red-500'}`} 
                    style={{ width: `${Math.min(100, inverse ? (target/ (value || 1)) * 100 : percent)}%` }}
                ></div>
            </div>
            <div className="text-[10px] text-gray-500 mt-1 text-right">Target: {target}{unit}</div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ dailyData, historicalData, allMainTickets, allPendingTickets, allCollabTickets, onUpdateTicket }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'all'>('day');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<AnyTicket | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });

  // When searching, we default to showing matches from all time if we were just looking at a single day,
  // but if a specific range like 'week' is selected, we keep it within that range.
  const isGlobalSearch = searchTerm.trim().length > 0;
  const effectiveTimeRange = (isGlobalSearch && timeRange === 'day') ? 'all' : timeRange;

  const handleViewTicketDetails = (ticket: AnyTicket) => {
    setSelectedTicket(ticket);
  };

  const handleCloseModal = () => {
    setSelectedTicket(null);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const kpiData = useMemo(() => {
    const totalToday = (dailyData.mainTickets?.length || 0) + (dailyData.collabTickets?.length || 0);
    const pendingToday = dailyData.pendingTickets?.length || 0;
    const closedToday = (dailyData.mainTickets?.filter(t => (t.status || '').toLowerCase() === 'closed').length || 0) + 
                        (dailyData.mainTickets?.filter(t => (t.status || '').toLowerCase() === 'resolved').length || 0);

    const validTimeSpents = historicalData
      .map(t => parseFloat(t.timeSpent))
      .filter(t => !isNaN(t) && t > 0);
    
    const avgTimeSpent = validTimeSpents.length > 0
      ? (validTimeSpents.reduce((a, b) => a + b, 0) / validTimeSpents.length).toFixed(2)
      : 'N/A';

    const slaTickets = historicalData.filter(t => t.failedSlaPolicy !== undefined);
    const slaPassed = slaTickets.filter(t => (t.failedSlaPolicy || '').toUpperCase() !== 'TRUE').length;
    const slaRate = slaTickets.length > 0 ? Math.round((slaPassed / slaTickets.length) * 100) : 100;

    return { totalToday, pendingToday, closedToday, avgTimeSpent, slaRate };
  }, [dailyData, historicalData]);

  const smartMetrics = useMemo(() => {
    const mainTotal = dailyData.mainTickets?.length || 0;
    const mainClosed = dailyData.mainTickets?.filter(t => ['closed', 'resolved'].includes((t.status || '').toLowerCase())).length || 0;
    const resolutionRate = mainTotal > 0 ? Math.round((mainClosed / mainTotal) * 100) : 0;
    const avgTime = parseFloat(kpiData.avgTimeSpent === 'N/A' ? '0' : kpiData.avgTimeSpent);
    const pendingCount = dailyData.pendingTickets?.length || 0;
    const uniqueAssignees = new Set(dailyData.pendingTickets?.map(t => t.assignee)).size || 1;
    const loadPerTech = Math.round((pendingCount / uniqueAssignees) * 10) / 10;
    const allTickets = [...(dailyData.mainTickets || []), ...(dailyData.collabTickets || [])];
    const escalatedCount = allTickets.filter(t => (t.escalation || '').toLowerCase() === 'yes').length;
    const escalationRate = allTickets.length > 0 ? Math.round((escalatedCount / allTickets.length) * 100) : 0;
    const slaRate = kpiData.slaRate;

    return { resolutionRate, avgTime, loadPerTech, escalationRate, slaRate };
  }, [dailyData, historicalData, kpiData.avgTimeSpent, kpiData.slaRate]);

  const { uniqueStatuses, uniquePriorities } = useMemo(() => {
    const statuses = new Set(historicalData.map(t => t.stage || ''));
    const priorities = new Set(historicalData.map(t => t.priority || ''));
    return {
        uniqueStatuses: Array.from(statuses).filter(s => s).sort(),
        uniquePriorities: Array.from(priorities).filter(p => p).sort()
    };
  }, [historicalData]);

  const sortTickets = <T extends AnyTicket>(tickets: T[], config: SortConfig): T[] => {
    if (!config.key) return tickets;

    const naturalCollator = new Intl.Collator(undefined, { 
      numeric: true, 
      sensitivity: 'base' 
    });

    return [...tickets].sort((a, b) => {
        const aValue = (a as any)[config.key as string] ?? '';
        const bValue = (b as any)[config.key as string] ?? '';

        let comparison = 0;

        if (config.key === 'ticketAgeHours' || config.key === 'duration') {
            const aNum = parseFloat(aValue);
            const bNum = parseFloat(bValue);
            comparison = (isNaN(aNum) ? 0 : aNum) - (isNaN(bNum) ? 0 : bNum);
        } else {
            comparison = naturalCollator.compare(String(aValue), String(bValue));
        }

        return config.direction === 'asc' ? comparison : -comparison;
    });
  };

  const getFilteredSource = <T extends AnyTicket>(all: T[], daily: T[]) => {
    if (effectiveTimeRange === 'day') return daily;
    if (effectiveTimeRange === 'all') return all;
    
    // Last 7 days logic
    const end = new Date(dailyData.date.split('/').reverse().join('-'));
    const start = new Date(end);
    start.setDate(end.getDate() - 7);

    return all.filter(t => {
        const tDate = new Date(t.createdOn);
        return tDate >= start && tDate <= end;
    });
  };

  const filteredHistoricalForCharts = useMemo(() => {
    if (effectiveTimeRange === 'all') return historicalData;
    
    const end = new Date(dailyData.date.split('/').reverse().join('-'));
    const start = new Date(end);
    
    if (effectiveTimeRange === 'day') {
        // Just the selected day
    } else if (effectiveTimeRange === 'week') {
        start.setDate(end.getDate() - 7);
    }

    return historicalData.filter(t => {
        const tDate = new Date(t.createdOn);
        // If 'day', we check for exact match or within that 24h window
        if (effectiveTimeRange === 'day') {
            return tDate.toDateString() === end.toDateString();
        }
        return tDate >= start && tDate <= end;
    });
  }, [historicalData, effectiveTimeRange, dailyData.date]);
  
  const sortedAndFilteredMainTickets = useMemo(() => {
    const source = getFilteredSource(allMainTickets, dailyData.mainTickets || []);
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    
    const filtered = source.filter(ticket => {
      const statusMatch = statusFilter === 'all' || ticket.status === statusFilter;
      const priorityMatch = priorityFilter === 'all' || ticket.priority === priorityFilter;
      const searchMatch = lowercasedSearchTerm.trim() === '' ||
        (ticket.item || '').toLowerCase().includes(lowercasedSearchTerm) ||
        (ticket.ticketNumber || '').toLowerCase().includes(lowercasedSearchTerm) ||
        (ticket.assignee || '').toLowerCase().includes(lowercasedSearchTerm);
      return statusMatch && priorityMatch && searchMatch;
    });

    return sortTickets(filtered, sortConfig);
  }, [dailyData.mainTickets, allMainTickets, effectiveTimeRange, statusFilter, priorityFilter, searchTerm, sortConfig, dailyData.date]);

  const sortedAndFilteredCollabTickets = useMemo(() => {
    const source = getFilteredSource(allCollabTickets, dailyData.collabTickets || []);
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    const filtered = source.filter(ticket => {
      const statusMatch = statusFilter === 'all' || ticket.status === statusFilter;
      const priorityMatch = priorityFilter === 'all' || ticket.priority === priorityFilter;
      const searchMatch = lowercasedSearchTerm.trim() === '' ||
        (ticket.item || '').toLowerCase().includes(lowercasedSearchTerm) ||
        (ticket.ticketNumber || '').toLowerCase().includes(lowercasedSearchTerm) ||
        (ticket.assignee || '').toLowerCase().includes(lowercasedSearchTerm) ||
        (ticket.collab || '').toLowerCase().includes(lowercasedSearchTerm);
      return statusMatch && priorityMatch && searchMatch;
    });

    return sortTickets(filtered, sortConfig);
  }, [dailyData.collabTickets, allCollabTickets, effectiveTimeRange, statusFilter, priorityFilter, searchTerm, sortConfig, dailyData.date]);

  const sortedAndFilteredPendingTickets = useMemo(() => {
    const source = getFilteredSource(allPendingTickets, dailyData.pendingTickets || []);
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    const filtered = source.filter(ticket => {
      const statusMatch = statusFilter === 'all' || ticket.status === statusFilter;
      const priorityMatch = priorityFilter === 'all' || ticket.priority === priorityFilter;
      const searchMatch = lowercasedSearchTerm.trim() === '' ||
        (ticket.item || '').toLowerCase().includes(lowercasedSearchTerm) ||
        (ticket.ticketNumber || '').toLowerCase().includes(lowercasedSearchTerm) ||
        (ticket.assignee || '').toLowerCase().includes(lowercasedSearchTerm);
      return statusMatch && priorityMatch && searchMatch;
    });

    return sortTickets(filtered, sortConfig);
  }, [dailyData.pendingTickets, allPendingTickets, effectiveTimeRange, statusFilter, priorityFilter, searchTerm, sortConfig, dailyData.date]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <KpiCard title="Total Tickets Today" value={kpiData.totalToday.toString()} icon={<TicketIcon />} />
        <KpiCard title="Pending / In Progress" value={kpiData.pendingToday.toString()} icon={<ClockIcon />} />
        <KpiCard title="Closed / Resolved Today" value={kpiData.closedToday.toString()} icon={<DocumentCheckIcon />} />
        <KpiCard title="Avg. Time Spent (Hours)" value={kpiData.avgTimeSpent} icon={<ChartBarIcon />} />
        <KpiCard title="Overall SLA Compliance" value={`${kpiData.slaRate}%`} icon={<ShieldCheckIcon />} />
      </div>

      <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-white border-b border-gray-700 pb-2">SMART Team Objectives</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <SmartKpiItem letter="S" label="Daily Resolution Rate" value={smartMetrics.resolutionRate} target={90} unit="%" />
            <SmartKpiItem letter="M" label="Avg Resolution Time" value={smartMetrics.avgTime} target={4.0} unit="h" inverse={true} />
            <SmartKpiItem letter="A" label="Pending Load / Tech" value={smartMetrics.loadPerTech} target={5} unit="tkt" inverse={true} />
            <SmartKpiItem letter="R" label="Escalation Rate" value={smartMetrics.escalationRate} target={5} unit="%" inverse={true} />
            <SmartKpiItem letter="T" label="SLA Compliance Rate" value={smartMetrics.slaRate} target={95} unit="%" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-white">Tickets by Priority</h2>
          <TicketsByPriorityChart data={filteredHistoricalForCharts} />
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-white">Top 10 Categories</h2>
          <TicketsByCategoryChart data={filteredHistoricalForCharts} />
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-white">Top ISO Clauses</h2>
          <TicketsByIsoChart data={filteredHistoricalForCharts} />
        </div>
      </div>
      
      <div className="space-y-2">
        <FilterControls
            searchTerm={searchTerm}
            onSearchChange={(e) => setSearchTerm(e.target.value)}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            uniqueStatuses={uniqueStatuses}
            uniquePriorities={uniquePriorities}
            sortConfig={sortConfig}
            onSortChange={handleSort}
        />
        {effectiveTimeRange !== 'day' && (
            <div className="bg-blue-900/40 border border-blue-800 text-blue-200 px-4 py-2 rounded-lg text-sm flex items-center animate-in fade-in">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {effectiveTimeRange === 'all' 
                  ? "Showing results from all available history." 
                  : `Showing results for the 7-day period ending ${dailyData.date}.`
                }
            </div>
        )}
      </div>

      <div className="space-y-6">
        {sortedAndFilteredMainTickets.length > 0 && (
          <MainTicketsTable 
            tickets={sortedAndFilteredMainTickets} 
            onTicketClick={handleViewTicketDetails} 
            sortConfig={sortConfig} 
            onSort={handleSort}
          />
        )}
        {sortedAndFilteredCollabTickets.length > 0 && (
          <CollabTicketsTable 
            tickets={sortedAndFilteredCollabTickets} 
            onTicketClick={handleViewTicketDetails} 
            sortConfig={sortConfig} 
            onSort={handleSort}
          />
        )}
        {sortedAndFilteredPendingTickets.length > 0 && (
          <PendingTicketsTable 
            tickets={sortedAndFilteredPendingTickets} 
            onTicketClick={handleViewTicketDetails} 
            sortConfig={sortConfig} 
            onSort={handleSort}
          />
        )}
        {(sortedAndFilteredMainTickets.length === 0 && sortedAndFilteredCollabTickets.length === 0 && sortedAndFilteredPendingTickets.length === 0) && (
            <div className="bg-gray-800/50 p-12 text-center rounded-xl border border-gray-700/50 italic text-gray-500">
                No tickets found for the current range and filters.
            </div>
        )}
        {effectiveTimeRange === 'day' && !isGlobalSearch && dailyData.upcomingProjects && dailyData.upcomingProjects.length > 0 && <UpcomingProjectsTable projects={dailyData.upcomingProjects} />}
        {effectiveTimeRange === 'day' && !isGlobalSearch && dailyData.techTeamMetrics && dailyData.techTeamMetrics.length > 0 && <TeamMetricsTable metrics={dailyData.techTeamMetrics} />}
      </div>
      
      <TicketDetailModal 
        isOpen={!!selectedTicket}
        onClose={handleCloseModal}
        ticket={selectedTicket}
        onUpdateTicket={onUpdateTicket}
      />
    </div>
  );
};

export default Dashboard;