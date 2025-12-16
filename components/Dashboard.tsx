
import React, { useMemo, useState } from 'react';
import type { DailyData, HistoricalTicket, AnyTicket, SortConfig } from '../types';
import KpiCard from './KpiCard';
import { TicketsByPriorityChart, TicketsByCategoryChart } from './Charts';
import { MainTicketsTable, CollabTicketsTable, PendingTicketsTable, TeamMetricsTable, UpcomingProjectsTable } from './TicketTables';
import { TicketIcon, ClockIcon, DocumentCheckIcon, ChartBarIcon } from './icons';
import FilterControls from './FilterControls';
import TicketDetailModal from './TicketDetailModal';

interface DashboardProps {
  dailyData: DailyData;
  historicalData: HistoricalTicket[];
}

const Dashboard: React.FC<DashboardProps> = ({ dailyData, historicalData }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<AnyTicket | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });

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

    return { totalToday, pendingToday, closedToday, avgTimeSpent };
  }, [dailyData, historicalData]);

  const { uniqueStatuses, uniquePriorities } = useMemo(() => {
    const allTickets = [
        ...(dailyData.mainTickets || []),
        ...(dailyData.collabTickets || []),
        ...(dailyData.pendingTickets || [])
    ];
    const statuses = new Set(allTickets.map(t => t.status || ''));
    const priorities = new Set(allTickets.map(t => t.priority || ''));
    return {
        uniqueStatuses: Array.from(statuses).filter(s => s).sort(),
        uniquePriorities: Array.from(priorities).filter(p => p).sort()
    };
  }, [dailyData]);
  
  const sortedAndFilteredMainTickets = useMemo(() => {
    if (!dailyData.mainTickets) return [];
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    
    const filtered = dailyData.mainTickets.filter(ticket => {
      const statusMatch = statusFilter === 'all' || ticket.status === statusFilter;
      const priorityMatch = priorityFilter === 'all' || ticket.priority === priorityFilter;
      const searchMatch = lowercasedSearchTerm.trim() === '' ||
        (ticket.item || '').toLowerCase().includes(lowercasedSearchTerm) ||
        (ticket.ticketNumber || '').toLowerCase().includes(lowercasedSearchTerm) ||
        (ticket.assignee || '').toLowerCase().includes(lowercasedSearchTerm);
      return statusMatch && priorityMatch && searchMatch;
    });

    if (sortConfig.key === 'ticketAgeHours') {
        return [...filtered].sort((a, b) => {
            const valA = parseFloat(a.ticketAgeHours);
            const valB = parseFloat(b.ticketAgeHours);
            if (isNaN(valA) || isNaN(valB)) return 0;
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return filtered;
  }, [dailyData.mainTickets, statusFilter, priorityFilter, searchTerm, sortConfig]);

  const sortedAndFilteredCollabTickets = useMemo(() => {
    if (!dailyData.collabTickets) return [];
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    const filtered = dailyData.collabTickets.filter(ticket => {
      const statusMatch = statusFilter === 'all' || ticket.status === statusFilter;
      const priorityMatch = priorityFilter === 'all' || ticket.priority === priorityFilter;
      const searchMatch = lowercasedSearchTerm.trim() === '' ||
        (ticket.item || '').toLowerCase().includes(lowercasedSearchTerm) ||
        (ticket.ticketNumber || '').toLowerCase().includes(lowercasedSearchTerm) ||
        (ticket.assignee || '').toLowerCase().includes(lowercasedSearchTerm) ||
        (ticket.collab || '').toLowerCase().includes(lowercasedSearchTerm);
      return statusMatch && priorityMatch && searchMatch;
    });

    if (sortConfig.key === 'ticketAgeHours') {
        return [...filtered].sort((a, b) => {
            const valA = parseFloat(a.ticketAgeHours);
            const valB = parseFloat(b.ticketAgeHours);
            if (isNaN(valA) || isNaN(valB)) return 0;
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return filtered;
  }, [dailyData.collabTickets, statusFilter, priorityFilter, searchTerm, sortConfig]);

  const sortedAndFilteredPendingTickets = useMemo(() => {
    if (!dailyData.pendingTickets) return [];
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    const filtered = dailyData.pendingTickets.filter(ticket => {
      const statusMatch = statusFilter === 'all' || ticket.status === statusFilter;
      const priorityMatch = priorityFilter === 'all' || ticket.priority === priorityFilter;
      const searchMatch = lowercasedSearchTerm.trim() === '' ||
        (ticket.item || '').toLowerCase().includes(lowercasedSearchTerm) ||
        (ticket.ticketNumber || '').toLowerCase().includes(lowercasedSearchTerm) ||
        (ticket.assignee || '').toLowerCase().includes(lowercasedSearchTerm);
      return statusMatch && priorityMatch && searchMatch;
    });

    if (sortConfig.key === 'ticketAgeHours') {
        return [...filtered].sort((a, b) => {
            const valA = parseFloat(a.ticketAgeHours);
            const valB = parseFloat(b.ticketAgeHours);
            if (isNaN(valA) || isNaN(valB)) return 0;
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return filtered;
  }, [dailyData.pendingTickets, statusFilter, priorityFilter, searchTerm, sortConfig]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Total Tickets Today" value={kpiData.totalToday.toString()} icon={<TicketIcon />} />
        <KpiCard title="Pending / In Progress" value={kpiData.pendingToday.toString()} icon={<ClockIcon />} />
        <KpiCard title="Closed / Resolved Today" value={kpiData.closedToday.toString()} icon={<DocumentCheckIcon />} />
        <KpiCard title="Avg. Time Spent (Hours)" value={kpiData.avgTimeSpent} icon={<ChartBarIcon />} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-white">Tickets by Priority (Historical)</h2>
          <TicketsByPriorityChart data={historicalData} />
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-white">Top 10 Categories (Historical)</h2>
          <TicketsByCategoryChart data={historicalData} />
        </div>
      </div>
      
      <FilterControls
        searchTerm={searchTerm}
        onSearchChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* Tables */}
      <div className="space-y-6">
        {dailyData.mainTickets && dailyData.mainTickets.length > 0 && (
          <MainTicketsTable 
            tickets={sortedAndFilteredMainTickets} 
            onTicketClick={handleViewTicketDetails} 
            sortConfig={sortConfig} 
            onSort={handleSort}
            statuses={uniqueStatuses}
            priorities={uniquePriorities}
            currentStatus={statusFilter}
            currentPriority={priorityFilter}
            onStatusChange={setStatusFilter}
            onPriorityChange={setPriorityFilter}
          />
        )}
        {dailyData.collabTickets && dailyData.collabTickets.length > 0 && (
          <CollabTicketsTable 
            tickets={sortedAndFilteredCollabTickets} 
            onTicketClick={handleViewTicketDetails} 
            sortConfig={sortConfig} 
            onSort={handleSort}
            statuses={uniqueStatuses}
            priorities={uniquePriorities}
            currentStatus={statusFilter}
            currentPriority={priorityFilter}
            onStatusChange={setStatusFilter}
            onPriorityChange={setPriorityFilter}
          />
        )}
        {dailyData.pendingTickets && dailyData.pendingTickets.length > 0 && (
          <PendingTicketsTable 
            tickets={sortedAndFilteredPendingTickets} 
            onTicketClick={handleViewTicketDetails} 
            sortConfig={sortConfig} 
            onSort={handleSort}
            statuses={uniqueStatuses}
            priorities={uniquePriorities}
            currentStatus={statusFilter}
            currentPriority={priorityFilter}
            onStatusChange={setStatusFilter}
            onPriorityChange={setPriorityFilter}
          />
        )}
        {dailyData.upcomingProjects && dailyData.upcomingProjects.length > 0 && <UpcomingProjectsTable projects={dailyData.upcomingProjects} />}
        {dailyData.techTeamMetrics && dailyData.techTeamMetrics.length > 0 && <TeamMetricsTable metrics={dailyData.techTeamMetrics} />}
      </div>
      
      <TicketDetailModal 
        isOpen={!!selectedTicket}
        onClose={handleCloseModal}
        ticket={selectedTicket}
      />
    </div>
  );
};

export default Dashboard;
