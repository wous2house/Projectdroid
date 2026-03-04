
import React, { useState, useRef } from 'react';
import { Project, Task, TaskStatus, Phase, User } from '../types';
import { Plus, MoreHorizontal, CheckSquare, AlertCircle, Clock, Check, X, Edit2, Trash2, GripHorizontal } from 'lucide-react';
import { STATUS_COLORS } from '../constants';
import { isPast } from 'date-fns';

interface KanbanBoardProps {
  project: Project;
  users: User[];
  onMoveTask: (taskId: string, status: TaskStatus, phaseId?: string, targetIndex?: number) => void;
  onEditTask: (task: Task) => void;
  onAddTask: (phaseId: string) => void;
  onAddPhase?: (name: string) => void;
  onUpdatePhase?: (phaseId: string, name: string) => void;
  onDeletePhase?: (phaseId: string) => void;
  onReorderPhases?: (phases: Phase[]) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  project, 
  users,
  onMoveTask, 
  onEditTask, 
  onAddTask, 
  onAddPhase, 
  onUpdatePhase, 
  onDeletePhase,
  onReorderPhases
}) => {
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [activeMenuPhaseId, setActiveMenuPhaseId] = useState<string | null>(null);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editingPhaseName, setEditingPhaseName] = useState('');
  
  // Drag and Drop States
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedPhaseId, setDraggedPhaseId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ phaseId: string, index: number } | null>(null);
  const [phaseDropIndex, setPhaseDropIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleAddPhase = () => {
    if (newPhaseName.trim() && onAddPhase) {
      onAddPhase(newPhaseName.trim());
      setNewPhaseName('');
      setIsAddingPhase(false);
    }
  };

  const startEditingPhase = (phase: Phase) => {
    setEditingPhaseId(phase.id);
    setEditingPhaseName(phase.name);
    setActiveMenuPhaseId(null);
  };

  const savePhaseName = () => {
    if (editingPhaseName.trim() && editingPhaseId && onUpdatePhase) {
      onUpdatePhase(editingPhaseId, editingPhaseName.trim());
      setEditingPhaseId(null);
    }
  };

  // Phase Drag Handlers
  const handleDragPhaseStart = (e: React.DragEvent, phaseId: string) => {
    e.dataTransfer.setData('type', 'phase');
    e.dataTransfer.setData('phaseId', phaseId);
    setDraggedPhaseId(phaseId);
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };

  const handleDragOverContainer = (e: React.DragEvent) => {
    if (!draggedPhaseId) return;
    e.preventDefault();
    
    const columns = Array.from(containerRef.current?.querySelectorAll('.phase-column-wrapper') || []) as HTMLElement[];
    const mouseX = e.clientX;
    
    let targetIdx = project.phases.length;
    for (let i = 0; i < columns.length; i++) {
      const rect = columns[i].getBoundingClientRect();
      const midpoint = rect.left + rect.width / 2;
      if (mouseX < midpoint) {
        targetIdx = i;
        break;
      }
    }

    if (phaseDropIndex !== targetIdx) {
      setPhaseDropIndex(targetIdx);
    }
  };

  // Task Drag Handlers
  const handleDragTaskStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('type', 'task');
    e.dataTransfer.setData('taskId', taskId);
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverPhase = (e: React.DragEvent, phaseId: string) => {
    if (!draggedTaskId) return;
    e.preventDefault();
    
    const tasksInPhase = project.tasks.filter(t => t.phaseId === phaseId);
    if (dropIndicator?.phaseId !== phaseId || dropIndicator?.index !== tasksInPhase.length) {
      setDropIndicator({ phaseId, index: tasksInPhase.length });
    }
  };

  const handleDragOverTask = (e: React.DragEvent, phaseId: string, index: number, targetTaskId: string) => {
    if (!draggedTaskId || draggedTaskId === targetTaskId) return;
    e.preventDefault();
    e.stopPropagation(); 
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const newIndex = e.clientY < midpoint ? index : index + 1;
    
    if (dropIndicator?.phaseId !== phaseId || dropIndicator?.index !== newIndex) {
      setDropIndicator({ phaseId, index: newIndex });
    }
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDraggedPhaseId(null);
    setDropIndicator(null);
    setPhaseDropIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetPhaseId?: string) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    
    if (type === 'task' && targetPhaseId) {
      const taskId = e.dataTransfer.getData('taskId');
      const targetIndex = dropIndicator?.phaseId === targetPhaseId ? dropIndicator.index : undefined;
      
      const task = project.tasks.find(t => t.id === taskId);
      if (task) {
        const newStatus = task.status === TaskStatus.TODO ? TaskStatus.IN_PROGRESS : task.status;
        onMoveTask(taskId, newStatus, targetPhaseId, targetIndex);
      }
    } else if (type === 'phase') {
      const draggedPhaseId = e.dataTransfer.getData('phaseId');
      if (phaseDropIndex === null) return;

      const currentIdx = project.phases.findIndex(p => p.id === draggedPhaseId);
      let targetIdx = phaseDropIndex;
      
      if (currentIdx < targetIdx) targetIdx--;
      if (currentIdx === targetIdx) {
        handleDragEnd();
        return;
      }

      const newPhases = [...project.phases].sort((a, b) => a.order - b.order);
      const [removed] = newPhases.splice(currentIdx, 1);
      newPhases.splice(targetIdx, 0, removed);
      
      const orderedPhases = newPhases.map((p, i) => ({ ...p, order: i }));
      onReorderPhases?.(orderedPhases);
    }
    
    handleDragEnd();
  };

  const PhantomCard = () => (
    <div className="w-full h-40 border-2 border-dashed border-primary/40 bg-primary/10 rounded-[32px] animate-pulse mb-8 pointer-events-none" />
  );

  const PhasePhantom = () => (
    <div className="flex-shrink-0 w-[340px] h-full min-h-[600px] bg-primary/10 border-4 border-dashed border-primary/20 rounded-[48px] animate-pulse pointer-events-none self-stretch" />
  );

  const sortedPhases = [...project.phases].sort((a, b) => a.order - b.order);

  return (
    <div 
      ref={containerRef}
      onDragOver={handleDragOverContainer}
      onDrop={(e) => !draggedTaskId && handleDrop(e)}
      className="flex space-x-10 overflow-x-auto pb-12 -mx-4 px-4 h-full min-h-[750px] font-sans scroll-smooth items-stretch"
    >
      {sortedPhases.map((phase, pIdx) => {
        const tasksInPhase = project.tasks
          .filter(t => t.phaseId === phase.id)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        const isBeingDragged = draggedPhaseId === phase.id;
        const showPhasePhantomBefore = phaseDropIndex === pIdx && draggedPhaseId;

        return (
          <React.Fragment key={phase.id}>
            {showPhasePhantomBefore && <PhasePhantom />}
            
            <div 
              className={`phase-column-wrapper flex-shrink-0 w-[340px] flex flex-col group/column transition-all ${isBeingDragged ? 'opacity-20 scale-95 grayscale' : ''}`}
            >
              <div 
                className={`phase-column flex flex-col h-full bg-slate-100/50 dark:bg-dark-card/40 rounded-[48px] border border-slate-200 dark:border-white/5 shadow-sm transition-all ${isBeingDragged ? 'border-dashed border-primary/40' : ''}`}
                onDragOver={(e) => handleDragOverPhase(e, phase.id)}
                onDrop={(e) => draggedTaskId && handleDrop(e, phase.id)}
              >
                {/* Phase Header */}
                <div 
                  className="p-8 flex items-center justify-between border-b border-slate-200 dark:border-white/5 font-subtitle bg-slate-50/50 dark:bg-dark/30 rounded-t-[48px] cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => handleDragPhaseStart(e, phase.id)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex items-center space-x-4 flex-grow min-w-0 pointer-events-none">
                    <GripHorizontal className="w-4 h-4 text-text-muted opacity-20 group-hover/column:opacity-60 transition-opacity" />
                    {editingPhaseId === phase.id ? (
                      <div className="flex items-center space-x-2 w-full pointer-events-auto">
                        <input 
                          autoFocus
                          className="bg-white dark:bg-dark border border-primary rounded-lg px-2 py-1 text-xs font-black w-full outline-none dark:text-white"
                          value={editingPhaseName}
                          onChange={(e) => setEditingPhaseName(e.target.value)}
                          onBlur={savePhaseName}
                          onKeyDown={(e) => e.key === 'Enter' && savePhaseName()}
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="font-black text-text-main dark:text-white uppercase tracking-[0.2em] text-xs opacity-80 truncate">{phase.name}</h3>
                        <span className="bg-primary text-white px-3 py-1 rounded-full text-[11px] font-black shadow-md shadow-primary/20 flex-shrink-0">
                          {tasksInPhase.length}
                        </span>
                      </>
                    )}
                  </div>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenuPhaseId(activeMenuPhaseId === phase.id ? null : phase.id)}
                      className="p-2.5 hover:bg-slate-200 dark:hover:bg-dark rounded-2xl transition-all text-text-muted"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    
                    {activeMenuPhaseId === phase.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveMenuPhaseId(null)}></div>
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <button 
                            onClick={() => startEditingPhase(phase)}
                            className="w-full flex items-center space-x-3 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-text-main dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5"
                          >
                            <Edit2 className="w-4 h-4 text-primary" />
                            <span>Naam wijzigen</span>
                          </button>
                          <button 
                            onClick={() => { onDeletePhase?.(phase.id); setActiveMenuPhaseId(null); }}
                            className="w-full flex items-center space-x-3 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-danger hover:bg-danger/5 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Fase verwijderen</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Task List */}
                <div 
                  className="flex-grow p-6 space-y-8 overflow-y-auto scrollbar-hide min-h-[100px]"
                  onDragOver={(e) => handleDragOverPhase(e, phase.id)}
                >
                  {tasksInPhase.map((task, idx) => {
                    const isOverdue = task.status !== TaskStatus.DONE && task.endDate && isPast(new Date(task.endDate));
                    const isTaskDragging = draggedTaskId === task.id;
                    const showPlaceholderBefore = dropIndicator?.phaseId === phase.id && dropIndicator?.index === idx;

                    return (
                      <React.Fragment key={task.id}>
                        {showPlaceholderBefore && <PhantomCard />}
                        <div 
                          onClick={() => onEditTask(task)}
                          draggable
                          onDragStart={(e) => handleDragTaskStart(e, task.id)}
                          onDragOver={(e) => handleDragOverTask(e, phase.id, idx, task.id)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white dark:bg-dark-card p-7 rounded-[32px] shadow-sm border-2 ${isOverdue ? 'border-danger/40 bg-danger/[0.02]' : 'border-transparent'} hover:border-primary hover:shadow-card-hover transition-all cursor-grab active:cursor-grabbing group hover:-translate-y-2 ${isTaskDragging ? 'opacity-20 scale-95 border-dashed border-primary/20' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-5 font-subtitle pointer-events-none">
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 ${STATUS_COLORS[task.status]}`}>
                              {task.status}
                            </span>
                            {task.estimatedHours && (
                              <div className="flex items-center space-x-1.5 text-text-muted dark:text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity">
                                <Clock className="w-4 h-4" />
                                <span className="text-[11px] font-black">{task.estimatedHours}u</span>
                              </div>
                            )}
                          </div>
                          
                          <h4 className="font-black text-base mb-6 text-text-main dark:text-white group-hover:text-primary transition-colors leading-tight tracking-tight font-sans pointer-events-none">
                            {task.name}
                          </h4>

                          <div className="flex items-center justify-between mt-8 font-subtitle pt-5 border-t border-slate-50 dark:border-white/5 pointer-events-none">
                            <div className="flex -space-x-3">
                              {task.assignees.slice(0, 4).map(uId => {
                                const user = users.find(u => u.id === uId);
                                return (
                                  <img 
                                    key={uId} 
                                    src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uId}`} 
                                    className="w-10 h-10 rounded-xl border-2 border-white dark:border-dark-card shadow-sm object-cover bg-white" 
                                    alt="Assignee" 
                                  />
                                );
                              })}
                            </div>

                            <div className="flex items-center space-x-4 text-text-muted">
                              {isOverdue && <AlertCircle className="w-5 h-5 text-danger animate-pulse" />}
                              {task.subtasks.length > 0 && (
                                <div className="flex items-center space-x-2 bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-white/5">
                                  <CheckSquare className="w-4 h-4 text-primary" />
                                  <span className="text-[11px] font-black dark:text-slate-300">
                                    {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {dropIndicator?.phaseId === phase.id && dropIndicator?.index >= tasksInPhase.length && (
                    <PhantomCard />
                  )}

                  <button 
                    onClick={() => onAddTask(phase.id)}
                    className="w-full py-8 border-3 border-dashed border-slate-200 dark:border-white/10 rounded-[32px] flex flex-col items-center justify-center space-y-3 text-text-muted dark:text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/[0.04] transition-all group font-subtitle"
                  >
                    <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all">
                      <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Taak Toevoegen</span>
                  </button>
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}

      {phaseDropIndex === project.phases.length && draggedPhaseId && <PhasePhantom />}

      <div className="flex-shrink-0 w-[340px] flex flex-col group self-start h-fit">
        {isAddingPhase ? (
          <div className="bg-white dark:bg-dark-card/60 p-8 rounded-[40px] border-2 border-primary/20 shadow-xl space-y-6 animate-in zoom-in-95 duration-200">
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-primary">Nieuwe Fase</h3>
            <input 
              autoFocus
              type="text" 
              value={newPhaseName}
              onChange={e => setNewPhaseName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddPhase()}
              className="w-full bg-slate-50 dark:bg-dark/50 border-2 border-transparent focus:border-primary p-4 rounded-2xl outline-none font-bold text-sm dark:text-white"
              placeholder="Fase naam..."
            />
            <div className="flex items-center space-x-3">
              <button onClick={() => setIsAddingPhase(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-danger transition-colors">Annuleren</button>
              <button onClick={handleAddPhase} className="flex-1 py-3 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 flex items-center justify-center space-x-2">
                <Check className="w-3 h-3" />
                <span>Opslaan</span>
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsAddingPhase(true)}
            className="flex flex-col items-center justify-center p-10 border-4 border-dashed border-slate-200 dark:border-white/10 rounded-[48px] bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/40 transition-all min-h-[300px] text-text-muted group/btn"
          >
            <div className="p-5 bg-slate-100 dark:bg-white/5 rounded-3xl mb-5 group-hover/btn:bg-primary group-hover/btn:text-white transition-all group-hover/btn:scale-110">
              <Plus className="w-8 h-8" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.3em] font-subtitle">Fase Toevoegen</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default KanbanBoard;
