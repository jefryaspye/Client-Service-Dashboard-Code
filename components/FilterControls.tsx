
import React from 'react';
import { SortConfig } from '../types';

interface FilterControlsProps {
  searchTerm: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  priorityFilter: string;
  onPriorityChange: (val: string) => void;
  timeRange: 'day' | 'week' | 'all';
  onTimeRangeChange: (val: 'day' | 'week' | 'all') => void;
  uniqueStatuses: string[];
  uniquePriorities: string[];
  sortConfig: SortConfig;
  onSortChange: (key: string) => void;
  onJumpToDate: (dateKey: string) => void;
  availableDates: string[];
  currentDateKey: string;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  timeRange,
  onTimeRangeChange,
  uniqueStatuses,
  uniquePriorities,
  sortConfig,
  onSortChange,
  onJumpToDate,
  availableDates,
  currentDateKey
}) => {
  const handleReset = () => {
    onStatusChange('all');
    onPriorityChange('all');
    onTimeRangeChange('day');
    onSearchChange({ target: { value: '' } } as any);
  };

  const quickJump = (daysAgo: number) => {
    const target = new Date();
    target.setDate(target.getDate() - daysAgo);
    const key = target.toISOString().split('T')[0];
    onJumpToDate(key);
  };

  return (
    <div className="bg-gray-800/40 backdrop-blur-md p-6 rounded-3xl shadow-2xl space-y-6 border border-gray-700/50">
      <div className="flex flex-col xl:flex-row items-center justify-between gap-6">
        <div className="relative w-full xl:max-w-xl group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none transition-colors">
            <svg className="w-4 h-4 text-gray-600 group-focus-within:text-brand-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={onSearchChange}
            className="bg-gray-950 border border-gray-800 text-white text-sm font-semibold rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/50 outline-none block w-full pl-12 p-4 transition-all placeholder:text-gray-700"
            placeholder="Search Database (ID, Title, Tech, or Date)..."
          />
          {searchTerm && (
            <button 
              onClick={() => onSearchChange({ target: { value: '' } } as any)}
              className="absolute inset-y-0 right-4 flex items-center text-gray-600 hover:text-gray-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full xl:w-auto">
          <div className="relative group">
             <input 
                type="date"
                value={currentDateKey}
                onChange={(e) => onJumpToDate(e.target.value)}
                className="bg-gray-950 border border-gray-800 text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/50 block w-full px-4 py-4 outline-none transition-all cursor-pointer hover:bg-gray-900 appearance-none text-center"
             />
             <div className="absolute top-1/2 left-3 -translate-y-1/2 pointer-events-none text-gray-600 group-focus-within:text-brand-500">
               <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"/></svg>
             </div>
          </div>

          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value as any)}
            className="bg-gray-950 border border-gray-800 text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/50 block px-5 py-4 outline-none transition-all cursor-pointer hover:bg-gray-900"
          >
            <option value="day">Selected Cycle</option>
            <option value="week">Weekly Rollup</option>
            <option value="all">Historical Data</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="bg-gray-950 border border-gray-800 text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/50 block px-5 py-4 outline-none transition-all cursor-pointer hover:bg-gray-900"
          >
            <option value="all">All Stages</option>
            {uniqueStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="bg-gray-950 border border-gray-800 text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/50 block px-5 py-4 outline-none transition-all cursor-pointer hover:bg-gray-900"
          >
            <option value="all">All Severities</option>
            {uniquePriorities.map((p) => (
                <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-700/30">
        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mr-2">Quick Jump:</span>
        <button onClick={() => quickJump(0)} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg bg-gray-950 border border-gray-800 text-gray-400 hover:text-white hover:border-brand-500/50 transition-all">Today</button>
        <button onClick={() => quickJump(1)} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg bg-gray-950 border border-gray-800 text-gray-400 hover:text-white hover:border-brand-500/50 transition-all">Yesterday</button>
        <button onClick={() => quickJump(7)} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg bg-gray-950 border border-gray-800 text-gray-400 hover:text-white hover:border-brand-500/50 transition-all">Last Week</button>
        <div className="flex-grow"></div>
        <button 
          onClick={handleReset}
          className="text-[9px] font-black uppercase px-4 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-900/10 transition-all"
        >
          Reset All Filters
        </button>
      </div>
    </div>
  );
};

export default FilterControls;
