
import { useState, useEffect, useCallback } from 'react';
import type { DailyDataCollection, HistoricalTicket, MainTicket, PendingTicket } from '../types';

const DEFAULT_CSV = `Ticket IDs Sequence,Created on,Acknowledge Time,Close date,SLA Deadline,Failed SLA Policy,Subject,Created by,Assigned to,Customer,Location,Contacted Via,Priority,Vendor,Stage,Category,M&E Sub-Cat,Furniture Sub-Cat,Aircon Sub-Cat,Electrical Sub-Cat,Toilet & Hygiene Sub-Cat,Building Related Sub-Cat,Cleaner Sub-Cat,UPS Sub-Cat,Gym Items Sub-Cat,Game Items Sub-Cat,Card Access Sub-Cat,CCTV Sub-Cat,Pantry Items Sub-Cat,IT Item Sub-Cat,Pest Control Sub-Cat,Fire & Safety System Sub-Cat,Power Generator Sub-Cat,Origin Scheduled,Reschedule,Last Updated on,Last Updated by,Helpdesk Team,Open Time (hours),Time Spent,Description,Resolution Type,Resolution,Zone,Unit,Furniture Sub-Chair,M&E Sub-Light
2032,2025-07-04 17:50:01,2025-07-04 16:45:00,2025-07-07 15:08:23,,FALSE,L5 - Common Area - Power Trip,Ariff Nordin,Syawal Zainal,"Teleperformance Malaysia Sdn. Bhd., Denesbabu Selvakumar", TP KCP L5,WhatsApp,Urgent,,Closed,M&E,Power Trip,,,,,,,,,,,,,,,,,2025-07-04 19:00:00,,2025-07-07 15:08:23,Ariff Nordin,Helpdesk,69,6.50,"<p>
Level 5 - Downtime at Pantry, Support Room, Common Area, Conference Room &amp; IT Room

</p>",Faulty/Aging,"There an issue with the small fridge at the conference room. Testing shows there is a looping that when its on too long, can cause trip on the elcb",Common Area,1,,
2296,2025-10-23 08:36:22,2025-10-23 08:30:00,2025-10-23 17:21:44,,FALSE,L6-MainEntrance-Door,Jefry,Jefry,KBO Facility Management Services Sdn Bhd, TP KCP L6,Security,Medium priority,Glass Copper,Closed,Card Access,,,,,,,,,,,Reader Issue,,,,,,,,,2025-10-23 17:25:16,Ariff Nordin,Helpdesk,8,0.63,"<div data-oe-version=""1.2"" data-last-history-steps="",4234247671800308,409115952974887,4347632242852547,2696436889780003,3757281271280847,3176832136914270,3714268226968361,680143104476031,1759135704992896,1042726518932540,3132894593014282,3973178364863791,1393719632639132,1791946681450691,2529707556719623,2939204022878630,2296594221431289,1462696643371525,79465905430436,2310193214712498,4187432681457648,3157868729267492,2851668231448287,3716996639894052,2708808981104230,144926831672437,3542422102703200,2019003299314106,4396042136437524,1117124117991909,884025577461709,3103264989395651,1706285889508081,126788375181006,1387256079696556,1252081522711377,3067163906859608,3468120261613834,1174037085092394,3117765979726912,1910469969555887,395308143686503,4055793780221404,2736781303504775,2508873444410836,2707710887656785,3940397228317214,552095684920224,623159430496981"">Door&nbsp; close/open issue</div>",Retro-Fix,"Call specilist to futher check :
Root cause N0 connection broken link from controller to autogate link. ",Reception,1,,
2358,2025-11-17 08:52:23,2025-11-17 15:15:00,2025-11-17 17:24:06,,FALSE,lv7- comman area - light faulty,Syawal Zainal,Syawal Zainal,KBO Facility Management Services Sdn Bhd, TP KCP L7,KBOFM Staff,Low priority,,Closed,M&E,Lights,,,,,,,,,,,,,,,,,,,2025-11-17 17:24:06,Ariff Nordin,Helpdesk,8,0.22,"<div data-oe-version=""1.2"" data-last-history-steps="",1788398573379434,1756435650177474,657196922591174,2223965652442930,3982373135887016,734557458027617,977789118675296,927550028768036,51347530908362,4269686262361226,784072340628669,824201573239651,1891306501191597,753711864101599,3949400119000096,4290078113422326,2745664342395665,1019025271892788,3331049565734771,2567662550055460,2289955225672295,1604785759666571,3741724131031625,832548161383503,3439137280602267,3009323594058704"">gu10 light faulty</div>",Faulty/Aging,replace gu10,Common Area,2,,Down Light
2357,2025-11-17 08:49:34,2025-11-17 12:30:00,2025-11-17 17:24:51,,FALSE,lv7- prod 2 - light faulty,Syawal Zainal,Syahmi Azfar,KBO Facility Management Services Sdn Bhd, TP KCP L7,WhatsApp,Low priority,,Closed,M&E,Lights,,,,,,,,,,,,,,,,,,,2025-11-17 17:24:51,Ariff Nordin,Helpdesk,8,0.37,"<div data-oe-version=""1.2"" data-last-history-steps="",1202856863439377,3316481223592079,691372541395349,2568151102556755,888192535985775,3452408209801869,3327451982524104,3297526510604463,1894596204098457,477869763287574,2575753029762584,198916314341946,3438195598071004,855091465990989,530132070117036,3693290157844433"">Light faulty x1</div>",Faulty/Aging,Replace light and fix the fuse,Prod 1,1,,T8 Tube Light
2356,2025-11-14 15:55:05,2025-11-14 15:00:00,2025-11-14 21:37:17,,FALSE,L7 - Prod 1 - Ups Faulty,Ariff Nordin,Jefry,KBO Facility Management Services Sdn Bhd, TP KCP L7,WhatsApp,Low priority,,Closed,UPS,,,,,,,,UPS PC,,,,,,,,,,,,2025-11-14 21:37:17,Ariff Nordin,Helpdesk,5,0.30,"<div data-oe-version=""1.2"" data-last-history-steps="",3493060613690312,2049997966489627,4028570142675786,3718010630796306,460107593811330,1066791471914044,2951498038782271,1715989747962192,1992114127654292,3538282024724077,2246420249020397,471092238666758,272190016701847,3405077897689247"">Ups faulty x1</div>",Faulty/Aging,Replace with good UPS. ,Prod 1,1,,
2355,2025-11-14 15:31:17,2025-11-14 15:00:00,2025-11-17 16:05:56,,FALSE,L7 - Mens Toilet - Urinal Clogging,Ariff Nordin,Ariff Nordin,"Teleperformance Malaysia Sdn. Bhd., Ashnils", TP KCP L7,WhatsApp,Low priority,,Closed,Toilet & Hygiene,,,,,Urinal Bowl,,,,,,,,,,,,,2025-11-14 15:00:00,,2025-11-17 16:05:56,Ariff Nordin,Vendor & Purchasing,72,0.00,"<div data-oe-version=""1.2"" data-last-history-steps="",2853336600933645,619921969555660,4045750435810443,3807260103285943,1399885773411260,2431411113525826,937841433103759,360990074285025,675577261055805,2587870880598075,3193725210384230,4382390112493359,2961187693692397,779570649487836,277276402388229,3439133793838716,4220402442907999,2243538081520490,3246654740334906,2262291637600153,3603739530862263,4102629880666996,152167565050566,4381212975236669,2568837328606408,3047179854224987,4033795087864937,1918418088244750,2819124813039346,3269156478444296,1564442510806812,3609697303213463"">2 urinal place clogging</div>",Faulty/Aging,They replace the urinal part and put some acid for the clogging pipe,Toilet,2,,
2354,2025-11-14 15:14:18,2025-11-14 09:40:00,2025-11-14 15:53:21,,FALSE,L7-Prod 1-Chair issue,Jefry,Jefry,KBO Facility Management Services Sdn Bhd, TP KCP L7,Face 2 Face,Low priority,,Closed,Furniture,,Chair,,,,,,,,,,,,,,,,,,2025-11-14 15:53:21,Ariff Nordin,Helpdesk,0,0.23,"<div data-oe-version=""1.2"" data-last-history-steps="",2207983713281669,1758695789819236,500555077447212,3007015269459014,3438080562318187,766791569923821,3250447850837805,1725067519178257,2427776067531369,3361722087971116,4145120648698850,2123880211043430,3998238978635473,3215128860807524,2459782460660797,3647901989954837,1225534560540549,1650460283134308,52727758520246,815245697166237,4052340724084195,3271261006309749,675583041842319,3821209941191268,1291630846513883,3946991428062186,3468583602726120,3242328586655921,411071005798389,584117460988719"">Reported 1 unit has issue</div>",Retro-Fix,Replace missing screw,Prod 1,1,Screw,
2353,2025-11-14 10:16:23,2025-11-14 10:05:00,2025-11-14 15:24:55,,FALSE,L5-Lift Lobby-Light dim,Jefry,Jefry,KBO Facility Management Services Sdn Bhd, TP KCP L5,Face 2 Face,Low priority,,Closed,M&E,Lights,,,,,,,,,,,,,,,,,,,2025-11-14 15:24:55,Ariff Nordin,Helpdesk,5,0.13,"<div data-oe-version=""1.2"" data-last-history-steps="",892872663555990,2140044663967497,691736824764104,1942255289396546,2811268073200691,1744109216845974,2783934120907524,1795618777419663,2699125693375911,3769871123270791,109835888835572,1083014083731940,663737866477908,663084023713201,2292815951030825,4494951359246723,312949797525559,3389986109871074,296310736808113,1482407165612956"">1 unit dim is found</div>",Favor Request,Check and replacing part wear and tear condition. ,Lift Lobby,1,,Down Light
1385,2024-10-17 15:21:28,2024-10-17 15:00:00,2024-10-18 09:15:19,,FALSE,L5 - Power Trip Issue,Ariff Nordin,Syawal Zainal,KBO Facility Management Services Sdn Bhd, TP KCP L5,Security,Urgent,,Closed,M&E,Power Trip,,,,,,,,,,,,,,,,,,,2024-10-18 09:15:19,Wong Yeng Wei,Helpdesk,17,0.93,"<p>Power trip issue</p>",Faulty/Aging,"replace to new elcb because old elcb very sensitive
to small leakage.
- replace new elcb 63a 300ma sensitivity
- check amp and volt all normal
- will monitor time by time
",All Area,1,,
1324,2024-10-01 14:55:03,2024-10-01 14:00:00,2025-10-17 12:15:36,2024-10-01 18:55:03,TRUE,L3-RZ-Power trip and FAP triggered,Jefry,Jefry,Teleperformance Malaysia Sdn. Bhd.,TP KCP L3,Call,Urgent,,Closed,M&E,Power Trip,,,,,,,,,,,,,,,,,,,2025-10-17 12:15:36,Jefry,Helpdesk,9141,0.10,"<p>Red zone FAP and UPS trip alarm triggered</p>",False Alarm,"FAP and Redzone having power trip 
1. Attend to locations asap to reduce downtime as the UPS only extend to 15min top.
2. Check DB and uplift ELCB trip.
3. Monitor and wait to check trip frequency if no -update ticket.
4. Have competent person to check on device health.",RedZone,2,,
1000,2024-07-09 17:51:44,2024-07-09 16:30:00,2024-07-11 00:53:50,,FALSE,L3-Server room door access power down,Jefry,Jefry,KBO Facility Management Services Sdn Bhd,TP KCP L3,KBOFM Staff,Urgent,,Closed,Card Access,,,,,,,,,,,Reader Issue,,,,,,,,,2024-10-03 13:31:35,Wong Yeng Wei,Helpdesk,31,0.00,"<p>Received call from team that server door down</p><p><br></p>",Favor Request,"inspection on unit controller
inspection power supply cable
only 2 possibility in case of power loss to reader
rectify issue on power cable 1st then move to controller unit.",Server Room,1,,
1340,2024-10-03 14:05:49,2024-10-03 14:00:00,2024-10-05 01:26:14,,FALSE,L7 - Support Room - Light Switch ,Wong Yeng Wei,Syawal Zainal,KBO Facility Management Services Sdn Bhd, TP KCP L7,WhatsApp,High priority,,Closed,M&E,Power Point,,,,,,,,,,,,,,,,,,,2024-10-05 01:26:14,OdooBot,Helpdesk,35,0.97,"<p>L7 - Support Room - Light Switch spoiled &gt; Can't turn ON.</p>",Faulty/Aging,"old lamp switch have sparking sound because mechanical in switch loose.
- already change to new switch ",Support Room,1,,
1092,2024-08-08 10:43:40,,2024-08-08 13:29:24,,FALSE,lv3 toilet angle valve leaking,Syawal Zainal,Syawal Zainal,KBO Facility Management Services Sdn Bhd,TP KCP L3,KBOFM Staff,High priority,,Closed,Toilet & Hygiene,,,,,Toilet Pipe,,,,,,,,,,,,,,,2024-10-03 13:31:35,Wong Yeng Wei,Helpdesk,2,0.37,"<p>woman toilet angle valve leaking</p>",Faulty/Aging,close main supply and change angle valve,Toilet,1,,
326,2023-11-18 20:34:52,,2023-11-18 20:42:18,,FALSE,L6 Prod 1 - Power down,Ariff Nordin,Syawal Zainal,"Teleperformance Malaysia Sdn. Bhd., Denesbabu Selvakumar", TP KCP L6,WhatsApp,Urgent,,Closed,M&E,Power Trip,,,,,,,,,,,,,,,,,,,2023-11-19 16:05:40,Ariff Nordin,Helpdesk,0,0.00,"<p>Reported by IT Arasu</p><p style=""margin-bottom: 0px;""><br></p><p style=""margin-bottom: 0px;""><br></p>",,,,0,,
79,2023-09-13 13:57:40,2023-09-13 13:05:00,2023-09-13 17:49:53,,FALSE,Lv 5 Production 3 - Placing Extension Switch ,KBOFM Support,Ariff Nordin,Ariff Nordin, TP KCP L5,KBOFM Staff,Urgent,,Closed,Electrical,Others,,,,,,,,,,,,,,,,,,,2023-09-13 17:49:53,Wong Yeng Wei,Helpdesk,3,0.00,"<p>
<span style=""color: rgb(55, 65, 81); font-size: 16px; font-style: normal; font-weight: 400;"" class=""bg-white"">Client has requested an extension switch for use with the projector.</span></p><p>PIC： Jefry, Completed today 13.40 pm.&nbsp;<br></p>",,,,0,,
385,2023-12-15 10:30:27,,2023-12-18 07:03:18,,TRUE,L5- Production 1&2- Chair Repair x3,KBOFM Support,Syahmi Azfar,KBO Facility Management Services Sdn Bhd, TP KCP L5,KBOFM Staff,High priority,,Closed,Furniture,,Chair,,,,,,,,,,,,,,,,,,2024-10-03 13:31:35,Wong Yeng Wei,Helpdesk,68,0.00,"<p>x3 Chair Broken Back with blue stickers.</p>",Faulty/Aging,Done changing all damage part,,0,,
319,2023-11-13 08:50:37,,2023-12-13 10:03:50,,FALSE,BM- L6 Production 2- Window Crack x1,KBOFM Support,Jefry,"Teleperformance Malaysia Sdn. Bhd., Ashnils", TP KCP L6,,High priority,Building Management,Closed,Building Related,,,,,,Window,,,,,,,,,,,,2023-12-09 10:00:00,2023-12-09 12:00:00,2025-04-22 10:09:49,Ariff Nordin,Vendor & Purchasing,721,0.00,"<p>Security reported x1 window crack.&nbsp;</p><p>Pls refer log note.</p>",Faulty/Aging,Window replaced ,,0,,
310,2023-11-09 16:55:52,,2023-11-10 22:44:30,,FALSE,Block D - B1 Water Pump Issue,Ariff Nordin,Syawal Zainal,KBO Facility Management Services Sdn Bhd,TP KCP Multiple Floors,WhatsApp,High priority,Building Management,Closed,Others,,,,,,,,,,,,,,,,,,,,2024-10-03 13:31:35,Wong Yeng Wei,Vendor & Purchasing,29,0.00,"<p>Issue with water pump not functioning&nbsp;</p>",,,,0,,
303,2023-11-07 20:40:20,2023-11-07 15:25:00,2023-12-01 09:15:07,,FALSE,BM - Lift 1 Stuck,Wong Yeng Wei,Ariff Nordin,"Teleperformance Malaysia Sdn. Bhd., Ashnils",TP KCP Multiple Floors,WhatsApp,High priority,Building Management,Closed,Others,,,,,,,,,,,,,,,,,,,,2025-04-22 10:09:49,Ariff Nordin,Vendor & Purchasing,564,0.00,"<p>TP HR Su Yee reported via WhatsApp that an agent got stuck in the lift.</p>",,,,0,,
263,2023-10-25 19:34:59,2023-10-25 18:45:00,2023-10-25 20:00:44,,FALSE,TP - Power Disruption ,Wong Yeng Wei,Syawal Zainal,"Teleperformance Malaysia Sdn. Bhd., Denesbabu Selvakumar",TP KCP Multiple Floors,WhatsApp,High priority,,Closed,M&E,Power Trip,,,,,,,,,,,,,,,,,,,2023-10-25 20:00:44,Wong Yeng Wei,Helpdesk,0,0.00,"<p>Power Trip at TP all floors for split second.<br>Affected all blocks at KCP</p><p>Assisted with Jefry</p>",Retro-Fix,"checked db>ok
ac>ok
server room>ok
cubcle prod and training room all level>ok
no issue at tp side suspected tnb surge just few second",,0,,
`;

