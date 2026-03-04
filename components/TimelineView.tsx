
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Project, Task, TaskStatus } from '../types';
import { format, addDays, endOfMonth, eachDayOfInterval, isSameDay, isAfter, startOfMonth, addMonths, parse } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Plus, Target, Calendar as CalendarIcon } from 'lucide-react';

interface TimelineViewProps {
  project: Project;
  onUpdateTask?: (taskId: string, startDate: string, endDate: string) => void;
  onAddTask?: (phaseId: string) => void;
  onEditTask?: (task: Task) => void;
  onEditProject?: () => void;
}

const COLUMN_WIDTH = 56;
const SIDEBAR_WIDTH = 256;

// Helper to parse YYYY-MM-DD string into a local Date object (midnight)
const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  return parse(dateStr, 'yyyy-MM-dd', new Date());
};

const TimelineView: React.FC<TimelineViewProps> = ({ project, onUpdateTask, onAddTask, onEditTask, onEditProject }) => {
  const [draggingTask, setDraggingTask] = useState<{ id: string, startX: number, originalStart: Date, originalEnd: Date, mode: 'move' | 'resize-start' | 'resize-end', hasMoved: boolean } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [panStartX, setPanStartX] = useState(0);
  const [panScrollLeft, setPanScrollLeft] = useState(0);

  const timelineDates = useMemo(() => {
    const now = new Date();
    const taskDates = project.tasks
      .map(t => [t.startDate, t.endDate])
      .flat()
      .filter(Boolean)
      .map(d => parseLocalDate(d as string));
    
    const minTaskDate = taskDates.length > 0 ? new Date(Math.min(...taskDates.map(d => d.getTime()))) : now;
    const maxTaskDate = taskDates.length > 0 ? new Date(Math.max(...taskDates.map(d => d.getTime()))) : now;
    
    const start = startOfMonth(addMonths(new Date(Math.min(minTaskDate.getTime(), now.getTime())), -2));
    const end = endOfMonth(addMonths(new Date(Math.max(maxTaskDate.getTime(), now.getTime())), 18));
    
    return eachDayOfInterval({ start, end });
  }, [project.tasks]);

  const totalDays = timelineDates.length;

  useEffect(() => {
    if (containerRef.current) {
      const todayIdx = timelineDates.findIndex(d => isSameDay(d, new Date()));
      if (todayIdx !== -1) {
        const scrollPos = todayIdx * COLUMN_WIDTH - (containerRef.current.clientWidth / 2) + (SIDEBAR_WIDTH / 2);
        containerRef.current.scrollLeft = scrollPos;
      }
    }
  }, [timelineDates]);

  const scrollToToday = () => {
    if (containerRef.current) {
      const todayIdx = timelineDates.findIndex(d => isSameDay(d, new Date()));
      if (todayIdx !== -1) {
        const scrollPos = todayIdx * COLUMN_WIDTH - (containerRef.current.clientWidth / 2) + (SIDEBAR_WIDTH / 2);
        containerRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
      }
    }
  };

  const handleTaskMouseDown = (e: React.MouseEvent, taskId: string, start: string, end: string, mode: 'move' | 'resize-start' | 'resize-end') => {
    e.stopPropagation();
    setDraggingTask({
      id: taskId,
      startX: e.clientX,
      originalStart: parseLocalDate(start),
      originalEnd: parseLocalDate(end),
      mode,
      hasMoved: false
    });
  };

  const handleTaskClick = (e: React.MouseEvent, task: Task) => {
    if (draggingTask?.hasMoved) return;
    onEditTask?.(task);
  };

  const handlePanMouseDown = (e: React.MouseEvent) => {
    if (draggingTask) return;
    setIsPanning(true);
    setPanStartX(e.pageX - (containerRef.current?.offsetLeft || 0));
    setPanScrollLeft(containerRef.current?.scrollLeft || 0);
  };

  const handlePanMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - (containerRef.current.offsetLeft || 0);
    const walk = (x - panStartX) * 1.5;
    containerRef.current.scrollLeft = panScrollLeft - walk;
  };

  const stopPanning = () => {
    setIsPanning(false);
  };

  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      if (!draggingTask) return;
      const diffX = e.clientX - draggingTask.startX;
      if (Math.abs(diffX) > 3 && !draggingTask.hasMoved) {
        setDraggingTask(prev => prev ? { ...prev, hasMoved: true } : null);
      }
      setDragOffset(diffX);
    };

    const handleMouseUpGlobal = () => {
      if (!draggingTask || !onUpdateTask) {
        setDraggingTask(null);
        setDragOffset(0);
        return;
      }

      if (draggingTask.hasMoved) {
        const daysDiff = Math.round(dragOffset / COLUMN_WIDTH);
        if (daysDiff !== 0) {
          let newStart = new Date(draggingTask.originalStart);
          let newEnd = new Date(draggingTask.originalEnd);

          if (draggingTask.mode === 'move') {
            newStart = addDays(draggingTask.originalStart, daysDiff);
            newEnd = addDays(draggingTask.originalEnd, daysDiff);
          } else if (draggingTask.mode === 'resize-start') {
            newStart = addDays(draggingTask.originalStart, daysDiff);
            if (newStart >= newEnd) newStart = addDays(newEnd, -1);
          } else if (draggingTask.mode === 'resize-end') {
            newEnd = addDays(draggingTask.originalEnd, daysDiff);
            if (newEnd <= newStart) newEnd = addDays(newStart, 1);
          }

          onUpdateTask(draggingTask.id, format(newStart, 'yyyy-MM-dd'), format(newEnd, 'yyyy-MM-dd'));
        }
      }

      setTimeout(() => {
        setDraggingTask(null);
        setDragOffset(0);
      }, 0);
    };

    if (draggingTask) {
      window.addEventListener('mousemove', handleMouseMoveGlobal);
      window.addEventListener('mouseup', handleMouseUpGlobal);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
      window.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, [draggingTask, dragOffset, onUpdateTask]);

  return (
    <div className="bg-white dark:bg-dark-card border border-light dark:border-white/5 rounded-[32px] overflow-hidden shadow-2xl flex flex-col h-[750px] font-sans transition-colors duration-300 relative">
      <div className="p-6 border-b border-light dark:border-white/5 flex justify-between items-center bg-light/30 dark:bg-dark/30 z-40">
        <div className="flex items-center space-x-6">
          <h3 className="font-black text-text-main dark:text-white flex items-center space-x-3 uppercase tracking-widest text-sm">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <span>Project Tijdlijn</span>
          </h3>
          <button 
            onClick={scrollToToday}
            className="flex items-center space-x-2 bg-white dark:bg-dark px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/20 hover:border-primary transition-all text-primary shadow-sm active:scale-95"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Vandaag</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-[10px] text-text-muted font-bold font-subtitle opacity-60 uppercase tracking-widest">
            {format(timelineDates[0], 'MMM yyyy', { locale: nl })} — {format(timelineDates[totalDays-1], 'MMM yyyy', { locale: nl })}
          </div>
          {draggingTask && draggingTask.hasMoved && (
            <div className="flex items-center space-x-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full animate-pulse border border-primary/20">
              <span className="text-[10px] font-black uppercase tracking-widest">
                {draggingTask.mode === 'move' ? 'Slepen...' : 'Aanpassen...'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div 
        ref={containerRef}
        onMouseDown={handlePanMouseDown}
        onMouseMove={handlePanMouseMove}
        onMouseUp={stopPanning}
        onMouseLeave={stopPanning}
        className={`flex-grow overflow-x-auto overflow-y-auto relative font-subtitle scrollbar-default dark:scrollbar-dark select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div className="inline-block" style={{ width: `${totalDays * COLUMN_WIDTH + SIDEBAR_WIDTH}px` }}>
          <div className="flex sticky top-0 bg-white dark:bg-dark-card z-30 shadow-sm">
            <div className="w-64 flex-shrink-0 border-r border-light dark:border-white/10 p-4 font-black text-[10px] uppercase tracking-widest text-text-muted bg-light/50 dark:bg-dark sticky left-0 z-40">
              Taken & Fases
            </div>
            {timelineDates.map(date => {
              const isFirstOfMonth = date.getDate() === 1;
              const isToday = isSameDay(date, new Date());
              return (
                <div key={date.toISOString()} className={`w-14 flex-shrink-0 text-center py-2 border-r border-light dark:border-white/5 flex flex-col items-center justify-center relative ${isToday ? 'bg-primary/5' : ''}`}>
                  {isFirstOfMonth && (
                    <div className="absolute -top-1 left-0 right-0 h-1 bg-primary/20"></div>
                  )}
                  <span className={`text-[8px] font-black uppercase tracking-tighter ${isToday ? 'text-primary' : 'text-text-muted opacity-60'}`}>
                    {format(date, 'EEE', { locale: nl })}
                  </span>
                  <span className={`text-[11px] font-black font-sans ${isToday ? 'text-primary bg-primary/10 w-6 h-6 flex items-center justify-center rounded-lg shadow-sm border border-primary/20' : 'text-text-main dark:text-white'}`}>
                    {format(date, 'd')}
                  </span>
                  {isFirstOfMonth && (
                    <span className="absolute -bottom-5 left-2 text-[8px] font-black text-primary uppercase whitespace-nowrap bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                      {format(date, 'MMMM', { locale: nl })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-6">
            {project.phases.map(phase => (
              <React.Fragment key={phase.id}>
                <div className="flex bg-slate-50/50 dark:bg-white/[0.02] border-b border-light dark:border-white/5 font-black text-[11px] uppercase tracking-widest text-text-main dark:text-white group">
                  <div className="w-64 flex-shrink-0 p-4 border-r border-light dark:border-white/10 sticky left-0 z-20 bg-inherit flex items-center justify-between backdrop-blur-md">
                    <div 
                      onClick={onEditProject}
                      className="flex items-center space-x-3 truncate cursor-pointer hover:text-primary transition-colors"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm shadow-primary/50 flex-shrink-0"></div>
                      <span className="truncate font-sans">{phase.name}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onAddTask?.(phase.id); }}
                      className="p-1.5 bg-primary text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Taak toevoegen aan deze fase"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {timelineDates.map(d => <div key={d.toISOString()} className="w-14 flex-shrink-0 border-r border-light/50 dark:border-white/5 h-12" />)}
                </div>

                {project.tasks.filter(t => t.phaseId === phase.id).map(task => {
                  const startIdx = timelineDates.findIndex(d => isSameDay(d, parseLocalDate(task.startDate)));
                  const endIdx = timelineDates.findIndex(d => isSameDay(d, parseLocalDate(task.endDate)));
                  
                  if (startIdx === -1 && endIdx === -1) return null;

                  const duration = endIdx - startIdx + 1;
                  const isOverdue = task.status !== TaskStatus.DONE && task.endDate && isAfter(new Date(), parseLocalDate(task.endDate));
                  const isTaskDragging = draggingTask?.id === task.id;

                  let leftPos = startIdx * COLUMN_WIDTH;
                  let barWidth = Math.max(duration * COLUMN_WIDTH, COLUMN_WIDTH);

                  if (isTaskDragging && draggingTask.hasMoved) {
                    if (draggingTask.mode === 'move') {
                      leftPos += dragOffset;
                    } else if (draggingTask.mode === 'resize-start') {
                      leftPos += dragOffset;
                      barWidth -= dragOffset;
                    } else if (draggingTask.mode === 'resize-end') {
                      barWidth += dragOffset;
                    }
                  }

                  return (
                    <div key={task.id} className="flex border-b border-light dark:border-white/5 hover:bg-light/10 dark:hover:bg-white/5 transition-colors font-subtitle relative h-14">
                      <div 
                        onClick={() => onEditTask?.(task)}
                        className="w-64 flex-shrink-0 p-4 border-r border-light dark:border-white/10 sticky left-0 z-20 bg-white dark:bg-dark-card transition-colors flex items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-dark"
                      >
                        <p className="text-[11px] font-bold text-text-muted dark:text-light/70 truncate">{task.name}</p>
                      </div>
                      <div className="flex relative h-full flex-grow">
                        {timelineDates.map(d => (
                          <div key={d.toISOString()} className={`w-14 h-full flex-shrink-0 border-r border-light/40 dark:border-white/5 ${isSameDay(d, new Date()) ? 'bg-primary/5' : ''}`} />
                        ))}
                        
                        {startIdx !== -1 && (
                          <div 
                            onClick={(e) => handleTaskClick(e, task)}
                            className={`absolute h-8 top-1/2 -translate-y-1/2 rounded-xl shadow-lg flex items-center z-10 select-none group/bar cursor-pointer
                              ${task.status === TaskStatus.DONE ? 'bg-success' : isOverdue ? 'bg-danger' : 'bg-primary'}
                              ${isTaskDragging && draggingTask.hasMoved ? 'opacity-50 z-40' : 'hover:scale-[1.01]'}`}
                            style={{ left: `${leftPos}px`, width: `${barWidth}px` }}
                          >
                            <div 
                              onMouseDown={(e) => handleTaskMouseDown(e, task.id, task.startDate, task.endDate, 'resize-start')}
                              className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/20 rounded-l-xl z-20"
                            />

                            <div 
                              onMouseDown={(e) => handleTaskMouseDown(e, task.id, task.startDate, task.endDate, 'move')}
                              className="flex-grow h-full px-4 flex items-center cursor-grab active:cursor-grabbing overflow-hidden"
                            >
                              <span className="text-[9px] text-white font-black uppercase tracking-tighter whitespace-nowrap truncate">
                                {task.name}
                              </span>
                            </div>

                            <div 
                              onMouseDown={(e) => handleTaskMouseDown(e, task.id, task.startDate, task.endDate, 'resize-end')}
                              className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/20 rounded-r-xl z-20"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-secondary z-20 opacity-60 pointer-events-none"
            style={{ 
              left: `${(timelineDates.findIndex(d => isSameDay(d, new Date())) * COLUMN_WIDTH) + SIDEBAR_WIDTH}px` 
            }}
          >
             <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-secondary text-dark text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">VANDAAG</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;
