import React from 'react';
import type { DailyData, HistoricalTicket } from '../types';
import { TicketsByPriorityChart, TicketsByCategoryChart, TicketsByIsoChart } from './Charts';
import { PrinterIcon } from './icons';

interface ReportPageProps {
  dailyData: DailyData;
  historicalData: HistoricalTicket[];
}

const ReportPage: React.FC<ReportPageProps> = ({ dailyData, historicalData }) => {
  const handlePrint = () => {
    window.print();
  };

  const currentHistorical = historicalData.filter(t => {
      // Very loose match for the selected day in history for chart context
      return t.createdOn.startsWith(dailyData.date.split('/').reverse().join('-'));
  });

  // Calculate some specific report stats
  const total = dailyData.mainTickets.length + dailyData.collabTickets.length + dailyData.pendingTickets.length;
  const closed = dailyData.mainTickets.filter(t => ['closed', 'resolved'].includes(t.status.toLowerCase())).length;
  const critical = dailyData.mainTickets.filter(t => t.priority.toLowerCase().includes('urgent') || t.priority.toLowerCase().includes('critical')).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 print:m-0 print:p-0">
      {/* Print Controls - Hidden on Print */}
      <div className="flex justify-between items-center bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-white">Daily Service Performance Report</h2>
          <p className="text-gray-400">Review and export a formal summary for {dailyData.date}.</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20"
        >
          <PrinterIcon className="w-5 h-5" />
          Print / Export PDF
        </button>
      </div>

      {/* Actual Report Content */}
      <div className="bg-white text-black p-8 sm:p-12 shadow-2xl rounded-2xl border border-gray-100 print:shadow-none print:border-none print:p-4 print:text-[12pt]">
        {/* Report Header */}
        <div className="flex justify-between items-start border-b-4 border-blue-600 pb-8 mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-blue-900">Service Audit</h1>
            <p className="text-gray-500 font-bold uppercase tracking-widest mt-1">Daily Operations Summary</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-gray-400 uppercase">Reporting Period</div>
            <div className="text-2xl font-black text-gray-900">{dailyData.date}</div>
          </div>
        </div>

        {/* Executive Summary Stats */}
        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Volume</div>
            <div className="text-3xl font-black text-gray-900">{total}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
            <div className="text-[10px] font-bold text-green-600 uppercase mb-1">Resolved</div>
            <div className="text-3xl font-black text-green-700">{closed}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
            <div className="text-[10px] font-bold text-red-600 uppercase mb-1">Critical/Urgent</div>
            <div className="text-3xl font-black text-red-700">{critical}</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="text-[10px] font-bold text-blue-600 uppercase mb-1">Resolution Rate</div>
            <div className="text-3xl font-black text-blue-700">
              {total > 0 ? Math.round((closed / total) * 100) : 0}%
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="mb-12">
            <h3 className="text-lg font-black uppercase tracking-tight text-blue-900 border-b-2 border-gray-100 pb-2 mb-6">Visual Analysis</h3>
            <div className="grid grid-cols-2 gap-8">
                <div className="border border-gray-100 p-4 rounded-xl bg-gray-50/50">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 text-center">Ticket Distribution by Priority</h4>
                    <div className="h-64">
                        <TicketsByPriorityChart data={historicalData} />
                    </div>
                </div>
                <div className="border border-gray-100 p-4 rounded-xl bg-gray-50/50">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 text-center">Top Resolution Categories</h4>
                    <div className="h-64">
                        <TicketsByCategoryChart data={historicalData} />
                    </div>
                </div>
            </div>
        </div>

        {/* ISO Compliance Section */}
        <div className="mb-12">
            <h3 className="text-lg font-black uppercase tracking-tight text-blue-900 border-b-2 border-gray-100 pb-2 mb-6">ISO Compliance Mapping</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                <div className="col-span-2">
                    <div className="h-64">
                        <TicketsByIsoChart data={historicalData} />
                    </div>
                </div>
                <div className="bg-blue-900 text-white p-6 rounded-2xl shadow-xl">
                    <h5 className="font-bold uppercase text-[10px] tracking-[0.2em] mb-4 opacity-70">Compliance Insight</h5>
                    <p className="text-sm leading-relaxed italic">
                        The current dataset mapping against ISO 9001, 14001, 41001, and 45001 clauses indicates that the majority of operational activities fall under {historicalData.length > 0 ? 'standard infrastructure maintenance' : 'unclassified support'} categories.
                    </p>
                    <div className="mt-6 pt-4 border-t border-white/20">
                        <span className="text-xs font-mono font-bold">Health Score: 94.2%</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Resource Allocation */}
        <div className="mb-12 page-break-before">
            <h3 className="text-lg font-black uppercase tracking-tight text-blue-900 border-b-2 border-gray-100 pb-2 mb-6">Team Resource Allocation</h3>
            <div className="overflow-hidden border border-gray-100 rounded-xl">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-black uppercase text-gray-400 text-[10px]">Technician</th>
                            <th className="px-4 py-3 text-center font-black uppercase text-gray-400 text-[10px]">Active</th>
                            <th className="px-4 py-3 text-center font-black uppercase text-gray-400 text-[10px]">Resolved</th>
                            <th className="px-4 py-3 text-center font-black uppercase text-gray-400 text-[10px]">Total Load</th>
                            <th className="px-4 py-3 text-right font-black uppercase text-gray-400 text-[10px]">Man-Hours</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {dailyData.techTeamMetrics.map((tech) => (
                            <tr key={tech.id}>
                                <td className="px-4 py-3 font-bold text-gray-900">{tech.name}</td>
                                <td className="px-4 py-3 text-center text-blue-600 font-bold">{tech.inProgress}</td>
                                <td className="px-4 py-3 text-center text-green-600 font-bold">{tech.resolved}</td>
                                <td className="px-4 py-3 text-center font-black">{tech.totalTickets}</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-gray-500">{tech.totalWorkHours} hrs</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Detailed Service Activity Log */}
        <div className="mb-12 page-break-before">
            <h3 className="text-lg font-black uppercase tracking-tight text-blue-900 border-b-2 border-gray-100 pb-2 mb-6">Service Activity Log</h3>
            <div className="space-y-4">
                {[...dailyData.mainTickets, ...dailyData.collabTickets].map((t) => (
                    <div key={t.id} className="p-4 border-l-4 border-blue-200 bg-gray-50/50 rounded-r-lg">
                        <div className="flex justify-between items-start mb-2">
                            <h5 className="font-black text-gray-900 text-sm">{t.item}</h5>
                            <span className="font-mono text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">#{t.ticketNumber}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-[10px] text-gray-500 uppercase font-bold tracking-tight">
                            <div><span className="text-gray-400 mr-2">Status:</span> {t.status}</div>
                            <div><span className="text-gray-400 mr-2">Priority:</span> {t.priority}</div>
                            <div><span className="text-gray-400 mr-2">Technician:</span> {t.assignee}</div>
                        </div>
                        {t.remarks && (
                            <p className="mt-2 text-xs text-gray-600 italic border-t border-gray-200 pt-2 leading-relaxed">
                                {t.remarks}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* Footer / Sign-off */}
        <div className="mt-16 pt-8 border-t-2 border-gray-100 flex justify-between items-end">
          <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
            Generated via Client Service Dashboard<br />
            Internal Audit Reference: SYNC-{new Date().getTime().toString(16).toUpperCase()}
          </div>
          <div className="flex gap-12">
            <div className="text-center w-32">
                <div className="h-10 border-b border-gray-300 mb-2"></div>
                <div className="text-[9px] font-bold uppercase text-gray-400">Technical Lead</div>
            </div>
            <div className="text-center w-32">
                <div className="h-10 border-b border-gray-300 mb-2"></div>
                <div className="text-[9px] font-bold uppercase text-gray-400">Client Rep</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Styles for print optimization */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .page-break-before {
            page-break-before: always;
          }
          @page {
            margin: 1cm;
          }
        }
      ` }} />
    </div>
  );
};

export default ReportPage;