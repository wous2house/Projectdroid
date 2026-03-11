
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, Task, TaskStatus, Attachment, Activity, Customer, User, Phase, NoteFile, ActivityDeepLink, Prices } from '../types';
import { ChevronLeft, Columns, Calendar, PieChart, FolderOpen, Plus, ExternalLink, Trash2, FileText, FileSpreadsheet, Globe, Link as LinkIcon, Edit3, StickyNote, Paperclip, Check, Bold, Italic, Underline, List, ImageIcon, FileIcon, Wallet, X } from 'lucide-react';
import KanbanBoard from './KanbanBoard';
import TimelineView from './TimelineView';
import SummaryView from './SummaryView';
import FinancialView from './FinancialView';
import TaskModal from './TaskModal';
import ProjectModal from './ProjectModal';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ProjectDetailsProps {
  project: Project;
  allProjects: Project[];
  customers: Customer[];
  users: User[];
  prices: Prices;
  onUpdate: (project: Project) => void;
  onBack: () => void;
  addToast: (message: string, type?: 'success' | 'danger' | 'info') => void;
  triggerConfirm: (title: string, message: string, onConfirm: () => void) => void;
  logActivity: (type: Activity['type'], title: string, options?: { projectId?: string, taskId?: string, phaseId?: string, projectName?: string, details?: string }) => void;
  deepLink: ActivityDeepLink | null;
  onClearDeepLink: () => void;
}

