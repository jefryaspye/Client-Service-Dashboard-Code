
import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ChartBarIcon, DatabaseIcon, BeakerIcon, ClockIcon, PrinterIcon } from './icons';

interface HeaderProps {
  currentDate: string;
  lastUpdated?: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  isPrevDisabled: boolean;
  isNextDisabled: boolean;
  currentView: 'dashboard' | 'database' | 'staging' | 'reports';
  onViewChange: (view: 'dashboard' | 'database' | 'staging' | 'reports') => void;
}

const Header: React.FC<HeaderProps> = ({ 
  currentDate, 
  lastUpdated,
  onPrevDay, 
  onNextDay, 
  isPrevDisabled, 
  isNextDisabled,
  currentView,
  onViewChange
}) => {
  return (
    <header className="bg-gray-800 shadow-md sticky top-0 z-10 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <div className="flex flex-col">
                <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Client Service Dashboard</h1>
                {lastUpdated && (
                  <div className="flex items-center space-x-1 text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                    <ClockIcon className="w-3 h-3" />
                    <span>Last Synced: {lastUpdated}</span>
                  </div>
                )}
              </div>
            </div>
            <nav className="hidden lg:flex space-x-2">
              <button
                onClick={() => onViewChange('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors ${
                  currentView === 'dashboard' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <ChartBarIcon className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => onViewChange('reports')}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors ${
                  currentView === 'reports' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <PrinterIcon className="w-4 h-4" />
                <span>Service Report</span>
              </button>
              <button
                onClick={() => onViewChange('staging')}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors ${
                  currentView === 'staging' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <BeakerIcon className="w-4 h-4" />
                <span>Data Reconciliation</span>
              </button>
              <button
                onClick={() => onViewChange('database')}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors ${
                  currentView === 'database' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <DatabaseIcon className="w-4 h-4" />
                <span>Editor</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {(currentView === 'dashboard' || currentView === 'reports') && (
              <div className="flex items-center bg-gray-900 rounded-lg p-1">
                <button
                  onClick={onPrevDay}
                  disabled={isPrevDisabled}
                  className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous day"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <span className="text-sm sm:text-base font-semibold text-white mx-2 sm:mx-4 w-28 text-center">{currentDate}</span>
                <button
                  onClick={onNextDay}
                  disabled={isNextDisabled}
                  className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next day"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
