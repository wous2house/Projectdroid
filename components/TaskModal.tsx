
import React, { useState, useRef } from 'react';
import { Task, TaskStatus, Phase, Subtask, Attachment, User } from '../types';
import { X, Trash2, Plus, Calendar, AlignLeft, CheckSquare, Paperclip, Link as LinkIcon, FileText, ExternalLink, Globe, FileSpreadsheet, Clock, Upload, File as FileIcon, User as UserIcon, Check } from 'lucide-react';
import { format } from 'date-fns';

export interface TaskModalProps {
  task?: Task;
  initialPhaseId?: string;
  phases: Phase[];
  projectTeam: User[];
  onSave: (task: Task) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, initialPhaseId, phases, projectTeam, onSave, onDelete, onClose }) => {
  const [name, setName] = useState(task?.name || '');
  const [description, setDescription] = useState(task?.description || '');
  const [status, setStatus] = useState<TaskStatus>(task?.status || TaskStatus.TODO);
  const [phaseId, setPhaseId] = useState(task?.phaseId || initialPhaseId || phases[0]?.id || '');
  const [startDate, setStartDate] = useState(task?.startDate || format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(task?.endDate || format(new Date(), 'yyyy-MM-dd'));
  const [estimatedHours, setEstimatedHours] = useState(task?.estimatedHours || 1);
  const [notes, setNotes] = useState(task?.notes || '');
  const [assignees, setAssignees] = useState<string[]>(task?.assignees || []);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks || []);
  const [attachments, setAttachments] = useState<Attachment[]>(task?.attachments || []);
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [isAddingAttachment, setIsAddingAttachment] = useState(false);
  const [attachmentType, setAttachmentType] = useState<'upload' | 'link'>('upload');
  const [newAttachData, setNewAttachData] = useState({ name: '', url: '', type: 'link' as 'link' | 'file', fileType: 'web' as Attachment['fileType'] });
  
  const [activeSubtaskAssigneeMenu, setActiveSubtaskAssigneeMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleTaskAssignee = (userId: string) => {
    setAssignees(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const addSubtask = () => {
    if (!newSubtaskName.trim()) return;
    const newSub: Subtask = {
      id: crypto.randomUUID(),
      name: newSubtaskName,
      isCompleted: false,
      assigneeId: undefined
    };
    setSubtasks([...subtasks, newSub]);
    setNewSubtaskName('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        let fileType: NonNullable<Attachment['fileType']> = 'web';
        if (fileExt === 'pdf') fileType = 'pdf';
        else if (['doc', 'docx'].includes(fileExt || '')) fileType = 'docx';
        else if (['xls', 'xlsx', 'csv'].includes(fileExt || '')) fileType = 'xlsx';
        
        const newAttach: Attachment = {
          id: crypto.randomUUID(),
          name: file.name,
          url: reader.result as string,
          type: 'file',
          fileType: fileType,
          createdAt: new Date().toISOString()
        };
        setAttachments([...attachments, newAttach]);
        setIsAddingAttachment(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const addLinkAttachment = () => {
    if (!newAttachData.name.trim() || !newAttachData.url.trim()) return;
    const newAttach: Attachment = {
      id: crypto.randomUUID(),
      name: newAttachData.name,
      url: newAttachData.url,
      type: 'link',
      fileType: newAttachData.fileType,
      createdAt: new Date().toISOString()
    };
    setAttachments([...attachments, newAttach]);
    setNewAttachData({ name: '', url: '', type: 'link', fileType: 'web' });
    setIsAddingAttachment(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: task?.id || crypto.randomUUID(),
      name,
      description,
      status,
      phaseId,
      startDate,
      endDate,
      scheduledDate: startDate,
      estimatedHours,
      notes,
      assignees,
      subtasks,
      attachments
    });
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-danger" />;
      case 'xlsx': return <FileSpreadsheet className="w-5 h-5 text-success" />;
      case 'google-doc': return <FileText className="w-5 h-5 text-primary" />;
      case 'google-sheet': return <FileSpreadsheet className="w-5 h-5 text-success" />;
      case 'web': return <Globe className="w-5 h-5 text-info" />;
      default: return <FileIcon className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-2 sm:p-6 bg-dark/90 backdrop-blur-xl animate-in fade-in duration-500 overflow-y-auto">
      <div className="bg-white dark:bg-dark-card border border-light dark:border-white/10 rounded-[24px] sm:rounded-[40px] w-full max-w-6xl my-auto shadow-3xl flex flex-col animate-in zoom-in-95">
        
        <div className="p-5 sm:p-8 border-b border-light dark:border-white/5 flex justify-between items-center bg-light/30 dark:bg-dark/40 sticky top-0 z-10">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="p-2 sm:p-3 bg-primary rounded-xl sm:rounded-2xl shadow-lg">
              <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-text-main dark:text-white truncate">{task ? 'Bewerken' : 'Nieuwe Taak'}</h2>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {onDelete && <button type="button" onClick={onDelete} className="p-2 sm:p-3 text-danger hover:bg-danger/10 rounded-xl transition-colors"><Trash2 className="w-5 h-5 sm:w-6 sm:h-6" /></button>}
            <button type="button" onClick={onClose} className="p-2 sm:p-3 text-text-muted hover:bg-light dark:hover:bg-dark rounded-xl transition-colors dark:text-white"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
          </div>
        </div>

        <form onSubmit={handleSave} className="flex-grow grid grid-cols-1 lg:grid-cols-12 font-sans overflow-visible">
          <div className="lg:col-span-8 p-6 sm:p-10 space-y-8 sm:space-y-12 border-r border-light dark:border-white/5">
            <input
              autoFocus
              className="text-3xl sm:text-5xl font-black bg-transparent border-none outline-none w-full placeholder:text-text-muted/20 text-primary dark:text-primary transition-all font-sans leading-tight tracking-tight"
              placeholder="Wat moet er gebeuren?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="space-y-3 sm:space-y-4 font-subtitle">
              <label className="flex items-center space-x-2 sm:space-x-3 text-[9px] sm:text-[10px] font-black text-primary dark:text-blue-300 uppercase tracking-widest ml-1">
                <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Assignees</span>
              </label>
              <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
                {projectTeam.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleTaskAssignee(u.id)}
                    className={`group relative transition-all ${assignees.includes(u.id) ? 'scale-105 sm:scale-110' : 'opacity-40 grayscale'}`}
                  >
                    <img 
                      src={u.avatar} 
                      className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-[22px] border-4 ${assignees.includes(u.id) ? 'border-primary shadow-xl shadow-primary/20' : 'border-transparent'}`} 
                      title={u.name}
                    />
                    {assignees.includes(u.id) && (
                      <div className="absolute -top-1 -right-1 bg-primary text-white p-1 rounded-full border-2 border-white dark:border-dark-card shadow-lg">
                        <Check className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4 font-subtitle">
              <label className="flex items-center space-x-2 text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-widest ml-1"><AlignLeft className="w-3.5 h-3.5" /><span>Details</span></label>
              <textarea 
                className="w-full bg-light/30 dark:bg-dark/50 rounded-3xl p-6 sm:p-8 text-sm sm:text-base font-medium min-h-[150px] outline-none border-2 border-transparent focus:border-primary/30 text-text-main dark:text-white transition-all shadow-inner"
                placeholder="Details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            
            <div className="space-y-6 font-subtitle">
              <label className="flex items-center space-x-2 text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-widest ml-1"><CheckSquare className="w-3.5 h-3.5" /><span>Checklist</span></label>
              <div className="space-y-3">
                {subtasks.map(s => (
                  <div key={s.id} className="flex items-center space-x-4 p-4 bg-light/20 dark:bg-dark/30 rounded-2xl border border-transparent hover:border-primary/10 transition-all">
                    <input type="checkbox" checked={s.isCompleted} onChange={() => setSubtasks(subtasks.map(st => st.id === s.id ? { ...st, isCompleted: !st.isCompleted } : st))} className="w-5 h-5 rounded-lg border-primary text-primary focus:ring-primary/20" />
                    <span className={`text-xs sm:text-sm font-bold flex-grow truncate ${s.isCompleted ? 'line-through opacity-40' : 'dark:text-white'}`}>{s.name}</span>
                    <button type="button" onClick={() => setSubtasks(subtasks.filter(st => st.id !== s.id))} className="text-danger opacity-40 hover:opacity-100 p-1"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                <div className="flex items-center space-x-4 mt-6 p-2 bg-primary/5 rounded-2xl">
                  <input type="text" placeholder="Subtaak toevoegen..." value={newSubtaskName} onChange={(e) => setNewSubtaskName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())} className="flex-grow bg-transparent border-none px-4 py-2 text-sm font-bold outline-none dark:text-white" />
                  <button type="button" onClick={addSubtask} className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all"><Plus className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 p-6 sm:p-10 bg-light/30 dark:bg-dark/40 space-y-8 sm:space-y-10 font-subtitle">
            <div className="space-y-3">
              <label className="text-[9px] sm:text-[10px] font-black uppercase text-primary ml-1 flex items-center space-x-2"><span>Status</span></label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="w-full bg-white dark:bg-dark rounded-2xl px-5 py-4 text-xs sm:text-sm font-black outline-none border border-light dark:border-white/5 dark:text-white shadow-sm appearance-none cursor-pointer hover:border-primary/30 transition-all">{Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}</select>
            </div>
            
            <div className="space-y-3">
              <label className="text-[9px] sm:text-[10px] font-black uppercase text-primary ml-1">Fase</label>
              <select value={phaseId} onChange={(e) => setPhaseId(e.target.value)} className="w-full bg-white dark:bg-dark rounded-2xl px-5 py-4 text-xs sm:text-sm font-black outline-none border border-light dark:border-white/5 dark:text-white shadow-sm appearance-none cursor-pointer hover:border-primary/30 transition-all">{phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] sm:text-[10px] font-black uppercase text-primary ml-1">Uren inschatting</label>
              <div className="relative group">
                <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-50 group-focus-within:opacity-100 transition-opacity" />
                <input 
                  type="number" 
                  min="0.5" 
                  step="0.5" 
                  value={estimatedHours} 
                  onChange={e => setEstimatedHours(parseFloat(e.target.value))} 
                  className="w-full bg-white dark:bg-dark border border-light dark:border-white/5 focus:border-primary/40 rounded-2xl pl-14 pr-6 py-4 text-xs sm:text-sm font-black outline-none dark:text-white shadow-sm transition-all" 
                  placeholder="1.0"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] sm:text-[10px] font-black uppercase text-primary ml-1">Planning</label>
              <div className="space-y-4">
                <div className="bg-white dark:bg-dark p-5 rounded-2xl border border-light dark:border-white/5 flex flex-col space-y-2 shadow-sm">
                  <span className="text-[8px] font-black uppercase opacity-60 flex items-center space-x-2"><Calendar className="w-3 h-3" /><span>Start</span></span>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-xs sm:text-sm font-black outline-none dark:text-white w-full cursor-pointer" />
                </div>
                <div className="bg-white dark:bg-dark p-5 rounded-2xl border border-light dark:border-white/5 flex flex-col space-y-2 shadow-sm group">
                  <span className="text-[8px] font-black uppercase text-danger flex items-center space-x-2"><Clock className="w-3 h-3" /><span>Deadline</span></span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-xs sm:text-sm font-black outline-none text-danger w-full cursor-pointer" />
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 sm:p-10 bg-light/30 dark:bg-dark/40 border-t border-light dark:border-white/5 flex justify-end items-center space-x-4 sm:space-x-8 sticky bottom-0 z-10">
          <button type="button" onClick={onClose} className="px-6 sm:px-10 py-3 sm:py-4 rounded-2xl text-[10px] sm:text-xs font-black text-text-muted dark:text-white/60 uppercase tracking-widest hover:text-danger transition-colors">Annuleren</button>
          <button type="button" onClick={handleSave} className="flex-1 sm:flex-none px-12 sm:px-20 py-4 sm:py-5 rounded-[24px] font-black text-xs sm:text-sm bg-primary text-white uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.03] active:scale-95 transition-all">Opslaan</button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