const parseCSV = (csv: string): Record<string, string>[] => {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const headerLine = lines.shift()!.trim().replace(/\r$/, '');
  const headersRaw = headerLine.replace(/^\uFEFF/, '').split(','); 
  
  const toCamelCase = (s: string) => s.replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '').replace(/^./, (match) => match.toLowerCase());
  
  const headers = headersRaw.map(h => toCamelCase(h.trim()));

  const data: Record<string, string>[] = [];

  for (const line of lines) {
      const trimmedLine = line.trim().replace(/\r$/, '');
      if (!trimmedLine) continue;

      const values: string[] = [];
      let currentVal = '';
      let inQuotes = false;
      
      for (let j = 0; j < trimmedLine.length; j++) {
          const char = trimmedLine[j];
          
          if (char === '"') {
              if (inQuotes && trimmedLine[j+1] === '"') { 
                  currentVal += '"';
                  j++;
              } else {
                  inQuotes = !inQuotes;
              }
          } else if (char === ',' && !inQuotes) {
              values.push(currentVal.trim());
              currentVal = '';
          } else {
              currentVal += char;
          }
      }
      values.push(currentVal.trim());

      if (values.length === headers.length) {
        const entry: Record<string, string> = {};
        headers.forEach((header, index) => {
            entry[header] = values[index];
        });
        data.push(entry);
      }
  }
  return data;
};

