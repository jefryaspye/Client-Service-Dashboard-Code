
export interface MainTicket {
  id: string;
  no: string;
  item: string;
  ticketNumber: string;
  category: string;
  createdOn: string;
  createdBy: string;
  duration: string;
  assignee: string;
  status: string;
  priority: string;
  team: string;
  ticketAgeHours: string;
  escalation: string;
  remarks: string;
  zone: string;
  unit: string;
  location: string;
  customer: string;
  isoClause: string;
  tags: string;
}

export interface CollabTicket extends MainTicket {
  collab: string;
}

export interface PendingTicket extends MainTicket {}

export interface TechTeamMetric {
  id: string;
  name: string;
  open: number;
  inProgress: number;
  onHold: number;
  scheduled: number;
  resolved: number;
  closed: number;
  totalTickets: number;
  totalWorkHours: string;
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
  priority: string;
  subject: string;
  helpdeskTeam: string;
  assignedTo: string;
  customer: string;
  timeSpent: string;
  activities: string;
  createdOn: string;
  lastUpdatedOn: string;
  tags: string;
  ratingAvgText: string;
  kanbanState: string;
  stage: string;
  category?: string; // Optional field if present in other exports
  isoClause?: string;
  zone?: string;
  unit?: string;
  location?: string;
  createdBy?: string;
  // Added properties to resolve TypeScript errors in Dashboard and TicketDetailModal
  failedSlaPolicy?: string;
  resolution?: string;
}

export type AnyTicket = MainTicket | CollabTicket | PendingTicket;

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string | null;
  direction: SortDirection;
}
