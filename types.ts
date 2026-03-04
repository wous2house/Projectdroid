
export enum TaskStatus {
  TODO = 'Nog te doen',
  IN_PROGRESS = 'In uitvoering',
  ON_HOLD = 'In de wacht',
  WAITING_CLIENT = 'Wacht op klant',
  DONE = 'Voltooid'
}

export enum ProjectStatus {
  PLANNING = 'Planning',
  ACTIVE = 'Actief',
  COMPLETED = 'Afgerond',
  ON_HOLD = 'In de wacht'
}

export interface Customer {
  id: string;
  name: string;
  logo: string;
  email: string;
  phone: string;
  address?: string;
  createdAt: string;
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
  wp_forms: number;
  wp_acf: number;
  wp_code: number;
  wp_jet: number;
  wp_smashballoon_pro: number;
  wp_api_to_posts: number;
  wp_api_to_posts_onetime: number;
  onderhoud_light: number;
  onderhoud_medium: number;
  onderhoud_strong: number;
  apiToPostsOptions?: string[];
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
