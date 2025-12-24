import { useState, useEffect, useCallback } from 'react';
import type { DailyDataCollection, HistoricalTicket, MainTicket, PendingTicket, CollabTicket, PMTicket, AnyTicket } from '../types';

export const normalizeDate = (dateStr: string | number): { dateKey: string; formatted: string; year: number } | null => {
  if (!dateStr) return null;
  
  let d: Date | null = null;
  const str = String(dateStr).trim();
  
  if (/^\d{10,13}$/.test(str)) {
    const ts = parseInt(str);
    d = new Date(ts > 10000000000 ? ts : ts * 1000);
  } else {
    // Attempt to handle YYYY-MM-DD HH:mm:ss directly
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        d = new Date(str.replace(' ', 'T'));
    } else {
        const timestamp = Date.parse(str);
        if (!isNaN(timestamp)) {
            d = new Date(timestamp);
        } else {
            const parts = str.match(/(\d+)/g);
            if (parts && parts.length >= 3) {
                const n1 = parseInt(parts[0]);
                const n2 = parseInt(parts[1]);
                const n3 = parseInt(parts[2]);
                if (n1 > 1000) {
                    d = new Date(n1, n2 - 1, n3);
                } else if (n3 > 1000) {
                    if (n1 > 12) d = new Date(n3, n2 - 1, n1); 
                    else d = new Date(n3, n1 - 1, n2); 
                }
            }
        }
    }
}

  if (!d || isNaN(d.getTime())) return null;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return {
    dateKey: `${y}-${m}-${day}`,
    formatted: `${day}/${m}/${y}`,
    year: y
  };
};

