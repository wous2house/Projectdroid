
import { User, ProjectStatus, TaskStatus, Prices } from './types';
export const DEFAULT_PRICES: Prices = {
  type_werken_bij_small: 3000,
  type_werken_bij_medium: 6000,
  type_werken_bij_large: 9000,
  type_landing_standaard: 800,
  type_landing_premium: 1025,
  wp_elementor: 62.50,
  wp_elementor_cost: 62.50,
  wp_forms: 62.50,
  wp_forms_cost: 62.50,
  wp_acf: 32,
  wp_acf_cost: 32,
  wp_code: 63,
  wp_code_cost: 63,
  wp_jet: 70,
  wp_jet_cost: 70,
  wp_smashballoon_pro: 32,
  wp_smashballoon_pro_cost: 32,
  wp_api_to_posts: 110,
  wp_api_to_posts_cost: 110,
  wp_api_to_posts_onetime: 650,
  onderhoud_light: 500,
  onderhoud_medium: 750,
  onderhoud_strong: 975,
  type_add_website: 0,
  type_edit_website: 0,
  type_fix_website: 0,
  hourly_rate: 85,
  apiToPostsOptions: [
    'ForceFlow', 'Ubeeo', 'Recruitee', 'Workday', 'Otys', 'Talent Soft',
    'People XS', 'Visma EasyCruit', 'SAP SuccesFactors', 'Oracle',
    'Digivition', 'Nocore', 'SmartRecruiters', 'Salesforce', 'Emply',
    'AFAS software', 'Recruitnow', 'HR Office'
  ],
  dynamicCosts: [],
  dynamicPricing: {}
};

export const MOCK_USERS: User[] = [
  { id: 'admin1', name: 'Wouter', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&h=200&auto=format&fit=crop', role: 'admin', title: 'Administrator', password: 'admin', email: 'wouter@webdroids.nl' },
  { id: 'u1', name: 'Alex Thompson', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&h=200&auto=format&fit=crop', role: 'user', title: 'Senior Developer', password: 'password123', email: 'alex@example.com' },
  { id: 'u2', name: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&h=200&auto=format&fit=crop', role: 'user', title: 'UX Designer', password: 'password123', email: 'sarah@example.com' },
  { id: 'u3', name: 'Marco Rossi', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&h=200&auto=format&fit=crop', role: 'user', title: 'Backend Lead', password: 'password123', email: 'marco@example.com' },
  { id: 'u4', name: 'Jane Doe', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&h=200&auto=format&fit=crop', role: 'user', title: 'Product Owner', password: 'password123', email: 'jane@example.com' },
];

export const COLORS = {
  PRIMARY: '#3E77E9',
  PRIMARY_HOVER: '#2364E7',
  SECONDARY: '#FFD656',
  SECONDARY_HOVER: '#FFCC33',
  SUCCESS: '#4FC775',
  SUCCESS_HOVER: '#3BBA63',
  WARNING: '#FFAE52',
  WARNING_HOVER: '#FF961F',
  DANGER: '#FF5952',
  DANGER_HOVER: '#FF3A33',
  INFO: '#644CA2',
  INFO_HOVER: '#56418B',
  LIGHT: '#F1F5F9',
  DARK: '#020817',
  TEXT: '#0F172A',
  MUTED: '#64748B',
  HEADINGS: '#3E77E9'
};

export const STATUS_COLORS = {
  [TaskStatus.TODO]: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  [TaskStatus.IN_PROGRESS]: 'bg-primary/20 text-primary border-primary/30 dark:bg-primary/20 dark:text-blue-400 dark:border-primary/40',
  [TaskStatus.ON_HOLD]: 'bg-warning/20 text-warning-hover border-warning/30 dark:bg-warning/20 dark:text-warning dark:border-warning/40',
  [TaskStatus.WAITING_CLIENT]: 'bg-info/20 text-info border-info/30 dark:bg-info/20 dark:text-purple-400 dark:border-info/40',
  [TaskStatus.DONE]: 'bg-success/20 text-success-hover border-success/30 dark:bg-success/20 dark:text-success dark:border-success/40',
};

export const PROJECT_STATUS_COLORS = {
  [ProjectStatus.OFFERTE]: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  [ProjectStatus.GEAKKOORDEERD]: 'bg-info/20 text-info dark:bg-info/30 dark:text-purple-300',
  [ProjectStatus.ACTIEF]: 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-blue-300',
  [ProjectStatus.AFGEROND]: 'bg-success/20 text-success dark:bg-success/30 dark:text-success',
  [ProjectStatus.ON_HOLD]: 'bg-warning/20 text-warning-hover dark:bg-warning/30 dark:text-warning',
};

export const PROJECT_BORDER_COLORS = {
  [ProjectStatus.OFFERTE]: 'border-t-slate-400',
  [ProjectStatus.GEAKKOORDEERD]: 'border-t-info',
  [ProjectStatus.ACTIEF]: 'border-t-primary',
  [ProjectStatus.AFGEROND]: 'border-t-success',
  [ProjectStatus.ON_HOLD]: 'border-t-warning',
};
