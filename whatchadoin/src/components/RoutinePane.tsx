// @ts-nocheck
import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { ListTodo, Plus, Clock, GripVertical, CheckCircle2, Pencil, Activity, Target, Copy, ChevronDown, Star } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import getCaretCoordinates from 'textarea-caret';
import Dropdown from './Dropdown';
import ConfirmModal from './ConfirmModal';
import BaseModal from './BaseModal';
import SearchSortBar from './SearchSortBar';
import { parseDuration, getScheduledGoalsForDate, getAllGoalsForMention, getGoalColor, sortHabits } from '../utils';

const COLORS = ['#FF595E', '#FF9F1C', '#FFCA3A', '#8AC926', '#00F5D4', '#1982C4', '#4361EE', '#6A4C93', '#F15BB5', '#E07A5F'];

interface HabitPaneProps {
  habits: any[];
  setHabits: (h: any[]) => void;
  templates: any[];
  setTemplates: (t: any[]) => void;
  routineGoals: any[];
  lifeGoals: any[];
  activeTemplateId: string | null;
  habitFilterRoutineGoalId: string | null;
  setHabitFilterRoutineGoalId: (id: string | null) => void;
  habitFilterLifeGoalId?: string | null;
  setHabitFilterLifeGoalId?: (id: string | null) => void;
  selectedTargetDate: string | null;
  setSelectedTargetDate: (date: string) => void;
  dailyLogs: any;
  toggleDailyGoal: (date: string, id: string) => void;
  dayMapping: any;
  isCalendarTab: boolean;
  activeRoutine: any;
  updateActiveRoutine: (r: any) => void;
  calendarSubTab: string;
  setCalendarSubTab: (t: string) => void;
}

