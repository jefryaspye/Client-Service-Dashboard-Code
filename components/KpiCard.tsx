
import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement<{ className?: string }>;
  trend?: string;
  color?: 'brand' | 'blue' | 'green' | 'red' | 'gray';
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, trend, color = 'gray' }) => {
  const colorMap = {
    brand: 'from-brand-600/20 to-brand-900/10 text-brand-400 border-brand-500/20',
    blue: 'from-blue-600/20 to-blue-900/10 text-blue-400 border-blue-500/20',
    green: 'from-green-600/20 to-green-900/10 text-green-400 border-green-500/20',
    red: 'from-red-600/20 to-red-900/10 text-red-400 border-red-500/20',
    gray: 'from-gray-600/10 to-gray-800/5 text-gray-400 border-gray-700/50',
  };

  const iconBgMap = {
    brand: 'bg-brand-600/10 text-brand-400 border-brand-500/20',
    blue: 'bg-blue-600/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-600/10 text-green-400 border-green-500/20',
    red: 'bg-red-600/10 text-red-400 border-red-500/20',
    gray: 'bg-gray-700 text-gray-500 border-gray-600',
  };

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${colorMap[color]} p-6 rounded-3xl border backdrop-blur-md shadow-xl group hover:scale-[1.02] transition-all duration-300`}>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-current opacity-[0.03] rounded-full blur-2xl"></div>
      
      <div className="flex flex-col h-full justify-between">
        <div className="flex items-center justify-between mb-6">
          <div className={`p-2.5 rounded-xl border ${iconBgMap[color]} transition-colors`}>
            {React.cloneElement(icon, { className: "h-5 w-5" })}
          </div>
          {trend && (
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{trend}</span>
          )}
        </div>
        
        <div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{title}</p>
          <div className="flex items-baseline space-x-2">
            <h4 className="text-3xl font-black text-white tracking-tighter">{value}</h4>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KpiCard;
