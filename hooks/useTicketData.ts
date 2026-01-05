
import { useState, useEffect, useCallback } from 'react';
import type { 
  DailyDataCollection, 
  HistoricalTicket, 
  MainTicket, 
  PendingTicket, 
  CollabTicket, 
  PMTicket, 
  TechTeamMetric
} from '../types';

/**
 * Normalizes various date string formats into a standard internal object.
 */
export const normalizeDate = (dateStr: string | number): { dateKey: string; formatted: string; year: number } | null => {
  if (!dateStr) return null;
  
  let d: Date | null = null;
  const str = String(dateStr).trim();
  
  if (/^\d{10,13}$/.test(str)) {
    const ts = parseInt(str);
    d = new Date(ts > 10000000000 ? ts : ts * 1000);
  } else {
    // Handle MM/DD/YYYY HH:mm:ss (common in the provided dataset)
    const mdhMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (mdhMatch) {
      const m = parseInt(mdhMatch[1]);
      const day = parseInt(mdhMatch[2]);
      const y = parseInt(mdhMatch[3]);
      d = new Date(y, m - 1, day);
    } else {
      const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        d = new Date(str.replace(' ', 'T'));
      } else {
        const timestamp = Date.parse(str);
        if (!isNaN(timestamp)) {
          d = new Date(timestamp);
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

/**
 * Robust CSV parser with quote handling.
 */
export const parseCSV = (csv: string): any[] => {
  const lines = csv.split(/\r?\n/);
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));

    if (values.length >= headers.length) {
      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || '';
      });
      results.push(obj);
    }
  }
  return results;
};

/**
 * JSON to CSV converter for persistence.
 */
