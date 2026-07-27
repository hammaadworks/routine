import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ListTodo, Plus, Clock, GripVertical, CheckCircle2, Pencil, Activity, Hourglass, X, Target, Copy, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import getCaretCoordinates from 'textarea-caret';
import Dropdown from './Dropdown';
import ConfirmModal from './ConfirmModal';
import { parseDuration } from '../utils';

const COLORS = ['#FF595E', '#FF9F1C', '#FFCA3A', '#8AC926', '#00F5D4', '#1982C4', '#4361EE', '#6A4C93', '#F15BB5', '#E07A5F'];

export default function RoutinePane({ 
  routineGoals, setRoutineGoals, 
  templates, setTemplates, 
  sprintGoals, setSprintGoals, 
  activeTemplateId,
  routineFilterSprintId, setRoutineFilterSprintId,
  selectedTargetDate, setSelectedTargetDate, dailyLogs, toggleDailyGoal, dayMapping,
  isCalendarTab, activeVersion, updateActiveVersion, calendarSubTab, setCalendarSubTab
}) {
  const [showRoutineGoalModal, setShowRoutineGoalModal] = useState(false);
  const [editingRoutineGoalId, setEditingRoutineGoalId] = useState(null);
  const [routineGoalForm, setRoutineGoalForm] = useState({ task: '', desc: '', timeValue: '', sprintGoalId: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByName, setSortByName] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ date: '', title: '', desc: '' });

  
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionCoords, setMentionCoords] = useState({ top: 0, left: 0 });
  const [mentionIndex, setMentionIndex] = useState(0);
  const [activeModalField, setActiveModalField] = useState(null);
  const [activeBlockIdx, setActiveBlockIdx] = useState(null);
  
    const handleModalInput = (e, field) => {
    const val = e.target.value;
    setMilestoneForm(prev => ({ ...prev, [field]: val }));
    
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const lastWord = textBefore.split(/\s/).pop();
    
    if (lastWord.startsWith('@')) {
      const q = lastWord.slice(1).toLowerCase();
      setMentionQuery(q);
      setShowMentionMenu(true);
      setActiveModalField(field);
      setMentionIndex(0);
      
      const coords = getCaretCoordinates(e.target, cursor);
      const rect = e.target.getBoundingClientRect();
      const containerRect = e.target.parentElement.getBoundingClientRect();
      
      setMentionCoords({
        top: coords.top + 24 + (rect.top - containerRect.top),
        left: coords.left
      });
    } else {
      setShowMentionMenu(false);
      setActiveModalField(null);
    }
  };

  const insertModalMention = (goal, field) => {
    const val = milestoneForm[field];
    const el = modalInputRefs.current[field];
    if (!el) return;
    
    const cursor = el.selectionStart;
    const textBefore = val.slice(0, cursor);
    const textAfter = val.slice(cursor);
    const words = textBefore.split(/\s/);
    words.pop();
    
    const goalText = (goal.task || goal.text).replace(/\s+/g, '-');
    const newBefore = words.join(' ') + (words.length > 0 ? ' ' : '') + '@' + goalText + ' ';
    const newVal = newBefore + textAfter;
    
    setMilestoneForm(prev => ({ ...prev, [field]: newVal }));
    setShowMentionMenu(false);
    setActiveModalField(null);
    
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(newBefore.length, newBefore.length);
    }, 0);
  };

  const handleModalKeyDown = (e, field) => {
    if (showMentionMenu && activeModalField === field) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(i => Math.min(i + 1, filteredGoals.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredGoals[mentionIndex]) {
          insertModalMention(filteredGoals[mentionIndex], field);
        }
      } else if (e.key === 'Escape') {
        setShowMentionMenu(false);
        setActiveModalField(null);
      }
    }
  };

  const saveMilestone = (e) => {
    e.preventDefault();
    if (!milestoneForm.date || !milestoneForm.title) return;
    
    const dateStr = milestoneForm.date;
    const title = milestoneForm.title.trim();
    const desc = milestoneForm.desc.trim();
    
    let newBlock = `**${title}**`;
    if (desc) newBlock += `\n${desc}`;
    
    const current = (activeVersion.milestones || {})[dateStr] || '';
    const updated = current ? current + '\n\n' + newBlock : newBlock;
    
    updateActiveVersion({
      ...activeVersion,
      milestones: {
        ...(activeVersion.milestones || {}),
        [dateStr]: updated
      }
    });
    
    setShowMilestoneModal(false);
    setMilestoneForm({ date: '', title: '', desc: '' });
    setCalendarSubTab('milestones');
    if (setSelectedTargetDate) setSelectedTargetDate(dateStr);
  };
  const textareaRefs = useRef({});
  const modalInputRefs = useRef({});

  const allGoals = [
    ...(sprintGoals || []).map(g => ({ ...g, type: 'Sprint' })),
    ...(routineGoals || []).map(g => ({ ...g, type: 'Routine' }))
  ];
  
  const filteredGoals = allGoals.filter(g => 
    (g.task || g.text || '').toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const getMilestonesContent = () => {
    if (!effectiveDate) return '';
    return (activeVersion?.milestones || {})[effectiveDate] || '';
  };

  const updateMilestonesContent = (newContent) => {
    if (!effectiveDate) return;
    const currentMilestones = activeVersion?.milestones || {};
    updateActiveVersion({
      milestones: {
        ...currentMilestones,
        [effectiveDate]: newContent
      }
    });
  };

  const handleKeyDown = (e, dateStr, idx) => {
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
          insertMention(filteredGoals[mentionIndex], dateStr, idx);
        }
      } else if (e.key === 'Escape') {
        setShowMentionMenu(false);
      }
      return;
    }

    const blocks = getMilestonesContent(dateStr).split('\n\n');
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const cursor = e.target.selectionStart;
      const val = blocks[idx];
      const before = val.slice(0, cursor);
      const after = val.slice(cursor);
      
      const newBlocks = [...blocks];
      newBlocks[idx] = before;
      newBlocks.splice(idx + 1, 0, after);
      updateMilestonesContent(dateStr, newBlocks.join('\n\n'));
      setActiveBlockIdx({ dateStr, idx: idx + 1 });
    } else if (e.key === 'Backspace' && e.target.selectionStart === 0 && idx > 0) {
      e.preventDefault();
      const prevBlock = blocks[idx - 1];
      const newBlocks = [...blocks];
      newBlocks[idx - 1] = prevBlock + (newBlocks[idx] ? '\n\n' + newBlocks[idx] : '');
      newBlocks.splice(idx, 1);
      updateMilestonesContent(dateStr, newBlocks.join('\n\n'));
      setActiveBlockIdx({ dateStr, idx: idx - 1 });
      setTimeout(() => {
        const ref = textareaRefs.current[`${dateStr}-${idx - 1}`];
        if (ref) {
          ref.focus();
          ref.selectionStart = ref.selectionEnd = prevBlock.length;
        }
      }, 0);
    } else if (e.key === 'ArrowUp' && e.target.selectionStart === 0 && idx > 0) {
      setActiveBlockIdx({ dateStr, idx: idx - 1 });
    } else if (e.key === 'ArrowDown' && e.target.selectionStart === e.target.value.length && idx < blocks.length - 1) {
      setActiveBlockIdx({ dateStr, idx: idx + 1 });
    }
  };

  const handleInput = (e, dateStr, idx) => {
    const val = e.target.value;
    const blocks = getMilestonesContent(dateStr).split('\n\n');
    blocks[idx] = val;
    updateMilestonesContent(blocks.join('\n\n'));
    
    e.target.style.height = 'auto';
    e.target.style.height = (e.target.scrollHeight) + 'px';
    
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    
    const match = textBeforeCursor.match(/(?:^|\s)@([^\s]*)$/);
    if (match) {
      const query = match[1];
      setMentionQuery(query);
      setShowMentionMenu(true);
      setMentionIndex(0);
      
      const coords = getCaretCoordinates(e.target, cursor);
      const rect = e.target.getBoundingClientRect();
      const containerRect = e.target.parentElement.getBoundingClientRect();
      
      setMentionCoords({
        top: coords.top + 24 + (rect.top - containerRect.top),
        left: coords.left
      });
    } else {
      setShowMentionMenu(false);
    }
  };

  const insertMention = (goal, dateStr, idx) => {
    const goalText = goal.task || goal.text;
    const ref = textareaRefs.current[`${dateStr}-${idx}`];
    const cursor = ref.selectionStart;
    
    const blocks = getMilestonesContent(dateStr).split('\n\n');
    const blockContent = blocks[idx];
    const textBeforeCursor = blockContent.slice(0, cursor);
    const match = textBeforeCursor.match(/(?:^|\s)@([^\s]*)$/);
    
    if (match) {
      const startIdx = cursor - match[1].length - 1; 
      const newText = blockContent.slice(0, startIdx) + `**@${goalText}** ` + blockContent.slice(cursor);
      
      blocks[idx] = newText;
      updateMilestonesContent(dateStr, blocks.join('\n\n'));
      
      setTimeout(() => {
        if (textareaRefs.current[`${dateStr}-${idx}`]) {
          const newCursorPos = startIdx + goalText.length + 4;
          textareaRefs.current[`${dateStr}-${idx}`].selectionStart = textareaRefs.current[`${dateStr}-${idx}`].selectionEnd = newCursorPos;
          textareaRefs.current[`${dateStr}-${idx}`].focus();
        }
      }, 0);
    }
    setShowMentionMenu(false);
  };

  useEffect(() => {
    if (activeBlockIdx !== null) {
      const refKey = `${activeBlockIdx.dateStr}-${activeBlockIdx.idx}`;
      if (textareaRefs.current[refKey]) {
        const ref = textareaRefs.current[refKey];
        ref.focus();
        ref.style.height = 'auto';
        ref.style.height = (ref.scrollHeight) + 'px';
      }
    }
  }, [activeBlockIdx]);

  const checkSprintAddressed = (goal) => {
    const explicitlyReferenced = (routineGoals || []).some(g => g.sprintGoalId === goal.id);
    if (explicitlyReferenced) return true;
    const txt = goal.text.toLowerCase().trim();
    if (!txt) return false;
    const inGoals = (routineGoals || []).some(g => g.task.toLowerCase().trim() === txt || (g.desc && g.desc.toLowerCase().trim() === txt));
    const inTimeline = templates?.some(t => t.blocks.some(b => b.name.toLowerCase().trim() === txt));
    return inGoals || inTimeline;
  };

  const openAddRoutineGoal = () => {
    setEditingRoutineGoalId(null);
    setRoutineGoalForm({ task: '', desc: '', timeValue: '1:15', sprintGoalId: '' });
    setShowRoutineGoalModal(true);
  };

  const openEditRoutineGoal = (goal) => {
    setEditingRoutineGoalId(goal.id);
    setRoutineGoalForm({ 
      task: goal.task || '', 
      desc: goal.desc || '', 
      timeValue: goal.time || '', 
      sprintGoalId: goal.sprintGoalId || '' 
    });
    setShowRoutineGoalModal(true);
  };

  const duplicateGoal = (goal) => {
    const newGoal = {
      ...goal,
      task: '0_' + goal.task,
      id: 'rg-' + Date.now(),
      completed: false
    };
    setRoutineGoals([...(routineGoals || []), newGoal]);
  };

  const saveRoutineGoal = (e) => {
    e.preventDefault();
    if (!routineGoalForm.task.trim()) return;
    
    let timeString = '';
    if (routineGoalForm.timeValue) {
      timeString = routineGoalForm.timeValue.toString();
    }

    const goalData = {
      task: routineGoalForm.task,
      desc: routineGoalForm.desc,
      time: timeString,
      sprintGoalId: routineGoalForm.sprintGoalId
    };

    if (editingRoutineGoalId) {
      const oldGoal = (routineGoals || []).find(g => g.id === editingRoutineGoalId);
      setRoutineGoals((routineGoals || []).map(g => g.id === editingRoutineGoalId ? { ...g, ...goalData } : g));
      
      if (oldGoal && templates && setTemplates) {
        const oldTaskLower = (oldGoal.task || '').toLowerCase().trim();
        const linkedSprintGoal = sprintGoals?.find(sg => sg.id === goalData.sprintGoalId);
        const updatedTemplates = templates.map(t => ({
          ...t,
          blocks: t.blocks.map(b => {
            if (String(b.routineGoalId) === String(editingRoutineGoalId) || b.name.toLowerCase().trim() === oldTaskLower) {
              return { 
                ...b, 
                name: goalData.task, 
                duration: timeString ? parseDuration(timeString) : b.duration,
                routineGoalId: String(editingRoutineGoalId),
                color: linkedSprintGoal?.color || '#ffffff'
              };
            }
            return b;
          })
        }));
        setTemplates(updatedTemplates);
      }
    } else {
      const newGoal = {
        ...goalData,
        id: 'rg-' + Date.now(),
        completed: false
      };
      setRoutineGoals([...(routineGoals || []), newGoal]);
    }
    setShowRoutineGoalModal(false);
  };

  const toggleGoal = (id) => {
    setRoutineGoals((routineGoals || []).map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const handleDragStart = (e, goal) => {
    const linkedSprintGoal = sprintGoals?.find(sg => sg.id === goal.sprintGoalId);
    const hex = linkedSprintGoal?.color || '#ffffff';
    
    e.dataTransfer.setData('source', 'sidebar');
    e.dataTransfer.setData('task', goal.task);
    e.dataTransfer.setData('desc', goal.desc || '');
    e.dataTransfer.setData('time', goal.time || '1:15');
    e.dataTransfer.setData('color', hex);
    e.dataTransfer.setData('routineGoalId', goal.id);
  };

  const checkRoutineAddressed = (goal) => {
    if (!templates) return false;
    
    // 1. Check explicit linking
    const explicitlyReferenced = templates.some(t => t.blocks.some(b => String(b.routineGoalId) === String(goal.id)));
    if (explicitlyReferenced) return true;

    // 2. Fallback to text matching
    const txt = goal.task.toLowerCase().trim();
    if (!txt) return false;
    return templates.some(t => t.blocks.some(b => b.name.toLowerCase().trim() === txt));
  };

  const openGoalCount = (routineGoals || []).filter(g => !g.completed && !checkRoutineAddressed(g)).length;

  const confirmDeleteGoal = (id, taskName) => {
    setConfirmConfig({
      title: 'Delete Routine Goal',
      message: `Are you sure you want to delete "${taskName}"? This will also remove any calendar blocks linked to it.`,
      isDanger: true,
      onConfirm: () => {
        // 1. Delete the goal from the pane
        setRoutineGoals((routineGoals || []).filter(g => g.id !== id));

        // 2. Cascade delete blocks from the timeline
        if (templates && setTemplates) {
          const updatedTemplates = templates.map(t => ({
            ...t,
            blocks: t.blocks.filter(b => b.routineGoalId !== id)
          }));
          setTemplates(updatedTemplates);
        }
        
        setShowRoutineGoalModal(false);
        setConfirmConfig(null);
      },
      onCancel: () => setConfirmConfig(null)
    });
  };

  const getScheduledGoalsForDate = (dateStr) => {
    if (!routineGoals || routineGoals.length === 0) return [];
    
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(y, m - 1, d);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const templateId = dayMapping ? dayMapping[dayName] : null;
    
    if (templateId && templates) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        const blockGoalIds = template.blocks.map(b => b.routineGoalId).filter(Boolean);
        const scheduledGoals = routineGoals.filter(g => blockGoalIds.includes(g.id));
        if (scheduledGoals.length > 0) {
          return scheduledGoals;
        }
      }
    }
    return routineGoals;
  };

  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  
  const formatHeaderDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const getOrdinalNum = (n) => n + (n > 0 ? ['th', 'st', 'nd', 'rd'][(n > 3 && n < 21) || n % 10 > 3 ? 0 : n % 10] : '');
    return `${getOrdinalNum(day)} ${month}`;
  };
  
  const effectiveDate = (isCalendarTab && !selectedTargetDate) ? getTodayStr() : selectedTargetDate;

  let displayedRoutineGoals = [];
  
  if (effectiveDate) {
    displayedRoutineGoals = getScheduledGoalsForDate(effectiveDate);
  } else {
    displayedRoutineGoals = (routineGoals || []).filter(g => g.task.toLowerCase().includes(searchQuery.toLowerCase()));
    if (routineFilterSprintId) {
      const sprintGoal = sprintGoals?.find(sg => sg.id === routineFilterSprintId);
      if (sprintGoal) {
        const txt = sprintGoal.text.toLowerCase().trim();
        displayedRoutineGoals = displayedRoutineGoals.filter(g => 
          g.sprintGoalId === routineFilterSprintId || 
          (txt && g.task.toLowerCase().trim() === txt) || 
          (txt && g.desc && g.desc.toLowerCase().trim() === txt)
        );
      }
    }
    if (sortByName) {
      displayedRoutineGoals.sort((a, b) => a.task.localeCompare(b.task));
    }
  }

  const milestoneDates = Object.keys(activeVersion.milestones || {}).filter(d => (activeVersion.milestones[d] || '').trim() !== '');
  if (selectedTargetDate && !milestoneDates.includes(selectedTargetDate)) {
    milestoneDates.push(selectedTargetDate);
  }
  milestoneDates.sort((a, b) => new Date(a) - new Date(b));

  useEffect(() => {
    if (isCalendarTab && calendarSubTab === 'milestones' && effectiveDate) {
      setTimeout(() => {
        const el = document.getElementById(`milestone-block-${effectiveDate}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [effectiveDate, isCalendarTab, calendarSubTab]);

  // Parse markdown to render colored tags
  const customMarkdownComponents = {
    strong: ({ node, children, ...props }) => {
      const text = String(children).trim();
      if (text.startsWith('@')) {
        const goalName = text.slice(1);
        const goal = allGoals.find(g => (g.task || g.text || '').toLowerCase() === goalName.toLowerCase());
        if (goal && goal.color) {
          return (
            <strong {...props} style={{ color: goal.color, background: `${goal.color}20`, padding: '0 4px', borderRadius: '4px' }}>
              {children}
            </strong>
          );
        } else if (goal) {
          return (
            <strong {...props} style={{ color: 'var(--accent)', background: 'rgba(234, 179, 8, 0.1)', padding: '0 4px', borderRadius: '4px' }}>
              {children}
            </strong>
          );
        }
      }
      return <strong {...props}>{children}</strong>;
    }
  };

  return (
    <div className="pane right-pane" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '24px', overflow: 'hidden', minHeight: 0 }}>
        {isCalendarTab && (
          <div className="tabs" style={{ marginBottom: '16px', borderBottom: '1px solid var(--panel-border)', background: 'transparent' }}>
            <button 
              className={`tab ${calendarSubTab === 'mark_goals' ? 'active' : ''}`} 
              onClick={() => setCalendarSubTab('mark_goals')}
            >
              Mark Goals
            </button>
            <button 
              className={`tab ${calendarSubTab === 'milestones' ? 'active' : ''}`} 
              onClick={() => setCalendarSubTab('milestones')}
            >
              Milestones
            </button>
          </div>
        )}

        {(!isCalendarTab || calendarSubTab === 'mark_goals') && (
          <>
            {effectiveDate ? (
              <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} color="var(--accent)" /> Goals for {formatHeaderDate(effectiveDate)}
              </h2>
            ) : (
              <>
                <h2 style={{ marginBottom: '16px' }}><ListTodo size={18} color="var(--accent)" /> Routine Goals</h2>
                
                <button 
                  onClick={openAddRoutineGoal} className="secondary" 
                  style={{ width: '100%', marginBottom: '16px', display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px', borderStyle: 'dashed' }}
                >
                  <Plus size={16} /> Add Goal
                </button>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--text-secondary)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Find by name..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ width: '100%', paddingLeft: '32px', fontSize: '13px' }}
                    />
                  </div>
                  <button 
                    className={`secondary ${(routineFilterSprintId || sortByName) ? 'sort-active-glow' : ''}`}
                    onClick={() => {
                      if (routineFilterSprintId && setRoutineFilterSprintId) {
                        setRoutineFilterSprintId(null);
                      } else {
                        setSortByName(!sortByName);
                      }
                    }}
                    style={{ 
                      padding: '8px 12px', 
                      background: (routineFilterSprintId || sortByName) ? 'var(--accent)' : '',
                      boxShadow: (routineFilterSprintId || sortByName) ? '0 0 12px var(--accent)' : 'none',
                      color: (routineFilterSprintId || sortByName) ? '#000' : 'currentColor',
                      borderColor: (routineFilterSprintId || sortByName) ? 'var(--accent)' : ''
                    }}
                    title={routineFilterSprintId ? "Clear Filter" : "Sort by Name"}
                  >
                    {routineFilterSprintId ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon><line x1="23" y1="13" x2="17" y2="19"></line><line x1="17" y1="13" x2="23" y2="19"></line></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M7 12h10"></path><path d="M10 18h4"></path></svg>
                    )}
                  </button>
                </div>
              </>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>

            {displayedRoutineGoals.map((goal) => {
          const isAddressed = checkRoutineAddressed(goal);
          const linkedSprintGoal = sprintGoals?.find(sg => sg.id === goal.sprintGoalId);
          const hex = linkedSprintGoal?.color || '#ffffff';
          const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
          
          const bgStyle = {
            background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            border: `1px solid rgba(${r},${g},${b}, ${linkedSprintGoal ? '0.3' : '0.1'})`,
            borderLeft: `3px solid ${hex}`,
            boxShadow: `0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)`,
            borderRadius: '12px',
          };

          const isCompletedForView = effectiveDate ? (dailyLogs?.[effectiveDate]?.[goal.id] || false) : (goal.completed || false);
          return (
            <div 
              key={goal.id} 
              className={`item-card ${isCompletedForView ? 'scratched' : ''}`}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, goal)}
              style={{ display: 'flex', alignItems: 'center', height: '52px', padding: '0 12px', ...bgStyle }}
              title={goal.desc ? `${goal.task}\n\n${goal.desc}` : goal.task}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <GripVertical size={16} color="var(--text-secondary)" style={{ cursor: 'grab', flexShrink: 0, opacity: 0.5 }} />
                  <input 
                    type="checkbox" 
                    className="checkbox-square" 
                    style={{ flexShrink: 0, '--accent': hex }}
                    checked={effectiveDate ? (dailyLogs?.[effectiveDate]?.[goal.id] || false) : (goal.completed || false)} 
                    onChange={() => {
                      if (effectiveDate) {
                        toggleDailyGoal(effectiveDate, goal.id);
                      } else {
                        toggleGoal(goal.id);
                      }
                    }} 
                  />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="item-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff', fontSize: '13px', fontWeight: '600' }}>
                        {goal.task}
                      </span>
                      {isAddressed && (
                        <CheckCircle2 size={12} color={hex} style={{ flexShrink: 0 }} />
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '6px', alignItems: 'center', overflow: 'hidden' }}>
                      {goal.time && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-secondary)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          <Clock size={10} /> {goal.time}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {!effectiveDate && (
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '4px' }}>
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); duplicateGoal(goal); }} style={{ padding: '4px' }}>
                      <Copy size={14} />
                    </button>
                    <button className="icon-btn" onClick={() => openEditRoutineGoal(goal)} style={{ padding: '4px' }}>
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {(routineGoals || []).length === 0 && (
          <div style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
            padding: '40px 20px', color: 'var(--text-secondary)', textAlign: 'center', 
            border: '1px dashed var(--panel-border)', borderRadius: '12px', marginTop: '8px'
          }}>
            <ListTodo size={32} style={{ marginBottom: '12px', opacity: 0.5, color: 'var(--accent)' }} />
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>No goals yet</div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>Start adding goals and drag them to schedule.</div>
          </div>
        )}
            </div>
          </>
        )}

        {isCalendarTab && calendarSubTab === 'milestones' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflowY: 'auto' }}>
            <button 
              onClick={() => setShowMilestoneModal(true)} className="secondary" 
              style={{ width: '100%', marginBottom: '16px', display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px', borderStyle: 'dashed', flexShrink: 0 }}
            >
              <Plus size={16} /> Add Milestone
            </button>
            {milestoneDates.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Select a date in the calendar to write milestones.
              </div>
            ) : (
              <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', position: 'relative', padding: '0 24px' }}>
                <div style={{ borderLeft: '2px solid var(--panel-border)', marginLeft: '12px', paddingBottom: '24px' }}>
                  {milestoneDates.map((dateStr) => {
                    const contentStr = getMilestonesContent(dateStr);
                    const blocks = (contentStr || '').split('\n\n');
                    const isActiveDate = effectiveDate === dateStr;
                    
                    const todayDate = new Date();
                    todayDate.setHours(0, 0, 0, 0);
                    const blockDate = new Date(dateStr);
                    blockDate.setHours(0, 0, 0, 0);
                    const isPast = blockDate < todayDate;
                    let nodeColor = isPast ? '#a855f7' : 'var(--accent)';
                    let multiColors = [];
                    const tagsMatch = contentStr.match(/@([^\s*]+)/g);
                    if (tagsMatch) {
                      const uniqueTags = [...new Set(tagsMatch.map(t => t.slice(1).toLowerCase()))];
                      uniqueTags.forEach(tag => {
                        const goal = allGoals.find(g => (g.task || g.text || '').toLowerCase() === tag);
                        if (goal && goal.color) {
                          multiColors.push(goal.color);
                        }
                      });
                    }
                    
                    let backgroundStyle = nodeColor;
                    if (multiColors.length > 1) {
                      const sliceSize = 100 / multiColors.length;
                      let gradientStops = [];
                      multiColors.forEach((color, i) => {
                        gradientStops.push(`${color} ${i * sliceSize}% ${(i + 1) * sliceSize}%`);
                      });
                      backgroundStyle = `conic-gradient(${gradientStops.join(', ')})`;
                    } else if (multiColors.length === 1) {
                      backgroundStyle = multiColors[0];
                      nodeColor = multiColors[0];
                    }
                    
                    return (
                      <div key={dateStr} id={`milestone-block-${dateStr}`} style={{ position: 'relative', marginBottom: '40px', paddingLeft: '24px' }}>
                        <div style={{ position: 'absolute', left: '-7px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', background: backgroundStyle, border: '2px solid var(--panel-bg)', boxShadow: isActiveDate ? `0 0 10px ${nodeColor}80` : 'none', opacity: isActiveDate ? 1 : 0.6 }} />
                        <div 
                          onClick={() => {
                            if (setSelectedTargetDate) setSelectedTargetDate(dateStr);
                          }}
                          style={{ fontSize: '16px', fontWeight: 'bold', color: isActiveDate ? '#fff' : 'var(--text-secondary)', marginBottom: '16px', cursor: 'pointer', display: 'inline-block' }}
                        >
                          {new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        
                        {blocks.map((block, idx) => {
                          const isActive = activeBlockIdx && activeBlockIdx.dateStr === dateStr && activeBlockIdx.idx === idx;
                          return (
                            <div 
                              key={idx} 
                              onClick={() => setActiveBlockIdx({ dateStr, idx })}
                              style={{ 
                                minHeight: '28px', 
                                cursor: isActive ? 'text' : 'pointer',
                                padding: '4px 0',
                                marginBottom: '8px'
                              }}
                            >
                              {isActive ? (
                                <textarea
                                  ref={el => textareaRefs.current[`${dateStr}-${idx}`] = el}
                                  value={block}
                                  onChange={e => handleInput(e, dateStr, idx)}
                                  onKeyDown={e => handleKeyDown(e, dateStr, idx)}
                                  onBlur={() => setActiveBlockIdx(null)}
                                  placeholder={idx === 0 && !block ? "Write your milestones for this day... (Use @ to tag goals)" : ""}
                                  style={{
                                    width: '100%', resize: 'none', background: 'transparent', 
                                    border: 'none', color: 'var(--text-primary)', padding: 0,
                                    fontSize: '14px', lineHeight: '1.6', outline: 'none', boxShadow: 'none',
                                    fontFamily: 'inherit', overflow: 'hidden'
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
                        
                        <div 
                          style={{ height: '24px', cursor: 'text' }} 
                          onClick={() => {
                            if (blocks[blocks.length - 1] !== '') {
                              updateMilestonesContent(dateStr, contentStr + '\n\n');
                            }
                            setActiveBlockIdx({ dateStr, idx: blocks.length });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                
                <div style={{ height: '20vh' }} />

                {showMentionMenu && filteredGoals.length > 0 && activeBlockIdx && (
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
                          insertMention(g, activeBlockIdx.dateStr, activeBlockIdx.idx);
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
                        <span style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '2px' }}>
                          {g.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM METRICS: Routine Insights */}
      <div style={{ flex: 'none', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--panel-border)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <Activity size={14} color="var(--accent)" />
          Routine Insights:
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '20px' }}>
          <Hourglass size={14} color="var(--text-secondary)" />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Pending:</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap' }}>
            {sprintGoals.filter(g => !g.completed && !checkSprintAddressed(g)).length} Sprint, {openGoalCount} Routine
          </span>
        </div>
      </div>

      {/* Routine Goal Modal */}
      {showRoutineGoalModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowRoutineGoalModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '460px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 style={{ color: '#fff', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px' }}>
                  <div style={{ background: 'rgba(234, 179, 8, 0.15)', padding: '8px', borderRadius: '8px' }}>
                    <ListTodo size={20} color="var(--accent)" /> 
                  </div>
                  {editingRoutineGoalId ? `Edit Goal` : `New Goal`}
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Define your objective and connect it to the bigger picture.
                </p>
              </div>
              <button onClick={() => setShowRoutineGoalModal(false)} className="icon-btn" style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}><X size={16} /></button>
            </div>
            
            <form onSubmit={saveRoutineGoal} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Task Core Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Objective Name</label>
                  <input 
                    type="text" placeholder="e.g. Read 10 pages of Atomic Habits" value={routineGoalForm.task}
                    onChange={(e) => setRoutineGoalForm({ ...routineGoalForm, task: e.target.value })} required
                    style={{ width: '100%', fontSize: '14px', padding: '12px 14px' }} autoFocus
                  />
                </div>
              </div>

              {/* Execution details */}
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: '0 0 100px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <Clock size={14} color="var(--accent)" /> Duration
                  </label>
                  <input 
                    type="text" placeholder="1:20" value={routineGoalForm.timeValue}
                    onChange={(e) => setRoutineGoalForm({ ...routineGoalForm, timeValue: e.target.value })} 
                    style={{ width: '100%', padding: '12px 14px', fontSize: '14px', textAlign: 'center' }}
                  />
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <Target size={14} color="#3b82f6" /> Sprint Link
                  </label>
                  <Dropdown
                    value={routineGoalForm.sprintGoalId}
                    onChange={(val) => setRoutineGoalForm({ ...routineGoalForm, sprintGoalId: val })}
                    options={[
                      { value: '', label: 'No Sprint Goal Linked' },
                      ...(sprintGoals || []).map(sg => ({ value: sg.id, label: sg.text }))
                    ]}
                  />
                </div>
              </div>

              {/* Details / Notes */}
              <div style={{ background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Details / Notes <span style={{ opacity: 0.5, textTransform: 'none' }}>(optional)</span></label>
                <input 
                  type="text" placeholder="Add any specific criteria for success..." value={routineGoalForm.desc}
                  onChange={(e) => setRoutineGoalForm({ ...routineGoalForm, desc: e.target.value })} 
                  style={{ width: '100%', fontSize: '14px', padding: '12px 14px' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', width: '100%', padding: '8px 0' }}>
                {editingRoutineGoalId && (
                  <button type="button" onClick={() => confirmDeleteGoal(editingRoutineGoalId, routineGoalForm.task)} style={{ flex: '0 0 20%', padding: '12px 0', fontSize: '14px', fontWeight: '500', background: '#ef4444', color: 'white', border: 'none' }}>Delete</button>
                )}
                <button type="submit" style={{ flex: 1, padding: '12px 0', fontSize: '14px', fontWeight: 'bold', color: '#000', boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)' }}>{editingRoutineGoalId ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      
      {/* Add Milestone Modal */}
      {showMilestoneModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowMilestoneModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '460px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 style={{ color: '#fff', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px' }}>
                  <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '8px', borderRadius: '8px' }}>
                    <Plus size={20} color="#a855f7" /> 
                  </div>
                  Add Milestone
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Mark an important event or deadline on your calendar.
                </p>
              </div>
              <button onClick={() => setShowMilestoneModal(false)} className="icon-btn" style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}><X size={16} /></button>
            </div>
            
            <form onSubmit={saveMilestone} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</label>
                  <input 
                    type="date" value={milestoneForm.date}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, date: e.target.value })} required
                    onKeyDown={(e) => e.preventDefault()} onClick={(e) => e.target.showPicker()}
                    style={{ width: '100%', fontSize: '14px', padding: '12px 14px', colorScheme: 'dark', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Milestone Title</label>
                  <input 
                    type="text" placeholder="e.g. Go live @inmasjid" value={milestoneForm.title}
                    ref={el => modalInputRefs.current['title'] = el}
                    onChange={(e) => handleModalInput(e, 'title')}
                    onKeyDown={(e) => handleModalKeyDown(e, 'title')} required
                    style={{ width: '100%', fontSize: '14px', padding: '12px 14px' }}
                  />

                {showMentionMenu && activeModalField === 'title' && filteredGoals.length > 0 && (
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
                          insertModalMention(g, 'title');
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
                        <span style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '2px' }}>
                          {g.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                </div>
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description (Optional)</label>
                  <textarea 
                    placeholder="Any extra details..." value={milestoneForm.desc}
                    ref={el => modalInputRefs.current['desc'] = el}
                    onChange={(e) => handleModalInput(e, 'desc')}
                    onKeyDown={(e) => handleModalKeyDown(e, 'desc')}
                    style={{ width: '100%', fontSize: '14px', padding: '12px 14px', minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }}
                  />

                {showMentionMenu && activeModalField === 'desc' && filteredGoals.length > 0 && (
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
                          insertModalMention(g, 'desc');
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
                        <span style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '2px' }}>
                          {g.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowMilestoneModal(false)} className="secondary" style={{ padding: '10px 20px' }}>Cancel</button>
                <button type="submit" className="primary" style={{ padding: '10px 20px' }}>Save Milestone</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
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
