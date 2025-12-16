
import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ChartBarIcon, DatabaseIcon } from './icons';

interface HeaderProps {
  currentDate: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  isPrevDisabled: boolean;
  isNextDisabled: boolean;
  currentView: 'dashboard' | 'database';
  onViewChange: (view: 'dashboard' | 'database') => void;
}

const Header: React.FC<HeaderProps> = ({ 
  currentDate, 
  onPrevDay, 
  onNextDay, 
  isPrevDisabled, 
  isNextDisabled,
  currentView,
  onViewChange
}) => {
  return (
    <header className="bg-gray-800 shadow-md sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white">Client Service Dashboard</h1>
            </div>
            <nav className="hidden md:flex space-x-4">
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
                onClick={() => onViewChange('database')}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors ${
                  currentView === 'database' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <DatabaseIcon className="w-4 h-4" />
                <span>Database</span>
              </button>
            </nav>
          </div>

          {currentView === 'dashboard' && (
            <div className="flex items-center bg-gray-900 rounded-lg p-1">
              <button
                onClick={onPrevDay}
                disabled={isPrevDisabled}
                className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous day"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <span className="text-sm sm:text-base font-semibold text-white mx-2 sm:mx-4 w-28 text-center">{currentDate}</span>
              <button
                onClick={onNextDay}
                disabled={isNextDisabled}
                className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Next day"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
