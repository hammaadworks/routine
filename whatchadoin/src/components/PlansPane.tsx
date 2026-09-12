import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import getCaretCoordinates from 'textarea-caret';
import { Trash2, FileText, PanelLeftClose, PanelLeftOpen, SquarePen, Copy, FolderPlus, FilePlus, Folder, ChevronRight, ChevronDown, Search, ChevronLeft } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { getAllGoalsForMention } from '../utils';

interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: string;
  isLife: boolean;
}

interface FolderType {
  id: string;
  name: string;
  parentId: string | null;
  isExpanded: boolean;
  isLife: boolean;
}

interface ConfirmConfig {
  title: string;
  message: string;
  isDanger: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

interface PlansPaneProps {
  routineGoals: any[];
  habits: any[];
  lifeGoals: any[];
  activeRoutineId: string;
}

export default function PlansPane({ routineGoals, habits, lifeGoals, activeRoutineId }: PlansPaneProps) {
  const [notes, setNotes] = useState<Note[]>(() => {
    const rSaved = localStorage.getItem(`routine_plans_${activeRoutineId}`);
    const rNotes = rSaved ? JSON.parse(rSaved).map((n: any) => ({...n, isLife: false})) : [];
    const lSaved = localStorage.getItem(`whatchadoin_life_plans`);
    const lNotes = lSaved ? JSON.parse(lSaved).map((n: any) => ({...n, isLife: true})) : [];
    return [...lNotes, ...rNotes];
  });
  const [folders, setFolders] = useState<FolderType[]>(() => {
    const rSaved = localStorage.getItem(`routine_plans_folders_${activeRoutineId}`);
    const rFolders = rSaved ? JSON.parse(rSaved).map((f: any) => ({...f, isLife: false})) : [];
    const lSaved = localStorage.getItem(`whatchadoin_life_plans_folders`);
    const lFolders = lSaved ? JSON.parse(lSaved).map((f: any) => ({...f, isLife: true})) : [];
    return [...lFolders, ...rFolders];
  });
  
  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes.length > 0 ? notes[0]?.id || null : null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [quickTasks, setQuickTasks] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('whatchadoin_quick_tasks') || '[]');
  });
  const [newQuickTask, setNewQuickTask] = useState('');

  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionCoords, setMentionCoords] = useState({ top: 0, left: 0 });
  const [mentionIndex, setMentionIndex] = useState(0);
  const [activeBlockIdx, setActiveBlockIdx] = useState<number | null>(null);
  const [isDocBarCollapsed, setIsDocBarCollapsed] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const textareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  // All goals for mentioning
  const { allGoals, filteredGoals } = getAllGoalsForMention(routineGoals, habits, lifeGoals, mentionQuery);

  useEffect(() => {
    const rNotes = notes.filter(n => !n.isLife);
    const lNotes = notes.filter(n => n.isLife);
    localStorage.setItem(`routine_plans_${activeRoutineId}`, JSON.stringify(rNotes));
    localStorage.setItem(`whatchadoin_life_plans`, JSON.stringify(lNotes));
  }, [notes, activeRoutineId]);

  useEffect(() => {
    const rFolders = folders.filter(f => !f.isLife);
    const lFolders = folders.filter(f => f.isLife);
    localStorage.setItem(`routine_plans_folders_${activeRoutineId}`, JSON.stringify(rFolders));
    localStorage.setItem(`whatchadoin_life_plans_folders`, JSON.stringify(lFolders));
  }, [folders, activeRoutineId]);

  useEffect(() => {
    localStorage.setItem('whatchadoin_quick_tasks', JSON.stringify(quickTasks));
  }, [quickTasks]);

  const activeNote = notes.find(n => n.id === activeNoteId);

  const createFolder = (parentId: string | null = null, isLife = false) => {
    if (parentId) isLife = folders.find(f => f.id === parentId)?.isLife || false;
    const newFolder: FolderType = {
      id: 'folder_' + Date.now().toString(),
      name: 'New Folder',
      parentId,
      isExpanded: true,
      isLife
    };
    setFolders([...folders, newFolder]);
  };

  const updateFolder = (id: string, updates: Partial<FolderType>) => {
    setFolders(folders.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteFolder = (id: string) => {
    setConfirmConfig({
      title: 'Delete Folder',
      message: 'Are you sure you want to delete this folder and all its contents?',
      isDanger: true,
      onConfirm: () => {
        const subfolderIds = new Set<string>([id]);
        let changed = true;
        while(changed) {
          changed = false;
          folders.forEach(f => {
            if (f.parentId && subfolderIds.has(f.parentId) && !subfolderIds.has(f.id)) {
              subfolderIds.add(f.id);
              changed = true;
            }
          });
        }
        
        setFolders(folders.map(f => f).filter(f => !subfolderIds.has(f.id)));
        const newNotes = notes.filter(n => (n.folderId ? !subfolderIds.has(n.folderId) : true));
        setNotes(newNotes);
        const activeFolderId = notes.find(n => n.id === activeNoteId)?.folderId;
        if (activeNoteId && activeFolderId && subfolderIds.has(activeFolderId)) {
          setActiveNoteId(null);
        }
        setConfirmConfig(null);
      },
      onCancel: () => setConfirmConfig(null)
    });
  };

  const createNote = (folderId: string | null = null, isLife = false) => {
    if (folderId) isLife = folders.find(f => f.id === folderId)?.isLife || false;
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '',
      folderId,
      createdAt: new Date().toISOString(),
      isLife
    };
    setNotes([...notes, newNote]);
    setActiveNoteId(newNote.id);
  };

  const updateActiveNote = (updates: Partial<Note>) => {
    setNotes(notes.map(n => n.id === activeNoteId ? { ...n, ...updates } : n));
  };

  const deleteNote = (id: string) => {
    setConfirmConfig({
      title: 'Delete Plan',
      message: 'Are you sure you want to delete this plan?',
      isDanger: true,
      onConfirm: () => {
        const newNotes = notes.filter(n => n.id !== id);
        setNotes(newNotes);
        if (activeNoteId === id) {
          setActiveNoteId(newNotes.length > 0 ? newNotes[0]?.id || null : null);
        }
        setConfirmConfig(null);
      },
      onCancel: () => setConfirmConfig(null)
    });
  };

  const duplicateNote = (id: string) => {
    const noteToCopy = notes.find(n => n.id === id);
    if (!noteToCopy) return;
    
    const newNote: Note = {
      ...noteToCopy,
      id: Date.now().toString(),
      title: `${noteToCopy.title} (Copy)`,
      createdAt: new Date().toISOString()
    };
    
    const newNotes = [...notes, newNote];
    setNotes(newNotes);
    setActiveNoteId(newNote.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, idx: number) => {
    if (showMentionMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredGoals.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredGoals.length) % filteredGoals.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredGoals.length > 0) {
          insertMention(filteredGoals[mentionIndex], idx);
        }
      } else if (e.key === 'Escape') {
        setShowMentionMenu(false);
      }
      return;
    }

    if (!activeNote) return;

    const blocks = activeNote.content.split('\n\n');
    const target = e.target as HTMLTextAreaElement;
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const cursor = target.selectionStart;
      const val = blocks[idx] || '';
      const before = val.slice(0, cursor);
      const after = val.slice(cursor);
      
      const newBlocks = [...blocks];
      newBlocks[idx] = before;
      newBlocks.splice(idx + 1, 0, after);
      updateActiveNote({ content: newBlocks.join('\n\n') });
      setActiveBlockIdx(idx + 1);
    } else if (e.key === 'Backspace' && target.selectionStart === 0 && idx > 0) {
      e.preventDefault();
      const prevBlock = blocks[idx - 1] || '';
      const newBlocks = [...blocks];
      newBlocks[idx - 1] = prevBlock + (newBlocks[idx] ? '\n\n' + newBlocks[idx] : '');
      newBlocks.splice(idx, 1);
      updateActiveNote({ content: newBlocks.join('\n\n') });
      setActiveBlockIdx(idx - 1);
      setTimeout(() => {
        const ref = textareaRefs.current[idx - 1];
        if (ref) {
          ref.focus();
          ref.selectionStart = ref.selectionEnd = prevBlock.length;
        }
      }, 0);
    } else if (e.key === 'ArrowUp' && target.selectionStart === 0 && idx > 0) {
      setActiveBlockIdx(idx - 1);
    } else if (e.key === 'ArrowDown' && target.selectionStart === target.value.length && idx < blocks.length - 1) {
      setActiveBlockIdx(idx + 1);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>, idx: number) => {
    if (!activeNote) return;
    const target = e.target;
    const val = target.value;
    const blocks = activeNote.content.split('\n\n');
    blocks[idx] = val;
    updateActiveNote({ content: blocks.join('\n\n') });
    
    target.style.height = 'auto';
    target.style.height = (target.scrollHeight) + 'px';
    
    const cursor = target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    
    const match = textBeforeCursor.match(/(?:^|\s)@(\S*)$/);
    if (match) {
      const query = match[1] || '';
      setMentionQuery(query);
      setShowMentionMenu(true);
      setMentionIndex(0);
      
      const coords = getCaretCoordinates(target, cursor);
      const rect = target.getBoundingClientRect();
      const containerRect = target.parentElement?.getBoundingClientRect() || { top: 0 };
      
      setMentionCoords({
        top: coords.top + 24 + (rect.top - containerRect.top),
        left: coords.left
      });
    } else {
      setShowMentionMenu(false);
    }
  };

  const insertMention = (goal: any, idx: number) => {
    const goalText = goal.task || goal.text;
    const ref = textareaRefs.current[idx];
    if (!ref) return;
    const cursor = ref.selectionStart;
    
    if (!activeNote) return;

    const blocks = activeNote.content.split('\n\n');
    const blockContent = blocks[idx] || '';
    const textBeforeCursor = blockContent.slice(0, cursor);
    const match = textBeforeCursor.match(/(?:^|\s)@(\S*)$/);
    
    if (match) {
      const matchLength = match[1]?.length || 0;
      const startIdx = cursor - matchLength - 1; 
      blocks[idx] = blockContent.slice(0, startIdx) + `**@${goalText}** ` + blockContent.slice(cursor);
      updateActiveNote({ content: blocks.join('\n\n') });
      
      setTimeout(() => {
        if (textareaRefs.current[idx]) {
          const newCursorPos = startIdx + goalText.length + 4;
          textareaRefs.current[idx]!.selectionStart = textareaRefs.current[idx]!.selectionEnd = newCursorPos;
          textareaRefs.current[idx]!.focus();
        }
      }, 0);
    }
    setShowMentionMenu(false);
  };

  useEffect(() => {
    if (activeBlockIdx !== null && textareaRefs.current[activeBlockIdx]) {
      const ref = textareaRefs.current[activeBlockIdx];
      if (ref) {
        ref.focus();
        ref.style.height = 'auto';
        ref.style.height = (ref.scrollHeight) + 'px';
      }
    }
  }, [activeBlockIdx]);

  const customMarkdownComponents: Record<string, React.ElementType> = {
    // noinspection JSUnusedGlobalSymbols
    strong: ({ children, ...props }: any) => {
      const text = String(children).trim();
      if (text.startsWith('@')) {
        const goalName = text.slice(1);
        const goal = allGoals.find((g: any) => (g.task || g.text || '').toLowerCase() === goalName.toLowerCase());
        if (goal && goal.color) {
          return (
            <strong {...props} style={{ color: goal.color, background: `${goal.color}20`, padding: '0 4px', borderRadius: '4px' }}>
              {children}
            </strong>
          );
        } else if (goal) {
          return (
            <strong {...props} style={{ color: 'var(--text-primary)', background: 'rgba(234, 179, 8, 0.1)', padding: '0 4px', borderRadius: '4px' }}>
              {children}
            </strong>
          );
        }
      }
      return <strong {...props}>{children}</strong>;
    }
  };

  const filteredNotes = notes.filter(n => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return n.title.toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q);
  });

  const renderTree = (parentId: string | null = null, level = 0, isLife = false) => {
    const childFolders = folders.filter(f => f.parentId === parentId && f.isLife === isLife);
    let childNotes = notes.filter(n => (n.folderId || null) === parentId && n.isLife === isLife);
    
    if (searchQuery) {
      if (parentId !== null) return null; 
      childNotes = filteredNotes;
    } else {
      childNotes = childNotes.filter(n => filteredNotes.some(fn => fn.id === n.id));
    }
    
    return (
      <div style={{ paddingLeft: level === 0 ? '0' : '12px' }}>
        {!searchQuery && childFolders.map(f => (
          <div key={f.id}>
            <div 
              style={{
                padding: '8px 12px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
              className="tree-item"
            >
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, overflow: 'hidden' }}
                onClick={() => updateFolder(f.id, { isExpanded: !f.isExpanded })}
              >
                {f.isExpanded ? <ChevronDown size={14} style={{ flexShrink: 0 }} /> : <ChevronRight size={14} style={{ flexShrink: 0 }} />}
                <Folder size={14} style={{ flexShrink: 0 }} />
                <input 
                  value={f.name}
                  onChange={(e) => updateFolder(f.id, { name: e.target.value })}
                  onBlur={(e) => updateFolder(f.id, { name: e.target.value.trim() })}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: 'transparent', border: 'none', color: 'inherit',
                    fontSize: '13px', outline: 'none', width: '100%',
                    textOverflow: 'ellipsis'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }} className="tree-item-actions">
                <button className="icon-btn" onClick={() => createNote(f.id)} style={{ padding: '2px' }} title="New Note here"><FilePlus size={12} /></button>
                <button className="icon-btn" onClick={() => createFolder(f.id)} style={{ padding: '2px' }} title="New Subfolder"><FolderPlus size={12} /></button>
                <button className="icon-btn" onClick={() => deleteFolder(f.id)} style={{ padding: '2px' }} title="Delete Folder"><Trash2 size={12} color="var(--danger)" /></button>
              </div>
            </div>
            {f.isExpanded && renderTree(f.id, level + 1, isLife)}
          </div>
        ))}
        {childNotes.map(n => (
          <div 
            key={n.id}
            onClick={() => setActiveNoteId(n.id)}
            style={{
              padding: '8px 12px',
              paddingLeft: !searchQuery && level === 0 ? '12px' : (!searchQuery ? '24px' : '12px'),
              cursor: 'pointer',
              background: n.id === activeNoteId ? 'rgba(234, 179, 8, 0.1)' : 'transparent',
              borderLeft: `3px solid ${n.id === activeNoteId ? 'var(--accent)' : 'transparent'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              transition: 'background 0.2s'
            }}
            className="tree-item"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <FileText size={14} color={n.id === activeNoteId ? 'var(--accent)' : 'var(--text-secondary)'} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: n.id === activeNoteId ? '#fff' : 'var(--text-secondary)' }}>
                {n.title}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }} className="tree-item-actions">
              <button 
                className="icon-btn" 
                onClick={(e) => { e.stopPropagation(); duplicateNote(n.id); }}
                style={{ padding: '2px' }}
                title="Duplicate Plan"
              >
                <Copy size={12} />
              </button>
              <button 
                className="icon-btn" 
                onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }}
                style={{ padding: '2px' }}
                title="Delete Plan"
              >
                <Trash2 size={12} color="var(--danger)" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="plans-pane-container" style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%' }}>
      <style>{`
        .tree-item-actions { opacity: 0; transition: opacity 0.2s; }
        .tree-item:hover .tree-item-actions { opacity: 1; }
        .tree-item:hover { background: rgba(255, 255, 255, 0.05); }
      `}</style>
      {/* Sidebar for Notes */}
      {!isDocBarCollapsed && (
        <div className="plans-sidebar" style={{ borderRight: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Life Notes</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="icon-btn" onClick={() => createFolder(null, true)} style={{ padding: '4px' }} title="New Life Folder">
                  <FolderPlus size={14} />
                </button>
                <button className="icon-btn" onClick={() => createNote(null, true)} style={{ padding: '4px' }} title="New Life Note">
                  <SquarePen size={14} />
                </button>
                <button className="icon-btn" onClick={() => setIsDocBarCollapsed(true)} style={{ padding: '4px', display: 'flex', color: 'var(--text-secondary)' }} title="Close sidebar">
                  <PanelLeftClose size={16} />
                </button>
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search plans..."
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '4px',
                  padding: '6px 10px 6px 30px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
          <div className="plans-sidebar-content" style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {renderTree(null, 0, true)}
            
            {(!searchQuery) && (
              <>
                <div style={{ margin: '16px 12px 8px 12px', borderTop: '1px solid var(--panel-border)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Routine Plans</h3>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="icon-btn" onClick={() => createFolder(null, false)} style={{ padding: '4px' }} title="New Routine Folder">
                      <FolderPlus size={12} />
                    </button>
                    <button className="icon-btn" onClick={() => createNote(null, false)} style={{ padding: '4px' }} title="New Routine Plan">
                      <FilePlus size={12} />
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {renderTree(null, 0, false)}

            {notes.length === 0 && folders.length === 0 && !searchQuery && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px' }}>
                No plans yet. Click + to create one.
              </div>
            )}
            {searchQuery && filteredNotes.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px' }}>
                No matches found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor Area */}
      {(!isMobile || activeNote) && (
      <div className="plans-editor-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        
        {/* Quick Tasks Widget */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--panel-border)', background: 'var(--panel-bg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Quick Tasks</h3>
            <input 
              type="text"
              placeholder="+ Add Quick Task..."
              value={newQuickTask}
              onChange={(e) => setNewQuickTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newQuickTask.trim()) {
                  setQuickTasks([{ id: Date.now().toString(), text: newQuickTask.trim(), completed: false }, ...quickTasks]);
                  setNewQuickTask('');
                }
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--panel-border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
            {quickTasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                {quickTasks.map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => {
                        setQuickTasks(quickTasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ 
                      color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)', 
                      textDecoration: task.completed ? 'line-through' : 'none',
                      fontSize: '14px'
                    }}>
                      {task.text}
                    </span>
                    <button 
                      onClick={() => setQuickTasks(quickTasks.filter(t => t.id !== task.id))}
                      style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px', marginLeft: 'auto', opacity: 0.7 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {activeNote ? (
          <>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
              {isMobile ? (
                <button className="icon-btn" onClick={() => setActiveNoteId(null)} style={{ padding: '4px', display: 'flex', color: 'var(--text-secondary)' }} title="Back to plans">
                  <ChevronLeft size={18} />
                </button>
              ) : isDocBarCollapsed && (
                <button className="icon-btn" onClick={() => setIsDocBarCollapsed(false)} style={{ padding: '4px', display: 'flex', color: 'var(--text-secondary)' }} title="Expand sidebar">
                  <PanelLeftOpen size={18} />
                </button>
              )}
              <input 
                type="text" 
                value={activeNote.title}
                onChange={e => updateActiveNote({ title: e.target.value })}
                onBlur={e => updateActiveNote({ title: e.target.value.trim() })}
                style={{ 
                  background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', 
                  fontWeight: 'bold', width: '100%', padding: 0, outline: 'none', boxShadow: 'none'
                }}
                placeholder="Note Title"
              />
            </div>
            <div className="plans-editor-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', padding: '24px', overflowY: 'auto' }}>
              
              {/* Single Pane Obsidian-style Blocks */}
              <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', position: 'relative' }}>
                {(activeNote.content || '').split('\n\n').map((block, idx) => {
                  const isActive = activeBlockIdx === idx;
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => setActiveBlockIdx(idx)}
                      style={{ 
                        minHeight: '28px', 
                        cursor: isActive ? 'text' : 'pointer',
                        padding: '4px 0',
                        marginBottom: '8px'
                      }}
                    >
                      {isActive ? (
                        <textarea
                          ref={el => { textareaRefs.current[idx] = el; }}
                          value={block}
                          onChange={e => handleInput(e, idx)}
                          onKeyDown={e => handleKeyDown(e, idx)}
                          onBlur={() => setActiveBlockIdx(null)}
                          placeholder={idx === 0 && !block ? "Start typing your plan... (Use @ to tag goals)" : ""}
                          style={{
                            width: '100%', resize: 'none', background: 'transparent', 
                            border: 'none', color: 'var(--text-primary)', padding: 0,
                            fontSize: '16px', lineHeight: '1.6', outline: 'none', boxShadow: 'none',
                            fontFamily: 'inherit', overflow: 'hidden', wordBreak: 'break-word', whiteSpace: 'pre-wrap'
                          }}
                        />
                      ) : (
                        <div className="markdown-preview" style={{ minHeight: '24px' }}>
                          <ReactMarkdown components={customMarkdownComponents}>
                            {block === '' ? '\u00A0' : block}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Empty space at bottom to allow clicking to add new blocks */}
                <div 
                  style={{ height: '60vh', cursor: 'text' }} 
                  onClick={() => {
                    const blocks = (activeNote.content || '').split('\n\n');
                    if (blocks[blocks.length - 1] !== '') {
                      updateActiveNote({ content: activeNote.content + '\n\n' });
                    }
                    setActiveBlockIdx(blocks.length);
                  }}
                />
                
                {/* Mention Menu Overlay */}
                {showMentionMenu && filteredGoals.length > 0 && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: mentionCoords.top + 'px',
                      left: mentionCoords.left + 'px', 
                      background: 'var(--bg)',
                      border: '1px solid var(--panel-border)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      zIndex: 100,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      minWidth: '250px'
                    }}
                  >
                    {filteredGoals.map((g, i) => (
                      <div 
                        key={g.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (activeBlockIdx !== null) {
                            insertMention(g, activeBlockIdx);
                          }
                        }}
                        onMouseEnter={() => setMentionIndex(i)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          background: i === mentionIndex ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                          display: 'flex', flexDirection: 'column'
                        }}
                      >
                        <span style={{ fontSize: '13px', color: '#fff', fontWeight: i === mentionIndex ? 'bold' : 'normal' }}>
                          {g.task || g.text}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-primary)', marginTop: '2px' }}>
                          {g.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {isDocBarCollapsed && (
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--panel-border)' }}>
                <button className="icon-btn" onClick={() => setIsDocBarCollapsed(false)} style={{ padding: '4px', display: 'flex', color: 'var(--text-secondary)' }} title="Expand sidebar">
                  <PanelLeftOpen size={18} />
                </button>
              </div>
            )}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Select or create a plan to start writing
            </div>
          </div>
        )}
      </div>
      )}

      {/* Confirm Modal */}
      {confirmConfig && (
        <ConfirmModal 
          title={confirmConfig.title}
          message={confirmConfig.message}
          isDanger={confirmConfig.isDanger}
          onConfirm={confirmConfig.onConfirm}
          onCancel={confirmConfig.onCancel}
        />
      )}
    </div>
  );
}
