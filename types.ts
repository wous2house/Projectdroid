
export enum TaskStatus {
  TODO = 'Nog te doen',
  IN_PROGRESS = 'In uitvoering',
  ON_HOLD = 'In de wacht',
  WAITING_CLIENT = 'Wacht op klant',
  DONE = 'Voltooid'
}

export enum ProjectStatus {
  OFFERTE = 'Voorstel',
  GEAKKOORDEERD = 'Geakkoordeerd',
  ON_HOLD = 'On Hold',
  ACTIEF = 'Actief',
  AFGEROND = 'Afgerond'
}

export interface Customer {
  id: string;
  name: string;
  logo: string;
  logoFile?: File | null;
  email: string;
  phone: string;
  address?: string;
  hourlyRate?: number;
  createdAt: string;
  updated?: string;
}

export interface NoteFile {
  id: string;
  name: string;
  url: string;
  fileType: 'pdf' | 'docx' | 'xlsx' | 'image' | 'file';
}

export interface Attachment {
  id: string;
  name: string;
  type: 'file' | 'link' | 'note';
  url: string;
  content?: string;
  files?: NoteFile[];
  fileType?: 'pdf' | 'docx' | 'xlsx' | 'txt' | 'google-doc' | 'google-sheet' | 'web' | 'note' | 'image';
  createdAt: string;
  updated?: string;
}

export interface Subtask {
  id: string;
  name: string;
  isCompleted: boolean;
  assigneeId?: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  assignees: string[];
  status: TaskStatus;
  startDate: string;
  endDate: string;
  scheduledDate?: string;
  estimatedHours?: number;
  notes: string;
  subtasks: Subtask[];
  attachments: Attachment[];
  phaseId: string;
  order?: number;
}

export interface Phase {
  id: string;
  name: string;
  order: number;
}

export interface Invoice {
  id: string;
  amount: number;
  percentage: number;
  type: 'amount' | 'percentage';
  date: string;
  isReceived: boolean;
  description: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  isRecurring: boolean;
}

export interface Prices {
  type_werken_bij_small: number;
  type_werken_bij_medium: number;
  type_werken_bij_large: number;
  type_landing_standaard: number;
  type_landing_premium: number;
  wp_elementor: number;
  wp_elementor_cost: number;
  wp_forms: number;
  wp_forms_cost: number;
  wp_acf: number;
  wp_acf_cost: number;
  wp_code: number;
  wp_code_cost: number;
  wp_jet: number;
  wp_jet_cost: number;
  wp_smashballoon_pro: number;
  wp_smashballoon_pro_cost: number;
  wp_api_to_posts: number;
  wp_api_to_posts_cost: number;
  wp_api_to_posts_onetime: number;
  onderhoud_light: number;
  onderhoud_medium: number;
  onderhoud_strong: number;
  type_add_website: number;
  type_edit_website: number;
  type_fix_website: number;
  hourly_rate: number;
  apiToPostsOptions?: string[];
  dynamicCosts?: string[];
  dynamicPricing?: Record<string, { isDynamic: boolean; isUnlimited: boolean; limit?: number; isAnnual?: boolean }>;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  phases: Phase[];
  tasks: Task[];
  attachments: Attachment[];
  owner: string;
  customerId?: string;
  createdAt: string;
  updated?: string;
  startDate?: string;
  endDate?: string;
  team?: string[];
  totalPrice?: number;
  priceNote?: string;
  invoices?: Invoice[];
  expenses?: Expense[];
  requirements?: string[];
  requirementNotes?: Record<string, string>;
  lockedPrices?: Prices;
  customRecurring?: { id: string; description: string; amount: number }[];
  ignoredRecurring?: string[];
  overriddenRecurring?: Record<string, number>;
  customOneTime?: { id: string; description: string; amount: number }[];
  ignoredOneTime?: string[];
  overriddenOneTime?: Record<string, number>;
  isHourlyRateActive?: boolean;
  hourlyRate?: number;
  trackedSeconds?: number;
  isTimerRunning?: boolean;
  timerStartedAt?: string;
  activeTimerTaskId?: string;
  isTimerBillable?: boolean;
  timeEntries?: TimeEntry[];
}

export interface TimeEntry {
  id: string;
  taskId: string;
  projectId: string;
  userId?: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  isBillable: boolean;
  isInvoiced?: boolean;
}

export interface ActivityDeepLink {
  type: 'task' | 'phase' | 'financieel' | 'notities';
  id: string;
}

export interface Activity {
  id: string;
  type: 'project_created' | 'project_deleted' | 'task_created' | 'task_completed' | 'task_updated' | 'task_moved' | 'budget_updated' | 'note_added' | 'phase_added' | 'task_deleted' | 'customer_created';
  title: string;
  userId: string;
  timestamp: string;
  projectId?: string;
  taskId?: string;
  phaseId?: string;
  projectName?: string;
  details?: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  title?: string;
  email?: string;
  bio?: string;
  role: 'admin' | 'user';
  password?: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'danger' | 'info';
}

export interface AppState {
  projects: Project[];
  customers: Customer[];
  activities: Activity[];
  users: User[];
}