type Tab = 'samenvatting' | 'bord' | 'tijdlijn' | 'notities' | 'financieel';

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, allProjects, customers, users, prices, onUpdate, onBack, addToast, triggerConfirm, logActivity, deepLink, onClearDeepLink }) => {
  const [activeTab, setActiveTab] = useState<Tab>('samenvatting');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [preselectedPhaseId, setPreselectedPhaseId] = useState<string | undefined>(undefined);
  
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [newNoteData, setNewNoteData] = useState({ name: '', content: '', files: [] as NoteFile[] });
  const [viewingNote, setViewingNote] = useState<Attachment | null>(null);
  
  const [isLinkPopupOpen, setIsLinkPopupOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const savedSelectionRange = useRef<Range | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (deepLink) {
      if (deepLink.type === 'task') {
        const task = project.tasks.find(t => t.id === deepLink.id);
        if (task) {
          setEditingTask(task);
          setIsTaskModalOpen(true);
          setActiveTab('bord');
        }
      } else if (deepLink.type === 'phase') {
        setActiveTab('bord');
      } else if (deepLink.type === 'financieel') {
        setActiveTab('financieel');
      } else if (deepLink.type === 'notities') {
        setActiveTab('notities');
      }
      onClearDeepLink();
    }
  }, [deepLink, project.tasks, onClearDeepLink]);

  const projectTeam = useMemo(() => {
    return users.filter(u => project.team?.includes(u.id));
  }, [users, project.team]);

  const projectCustomer = useMemo(() => {
    return customers.find(c => c.id === project.customerId);
  }, [customers, project.customerId]);

  useEffect(() => {
    if (isAddingNote && editorRef.current) {
      const timer = setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = newNoteData.content || '';
          editorRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isAddingNote, newNoteData.content]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRange.current = sel.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    if (savedSelectionRange.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRange.current);
      }
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    if (command === 'createLink') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.toString().length === 0) {
        addToast('Selecteer eerst tekst om een link toe te voegen', 'info');
        return;
      }
      saveSelection();
      setIsLinkPopupOpen(true);
      setLinkUrl('https://');
      return;
    } else {
      document.execCommand(command, false, value);
    }
    editorRef.current?.focus();
  };

  const handleApplyLink = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let finalUrl = linkUrl.trim();
    if (finalUrl && finalUrl !== 'https://') {
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
      restoreSelection();
      document.execCommand('createLink', false, finalUrl);
    }
    setIsLinkPopupOpen(false);
    editorRef.current?.focus();
  };

  const handleAddTask = (newTask: Task) => {
    const taskWithOrder = { ...newTask, order: project.tasks.length };
    onUpdate({ ...project, tasks: [...project.tasks, taskWithOrder] });
    logActivity('task_created', `Taak toegevoegd: ${newTask.name}`, { projectId: project.id, projectName: project.name, taskId: newTask.id });
    setIsTaskModalOpen(false);
    setPreselectedPhaseId(undefined);
    addToast('Taak toegevoegd');
  };

  const handleUpdateTask = (updatedTask: Task) => {
    const oldTask = project.tasks.find(t => t.id === updatedTask.id);
    onUpdate({
      ...project,
      tasks: project.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
    });
    
    if (oldTask) {
      if (oldTask.startDate !== updatedTask.startDate || oldTask.endDate !== updatedTask.endDate) {
        logActivity('task_updated', `Planning aangepast: ${updatedTask.name} (${format(parseISO(updatedTask.startDate), 'dd MMM')} - ${format(parseISO(updatedTask.endDate), 'dd MMM')})`, { projectId: project.id, projectName: project.name, taskId: updatedTask.id });
      } else if (oldTask.status !== updatedTask.status && updatedTask.status === TaskStatus.DONE) {
        logActivity('task_completed', `Taak voltooid: ${updatedTask.name}`, { projectId: project.id, projectName: project.name, taskId: updatedTask.id });
      } else {
        logActivity('task_updated', `Taak bewerkt: ${updatedTask.name}`, { projectId: project.id, projectName: project.name, taskId: updatedTask.id });
      }
    }
    
    addToast('Taak bijgewerkt');
    setIsTaskModalOpen(false);
  };

  const handleDeleteTask = (taskId: string) => {
    const task = project.tasks.find(t => t.id === taskId);
    triggerConfirm('Taak verwijderen?', 'Weet je zeker dat je deze taak wilt verwijderen?', () => {
      onUpdate({
        ...project,
        tasks: project.tasks.filter(t => t.id !== taskId)
      });
      logActivity('task_deleted', `Taak verwijderd: ${task?.name}`, { projectId: project.id, projectName: project.name });
      addToast('Taak verwijderd', 'danger');
      setIsTaskModalOpen(false);
    });
  };

  const handleAddPhase = (name: string) => {
    const newPhase: Phase = {
      id: Math.random().toString(36).substring(2, 11),
      name,
      order: project.phases.length
    };
    onUpdate({ ...project, phases: [...project.phases, newPhase] });
    logActivity('phase_added', `Nieuwe fase aangemaakt: ${name}`, { projectId: project.id, projectName: project.name, phaseId: newPhase.id });
    addToast(`Fase '${name}' aangemaakt`);
  };

  const handleUpdatePhase = (phaseId: string, name: string) => {
    const updatedPhases = project.phases.map(p => p.id === phaseId ? { ...p, name } : p);
    onUpdate({ ...project, phases: updatedPhases });
    addToast('Fase naam bijgewerkt');
  };

  const handleDeletePhase = (phaseId: string) => {
    const phase = project.phases.find(p => p.id === phaseId);
    triggerConfirm('Fase verwijderen?', `Weet je zeker dat je fase '${phase?.name}' wilt verwijderen? Alle taken in deze fase worden ook gewist.`, () => {
      const updatedPhases = project.phases.filter(p => p.id !== phaseId);
      const updatedTasks = project.tasks.filter(t => t.phaseId !== phaseId);
      onUpdate({ ...project, phases: updatedPhases, tasks: updatedTasks });
      addToast('Fase verwijderd', 'danger');
    });
  };

  const handleReorderPhases = (orderedPhases: Phase[]) => {
    onUpdate({ ...project, phases: orderedPhases });
  };

  const handleUpdateProjectDetails = (updatedProject: Project | Omit<Project, 'id' | 'createdAt'>) => {
    onUpdate(updatedProject as Project);
    setIsProjectModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        let fileType: NonNullable<NoteFile['fileType']> = 'file';
        if (fileExt === 'pdf') fileType = 'pdf';
        else if (['doc', 'docx'].includes(fileExt || '')) fileType = 'docx';
        else if (['xls', 'xlsx', 'csv'].includes(fileExt || '')) fileType = 'xlsx';
        else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(fileExt || '')) fileType = 'image';

        const newFile: NoteFile = {
          id: Math.random().toString(36).substring(2, 11),
          name: file.name,
          url: reader.result as string,
          fileType: fileType
        };

        setNewNoteData(prev => ({ ...prev, files: [...prev.files, newFile] }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveNote = () => {
    const finalContent = editorRef.current ? editorRef.current.innerHTML : newNoteData.content;
    
    if (!newNoteData.name.trim()) {
      addToast('Titel is verplicht', 'danger');
      return;
    }

    if (editingNoteId) {
      const updatedAttachments = project.attachments.map(at => 
        at.id === editingNoteId 
          ? { ...at, name: newNoteData.name, content: finalContent, files: newNoteData.files } 
          : at
      );
      onUpdate({ ...project, attachments: updatedAttachments });
      addToast('Bijgewerkt');
    } else {
      const newAt: Attachment = {
        id: Math.random().toString(36).substring(2, 11),
        name: newNoteData.name,
        url: '',
        content: finalContent,
        type: 'note',
        files: newNoteData.files,
        createdAt: new Date().toISOString()
      };
      onUpdate({ ...project, attachments: [...(project.attachments || []), newAt] });
      logActivity('note_added', `Notitie toegevoegd: ${newAt.name}`, { projectId: project.id, projectName: project.name });
      addToast('Toegevoegd');
    }

    setNewNoteData({ name: '', content: '', files: [] });
    setIsAddingNote(false);
    setEditingNoteId(null);
  };

  const handleStartEditNote = (at: Attachment) => {
    setNewNoteData({ name: at.name, content: at.content || '', files: at.files || [] });
    setEditingNoteId(at.id);
    setIsAddingNote(true);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-danger" />;
      case 'xlsx': return <FileSpreadsheet className="w-5 h-5 text-success" />;
      case 'image': return <ImageIcon className="w-5 h-5 text-warning" />;
      default: return <FileIcon className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-8 md:space-y-12 animate-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col xl:flex-row items-center justify-between gap-8">
        <div className="flex items-center space-x-5 md:space-x-8">
          <button onClick={onBack} className="p-3.5 md:p-4 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-primary hover:text-white transition-all bg-white dark:bg-dark-card shadow-sm"><ChevronLeft className="w-6 h-6 dark:text-white" /></button>
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl md:text-4xl font-black tracking-tight text-text-main dark:text-white leading-tight">
                {project.name}
              </h1>
              <button 
                onClick={() => setIsProjectModalOpen(true)}
                className="p-2.5 bg-primary/10 hover:bg-primary hover:text-white rounded-xl text-primary transition-all"
                title="Project bewerken"
              >
                <Edit3 className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <p className="text-primary dark:text-blue-400 font-black text-xs md:text-sm font-subtitle tracking-[0.1em] uppercase">
                {projectCustomer ? projectCustomer.name : 'Geen klant gekoppeld'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 p-1.5 rounded-3xl shadow-sm font-subtitle overflow-x-auto w-[fit-content]">
          <div className="flex items-center w-full min-max gap-1">
            {[
              { id: 'samenvatting', icon: <PieChart className="w-4.5 h-4.5" />, label: 'Overzicht' },
              { id: 'bord', icon: <Columns className="w-4.5 h-4.5" />, label: 'Bord' },
              { id: 'tijdlijn', icon: <Calendar className="w-4.5 h-4.5" />, label: 'Tijdlijn' },
              { id: 'notities', icon: <StickyNote className="w-4.5 h-4.5" />, label: 'Notities' },
              { id: 'financieel', icon: <Wallet className="w-4.5 h-4.5" />, label: 'Financieel' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center space-x-2.5 px-6 py-3.5 rounded-2xl text-[11px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-text-muted dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark hover:text-primary'}`}
              >
                {tab.icon}
                <span className={"hidden md:block"}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'samenvatting' && <SummaryView project={project} onAddTask={() => { setEditingTask(undefined); setPreselectedPhaseId(undefined); setIsTaskModalOpen(true); }} onEditTask={task => { setEditingTask(task); setPreselectedPhaseId(undefined); setIsTaskModalOpen(true); }} allUsers={users} onUpdateProject={onUpdate} prices={prices} />}
        {activeTab === 'bord' && (
          <KanbanBoard 
            project={project} 
            users={users}
            onMoveTask={(tid, stat, pid, targetIdx) => {
              const taskToMove = project.tasks.find(t => t.id === tid);
              if (!taskToMove) return;
              const targetPhaseId = pid || taskToMove.phaseId;
              const targetPhase = project.phases.find(ph => ph.id === targetPhaseId);
              
              const updatedTask = { ...taskToMove, status: stat, phaseId: targetPhaseId };
              const otherTasks = project.tasks.filter(t => t.id !== tid);
              const phaseTasks = otherTasks.filter(t => t.phaseId === targetPhaseId).sort((a, b) => (a.order || 0) - (b.order || 0));
              if (targetIdx !== undefined) phaseTasks.splice(targetIdx, 0, updatedTask);
              else phaseTasks.push(updatedTask);
              const phaseTasksWithNewOrder = phaseTasks.map((t, i) => ({ ...t, order: i }));
              const remainingTasks = otherTasks.filter(t => t.phaseId !== targetPhaseId);
              
              if (taskToMove.phaseId !== targetPhaseId) {
                logActivity('task_moved', `Taak '${taskToMove.name}' verplaatst naar '${targetPhase?.name}'`, { projectId: project.id, projectName: project.name, taskId: taskToMove.id, phaseId: targetPhaseId });
              } else if (taskToMove.status !== stat && stat === TaskStatus.DONE) {
                logActivity('task_completed', `Taak voltooid: ${taskToMove.name}`, { projectId: project.id, projectName: project.name, taskId: taskToMove.id });
              }
              
              onUpdate({ ...project, tasks: [...remainingTasks, ...phaseTasksWithNewOrder] });
            }} 
            onEditTask={task => { setEditingTask(task); setPreselectedPhaseId(undefined); setIsTaskModalOpen(true); }} 
            onAddTask={pid => { setEditingTask(undefined); setPreselectedPhaseId(pid); setIsTaskModalOpen(true); }}
            onAddPhase={handleAddPhase}
            onUpdatePhase={handleUpdatePhase}
            onDeletePhase={handleDeletePhase}
            onReorderPhases={handleReorderPhases}
          />
        )}
        {activeTab === 'tijdlijn' && (
          <TimelineView 
            project={project} 
            onUpdateTask={(taskId, start, end) => {
              const task = project.tasks.find(t => t.id === taskId);
              if (!task) return;
              
              const updatedTasks = project.tasks.map(t => t.id === taskId ? { ...t, startDate: start, endDate: end, scheduledDate: start } : t);
              onUpdate({ ...project, tasks: updatedTasks });
              
              if (task.startDate !== start || task.endDate !== end) {
                logActivity('task_updated', `Planning aangepast: ${task.name} (${format(parseISO(start), 'dd MMM')} - ${format(parseISO(end), 'dd MMM')})`, { projectId: project.id, projectName: project.name, taskId: task.id });
              }
              
              addToast('Planning bijgewerkt');
            }} 
            onAddTask={(pid) => { setEditingTask(undefined); setPreselectedPhaseId(pid); setIsTaskModalOpen(true); }}
            onEditTask={(task) => { setEditingTask(task); setPreselectedPhaseId(undefined); setIsTaskModalOpen(true); }}
            onEditProject={() => setIsProjectModalOpen(true)}
          />
        )}
        {activeTab === 'financieel' && (
          <FinancialView project={project} allProjects={allProjects} prices={prices} onUpdate={onUpdate} addToast={addToast} triggerConfirm={triggerConfirm} logActivity={logActivity} />
        )}
        {activeTab === 'notities' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-text-main dark:text-white">Project Dossiers</h2>
              <button onClick={() => { setEditingNoteId(null); setNewNoteData({ name: '', content: '', files: [] }); setIsAddingNote(true); }} className="flex items-center space-x-3 bg-primary text-white px-8 py-4 rounded-[22px] font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/30 hover:scale-105 transition-all">
                <Plus className="w-5 h-5" />
                <span>Nieuwe Notitie</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(project.attachments || []).map(at => (
                <div key={at.id} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 p-8 rounded-[40px] shadow-sm hover:shadow-card-hover hover:border-primary/30 transition-all group relative flex flex-col h-[420px] font-subtitle overflow-hidden">
                  <div className="flex items-center space-x-5 mb-6">
                    <div className="p-4 rounded-2xl bg-secondary/15 text-secondary"><StickyNote className="w-6 h-6" /></div>
                    <div className="min-w-0 flex-grow">
                      <h4 className="font-black text-sm md:text-base text-text-main dark:text-white truncate font-sans">{at.name}</h4>
                      <p className="text-[11px] font-black text-text-muted dark:text-slate-400 uppercase tracking-widest mt-1 opacity-70">
                        Dossier {at.createdAt && ` • ${format(new Date(at.createdAt), 'dd MMM yyyy', { locale: nl })}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex-grow mb-6 bg-slate-50 dark:bg-dark/40 p-6 rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden flex flex-col">
                    <div 
                      className="text-xs md:text-sm text-text-muted dark:text-slate-300 line-clamp-[4] leading-relaxed rich-content flex-shrink-0"
                      dangerouslySetInnerHTML={{ __html: at.content || '' }}
                    />
                    
                    {at.files && at.files.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 space-y-2 overflow-y-auto max-h-[100px] scrollbar-hide">
                        {at.files.map(file => (
                          <div key={file.id} className="flex items-center justify-between text-[10px] font-bold text-primary bg-white/50 dark:bg-white/5 p-2 rounded-xl">
                            <div className="flex items-center space-x-2 truncate">
                              {getFileIcon(file.fileType)}
                              <span className="truncate">{file.name}</span>
                            </div>
                            <a href={file.url} download={file.name} className="hover:text-primary-hover p-1"><ExternalLink className="w-3.5 h-3.5" /></a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 mt-auto relative z-10 pt-4 border-t border-slate-50 dark:border-white/5">
                    <button onClick={() => setViewingNote(at)} className="flex-grow bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center space-x-2 dark:text-white">
                      <FolderOpen className="w-4 h-4" /><span>Openen</span>
                    </button>
                    
                    <button onClick={() => handleStartEditNote(at)} className="p-3 bg-primary/5 text-primary hover:bg-primary hover:text-white rounded-2xl transition-all"><Edit3 className="w-5 h-5" /></button>
                    <button onClick={() => onUpdate({ ...project, attachments: project.attachments.filter(a => a.id !== at.id) })} className="p-3 bg-danger/5 text-danger hover:bg-danger hover:text-white rounded-2xl transition-all"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
              {(!project.attachments || project.attachments.length === 0) && (
                <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[50px] bg-slate-50 dark:bg-white/5">
                   <StickyNote className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-20" />
                   <p className="text-sm font-black uppercase tracking-widest text-text-muted dark:text-slate-500">Geen dossiers gevonden</p>
                </div>
              )}
            </div>

            {isAddingNote && (
              <div className="fixed inset-0 z-[4000] flex items-center justify-center p-6 bg-dark/80 backdrop-blur-2xl animate-in fade-in duration-300">
                <div className="bg-white dark:bg-dark-card border border-white/10 rounded-[50px] w-full max-w-4xl p-10 md:p-14 shadow-3xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="text-3xl font-black tracking-tight text-text-main dark:text-white">
                      {editingNoteId ? 'Bewerk Dossier' : 'Nieuw Dossier'}
                    </h3>
                    <button onClick={() => { setIsAddingNote(false); setEditingNoteId(null); setIsLinkPopupOpen(false); }} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full hover:text-danger transition-colors"><X className="w-8 h-8 dark:text-white" /></button>
                  </div>

                  <div className="flex-grow overflow-y-auto pr-2 space-y-10 scrollbar-hide relative">
                    <div className="space-y-8">
                      <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-text-muted dark:text-slate-400 opacity-80 ml-4">Titel</label>
                        <input type="text" value={newNoteData.name} onChange={e => setNewNoteData({...newNoteData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-dark border-2 border-transparent focus:border-primary px-8 py-5 rounded-3xl outline-none font-black text-xl dark:text-white transition-all shadow-sm" placeholder="Onderwerp..." />
                      </div>
                      
                      <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest text-text-muted dark:text-slate-400 opacity-80 ml-4">Inhoud</label>
                        <div className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-dark rounded-2xl border border-slate-200 dark:border-white/10 w-fit relative">
                          <button type="button" onMouseDown={(e) => { e.preventDefault(); execCommand('bold'); }} className="p-3 hover:bg-primary/10 hover:text-primary rounded-xl transition-all text-text-muted dark:text-slate-300"><Bold className="w-5 h-5" /></button>
                          <button type="button" onMouseDown={(e) => { e.preventDefault(); execCommand('italic'); }} className="p-3 hover:bg-primary/10 hover:text-primary rounded-xl transition-all text-text-muted dark:text-slate-300"><Italic className="w-5 h-5" /></button>
                          <button type="button" onMouseDown={(e) => { e.preventDefault(); execCommand('underline'); }} className="p-3 hover:bg-primary/10 hover:text-primary rounded-xl transition-all text-text-muted dark:text-slate-300"><Underline className="w-5 h-5" /></button>
                          <button type="button" onMouseDown={(e) => { e.preventDefault(); execCommand('createLink'); }} className={`p-3 rounded-xl transition-all ${isLinkPopupOpen ? 'bg-primary text-white' : 'hover:bg-primary/10 hover:text-primary text-text-muted dark:text-slate-300'}`} title="Link invoegen"><LinkIcon className="w-5 h-5" /></button>
                          
                          {isLinkPopupOpen && (
                            <div className="absolute top-full left-0 mt-3 z-[4500] animate-in slide-in-from-top-2 duration-200">
                              <form onSubmit={handleApplyLink} className="bg-white dark:bg-dark-card border border-primary/20 shadow-2xl p-5 rounded-3xl flex items-center space-x-3 w-[400px]">
                                <Globe className="w-5 h-5 text-primary opacity-50 flex-shrink-0" />
                                <input 
                                  autoFocus
                                  type="text" 
                                  value={linkUrl} 
                                  onChange={e => setLinkUrl(e.target.value)}
                                  onKeyDown={e => e.key === 'Escape' && setIsLinkPopupOpen(false)}
                                  className="flex-grow bg-slate-50 dark:bg-dark border-none outline-none font-bold text-xs dark:text-white px-3 py-2 rounded-xl"
                                  placeholder="Typ of plak URL..."
                                />
                                <button type="submit" className="p-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all"><Check className="w-4 h-4" /></button>
                                <button type="button" onClick={() => setIsLinkPopupOpen(false)} className="p-2.5 bg-slate-100 dark:bg-dark text-text-muted rounded-xl hover:text-danger"><X className="w-4 h-4" /></button>
                              </form>
                            </div>
                          )}

                          <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-2"></div>
                          <button type="button" onMouseDown={(e) => { e.preventDefault(); execCommand('insertUnorderedList'); }} className="p-3 hover:bg-primary/10 hover:text-primary rounded-xl transition-all text-text-muted dark:text-slate-300"><List className="w-5 h-5" /></button>
                        </div>
                        <div 
                          ref={editorRef}
                          contentEditable
                          onBlur={saveSelection}
                          className="w-full bg-slate-50 dark:bg-dark border-2 border-transparent focus:border-primary px-8 py-8 rounded-[40px] outline-none font-medium text-base dark:text-white min-h-[250px] transition-all leading-relaxed overflow-y-auto rich-content shadow-sm"
                          data-placeholder="Schrijf hier je notitie..."
                        />
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest text-text-muted dark:text-slate-400 opacity-80 ml-4">Bijlagen</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {newNoteData.files.map(file => (
                            <div key={file.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-dark/60 border border-slate-200 dark:border-white/10 rounded-2xl">
                              <div className="flex items-center space-x-3 truncate">
                                {getFileIcon(file.fileType)}
                                <span className="text-xs font-bold dark:text-white truncate">{file.name}</span>
                              </div>
                              <button onClick={() => setNewNoteData(prev => ({ ...prev, files: prev.files.filter(f => f.id !== file.id) }))} className="text-danger p-1 hover:bg-danger/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          ))}
                          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center justify-center space-x-3 p-4 border-2 border-dashed border-primary/20 hover:border-primary hover:bg-primary/5 rounded-2xl transition-all"
                          >
                            <Paperclip className="w-5 h-5 text-primary" />
                            <span className="text-xs font-black uppercase tracking-widest text-primary">Bestand toevoegen</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-6 mt-10 pt-10 border-t border-slate-100 dark:border-white/5">
                    <button onClick={() => { setIsAddingNote(false); setEditingNoteId(null); setIsLinkPopupOpen(false); }} className="px-10 py-5 text-xs font-black text-text-muted uppercase tracking-[0.2em] dark:text-slate-500 hover:text-danger transition-colors">Annuleer</button>
                    <button onClick={handleSaveNote} className="px-14 py-5 bg-primary text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.03] transition-all">
                      {editingNoteId ? 'Bijwerken' : 'Bewaren'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {viewingNote && (
              <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6 bg-dark/80 backdrop-blur-3xl animate-in fade-in">
                <div className="bg-white dark:bg-dark-card border border-white/10 rounded-[60px] w-full max-w-4xl p-12 md:p-16 shadow-3xl overflow-hidden flex flex-col max-h-[85vh]">
                   <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center space-x-5 text-secondary">
                      <div className="p-4 bg-secondary/10 rounded-2xl"><StickyNote className="w-8 h-8" /></div>
                      <div>
                        <h3 className="text-3xl font-black tracking-tight text-text-main dark:text-white truncate max-w-lg">{viewingNote.name}</h3>
                        <p className="text-xs font-black uppercase tracking-widest text-text-muted dark:text-slate-400 mt-1 opacity-70">Project Dossier</p>
                      </div>
                    </div>
                    <button onClick={() => setViewingNote(null)} className="p-4 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-text-muted"><X className="w-10 h-10 dark:text-white" /></button>
                  </div>
                  <div className="flex-grow overflow-y-auto pr-4 scrollbar-hide font-subtitle">
                    <div className="bg-slate-50 dark:bg-dark/50 p-10 md:p-14 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-inner space-y-8">
                      <div 
                        className="text-base md:text-lg font-medium leading-relaxed dark:text-slate-200 rich-content prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: viewingNote.content || '' }}
                      />
                      {viewingNote.files && viewingNote.files.length > 0 && (
                        <div className="pt-8 border-t border-slate-200 dark:border-white/10">
                          <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center space-x-2"><Paperclip className="w-4 h-4" /><span>Bijlagen</span></h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {viewingNote.files.map(file => (
                              <a 
                                key={file.id} 
                                href={file.url} 
                                download={file.name}
                                className="flex items-center justify-between p-4 bg-white dark:bg-dark/60 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-primary transition-all group"
                              >
                                <div className="flex items-center space-x-3 truncate">
                                  {getFileIcon(file.fileType)}
                                  <span className="text-xs font-bold dark:text-white truncate">{file.name}</span>
                                </div>
                                <ExternalLink className="w-4 h-4 opacity-30 group-hover:opacity-100" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-10 pt-10 border-t border-slate-100 dark:border-white/5 flex justify-end space-x-4">
                    <button onClick={() => setViewingNote(null)} className="px-16 py-5 bg-primary text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.03] transition-all">
                      Sluiten
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isTaskModalOpen && (
        <TaskModal
          task={editingTask}
          initialPhaseId={preselectedPhaseId}
          phases={project.phases}
          projectTeam={projectTeam}
          onSave={editingTask ? handleUpdateTask : handleAddTask}
          onDelete={editingTask ? () => handleDeleteTask(editingTask.id) : undefined}
          onClose={() => { setIsTaskModalOpen(false); setEditingTask(undefined); setPreselectedPhaseId(undefined); }}
        />
      )}

      {isProjectModalOpen && (
        <ProjectModal 
          project={project}
          customers={customers}
          users={users}
          prices={prices}
          onSave={handleUpdateProjectDetails}
          onClose={() => setIsProjectModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ProjectDetails;
