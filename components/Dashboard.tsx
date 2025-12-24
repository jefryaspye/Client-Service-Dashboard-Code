
import React, { useMemo, useState, useEffect } from 'react';
import type { DailyData, HistoricalTicket, AnyTicket, SortConfig, MainTicket, PendingTicket, CollabTicket, PMTicket } from '../types';
import KpiCard from './KpiCard';
import { TicketsByPriorityChart, TicketsByCategoryChart, TicketsByDateChart } from './Charts';
import { MainTicketsTable, CollabTicketsTable, PendingTicketsTable, TeamMetricsTable, PmTicketsTable } from './TicketTables';
import { TicketIcon, ClockIcon, DocumentCheckIcon, ChartBarIcon, ShieldCheckIcon } from './icons';
import FilterControls from './FilterControls';
import TicketDetailModal from './TicketDetailModal';

interface DashboardProps {
  dailyData: DailyData;
  historicalData: HistoricalTicket[];
  allMainTickets: MainTicket[];
  allPendingTickets: PendingTicket[];
  allCollabTickets: CollabTicket[];
  allPmTickets: PMTicket[];
  onUpdateTicket: (ticketNumber: string, assignee: string, updates: Partial<HistoricalTicket>) => void;
  onJumpToDate: (dateKey: string) => void;
  availableDates: string[];
}

