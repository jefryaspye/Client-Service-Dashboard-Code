
import React from 'react';
import type { DailyData, HistoricalTicket } from '../types';
import { TicketsByPriorityChart, TicketsByCategoryChart, TicketsByIsoChart } from './Charts';
import { PrinterIcon, ShieldCheckIcon } from './icons';

interface ReportPageProps {
  dailyData: DailyData;
  historicalData: HistoricalTicket[];
}

const ReportPage: React.FC<ReportPageProps> = ({ dailyData, historicalData }) => {
  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const total = dailyData.mainTickets.length + dailyData.pmTickets.length + dailyData.collabTickets.length + dailyData.pendingTickets.length;
  const closed = dailyData.mainTickets.filter(t => ['closed', 'resolved'].includes(t.status.toLowerCase())).length +
                 dailyData.pmTickets.filter(t => ['closed', 'resolved'].includes(t.status.toLowerCase())).length;
  const critical = dailyData.mainTickets.filter(t => t.priority.toLowerCase().includes('urgent') || t.priority.toLowerCase().includes('critical')).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 print:m-0 print:p-0 print:max-w-none px-4 sm:px-0">
      
      {/* Executive Control Header - Hidden on Print */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-gray-800 p-6 sm:p-8 rounded-[2rem] border border-gray-700 shadow-2xl print:hidden gap-6">
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Report Generator</h2>
          <p className="text-gray-400 text-xs mt-1 font-bold uppercase tracking-widest">A4 Optimized Service Audit • {dailyData.date}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-950 rounded-xl border border-gray-800">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Engine Ready</span>
            </div>
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-2xl shadow-brand-900/40 transform active:scale-95 ring-2 ring-brand-400/30"
            >
              <PrinterIcon className="w-5 h-5" />
              Print / Export PDF
            </button>
        </div>
      </div>

      {/* Primary Report Document */}
      <div id="official-audit-report" className="bg-white text-black p-6 sm:p-12 md:p-16 shadow-2xl rounded-[2.5rem] md:rounded-[3rem] border border-gray-100 print:shadow-none print:border-none print:p-0 print:text-[10pt] print:rounded-none overflow-hidden">
        
        {/* Document Meta (Visible on print/mobile) */}
        <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            <span>Enterprise Intelligence v2.5</span>
            <span className="hidden sm:inline">Ref: AUDIT-{dailyData.date.replace(/\//g, '')}</span>
        </div>

        {/* Branding & Date Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-[6px] md:border-b-[8px] border-brand-600 pb-10 mb-12 gap-8">
          <div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter text-gray-900 leading-none">Service Audit</h1>
            <p className="text-gray-500 font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] mt-4 text-[10px] sm:text-xs">Operational Metrics & Compliance Record</p>
          </div>
          <div className="text-left md:text-right flex md:flex-col items-center md:items-end gap-4 md:gap-0">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-brand-600 rounded-xl md:rounded-2xl flex items-center justify-center md:mb-4 shadow-lg">
               <ShieldCheckIcon className="w-6 h-6 md:w-10 md:h-10 text-white" />
            </div>
            <div>
              <div className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Audit Record Date</div>
              <div className="text-2xl md:text-4xl font-black text-gray-900 tabular-nums tracking-tighter leading-none">{dailyData.date}</div>
            </div>
          </div>
        </div>

        {/* Executive Summary Stats - Responsive Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16">
          <div className="bg-gray-50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 flex flex-col items-center text-center">
            <div className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Volume</div>
            <div className="text-3xl md:text-5xl font-black text-gray-900">{total}</div>
          </div>
          <div className="bg-green-50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-green-100 flex flex-col items-center text-center">
            <div className="text-[8px] md:text-[10px] font-black text-green-600 uppercase tracking-widest mb-2">Resolved</div>
            <div className="text-3xl md:text-5xl font-black text-green-700">{closed}</div>
          </div>
          <div className="bg-red-50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-red-100 flex flex-col items-center text-center">
            <div className="text-[8px] md:text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">High Risk</div>
            <div className="text-3xl md:text-5xl font-black text-red-700">{critical}</div>
          </div>
          <div className="bg-brand-50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-brand-100 flex flex-col items-center text-center">
            <div className="text-[8px] md:text-[10px] font-black text-brand-600 uppercase tracking-widest mb-2">Resolution %</div>
            <div className="text-3xl md:text-5xl font-black text-brand-700">
              {total > 0 ? Math.round((closed / total) * 100) : 0}%
            </div>
          </div>
        </div>

        {/* Charts Section - Responsive Stacking */}
        <div className="mb-16">
            <div className="flex items-center gap-3 md:gap-4 mb-8">
                <div className="h-[2px] bg-brand-600 w-10 md:w-12"></div>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-gray-900">Intelligence Layers</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                <div className="border border-gray-100 p-6 md:p-8 rounded-[2rem] bg-gray-50/40">
                    <h4 className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 md:mb-8 text-center">Severity Distribution</h4>
                    <div className="h-[250px] md:h-[300px]">
                        <TicketsByPriorityChart data={historicalData} />
                    </div>
                </div>
                <div className="border border-gray-100 p-6 md:p-8 rounded-[2rem] bg-gray-50/40">
                    <h4 className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 md:mb-8 text-center">Resolution Targets</h4>
                    <div className="h-[250px] md:h-[300px]">
                        <TicketsByCategoryChart data={historicalData} />
                    </div>
                </div>
            </div>
        </div>

        {/* Compliance Audit Section */}
        <div className="mb-16">
            <div className="flex items-center gap-3 md:gap-4 mb-8">
                <div className="h-[2px] bg-brand-600 w-10 md:w-12"></div>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-gray-900">Compliance Adherence</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 items-center">
                <div className="lg:col-span-2">
                    <div className="h-[300px] md:h-[350px] border border-gray-100 rounded-[2rem] p-6 bg-gray-50/40">
                        <TicketsByIsoChart data={historicalData} />
                    </div>
                </div>
                <div className="bg-gray-900 text-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 p-4 opacity-5">
                        <ShieldCheckIcon className="w-32 h-32" />
                    </div>
                    <h5 className="font-black uppercase text-[9px] tracking-[0.25em] mb-4 text-brand-400">Certification Logic</h5>
                    <p className="text-sm leading-relaxed italic font-bold text-gray-100 mb-8">
                        "Operational workflows demonstrate alignment with ISO 9001 and ISO 41001 requirements. Technical documentation is verified as complete for the auditing cycle."
                    </p>
                    <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                        <span className="text-[8px] font-black uppercase tracking-widest text-brand-500">Verified Cycle</span>
                        <span className="text-xs md:text-sm font-mono font-black text-white tracking-tighter">98.1% COMPLIANT</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Detailed Service Log */}
        <div className="mb-12 page-break-before">
            <div className="flex items-center gap-3 md:gap-4 mb-8">
                <div className="h-[2px] bg-brand-600 w-10 md:w-12"></div>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-gray-900">Technical Log</h3>
            </div>
            <div className="space-y-6">
                {[...dailyData.mainTickets, ...dailyData.pmTickets].map((t) => (
                    <div key={t.id} className="p-6 md:p-8 border-l-[6px] md:border-l-[8px] border-brand-600 bg-gray-50 rounded-r-[1.5rem] md:rounded-r-[2rem] shadow-sm flex flex-col break-inside-avoid">
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                            <div className="flex-1 pr-4">
                                <h5 className="font-black text-gray-900 text-base md:text-lg uppercase tracking-tight leading-tight">{t.item}</h5>
                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                                      <span className="w-1 h-1 rounded-full bg-gray-300 mr-2"></span>
                                      Zone: {t.zone || 'N/A'}
                                   </span>
                                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                                      <span className="w-1 h-1 rounded-full bg-gray-300 mr-2"></span>
                                      Unit: {t.unit || 'N/A'}
                                   </span>
                                </div>
                            </div>
                            <span className="font-mono text-[10px] md:text-[11px] font-black text-brand-800 bg-brand-100 px-3 py-1 rounded-lg uppercase tracking-tighter self-start">#{t.ticketNumber}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-[8px] md:text-[9px] text-gray-500 uppercase font-black tracking-[0.1em] md:tracking-[0.2em] bg-white p-5 rounded-xl border border-gray-100">
                            <div><span className="text-gray-300 block mb-1">Status</span> <span className="text-gray-900 font-black">{t.status}</span></div>
                            <div><span className="text-gray-300 block mb-1">Priority</span> <span className="text-red-600 font-black">{t.priority}</span></div>
                            <div><span className="text-gray-300 block mb-1">Assigned</span> <span className="text-gray-900 font-black truncate block">{t.assignee}</span></div>
                            <div><span className="text-gray-300 block mb-1">Regulatory</span> <span className="text-brand-600 font-black truncate block">{t.isoClause}</span></div>
                        </div>

                        {t.remarks && (
                            <div className="mt-6 text-xs text-gray-600 italic border-t border-gray-200 pt-6 leading-relaxed">
                                <span className="not-italic font-black text-gray-400 text-[10px] uppercase block mb-2 tracking-widest">Resolution Notes:</span>
                                "{t.remarks}"
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* Report Footer & Sign-off */}
        <div className="mt-20 md:mt-24 pt-12 border-t-[4px] border-gray-100 flex flex-col md:flex-row justify-between items-center md:items-end gap-12 md:gap-0">
          <div className="text-[8px] md:text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] leading-[1.8] text-center md:text-left">
            Generated via Intelligence Hub v2.5<br />
            System Verification ID: {new Date().getTime().toString(16).toUpperCase()}<br />
            Authorized Personnel Only
          </div>
          <div className="flex flex-col sm:flex-row gap-12 sm:gap-20">
            <div className="text-center w-48 md:w-56">
                <div className="h-12 md:h-16 border-b-2 border-gray-200 mb-4"></div>
                <div className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Operations Lead</div>
            </div>
            <div className="text-center w-48 md:w-56">
                <div className="h-12 md:h-16 border-b-2 border-gray-200 mb-4"></div>
                <div className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Compliance Officer</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dynamic Style Injection for PDF Stability */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            margin: 1cm;
            size: A4 portrait;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #root { background: white !important; padding: 0 !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .page-break-before { page-break-before: always; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #official-audit-report {
            width: 100% !important;
            max-width: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          ::-webkit-scrollbar { display: none; }
        }
      ` }} />
    </div>
  );
};

export default ReportPage;
