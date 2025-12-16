import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { HistoricalTicket } from '../types';

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

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

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
    <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={110}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                >
                    {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.default} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{ backgroundColor: '#2d3748', border: 'none', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    </div>
  );
};

export const TicketsByCategoryChart: React.FC<ChartProps> = ({ data }) => {
    const chartData = useMemo(() => {
        const counts = data.reduce((acc, ticket) => {
            const category = ticket.category || 'Uncategorized';
            if(category.trim() !== '') {
                acc[category] = (acc[category] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            // FIX: Explicitly cast values to numbers before sorting to resolve arithmetic operation error.
            .sort((a, b) => Number(b.value) - Number(a.value))
            .slice(0, 10);
    }, [data]);

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <XAxis type="number" stroke="#a0aec0" />
                    <YAxis dataKey="name" type="category" stroke="#a0aec0" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#2d3748', border: 'none', borderRadius: '0.5rem' }}
                        labelStyle={{ color: '#e2e8f0' }}
                        cursor={{ fill: 'rgba(74, 85, 104, 0.5)' }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" barSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};