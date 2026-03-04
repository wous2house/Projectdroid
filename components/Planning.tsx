import React, { useState } from 'react';
import { Project, Customer, Task, User } from '../types';
import GlobalTimelineView from './GlobalTimelineView';
import TaskModal from './TaskModal';

interface PlanningProps {
  projects: Project[];
  customers: Customer[];
  users: User[];
  onUpdateProject: (project: Project) => void;
  onSelectProject: (id: string) => void;
  addToast: (message: string, type?: 'success' | 'danger' | 'info') => void;
}

const Planning: React.FC<PlanningProps> = ({ projects, customers, users, onUpdateProject, onSelectProject, addToast }) => {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<{ projectId: string, task?: Task, phaseId?: string } | null>(null);

  const handleUpdateTask = (projectId: string, taskId: string, startDate: string, endDate: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const updatedTasks = project.tasks.map(t => 
      t.id === taskId ? { ...t, startDate, endDate } : t
    );
    onUpdateProject({ ...project, tasks: updatedTasks });
    addToast('Taakplanning bijgewerkt');
  };

  const handleSaveTask = (taskData: Task) => {
    if (!editingTask) return;
    
    const project = projects.find(p => p.id === editingTask.projectId);
    if (!project) return;

    let updatedTasks;
    if (editingTask.task) {
      updatedTasks = project.tasks.map(t => 
        t.id === editingTask.task!.id ? taskData : t
      );
      addToast('Taak bijgewerkt');
    } else {
      updatedTasks = [...project.tasks, taskData];
      addToast('Taak toegevoegd');
    }

    onUpdateProject({ ...project, tasks: updatedTasks });
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleDeleteTask = () => {
    if (!editingTask || !editingTask.task) return;
    
    const project = projects.find(p => p.id === editingTask.projectId);
    if (!project) return;

    const updatedTasks = project.tasks.filter(t => t.id !== editingTask.task!.id);
    onUpdateProject({ ...project, tasks: updatedTasks });
    setIsTaskModalOpen(false);
    setEditingTask(null);
    addToast('Taak verwijderd', 'danger');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-text-main dark:text-white mb-2">
            Planning
          </h1>
          <p className="text-text-muted dark:text-light/70 font-subtitle text-lg">
            Overzicht van alle projecten en taken
          </p>
        </div>
      </div>

      <GlobalTimelineView 
        projects={projects}
        customers={customers}
        onUpdateTask={handleUpdateTask}
        onAddTask={(projectId) => {
          const project = projects.find(p => p.id === projectId);
          // Preselect the first phase if available
          const phaseId = project?.phases[0]?.id;
          setEditingTask({ projectId, phaseId });
          setIsTaskModalOpen(true);
        }}
        onEditTask={(projectId, task) => {
          setEditingTask({ projectId, task });
          setIsTaskModalOpen(true);
        }}
        onEditProject={(projectId) => onSelectProject(projectId)}
      />

      {isTaskModalOpen && editingTask && (
        <TaskModal
          task={editingTask.task}
          initialPhaseId={editingTask.task?.phaseId || editingTask.phaseId || ''}
          phases={projects.find(p => p.id === editingTask.projectId)?.phases || []}
          projectTeam={users}
          onSave={handleSaveTask}
          onClose={() => {
            setIsTaskModalOpen(false);
            setEditingTask(null);
          }}
          onDelete={editingTask.task ? handleDeleteTask : undefined}
        />
      )}
    </div>
  );
};

export default Planning;