const DEFAULT_CSV = `"Ticket IDs Sequence","Created on","Acknowledge Time","Close date","SLA Deadline","Failed SLA Policy","Subject","Created by","Assigned to","Customer","Location","Contacted Via","Priority","Vendor","Stage","Category","Description","Time Spent","Zone","Unit"
"05","2023-08-21 14:15:34","","2023-08-21 16:35:05","","FALSE","Change Light at L5 Prod 3","Wong Yeng Wei","Ariff Nordin","Wong Yeng Wei"," TP KCP L5","KBOFM Staff","Low priority","","Closed","M&E","Identified 6 down lights not working in L5 new Prod 3. Proceed to change 6 down lights.","2.00","",""
"06","2023-08-21 14:43:02","","2023-08-21 15:22:59","","FALSE","L7 Pantry Chair Broken","Wong Yeng Wei","Wong Yeng Wei","Wong Yeng Wei"," TP KCP L7","WhatsApp","Low priority","","Closed","Furniture","L7 Pantry Chair Broken reported by Security Nabin. Informed Jay to remove the broken chair.","0.00","",""
"07","2023-08-22 09:28:40","","2023-08-22 09:30:16","","FALSE","L3 GreenZone Light not working","Wong Yeng Wei","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Denesbabu Selvakumar","TP KCP L3","WhatsApp","Low priority","","Closed","M&E","Issue reported by Security Dipak. Morning Shift Jefry changed the light.","0.00","",""
"09","2023-08-22 09:40:28","","2023-08-22 11:43:21","","FALSE","L6 Men's toilet hose holder broken","Wong Yeng Wei","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Nuryasmin Ahmad Jamil"," TP KCP L6","KBOFM Staff","Medium priority","","Closed","Toilet & Hygiene","L6 men's toilet hose holder broken. Assigned Ariff on this issue. Changed done.","2.00","",""
"11","2023-08-23 22:52:13","2023-08-24 04:00:00","2023-08-25 13:55:11","","FALSE","Aircon Lv 5 Unit 03 blinking","Ariff Nordin","Wong Yeng Wei","Teleperformance Malaysia Sdn. Bhd., Ashnils"," TP KCP L5","WhatsApp","Low priority","","Closed","Aircon","Security Nabin informed light blinking at L5 AC3 panel. Issue fix after restart AC power.","39.00","",""
"13","2023-08-24 10:32:43","","2023-08-24 16:05:25","","FALSE","2 chairs at Lv 3 redzone broken","Ariff Nordin","Wong Yeng Wei","Teleperformance Malaysia Sdn. Bhd., Ashnils","TP KCP L3","KBOFM Staff","Medium priority","","Closed","Furniture","Ariff found 2 chairs broken in L3 Redzone during floor walk. Repaired both chairs.","5.00","",""
"27","2023-08-30 15:23:34","2023-08-30 11:45:00","2023-08-30 15:35:13","","FALSE","L3 - Female Toilet Faucet Issue","Wong Yeng Wei","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","TP KCP L3","WhatsApp","Low priority","","Closed","Toilet & Hygiene","Female washroom at L3 the faucet is closed but water is still leaking. Jefry tightened.","0.00","",""
"30","2023-08-30 17:09:07","2023-08-29 18:30:00","","","FALSE","Acc Lv 3 cannot turn on","Ariff Nordin","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","TP KCP L3","WhatsApp","Low priority","","Closed","Aircon","Acc unit no 07, 08, and 10 not working. After investigation, the fuse burn. Changed by Syawal.","19465","",""
"38","2023-09-04 10:00:09","2023-09-04 09:00:00","2023-09-11 12:52:04","","FALSE","Drain Pan Installation for All Server Room","Ariff Nordin","Wong Yeng Wei","KBO Facility Management Services Sdn Bhd","TP KCP Multiple Floors","WhatsApp","Low priority","Gain Twin","Closed","Aircon","Installation Drain Pan for all split unit ceiling type at all server room. Monitor by Jefry.","170","",""
"43","2023-09-04 12:51:20","2023-08-17 17:20:00","2023-10-10 07:28:25","","FALSE","Project- All Flr- Window Locking System","KBOFM Support","Syahmi Azfar","Samantha Lee","TP KCP Multiple Floors","Face 2 Face","Low priority","","Closed","Others","Provide a window locking system for safety and to maintain a comfortable temperature.","858","",""
"49","2023-09-05 10:55:06","2023-09-05 09:00:00","2023-10-09 15:08:00","","FALSE","Vendor- L6 - Pool Table Repair","Ariff Nordin","Ariff Nordin","KBO Facility Management Services Sdn Bhd"," TP KCP L6","WhatsApp","Low priority","Other","Closed","Games Items","Security report ball missing for pool. Stuck inside the pool. Already get the ball.","820","",""
"2032","2025-07-04 17:50:01","","2025-07-07 15:08:23","","FALSE","L5 - Common Area - Power Trip","Helpdesk","Syawal Zainal","Teleperformance Malaysia Sdn. Bhd., Denesbabu Selvakumar","TP KCP L5","WhatsApp","Urgent","","Closed","M&E","Power trip due to loop in conference room small fridge.","6.50","",""
"2067","2025-07-18 14:24:50","","","","FALSE","All Levels - Washroom - Tissue Disposal Signage","Ariff Nordin","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","TP KCP Multiple Floors","Email","Low priority","","Closed","Toilet & Hygiene","Request for tissue disposal signage in all toilets.","770","",""
"2178","2025-09-02 13:39:03","","","","FALSE","L7-Pantry-Grease Trap Paip issue","Jefry","Ariff Nordin","KBO Facility Management Services Sdn Bhd"," TP KCP L7","KBOFM Staff","Low priority","Peggy & Eugene","Closed","Pantry Items","Grease Trap issue: water tank full, flow blocked. Replaced pump motor.","148","",""
"2342","2025-11-11 09:26:15","","","","FALSE","L7-Common area Light Faulty","Jefry","Jefry","KBO Facility Management Services Sdn Bhd"," TP KCP L7","KBOFM Staff","Low priority","","Closed","M&E","1 unit reported not working. Replaced GU10 bulb.","6","",""
"2358","2025-11-17 08:52:23","2025-11-17 15:15:00","2025-11-17 17:24:06","","FALSE","lv7- comman area - light faulty","Syawal Zainal","Syawal Zainal","KBO Facility Management Services Sdn Bhd"," TP KCP L7","KBOFM Staff","Low priority","","Closed","M&E","gu10 light faulty. replaced gu10.","8","",""
`;

