
export interface MainTicket {
  id: string;
  no: string;
  item: string;
  ticketNumber: string;
  createdBy: string;
  duration: string;
  assignee: string;
  status: string;
  priority: string;
  team: string;
  ticketAgeHours: string;
  escalation: string;
  remarks: string;
}

export interface CollabTicket {
  id: string;
  no: string;
  item: string;
  ticketNumber: string;
  createdBy: string;
  duration: string;
  collab: string;
  assignee: string;
  status: string;
  priority: string;
  team: string;
  ticketAgeHours: string;
  escalation: string;
  remarks: string;
}

export interface PendingTicket {
  id: string;
  createdOn: string;
  item: string;
  ticketNumber: string;
  createdBy: string;
  duration: string;
  assignee: string;
  status: string;
  priority: string;
  team: string;
  ticketAgeHours: string;
  escalation: string;
  remarks: string;
}

export interface TechTeamMetric {
  id: string;
  name: string;
  open: string;
  inProgress: string;
  onHold: string;
  scheduled: string;
  resolved: string;
  closed: string;
  totalTickets: string;
  totalWorkHours: string;
  avgResolutionTime?: string;
}

export interface UpcomingProject {
  id: string;
  date: string;
  item: string;
  ticketNumber: string;
  duration: string;
  assignee: string;
  status: string;
  team: string;
  ticketAgeHours: string;
  escalation: string;
  deadline: string;
  dueDate: string;
  remarks: string;
}

export interface DailyData {
  date: string;
  mainTickets: MainTicket[];
  collabTickets: CollabTicket[];
  pendingTickets: PendingTicket[];
  techTeamMetrics: TechTeamMetric[];
  upcomingProjects: UpcomingProject[];
}

export interface DailyDataCollection {
  [date: string]: DailyData;
}

export interface HistoricalTicket {
  ticketIDsSequence: string;
  createdOn: string;
  acknowledgeTime: string;
  closeDate: string;
  slaDeadline: string;
  failedSlaPolicy: string;
  subject: string;
  createdBy: string;
  assignedTo: string;
  customer: string;
  location: string;
  contactedVia: string;
  priority: string;
  vendor: string;
  stage: string;
  category: string;
  meSubCat: string;
  furnitureSubCat: string;
  airconSubCat: string;
  electricalSubCat: string;
  toiletAndHygieneSubCat: string;
  buildingRelatedSubCat: string;
  cleanerSubCat: string;
  upsSubCat: string;
  gymItemsSubCat: string;
  gameItemsSubCat: string;
  cardAccessSubCat: string;
  cctvSubCat: string;
  pantryItemsSubCat: string;
  itItemSubCat: string;
  pestControlSubCat: string;
  fireAndSafetySystemSubCat: string;
  powerGeneratorSubCat: string;
  originScheduled: string;
  reschedule: string;
  lastUpdatedOn: string;
  lastUpdatedBy: string;
  helpdeskTeam: string;
  openTimeHours: string;
  timeSpent: string;
  description: string;
  resolutionType: string;
  resolution: string;
  zone: string;
  unit: string;
  furnitureSubChair: string;
  meSubLight: string;
}

export type AnyTicket = MainTicket | CollabTicket | PendingTicket;

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string | null;
  direction: SortDirection;
}
