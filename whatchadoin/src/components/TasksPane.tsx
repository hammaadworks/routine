import * as React from 'react';
import { useState, useEffect } from 'react';
import { Trash2, GripVertical, X, Globe } from 'lucide-react';
import { useDragReorder } from '../hooks/useDragReorder';
import ConfirmModal from './ConfirmModal';
import { sanitizeEntities } from '../utils';

export interface QuickTask {
    isPublic?: boolean;
  id: string;
  name: string;
  completed: boolean;
  createdAt?: string;
}

export default function TasksPane({ isPublicView }: { isPublicView?: boolean }) {
  const [quickTasks, setQuickTasks] = useState<QuickTask[]>(() => {
    return sanitizeEntities<QuickTask>(JSON.parse(localStorage.getItem('whatchadoin_quick_tasks') || '[]'));
  });
  const [newQuickTask, setNewQuickTask] = useState('');
  const [newTaskPublic, setNewTaskPublic] = useState(true);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);
  const taskInputRef = React.useRef<HTMLInputElement>(null);

  const { handleDragStart, handleDragEnter, handleDragEnd, dragItemIndex, dragOverItemIndex } = useDragReorder(quickTasks, setQuickTasks as any);

  useEffect(() => {
    localStorage.setItem('whatchadoin_quick_tasks', JSON.stringify(quickTasks));
  }, [quickTasks]);

  useEffect(() => {
    const handleUpdate = () => {
      const raw = localStorage.getItem('whatchadoin_quick_tasks') || '[]';
      setQuickTasks(prev => {
        if (JSON.stringify(prev) === raw) return prev;
        return sanitizeEntities<QuickTask>(JSON.parse(raw));
      });
    };
    window.addEventListener('whatchadoin_quick_tasks_updated', handleUpdate);
    return () => window.removeEventListener('whatchadoin_quick_tasks_updated', handleUpdate);
  }, []);

  useEffect(() => {
    const handleFabAddTask = () => {
      taskInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        taskInputRef.current?.focus();
      }, 50);
    };
    window.addEventListener('fab:add-task', handleFabAddTask);
    return () => window.removeEventListener('fab:add-task', handleFabAddTask);
  }, []);

  const activeTasks = quickTasks.filter(t => !t.completed && (!isPublicView || t.isPublic || (t.name || '').includes('[public]')));
  const completedTasks = quickTasks.filter(t => t.completed && (!isPublicView || t.isPublic || (t.name || '').includes('[public]')));

  const toggleTask = (id: string) => {
    setQuickTasks(quickTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTaskAndEdit = (task: QuickTask) => {
    setNewQuickTask(task.name || '');
    setQuickTasks(quickTasks.filter(t => t.id !== task.id));
  };

  const confirmDeleteAllCompleted = () => {
    setConfirmConfig({
      title: 'Delete All Completed Tasks',
      message: 'Are you sure you want to delete all completed tasks? This cannot be undone.',
      isDanger: true,
      onConfirm: () => {
        setQuickTasks(quickTasks.filter(t => !t.completed));
        setConfirmConfig(null);
      },
      onCancel: () => setConfirmConfig(null)
    });
  };

  const renderTask = (task: QuickTask) => {
    const absoluteIndex = quickTasks.findIndex(t => t.id === task.id);
    const isDragging = dragItemIndex === absoluteIndex;
    const isDragOver = dragOverItemIndex === absoluteIndex && dragItemIndex !== absoluteIndex;
    let dropDirection = 'none';
    if (isDragOver && dragItemIndex !== null) {
      dropDirection = dragItemIndex > absoluteIndex ? 'up' : 'down';
    }
    
    return (
      <div 
        key={task.id} 
        className={`item-card ${task.completed ? 'scratched' : ''} ${isDragging ? 'dragging' : ''}`} 
        draggable
        onDragStart={(e) => handleDragStart(e, absoluteIndex)}
        onDragEnter={(e) => handleDragEnter(e, absoluteIndex)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        style={{ 
          display: 'flex', alignItems: 'flex-start', gap: '12px', 
          padding: '16px', 
          background: 'var(--surface-light)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          transition: 'all 0.2s',
          minHeight: '52px',
          cursor: 'grab',
          minWidth: 0,
          opacity: isDragging ? 0.4 : 1,
          borderTop: isDragOver && dropDirection === 'up' ? '2px solid var(--accent)' : '1px solid var(--border)',
          borderBottom: isDragOver && dropDirection === 'down' ? '2px solid var(--accent)' : '1px solid var(--border)',
          transform: isDragOver && dropDirection === 'up' ? 'translateY(2px)' : (isDragOver && dropDirection === 'down' ? 'translateY(-2px)' : 'none'),
        }}
      >
        <GripVertical size={16} style={{ color: 'var(--text-secondary)', opacity: 0.5, marginTop: '2px', cursor: 'grab', flexShrink: 0 }} />
        <input name="auto_field_40" 
          type="checkbox"
          className="checkbox-square"
          checked={task.completed}
          onChange={() => toggleTask(task.id)}
          style={{ cursor: 'pointer', '--accent': '#1982C4', flexShrink: 0, marginTop: '2px' } as React.CSSProperties}
        />
        <span className="item-title" style={{ 
          color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)', 
          fontSize: '15px',
          flex: 1,
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          minWidth: 0,
          lineHeight: '1.4'
        }}>
          {task.name}
        </span>
        {task.completed && (
          <button 
            className="icon-btn"
            onClick={() => deleteTaskAndEdit(task)}
            style={{ padding: '4px', color: 'var(--danger)', opacity: 0.8, flexShrink: 0 }}
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="tasks-pane-container" style={{ minWidth: 0, width: '100%' }}>
      <div className="tasks-content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%', width: '100%', margin: '0 auto', minWidth: 0 }}>
        <div style={{ position: 'relative', width: '100%', minWidth: 0 }}>
          <input name="auto_field_41" 
            ref={taskInputRef}
            type="text"
            placeholder="+ Add a new task..."
            value={newQuickTask}
            onChange={(e) => setNewQuickTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newQuickTask.trim()) {
                const taskName = newQuickTask.trim();
                setQuickTasks([{ id: crypto.randomUUID(), name: taskName, completed: false, isPublic: newTaskPublic, createdAt: new Date().toISOString() }, ...quickTasks]);
                setNewQuickTask('');
              }
            }}
            style={{
              width: '100%',
              padding: '16px',
              paddingRight: '48px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--panel-border)',
              borderRadius: '12px',
              color: 'var(--text-primary)',
              fontSize: '16px',
              outline: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          />
          {newQuickTask && (
            <button 
              className="icon-btn"
              onClick={() => setNewQuickTask('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '4px',
                color: 'var(--text-secondary)'
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px', cursor: 'pointer' }} onClick={() => setNewTaskPublic(!newTaskPublic)}>
            <span style={{ fontSize: '12px', color: !newTaskPublic ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: !newTaskPublic ? 600 : 400, opacity: !newTaskPublic ? 1 : 0.6 }}>Private</span>
            <label className="ios-switch" onClick={(e) => e.stopPropagation()}>
                <input 
                    type="checkbox" 
                    id="new-task-public"
                    checked={newTaskPublic}
                    onChange={(e) => setNewTaskPublic(e.target.checked)}
                />
                <span className="ios-slider"></span>
            </label>
            <span style={{ fontSize: '12px', color: newTaskPublic ? 'var(--success)' : 'var(--text-secondary)', fontWeight: newTaskPublic ? 600 : 400, display: 'flex', alignItems: 'center', gap: '4px', opacity: newTaskPublic ? 1 : 0.6 }}>
                <Globe size={12} /> Public (Visible to others)
            </span>
        </div>

        {quickTasks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <div className="tasks-grid">
              {activeTasks.map(renderTask)}
            </div>
            
            {completedTasks.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0 8px 0', justifyContent: 'space-between' }}>
                <span style={{ 
                  padding: '0 12px 0 0', 
                  fontSize: '12px', 
                  color: 'var(--text-secondary)',
                  fontWeight: 500
                }}>
                  Completed
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }}></div>
                <button 
                   onClick={confirmDeleteAllCompleted}
                   className="icon-btn"
                   style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '12px', cursor: 'pointer', padding: '4px 8px', fontWeight: 500, opacity: 0.8 }}>
                   Delete all
                </button>
              </div>
            )}
            
            <div className="tasks-grid">
              {completedTasks.map(renderTask)}
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '15px' }}>
            No tasks yet. Add one above!
          </div>
        )}
      </div>

      {confirmConfig && (
        <ConfirmModal
          title={confirmConfig.title}
          message={confirmConfig.message}
          isDanger={confirmConfig.isDanger}
          onConfirm={confirmConfig.onConfirm}
          onCancel={confirmConfig.onCancel}
          cancelText="Cancel"
          confirmText="Yes, delete all"
        />
      )}
    </div>
  );
}