export const parseCSV = (csv: string): Record<string, string>[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let currentVal = '';
  let inQuotes = false;
  const content = csv.replace(/^\uFEFF/, '');
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    if (inQuotes) {
      if (char === '"' && nextChar === '"') { currentVal += '"'; i++; }
      else if (char === '"') inQuotes = false;
      else currentVal += char;
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ',') { row.push(currentVal.trim()); currentVal = ''; }
      else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        row.push(currentVal.trim());
        if (row.some(c => c)) rows.push([...row]);
        row = []; currentVal = '';
        if (char === '\r') i++;
      } else if (char !== '\r') currentVal += char;
    }
  }
  if (currentVal || row.length > 0) { row.push(currentVal.trim()); rows.push([...row]); }
  if (rows.length < 2) return [];

  const rawHeaders = rows.shift()!;
  const toCamelCase = (s: string) => s.replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '').replace(/^./, (match) => match.toLowerCase());
  const headers = rawHeaders.map(h => toCamelCase(h.trim().replace(/^\uFEFF/, '')));

  return rows.map(record => {
    const entry: Record<string, string> = {};
    headers.forEach((header, index) => { 
      let val = record[index] || '';
      entry[header] = val; 
    });
    return entry;
  });
};

export const jsonToCSV = (json: Record<string, any>[]): string => {
  if (!json || json.length === 0) return '';
  const headers = Object.keys(json[0]);
  return [headers.join(','), ...json.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
};

export const useTicketData = () => {
  const [rawCSV, setRawCSV] = useState(() => localStorage.getItem('app_ticket_data') || DEFAULT_CSV);
  const [dailyData, setDailyData] = useState<DailyDataCollection | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalTicket[]>([]);
  const [allTickets, setAllTickets] = useState<{ main: MainTicket[], pending: PendingTicket[], collab: CollabTicket[], pm: PMTicket[] }>({ main: [], pending: [], collab: [], pm: [] });
  const [lastUpdated, setLastUpdated] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateCSV = useCallback((newCSV: string) => { 
    setRawCSV(newCSV); 
    localStorage.setItem('app_ticket_data', newCSV); 
  }, []);
  
  const resetCSV = useCallback(() => { 
    setRawCSV(DEFAULT_CSV); 
    localStorage.removeItem('app_ticket_data'); 
  }, []);

  const updateTicket = useCallback((ticketNumber: string, assignee: string, updates: Partial<HistoricalTicket>) => {
    const parsed = parseCSV(rawCSV);
    const updated = parsed.map(ticket => {
      if (ticket.ticketIDsSequence === ticketNumber && ticket.assignedTo === assignee) {
        return { ...ticket, ...updates };
      }
      return ticket;
    });
    updateCSV(jsonToCSV(updated));
  }, [rawCSV, updateCSV]);

  const fetchData = useCallback(() => {
    setIsLoading(true);
    try {
        const parsedData = parseCSV(rawCSV) as unknown as HistoricalTicket[];
        setHistoricalData(parsedData);
        const collection: DailyDataCollection = {};
        const gMain: MainTicket[] = [], gPending: PendingTicket[] = [], gCollab: CollabTicket[] = [], gPm: PMTicket[] = [];
        const seenPerDay = new Map<string, Map<string, string>>();

        parsedData.forEach(ticket => {
            const dateInfo = normalizeDate(ticket.createdOn);
            if (!dateInfo) return;
            const { dateKey, formatted } = dateInfo;
            if (!collection[dateKey]) {
                collection[dateKey] = { 
                    date: formatted, 
                    mainTickets: [], 
                    pmTickets: [], 
                    collabTickets: [], 
                    pendingTickets: [], 
                    techTeamMetrics: [], 
                    upcomingProjects: [] 
                };
            }
            
            if (!seenPerDay.has(dateKey)) seenPerDay.set(dateKey, new Map());
            const dayMap = seenPerDay.get(dateKey)!;
            
            const status = (ticket.stage || '').toLowerCase();
            const isPending = ['in progress', 'open', 'on hold', 'scheduled'].includes(status);
            
            const category = (ticket.category || ticket.tags || 'Incident').toLowerCase();
            const isPM = category.includes('pm') || category.includes('preventive') || category.includes('maintenance');

            const likelihood = parseInt(ticket.riskLikelihood || '0');
            const impact = parseInt(ticket.riskImpact || '0');

            const common: MainTicket = {
                id: Math.random().toString(36).substr(2, 9),
                no: ticket.ticketIDsSequence,
                item: ticket.subject,
                ticketNumber: ticket.ticketIDsSequence,
                category: ticket.category || ticket.tags || 'General',
                createdOn: ticket.createdOn, 
                createdBy: ticket.createdBy || 'System',
                duration: ticket.timeSpent || '0',
                assignee: ticket.assignedTo,
                status: ticket.stage,
                priority: ticket.priority,
                team: ticket.helpdeskTeam || 'Helpdesk',
                ticketAgeHours: '0', 
                escalation: (ticket.priority || '').toLowerCase().includes('urgent') ? 'Yes' : 'No',
                remarks: ticket.description || ticket.activities || ticket.resolution || '',
                zone: ticket.zone || '',
                unit: ticket.unit || '',
                location: ticket.location || 'KCP',
                customer: ticket.customer,
                isoClause: ticket.isoClause || 'N/A',
                tags: ticket.tags,
                riskLikelihood: likelihood,
                riskImpact: impact,
                riskLevel: likelihood * impact,
                hazardCategory: ticket.hazardCategory,
                rootCause: ticket.rootCause,
                correctiveAction: ticket.correctiveAction,
                preventiveAction: ticket.preventiveAction,
                objectiveID: ticket.objectiveID,
                facilityLocation: ticket.facilityLocation
            };

            if (!dayMap.has(ticket.ticketIDsSequence)) {
                dayMap.set(ticket.ticketIDsSequence, ticket.assignedTo);
                if (isPM) {
                    collection[dateKey].pmTickets.push(common);
                    gPm.push(common);
                } else if (isPending) { 
                    collection[dateKey].pendingTickets.push(common); 
                    gPending.push(common); 
                } else { 
                    collection[dateKey].mainTickets.push(common); 
                    gMain.push(common); 
                }
            } else if (ticket.assignedTo !== dayMap.get(ticket.ticketIDsSequence)) {
                const ct = { ...common, collab: ticket.assignedTo, assignee: dayMap.get(ticket.ticketIDsSequence)! };
                collection[dateKey].collabTickets.push(ct); 
                gCollab.push(ct);
            }
        });

        // Ensure we sort by date descending
        const sortedCollection: DailyDataCollection = {};
        Object.keys(collection)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .forEach(key => {
                const day = collection[key];
                const metrics: Record<string, any> = {};
                [...day.mainTickets, ...day.pmTickets, ...day.pendingTickets, ...day.collabTickets].forEach(t => {
                    const name = t.assignee || 'Unassigned';
                    if (!metrics[name]) metrics[name] = { id: name, name, open: 0, inProgress: 0, onHold: 0, scheduled: 0, resolved: 0, closed: 0, totalTickets: 0, totalWorkHours: 0 };
                    const m = metrics[name]; m.totalTickets++;
                    const s = t.status.toLowerCase();
                    if (s === 'open') m.open++; 
                    else if (s === 'in progress') m.inProgress++; 
                    else if (s === 'closed' || s === 'resolved') m.closed++;
                    m.totalWorkHours += parseFloat(t.duration || '0');
                });
                day.techTeamMetrics = Object.values(metrics).map(m => ({ ...m, totalWorkHours: m.totalWorkHours.toFixed(2) }));
                sortedCollection[key] = day;
            });

        setDailyData(sortedCollection);
        setAllTickets({ main: gMain, pending: gPending, collab: gCollab, pm: gPm });
        setLastUpdated(new Date().toLocaleString());
    } catch (e: any) { 
        console.error(e);
        setError(e.message); 
    } finally { 
        setIsLoading(false); 
    }
  }, [rawCSV]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { dailyData, historicalData, allTickets, lastUpdated, isLoading, error, refetch: fetchData, rawCSV, updateCSV, resetCSV, updateTicket };
};
