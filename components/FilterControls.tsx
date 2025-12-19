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
  onSortChange
}) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg space-y-4 border border-gray-700/50">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-white flex-shrink-0 tracking-tight">Filter & Search</h3>
        
        <div className="w-full xl:w-auto flex-grow flex flex-col xl:flex-row gap-3">
           {/* Search */}
           <div className="relative flex-grow max-w-full xl:max-w-md">
              <label htmlFor="search-filter" className="sr-only">Search</label>
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                </svg>
              </div>
              <input
                type="text"
                id="search-filter"
                value={searchTerm}
                onChange={onSearchChange}
                className="bg-gray-900/50 border border-gray-700 text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none block w-full pl-10 p-2.5 transition-all"
                placeholder="Search ID, Subject, Technician..."
              />
          </div>

          {/* Filters Group */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full xl:w-auto">
             <select
                value={timeRange}
                onChange={(e) => onTimeRangeChange(e.target.value as 'day' | 'week' | 'all')}
                className="bg-gray-900/50 border border-gray-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 block p-2.5 outline-none transition-all"
                aria-label="Filter by Time Range"
             >
                <option value="day">Selected Day</option>
                <option value="week">Last 7 Days</option>
                <option value="all">All Time</option>
             </select>

             <select
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value)}
                className="bg-gray-900/50 border border-gray-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 block p-2.5 outline-none transition-all"
                aria-label="Filter by Status"
             >
                <option value="all">All Statuses</option>
                {uniqueStatuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                ))}
             </select>

             <select
                value={priorityFilter}
                onChange={(e) => onPriorityChange(e.target.value)}
                className="bg-gray-900/50 border border-gray-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 block p-2.5 outline-none transition-all col-span-2 md:col-span-1"
                aria-label="Filter by Priority"
             >
                <option value="all">All Priorities</option>
                {uniquePriorities.map((p) => (
                    <option key={p} value={p}>{p}</option>
                ))}
             </select>
          </div>
        </div>
      </div>

      {/* Mobile Only Sort Control */}
      <div className="md:hidden pt-4 border-t border-gray-700/50">
         <label className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] mb-2 block">Quick Sort</label>
         <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button 
                onClick={() => onSortChange('ticketNumber')} 
                className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all ${sortConfig.key === 'ticketNumber' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-gray-900/50 border-gray-700 text-gray-500 hover:text-gray-300'}`}
            >
                ID No.
            </button>
             <button 
                onClick={() => onSortChange('assignee')} 
                className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all ${sortConfig.key === 'assignee' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-gray-900/50 border-gray-700 text-gray-500 hover:text-gray-300'}`}
            >
                Tech
            </button>
            <button 
                onClick={() => onSortChange('ticketAgeHours')} 
                className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all ${sortConfig.key === 'ticketAgeHours' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-gray-900/50 border-gray-700 text-gray-500 hover:text-gray-300'}`}
            >
                Age (H)
            </button>
            <button 
                onClick={() => onSortChange('createdOn')} 
                className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all ${sortConfig.key === 'createdOn' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-gray-900/50 border-gray-700 text-gray-500 hover:text-gray-300'}`}
            >
                Date
            </button>
         </div>
      </div>
    </div>
  );
};

export default FilterControls;