
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

const DEFAULT_CSV = `"ticketIDsSequence","priority","subject","helpdeskTeam","assignedTo","customer","timeSpent","activities","createdOn","lastUpdatedOn","tags","ratingAvgText","kanbanState","stage","iSOClause","riskLikelihood","riskImpact","hazardCategory","rootCause","correctiveAction"
"05","Low priority","Change Light at L5 Prod 3","Helpdesk","Ariff Nordin","Wong Yeng Wei","0.00","","08/21/2023 14:15:34","06/05/2025 14:56:00","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)","1","2","Infrastructure","EOL Bulb","Replacement"
"06","Low priority","L7 Pantry Chair Broken","Helpdesk","Wong Yeng Wei","Wong Yeng Wei","0.00","","08/21/2023 14:43:02","06/05/2025 14:56:00","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)","2","2","Soft Services","Mechanical Fatigue","Asset Repair"
"07","Low priority","L3 GreenZone Light not working","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Denesbabu Selvakumar","0.00","","08/22/2023 09:28:40","08/24/2023 12:24:29","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)","1","2","Infrastructure","Power Inconsistency","Driver Check"
"2032","Urgent","L5 - Common Area - Power Trip","Helpdesk","Syawal Zainal","Teleperformance Malaysia Sdn. Bhd., Denesbabu Selvakumar","6.50","","07/04/2025 17:50:01","07/07/2025 15:08:23","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)","4","5","Critical Systems","Overload on Circuit B","Load Redistribution"
"09","Medium priority","L6 Men's toilet hose holder broken","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Nuryasmin Ahmad Jamil","0.00","","08/22/2023 09:40:28","09/21/2023 15:28:50","Incident","No Rating yet","In progress","Closed","ISO 45001 (Clause 8.1.1)","2","3","HSE","Vandalism/Wear","Hardware Upgrade"
"10","Low priority","Light flickering at Lv 3 redzone","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","08/22/2023 16:59:00","04/22/2025 10:09:49","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)","1","2","Infrastructure","Loose Connection","Wire Tightening"
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

  const updateCSV = useCallback((newCSV: string) => { setRawCSV(newCSV); localStorage.setItem('app_ticket_data', newCSV); }, []);
  const resetCSV = useCallback(() => { setRawCSV(DEFAULT_CSV); localStorage.removeItem('app_ticket_data'); }, []);

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
            if (!collection[dateKey]) collection[dateKey] = { date: formatted, mainTickets: [], pmTickets: [], collabTickets: [], pendingTickets: [], techTeamMetrics: [], upcomingProjects: [] };
            
            if (!seenPerDay.has(dateKey)) seenPerDay.set(dateKey, new Map());
            const dayMap = seenPerDay.get(dateKey)!;
            const isPending = ['In progress', 'Open', 'On Hold', 'Scheduled'].includes(ticket.stage);
            
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
                team: ticket.helpdeskTeam,
                ticketAgeHours: '0', 
                escalation: ticket.priority === 'Urgent' ? 'Yes' : 'No',
                remarks: ticket.activities || '',
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
                collection[dateKey].collabTickets.push(ct); gCollab.push(ct);
            }
        });

        Object.keys(collection).forEach(dk => {
            const day = collection[dk];
            const metrics: Record<string, any> = {};
            [...day.mainTickets, ...day.pmTickets, ...day.pendingTickets, ...day.collabTickets].forEach(t => {
                const name = t.assignee;
                if (!metrics[name]) metrics[name] = { id: name, name, open: 0, inProgress: 0, onHold: 0, scheduled: 0, resolved: 0, closed: 0, totalTickets: 0, totalWorkHours: 0 };
                const m = metrics[name]; m.totalTickets++;
                const s = t.status.toLowerCase();
                if (s === 'open') m.open++; else if (s === 'in progress') m.inProgress++; else if (s === 'closed') m.closed++;
                m.totalWorkHours += parseFloat(t.duration);
            });
            day.techTeamMetrics = Object.values(metrics).map(m => ({ ...m, totalWorkHours: m.totalWorkHours.toFixed(2) }));
        });

        setDailyData(collection);
        setAllTickets({ main: gMain, pending: gPending, collab: gCollab, pm: gPm });
        setLastUpdated(new Date().toLocaleString());
    } catch (e: any) { setError(e.message); }
    finally { setIsLoading(false); }
  }, [rawCSV]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { dailyData, historicalData, allTickets, lastUpdated, isLoading, error, refetch: fetchData, rawCSV, updateCSV, resetCSV, updateTicket };
};