const SmartKpiItem = ({ letter, label, value, target, unit, inverse = false }: { letter: string, label: string, value: number, target: number, unit: string, inverse?: boolean }) => {
    const isGood = inverse ? value <= target : value >= target;
    const colorClass = isGood ? 'text-green-400' : 'text-red-400';
    const percent = Math.min(100, (value / (target || 1)) * 100);
    
    return (
        <div className="bg-gray-800/40 backdrop-blur-md p-4 rounded-2xl border border-gray-700/50 shadow-lg group hover:border-brand-500/30 transition-all duration-300">
            <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center border border-gray-700 group-hover:bg-brand-600 transition-all duration-300">
                  <span className="text-xl font-black text-brand-400 group-hover:text-white">{letter}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-sm font-mono font-black ${colorClass}`}>{value}{unit}</span>
                  <span className="text-[9px] text-gray-600 font-bold uppercase mt-0.5 tracking-tighter">Target: {target}{unit}</span>
                </div>
            </div>
            <div className="text-[11px] font-bold text-gray-400 mb-3 h-8 leading-snug uppercase tracking-tight">{label}</div>
            <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ${isGood ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} 
                    style={{ width: `${Math.min(100, inverse ? (target/ (value || 1)) * 100 : percent)}%` }}
                ></div>
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ dailyData, historicalData, allMainTickets, allPendingTickets, allCollabTickets, allPmTickets, onUpdateTicket, onJumpToDate, availableDates }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'all' | 'custom'>('day');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<AnyTicket | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  
  // Custom range state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isGlobalSearch = searchTerm.trim().length > 0;
  const effectiveTimeRange = (isGlobalSearch && timeRange === 'day') ? 'all' : timeRange;

  const currentDateKey = useMemo(() => {
    const parts = dailyData.date.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return '';
  }, [dailyData.date]);

  // Sync custom range with current cycle date if day is selected
  useEffect(() => {
    if (timeRange === 'day' && currentDateKey) {
      setStartDate(currentDateKey);
      setEndDate(currentDateKey);
    }
  }, [currentDateKey, timeRange]);

  const kpiData = useMemo(() => {
    const totalToday = (dailyData.mainTickets?.length || 0) + (dailyData.pmTickets?.length || 0) + (dailyData.collabTickets?.length || 0);
    const pendingToday = dailyData.pendingTickets?.length || 0;
    const closedToday = (dailyData.mainTickets?.filter(t => (t.status || '').toLowerCase() === 'closed').length || 0) + 
                        (dailyData.mainTickets?.filter(t => (t.status || '').toLowerCase() === 'resolved').length || 0) +
                        (dailyData.pmTickets?.filter(t => (t.status || '').toLowerCase() === 'closed').length || 0);

    const validTimeSpents = historicalData.map(t => parseFloat(t.timeSpent)).filter(t => !isNaN(t) && t > 0);
    const avgTimeSpent = validTimeSpents.length > 0 ? (validTimeSpents.reduce((a, b) => a + b, 0) / validTimeSpents.length).toFixed(2) : '0.00';
    const slaTickets = historicalData.filter(t => t.failedSlaPolicy !== undefined);
    const slaPassed = slaTickets.filter(t => (t.failedSlaPolicy || '').toUpperCase() !== 'TRUE').length;
    const slaRate = slaTickets.length > 0 ? Math.round((slaPassed / slaTickets.length) * 100) : 100;
    const avgHoursOpen = allPendingTickets.length > 0 ? (allPendingTickets.reduce((acc, t) => acc + (new Date().getTime() - new Date(t.createdOn).getTime()) / (1000 * 60 * 60), 0) / allPendingTickets.length).toFixed(1) : '0.0';

    const validIsoTickets = historicalData.filter(t => t.isoClause && t.isoClause.trim() !== '' && t.isoClause !== 'N/A');
    const isoComplianceRate = historicalData.length > 0 ? Math.round((validIsoTickets.length / historicalData.length) * 100) : 0;

    return { totalToday, pendingToday, closedToday, avgTimeSpent, slaRate, avgHoursOpen, isoComplianceRate };
  }, [dailyData, historicalData, allPendingTickets]);

  const smartMetrics = useMemo(() => {
    const mainTotal = dailyData.mainTickets?.length || 0;
    const mainClosed = dailyData.mainTickets?.filter(t => ['closed', 'resolved'].includes((t.status || '').toLowerCase())).length || 0;
    const resolutionRate = mainTotal > 0 ? Math.round((mainClosed / mainTotal) * 100) : 0;
    const uniqueAssignees = new Set(dailyData.pendingTickets?.map(t => t.assignee)).size || 1;
    const loadPerTech = Math.round((dailyData.pendingTickets?.length / uniqueAssignees) * 10) / 10;
    const allTkts = [...(dailyData.mainTickets || []), ...(dailyData.pmTickets || []), ...(dailyData.collabTickets || [])];
    const escalationRate = allTkts.length > 0 ? Math.round((allTkts.filter(t => (t.escalation || '').toLowerCase() === 'yes').length / allTkts.length) * 100) : 0;

    return { resolutionRate, avgTime: parseFloat(kpiData.avgTimeSpent), loadPerTech, escalationRate, slaRate: kpiData.slaRate };
  }, [dailyData, kpiData]);

  const { uniqueStatuses, uniquePriorities } = useMemo(() => ({
    uniqueStatuses: Array.from(new Set(historicalData.map(t => t.stage || ''))).filter(s => s).sort(),
    uniquePriorities: Array.from(new Set(historicalData.map(t => t.priority || ''))).filter(p => p).sort()
  }), [historicalData]);

  const filteredTickets = useMemo(() => {
    const getSrc = <T extends AnyTicket>(all: T[], daily: T[]) => {
      if (effectiveTimeRange === 'day') return daily;
      if (effectiveTimeRange === 'all') return all;
      
      let start: Date;
      let end: Date = new Date();

      if (effectiveTimeRange === 'week') {
        start = new Date(new Date(dailyData.date.split('/').reverse().join('-')));
        start.setDate(start.getDate() - 7);
      } else if (effectiveTimeRange === 'custom') {
        start = startDate ? new Date(startDate) : new Date(0);
        end = endDate ? new Date(endDate) : new Date();
        // Set end to end of day
        end.setHours(23, 59, 59, 999);
      } else {
        return all;
      }

      return all.filter(t => {
        const d = new Date(t.createdOn);
        return d >= start && d <= end;
      });
    };

    const applyFilt = <T extends AnyTicket>(tkts: T[]) => {
      const term = searchTerm.toLowerCase().trim();
      return tkts.filter(t => {
        const matchFilt = (statusFilter === 'all' || t.status === statusFilter) && (priorityFilter === 'all' || t.priority === priorityFilter);
        const matchSearch = term === '' || 
                            t.item.toLowerCase().includes(term) || 
                            t.ticketNumber.toLowerCase().includes(term) || 
                            t.assignee.toLowerCase().includes(term) ||
                            t.createdOn.toLowerCase().includes(term);
        return matchFilt && matchSearch;
      });
    };

    return {
      main: applyFilt(getSrc(allMainTickets, dailyData.mainTickets)),
      pm: applyFilt(getSrc(allPmTickets, dailyData.pmTickets)),
      collab: applyFilt(getSrc(allCollabTickets, dailyData.collabTickets)),
      pending: applyFilt(getSrc(allPendingTickets, dailyData.pendingTickets))
    };
  }, [dailyData, allMainTickets, allCollabTickets, allPendingTickets, allPmTickets, statusFilter, priorityFilter, searchTerm, effectiveTimeRange, startDate, endDate]);

  const chartHistory = useMemo(() => {
    if (effectiveTimeRange === 'all') return historicalData;
    
    let start: Date;
    let end: Date;

    if (effectiveTimeRange === 'day') {
      end = new Date(dailyData.date.split('/').reverse().join('-'));
      return historicalData.filter(t => new Date(t.createdOn).toDateString() === end.toDateString());
    } else if (effectiveTimeRange === 'week') {
      end = new Date(dailyData.date.split('/').reverse().join('-'));
      start = new Date(end);
      start.setDate(end.getDate() - 7);
    } else if (effectiveTimeRange === 'custom') {
      start = startDate ? new Date(startDate) : new Date(0);
      end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
    } else {
      return historicalData;
    }

    return historicalData.filter(t => {
        const d = new Date(t.createdOn);
        return d >= start && d <= end;
    });
  }, [historicalData, effectiveTimeRange, dailyData.date, startDate, endDate]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* KPI Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6">
        <KpiCard title="Total Volume" value={kpiData.totalToday} icon={<TicketIcon />} trend="+4% vs yesterday" />
        <KpiCard title="Active Pipeline" value={kpiData.pendingToday} icon={<ClockIcon />} color="blue" />
        <KpiCard title="Completions" value={kpiData.closedToday} icon={<DocumentCheckIcon />} color="green" />
        <KpiCard title="Mean Labor Time" value={`${kpiData.avgTimeSpent}h`} icon={<ChartBarIcon />} />
        <KpiCard title="Backlog Age" value={`${kpiData.avgHoursOpen}h`} icon={<ClockIcon />} color="red" />
        <KpiCard title="ISO Documentation" value={`${kpiData.isoComplianceRate}%`} icon={<ShieldCheckIcon />} color="blue" />
        <KpiCard title="SLA Compliance" value={`${kpiData.slaRate}%`} icon={<ShieldCheckIcon />} color="brand" />
      </section>

      {/* SMART Objectives */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="relative">
          <div className="flex items-center space-x-4 mb-6">
            <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center">
              <div className="w-8 h-[2px] bg-brand-600 mr-3"></div>
              SMART Team Objectives
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              <SmartKpiItem letter="S" label="Daily Resolution Rate" value={smartMetrics.resolutionRate} target={90} unit="%" />
              <SmartKpiItem letter="M" label="Mean Resolution Cycle" value={smartMetrics.avgTime} target={4.0} unit="h" inverse={true} />
              <SmartKpiItem letter="A" label="Workload Density" value={smartMetrics.loadPerTech} target={5} unit=" tkt/tech" inverse={true} />
              <SmartKpiItem letter="R" label="Escalation Velocity" value={smartMetrics.escalationRate} target={5} unit="%" inverse={true} />
              <SmartKpiItem letter="T" label="Compliance Accuracy" value={smartMetrics.slaRate} target={95} unit="%" />
          </div>
        </div>
      </section>

      {/* Analytics Visualization */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-gray-800/50 backdrop-blur-md p-6 rounded-3xl border border-gray-700/50 shadow-2xl">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Severity Distribution</h3>
          <TicketsByPriorityChart data={chartHistory} />
        </div>
        <div className="bg-gray-800/50 backdrop-blur-md p-6 rounded-3xl border border-gray-700/50 shadow-2xl">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Labor Segments (Top 10)</h3>
          <TicketsByCategoryChart data={chartHistory} />
        </div>
        <div className="bg-gray-800/50 backdrop-blur-md p-6 rounded-3xl border border-gray-700/50 shadow-2xl">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Engagement Velocity</h3>
          <TicketsByDateChart data={effectiveTimeRange === 'day' ? historicalData : chartHistory} />
        </div>
      </section>
      
      {/* Filtering & Search */}
      <section className="space-y-4">
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
            onSortChange={(k) => setSortConfig(p => ({ key: k, direction: p.key === k && p.direction === 'asc' ? 'desc' : 'asc' }))}
            onJumpToDate={onJumpToDate}
            availableDates={availableDates}
            currentDateKey={currentDateKey}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
        />
        {effectiveTimeRange !== 'day' && (
            <div className="bg-brand-950/40 border border-brand-800/50 text-brand-300 px-6 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest flex items-center justify-center animate-in fade-in shadow-xl backdrop-blur-sm">
                <ShieldCheckIcon className="w-4 h-4 mr-3 text-brand-400" />
                Context: {
                  effectiveTimeRange === 'all' ? "Deep Historical Audit" : 
                  effectiveTimeRange === 'custom' ? `Custom Range (${startDate || 'Start'} to ${endDate || 'End'})` : 
                  "Rolling 7-Day Performance Window"
                }
            </div>
        )}
      </section>

      {/* Data Tables */}
      <section className="space-y-8">
        {filteredTickets.main.length > 0 && <MainTicketsTable tickets={filteredTickets.main} onTicketClick={setSelectedTicket} sortConfig={sortConfig} onSort={() => {}} />}
        {filteredTickets.pm.length > 0 && <PmTicketsTable tickets={filteredTickets.pm} onTicketClick={setSelectedTicket} sortConfig={sortConfig} onSort={() => {}} />}
        {filteredTickets.collab.length > 0 && <CollabTicketsTable tickets={filteredTickets.collab} onTicketClick={setSelectedTicket} sortConfig={sortConfig} onSort={() => {}} />}
        {filteredTickets.pending.length > 0 && <PendingTicketsTable tickets={filteredTickets.pending} onTicketClick={setSelectedTicket} sortConfig={sortConfig} onSort={() => {}} />}
        
        {Object.values(filteredTickets).every(arr => arr.length === 0) && (
            <div className="bg-gray-800/30 p-24 text-center rounded-3xl border border-gray-700/50 backdrop-blur-sm border-dashed">
                <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
                  <ChartBarIcon className="w-8 h-8 text-gray-700" />
                </div>
                <h4 className="text-white font-bold text-lg">Null Vector Detected</h4>
                <p className="text-gray-500 text-sm mt-1">No operational data matches the current filter parameters.</p>
            </div>
        )}
        {effectiveTimeRange === 'day' && !isGlobalSearch && dailyData.techTeamMetrics?.length > 0 && <TeamMetricsTable metrics={dailyData.techTeamMetrics} />}
      </section>
      
      <TicketDetailModal isOpen={!!selectedTicket} onClose={() => setSelectedTicket(null)} ticket={selectedTicket} onUpdateTicket={onUpdateTicket} />
    </div>
  );
};

export default Dashboard;
