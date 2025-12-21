
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { HistoricalTicket } from '../types';
import { normalizeDate } from '../hooks/useTicketData';

interface ChartProps {
  data: HistoricalTicket[];
}

const PRIORITY_COLORS = {
  'Urgent': '#ef4444',
  'High priority': '#f97316',
  'Medium priority': '#f59e0b',
  'Low priority': '#3b82f6',
  'default': '#6b7280',
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export const TicketsByPriorityChart: React.FC<ChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    const counts = data.reduce((acc, ticket) => {
      const priority = ticket.priority || 'Unknown';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data]);

  return (
    <div className="h-[300px] w-full">
        <ResponsiveContainer>
            <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.default} />
                    ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
        </ResponsiveContainer>
    </div>
  );
};

export const TicketsByCategoryChart: React.FC<ChartProps> = ({ data }) => {
    const chartData = useMemo(() => {
        const counts = data.reduce((acc, ticket) => {
            const category = ticket.category || ticket.tags || 'Uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => Number(b.value) - Number(a.value))
            .slice(0, 10);
    }, [data]);

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer>
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} fontSize={12} />
                    <Tooltip cursor={{fill: '#374151'}} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const TicketsByDateChart: React.FC<ChartProps> = ({ data }) => {
    const chartData = useMemo(() => {
        const counts = data.reduce((acc, ticket) => {
            const dateInfo = normalizeDate(ticket.createdOn);
            if (!dateInfo) return acc;
            const key = dateInfo.dateKey;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts)
            .map(([date, value]) => ({ date, value }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-15); // Show last 15 active days
    }, [data]);

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis 
                        dataKey="date" 
                        stroke="#9ca3af" 
                        fontSize={10} 
                        tickFormatter={(val) => val.split('-').slice(1).join('/')}
                    />
                    <YAxis stroke="#9ca3af" fontSize={10} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        itemStyle={{ color: '#3b82f6' }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// Added TicketsByIsoChart to resolve compilation error in ReportPage.tsx
export const TicketsByIsoChart: React.FC<ChartProps> = ({ data }) => {
    const chartData = useMemo(() => {
        const counts = data.reduce((acc, ticket) => {
            const iso = ticket.isoClause || 'N/A';
            acc[iso] = (acc[iso] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => Number(b.value) - Number(a.value));
    }, [data]);

    return (
        <div className="h-full w-full min-h-[250px]">
            <ResponsiveContainer>
                <PieChart>
                    <Pie 
                        data={chartData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={60} 
                        outerRadius={80} 
                        fill="#8884d8" 
                        paddingAngle={5} 
                        dataKey="value" 
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                        {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
