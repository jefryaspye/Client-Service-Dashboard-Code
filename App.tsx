
import React, { useState, useMemo } from 'react';
import { useTicketData } from './hooks/useTicketData';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ErrorDisplay from './components/ErrorDisplay';
import DatabasePage from './components/DatabasePage';

const App: React.FC = () => {
  const { dailyData, historicalData, isLoading, error, refetch, rawCSV, updateCSV, resetCSV } = useTicketData();
  const [currentView, setCurrentView] = useState<'dashboard' | 'database'>('dashboard');

  const sortedDateKeys = useMemo(() => {
    if (!dailyData) return [];
    return Object.keys(dailyData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [dailyData]);
  
  const [currentDateIndex, setCurrentDateIndex] = useState(0);

  const handlePrevDay = () => {
    setCurrentDateIndex((prevIndex) => Math.min(prevIndex + 1, sortedDateKeys.length - 1));
  };

  const handleNextDay = () => {
    setCurrentDateIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={refetch} />;
  }

  const selectedDateKey = sortedDateKeys[currentDateIndex];
  const currentDailyData = dailyData && selectedDateKey ? dailyData[selectedDateKey] : null;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <Header
        currentDate={currentDailyData?.date || 'N/A'}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        isPrevDisabled={currentDateIndex >= sortedDateKeys.length - 1}
        isNextDisabled={currentDateIndex <= 0}
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      <main className="p-4 sm:p-6 lg:p-8">
        {currentView === 'dashboard' ? (
           (!dailyData || sortedDateKeys.length === 0) ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>No data available. Go to Database to upload data.</p>
            </div>
           ) : (
             <Dashboard 
               dailyData={currentDailyData!} 
               historicalData={historicalData} 
             />
           )
        ) : (
            <DatabasePage 
                currentCSV={rawCSV}
                onSave={updateCSV}
                onReset={resetCSV}
            />
        )}
      </main>
    </div>
  );
};

export default App;
