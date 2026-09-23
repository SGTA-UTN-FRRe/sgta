export interface ReportFilters {
  fromDate: string;
  toDate: string;
  careerId?: string;
  subjectId?: string;
  tutorId?: string;
  modality?: string;
}

export interface ReportGroup<T = string> {
  key: T;
  label: string;
  count: number;
}

export interface LimitedReportGroups<T> {
  items: T[];
  truncated: boolean;
}

export type ReportSection<T> =
  | { status: "ready"; data: T }
  | { status: "error" }
  | { status: "unavailable"; reason: "NO_OPEN_CYCLE" };

export interface ReportCycleContext {
  id: string;
  name: string;
}

export interface ConsultationDemandReport {
  total: number;
  subjectTotal: number;
  generalTotal: number;
  byCareer: LimitedReportGroups<ReportGroup<string>>;
  bySubject: LimitedReportGroups<ReportGroup<string>>;
  byTutor: LimitedReportGroups<ReportGroup<string>>;
  byModality: LimitedReportGroups<ReportGroup<string | null>>;
  byAcademicStage: LimitedReportGroups<ReportGroup<string | null>>;
  byMonth: ReportGroup<string>[];
}

export interface ActiveTutorReport {
  count: number;
}

export interface SubjectCoverageReport {
  cycleId: string;
  cycleName: string;
  coveredSubjects: number;
  totalSubjects: number;
  coveragePercent: number | null;
}

export interface ScheduleKindReport {
  kind: "DUTY" | "RECOVERY";
  count: number;
  minutes: number;
}

export interface ScheduleTutorReport {
  key: string;
  label: string;
  count: number;
  minutes: number;
}

export interface PlannedScheduleReport {
  totalOccurrences: number;
  totalMinutes: number;
  byKind: ScheduleKindReport[];
  byTutor: LimitedReportGroups<ScheduleTutorReport>;
}

export interface AttendanceReport {
  dueOccurrences: number;
  present: number;
  absent: number;
  pending: number;
  registered: number;
  registrationRatePercent: number | null;
}

export interface CurrentBalanceReport {
  cycleId: string;
  cycleName: string;
  totalTutors: number;
  owes: number;
  current: number;
}

export interface MovementGroup {
  date: string;
  direction: "CREDIT" | "DEBIT";
  categoryId: string;
  category: string;
  count: number;
  minutes: number;
}

export interface MovementReport {
  creditCount: number;
  debitCount: number;
  creditMinutes: number;
  debitMinutes: number;
  netMinutes: number;
  groups: LimitedReportGroups<MovementGroup>;
}

export interface ActivityGroup {
  date: string;
  kind: "MEETING" | "WORKSHOP" | "EXTRAORDINARY" | "RECOVERY";
  count: number;
  minutes: number;
}

export interface ActivityReport {
  totalActivities: number;
  totalMinutes: number;
  groups: ActivityGroup[];
}

export interface OperationalReport {
  filters: ReportFilters;
  currentCycle: ReportSection<ReportCycleContext | null>;
  consultationDemand: ReportSection<ConsultationDemandReport>;
  activeTutors: ReportSection<ActiveTutorReport>;
  subjectCoverage: ReportSection<SubjectCoverageReport>;
  plannedSchedules: ReportSection<PlannedScheduleReport>;
  attendance: ReportSection<AttendanceReport>;
  currentBalances: ReportSection<CurrentBalanceReport>;
  movements: ReportSection<MovementReport>;
  activities: ReportSection<ActivityReport>;
}
