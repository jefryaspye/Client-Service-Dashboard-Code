import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  // FIX: The type for the `icon` prop has been made more specific to ensure it accepts a `className`.
  // This resolves the TypeScript overload error on `React.cloneElement` by guaranteeing that the passed element can receive the `className` prop.
  icon: React.ReactElement<{ className?: string }>;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-center space-x-4 transform hover:scale-105 transition-transform duration-200">
      <div className="bg-gray-700 p-3 rounded-full text-blue-400">
        {React.cloneElement(icon, { className: "h-6 w-6" })}
      </div>
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
};

export default KpiCard;