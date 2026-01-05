
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
  // ISO & Risk Enhancement Fields
  riskLikelihood?: number; // 1-5
  riskImpact?: number;     // 1-5
  riskLevel?: number;      // Likelihood * Impact
  hazardCategory?: string;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  objectiveID?: string;
  facilityLocation?: string;
  stakeholderType?: string;
}

export interface CollabTicket extends MainTicket {
  collab: string;
}

export interface PendingTicket extends MainTicket {}

export interface PMTicket extends MainTicket {}

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
  pmTickets: PMTicket[];
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
  category?: string;
  isoClause?: string;
  zone?: string;
  unit?: string;
  location?: string;
  createdBy?: string;
  failedSlaPolicy?: string;
  resolution?: string;
  description?: string;
  // Risk & ISO extensions
  riskLikelihood?: string;
  riskImpact?: string;
  riskLevel?: string;
  hazardCategory?: string;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  objectiveID?: string;
  facilityLocation?: string;
}

export interface ComplianceStandard {
  domain: string;
  standard: string;
  code: string;
  scope: string;
  applicability: string;
}

export interface FmeaRecord {
  id: string;
  systemPart: string;
  failureMode: string;
  potentialEffects: string;
  severity: number; // 1-10
  potentialCauses: string;
  occurrence: number; // 1-10
  currentControls: string;
  detection: number; // 1-10
  rpn: number; // Sev * Occ * Det
  recommendedActions: string;
  responsibility: string;
}

export interface HirarcRecord {
  id: string;
  workActivity: string;
  hazard: string;
  cause: string;
  effect: string;
  likelihood: number; // 1-5
  severity: number;   // 1-5
  riskLevel: number;  // L x S
  riskCategory: 'Low' | 'Medium' | 'High' | 'Extreme';
  controlMeasures: string;
  responsibility: string;
}

export interface CheckSheetItem {
  id: string;
  category: string;
  requirement: string;
  isoClause: string;
  status: 'Pass' | 'Fail' | 'N/A';
  criticality: 'Standard' | 'Critical' | 'Vital';
  remarks: string;
}

export type AnyTicket = MainTicket | CollabTicket | PendingTicket | PMTicket;

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string | null;
  direction: SortDirection;
}

export type ViewType = 'dashboard' | 'database' | 'staging' | 'reports' | 'compliance' | 'operations' | 'fmea' | 'checksheet' | 'hirarc';
