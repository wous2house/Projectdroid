
import React, { useState, useMemo, useEffect } from 'react';
import { Project, ProjectStatus, TaskStatus, Activity, Customer, User as UserType, ActivityDeepLink, Prices } from '../types';
import { Plus, Trash2, X, Search, Filter, User, Clock, History, Layout, CheckCircle, Wallet, StickyNote, Layers, AlertCircle } from 'lucide-react';
import { PROJECT_STATUS_COLORS, PROJECT_BORDER_COLORS } from '../constants';
import { formatDistanceToNow, format } from 'date-fns';
import { nl } from 'date-fns/locale';
import ProjectModal from './ProjectModal';

interface DashboardProps {
  projects: Project[];
  customers: Customer[];
  activities: Activity[];
  users: UserType[];
  prices: Prices;
  onCreateProject: (project: Omit<Project, 'id' | 'createdAt'>) => void;
  onDeleteProject: (id: string) => void;
  onSelectProject: (id: string, deepLink?: ActivityDeepLink) => void;
  isCreateModalForcedOpen?: boolean;
  onCloseForcedModal?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, customers, activities, users, prices, onCreateProject, onDeleteProject, onSelectProject, isCreateModalForcedOpen, onCloseForcedModal }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCustomer, setFilterCustomer] = useState<string>('all');
  
  useEffect(() => {
    if (isCreateModalForcedOpen) setShowCreateModal(true);
  }, [isCreateModalForcedOpen]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCustomer = filterCustomer === 'all' || p.customerId === filterCustomer;
      return matchesSearch && matchesCustomer;
    });
  }, [projects, searchQuery, filterCustomer]);

  const handleCreate = (projectData: Omit<Project, 'id' | 'createdAt'> | Project) => {
    onCreateProject(projectData as any);
    setShowCreateModal(false);
    onCloseForcedModal?.();
  };

  const handleActivityClick = (activity: Activity) => {
    if (activity.projectId && projects.find(p => p.id === activity.projectId)) {
      let deepLink: ActivityDeepLink | undefined;
      
      if (activity.taskId) {
        deepLink = { type: 'task', id: activity.taskId };
      } else if (activity.phaseId || activity.type === 'phase_added') {
        deepLink = { type: 'phase', id: activity.phaseId || '' };
      } else if (activity.type === 'budget_updated') {
        deepLink = { type: 'financieel', id: '' };
      } else if (activity.type === 'note_added') {
        deepLink = { type: 'notities', id: '' };
      }

      onSelectProject(activity.projectId, deepLink);
    }
  };

  return (
    <div className="space-y-10 md:space-y-14 animate-in fade-in duration-700">
      {/* Search & Filter Container */}
      <div className="flex flex-col md:flex-row gap-5 items-center">
        <div className="relative flex-grow w-full group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted opacity-60 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" />
          <input 
            type="text"
            placeholder="Zoek projecten..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl md:rounded-3xl pl-16 pr-8 py-4 md:py-5 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all font-bold text-sm md:text-base shadow-sm dark:text-white"
          />
        </div>
        <div className="relative w-full md:w-80 group">
          <Filter className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted opacity-60 group-focus-within:text-primary transition-all" />
          <select 
            value={filterCustomer}
            onChange={e => setFilterCustomer(e.target.value)}
            className="w-full bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl md:rounded-3xl pl-16 pr-10 py-4 md:py-5 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all font-bold text-sm md:text-base shadow-sm appearance-none cursor-pointer dark:text-white"
          >
            <option value="all">Alle Klanten</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 md:gap-12">
        <div className="xl:col-span-9 space-y-9 md:space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="group relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-primary/30 dark:border-white/20 rounded-[40px] bg-primary/[0.04] dark:bg-white/[0.03] hover:bg-white dark:hover:bg-dark-card hover:border-primary transition-all min-h-[300px] shadow-sm hover:shadow-xl"
            >
              <div className="p-6 bg-primary/10 rounded-full mb-6 group-hover:bg-primary group-hover:scale-110 transition-all">
                <Plus className="w-8 h-8 text-primary group-hover:text-white" />
              </div>
              <h3 className="text-xl font-black text-text-main dark:text-white">Nieuw Project</h3>
              <p className="text-sm text-text-muted dark:text-slate-400 mt-2 font-subtitle">Start een nieuwe workflow</p>
            </button>

            {filteredProjects.map((project) => {
              const customer = customers.find(c => c.id === project.customerId);
              const progress = Math.round((project.tasks.filter(t => t.status === TaskStatus.DONE).length / (project.tasks.length || 1)) * 100);
              return (
                <div 
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className={`group bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 ${PROJECT_BORDER_COLORS[project.status]} border-t-4 rounded-[40px] p-8 flex flex-col cursor-pointer hover:-translate-y-2 hover:shadow-card-hover transition-all shadow-sm`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <span className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider ${PROJECT_STATUS_COLORS[project.status]}`}>
                      {project.status}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }} className="text-danger/40 hover:text-danger p-2 transition-colors hover:bg-danger/5 rounded-lg"><Trash2 className="w-5 h-5" /></button>
                  </div>

                  <h3 className="text-xl font-black mb-3 text-text-main dark:text-white group-hover:text-primary transition-colors leading-tight">{project.name}</h3>
                  
                  <div className="flex items-center space-x-3 mb-6">
                    {customer ? (
                      <div className="flex items-center space-x-2 bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-white/5">
                        <div className="w-5 h-5 rounded-md overflow-hidden bg-white flex items-center justify-center">
                          <img 
                            src={customer.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${customer.name}`} 
                            className="w-full h-full object-cover bg-white" 
                            alt={customer.name}
                          />
                        </div>
                        <span className="text-xs font-bold text-text-muted dark:text-slate-300 truncate">{customer.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 px-3 py-1.5 opacity-60">
                        <User className="w-4 h-4 text-text-muted" />
                        <span className="text-xs font-bold text-text-muted">Geen Klant</span>
                      </div>
                    )}
                  </div>

                  <div className="flex -space-x-3 mb-8">
                    {(project.team || []).slice(0, 4).map(uId => (
                      <img 
                        key={uId} 
                        src={users.find(u => u.id === uId)?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uId}`} 
                        className="w-9 h-9 rounded-xl border-2 border-white dark:border-dark-card shadow-sm object-cover bg-white" 
                        alt="Teamlid"
                      />
                    ))}
                    {(project.team?.length || 0) > 4 && (
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-dark-card flex items-center justify-center text-xs font-black text-text-muted dark:text-slate-400">
                        +{(project.team?.length || 0) - 4}
                      </div>
                    )}
                  </div>

                  <p className="text-text-muted dark:text-slate-400 text-sm line-clamp-2 mb-8 font-medium italic opacity-80 leading-relaxed">{project.description || 'Geen beschrijving'}</p>

                  <div className="mt-auto pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
                    <div className="flex items-center justify-between text-xs font-black text-text-muted dark:text-slate-300 uppercase tracking-widest">
                      <span>{project.tasks.length} taken</span>
                      <span className={progress === 100 ? 'text-success' : 'text-primary'}>{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-200/50 dark:border-white/5">
                      <div className={`h-full transition-all duration-1000 shadow-sm ${progress === 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar / Activities */}
        <div className="xl:col-span-3">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-[40px] p-8 space-y-8 shadow-sm sticky top-28">
            <h3 className="flex items-center space-x-3 text-xs font-black uppercase tracking-[0.2em] text-text-muted dark:text-slate-400 opacity-80">
              <History className="w-5 h-5 text-secondary" />
              <span>Audit Log & Activiteit</span>
            </h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-hide pr-2">
              {activities.map(activity => {
                const user = users.find(u => u.id === activity.userId);
                const hasProject = activity.projectId && projects.find(p => p.id === activity.projectId);
                return (
                  <button 
                    key={activity.id} 
                    onClick={() => handleActivityClick(activity)}
                    className={`w-full text-left flex space-x-4 p-4 rounded-[24px] transition-all group ${hasProject ? 'hover:bg-primary/5 cursor-pointer' : (activity.type === 'customer_created' ? 'cursor-default' : 'cursor-default')}`}
                  >
                    <div className="flex-shrink-0">
                      <img 
                        src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.userId}`} 
                        className="w-10 h-10 rounded-xl border border-primary/5 shadow-sm bg-white object-cover"
                        alt="User"
                      />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-[13px] font-black leading-snug dark:text-white group-hover:text-primary transition-colors truncate">
                        {user?.name || 'Onbekend'}
                      </p>
                      <p className="text-[12px] font-bold text-text-muted dark:text-light/70 leading-tight">
                        {activity.title}
                      </p>
                      <p className="text-[9px] text-text-muted dark:text-slate-500 font-black uppercase tracking-[0.15em] opacity-60 mt-1">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: nl })} • {format(new Date(activity.timestamp), 'HH:mm')}
                      </p>
                    </div>
                  </button>
                );
              })}
              {activities.length === 0 && (
                <div className="text-center py-20 opacity-30">
                   <History className="w-10 h-10 mx-auto mb-4 text-primary opacity-20" />
                   <p className="text-xs font-black uppercase tracking-widest">Nog geen gebeurtenissen geregistreerd</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <ProjectModal 
          customers={customers}
          users={users}
          prices={prices}
          onSave={handleCreate}
          onClose={() => { setShowCreateModal(false); onCloseForcedModal?.(); }}
        />
      )}
    </div>
  );
};

export default Dashboard;