export const jsonToCSV = (json: any[]): string => {
  if (json.length === 0) return '';
  const headers = Object.keys(json[0]);
  const rows = json.map(obj => 
    headers.map(h => {
      const val = String(obj[h] || '').replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
};

const DEFAULT_CSV = `ticketIDsSequence,priority,subject,helpdeskTeam,assignedTo,customer,timeSpent,activities,createdOn,lastUpdatedOn,tags,ratingAvgText,kanbanState,stage,iSOClause,riskLikelihood,riskImpact,hazardCategory,rootCause,correctiveAction
"05","Low priority","Change Light at L5 Prod 3","Helpdesk","Ariff Nordin","Wong Yeng Wei","0.00","","08/21/2023 14:15:34","06/05/2025 14:56:00","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)","1","2","Infrastructure","EOL Bulb","Replacement"
"06","Low priority","L7 Pantry Chair Broken","Helpdesk","Wong Yeng Wei","Wong Yeng Wei","0.00","","08/21/2023 14:43:02","06/05/2025 14:56:00","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)","2","2","Soft Services","Mechanical Fatigue","Asset Repair"
"07","Low priority","L3 GreenZone Light not working","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Denesbabu Selvakumar","0.00","","08/22/2023 09:28:40","08/24/2023 12:24:29","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)","1","2","Infrastructure","Power Inconsistency","Driver Check"
"2032","Urgent","L5 - Common Area - Power Trip","Helpdesk","Syawal Zainal","Teleperformance Malaysia Sdn. Bhd., Denesbabu Selvakumar","6.50","","07/04/2025 17:50:01","07/07/2025 15:08:23","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)","4","5","Critical Systems","Overload on Circuit B","Load Redistribution"
"09","Medium priority","L6 Men's toilet hose holder broken","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Nuryasmin Ahmad Jamil","0.00","","08/22/2023 09:40:28","09/21/2023 15:28:50","Incident","No Rating yet","In progress","Closed","ISO 45001 (Clause 8.1.1)","2","3","HSE","Vandalism/Wear","Hardware Upgrade"
"2348","Low priority","L7 - Prod 1 - Chair Mech Issue","Helpdesk","Jefry","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.17","","11/12/2025 10:39:00","11/12/2025 15:07:52","Incident","No Rating yet","In progress","Closed","","","","","",""
"2349","Low priority","L7-Prod3-Light too bright","Helpdesk","Jefry","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.53","","11/12/2025 12:12:44","11/12/2025 15:06:44","Favor Request","No Rating yet","In progress","Closed","","","","","",""
"2350","Low priority","L7 - Prod 1 - Additional Req Relocate FE","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.50","","11/12/2025 14:12:14","11/12/2025 14:58:02","Change Request","No Rating yet","In progress","Closed","","","","","",""`;

const DATA_STORAGE_KEY = 'app_historical_tickets_v3';

export const useTicketData = () => {
  const [dailyData, setDailyData] = useState<DailyDataCollection | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalTicket[]>([]);
  const [allTickets, setAllTickets] = useState<{ 
    main: MainTicket[], 
    pending: PendingTicket[], 
    collab: CollabTicket[], 
    pm: PMTicket[] 
  }>({ main: [], pending: [], collab: [], pm: [] });
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawCSV, setRawCSV] = useState<string>(() => localStorage.getItem(DATA_STORAGE_KEY) || DEFAULT_CSV);

  const processRecords = useCallback((records: any[]) => {
    const historical: HistoricalTicket[] = records.map(r => ({
      ticketIDsSequence: r.ticketIDsSequence || '',
      priority: r.priority || 'Low priority',
      subject: r.subject || '',
      helpdeskTeam: r.helpdeskTeam || '',
      assignedTo: r.assignedTo || '',
      customer: r.customer || '',
      timeSpent: r.timeSpent || '0.00',
      activities: r.activities || '',
      createdOn: r.createdOn || '',
      lastUpdatedOn: r.lastUpdatedOn || '',
      tags: r.tags || '',
      ratingAvgText: r.ratingAvgText || '',
      kanbanState: r.kanbanState || '',
      stage: r.stage || '',
      isoClause: r.iSOClause || r.isoClause || 'N/A',
      riskLikelihood: r.riskLikelihood || '',
      riskImpact: r.riskImpact || '',
      hazardCategory: r.hazardCategory || '',
      rootCause: r.rootCause || '',
      correctiveAction: r.correctiveAction || '',
      preventiveAction: r.preventiveAction || ''
    }));

    const collection: DailyDataCollection = {};
    const flatMain: MainTicket[] = [];
    const flatPending: PendingTicket[] = [];
    const flatCollab: CollabTicket[] = [];
    const flatPm: PMTicket[] = [];

    historical.forEach(t => {
      const dateInfo = normalizeDate(t.createdOn);
      if (!dateInfo) return;

      if (!collection[dateInfo.dateKey]) {
        collection[dateKeyToIso(dateInfo.dateKey)] = {
          date: dateInfo.formatted,
          mainTickets: [],
          pmTickets: [],
          collabTickets: [],
          pendingTickets: [],
          techTeamMetrics: [],
          upcomingProjects: []
        } as any;
      }
      
      // Fixing the direct mapping key access for consistency
      const key = dateInfo.dateKey;
      if (!collection[key]) {
         collection[key] = {
            date: dateInfo.formatted,
            mainTickets: [],
            pmTickets: [],
            collabTickets: [],
            pendingTickets: [],
            techTeamMetrics: [],
            upcomingProjects: []
         };
      }

      const baseTicket: MainTicket = {
        id: t.ticketIDsSequence,
        no: t.ticketIDsSequence,
        item: t.subject,
        ticketNumber: t.ticketIDsSequence,
        category: t.hazardCategory || 'General',
        createdOn: t.createdOn,
        createdBy: 'System',
        duration: t.timeSpent,
        assignee: t.assignedTo,
        status: t.stage,
        priority: t.priority,
        team: t.helpdeskTeam,
        ticketAgeHours: '0',
        escalation: 'None',
        remarks: t.activities || t.rootCause || '',
        zone: '', 
        unit: '',
        location: '',
        customer: t.customer,
        isoClause: t.isoClause || 'N/A',
        tags: t.tags,
        riskLikelihood: parseInt(t.riskLikelihood || '0'),
        riskImpact: parseInt(t.riskImpact || '0'),
        riskLevel: (parseInt(t.riskLikelihood || '0') * parseInt(t.riskImpact || '0')) || 0,
        hazardCategory: t.hazardCategory,
        rootCause: t.rootCause,
        correctiveAction: t.correctiveAction,
        preventiveAction: t.preventiveAction
      };

      const lowerTags = t.tags.toLowerCase();
      const lowerStage = t.stage.toLowerCase();

      const isActive = ['open', 'in progress', 'on hold', 'scheduled'].some(s => lowerStage.includes(s));

      if (isActive) {
        collection[key].pendingTickets.push(baseTicket);
        flatPending.push(baseTicket);
      } else if (lowerTags.includes('preventive maintenance') || lowerTags.includes('pm')) {
        collection[key].pmTickets.push(baseTicket);
        flatPm.push(baseTicket);
      } else if (lowerTags.includes('favor request') || lowerTags.includes('enquiry') || lowerTags.includes('change request')) {
        const collabTkt: CollabTicket = { ...baseTicket, collab: t.customer };
        collection[key].collabTickets.push(collabTkt);
        flatCollab.push(collabTkt);
      } else {
        collection[key].mainTickets.push(baseTicket);
        flatMain.push(baseTicket);
      }
    });

    // Tech Team Metrics calculation
    Object.keys(collection).forEach(key => {
      const day = collection[key];
      const allDayTkts = [...day.mainTickets, ...day.pmTickets, ...day.collabTickets, ...day.pendingTickets];
      const techMap: Record<string, TechTeamMetric> = {};

      allDayTkts.forEach(t => {
        const name = t.assignee || 'Unassigned';
        if (!techMap[name]) {
          techMap[name] = {
            id: name, name, open: 0, inProgress: 0, onHold: 0, scheduled: 0, resolved: 0, closed: 0,
            totalTickets: 0, totalWorkHours: '0.00'
          };
        }
        const m = techMap[name];
        m.totalTickets++;
        const hrs = parseFloat(t.duration);
        m.totalWorkHours = (parseFloat(m.totalWorkHours) + (isNaN(hrs) ? 0 : hrs)).toFixed(2);
        
        const s = t.status.toLowerCase();
        if (s.includes('open')) m.open++;
        else if (s.includes('progress')) m.inProgress++;
        else if (s.includes('hold')) m.onHold++;
        else if (s.includes('scheduled')) m.scheduled++;
        else if (s.includes('resolved')) m.resolved++;
        else if (s.includes('closed')) m.closed++;
      });
      day.techTeamMetrics = Object.values(techMap);
    });

    setDailyData(collection);
    setHistoricalData(historical);
    setAllTickets({ main: flatMain, pending: flatPending, collab: flatCollab, pm: flatPm });
    setLastUpdated(new Date().toLocaleString());
    setIsLoading(false);
  }, []);

  const fetchData = useCallback(() => {
    setIsLoading(true);
    try {
      const records = parseCSV(rawCSV);
      processRecords(records);
    } catch (e: any) {
      setError(e.message);
      setIsLoading(false);
    }
  }, [rawCSV, processRecords]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateCSV = (newCSV: string) => {
    setRawCSV(newCSV);
    localStorage.setItem(DATA_STORAGE_KEY, newCSV);
  };

  const resetCSV = () => {
    setRawCSV(DEFAULT_CSV);
    localStorage.removeItem(DATA_STORAGE_KEY);
  };

  const updateTicket = (ticketNumber: string, assignee: string, updates: Partial<HistoricalTicket>) => {
    const records = parseCSV(rawCSV);
    const updated = records.map(r => {
      if (r.ticketIDsSequence === ticketNumber && (r.assignedTo === assignee || !assignee)) {
        return { ...r, ...updates };
      }
      return r;
    });
    updateCSV(jsonToCSV(updated));
  };

  return { 
    dailyData, 
    historicalData, 
    allTickets, 
    lastUpdated, 
    isLoading, 
    error, 
    refetch: fetchData, 
    rawCSV, 
    updateCSV, 
    resetCSV,
    updateTicket
  };
};

function dateKeyToIso(key: string) { return key; }
