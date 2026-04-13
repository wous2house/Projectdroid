import React, { useState, useEffect } from 'react';
import { Project, TaskStatus, User, Prices, TimeEntry } from '../types';
import { CheckCircle2, Clock, AlertTriangle, Users, Calendar, TrendingUp, CheckSquare, Edit3, Save, MessageSquare, Check, AlignLeft, ChevronDown, ChevronUp, Play, Square, ToggleLeft, ToggleRight, BarChart3, Trash2 } from 'lucide-react';
import { isPast, formatDistanceToNow, format, isToday, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import RequirementsEditor, { REQ_LABELS, REQ_ORDER, calculatePrice } from './RequirementsEditor';
import { getIndentClass } from '../lib/requirements';

interface SummaryViewProps {
  project: Project;
  onAddTask: () => void;
  onEditTask: (task: Project['tasks'][0]) => void;
  allUsers: User[];
  prices: Prices;
  onUpdateProject: (project: Project) => void;
  triggerConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const SummaryView: React.FC<SummaryViewProps> = ({ project, onAddTask, onEditTask, allUsers, prices, onUpdateProject, triggerConfirm }) => {
  const [isEditingReqs, setIsEditingReqs] = useState(false);
  const [localReqs, setLocalReqs] = useState<string[]>(project.requirements || []);
  const [localNotes, setLocalNotes] = useState<Record<string, string>>(project.requirementNotes || {});
  const [isWebsiteTypeOpen, setIsWebsiteTypeOpen] = useState(false);
  const [isOnderhoudOpen, setIsOnderhoudOpen] = useState(false);
  const [isTimeListExpanded, setIsTimeListExpanded] = useState(false);

  const [localDescription, setLocalDescription] = useState<string>(project.description || '');

  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter(t => t.status === TaskStatus.DONE).length;
  const inProgressTasks = project.tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
  const upcomingTasks = project.tasks.filter(t => t.status !== TaskStatus.DONE && t.endDate);
  const overdueTasks = upcomingTasks.filter(t => isPast(new Date(t.endDate)));

  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const projectTeamIds = project.team || [];
  
  const { oneTime, recurring, total } = calculatePrice(project.requirements || [], project.requirementNotes || {}, project.lockedPrices || prices);

  const [timerTaskId, setTimerTaskId] = useState<string>(project.activeTimerTaskId || '');
  const [timerIsBillable, setTimerIsBillable] = useState<boolean>(project.isTimerBillable ?? true);

  const [editingTimeTaskId, setEditingTimeTaskId] = useState<string | null>(null);
  const [editTimeValue, setEditTimeValue] = useState<string>('');

  const [currentSeconds, setCurrentSeconds] = useState(0);

  useEffect(() => {
    // Sync local selected task if running
    if (project.isTimerRunning && project.activeTimerTaskId !== undefined) {
      setTimerTaskId(project.activeTimerTaskId);
    }
  }, [project.isTimerRunning, project.activeTimerTaskId]);

  useEffect(() => {
    // Calculate total time for the currently selected timerTaskId
    const entriesForTask = (project.timeEntries || []).filter(e => e.taskId === timerTaskId);
    const accumulated = entriesForTask.reduce((sum, e) => sum + e.durationSeconds, 0);

    let interval: NodeJS.Timeout;
    if (project.isTimerRunning && project.timerStartedAt && project.activeTimerTaskId === timerTaskId) {
      // If timer is running for THIS task, add the elapsed time
      interval = setInterval(() => {
        const start = new Date(project.timerStartedAt!).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - start) / 1000);
        setCurrentSeconds(accumulated + elapsed);
      }, 1000);
    } else {
      // Otherwise just show the static accumulated time for this task
      setCurrentSeconds(accumulated);
    }
    return () => clearInterval(interval);
  }, [project.isTimerRunning, project.timerStartedAt, timerTaskId, project.timeEntries, project.activeTimerTaskId]);

  const stopTimer = (currentProject: Project): Project => {
    if (!currentProject.isTimerRunning || !currentProject.timerStartedAt) return currentProject;

    const start = new Date(currentProject.timerStartedAt).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - start) / 1000);

    const newEntry: TimeEntry = {
      id: crypto.randomUUID(),
      taskId: currentProject.activeTimerTaskId || '',
      projectId: currentProject.id,
      startTime: currentProject.timerStartedAt,
      endTime: new Date().toISOString(),
      durationSeconds: elapsed,
      isBillable: currentProject.isHourlyRateActive ? (currentProject.isTimerBillable ?? true) : false
    };

    return {
      ...currentProject,
      isTimerRunning: false,
      trackedSeconds: (currentProject.trackedSeconds || 0) + elapsed,
      timerStartedAt: undefined,
      activeTimerTaskId: undefined,
      isTimerBillable: undefined,
      timeEntries: [...(currentProject.timeEntries || []), newEntry]
    };
  };

  const toggleTimer = () => {
    if (project.isTimerRunning) {
      onUpdateProject(stopTimer(project));
    } else {
      onUpdateProject({
        ...project,
        isTimerRunning: true,
        timerStartedAt: new Date().toISOString(),
        activeTimerTaskId: timerTaskId,
        isTimerBillable: timerIsBillable
      });
    }
  };

  const handleTaskChange = (newTaskId: string) => {
    if (project.isTimerRunning && project.activeTimerTaskId !== newTaskId) {
      // Auto-stop current timer and start for new task
      const stoppedProject = stopTimer(project);
      setTimerTaskId(newTaskId);
      onUpdateProject({
        ...stoppedProject,
        isTimerRunning: true,
        timerStartedAt: new Date().toISOString(),
        activeTimerTaskId: newTaskId,
        isTimerBillable: timerIsBillable
      });
    } else {
      setTimerTaskId(newTaskId);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (project.isTimerRunning) {
        e.preventDefault();
        e.returnValue = '';
        const stoppedProject = stopTimer(project);
        onUpdateProject(stoppedProject);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [project, onUpdateProject]);

  const formatTime = (totalSeconds: number) => {
    const isNegative = totalSeconds < 0;
    const absSeconds = Math.abs(totalSeconds);
    const h = Math.floor(absSeconds / 3600);
    const m = Math.floor((absSeconds % 3600) / 60);
    const s = absSeconds % 60;
    return `${isNegative ? '-' : ''}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const saveTime = (groupKey: string, oldSeconds: number) => {
    setEditingTimeTaskId(null);
    let parts = editTimeValue.split(':').map(n => parseInt(n) || 0);
    let newSeconds = oldSeconds;
    if (parts.length === 3) newSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) newSeconds = parts[0] * 3600 + parts[1] * 60;
    else if (parts.length === 1) newSeconds = parts[0] * 3600;

    if (newSeconds !== oldSeconds && !isNaN(newSeconds)) {
      const allEntries = [...(project.timeEntries || [])];
      
      const groupParts = groupKey.split('_');
      const taskId = groupParts[0] === 'undefined' ? '' : groupParts[0];
      const date = groupParts.slice(1).join('_');

      // Filter out all entries belonging to this group
      const otherEntries = allEntries.filter(e => {
        const eDate = e.startTime ? e.startTime.split('T')[0] : 'Onbekend';
        const eKey = `${e.taskId}_${eDate}`;
        return eKey !== groupKey;
      });

      // Find the first entry in the group to preserve properties like isBillable/isInvoiced if possible
      const originalGroupEntries = allEntries.filter(e => {
        const eDate = e.startTime ? e.startTime.split('T')[0] : 'Onbekend';
        const eKey = `${e.taskId}_${eDate}`;
        return eKey === groupKey;
      });
      
      const baseEntry = originalGroupEntries[0];

      const newEntry: TimeEntry = {
        id: baseEntry?.id || crypto.randomUUID(),
        taskId: taskId,
        projectId: project.id,
        startTime: baseEntry?.startTime || (date !== 'Onbekend' ? `${date}T09:00:00Z` : new Date().toISOString()),
        endTime: baseEntry?.endTime || (date !== 'Onbekend' ? `${date}T10:00:00Z` : new Date().toISOString()),
        durationSeconds: newSeconds,
        isBillable: baseEntry?.isBillable ?? (project.isHourlyRateActive ? (project.isTimerBillable ?? true) : false),
        isInvoiced: baseEntry?.isInvoiced || false
      };

      const diff = newSeconds - oldSeconds;

      onUpdateProject({
        ...project,
        timeEntries: [...otherEntries, newEntry],
        trackedSeconds: (project.trackedSeconds || 0) + diff
      });
    }
  };

  const saveRequirements = () => {
    onUpdateProject({ ...project, requirements: localReqs, requirementNotes: localNotes, description: localDescription });
    setIsEditingReqs(false);
  };

  const cancelEditing = () => {
    setLocalReqs(project.requirements || []);
    setLocalNotes(project.requirementNotes || {});
    setLocalDescription(project.description || '');
    setIsEditingReqs(false);
  };

  const onDeleteTimeEntryGroup = (groupKey: string) => {
    triggerConfirm('Tijd verwijderen?', 'Weet je zeker dat je deze gelogde tijd wilt verwijderen?', () => {
      const allEntries = [...(project.timeEntries || [])];

      const otherEntries = allEntries.filter(e => {
        const eDate = e.startTime ? e.startTime.split('T')[0] : 'Onbekend';
        const eKey = `${e.taskId}_${eDate}`;
        return eKey !== groupKey;
      });

      const deletedEntries = allEntries.filter(e => {
        const eDate = e.startTime ? e.startTime.split('T')[0] : 'Onbekend';
        const eKey = `${e.taskId}_${eDate}`;
        return eKey === groupKey;
      });

      const deletedSeconds = deletedEntries.reduce((sum, e) => sum + e.durationSeconds, 0);

      onUpdateProject({
        ...project,
        timeEntries: otherEntries,
        trackedSeconds: (project.trackedSeconds || 0) - deletedSeconds
      });
    });
  };

  const timeEntries = project.timeEntries || [];
  
  const groupedEntries: Record<string, TimeEntry[]> = {};
  timeEntries.forEach(e => {
    const date = e.startTime ? e.startTime.split('T')[0] : 'Onbekend';
    const key = `${e.taskId}_${date}`;
    if (!groupedEntries[key]) groupedEntries[key] = [];
    groupedEntries[key].push(e);
  });

  const timePerTask = Object.entries(groupedEntries).map(([key, entries]) => {
    const parts = key.split('_');
    const taskId = parts[0];
    const date = parts.slice(1).join('_');

    let taskName = 'Algemeen (Geen taak)';
    if (taskId) {
      const task = (project.tasks || []).find(t => t.id === taskId);
      if (task) taskName = task.name;
    }

    const dateObj = date !== 'Onbekend' ? new Date(date) : null;
    let formattedDate = date;
    if (dateObj && !isNaN(dateObj.getTime())) {
      formattedDate = format(dateObj, 'dd MMM yyyy', { locale: nl });
    }
    const nameWithDate = `${taskName} - ${formattedDate}`;

    const seconds = entries.reduce((sum, e) => sum + e.durationSeconds, 0);
    const hasBillable = entries.some(e => e.isBillable && !e.isInvoiced);
    const hasInvoiced = entries.some(e => e.isInvoiced);
    
    return { id: key, taskId, name: nameWithDate, seconds, hasBillable, hasInvoiced };
  }).filter(t => t.seconds > 0 || t.seconds < 0);

  timePerTask.sort((a,b) => b.seconds - a.seconds);
  
  const totalTrackedSeconds = timeEntries.reduce((sum, e) => sum + e.durationSeconds, 0);
  const todayTrackedSeconds = timeEntries.filter(e => e.startTime && isToday(parseISO(e.startTime))).reduce((sum, e) => sum + e.durationSeconds, 0);
  const maxSeconds = Math.max(...timePerTask.map(t => t.seconds), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-8 md:gap-12 font-sans">
      <div className="lg:col-span-4 xl:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-[40px] p-8 md:p-12 shadow-sm transition-all hover:shadow-xl">
          <div className="flex items-center justify-between mb-8 font-subtitle">
            <h3 className="text-text-muted dark:text-slate-400 text-xs font-black uppercase tracking-[0.2em] opacity-80">Project Voortgang</h3>
            <div className="p-3 bg-primary/10 rounded-2xl text-primary"><TrendingUp className="w-6 h-6" /></div>
          </div>
          <div className="flex items-baseline space-x-4 mb-8">
            <span className="text-5xl lg:text-6xl xl:text-7xl font-black text-primary tracking-tighter">{progressPercentage}%</span>
            {/*<span className="text-text-muted dark:text-slate-400 text-sm font-black uppercase tracking-widest opacity-60 font-subtitle">Gereed</span>*/}
          </div>
          <div className="w-full bg-slate-100 dark:bg-dark/60 rounded-full h-3.5 md:h-5 overflow-hidden border border-slate-200 dark:border-white/5 p-1">
            <div className={`h-full transition-all duration-1000 rounded-full ${progressPercentage === 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-[40px] p-8 md:p-12 shadow-sm transition-all hover:shadow-xl">
          <div className="flex items-center justify-between mb-10 font-subtitle">
            <h3 className="text-text-muted dark:text-slate-400 text-xs font-black uppercase tracking-[0.2em] opacity-80">Taken Status</h3>
            <div className="p-3 bg-success/10 rounded-2xl text-success"><CheckCircle2 className="w-6 h-6" /></div>
          </div>
          <div className="space-y-6 font-subtitle">
            {[
              { label: 'Voltooid', count: completedTasks, color: 'text-success', bg: 'bg-success/10' },
              { label: 'In uitvoering', count: inProgressTasks, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Te laat', count: overdueTasks.length, color: 'text-danger', bg: 'bg-danger/10' }
            ].map((stat, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-dark/40 rounded-2xl border border-slate-100 dark:border-white/5">
                <div className="flex items-center space-x-3">
                   <div className={`w-2 h-2 rounded-full ${stat.color.replace('text-', 'bg-')}`}></div>
                   <span className="text-text-muted dark:text-slate-300 uppercase tracking-widest font-black text-[11px]">{stat.label}</span>
                </div>
                <span className={`${stat.color} text-2xl font-black`}>{stat.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-[40px] p-8 md:p-12 shadow-sm transition-all hover:shadow-xl">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-black flex items-center space-x-4 text-text-main dark:text-white tracking-tight">
              <AlertTriangle className="w-8 h-8 text-danger" />
              <span>Deadlines</span>
            </h3>
          </div>
          <div className="space-y-4 font-subtitle">
            {upcomingTasks.length === 0 ? (
              <div className="text-center py-16 opacity-30 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                <p className="text-xs font-black uppercase tracking-widest">Geen actieve deadlines.</p>
              </div>
            ) : (
              upcomingTasks.sort((a,b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()).slice(0, 5).map(task => {
                const overdue = isPast(new Date(task.endDate));
                return (
                  <div 
                    key={task.id}
                    onClick={() => onEditTask(task)}
                    className={`flex items-center justify-between p-6 border-2 rounded-3xl cursor-pointer transition-all ${overdue ? 'bg-danger/5 border-danger/30 hover:border-danger shadow-sm' : 'bg-slate-50 dark:bg-dark/40 border-slate-100 dark:border-white/5 hover:border-primary/50'}`}
                  >
                    <div className="flex items-center space-x-6 min-w-0">
                      <div className={`p-4 rounded-2xl flex-shrink-0 ${overdue ? 'bg-danger/20 text-danger shadow-inner' : 'bg-primary/10 text-primary shadow-inner'}`}>
                        <Clock className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-base md:text-lg text-text-main dark:text-white mb-1 truncate">{task.name}</h4>
                        <div className="flex items-center space-x-2">
                           <p className={`text-[11px] font-black uppercase tracking-widest ${overdue ? 'text-danger' : 'text-text-muted dark:text-slate-400 opacity-70'}`}>
                             Deadline: {format(new Date(task.endDate), 'dd MMM yyyy', { locale: nl })}
                           </p>
                           <span className="opacity-30">•</span>
                           <p className={`text-[11px] font-bold ${overdue ? 'text-danger animate-pulse' : 'text-text-muted dark:text-slate-500'}`}>
                              {formatDistanceToNow(new Date(task.endDate), { locale: nl, addSuffix: true })}
                           </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Project Inhoud */}
        <div className="lg:col-span-4 xl:col-span-4 bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-[40px] p-8 md:p-12 shadow-sm transition-all hover:shadow-xl mt-4 md:mt-0">
          <div className="flex items-center justify-between mb-8 font-subtitle">
            <h3 className="text-text-muted dark:text-slate-400 text-xs font-black uppercase tracking-[0.2em] opacity-80">Project Inhoud</h3>
            <div className="flex items-center space-x-3">
              {!isEditingReqs ? (
                <button 
                  onClick={() => {
                    setLocalReqs(project.requirements || []);
                    setLocalNotes(project.requirementNotes || {});
                    setIsEditingReqs(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-all text-xs font-bold"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Bewerken</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={cancelEditing}
                    className="px-4 py-2 bg-slate-100 dark:bg-dark text-text-muted hover:text-danger rounded-xl transition-all text-xs font-bold"
                  >
                    Annuleren
                  </button>
                  <button 
                    onClick={saveRequirements}
                    className="flex items-center space-x-2 px-4 py-2 bg-success text-white hover:bg-success-hover rounded-xl transition-all text-xs font-bold shadow-lg shadow-success/20"
                  >
                    <Save className="w-4 h-4" />
                    <span>Opslaan</span>
                  </button>
                </div>
              )}
              <div className="p-3 bg-info/10 rounded-2xl text-info"><CheckSquare className="w-6 h-6" /></div>
            </div>
          </div>
          
          {!isEditingReqs ? (
            <div className="space-y-8">
              {project.description && (
                <div className="bg-white dark:bg-dark-card rounded-[32px] p-6 md:p-8 border border-slate-200 dark:border-white/10 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                      <AlignLeft className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-text-main dark:text-white font-subtitle">Project Omschrijving</h4>
                  </div>
                  <p className="text-sm font-medium text-text-muted dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{project.description}</p>
                </div>
              )}
              
              {(!project.requirements || project.requirements.length === 0) ? (
                <div className="text-center py-12 opacity-30 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[32px]">
                  <p className="text-xs font-black uppercase tracking-widest">Geen inhoud geselecteerd.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...project.requirements].sort((a, b) => REQ_ORDER.indexOf(a) - REQ_ORDER.indexOf(b)).map(req => {
                    const isWebsiteTypeChild = ['type_werken_bij', 'type_landing', 'type_corporate', 'cms_wp', 'wp_elementor', 'wp_acf', 'wp_code', 'wp_forms', 'wp_jet', 'wp_smashballoon_pro', 'wp_api_to_posts', 'cms_eigen', 'eigen_recruitee'].includes(req);
                    const isOnderhoudChild = ['wp_rocket', 'wp_umbrella', 'wp_wordfence', 'wp_wordfence_premium'].includes(req);

                    if (isWebsiteTypeChild && !isWebsiteTypeOpen) return null;
                    if (isOnderhoudChild && !isOnderhoudOpen) return null;

                    return (
                    <div key={req} className={`flex items-start space-x-4 p-4 bg-white dark:bg-dark-card rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm transition-all hover:shadow-md ${getIndentClass(req)}`}>
                      <div className="p-1.5 bg-primary/10 text-primary rounded-lg mt-0.5">
                        <Check className="w-4 h-4" strokeWidth={3} />
                      </div>
                      <div className="flex-grow">
                        <h4 className="text-sm font-bold text-text-main dark:text-white flex items-center flex-wrap gap-2">
                          <span>{REQ_LABELS[req] || req}</span>
                          {req === 'bouw_website' && (
                            <button onClick={() => setIsWebsiteTypeOpen(!isWebsiteTypeOpen)} className="ml-2 p-1 hover:bg-slate-100 dark:hover:bg-dark rounded-md transition-colors">
                              {isWebsiteTypeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                          {req === 'onderhoud' && (
                            <button onClick={() => setIsOnderhoudOpen(!isOnderhoudOpen)} className="ml-2 p-1 hover:bg-slate-100 dark:hover:bg-dark rounded-md transition-colors">
                              {isOnderhoudOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                          {req === 'onderhoud' && project.requirementNotes?.['onderhoud_tier'] && (
                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-black uppercase tracking-wider">
                              {project.requirementNotes['onderhoud_tier']}
                            </span>
                          )}
                          {req === 'type_werken_bij' && project.requirementNotes?.['type_werken_bij_size'] && (
                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-black uppercase tracking-wider">
                              {project.requirementNotes['type_werken_bij_size']}
                            </span>
                          )}
                          {req === 'type_landing' && project.requirementNotes?.['type_landing_size'] && (
                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-black uppercase tracking-wider">
                              {project.requirementNotes['type_landing_size']}
                            </span>
                          )}
                        </h4>
                        {project.requirementNotes?.[req] && !['onderhoud_tier', 'type_werken_bij_size', 'type_landing_size'].includes(req) && (
                          <div className="mt-2.5 flex items-start space-x-2.5 text-xs text-text-muted dark:text-slate-400 bg-slate-50 dark:bg-dark p-3 rounded-xl border border-slate-100 dark:border-white/5">
                            <MessageSquare className="w-4 h-4 mt-0.5 opacity-40 flex-shrink-0 text-primary" />
                            <p className="font-medium leading-relaxed">{project.requirementNotes[req]}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white dark:bg-dark-card rounded-[32px] p-6 md:p-8 border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <AlignLeft className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-text-main dark:text-white font-subtitle">Project Omschrijving</h4>
                </div>
                <textarea 
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  placeholder="Voeg een projectomschrijving toe..."
                  className="w-full bg-slate-50 dark:bg-dark/50 border border-slate-200 dark:border-white/10 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl p-4 text-sm font-medium outline-none transition-all dark:text-white shadow-sm resize-none h-32"
                />
              </div>

              <div className="bg-slate-50 dark:bg-dark/40 p-6 md:p-8 rounded-[32px] border border-slate-100 dark:border-white/5 space-y-6">
                <RequirementsEditor 
                  requirements={localReqs}
                  requirementNotes={localNotes}
                  onChangeRequirements={setLocalReqs}
                  onChangeNotes={setLocalNotes}
                  prices={prices}
                  lockedPrices={project.lockedPrices}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-[40px] p-10 shadow-sm transition-all hover:shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-muted dark:text-slate-400 flex items-center space-x-3 opacity-80 font-subtitle">
              <Clock className="w-6 h-6 text-primary" />
              <span>Urenregistratie</span>
            </h3>
            {project.isHourlyRateActive && (
              <div className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider">
                € {project.hourlyRate?.toFixed(2) || '0.00'} / u
              </div>
            )}
          </div>
          
          <div className="mb-6 space-y-4 font-subtitle">
            <div className="flex flex-col space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Koppel aan taak</label>
              <select 
                value={timerTaskId} 
                onChange={(e) => handleTaskChange(e.target.value)}
                className="bg-slate-50 dark:bg-dark/50 border border-slate-200 dark:border-white/10 p-3 rounded-2xl outline-none focus:border-primary text-xs font-bold dark:text-white"
              >
                <option value="">Geen taak (Algemeen)</option>
                {project.tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            {project.isHourlyRateActive && (
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-dark/50 border border-slate-200 dark:border-white/10 rounded-2xl cursor-pointer" onClick={() => !project.isTimerRunning && setTimerIsBillable(!timerIsBillable)}>
                <span className="text-[11px] font-bold text-text-main dark:text-white">Factureerbaar</span>
                <button disabled={project.isTimerRunning} className={`${timerIsBillable ? 'text-primary' : 'text-text-muted'} transition-colors`}>
                  {timerIsBillable ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center space-y-6">
            <div className={`text-3xl md:text-4xl font-black font-mono tracking-wider ${project.isTimerRunning ? 'text-primary animate-pulse' : 'text-text-main dark:text-white'}`}>
              {formatTime(currentSeconds)}
            </div>
            <button 
              onClick={toggleTimer}
              className={`flex items-center space-x-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${project.isTimerRunning ? 'bg-danger/10 text-danger hover:bg-danger hover:text-white' : 'bg-primary text-white hover:scale-105 shadow-xl shadow-primary/30'}`}
            >
              {project.isTimerRunning ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              <span>{project.isTimerRunning ? 'Stop Timer' : 'Start Timer'}</span>
            </button>
          </div>
        </div>

        {timePerTask.length > 0 && (
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-[40px] p-10 shadow-sm transition-all hover:shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setIsTimeListExpanded(!isTimeListExpanded)}
                className="text-xs font-black uppercase tracking-[0.2em] text-text-muted dark:text-slate-400 flex items-center space-x-3 opacity-80 font-subtitle hover:text-primary transition-colors focus:outline-none"
              >
                <BarChart3 className="w-6 h-6 text-primary" />
                <span>Geschiedenis Tijdregistratie</span>
                {isTimeListExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            <div className="space-y-5">
              {isTimeListExpanded && timePerTask.map(t => (
                <div key={t.id} className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold font-subtitle">
                    <div className="flex items-center space-x-3 truncate pr-2">
                      <span className="text-text-main dark:text-white truncate">{t.name || 'Algemeen'}</span>
                      {project.isHourlyRateActive && t.hasBillable && <span className="text-[8px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-md uppercase flex-shrink-0">Factuur</span>}
                      {project.isHourlyRateActive && t.hasInvoiced && <span className="text-[8px] font-black text-success bg-success/10 px-1.5 py-0.5 rounded-md uppercase flex-shrink-0 flex items-center gap-1" title="Reeds gefactureerd"><CheckCircle2 className="w-2.5 h-2.5" />Gefactureerd</span>}
                    </div>
                    {editingTimeTaskId === t.id ? (
                      <input
                        type="text"
                        autoFocus
                        className="w-20 bg-slate-100 dark:bg-dark/50 text-primary font-black font-mono text-xs px-2 py-1 rounded outline-none border border-primary/30 text-right focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        value={editTimeValue}
                        onChange={(e) => setEditTimeValue(e.target.value)}
                        onBlur={() => saveTime(t.id, t.seconds)}
                        onKeyDown={(e) => e.key === 'Enter' && saveTime(t.id, t.seconds)}
                      />
                    ) : (
                      <span 
                        className="text-primary font-black font-mono flex-shrink-0 cursor-pointer hover:underline decoration-primary/50 underline-offset-4 transition-all"
                        onClick={() => {
                          if (!project.isTimerRunning) {
                            setEditingTimeTaskId(t.id);
                            setEditTimeValue(formatTime(t.seconds));
                          }
                        }}
                        title={project.isTimerRunning ? "Stop eerst de timer om de tijd aan te passen" : "Klik om tijd aan te passen (formaat HH:MM:SS of HH:MM of UUur)"}
                      >
                        {formatTime(t.seconds)}
                      </span>
                    )}
                    <button
                      onClick={() => onDeleteTimeEntryGroup(t.id)}
                      disabled={project.isTimerRunning}
                      className="ml-3 p-1.5 text-danger/40 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Verwijder tijdregistratie"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-dark/60 rounded-full h-2 overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${(t.seconds / maxSeconds) * 100}%` }}></div>
                  </div>
                </div>
              ))}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5 space-y-2">
                <div className="flex justify-between items-center text-sm font-black text-text-main dark:text-white uppercase tracking-wider font-subtitle">
                  <span>Vandaag Getimed</span>
                  <span className="font-mono text-primary">{formatTime(todayTrackedSeconds)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-text-muted dark:text-slate-400 uppercase tracking-wider font-subtitle">
                  <span>Totaal Getimed</span>
                  <span className="font-mono">{formatTime(totalTrackedSeconds)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-[40px] p-10 shadow-sm transition-all hover:shadow-xl sticky top-28">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-muted dark:text-slate-400 mb-10 flex items-center space-x-3 opacity-80 font-subtitle">
            <Users className="w-6 h-6 text-info" />
            <span>Project Team</span>
          </h3>
          <div className="space-y-8 font-subtitle">
            {projectTeamIds.map(uId => {
              const userTasks = project.tasks.filter(t => t.assignees.includes(uId) && t.status !== TaskStatus.DONE);
              const user = allUsers.find(u => u.id === uId);
              return (
                <div key={uId} className="flex flex-col sm:flex-row xl:flex-col 2xl:flex-row items-center sm:items-center xl:items-center 2xl:items-center space-y-3 sm:space-y-0 sm:space-x-5 xl:space-y-3 2xl:space-y-0 2xl:space-x-5 group text-center sm:text-left xl:text-center 2xl:text-left">
                  <div className="relative flex-shrink-0">
                    <img 
                      src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uId}`} 
                      className="w-14 h-14 md:w-16 md:h-16 rounded-[22px] border-4 border-slate-100 dark:border-white/5 shadow-md group-hover:scale-110 transition-transform object-cover bg-white" 
                      alt="avatar" 
                    />
                    {userTasks.length > 0 && <div className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-dark-card">{userTasks.length}</div>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-black text-text-main dark:text-white truncate xl:max-w-none 2xl:max-w-[150px]">{user?.name || 'Teamlid'}</p>
                    <p className="text-xs text-text-muted dark:text-slate-400 font-bold uppercase tracking-widest opacity-70 mt-1">{user?.title || 'Droid'}</p>
                  </div>
                </div>
              );
            })}
            {projectTeamIds.length === 0 && (
              <p className="text-center py-10 opacity-30 text-xs font-black uppercase tracking-widest">Geen teamleden gekoppeld</p>
            )}
          </div>
        </div>

        {project.endDate && (
          <div className="bg-primary rounded-[40px] p-10 text-white shadow-2xl shadow-primary/30 flex flex-col items-center justify-center space-y-8 text-center relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="p-6 bg-white/20 rounded-3xl backdrop-blur-xl border border-white/20 shadow-inner">
              <Calendar className="w-10 h-10 text-secondary" />
            </div>
            <div className="space-y-2">
              <h4 className="font-black text-xl uppercase tracking-[0.2em] opacity-80">Ultieme Deadline</h4>
              <p className="text-sm font-bold opacity-60">Lever dit project op voor:</p>
            </div>
            <div className="text-2xl md:text-3xl font-black tracking-tight bg-white text-primary px-10 py-5 rounded-[24px] w-full shadow-xl">
              {format(new Date(project.endDate), 'dd MMM yyyy', { locale: nl })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryView;