export const useTicketData = () => {
  const [rawCSV, setRawCSV] = useState(() => {
    return localStorage.getItem('app_ticket_data') || DEFAULT_CSV;
  });
  
  const [dailyData, setDailyData] = useState<DailyDataCollection | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalTicket[]>([]);
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

  const fetchData = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
        const parsedData = parseCSV(rawCSV);
        const typedHistoricalData = parsedData as unknown as HistoricalTicket[];
        setHistoricalData(typedHistoricalData);

        const dailyDataCollection: DailyDataCollection = {};

        for (const ticket of typedHistoricalData) {
            if (!ticket.createdOn) continue;

            const datePart = ticket.createdOn.split(' ')[0];
            const [year, month, day] = datePart.split('-');
            
            if(!year || !month || !day || year.length !== 4) continue;

            const dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            const formattedDate = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;

            if (!dailyDataCollection[dateKey]) {
                dailyDataCollection[dateKey] = {
                    date: formattedDate,
                    mainTickets: [],
                    collabTickets: [],
                    pendingTickets: [],
                    techTeamMetrics: [],
                    upcomingProjects: []
                };
            }
            
            const isPending = ['On Hold', 'Open', 'In Progress', 'Scheduled'].includes(ticket.stage || '');
            
            // Fix: property is ticketIDsSequence not ticketIdsSequence due to camelCase logic on "Ticket IDs Sequence"
            const commonTicketData = {
                id: ticket.ticketIDsSequence || '',
                no: ticket.ticketIDsSequence || '', 
                item: ticket.subject || '',
                ticketNumber: ticket.ticketIDsSequence || '',
                createdBy: ticket.createdBy || '',
                duration: ticket.timeSpent || '0',
                assignee: ticket.assignedTo || '',
                status: ticket.stage || '',
                priority: ticket.priority || '',
                team: ticket.helpdeskTeam || '',
                ticketAgeHours: ticket.openTimeHours || '0',
                escalation: (ticket.failedSlaPolicy || '').toUpperCase() === 'TRUE' ? 'Yes' : 'No',
                remarks: ticket.resolution || '',
            };

            if (isPending) {
                dailyDataCollection[dateKey].pendingTickets.push({
                    ...commonTicketData,
                    createdOn: ticket.createdOn.split(' ')[0],
                });
            } else {
                dailyDataCollection[dateKey].mainTickets.push(commonTicketData as MainTicket);
            }
        }
        
        for (const dateKey in dailyDataCollection) {
            const dayData = dailyDataCollection[dateKey];
            const allTicketsForDay: (MainTicket | PendingTicket)[] = [...dayData.mainTickets, ...dayData.pendingTickets];
            const metrics: Record<string, any> = {};

            for (const ticket of allTicketsForDay) {
                if (!ticket.assignee || ticket.assignee.trim() === '') continue;

                if (!metrics[ticket.assignee]) {
                    metrics[ticket.assignee] = {
                        id: ticket.assignee,
                        name: ticket.assignee,
                        open: 0,
                        inProgress: 0,
                        onHold: 0,
                        scheduled: 0,
                        resolved: 0,
                        closed: 0,
                        totalTickets: 0,
                        totalWorkHours: 0,
                    };
                }
                
                const metric = metrics[ticket.assignee];
                metric.totalTickets++;
                const status = (ticket.status || '').toLowerCase();

                if (status.includes('open')) metric.open++;
                else if (status.includes('in progress')) metric.inProgress++;
                else if (status.includes('on hold')) metric.onHold++;
                else if (status.includes('scheduled')) metric.scheduled++;
                else if (status.includes('resolved')) metric.resolved++;
                else if (status.includes('closed')) metric.closed++;
                
                const duration = parseFloat(ticket.duration);
                if (!isNaN(duration)) {
                    metric.totalWorkHours += duration;
                }
            }
            
            dayData.techTeamMetrics = Object.values(metrics).map(m => ({
                ...m,
                totalWorkHours: m.totalWorkHours > 0 ? m.totalWorkHours.toFixed(2) : '0'
            }));
        }

        setDailyData(dailyDataCollection);
    } catch (e: any) {
        setError(`Failed to process data: ${e.message}`);
    } finally {
        setIsLoading(false);
    }
  }, [rawCSV]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { dailyData, historicalData, isLoading, error, refetch: fetchData, rawCSV, updateCSV, resetCSV };
};
