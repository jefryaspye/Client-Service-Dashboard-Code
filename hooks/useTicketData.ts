
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
      // Handle DD/MM/YYYY or MM/DD/YYYY manually if Date.parse fails
      const parts = str.match(/(\d+)/g);
      if (parts && parts.length >= 3) {
        const n1 = parseInt(parts[0]);
        const n2 = parseInt(parts[1]);
        const n3 = parseInt(parts[2]);
        if (n1 > 1000) {
          d = new Date(n1, n2 - 1, n3);
        } else if (n3 > 1000) {
          // Heuristic: if first part > 12, it must be day
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

const DEFAULT_CSV = `ticketIDsSequence,priority,subject,helpdeskTeam,assignedTo,customer,timeSpent,activities,createdOn,lastUpdatedOn,tags,ratingAvgText,kanbanState,stage,iSOClause
"05","Low priority","Change Light at L5 Prod 3","Helpdesk","Ariff Nordin","Wong Yeng Wei","0.00","","08/21/2023 14:15:34","06/05/2025 14:56:00","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"06","Low priority","L7 Pantry Chair Broken","Helpdesk","Wong Yeng Wei","Wong Yeng Wei","0.00","","08/21/2023 14:43:02","06/05/2025 14:56:00","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"07","Low priority","L3 GreenZone Light not working","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Denesbabu Selvakumar","0.00","","08/22/2023 09:28:40","08/24/2023 12:24:29","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"08","Low priority","L7 Prod 1 Light not working","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","08/22/2023 09:37:09","04/22/2025 10:09:49","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"09","Medium priority","L6 Men's toilet hose holder broken","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Nuryasmin Ahmad Jamil","0.00","","08/22/2023 09:40:28","09/21/2023 15:28:50","Incident","No Rating yet","In progress","Closed","ISO 45001 (Clause 8.1.1)"
"2032","Urgent","L5 - Common Area - Power Trip","Helpdesk","Syawal Zainal","Teleperformance Malaysia Sdn. Bhd., Denesbabu Selvakumar","6.50","","07/04/2025 17:50:01","07/07/2025 15:08:23","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"10","Low priority","Light flickering at Lv 3 redzone","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","08/22/2023 16:59:00","04/22/2025 10:09:49","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"11","Low priority","Aircon Lv 5 Unit 03 blinking","Helpdesk","Wong Yeng Wei","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","08/23/2023 22:52:13","04/22/2025 10:09:49","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"12","Low priority","Clear maintenance room Lv 7","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","08/23/2023 22:55:13","04/22/2025 10:09:49","Change Request","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"13","Medium priority","2 chairs at Lv 3 redzone, 1 broken support and 1 broken leg","Helpdesk","Wong Yeng Wei","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","08/24/2023 10:32:43","04/22/2025 10:09:49","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"14","Low priority","L3 & L5 Printer Service for August 2023","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Nuryasmin Ahmad Jamil","0.00","","08/24/2023 11:12:34","08/24/2023 12:18:18","Favor Request","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"15","Low priority","L3 - GreenZone Light Flickering","Helpdesk","Ariff Nordin","Wong Yeng Wei","0.00","","08/25/2023 10:57:34","06/05/2025 14:56:00","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"16","Low priority","Chair back support broken at Lv 5 Prod","Helpdesk","Wong Yeng Wei","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","08/25/2023 13:51:20","04/22/2025 10:09:49","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"17","Low priority","Switch replacement- Level 3 Production","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Nuryasmin Ahmad Jamil","0.00","","08/28/2023 13:53:51","08/28/2023 14:00:28","Change Request","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"19","Low priority","Chair support broken at Lv 3 redzone","Helpdesk","Ariff Nordin","Samantha Lee","0.00","","08/28/2023 13:58:26","08/28/2023 13:58:34","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"22","Low priority","L3 access card wire casing drop out","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","08/28/2023 17:05:24","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"23","Low priority","Light Lv 7 Pantry near Prod entrance","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","08/29/2023 10:51:01","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"24","Low priority","Chair L3 greenzone 1unit- missing 2 screw","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","08/30/2023 10:48:09","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"25","Low priority","2 lock box Installed L3 Green zone","Helpdesk","Ariff Nordin","Samantha Lee","0.00","","08/30/2023 10:54:30","08/30/2023 10:54:30","Change Request","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"26","Low priority","Chair Lv 5 back support broken","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","08/30/2023 11:00:29","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"27","Low priority","L3 - Female Toilet Faucet Issue","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","08/30/2023 15:23:34","04/22/2025 10:09:49","Incident","No Rating yet","In progress","Closed","ISO 45001 (Clause 8.1.1)"
"28","Low priority","Replenish Air Freshener Washroom for all Level","Helpdesk","Wong Yeng Wei","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","08/30/2023 16:09:37","04/22/2025 10:09:49","Change Request","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"29","Medium priority","Venue for Event","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Nuryasmin Ahmad Jamil","0.00","","08/30/2023 16:10:09","08/30/2023 16:17:31","Enquiry","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"30","Low priority","Acc Lv 3 cannot turn on","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","08/30/2023 17:09:07","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"31","Low priority","Power socket at Lv 6 Conference room","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Nuryasmin Ahmad Jamil","0.00","","09/01/2023 21:36:58","09/01/2023 21:36:58","Change Request","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"32","Low priority","Leg chair broken at Lv 3 Redzone","Helpdesk","Ariff Nordin","Samantha Lee","0.00","","09/01/2023 21:41:42","09/01/2023 21:41:42","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"33","Low priority","Door at Red Zone Lv 3 touched the floor","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/01/2023 21:45:45","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"34","Low priority","Aircon at Server Room Lv 6 not on","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/01/2023 21:48:38","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"37","Low priority","Change the tape at the edge of the cubicle","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/04/2023 09:52:06","10/03/2024 13:31:35","Change Request","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"38","Low priority","Drain Pan Installation for All Server Room","Helpdesk","Wong Yeng Wei","KBO Facility Management Services Sdn Bhd","0.00","","09/04/2023 10:00:09","10/03/2024 13:31:35","Change Request","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"39","Low priority","L5 Production 1- Repair Air Conditioner","Helpdesk","Ariff Nordin","","0.00","","09/04/2023 11:56:43","09/05/2023 12:41:58","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"40","Low priority","L7 Production Entrance- Power Switch Installation (Lights)","Helpdesk","Syahmi Azfar","KBO Facility Management Services Sdn Bhd","0.00","","09/04/2023 12:12:43","10/03/2024 13:31:35","Change Request","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"41","Low priority","L3 Production-Switch Lock Box installation","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/04/2023 12:29:33","10/03/2024 13:31:35","Change Request","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"42","Low priority","L5- Deep Clean Carpet","Helpdesk","Syawal Zainal","KBO Facility Management Services Sdn Bhd","0.00","","09/04/2023 12:36:34","10/03/2024 13:31:35","Favor Request","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"43","Low priority","Project- All Flr- Window Locking System","Helpdesk","Syahmi Azfar","Samantha Lee","0.00","","09/04/2023 12:51:20","10/10/2023 07:28:25","Change Request","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"44","Low priority","Project- All Flr- Production & Training Room- Door Support","Helpdesk","Wong Yeng Wei","Samantha Lee","0.00","","09/04/2023 13:13:22","10/09/2023 07:00:03","Favor Request","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"45","Low priority","L7 Pantry-  Chair Leg Loose","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/04/2023 15:46:00","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"46","Low priority","Vendor- L6&L7 Pantry- Floor Profile Loose","Vendor & Purchasing","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/04/2023 15:52:02","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"47","Low priority","L7 Production 1- Chair Repair x1","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/05/2023 09:07:25","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"48","Low priority","L7 Production 1- Light Replacement","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/05/2023 09:15:37","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"49","Low priority","Vendor- L6 - Pool Table Repair","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/05/2023 10:55:06","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"50","Low priority","L3 Main Entrance Door","Helpdesk","KBOFM Support","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","09/05/2023 11:06:13","04/22/2025 10:09:49","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"51","Low priority","Distribute Consumables","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","09/05/2023 14:51:12","04/22/2025 10:09:49","Favor Request","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"53","Low priority","L5 Lift Entrance- Light Bulb Replacement","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/05/2023 18:23:13","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"54","Low priority","L3 Production 3 (Green Zone) - Chair Repair x1","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/06/2023 08:46:35","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"55","Low priority","Lv 3 - 1x Chair missing wheels","Helpdesk","Wong Yeng Wei","KBO Facility Management Services Sdn Bhd","0.00","","09/06/2023 09:51:41","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"56","Medium priority","L5 - Pantry Led half no light","Helpdesk","Syahmi Azfar","KBO Facility Management Services Sdn Bhd","0.00","","09/06/2023 10:04:18","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"57","High priority","Test SLA 2","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/06/2023 11:58:34","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 8.5.1)"
"58","Low priority","BM- L7 Production 2- Entrance Door (Emergency Door Type)","Vendor & Purchasing","KBOFM Support","KBO Facility Management Services Sdn Bhd","0.00","","09/06/2023 12:13:09","10/03/2024 13:31:35","Incident","Okay","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"59","Low priority","L3 Pantry- Drawers Repair","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/06/2023 12:47:59","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"60","Low priority","L6 Men's Toilet-  Toilet Blockages","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","09/06/2023 12:56:14","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","ISO 45001 (Clause 8.1.1)"
"61","Low priority","L5 Men's Toilet- Air Ventilation System","Helpdesk","Syawal Zainal","KBO Facility Management Services Sdn Bhd","0.00","","09/06/2023 16:32:21","10/03/2024 13:31:35","Favor Request","No Rating yet","In progress","Closed","ISO 45001 (Clause 8.1.1)"
"62","Low priority","Lv 5 - Install portable projector screen","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","09/07/2023 17:20:46","04/22/2025 10:09:49","Change Request","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"63","Low priority","Lv 6 - Relocate the portable screen projector","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","09/07/2023 17:23:13","04/22/2025 10:09:49","Change Request","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"64","Low priority","All Lv - Clean server room","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","09/07/2023 17:28:20","02/20/2024 11:13:15","Change Request","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"65","Low priority","L7 Pantry- Faucet Handle Reinstallation","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/08/2023 08:49:28","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"66","Low priority","L6 Conference Room- Door Re-adjustment","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/08/2023 09:00:36","10/03/2024 13:31:35","Preventive Maintenance","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"67","Low priority","L5 Production 1- Chair Repair x1","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/08/2023 09:04:22","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"68","Low priority","L3 Production (GZ)- Chair Repair x1","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","09/08/2023 09:07:34","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"69","Low priority","L3 Production (GZ)- AC 08","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","09/08/2023 12:23:04","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"70","Low priority","L7 Production 1- Dusty","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","09/08/2023 12:28:02","04/22/2025 10:09:49","Favor Request","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"71","Low priority","L6 Main Entrance- Door unable to open","Helpdesk","Wong Yeng Wei","Teleperformance Malaysia Sdn. Bhd.","0.00","","09/08/2023 12:38:04","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"72","Low priority","Lv 5 - 1x Chair broken Leg","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","09/11/2023 13:34:23","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"73","Low priority","L6 & L7 Training Room- Air Ventilation","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd., Denesbabu Selvakumar","0.00","","09/12/2023 15:50:37","09/13/2023 15:09:04","Favor Request","No Rating yet","In progress","Closed","ISO 45001 (Clause 8.1.1)"
"74","Medium priority","L7 - Gym Area Light Not Working","Helpdesk","Wong Yeng Wei","Teleperformance Malaysia Sdn. Bhd., Denesbabu Selvakumar","0.00","","09/12/2023 17:59:12","09/12/2023 18:07:30","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"75","Medium priority","L6 - AC 07 making noise","Helpdesk","Wong Yeng Wei","Teleperformance Malaysia Sdn. Bhd., Denesbabu Selvakumar","0.00","","09/12/2023 18:10:24","09/12/2023 18:30:08","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"76","Medium priority","L3 Production 2- (GZ) Chair Repair x1","Helpdesk","Jefry","KBO Facility Management Services Sdn Bhd","0.00","","09/13/2023 12:44:05","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"77","Medium priority","L6 Production 1- Chair Repair x1","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/13/2023 12:49:46","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"78","Medium priority","L3 Production 1- (GZ) Entrance Door Repair","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/13/2023 13:00:58","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"79","Urgent","Lv 5 Production 3 - Placing Extension Switch","Helpdesk","Ariff Nordin","Ariff Nordin","0.00","","09/13/2023 13:57:40","09/13/2023 17:49:53","Favor Request","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"80","Medium priority","L3 Production 1- (RZ) Light Replacement x1","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/14/2023 08:59:19","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"81","Medium priority","L3 Production 1- (RZ) Chair Repair x2","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/14/2023 09:04:14","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"82","Medium priority","L7 Production 1- Chair Repair x1","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/14/2023 09:08:29","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"83","Medium priority","L7 Pantry- Light Replacement","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/14/2023 09:12:10","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"84","Low priority","Lv 7 Light x1 Gym area","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/14/2023 17:16:52","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"85","Low priority","L6 Locker lock loose x1","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/14/2023 17:26:12","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"86","Medium priority","L6 Cubicle cable casing issue","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/14/2023 17:28:25","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"87","Low priority","L6 Prod 2 Chair missing screw x1","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/14/2023 17:34:54","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"88","Medium priority","L3 Production 1- （RZ）Chair Repair x1","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/15/2023 09:57:03","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"89","High priority","L3 - CCTV App Hang","Helpdesk","Ariff Nordin","","0.00","","09/15/2023 10:36:48","09/15/2023 10:41:19","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 8.5.1)"
"90","Low priority","Test Ticket for New Stage","Helpdesk","Ariff Nordin","Wong Yeng Wei","0.00","","09/15/2023 10:48:19","06/05/2025 14:56:00","Enquiry","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"91","Low priority","Test Ticket for New Stage 2","Helpdesk","Wong Yeng Wei","Ariff Nordin","0.00","","09/15/2023 10:50:24","09/15/2023 10:50:57","Enquiry","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"92","Low priority","Project- L3 Production 1- (RZ) Ceiling Replacement","Helpdesk","Wong Yeng Wei","","0.00","","09/15/2023 13:04:48","10/10/2023 07:28:16","Favor Request","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"94","Low priority","L3 - Window Lock Handle GZ","Helpdesk","Jefry","Teleperformance Malaysia Sdn. Bhd., Ashnils","0.00","","09/15/2023 16:35:24","04/22/2025 10:09:49","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"95","Medium priority","L3 Production 1- (RZ) Chair Repair x3","Helpdesk","Jefry","KBO Facility Management Services Sdn Bhd","0.00","","09/18/2023 09:11:40","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 41001 (Clause 8.1)"
"96","Medium priority","L7 Production 1- AC No. 8 leaking water","Helpdesk","Syawal Zainal","Teleperformance Malaysia Sdn. Bhd.","0.00","","09/18/2023 09:43:40","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"97","Medium priority","L7 Production 1- Centerlize AC not working properly","Helpdesk","Ariff Nordin","Teleperformance Malaysia Sdn. Bhd.","0.00","","09/18/2023 09:58:02","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"98","Medium priority","L7 -  TR1 Unit 001 Aircon Leaking","Helpdesk","Ariff Nordin","KBO Facility Management Services Sdn Bhd","0.00","","09/18/2023 11:33:08","10/03/2024 13:31:35","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"99","Low priority","L3 Light at lobby area faulty","Helpdesk","Jefry","KBO Facility Management Services Sdn Bhd","0.00","","09/18/2023 13:14:58","10/03/2024 13:31:35","","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
"100","Low priority","Lv 7 male washroom 3x light not on.","Helpdesk","Jefry","Teleperformance Malaysia Sdn. Bhd.","0.00","","09/18/2023 13:34:26","02/20/2024 11:13:15","Incident","No Rating yet","In progress","Closed","ISO 9001 (Clause 7.1.3)"
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
      // Specific fix for "Null" values in exports
      if (record.length === 25 && val === '') {
        val = 'Null';
      }
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

            const common = {
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
                tags: ticket.tags
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
