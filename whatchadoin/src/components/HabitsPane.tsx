// @ts-nocheck
import * as React from 'react';
import { useEffect, useRef, useState} from 'react';
import { 
    Activity,
    CheckCircle2,
    ChevronDown,
    Clock,
    Copy,
    GripVertical,
    ListTodo,
    Palette,
    Pencil,
    Plus,
    Target,
    X,
    Globe
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import getCaretCoordinates from 'textarea-caret';
import Dropdown from './Dropdown';
import ConfirmModal from './ConfirmModal';
import BaseModal from './BaseModal';
import SearchSortBar from './SearchSortBar';
import { 
    getAllGoalsForMention,
    getCardBgStyle,
    getGoalColor,
    getScheduledGoalsForDate,
    parseDuration,
    sortHabits
} from '../utils';

const COLORS = ['#FF595E', '#FF9F1C', '#FFCA3A', '#8AC926', '#00F5D4', '#1982C4', '#4361EE', '#6A4C93', '#F15BB5', '#E07A5F'];

interface HabitsPaneProps {
    isPublicView?: boolean;
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
    updateActiveRoutine?: (updates: any) => void;
    calendarSubTab?: string;
    setCalendarSubTab?: (tab: string) => void;
    isRoutineDrawerOpen?: boolean;
    setIsRoutineDrawerOpen?: (open: boolean) => void;
    moneyGoals?: any[];
}

export default function HabitsPane({
    isPublicView,
                                        habits,
                                        setHabits,
                                        templates,
                                        setTemplates,
                                        routineGoals,
                                        lifeGoals,
                                        moneyGoals,
                                        activeTemplateId,
                                        habitFilterRoutineGoalId,
                                        setHabitFilterRoutineGoalId,
                                        habitFilterLifeGoalId,
                                        setHabitFilterLifeGoalId,
                                        selectedTargetDate,
                                        setSelectedTargetDate,
                                        dailyLogs,
                                        toggleDailyGoal,
                                        dayMapping,
                                        isCalendarTab,
                                        activeRoutine,
                                        updateActiveRoutine,
                                        calendarSubTab,
                                        setCalendarSubTab,
                                        isRoutineDrawerOpen,
                                        setIsRoutineDrawerOpen
                                    }: HabitsPaneProps) {
    const [showHabitModal, setShowHabitModal] = useState(false);
    const [editingHabitId, setEditingHabitId] = useState<any>(null);
    const [habitForm, setHabitForm] = useState<{
        name: string; desc: string; timeValue: string; routineGoalIds: string[]; lifeGoalIds: string[]; color: string; isPublic?: boolean;
    }>({
        name: '', desc: '', timeValue: '1:15', routineGoalIds: [] as string[], lifeGoalIds: [] as string[], color: '', isPublic: false
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [sortByName, setSortByName] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<any>(null);
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);
    const [editingMilestoneIdx, setEditingMilestoneIdx] = useState<any>(null);
    const [milestoneForm, setMilestoneForm] = useState({date: '', tag: '', name: '', desc: '', done: false});
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);


    const [showMentionMenu, setShowMentionMenu] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionCoords, setMentionCoords] = useState({top: 0, left: 0});
    const [mentionIndex, setMentionIndex] = useState(0);
    const [activeModalField, setActiveModalField] = useState<any>(null);

    const openEditMilestone = (dateStr: string, idx: number, block: string) => {
        let tag;
        let name;
        let desc;
        let done = false;
        const matchWithTag = block.match(/^\*\*@([^*]+)\*\*\s*-\s*\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);
        const matchWithoutTag = block.match(/^\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);

        if (matchWithTag) {
            tag = matchWithTag[1];
            name = matchWithTag[2];
            desc = (matchWithTag[3] || '').trim().replace(/ {2}\n/g, '\n');
        } else if (matchWithoutTag) {
            tag = '';
            name = matchWithoutTag[1];
            desc = (matchWithoutTag[2] || '').trim().replace(/ {2}\n/g, '\n');
        } else {
            tag = '';
            name = block;
            desc = '';
        }

        if (name.startsWith('[x] ')) {
            done = true;
            name = name.substring(4);
        } else if (name.startsWith('[ ] ')) {
            done = false;
            name = name.substring(4);
        }

        setEditingMilestoneIdx({dateStr, idx});
        setMilestoneForm({date: dateStr, tag: tag || '', name: name || '', desc: desc || '', done});
        setShowMilestoneModal(true);
    };

    const confirmDeleteMilestone = () => {
        if (!editingMilestoneIdx) return;

        setConfirmConfig({
            title: 'Delete Milestone',
            message: 'Are you sure you want to delete this milestone?',
            isDanger: true,
            onConfirm: () => {
                const {dateStr, idx} = editingMilestoneIdx;
                const newMilestones = {...(activeRoutine.milestones || {})};
                const blocks = (newMilestones[dateStr] || '').split('\n\n');
                blocks.splice(idx, 1);
                newMilestones[dateStr] = blocks.join('\n\n');

                if (!newMilestones[dateStr].trim()) {
                    delete newMilestones[dateStr];
                }

                updateActiveRoutine({
                    ...activeRoutine, milestones: newMilestones
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
        setMilestoneForm(prev => ({...prev, [field as keyof typeof prev]: val}));

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
                top: coords.top + 24 + (rect.top - containerRect.top), left: coords.left
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

        const goalText = (goal.name || '').replace(/\s+/g, '-');
        const newBefore = words.join(' ') + (words.length > 0 ? ' ' : '') + '@' + goalText + ' ';
        const newVal = newBefore + textAfter;

        setMilestoneForm(prev => ({...prev, [field as keyof typeof prev]: newVal}));
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
        if (!milestoneForm.date || !milestoneForm.name) return;

        const dateStr = milestoneForm.date;
        const name = milestoneForm.name.trim();
        const desc = milestoneForm.desc.trim().replace(/\n{2,}/g, '\n');
        const tag = (milestoneForm.tag || '').trim();
        const finalName = milestoneForm.done ? `[x] ${name}` : name;

        let newBlock = '';
        if (tag) {
            newBlock += `**@${tag}** - `;
        }
        newBlock += `**${finalName}**`;
        if (desc) newBlock += `  \n${desc}`;

        const newMilestones = {...(activeRoutine.milestones || {})};

        if (editingMilestoneIdx) {
            const {dateStr: oldDate, idx} = editingMilestoneIdx;

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
            ...activeRoutine, milestones: newMilestones
        });

        setShowMilestoneModal(false);
        setMilestoneForm({date: '', tag: '', name: '', desc: '', done: false});
        setEditingMilestoneIdx(null);
        setCalendarSubTab('milestones');
        if (setSelectedTargetDate) setSelectedTargetDate(dateStr);
    };
    const modalInputRefs = useRef<any>({});

    let quickTasks: any[] = [];
    try {
        quickTasks = JSON.parse(localStorage.getItem('whatchadoin_quick_tasks') || '[]');
    } catch {
        quickTasks = [];
    }

    const publicFilter = (item: any) => !isPublicView || item.isPublic || (item.name || '').includes('[public]');
    const {allGoals, filteredGoals} = getAllGoalsForMention(
        (routineGoals || []).filter(publicFilter),
        (habits || []).filter(publicFilter),
        (lifeGoals || []).filter(publicFilter),
        mentionQuery,
        (moneyGoals || []).filter(publicFilter),
        (quickTasks || []).filter(publicFilter)
    );


    // Removed inline editing handlers


    const openAddHabit = () => {
        setEditingHabitId(null);
        setHabitForm({name: '', isPublic: true, desc: '', timeValue: '1:15', routineGoalIds: [], lifeGoalIds: [], color: ''});
        setShowHabitModal(true);
    };

    useEffect(() => {
        const handleFab = () => {
            if (calendarSubTab === 'milestones') {
                setEditingMilestoneIdx(null);
                setMilestoneForm({date: '', tag: '', name: '', desc: '', done: false});
                setShowMilestoneModal(true);
            } else {
                openAddHabit();
            }
        };
        window.addEventListener('fab:add-habits', handleFab);
        return () => window.removeEventListener('fab:add-habits', handleFab);
    }, [calendarSubTab]);


    const openEditHabit = (goal: any) => {
        setEditingHabitId(goal.id);

        const rIds = Array.isArray(goal.routineGoalIds) ? goal.routineGoalIds : (goal.routineGoalId ? [goal.routineGoalId] : []);
        const lIds = Array.isArray(goal.lifeGoalIds) ? goal.lifeGoalIds : (goal.lifeGoalId ? [goal.lifeGoalId] : []);

        setHabitForm({
            name: goal.name || '',
            desc: goal.desc || '',
            timeValue: goal.time || (typeof goal.duration === 'number' && goal.duration > 0 ? `${goal.duration}m` : (goal.duration || '')),
            routineGoalIds: rIds,
            lifeGoalIds: lIds,
            color: goal.color || '',
                isPublic: !!goal.isPublic
        });
        setShowHabitModal(true);
    };

    const duplicateHabit = (goal: any) => {
        const goalName = goal.name || '';
        const newGoal = {
            ...goal, name: '0_' + goalName, id: 'rg-' + Date.now(), completed: false
        };
        setHabits([...(habits || []), newGoal]);
    };

    const saveHabit = (e: any) => {
        e.preventDefault();
        if (!habitForm.name.trim()) return;

        let timeString = '';
        if (habitForm.timeValue) {
            timeString = habitForm.timeValue.toString();
        }

        const cleanName = habitForm.name.trim();
        const durationMins = timeString ? parseDuration(timeString) : 0;
        const goalData = {
            name: cleanName,
            desc: (habitForm.desc || '').trim(),
            time: timeString,
            duration: durationMins,
            routineGoalIds: habitForm.routineGoalIds,
            lifeGoalIds: habitForm.lifeGoalIds,
            isPublic: !!habitForm.isPublic, color: habitForm.color
        };

        if (editingHabitId) {
            const oldGoal = (habits || []).find(g => g.id === editingHabitId);
            setHabits((habits || []).map(g => g.id === editingHabitId ? {...g, ...goalData} : g));

            if (oldGoal && templates && setTemplates) {
                const oldTaskLower = (oldGoal.name || '').toLowerCase().trim();
                const newColors = getGoalColor(goalData, routineGoals, lifeGoals, moneyGoals);

                const updatedTemplates = templates.map(t => ({
                    ...t, blocks: t.blocks.map((b: any) => {
                        if (String(b.routineGoalId) === String(editingHabitId) || b.name.toLowerCase().trim() === oldTaskLower) {
                            return {
                                ...b,
                                name: goalData.name,
                                duration: timeString ? parseDuration(timeString) : b.duration,
                                routineGoalId: String(editingHabitId),
                                color: newColors[0] || '#ffffff'
                            };
                        }
                        return b;
                    })
                }));
                setTemplates(updatedTemplates);
            }
        } else {
            const newGoal = {
                ...goalData, id: 'rg-' + Date.now(), completed: false
            };
            setHabits([...(habits || []), newGoal]);
        }
        setShowHabitModal(false);
    };

    const handleDragStart = (e: any, goal: any) => {
        const hexes = getGoalColor(goal, routineGoals, lifeGoals, moneyGoals);

        e.dataTransfer.setData('source', 'sidebar');
        e.dataTransfer.setData('task', goal.name || '');
        e.dataTransfer.setData('desc', goal.desc || '');
        e.dataTransfer.setData('time', goal.time || (typeof goal.duration === 'number' && goal.duration > 0 ? `${goal.duration}m` : '1:15'));
        e.dataTransfer.setData('color', hexes[0] || '#ffffff');
        e.dataTransfer.setData('routineGoalId', goal.id);
        e.dataTransfer.setData('isPublic', (goal.isPublic || (goal.name || '').includes('[public]')) ? 'true' : 'false');
    };

    const checkRoutineAddressed = (goal: any) => {
        if (!templates) return false;

        // 1. Check explicit linking
        const explicitlyReferenced = templates.some(t => t.blocks.some((b: any) => String(b.routineGoalId) === String(goal.id)));
        if (explicitlyReferenced) return true;

        // 2. Fallback to text matching
        const txt = (goal.name || '').toLowerCase().trim();
        if (!txt) return false;
        return templates.some(t => t.blocks.some((b: any) => b.name.toLowerCase().trim() === txt));
    };


    const confirmDeleteHabit = (id: string, taskName: string) => {
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
                        ...t, blocks: t.blocks.filter((b: any) => b.routineGoalId !== id)
                    }));
                    setTemplates(updatedTemplates);
                }

                setShowHabitModal(false);
                setConfirmConfig(null);
            },
            onCancel: () => setConfirmConfig(null)
        });
    };

    const getScheduledGoalsForDateLocal = (dateStr: string) => {
        const goals = getScheduledGoalsForDate(dateStr, habits, dayMapping, templates);
        return goals.filter(g => !isPublicView || g.isPublic || (g.name || '').includes('[public]'));
    };

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
        const month = date.toLocaleString('en-US', {month: 'long'});
        const getOrdinalNum = (n: number) => n + (n > 0 ? (['th', 'st', 'nd', 'rd'][(n > 3 && n < 21) || n % 10 > 3 ? 0 : n % 10] || '') : '');
        return `${getOrdinalNum(day)} ${month}`;
    };

    const effectiveDate = (isCalendarTab && !selectedTargetDate) ? getTodayStr() : selectedTargetDate;

    let currentTemplateId = null;
    if (effectiveDate) {
        const [y, m, d] = (effectiveDate || '').split('-');
        const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
        if (!isNaN(dateObj.getTime())) {
            const dayName = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-US', {weekday: 'long'}) : '';
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

    let displayedRoutineGoals: any[];

    if (effectiveDate) {
        displayedRoutineGoals = getScheduledGoalsForDateLocal(effectiveDate);
    } else {
        displayedRoutineGoals = (habits || []).filter(g => (!isPublicView || g.isPublic || (g.name || '').includes('[public]')));
    }

    if (searchQuery) {
        displayedRoutineGoals = displayedRoutineGoals.filter(g => (g.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (habitFilterRoutineGoalId) {
        const routineGoal = routineGoals?.find(sg => sg.id === habitFilterRoutineGoalId);
        if (routineGoal) {
            const txt = (routineGoal.name || '').toLowerCase().trim();
            displayedRoutineGoals = displayedRoutineGoals.filter(g => {
                const rIds = Array.isArray(g.routineGoalIds) ? g.routineGoalIds : (g.routineGoalId ? [g.routineGoalId] : []);
                const gName = (g.name || '').toLowerCase().trim();
                return rIds.includes(habitFilterRoutineGoalId) || (txt && gName === txt) || (txt && g.desc && g.desc.toLowerCase().trim() === txt);
            });
        }
    } else if (habitFilterLifeGoalId) {
        displayedRoutineGoals = displayedRoutineGoals.filter(g => {
            const lIds = Array.isArray(g.lifeGoalIds) ? g.lifeGoalIds : (g.lifeGoalId ? [g.lifeGoalId] : []);
            return lIds.includes(habitFilterLifeGoalId);
        });
    }

    if (sortByName) {
        displayedRoutineGoals.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
    } else if (!effectiveDate) {
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

    const isMilestoneBlockPublic = (block: string) => {
        if (block.toLowerCase().includes('[public]')) return true;
        const tagsMatch = block.match(/@([^\s*]+)/g);
        if (tagsMatch) {
            return tagsMatch.some((t: string) => {
                const tagName = t.slice(1).toLowerCase();
                return allGoals.some((g: any) =>
                    (g.name || '').toLowerCase() === tagName && (g.isPublic || (g.name || '').toLowerCase().includes('[public]'))
                );
            });
        }
        return false;
    };

    const milestoneDates = Object.keys(activeRoutine.milestones || {}).filter(d => {
        const text = (activeRoutine.milestones[d] || '').trim();
        if (!text) return false;
        if (!isPublicView) return true;
        const blocks = text.split('\n\n');
        return blocks.some(b => b.trim() && isMilestoneBlockPublic(b));
    });
    milestoneDates.sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime());

    useEffect(() => {
        if (isCalendarTab && calendarSubTab === 'milestones' && effectiveDate) {
            setTimeout(() => {
                const el = document.getElementById(`milestone-block-${effectiveDate}`);
                if (el) {
                    el.scrollIntoView({behavior: 'smooth', block: 'start'});
                }
            }, 100);
        }
    }, [effectiveDate, isCalendarTab, calendarSubTab]);

    // Parse markdown to render colored tags
    const customMarkdownComponents = React.useMemo(() => ({
        strong: ({children, ...props}: any) => {
            const text = String(children).trim();
            if (text.startsWith('@')) {
                const goalName = text.slice(1);
                const goal = allGoals.find(g => (g.name || '').toLowerCase() === goalName.toLowerCase());
                if (goal && goal.color) {
                    return (<strong {...props} style={{
                        color: goal.color, background: `${goal.color}20`, padding: '0 4px', borderRadius: '4px'
                    }}>
                        {children}
                    </strong>);
                } else if (goal) {
                    return (<strong {...props} style={{
                        color: 'var(--accent)',
                        background: 'rgba(234, 179, 8, 0.1)',
                        padding: '0 4px',
                        borderRadius: '4px'
                    }}>
                        {children}
                    </strong>);
                }
            }
            return <strong {...props}>{children}</strong>;
        }
    }), [allGoals]);

    return (<aside
        className={`panel pane right-pane ${isMobileExpanded ? '' : 'mobile-collapsed'} ${isRoutineDrawerOpen ? 'drawer-open' : ''}`}
        style={{display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', minHeight: 0}}>
        <div className="panel-header" onClick={() => setIsMobileExpanded(!isMobileExpanded)} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            cursor: 'pointer',
            borderBottom: '1px solid var(--panel-border)'
        }}>
            <h2 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                {effectiveDate ? (
                    <>
                        <CheckCircle2 size={18} color="var(--accent)"/> Check {formatHeaderDate(effectiveDate)}
                    </>
                ) : (
                    <>
                        <ListTodo size={18} color="var(--accent)"/> Routine
                    </>
                )}
            </h2>
            <button className="accordion-icon icon-btn" style={{padding: '4px'}}>
                <ChevronDown size={16} style={{
                    transform: isMobileExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s'
                }}/>
            </button>
        </div>
        <div className="routine-pane-content" style={{
            display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0
        }}>
            {isRoutineDrawerOpen && (<div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px',
            }}>
                <h2 style={{margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <ListTodo size={20} color="var(--accent)"/>
                    Habits
                </h2>
                <button
                    className="icon-btn"
                    onClick={() => setIsRoutineDrawerOpen && setIsRoutineDrawerOpen(false)}
                    style={{padding: '8px', background: 'var(--panel-border)', borderRadius: '50%'}}
                >
                    <X size={18}/>
                </button>
            </div>)}
            <div className="tabs" style={{
                marginBottom: '16px', borderBottom: '1px solid var(--panel-border)', background: 'transparent'
            }}>
                <button
                    className={`tab ${calendarSubTab === 'mark_goals' ? 'active' : ''}`}
                    onClick={() => setCalendarSubTab('mark_goals')}
                >
                    {isCalendarTab ? 'Mark Habits' : 'Habits'}
                </button>
                <button
                    className={`tab ${calendarSubTab === 'milestones' ? 'active' : ''}`}
                    onClick={() => setCalendarSubTab('milestones')}
                >
                    Milestones
                </button>
            </div>

            {calendarSubTab === 'mark_goals' && (<>
                <button
                    onClick={openAddHabit} className={`secondary ${isCalendarTab ? '' : 'desktop-only-btn'}`}
                    style={{
                        width: '100%',
                        flexShrink: 0,
                        marginBottom: '16px',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        borderStyle: 'dashed'
                    }}
                >
                    <Plus size={16}/> Add Habit
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

                <div
                    className="habits-list-scroll-container"
                    style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    overflowY: 'auto',
                    flex: 1,
                    paddingRight: '4px'
                }}>

                    {(() => {
                        const getIsCompleted = (goal: any) => effectiveDate ? ((dailyLogs as any)?.[effectiveDate as string]?.[goal.id] || false) : (goal.completed || false);
                        const activeGoals = displayedRoutineGoals.filter(g => !getIsCompleted(g));
                        const completedGoals = displayedRoutineGoals.filter(g => getIsCompleted(g));

                        const renderGoal = (goal: any) => {
                            const isAddressed = checkRoutineAddressed(goal);
                            const hexes = getGoalColor(goal, routineGoals, lifeGoals, moneyGoals);
                            const hasColor = !!goal.color;
                            const bgStyle = getCardBgStyle(hexes, hasColor);

                            const baseMins = typeof goal.duration === 'number' && goal.duration > 0
                                ? goal.duration
                                : (goal.time ? parseDuration(goal.time) : 0);
                            let scheduledMins = 0;
                            if (currentTemplate) {
                                currentTemplate.blocks.forEach((b: any) => {
                                    if (String(b.routineGoalId) === String(goal.id)) scheduledMins += b.duration;
                                });
                            }
                            const count = goalCounts[goal.id] || 0;
                            const timeDiff = count > 0 ? (scheduledMins - (baseMins * count)) : 0;

                            const isCompletedForView = getIsCompleted(goal);
                            return (<div
                                key={goal.id}
                                className={`item-card ${isCompletedForView ? 'scratched' : ''}`}
                                draggable={!effectiveDate && !isRoutineDrawerOpen}
                                onDragStart={!effectiveDate && !isRoutineDrawerOpen ? (e) => handleDragStart(e, goal) : undefined}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    minHeight: '52px',
                                    padding: '8px 12px',
                                    touchAction: (!effectiveDate && !isRoutineDrawerOpen) ? 'none' : 'auto', ...bgStyle
                                }}
                                title={goal.desc ? `${goal.name}\n\n${goal.desc}` : goal.name}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    width: '100%'
                                }}>
                                    <div style={{
                                        display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: 0
                                    }}>
                                        {!effectiveDate && !isRoutineDrawerOpen && (<GripVertical size={16} color="var(--text-secondary)"
                                                                          style={{
                                                                              cursor: 'grab',
                                                                              flexShrink: 0,
                                                                              opacity: 0.5
                                                                          }}/>)}
                                        {effectiveDate ? (<input name="auto_field_28"
                                            type="checkbox"
                                            className="checkbox-square"
                                            style={{
                                                flexShrink: 0, '--accent': hexes[0] || '#ffffff'
                                            } as React.CSSProperties}
                                            checked={isCompletedForView}
                                            onChange={() => toggleDailyGoal(effectiveDate as string, goal.id)}
                                        />) : (<div style={{width: '16px', flexShrink: 0}}/>)}
                                        <div style={{
                                            flex: 1,
                                            minWidth: 0,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '2px',
                                            justifyContent: 'center'
                                        }}>
                                            <div style={{display: 'flex', alignItems: 'flex-start', gap: '6px'}}>
                          <span className="item-title" style={{
                              wordBreak: 'break-word',
                              whiteSpace: 'pre-wrap',
                              lineHeight: 1.4,
                              color: '#fff',
                              fontSize: '13px',
                              fontWeight: '600'
                          }}>
                            {goal.name}
                          </span>
                                                {isAddressed && (<CheckCircle2 size={12} color={hexes[0] || '#ffffff'}
                                                                               style={{
                                                                                   flexShrink: 0,
                                                                                   marginTop: '2px'
                                                                               }}/>)}
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                flexWrap: 'nowrap',
                                                gap: '6px',
                                                alignItems: 'center',
                                                overflow: 'hidden'
                                            }}>
                                                {(goal.time || goal.duration) && (<div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    color: 'var(--text-secondary)',
                                                    fontSize: '11px',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    <Clock size={10}/> {goal.time || (typeof goal.duration === 'number' ? `${goal.duration}m` : goal.duration)}
                                                </div>)}
                                                {(goalCounts[goal.id] || 0) > 1 && (<div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '2px 6px',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    borderRadius: '4px',
                                                    color: 'var(--text-secondary)',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    x{goalCounts[goal.id] || 0}
                                                </div>)}
                                                {timeDiff !== 0 && (<div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '2px 6px',
                                                    background: timeDiff > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                    borderRadius: '4px',
                                                    color: timeDiff > 0 ? '#4ade80' : '#f87171',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {timeDiff > 0 ? '+' : ''}{timeDiff}m
                                                </div>)}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        gap: '6px',
                                        flexShrink: 0,
                                        marginLeft: '6px',
                                        alignItems: 'center'
                                    }}>
                                        {!effectiveDate && (<>
                                            <button className="icon-btn" onClick={(e) => {
                                                e.stopPropagation();
                                                duplicateHabit(goal);
                                            }} style={{padding: '6px', cursor: 'pointer'}}>
                                                <Copy size={14}/>
                                            </button>
                                            <button className="icon-btn"
                                                    onClick={() => openEditHabit(goal)}
                                                    style={{padding: '6px', cursor: 'pointer'}}>
                                                <Pencil size={14}/>
                                            </button>
                                        </>)}
                                    </div>
                                </div>
                            </div>);
                        };

                        return (<>
                            {activeGoals.map(renderGoal)}
                            {completedGoals.length > 0 && (<div style={{
                                display: 'flex',
                                alignItems: 'center',
                                margin: '16px 0 8px 0',
                                justifyContent: 'space-between'
                            }}>
                                      <span style={{
                                          padding: '0 12px 0 0',
                                          fontSize: '12px',
                                          color: 'var(--text-secondary)',
                                          fontWeight: 500
                                      }}>
                                        Completed
                                      </span>
                                <div style={{flex: 1, height: '1px', background: 'var(--panel-border)'}}></div>
                                {!effectiveDate && (<button
                                    onClick={() => {
                                        setConfirmConfig({
                                            title: 'Delete All Completed',
                                            message: 'Are you sure you want to delete all completed habits? This cannot be undone.',
                                            isDanger: true,
                                            onConfirm: () => {
                                                setHabits(habits.filter((g: any) => !g.completed));
                                                setConfirmConfig(null);
                                            },
                                            onCancel: () => setConfirmConfig(null)
                                        });
                                    }}
                                    className="icon-btn"
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--danger)',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        padding: '4px 8px',
                                        fontWeight: 500,
                                        opacity: 0.8
                                    }}>
                                    Delete all
                                </button>)}
                            </div>)}
                            {completedGoals.map(renderGoal)}
                        </>);
                    })()}
                    {(habits || []).length === 0 && (<div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px 20px',
                        color: 'var(--text-secondary)',
                        textAlign: 'center',
                        border: '1px dashed var(--panel-border)',
                        borderRadius: '12px',
                        marginTop: '8px'
                    }}>
                        <ListTodo size={32}
                                  style={{marginBottom: '12px', opacity: 0.5, color: 'var(--accent)'}}/>
                        <div style={{fontSize: '14px', fontWeight: '500', color: '#fff'}}>No goals yet</div>
                        <div style={{fontSize: '12px', marginTop: '4px', opacity: 0.7}}>Start adding goals
                            and drag them to schedule.
                        </div>
                    </div>)}
                </div>
            </>)}

            {calendarSubTab === 'milestones' && (<div
                className="milestones-list-scroll-container"
                style={{
                flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflowY: 'auto'
            }}>
                <button
                    onClick={() => {
                        setEditingMilestoneIdx(null);
                        setMilestoneForm({
                            date: effectiveDate || new Date().toISOString().split('T')[0],
                            tag: '',
                            name: '',
                            desc: '',
                            done: false
                        });
                        setShowMilestoneModal(true);
                    }}
                    className={`secondary ${isCalendarTab ? '' : 'desktop-only-btn'}`}
                    style={{
                        width: '100%',
                        flexShrink: 0,
                        marginBottom: '16px',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        borderStyle: 'dashed'
                    }}
                >
                    <Plus size={16}/> Add Milestone
                </button>
                {milestoneDates.length === 0 ? (
                    <div style={{padding: '20px', textAlign: 'center', color: 'var(--text-secondary)'}}>
                        {isCalendarTab ? "No milestones found. Click 'Add Milestone' to create one." : "No milestones found."}
                    </div>) : (<div style={{
                    maxWidth: '800px', margin: '0 auto', width: '100%', position: 'relative', padding: '0 24px'
                }}>
                    <div style={{
                        borderLeft: '2px solid var(--panel-border)', marginLeft: '12px', paddingBottom: '24px'
                    }}>
                        {milestoneDates.map((dateStr) => {
                            const contentStr = (activeRoutine?.milestones || {})[dateStr] || '';
                            const blocks = (contentStr || '').split('\n\n');
                            const isActiveDate = effectiveDate === dateStr;

                            const todayDate = new Date();
                            todayDate.setHours(0, 0, 0, 0);
                            const blockDate = new Date(dateStr);
                            blockDate.setHours(0, 0, 0, 0);
                            const isPast = blockDate < todayDate;

                            const diffTime = blockDate.getTime() - todayDate.getTime();
                            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                            const diffStr = diffDays > 0 ? `+${diffDays} days` : `${diffDays} days`;

                            const validBlocks = blocks.filter(b => b.trim());
                            const isAllDone = validBlocks.length > 0 && validBlocks.every(b => {
                                const titleMatchWithTag = b.match(/^\*\*@([^*]+)\*\*\s*-\s*\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);
                                const titleMatchWithoutTag = b.match(/^\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);
                                const title = titleMatchWithTag ? titleMatchWithTag[2] : (titleMatchWithoutTag ? titleMatchWithoutTag[1] : b);
                                return title.startsWith('[x] ');
                            });

                            let nodeColor = isPast ? '#a855f7' : 'var(--accent)';
                            let multiColors: string[] = [];
                            const tagsMatch = contentStr.match(/@([^\s*]+)/g);
                            if (tagsMatch) {
                                const uniqueTags = [...new Set(tagsMatch.map((t: any) => t.slice(1).toLowerCase()))];
                                uniqueTags.forEach((tag: any) => {
                                    const goal = allGoals.find(g => (g.name || '').toLowerCase() === tag);
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

                            return (<div key={dateStr} id={`milestone-block-${dateStr}`} style={{
                                position: 'relative', marginBottom: '40px', paddingLeft: '24px'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    left: '-7px',
                                    top: '4px',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: backgroundStyle,
                                    border: '2px solid var(--panel-bg)',
                                    boxShadow: isActiveDate ? `0 0 10px ${nodeColor}80` : 'none',
                                    opacity: isActiveDate ? 1 : 0.6
                                }}/>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '16px'
                                }}>
                                    <div
                                        onClick={() => {
                                            if (setSelectedTargetDate) setSelectedTargetDate(dateStr);
                                        }}
                                        style={{
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            color: isActiveDate ? '#fff' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <span>
                                            {new Date(dateStr).toLocaleDateString('en-US', {
                                                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                                            })}
                                        </span>
                                        {isAllDone ? (<CheckCircle2 size={16} color="var(--success, #22c55e)"/>) : (
                                            <span style={{
                                                fontSize: '12px',
                                                color: diffDays < 0 ? '#ef4444' : 'var(--accent)',
                                                fontWeight: 'normal'
                                            }}>
                                                {diffStr}
                                            </span>)}
                                    </div>
                                    <button
                                        className="icon-btn"
                                        onClick={() => openEditMilestone(dateStr, 0, blocks[0])}
                                        style={{padding: '4px', display: 'flex', alignItems: 'center'}}
                                    >
                                        <Pencil size={14} color="var(--text-secondary)"/>
                                    </button>
                                </div>

                                {blocks.map((block: string, idx: number) => {
                                    if (!block.trim()) return null;
                                    if (isPublicView && !isMilestoneBlockPublic(block)) return null;
                                    return (<div
                                        key={idx}
                                        style={{
                                            padding: '2px 0', marginBottom: '8px'
                                        }}
                                    >
                                        <div className="markdown-preview">
                                            <ReactMarkdown
                                                components={customMarkdownComponents as any}>
                                                {block === '' ? '\u00A0' : block.trim()}
                                            </ReactMarkdown>
                                        </div>
                                    </div>);
                                })}
                            </div>);
                        })}
                    </div>

                    <div style={{height: '20vh'}}/>
                </div>)}
            </div>)}
        </div>

        {/* BOTTOM METRICS: Habit Insights */}
        <div style={{
            flex: 'none',
            background: 'rgba(0,0,0,0.3)',
            borderTop: '1px solid var(--panel-border)',
            padding: '0 16px',
            minHeight: '44px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '8px'
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)'
            }}>
                {(() => {
                    if (calendarSubTab === 'milestones') {
                        const count = milestoneDates.length;
                        return (<>
                            <Target size={14} color="var(--accent)"/>
                            <span>Total Milestones : {count}</span>
                        </>);
                    }

                    let allocatedCount = 0;
                    const visibleHabits = (habits || []).filter(h => !isPublicView || h.isPublic || (h.name || '').includes('[public]'));
                    if (currentTemplate && currentTemplate.blocks) {
                        allocatedCount = visibleHabits.filter(h => currentTemplate.blocks.some((b: any) => b.name === h.name)).length;
                    }
                    return (<>
                        <Activity size={14} color="var(--accent)"/>
                        <span>Allocated Habits : {allocatedCount} / {visibleHabits.length}</span>
                    </>);
                })()}
            </div>
        </div>

        {/* Habit Modal */}
        <BaseModal
            isOpen={showHabitModal}
            onClose={() => setShowHabitModal(false)}
            maxWidth="460px"
            title={<div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <div style={{background: 'rgba(234, 179, 8, 0.15)', padding: '8px', borderRadius: '8px'}}>
                        <ListTodo size={20} color="var(--accent)"/>
                    </div>
                    {editingHabitId ? `Edit Habit` : `New Habit`}
                </div>
                <p style={{margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'normal'}}>
                    Define your habit and connect it to the bigger picture.
                </p>
            </div>}
        >
            <form onSubmit={saveHabit} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>

                <div>
                    <label style={{
                        fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px'
                    }}>Habit Name</label>
                    <input name="auto_field_29"
                        type="text" placeholder="e.g. Read 10 pages of Atomic Habits" value={habitForm.name}
                        onChange={(e) => setHabitForm({...habitForm, name: e.target.value})} required
                        style={{width: '100%'}}
                    />
                </div>
                <div>
                    <label style={{
                        fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px'
                    }}>Details / Notes <span style={{opacity: 0.5}}>(optional)</span></label>
                    <textarea name="auto_field_30"
                        placeholder="Add any specific criteria for success..." value={habitForm.desc}
                        onChange={(e) => setHabitForm({...habitForm, desc: e.target.value})}
                        style={{width: '100%', minHeight: '80px', resize: 'vertical'}}
                    />
                </div>

                <div className="form-row" style={{display: 'flex', gap: '24px', flexWrap: 'wrap'}}>
                    <div style={{flex: '0 0 140px'}}>
                        <label style={{
                            fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px'
                        }}>Duration</label>
                        <input name="auto_field_31"
                            type="text" placeholder="1:20" value={String(habitForm.timeValue)}
                            onChange={(e) => setHabitForm({...habitForm, timeValue: e.target.value})}
                            style={{width: '100%'}}
                        />
                    </div>

                    <div style={{flex: 1, minWidth: '200px'}}>
                        <label style={{
                            fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px'
                        }}>
                            Override Color <span style={{opacity: 0.5}}>(optional)</span>
                        </label>
                        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center'}}>
                            <div
                                onClick={() => setHabitForm({...habitForm, color: ''})}
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    border: (!habitForm.color || habitForm.color === '') ? '2px solid white' : '2px solid transparent',
                                    background: 'var(--panel-bg)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '9px',
                                    color: 'var(--text-secondary)',
                                    transition: 'transform 0.1s',
                                    transform: (!habitForm.color || habitForm.color === '') ? 'scale(1.1)' : 'scale(1)'
                                }}
                                title="Auto (inherit from links)"
                            >
                                Auto
                            </div>
                            {COLORS.slice(0, 7).map(c => {
                                const isSelected = habitForm.color && habitForm.color.toLowerCase() === c.toLowerCase();
                                return (<button
                                    key={c}
                                    type="button"
                                    onClick={() => setHabitForm({...habitForm, color: c})}
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        padding: 0,
                                        background: c,
                                        border: `2px solid ${isSelected ? '#fff' : 'transparent'}`,
                                        cursor: 'pointer',
                                        transition: 'transform 0.1s',
                                        transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                                    }}
                                />);
                            })}

                            <div style={{
                                position: 'relative',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: (habitForm.color && !COLORS.some(c => c.toLowerCase() === habitForm.color.toLowerCase())) ? habitForm.color : 'rgba(255, 255, 255, 0.1)',
                                border: `2px solid ${(habitForm.color && !COLORS.some(c => c.toLowerCase() === habitForm.color.toLowerCase())) ? '#fff' : 'transparent'}`,
                                cursor: 'pointer',
                                transition: 'all 0.1s',
                                transform: (habitForm.color && !COLORS.some(c => c.toLowerCase() === habitForm.color.toLowerCase())) ? 'scale(1.1)' : 'scale(1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: (habitForm.color && !COLORS.some(c => c.toLowerCase() === habitForm.color.toLowerCase())) ? '#fff' : 'var(--text-secondary)'
                            }}>
                                {!(habitForm.color && !COLORS.some(c => c.toLowerCase() === habitForm.color.toLowerCase())) &&
                                    <Palette size={12}/>}
                                <input name="auto_field_32"
                                    type="color"
                                    value={habitForm.color ? habitForm.color.toLowerCase() : '#ffffff'}
                                    onChange={(e) => setHabitForm({
                                        ...habitForm, color: e.target.value
                                    })}
                                    style={{
                                        position: 'absolute',
                                        top: '-10px',
                                        left: '-10px',
                                        width: '44px',
                                        height: '44px',
                                        cursor: 'pointer',
                                        opacity: 0
                                    }}
                                    title="Custom Color"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label style={{
                        fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px'
                    }}>
                        Link to Daily Routines <span
                        style={{opacity: 0.5}}>- Select routines this habit belongs to</span>
                    </label>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                        {(routineGoals || []).length === 0 && <span style={{
                            fontSize: '12px', color: 'var(--text-secondary)'
                        }}>No routine goals available</span>}
                        {(routineGoals || []).map(sg => {
                            const isSelected = (habitForm.routineGoalIds || []).includes(sg.id);
                            const hex = sg.color || '#3b82f6';
                            return (<div
                                key={sg.id}
                                onClick={() => {
                                    const current = habitForm.routineGoalIds || [];
                                    const next = isSelected ? current.filter((id: string) => id !== sg.id) : [...current, sg.id];
                                    setHabitForm({...habitForm, routineGoalIds: next});
                                }}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    fontWeight: isSelected ? '500' : 'normal',
                                    background: isSelected ? `${hex}15` : 'var(--panel-bg)',
                                    border: `1px ${isSelected ? 'solid' : 'dashed'} ${isSelected ? hex : 'var(--panel-border)'}`,
                                    color: isSelected ? hex : 'var(--text-secondary)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {sg.name}
                            </div>);
                        })}
                    </div>
                </div>

                <div>
                    <label style={{
                        fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px'
                    }}>
                        Link to Life Goals <span
                        style={{opacity: 0.5}}>- Select life goals this habit supports</span>
                    </label>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                        {(lifeGoals || []).length === 0 && <span style={{
                            fontSize: '12px', color: 'var(--text-secondary)'
                        }}>No life goals available</span>}
                        {(lifeGoals || []).map(lg => {
                            const isSelected = (habitForm.lifeGoalIds || []).includes(lg.id);
                            const hex = lg.color || '#eab308';
                            return (<div
                                key={lg.id}
                                onClick={() => {
                                    const current = habitForm.lifeGoalIds || [];
                                    const next = isSelected ? current.filter((id: string) => id !== lg.id) : [...current, lg.id];
                                    setHabitForm({...habitForm, lifeGoalIds: next});
                                }}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    fontWeight: isSelected ? '500' : 'normal',
                                    background: isSelected ? `${hex}15` : 'var(--panel-bg)',
                                    border: `1px ${isSelected ? 'solid' : 'dashed'} ${isSelected ? hex : 'var(--panel-border)'}`,
                                    color: isSelected ? hex : 'var(--text-secondary)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {lg.name}
                            </div>);
                        })}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', cursor: 'pointer' }} onClick={() => setHabitForm({...habitForm, isPublic: !habitForm.isPublic})}>
                    <span style={{ fontSize: '13px', color: !habitForm.isPublic ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: !habitForm.isPublic ? 600 : 400, opacity: !habitForm.isPublic ? 1 : 0.6 }}>Private</span>
                    <label className="ios-switch" onClick={(e) => e.stopPropagation()}>
                        <input 
                            type="checkbox" 
                            id="habit-public"
                            checked={!!habitForm.isPublic}
                            onChange={(e) => setHabitForm({...habitForm, isPublic: e.target.checked})}
                        />
                        <span className="ios-slider"></span>
                    </label>
                    <span style={{ fontSize: '13px', color: habitForm.isPublic ? 'var(--success)' : 'var(--text-secondary)', fontWeight: habitForm.isPublic ? 600 : 400, display: 'flex', alignItems: 'center', gap: '4px', opacity: habitForm.isPublic ? 1 : 0.6 }}>
                        <Globe size={13} /> Public (Visible to others)
                    </span>
                </div>
                <div style={{display: 'flex', gap: '8px', marginTop: '16px', width: '100%', padding: '8px 0'}}>
                    {editingHabitId && (<button type="button"
                                                      onClick={() => confirmDeleteHabit(editingHabitId, habitForm.name)}
                                                      style={{
                                                          flex: '0 0 20%',
                                                          background: '#ef4444',
                                                          color: 'white',
                                                          border: 'none',
                                                          padding: '10px 0',
                                                          borderRadius: '6px',
                                                          fontWeight: '500'
                                                      }}>Delete</button>)}
                    <button type="button" onClick={() => setShowHabitModal(false)} className="secondary"
                            style={{
                                flex: editingHabitId ? '0 0 25%' : '0 0 30%',
                                padding: '10px 0',
                                borderRadius: '6px',
                                fontWeight: '500'
                            }}>Cancel
                    </button>
                    <button type="submit" className="primary" style={{
                        flex: 1, padding: '10px 0', borderRadius: '6px', fontWeight: 'bold'
                    }}>{editingHabitId ? 'Update' : 'Save'}</button>
                </div>
            </form>
        </BaseModal>


        {/* Add Milestone Modal */}
        <BaseModal
            isOpen={showMilestoneModal}
            onClose={() => setShowMilestoneModal(false)}
            maxWidth="460px"
            title={<div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <div style={{background: 'rgba(168, 85, 247, 0.15)', padding: '8px', borderRadius: '8px'}}>
                        <Plus size={20} color="#a855f7"/>
                    </div>
                    {editingMilestoneIdx !== null ? 'Edit Milestone' : 'Add Milestone'}
                </div>
                <p style={{margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'normal'}}>
                    {editingMilestoneIdx !== null ? 'Update or move your milestone.' : 'Mark an important event or deadline on your calendar.'}
                </p>
            </div>}
        >
            <form onSubmit={saveMilestone} style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid var(--panel-border)'
                }}>
                    <div className="form-row">
                        <div style={{flex: 1}}>
                            <label style={{
                                fontSize: '12px',
                                fontWeight: '500',
                                color: 'var(--text-secondary)',
                                display: 'block',
                                marginBottom: '8px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>Date</label>
                            <input name="auto_field_33"
                                type="date" value={milestoneForm.date}
                                onChange={(e) => setMilestoneForm({...milestoneForm, date: e.target.value})}
                                required
                                onKeyDown={(e) => e.preventDefault()}
                                onClick={(e) => (e.target as HTMLInputElement).showPicker()}
                                style={{
                                    width: '100%',
                                    fontSize: '14px',
                                    padding: '12px 14px',
                                    colorScheme: 'dark',
                                    cursor: 'pointer'
                                }}
                            />
                        </div>
                        <div style={{flex: 1}}>
                            <label style={{
                                fontSize: '12px',
                                fontWeight: '500',
                                color: 'var(--text-secondary)',
                                display: 'block',
                                marginBottom: '8px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>Tag (Optional)</label>
                            <Dropdown
                                value={milestoneForm.tag}
                                onChange={(val) => setMilestoneForm({...milestoneForm, tag: val})}
                                options={[{
                                    value: '', label: 'No Tag'
                                }, ...allGoals.map(g => ({
                                    value: g.name, label: `[${g.type}] ${g.name}`
                                }))]}
                            />
                        </div>
                    </div>
                    {editingMilestoneIdx !== null && (
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px'}}>
                            <input type="checkbox" id="milestone-done" checked={milestoneForm.done}
                                   onChange={(e) => setMilestoneForm({...milestoneForm, done: e.target.checked})} style={{
                                width: '18px',
                                height: '18px',
                                margin: 0,
                                cursor: 'pointer',
                                accentColor: 'var(--accent)'
                            }}/>
                            <label htmlFor="milestone-done"
                                   style={{fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer', margin: 0}}>Mark
                                as Done</label>
                        </div>
                    )}
                    <div style={{position: 'relative'}}>
                        <label style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: 'var(--text-secondary)',
                            display: 'block',
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>Milestone Name</label>
                        <input name="auto_field_34"
                            type="text" placeholder="e.g. Go live @inmasjid" value={milestoneForm.name}
                            ref={el => modalInputRefs.current['name'] = el}
                            onChange={(e) => handleModalInput(e, 'name')}
                            onKeyDown={(e) => handleModalKeyDown(e, 'name')} required
                            style={{width: '100%', fontSize: '16px', padding: '12px 14px'}}
                        />

                        {showMentionMenu && activeModalField === 'name' && filteredGoals.length > 0 && (<div
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
                            {filteredGoals.map((g, i) => (<div
                                key={g.id}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    insertModalMention(g, 'name');
                                }}
                                onMouseEnter={() => setMentionIndex(i)}
                                style={{
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    background: i === mentionIndex ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                    <span style={{fontSize: '13px', color: '#fff', fontWeight: i === mentionIndex ? 'bold' : 'normal'}}>
                      {g.name}
                    </span>
                                <span style={{fontSize: '11px', color: 'var(--accent)', marginTop: '2px'}}>
                      {g.type}
                    </span>
                            </div>))}
                        </div>)}

                    </div>
                    <div style={{position: 'relative'}}>
                        <label style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: 'var(--text-secondary)',
                            display: 'block',
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>Description (Optional)</label>
                        <textarea name="auto_field_35"
                            placeholder="Any extra details..." value={milestoneForm.desc}
                            ref={el => modalInputRefs.current['desc'] = el}
                            onChange={(e) => handleModalInput(e, 'desc')}
                            onKeyDown={(e) => handleModalKeyDown(e, 'desc')}
                            style={{
                                width: '100%',
                                fontSize: '16px',
                                padding: '12px 14px',
                                minHeight: '60px',
                                resize: 'vertical',
                                fontFamily: 'inherit'
                            }}
                        />

                        {showMentionMenu && activeModalField === 'desc' && filteredGoals.length > 0 && (<div
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
                            {filteredGoals.map((g, i) => (<div
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
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                    <span style={{fontSize: '13px', color: '#fff', fontWeight: i === mentionIndex ? 'bold' : 'normal'}}>
                      {g.name}
                    </span>
                                <span style={{fontSize: '11px', color: 'var(--accent)', marginTop: '2px'}}>
                      {g.type}
                    </span>
                            </div>))}
                        </div>)}

                    </div>
                </div>

                <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px'}}>
                    {editingMilestoneIdx !== null && (<button type="button" onClick={confirmDeleteMilestone}
                                                              style={{
                                                                  padding: '10px 20px',
                                                                  background: '#ef4444',
                                                                  color: 'white',
                                                                  border: 'none',
                                                                  borderRadius: '8px',
                                                                  marginRight: 'auto'
                                                              }}>Delete</button>)}
                    <button type="button" onClick={() => setShowMilestoneModal(false)} className="secondary"
                            style={{padding: '10px 20px'}}>Cancel
                    </button>
                    <button type="submit" className="primary"
                            style={{padding: '10px 20px'}}>{editingMilestoneIdx !== null ? 'Update Milestone' : 'Save Milestone'}</button>
                </div>
            </form>
        </BaseModal>

        {/* Confirm Modal */}
        {confirmConfig && (<ConfirmModal
            title={confirmConfig.title}
            message={confirmConfig.message}
            isDanger={confirmConfig.isDanger}
            onConfirm={confirmConfig.onConfirm}
            onCancel={confirmConfig.onCancel}
        />)}
    </aside>);
}