export default function RoutinePane({
  habits, setHabits, 
  templates, setTemplates, 
  routineGoals, lifeGoals,
  activeTemplateId,
  habitFilterRoutineGoalId, setHabitFilterRoutineGoalId,
  habitFilterLifeGoalId, setHabitFilterLifeGoalId,
  selectedTargetDate, setSelectedTargetDate, dailyLogs, toggleDailyGoal, dayMapping,
  isCalendarTab, activeRoutine, updateActiveRoutine, calendarSubTab, setCalendarSubTab
}: HabitPaneProps) {
  const [showRoutineGoalModal, setShowRoutineGoalModal] = useState(false);
  const [editingRoutineGoalId, setEditingRoutineGoalId] = useState<any>(null);
  const [routineGoalForm, setRoutineGoalForm] = useState({ task: '', desc: '', timeValue: '', routineGoalId: '', lifeGoalId: '', color: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByName, setSortByName] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestoneIdx, setEditingMilestoneIdx] = useState<any>(null);
  const [milestoneForm, setMilestoneForm] = useState({ date: '', tag: '', title: '', desc: '' });
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionCoords, setMentionCoords] = useState({ top: 0, left: 0 });
  const [mentionIndex, setMentionIndex] = useState(0);
  const [activeModalField, setActiveModalField] = useState<any>(null);
  
  const openEditMilestone = (dateStr: string, idx: number, block: string) => {
    let tag;
    let title;
    let desc;
    const matchWithTag = block.match(/^\*\*@([^*]+)\*\*\s*-\s*\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);
    const matchWithoutTag = block.match(/^\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);
    
    if (matchWithTag) {
      tag = matchWithTag[1];
      title = matchWithTag[2];
      desc = (matchWithTag[3] || '').trim().replace(/  \n/g, '\n');
    } else if (matchWithoutTag) {
      tag = '';
      title = matchWithoutTag[1];
      desc = (matchWithoutTag[2] || '').trim().replace(/  \n/g, '\n');
    } else {
      tag = '';
      title = block;
      desc = '';
    }
    
    setEditingMilestoneIdx({ dateStr, idx });
    setMilestoneForm({ date: dateStr, tag: tag || '', title: title || '', desc: desc || '' });
    setShowMilestoneModal(true);
  };

  const confirmDeleteMilestone = () => {
    if (!editingMilestoneIdx) return;
    
    setConfirmConfig({
      title: 'Delete Milestone',
      message: 'Are you sure you want to delete this milestone?',
      isDanger: true,
      onConfirm: () => {
        const { dateStr, idx } = editingMilestoneIdx;
        const newMilestones = { ...(activeRoutine.milestones || {}) };
        const blocks = (newMilestones[dateStr] || '').split('\n\n');
        blocks.splice(idx, 1);
        newMilestones[dateStr] = blocks.join('\n\n');
        
        if (!newMilestones[dateStr].trim()) {
          delete newMilestones[dateStr];
        }
        
        updateActiveRoutine({
          ...activeRoutine,
          milestones: newMilestones
        });
        
        setShowMilestoneModal(false);
        setConfirmConfig(null);
        setEditingMilestoneIdx(null);
      },
      onCancel: () => setConfirmConfig(null)
    });
  };
  
    const handleModalInput = (e: any, field: string) => {
    const val = e.target.value;
    setMilestoneForm(prev => ({ ...prev, [field as keyof typeof prev]: val }));
    
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

  const insertModalMention = (goal: any, field: string) => {
    const val = milestoneForm[field as keyof typeof milestoneForm];
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
    
    setMilestoneForm(prev => ({ ...prev, [field as keyof typeof prev]: newVal }));
    setShowMentionMenu(false);
    setActiveModalField(null);
    
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(newBefore.length, newBefore.length);
    }, 0);
  };

  const handleModalKeyDown = (e: any, field: string) => {
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

  const saveMilestone = (e: any) => {
    e.preventDefault();
    if (!milestoneForm.date || !milestoneForm.title) return;
    
    const dateStr = milestoneForm.date;
    const title = milestoneForm.title.trim();
    const desc = milestoneForm.desc.trim().replace(/\n+/g, '  \n');
    const tag = (milestoneForm.tag || '').trim();
    
    let newBlock = '';
    if (tag) {
      newBlock += `**@${tag}** - `;
    }
    newBlock += `**${title}**`;
    if (desc) newBlock += `  \n${desc}`;
    
    const newMilestones = { ...(activeRoutine.milestones || {}) };
    
    if (editingMilestoneIdx) {
      const { dateStr: oldDate, idx } = editingMilestoneIdx;
      
      const oldBlocks = (newMilestones[oldDate] || '').split('\n\n');
      oldBlocks.splice(idx, 1);
      newMilestones[oldDate] = oldBlocks.join('\n\n');
      
      const currentNewDate = newMilestones[dateStr] || '';
      newMilestones[dateStr] = currentNewDate ? currentNewDate + '\n\n' + newBlock : newBlock;
    } else {
      const current = newMilestones[dateStr] || '';
      newMilestones[dateStr] = current ? current + '\n\n' + newBlock : newBlock;
    }
    
    Object.keys(newMilestones).forEach(k => {
      if (!newMilestones[k].trim()) {
        delete newMilestones[k];
      }
    });
    
    updateActiveRoutine({
      ...activeRoutine,
      milestones: newMilestones
    });
    
    setShowMilestoneModal(false);
    setMilestoneForm({ date: '', tag: '', title: '', desc: '' });
    setEditingMilestoneIdx(null);
    setCalendarSubTab('milestones');
    if (setSelectedTargetDate) setSelectedTargetDate(dateStr);
  };
  const modalInputRefs = useRef<any>({});

  const { allGoals, filteredGoals } = getAllGoalsForMention(routineGoals, habits, lifeGoals, mentionQuery);



  // Removed inline editing handlers



  const openAddRoutineGoal = () => {
    setEditingRoutineGoalId(null);
    setRoutineGoalForm({ task: '', desc: '', timeValue: '1:15', routineGoalId: '', lifeGoalId: '', color: '' });
    setShowRoutineGoalModal(true);
  };

  useEffect(() => {
    const handleFab = () => openAddRoutineGoal();
    window.addEventListener('fab:add-habits', handleFab);
    return () => window.removeEventListener('fab:add-habits', handleFab);
  }, []);


  const openEditRoutineGoal = (goal: any) => {
    setEditingRoutineGoalId(goal.id);
    setRoutineGoalForm({ 
      task: goal.task || '', 
      desc: goal.desc || '', 
      timeValue: goal.time || '', 
      routineGoalId: goal.routineGoalId || '',
      lifeGoalId: goal.lifeGoalId || '',
      color: goal.color || ''
    });
    setShowRoutineGoalModal(true);
  };

  const duplicateGoal = (goal: any) => {
    const newGoal = {
      ...goal,
      task: '0_' + goal.task,
      id: 'rg-' + Date.now(),
      completed: false
    };
    setHabits([...(habits || []), newGoal]);
  };

  const saveRoutineGoal = (e: any) => {
    e.preventDefault();
    if (!routineGoalForm.task.trim()) return;
    
    let timeString = '';
    if (routineGoalForm.timeValue) {
      timeString = routineGoalForm.timeValue.toString();
    }

    const goalData = {
      task: routineGoalForm.task.trim(),
      desc: (routineGoalForm.desc || '').trim(),
      time: timeString,
      routineGoalId: routineGoalForm.routineGoalId,
      lifeGoalId: routineGoalForm.lifeGoalId,
      color: routineGoalForm.color
    };

    if (editingRoutineGoalId) {
      const oldGoal = (habits || []).find(g => g.id === editingRoutineGoalId);
      setHabits((habits || []).map(g => g.id === editingRoutineGoalId ? { ...g, ...goalData } : g));
      
      if (oldGoal && templates && setTemplates) {
        const oldTaskLower = (oldGoal.task || '').toLowerCase().trim();
        const newColor = getGoalColor(goalData, routineGoals, lifeGoals);

        const updatedTemplates = templates.map(t => ({
          ...t,
          blocks: t.blocks.map((b: any) => {
            if (String(b.routineGoalId) === String(editingRoutineGoalId) || b.name.toLowerCase().trim() === oldTaskLower) {
              return { 
                ...b, 
                name: goalData.task, 
                duration: timeString ? parseDuration(timeString) : b.duration,
                routineGoalId: String(editingRoutineGoalId),
                color: newColor
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
      setHabits([...(habits || []), newGoal]);
    }
    setShowRoutineGoalModal(false);
  };

  const toggleGoal = (id: string) => {
    setHabits((habits || []).map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const handleDragStart = (e: any, goal: any) => {
    const hex = getGoalColor(goal, routineGoals, lifeGoals);
    
    e.dataTransfer.setData('source', 'sidebar');
    e.dataTransfer.setData('task', goal.task);
    e.dataTransfer.setData('desc', goal.desc || '');
    e.dataTransfer.setData('time', goal.time || '1:15');
    e.dataTransfer.setData('color', hex);
    e.dataTransfer.setData('routineGoalId', goal.id);
  };

  const checkRoutineAddressed = (goal: any) => {
    if (!templates) return false;
    
    // 1. Check explicit linking
    const explicitlyReferenced = templates.some(t => t.blocks.some((b: any) => String(b.routineGoalId) === String(goal.id)));
    if (explicitlyReferenced) return true;

    // 2. Fallback to text matching
    const txt = goal.task.toLowerCase().trim();
    if (!txt) return false;
    return templates.some(t => t.blocks.some((b: any) => b.name.toLowerCase().trim() === txt));
  };



  const confirmDeleteGoal = (id: string, taskName: string) => {
    setConfirmConfig({
      title: 'Delete Habit',
      message: `Are you sure you want to delete "${taskName}"? This will also remove any calendar blocks linked to it.`,
      isDanger: true,
      onConfirm: () => {
        // 1. Delete the goal from the pane
        setHabits((habits || []).filter(g => g.id !== id));

        // 2. Cascade delete blocks from the timeline
        if (templates && setTemplates) {
          const updatedTemplates = templates.map(t => ({
            ...t,
            blocks: t.blocks.filter((b: any) => b.routineGoalId !== id)
          }));
          setTemplates(updatedTemplates);
        }
        
        setShowRoutineGoalModal(false);
        setConfirmConfig(null);
      },
      onCancel: () => setConfirmConfig(null)
    });
  };

  const getScheduledGoalsForDateLocal = (dateStr: string) => getScheduledGoalsForDate(dateStr, habits, dayMapping, templates);

  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  
  const formatHeaderDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const getOrdinalNum = (n: number) => n + (n > 0 ? (['th', 'st', 'nd', 'rd'][(n > 3 && n < 21) || n % 10 > 3 ? 0 : n % 10] || '') : '');
    return `${getOrdinalNum(day)} ${month}`;
  };
  
  const effectiveDate = (isCalendarTab && !selectedTargetDate) ? getTodayStr() : selectedTargetDate;

  let currentTemplateId = null;
  if (effectiveDate) {
    const [y, m, d] = (effectiveDate || '').split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(dateObj.getTime())) {
      const dayName = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-US', { weekday: 'long' }) : '';
      currentTemplateId = dayMapping && dayName ? dayMapping[dayName] : null;
    }
  } else {
    currentTemplateId = activeTemplateId;
  }

  const currentTemplate = templates?.find(t => t.id === currentTemplateId);
  const goalCounts: Record<string, number> = {};
  if (currentTemplate) {
    currentTemplate.blocks.forEach((b: any) => {
      if (b.routineGoalId) {
        goalCounts[b.routineGoalId] = (goalCounts[b.routineGoalId] || 0) + 1;
      }
    });
  }

  let displayedRoutineGoals = [];
  
  if (effectiveDate) {
    displayedRoutineGoals = getScheduledGoalsForDateLocal(effectiveDate);
  } else {
    displayedRoutineGoals = (habits || []).filter(g => g.task.toLowerCase().includes(searchQuery.toLowerCase()));
    if (habitFilterRoutineGoalId) {
      const routineGoal = routineGoals?.find(sg => sg.id === habitFilterRoutineGoalId);
      if (routineGoal) {
        const txt = routineGoal.text.toLowerCase().trim();
        displayedRoutineGoals = displayedRoutineGoals.filter(g => 
          g.routineGoalId === habitFilterRoutineGoalId || 
          (txt && g.task.toLowerCase().trim() === txt) || 
          (txt && g.desc && g.desc.toLowerCase().trim() === txt)
        );
      }
    } else if (habitFilterLifeGoalId) {
      displayedRoutineGoals = displayedRoutineGoals.filter(g => g.lifeGoalId === habitFilterLifeGoalId);
    }
    if (sortByName) {
      displayedRoutineGoals.sort((a: any, b: any) => a.task.localeCompare(b.task));
    } else {
      displayedRoutineGoals.sort((a: any, b: any) => {
        const addrA = checkRoutineAddressed(a);
        const addrB = checkRoutineAddressed(b);
        if (addrA !== addrB) {
          return addrA ? 1 : -1;
        }
        return 0;
      });
      displayedRoutineGoals = sortHabits(displayedRoutineGoals);
    }
  }

  const milestoneDates = Object.keys(activeRoutine.milestones || {}).filter(d => (activeRoutine.milestones[d] || '').trim() !== '');
  milestoneDates.sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime());

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
    // noinspection JSUnusedGlobalSymbols
    strong: ({ children, ...props }: any) => {
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
    <div className={`panel pane right-pane ${isMobileExpanded ? '' : 'mobile-collapsed'}`} style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', minHeight: 0 }}>
      <div className="panel-header" onClick={() => setIsMobileExpanded(!isMobileExpanded)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', cursor: 'pointer', borderBottom: '1px solid var(--panel-border)' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
           {effectiveDate ? <><Target size={18} color="var(--accent)" /> Goals for {formatHeaderDate(effectiveDate)}</> : <><ListTodo size={18} color="var(--accent)" /> Routine</>}
        </h2>
        <button className="accordion-icon icon-btn" style={{ padding: '4px' }}>
          <ChevronDown size={16} style={{ transform: isMobileExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '24px', paddingTop: '16px', overflow: 'hidden', minHeight: 0 }}>
        {isCalendarTab && effectiveDate && (
          <button 
            onClick={() => {
              setEditingMilestoneIdx(null);
              setMilestoneForm({ date: effectiveDate, tag: '', title: '', desc: '' });
              setShowMilestoneModal(true);
            }} 
            className="secondary"  
            style={{ width: '100%', marginBottom: '16px', display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px', borderStyle: 'dashed', flexShrink: 0 }}
          >
            <Plus size={16} /> Add Milestone
          </button>
        )}
        <div className="tabs" style={{ marginBottom: '16px', borderBottom: '1px solid var(--panel-border)', background: 'transparent' }}>
          <button 
            className={`tab ${calendarSubTab === 'mark_goals' ? 'active' : ''}`} 
            onClick={() => setCalendarSubTab('mark_goals')}
          >
            {isCalendarTab ? 'Mark Goals' : 'Habits'}
          </button>
          <button 
            className={`tab ${calendarSubTab === 'milestones' ? 'active' : ''}`} 
            onClick={() => setCalendarSubTab('milestones')}
          >
            Milestones
          </button>
        </div>

        {calendarSubTab === 'mark_goals' && (
          <>
            {!effectiveDate && (
              <>
                
                <button 
                  onClick={openAddRoutineGoal} className="secondary" 
                  style={{ width: '100%', flexShrink: 0, marginBottom: '16px', display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px', borderStyle: 'dashed' }}
                >
                  <Plus size={16} /> Add Goal
                </button>

                  <SearchSortBar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    sortByName={sortByName}
                    setSortByName={setSortByName}
                    isFilterActive={!!habitFilterRoutineGoalId || !!habitFilterLifeGoalId}
                    onFilterClear={() => {
                      if (setHabitFilterRoutineGoalId) setHabitFilterRoutineGoalId(null);
                      if (setHabitFilterLifeGoalId) setHabitFilterLifeGoalId(null);
                    }}
                  />
              </>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>

            {displayedRoutineGoals.map((goal) => {
          const isAddressed = checkRoutineAddressed(goal);
          const hex = getGoalColor(goal, routineGoals, lifeGoals);
          
          const r = parseInt(hex.slice(1,3), 16) || 255, g = parseInt(hex.slice(3,5), 16) || 255, b = parseInt(hex.slice(5,7), 16) || 255;
          const hasColor = goal.color;
          
          const baseMins = goal.time ? parseDuration(goal.time) : 0;
          let scheduledMins = 0;
          if (currentTemplate) {
            currentTemplate.blocks.forEach((b: any) => {
              if (String(b.routineGoalId) === String(goal.id)) scheduledMins += b.duration;
            });
          }
          const count = goalCounts[goal.id] || 0;
          const timeDiff = count > 0 ? (scheduledMins - (baseMins * count)) : 0;
          
          const bgStyle = {
            background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            border: `1px solid rgba(${r},${g},${b}, ${hasColor ? '0.3' : '0.1'})`,
            borderLeft: `3px solid ${hex}`,
            boxShadow: `0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)`,
            borderRadius: '12px',
          };

          const isCompletedForView = effectiveDate ? ((dailyLogs as any)?.[effectiveDate as string]?.[goal.id] || false) : (goal.completed || false);
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
                    style={{ flexShrink: 0, '--accent': hex } as React.CSSProperties}
                    checked={effectiveDate ? ((dailyLogs as any)?.[effectiveDate as string]?.[goal.id] || false) : (goal.completed || false)} 
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
                      {(goalCounts[goal.id] || 0) > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: 'var(--text-secondary)', fontSize: '10px', fontWeight: 'bold' }}>
                          x{goalCounts[goal.id] || 0}
                        </div>
                      )}
                      {timeDiff !== 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', background: timeDiff > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', borderRadius: '4px', color: timeDiff > 0 ? '#4ade80' : '#f87171', fontSize: '10px', fontWeight: 'bold' }}>
                          {timeDiff > 0 ? '+' : ''}{timeDiff}m
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
        {(habits || []).length === 0 && (
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

        {calendarSubTab === 'milestones' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflowY: 'auto' }}>
            {milestoneDates.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {isCalendarTab ? "No milestones found. Click 'Add Milestone' to create one." : "No milestones found."}
              </div>
            ) : (
              <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', position: 'relative', padding: '0 24px' }}>
                <div style={{ borderLeft: '2px solid var(--panel-border)', marginLeft: '12px', paddingBottom: '24px' }}>
                  {milestoneDates.map((dateStr) => {
                    const contentStr = (activeRoutine?.milestones || {})[dateStr] || '';
                    const blocks = (contentStr || '').split('\n\n');
                    const isActiveDate = effectiveDate === dateStr;
                    
                    const todayDate = new Date();
                    todayDate.setHours(0, 0, 0, 0);
                    const blockDate = new Date(dateStr);
                    blockDate.setHours(0, 0, 0, 0);
                    const isPast = blockDate < todayDate;
                    let nodeColor = isPast ? '#a855f7' : 'var(--accent)';
                    let multiColors: string[] = [];
                    const tagsMatch = contentStr.match(/@([^\s*]+)/g);
                    if (tagsMatch) {
                      const uniqueTags = [...new Set(tagsMatch.map((t: any) => t.slice(1).toLowerCase()))];
                      uniqueTags.forEach((tag: any) => {
                        const goal = allGoals.find(g => (g.task || g.text || '').toLowerCase() === tag);
                        if (goal && goal.color) {
                          multiColors.push(goal.color);
                        }
                      });
                    }
                    
                    let backgroundStyle = nodeColor;
                    if (multiColors.length > 1) {
                      const sliceSize = 100 / multiColors.length;
                      let gradientStops: string[] = [];
                      multiColors.forEach((color, i) => {
                        gradientStops.push(`${color} ${i * sliceSize}% ${(i + 1) * sliceSize}%`);
                      });
                      backgroundStyle = `conic-gradient(${gradientStops.join(', ')})`;
                    } else if (multiColors.length === 1) {
                      backgroundStyle = multiColors[0] || '';
                      nodeColor = multiColors[0] || '';
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
                        
                        {blocks.map((block: string, idx: number) => {
                          if (!block.trim()) return null;
                          return (
                            <div 
                              key={idx} 
                              onClick={() => { if (isCalendarTab) openEditMilestone(dateStr, idx, block); }}
                              style={{ 
                                minHeight: '28px', 
                                cursor: isCalendarTab ? 'pointer' : 'default',
                                padding: '4px 0',
                                marginBottom: '8px'
                              }}
                            >
                              <div className="markdown-preview" style={{ minHeight: '24px' }}>
                                <ReactMarkdown components={customMarkdownComponents as any}>
                                  {block === '' ? '\u00A0' : block}
                                </ReactMarkdown>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                
                <div style={{ height: '20vh' }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM METRICS: Habit Insights */}
      <div style={{ flex: 'none', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--panel-border)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <Activity size={14} color="var(--accent)" />
          {(() => {
            let unallocatedMins = 24 * 60;
            if (currentTemplate && currentTemplate.blocks) {
                const intervals = (currentTemplate.blocks || []).map((b: any) => [b.startTime ?? 0, (b.startTime ?? 0) + (b.duration || 0)]);
                    intervals.sort((a: number[], b: number[]) => a[0] - b[0]);

                    let allocated = 0;
                    let currentStart = -1;
                    let currentEnd = -1;

                    for (const [start, end] of intervals as [number, number][]) {
                        if (currentEnd < start) {
                            if (currentStart !== -1) {
                                allocated += currentEnd - currentStart;
                            }
                            currentStart = start;
                            currentEnd = end;
                        } else {
                            currentEnd = Math.max(currentEnd, end);
                        }
                    }

                    if (currentStart !== -1) {
                        allocated += currentEnd - currentStart;
                    }

                    unallocatedMins -= allocated;
                }
            const h = Math.floor(unallocatedMins / 60);
            const m = unallocatedMins % 60;
            return `Free Time: ${h}h ${m}m`;
          })()}
        </div>
      </div>

      {/* Habit Modal */}
      <BaseModal
        isOpen={showRoutineGoalModal}
        onClose={() => setShowRoutineGoalModal(false)}
        maxWidth="460px"
        title={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: 'rgba(234, 179, 8, 0.15)', padding: '8px', borderRadius: '8px' }}>
                <ListTodo size={20} color="var(--accent)" /> 
              </div>
              {editingRoutineGoalId ? `Edit Goal` : `New Goal`}
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
              Define your objective and connect it to the bigger picture.
            </p>
          </div>
        }
      >
        <form onSubmit={saveRoutineGoal} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Task Core Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Objective Name</label>
              <input 
                type="text" placeholder="e.g. Read 10 pages of Atomic Habits" value={routineGoalForm.task}
                onChange={(e) => setRoutineGoalForm({ ...routineGoalForm, task: e.target.value })} required
                style={{ width: '100%', fontSize: '16px', padding: '12px 14px' }}
              />
            </div>
          </div>

          {/* Execution details */}
          <div className="form-row">
            <div style={{ flex: '0 0 100px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Clock size={14} color="var(--accent)" /> Duration
              </label>
              <input 
                type="text" placeholder="1:20" value={String(routineGoalForm.timeValue)}
                onChange={(e) => setRoutineGoalForm({ ...routineGoalForm, timeValue: e.target.value })} 
                style={{ width: '100%', padding: '12px 14px', fontSize: '16px', textAlign: 'center' }}
              />
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Target size={14} color="#3b82f6" /> Routine Link
              </label>
              <Dropdown
                value={String(routineGoalForm.routineGoalId)}
                onChange={(val) => setRoutineGoalForm({ ...routineGoalForm, routineGoalId: val })}
                options={[
                  { value: '', label: 'No Routine Goal Linked' },
                  ...(routineGoals || []).map(sg => ({ value: sg.id, label: sg.text }))
                ]}
              />
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Star size={14} color="#eab308" /> Life Link
              </label>
              <Dropdown
                value={String(routineGoalForm.lifeGoalId)}
                onChange={(val) => setRoutineGoalForm({ ...routineGoalForm, lifeGoalId: val })}
                options={[
                  { value: '', label: 'No Life Goal Linked' },
                  ...(lifeGoals || []).map(lg => ({ value: lg.id, label: lg.text }))
                ]}
              />
            </div>
          </div>

          {/* Habit Color Picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Override Color
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div 
                onClick={() => setRoutineGoalForm({ ...routineGoalForm, color: '' })}
                style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                  border: (!routineGoalForm.color || routineGoalForm.color === '') ? '2px solid white' : '1px solid var(--panel-border)',
                  background: 'var(--panel-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', color: 'var(--text-secondary)'
                }}
                title="Auto (inherit from links)"
              >
                Auto
              </div>
              {COLORS.map(c => (
                <div 
                  key={c}
                  onClick={() => setRoutineGoalForm({ ...routineGoalForm, color: c })}
                  style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                    backgroundColor: c,
                    border: routineGoalForm.color === c ? '2px solid white' : '2px solid transparent',
                    boxShadow: routineGoalForm.color === c ? `0 0 10px ${c}` : 'none'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Details / Notes */}
          <div style={{ background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Details / Notes <span style={{ opacity: 0.5, textTransform: 'none' }}>(optional)</span></label>
            <input 
              type="text" placeholder="Add any specific criteria for success..." value={routineGoalForm.desc}
              onChange={(e) => setRoutineGoalForm({ ...routineGoalForm, desc: e.target.value })} 
              style={{ width: '100%', fontSize: '16px', padding: '12px 14px' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', width: '100%', padding: '8px 0' }}>
            {editingRoutineGoalId && (
              <button type="button" onClick={() => confirmDeleteGoal(editingRoutineGoalId, routineGoalForm.task)} style={{ flex: '0 0 20%', padding: '12px 0', fontSize: '14px', fontWeight: '500', background: '#ef4444', color: 'white', border: 'none' }}>Delete</button>
            )}
            <button type="submit" style={{ flex: 1, padding: '12px 0', fontSize: '14px', fontWeight: 'bold', color: '#000', boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)' }}>{editingRoutineGoalId ? 'Update' : 'Save'}</button>
          </div>
        </form>
      </BaseModal>

      
      {/* Add Milestone Modal */}
      <BaseModal
        isOpen={showMilestoneModal}
        onClose={() => setShowMilestoneModal(false)}
        maxWidth="460px"
        title={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '8px', borderRadius: '8px' }}>
                <Plus size={20} color="#a855f7" /> 
              </div>
              {editingMilestoneIdx !== null ? 'Edit Milestone' : 'Add Milestone'}
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
              {editingMilestoneIdx !== null ? 'Update or move your milestone.' : 'Mark an important event or deadline on your calendar.'}
            </p>
          </div>
        }
      >
        <form onSubmit={saveMilestone} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
            <div className="form-row">
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</label>
                <input 
                  type="date" value={milestoneForm.date}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, date: e.target.value })} required
                  onKeyDown={(e) => e.preventDefault()} onClick={(e) => (e.target as HTMLInputElement).showPicker()}
                  style={{ width: '100%', fontSize: '14px', padding: '12px 14px', colorScheme: 'dark', cursor: 'pointer' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tag (Optional)</label>
                <Dropdown
                  value={milestoneForm.tag}
                  onChange={(val) => setMilestoneForm({ ...milestoneForm, tag: val })}
                  options={[
                    { value: '', label: 'No Tag' },
                    ...allGoals.map(g => ({ value: g.task || g.text, label: `[${g.type}] ${g.task || g.text}` }))
                  ]}
                />
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Milestone Title</label>
              <input 
                type="text" placeholder="e.g. Go live @inmasjid" value={milestoneForm.title}
                ref={el => modalInputRefs.current['title'] = el}
                onChange={(e) => handleModalInput(e, 'title')}
                onKeyDown={(e) => handleModalKeyDown(e, 'title')} required
                style={{ width: '100%', fontSize: '16px', padding: '12px 14px' }}
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
                style={{ width: '100%', fontSize: '16px', padding: '12px 14px', minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }}
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
            {editingMilestoneIdx !== null && (
              <button type="button" onClick={confirmDeleteMilestone} style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', marginRight: 'auto' }}>Delete</button>
            )}
            <button type="button" onClick={() => setShowMilestoneModal(false)} className="secondary" style={{ padding: '10px 20px' }}>Cancel</button>
            <button type="submit" className="primary" style={{ padding: '10px 20px' }}>{editingMilestoneIdx !== null ? 'Update Milestone' : 'Save Milestone'}</button>
          </div>
        </form>
      </BaseModal>

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
