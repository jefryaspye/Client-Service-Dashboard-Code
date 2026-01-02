
import { useState, useEffect, useCallback } from 'react';
import type { 
  DailyDataCollection, 
  HistoricalTicket, 
  MainTicket, 
  PendingTicket, 
  CollabTicket, 
  PMTicket, 
  AnyTicket,
  TechTeamMetric,
  DailyData
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
    // Attempt to handle YYYY-MM-DD HH:mm:ss directly or standard ISO
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
          // Heuristic: YYYY-MM-DD vs DD/MM/YYYY
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
"08","Low priority","L7 Prod 1 Light not working","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","08/22/2023 09:37:09","04/22/2025 10:09:49","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)","","","","",""
"10","Low priority","Light flickering at Lv 3 redzone","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","08/22/2023 16:59:00","04/22/2025 10:09:49","Incident","No Rating yet","In progress","Closed","","","","","",""
"11","Low priority","Aircon Lv 5 Unit 03 blinking","Helpdesk","Wong Yeng Wei","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","08/23/2023 22:52:13","04/22/2025 10:09:49","Incident","No Rating yet","In progress","Closed","","","","","",""
"12","Low priority","Clear maintenance room Lv 7","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","08/23/2023 22:55:13","04/22/2025 10:09:49","Change Request","No Rating yet","In progress","Closed","","","","","",""
"13","Medium priority","2 chairs at Lv 3 redzone, 1 broken support and 1 broken leg","Helpdesk","Wong Yeng Wei","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","08/24/2023 10:32:43","04/22/2025 10:09:49","Incident","No Rating yet","In progress","Closed","","","","","",""
"14","Low priority","L3 & L5 Printer Service for August 2023","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Nuryasmin Ahmad Jamil","0.00","","08/24/2023 11:12:34","08/24/2023 12:18:18","Favor Request","No Rating yet","In progress","Closed","","","","","",""
"15","Low priority","L3 - GreenZone Light Flickering","Helpdesk","Ariff Nordin","Wong Yeng Wei","0.00","","08/25/2023 10:57:34","06/05/2025 14:56:00","Incident","No Rating yet","In progress","Closed","","","","","",""
"16","Low priority","Chair back support broken at Lv 5 Prod","Helpdesk","Wong Yeng Wei","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","08/25/2023 13:51:20","04/22/2025 10:09:49","Incident","No Rating yet","In progress","Closed","","","","","",""
"17","Low priority","Switch replacement- Level 3 Production","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Nuryasmin Ahmad Jamil","0.00","","08/28/2023 13:53:51","08/28/2023 14:00:28","Change Request","No Rating yet","In progress","Closed","","","","","",""
"19","Low priority","Chair support broken at Lv 3 redzone","Helpdesk","Ariff Nordin","Samantha Lee","0.00","","08/28/2023 13:58:26","08/28/2023 13:58:34","Incident","No Rating yet","In progress","Closed","","","","","",""
"22","Low priority","L3 access card wire casing drop out","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","08/28/2023 17:05:24","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"23","Low priority","Light Lv 7 Pantry near Prod entrance","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","08/29/2023 10:51:01","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","","","","","",""
"24","Low priority","Chair L3 greenzone 1unit- missing 2 screw","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","08/30/2023 10:48:09","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","","","","","",""
"25","Low priority","2 lock box Installed L3 Green zone","Helpdesk","Ariff Nordin","Samantha Lee","0.00","","08/30/2023 10:54:30","08/30/2023 10:54:30","Change Request","No Rating yet","In progress","Closed","","","","","",""
"26","Low priority","Chair Lv 5 back support broken","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","08/30/2023 11:00:29","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","","","","","",""
"27","Low priority","L3 - Female Toilet Faucet Issue","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","08/30/2023 15:23:34","04/22/2025 10:09:49","Incident","No Rating yet","In progress","Closed","","","","","",""
"28","Low priority","Replenish Air Freshener Washroom for all Level","Helpdesk","Wong Yeng Wei","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","08/30/2023 16:09:37","04/22/2025 10:09:49","Change Request","No Rating yet","In progress","Closed","","","","","",""
"29","Medium priority","Venue for Event","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Nuryasmin Ahmad Jamil","0.00","","08/30/2023 16:10:09","08/30/2023 16:17:31","Enquiry","No Rating yet","In progress","Closed","","","","","",""
"30","Low priority","Acc Lv 3 cannot turn on","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","08/30/2023 17:09:07","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","","","","","",""
"31","Low priority","Power socket at Lv 6 Conference room","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Nuryasmin Ahmad Jamil","0.00","","09/01/2023 21:36:58","09/01/2023 21:36:58","Change Request","No Rating yet","In progress","Closed","","","","","",""
"32","Low priority","Leg chair broken at Lv 3 Redzone","Helpdesk","Ariff Nordin","Samantha Lee","0.00","","09/01/2023 21:41:42","09/01/2023 21:41:42","Incident","No Rating yet","In progress","Closed","","","","","",""
"33","Low priority","Door at Red Zone Lv 3 touched the floor","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/01/2023 21:45:45","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"34","Low priority","Aircon at Server Room Lv 6 not on","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/01/2023 21:48:38","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"37","Low priority","Change the tape at the edge of the cubicle","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/04/2023 09:52:06","10/03/2024 13:31:35","Change Request","No Rating yet","In progress","Closed","","","","","",""
"38","Low priority","Drain Pan Installation for All Server Room","Helpdesk","Wong Yeng Wei","KBO Facility Management Services Sdn Bhd","0.00","","09/04/2023 10:00:09","10/03/2024 13:31:35","Change Request","No Rating yet","In progress","Closed","","","","","",""
"39","Low priority","L5 Production 1- Repair Air Conditioner","Helpdesk","Ariff Nordin","","0.00","","09/04/2023 11:56:43","09/05/2023 12:41:58","Incident","No Rating yet","In progress","Closed","","","","","",""
"40","Low priority","L7 Production Entrance- Power Switch Installation (Lights)","Helpdesk","Syahmi Azfar","KBO Facility Management Services Sdn Bhd","0.00","","09/04/2023 12:12:43","10/03/2024 13:31:35","Change Request","No Rating yet","In progress","Closed","","","","","",""
"41","Low priority","L3 Production-Switch Lock Box installation","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/04/2023 12:29:33","10/03/2024 13:31:35","Change Request","No Rating yet","In progress","Closed","","","","","",""
"42","Low priority","L5- Deep Clean Carpet","Helpdesk","Syawal Zainal","KBO Facility Management Services Sdn Bhd","0.00","","09/04/2023 12:36:34","10/03/2024 13:31:35","Favor Request","No Rating yet","In progress","Closed","","","","","",""
"43","Low priority","Project- All Flr- Window Locking System","Helpdesk","Syahmi Azfar","Samantha Lee","0.00","","09/04/2023 12:51:20","10/10/2023 07:28:25","Change Request","No Rating yet","In progress","Closed","","","","","",""
"44","Low priority","Project- All Flr- Production & Training Room- Door Support","Helpdesk","Wong Yeng Wei","Samantha Lee","0.00","","09/04/2023 13:13:22","10/09/2023 07:00:03","Favor Request","No Rating yet","In progress","Closed","","","","","",""
"45","Low priority","L7 Pantry-  Chair Leg Loose","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/04/2023 15:46:00","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"46","Low priority","Vendor- L6&L7 Pantry- Floor Profile Loose","Vendor & Purchasing","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/04/2023 15:52:02","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"47","Low priority","L7 Production 1- Chair Repair x1","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/05/2023 09:07:25","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"48","Low priority","L7 Production 1- Light Replacement","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/05/2023 09:15:37","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"49","Low priority","Vendor- L6 - Pool Table Repair","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/05/2023 10:55:06","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"50","Low priority","L3 Main Entrance Door","Helpdesk","KBOFM Support","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","09/05/2023 11:06:13","04/22/2025 10:09:49","Incident","No Rating yet","In progress","Closed","","","","","",""
"51","Low priority","Distribute Consumables","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","09/05/2023 14:51:12","04/22/2025 10:09:49","Favor Request","No Rating yet","In progress","Closed","","","","","",""
"53","Low priority","L5 Lift Entrance- Light Bulb Replacement","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/05/2023 18:23:13","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"54","Low priority","L3 Production 3 (Green Zone) - Chair Repair x1","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/06/2023 08:46:35","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"55","Low priority","Lv 3 - 1x Chair missing wheels","Helpdesk","Wong Yeng Wei","KBO Facility Management Services Sdn Bhd","0.00","","09/06/2023 09:51:41","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"56","Medium priority","L5 - Pantry Led half no light","Helpdesk","Syahmi Azfar","KBO Facility Management Services Sdn Bhd","0.00","","09/06/2023 10:04:18","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"57","High priority","Test SLA 2","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/06/2023 11:58:34","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"58","Low priority","BM- L7 Production 2- Entrance Door (Emergency Door Type)","Vendor & Purchasing","KBOFM Support","KBO Facility Management Services Sdn Bhd","0.00","","09/06/2023 12:13:09","10/03/2024 13:31:35","Incident","Okay","In progress","Closed","","","","","",""
"59","Low priority","L3 Pantry- Drawers Repair","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/06/2023 12:47:59","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"60","Low priority","L6 Men's Toilet-  Toilet Blockages","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","09/06/2023 12:56:14","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","","","","","",""
"61","Low priority","L5 Men's Toilet- Air Ventilation System","Helpdesk","Syawal Zainal","KBO Facility Management Services Sdn Bhd","0.00","","09/06/2023 16:32:21","10/03/2024 13:31:35","Favor Request","No Rating yet","In progress","Closed","","","","","",""
"62","Low priority","Lv 5 - Install portable projector screen","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","09/07/2023 17:20:46","04/22/2025 10:09:49","Change Request","No Rating yet","In progress","Closed","","","","","",""
"63","Low priority","Lv 6 - Relocate the portable screen projector","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","09/07/2023 17:23:13","04/22/2025 10:09:49","Change Request","No Rating yet","In progress","Closed","","","","","",""
"64","Low priority","All Lv - Clean server room","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","09/07/2023 17:28:20","02/20/2024 11:13:15","Change Request","No Rating yet","In progress","Closed","","","","","",""
"65","Low priority","L7 Pantry- Faucet Handle Reinstallation","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/08/2023 08:49:28","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"66","Low priority","L6 Conference Room- Door Re-adjustment","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/08/2023 09:00:36","10/03/2024 13:31:35","Preventive Maintenance","No Rating yet","In progress","Closed","","","","","",""
"67","Low priority","L5 Production 1- Chair Repair x1","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/08/2023 09:04:22","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"68","Low priority","L3 Production (GZ)- Chair Repair x1","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","09/08/2023 09:07:34","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","","","","","",""
"69","Low priority","L3 Production (GZ)- AC 08","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","09/08/2023 12:23:04","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","","","","","",""
"70","Low priority","L7 Production 1- Dusty","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","09/08/2023 12:28:02","04/22/2025 10:09:49","Favor Request","No Rating yet","In progress","Closed","","","","","",""
"71","Low priority","L6 Main Entrance- Door unable to open","Helpdesk","Wong Yeng Wei","Teleperformance Malaysia Sdn. Bhd.","0.00","","09/08/2023 12:38:04","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","","","","","",""
"72","Low priority","Lv 5 - 1x Chair broken Leg","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","09/11/2023 13:34:23","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","","","","","",""
"73","Low priority","L6 & L7 Training Room- Air Ventilation","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Denesbabu Selvakumar","0.00","","09/12/2023 15:50:37","09/13/2023 15:09:04","Favor Request","No Rating yet","In progress","Closed","","","","","",""
"74","Medium priority","L7 - Gym Area Light Not Working","Helpdesk","Wong Yeng Wei","Teleperformance Malaysia Sdn. Bhd., Denesbabu Selvakumar","0.00","","09/12/2023 17:59:12","09/12/2023 18:07:30","Incident","No Rating yet","In progress","Closed","","","","","",""
"75","Medium priority","L6 - AC 07 making noise","Helpdesk","Wong Yeng Wei","Teleperformance Malaysia Sdn. Bhd., Denesbabu Selvakumar","0.00","","09/12/2023 18:10:24","09/12/2023 18:30:08","Incident","No Rating yet","In progress","Closed","","","","","",""
"76","Medium priority","L3 Production 2- (GZ) Chair Repair x1","Helpdesk","Jefry","KBO Facility Management Services Sdn Bhd","0.00","","09/13/2023 12:44:05","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"77","Medium priority","L6 Production 1- Chair Repair x1","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/13/2023 12:49:46","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"78","Medium priority","L3 Production 1- (GZ) Entrance Door Repair","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/13/2023 13:00:58","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"79","Urgent","Lv 5 Production 3 - Placing Extension Switch","Helpdesk","Ariff Nordin","Ariff Nordin","0.00","","09/13/2023 13:57:40","09/13/2023 17:49:53","Favor Request","No Rating yet","In progress","Closed","","","","","",""
"80","Medium priority","L3 Production 1- (RZ) Light Replacement x1","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/14/2023 08:59:19","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"81","Medium priority","L3 Production 1- (RZ) Chair Repair x2","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/14/2023 09:04:14","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"82","Medium priority","L7 Production 1- Chair Repair x1","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/14/2023 09:08:29","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"83","Medium priority","L7 Pantry- Light Replacement","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/14/2023 09:12:10","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"84","Low priority","Lv 7 Light x1 Gym area","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/14/2023 17:16:52","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"85","Low priority","L6 Locker lock loose x1","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/14/2023 17:26:12","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"86","Medium priority","L6 Cubicle cable casing issue","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/14/2023 17:28:25","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"87","Low priority","L6 Prod 2 Chair missing screw x1","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/14/2023 17:34:54","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","","","","","",""
"2350","Low priority","L7 - Prod 1 - Additional Req Relocate FE","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.50","","11/12/2025 14:12:14","11/12/2025 14:58:02","Change Request","No Rating yet","In progress","Closed","","","","","",""`;

const DATA_STORAGE_KEY = 'app_historical_tickets_v3';

export const useTicketData = () => {
  const [dailyData, setDailyData] = useState<DailyDataCollection | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalTicket[]>([]);
  const [allTickets, setAllTickets] = useState<{ main: MainTicket[], pending: PendingTicket[], collab: CollabTicket[], pm: PMTicket[] }>({ main: [], pending: [], collab: [], pm: [] });
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
      correctiveAction: r.correctiveAction || ''
    }));

    // Grouping by Date
    const collection: DailyDataCollection = {};
    const flatMain: MainTicket[] = [];
    const flatPending: PendingTicket[] = [];
    const flatCollab: CollabTicket[] = [];
    const flatPm: PMTicket[] = [];

    historical.forEach(t => {
      const dateInfo = normalizeDate(t.createdOn);
      if (!dateInfo) return;

      if (!collection[dateInfo.dateKey]) {
        collection[dateInfo.dateKey] = {
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
        zone: '', // Would normally parse from subject if heuristic available
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
        correctiveAction: t.correctiveAction
      };

      const lowerTags = t.tags.toLowerCase();
      const lowerStage = t.stage.toLowerCase();

      const isActive = ['open', 'in progress', 'on hold', 'scheduled'].some(s => lowerStage.includes(s));

      if (isActive) {
        collection[dateInfo.dateKey].pendingTickets.push(baseTicket);
        flatPending.push(baseTicket);
      } else if (lowerTags.includes('preventive maintenance') || lowerTags.includes('pm')) {
        collection[dateInfo.dateKey].pmTickets.push(baseTicket);
        flatPm.push(baseTicket);
      } else if (lowerTags.includes('favor request') || lowerTags.includes('enquiry') || lowerTags.includes('change request')) {
        const collabTkt: CollabTicket = { ...baseTicket, collab: t.customer };
        collection[dateInfo.dateKey].collabTickets.push(collabTkt);
        flatCollab.push(collabTkt);
      } else {
        collection[dateInfo.dateKey].mainTickets.push(baseTicket);
        flatMain.push(baseTicket);
      }
    });

    // Calculate Metrics for each day
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
        m.totalWorkHours = (parseFloat(m.totalWorkHours) + parseFloat(t.duration)).toFixed(2);
        
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
