
import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ChartBarIcon, DatabaseIcon, BeakerIcon, ClockIcon, PrinterIcon, ShieldCheckIcon } from './icons';

interface HeaderProps {
  currentDate: string;
  lastUpdated?: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  isPrevDisabled: boolean;
  isNextDisabled: boolean;
  currentView: 'dashboard' | 'database' | 'staging' | 'reports' | 'compliance' | 'operations';
  onViewChange: (view: 'dashboard' | 'database' | 'staging' | 'reports' | 'compliance' | 'operations') => void;
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
  const NavButton = ({ view, label, icon: Icon }: { view: typeof currentView, label: string, icon: any }) => (
    <button
      onClick={() => onViewChange(view)}
      className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2.5 transition-all duration-200 ${
        currentView === view 
          ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40 ring-1 ring-brand-400/30' 
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      <Icon className={`w-4 h-4 ${currentView === view ? 'text-white' : 'text-gray-500'}`} />
      <span>{label}</span>
    </button>
  );

  return (
    <header className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 sticky top-0 z-50 print-none">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-12">
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                  <ShieldCheckIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-lg font-black text-white tracking-tight leading-none uppercase">Enterprise</h1>
                  <span className="text-[10px] text-brand-400 font-black uppercase tracking-widest mt-0.5">Service Intelligence</span>
                </div>
              </div>
            </div>
            
            <nav className="hidden xl:flex items-center space-x-1 p-1 bg-gray-950/50 rounded-2xl border border-gray-800">
              <NavButton view="dashboard" label="Performance" icon={ChartBarIcon} />
              <NavButton view="reports" label="Service Reports" icon={PrinterIcon} />
              <NavButton view="compliance" label="Regulatory" icon={ShieldCheckIcon} />
              <NavButton view="operations" label="Operations" icon={ClockIcon} />
              <NavButton view="staging" label="Audit Lab" icon={BeakerIcon} />
              <NavButton view="database" label="Dataset" icon={DatabaseIcon} />
            </nav>
          </div>

          <div className="flex items-center space-x-6">
            {(currentView === 'dashboard' || currentView === 'reports') && (
              <div className="flex items-center bg-gray-950 rounded-2xl border border-gray-800 p-1 shadow-inner">
                <button
                  onClick={onPrevDay}
                  disabled={isPrevDisabled}
                  className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-gray-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                  aria-label="Previous day"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <div className="px-4 flex flex-col items-center min-w-[120px]">
                    <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest leading-none">Record Date</span>
                    <span className="text-sm font-bold text-white mt-1">{currentDate}</span>
                </div>
                <button
                  onClick={onNextDay}
                  disabled={isNextDisabled}
                  className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-gray-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                  aria-label="Next day"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
            )}
            
            {lastUpdated && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Last Synced</span>
                <div className="flex items-center space-x-1.5 text-xs text-brand-400 font-mono font-bold mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></div>
                    <span>{lastUpdated.split(',')[1]}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
