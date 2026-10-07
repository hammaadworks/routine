import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    Activity,
    Calendar,
    CheckCircle2,
    ChevronDown,
    Clock,
    Globe,
    Layers,
    ListTodo,
    Palette,
    Pencil,
    Plus,
    Sparkles,
    Target,
    X
} from 'lucide-react';
import getCaretCoordinates from 'textarea-caret';
import Dropdown from './Dropdown';
import ConfirmModal from './ConfirmModal';
import BaseModal from './BaseModal';
import SearchSortBar from './SearchSortBar';
import {
    getAllGoalsForMention,
    getGoalColor,
    parseDuration
} from '../utils';
import HabitList from './habits/HabitList';
import MilestonesView from './habits/MilestonesView';
import TimelogView from './habits/TimelogView';
import LinkedMilestonesSection from './habits/LinkedMilestonesSection';
import { addAppEventListener } from '../utils/events';


const COLORS = ['#FF595E', '#FF9F1C', '#FFCA3A', '#8AC926', '#00F5D4', '#1982C4', '#4361EE', '#6A4C93', '#F15BB5', '#E07A5F'];

import type {CalendarSubTab} from '../types/ui';
interface HabitsPaneProps {
    isCalendarTab?: boolean;
    setCalendarSubTab?: (tab: CalendarSubTab) => void;
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
        activeRoutine: any;
    updateActiveRoutine?: (updates: any) => void;
    calendarSubTab?: CalendarSubTab;
    setSubTab?: (tab: CalendarSubTab) => void;
    isRoutineDrawerOpen?: boolean;
    setIsRoutineDrawerOpen?: (open: boolean) => void;
    moneyGoals?: any[];
    milestones?: Record<string, string>;
    setMilestones?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    isMobileAccordionOpen?: boolean;
    onToggleMobileAccordion?: () => void;
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
                                                                              activeRoutine,
                                       updateActiveRoutine,
                                       isCalendarTab,
                                       calendarSubTab: calendarSubTabProp,
                                       setCalendarSubTab,
                                       setSubTab,
                                       isRoutineDrawerOpen,
                                       setIsRoutineDrawerOpen,
                                       milestones: passedMilestones,
                                       setMilestones,
                                       isMobileAccordionOpen,
                                       onToggleMobileAccordion
                                   }: HabitsPaneProps) {
        const [showAllMilestones, setShowAllMilestones] = useState(true);
    const [showHabitModal, setShowHabitModal] = useState(false);
    const [editingHabitId, setEditingHabitId] = useState<any>(null);
    const [habitForm, setHabitForm] = useState<{
        name: string;
        desc: string;
        timeValue: string;
        routineGoalIds: string[];
        lifeGoalIds: string[];
        moneyGoalIds: string[];
        color: string;
        isPublic?: boolean;
        templateId?: string;
    }>({
        name: '',
        desc: '',
        timeValue: '1:15',
        routineGoalIds: [] as string[],
        lifeGoalIds: [] as string[],
        moneyGoalIds: [] as string[],
        color: '',
        isPublic: false,
        templateId: 'all'
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [milestoneSearchQuery, setMilestoneSearchQuery] = useState('');
    const [goalSearchQuery, setGoalSearchQuery] = useState('');
    const [goalCategoryFilter, setGoalCategoryFilter] = useState<'all' | 'routine' | 'life' | 'money' | 'selected'>('all');
    const [sortGoalsByName, setSortGoalsByName] = useState(false);
    const [sortByName, setSortByName] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<any>(null);
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);
    const [editingMilestoneIdx, setEditingMilestoneIdx] = useState<any>(null);
    const [milestoneForm, setMilestoneForm] = useState({
        date: '',
        tag: '',
        name: '',
        desc: '',
        done: false,
        isRepeating: false,
        repeatInterval: 1,
        repeatUnit: 'weeks' as 'days' | 'weeks',
        repeatDay: 4,
        endDate: '',
        applyToAllMatching: false
    });
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const isExpanded = isMobileAccordionOpen !== undefined ? isMobileAccordionOpen : isMobileExpanded;
    const toggleExpanded = onToggleMobileAccordion || (() => setIsMobileExpanded(!isMobileExpanded));

    const [localSubTab, setLocalSubTab] = useState<CalendarSubTab>(calendarSubTabProp || 'mark_goals');

    useEffect(() => {
        if (calendarSubTabProp) {
            setLocalSubTab(calendarSubTabProp === 'timelogs' ? 'timelog' : calendarSubTabProp);
        }
    }, [calendarSubTabProp]);

    const rawSubTab = calendarSubTabProp || localSubTab;
    const calendarSubTab = rawSubTab === 'timelogs' ? 'timelog' : rawSubTab;

    const handleTabChange = (tab: CalendarSubTab) => {
        const normalized = tab === 'timelogs' ? 'timelog' : tab;
        setLocalSubTab(normalized);
        if (setCalendarSubTab) setCalendarSubTab(normalized);
        if (setSubTab) setSubTab(normalized);
    };
    
    const [infoHabitId, setInfoHabitId] = useState<string | null>(null);

    const [showMentionMenu, setShowMentionMenu] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionCoords, setMentionCoords] = useState({top: 0, left: 0});
    const [mentionIndex, setMentionIndex] = useState(0);
    const [activeModalField, setActiveModalField] = useState<any>(null);

    const openEditMilestone = (dateStr: string, idx: number, block: string) => {
        const matchWithTag = block.match(/^\*\*@([^*]+)\*\*\s*-\s*\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);
        const matchWithoutTag = block.match(/^\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);

        const tag = matchWithTag ? (matchWithTag[1] || '') : '';
        const rawName = matchWithTag ? (matchWithTag[2] || '') : (matchWithoutTag ? (matchWithoutTag[1] || '') : (block || ''));
        const desc = matchWithTag
            ? (matchWithTag[3] || '').trim().replace(/ {2}\n/g, '\n')
            : (matchWithoutTag ? (matchWithoutTag[2] || '').trim().replace(/ {2}\n/g, '\n') : '');

        const done = rawName.startsWith('[x] ');
        const name = done
            ? rawName.substring(4)
            : (rawName.startsWith('[ ] ') ? rawName.substring(4) : rawName);

        const day = dateStr ? new Date(dateStr + 'T00:00:00').getDay() : 4;
        setEditingMilestoneIdx({
            dateStr,
            idx,
            originalName: name,
            originalTag: tag
        });
        setMilestoneForm({
            date: dateStr,
            tag: tag || '',
            name: name || '',
            desc: desc || '',
            done,
            isRepeating: false,
            repeatInterval: 1,
            repeatUnit: 'weeks',
            repeatDay: day,
            endDate: '',
            applyToAllMatching: false
        });
        setShowMilestoneModal(true);
    };

    const matchingOccurrences = useMemo(() => {
        if (!editingMilestoneIdx) return [];
        const targetName = (editingMilestoneIdx.originalName || milestoneForm.name || '').trim().toLowerCase();
        if (!targetName) return [];
        const targetTag = (editingMilestoneIdx.originalTag || milestoneForm.tag || '').trim().toLowerCase();
        const sourceMilestones = passedMilestones || activeRoutine?.milestones || {};
        const matches: Array<{ dateStr: string; blockIdx: number }> = [];

        Object.entries(sourceMilestones).forEach(([dStr, content]) => {
            if (!content || typeof content !== 'string') return;
            const blocks = content.split('\n\n');
            blocks.forEach((block, idx) => {
                if (!block.trim()) return;
                const matchWithTag = block.match(/^\*\*@([^*]+)\*\*\s*-\s*\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);
                const matchWithoutTag = block.match(/^\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);
                const tag = matchWithTag ? (matchWithTag[1] || '').trim().toLowerCase() : '';
                const rawName = matchWithTag ? (matchWithTag[2] || '') : (matchWithoutTag ? (matchWithoutTag[1] || '') : (block || ''));
                const cleanName = rawName.replace(/^\[(x| )\]\s*/, '').trim().toLowerCase();

                if (cleanName === targetName && (!targetTag || tag === targetTag)) {
                    matches.push({ dateStr: dStr, blockIdx: idx });
                }
            });
        });
        return matches;
    }, [editingMilestoneIdx, milestoneForm.name, milestoneForm.tag, passedMilestones, activeRoutine?.milestones]);

    const confirmDeleteMilestone = () => {
        if (!editingMilestoneIdx) return;

        setConfirmConfig({
            title: 'Delete Milestone',
            message: 'Are you sure you want to delete this milestone?',
            isDanger: true,
            onConfirm: () => {
                const {dateStr, idx} = editingMilestoneIdx;
                const sourceMilestones = passedMilestones || activeRoutine?.milestones || {};
                const newMilestones = {...sourceMilestones};
                const blocks = (newMilestones[dateStr] || '').split('\n\n');
                blocks.splice(idx, 1);
                newMilestones[dateStr] = blocks.join('\n\n');

                if (!newMilestones[dateStr].trim()) {
                    delete newMilestones[dateStr];
                }

                if (setMilestones) {
                    setMilestones(newMilestones);
                }
                if (updateActiveRoutine) {
                    updateActiveRoutine({
                        ...activeRoutine, milestones: newMilestones
                    });
                }

                setShowMilestoneModal(false);
                setConfirmConfig(null);
                setEditingMilestoneIdx(null);
            },
            onCancel: () => setConfirmConfig(null)
        });
    };

    const confirmDeleteAllMatching = () => {
        if (!editingMilestoneIdx) return;
        const targetName = (editingMilestoneIdx.originalName || milestoneForm.name).trim();
        const targetTag = (editingMilestoneIdx.originalTag || milestoneForm.tag || '').trim().toLowerCase();

        setConfirmConfig({
            title: 'Delete All Matching Events',
            message: `Are you sure you want to delete all ${matchingOccurrences.length} occurrences of "${targetName}"?`,
            isDanger: true,
            confirmText: `Delete All (${matchingOccurrences.length})`,
            onConfirm: () => {
                const normalizedTargetName = targetName.toLowerCase();
                const sourceMilestones = passedMilestones || activeRoutine?.milestones || {};
                const newMilestones = {...sourceMilestones};

                Object.keys(newMilestones).forEach(dStr => {
                    const content = newMilestones[dStr];
                    if (!content || typeof content !== 'string') return;
                    const blocks = content.split('\n\n');
                    const filteredBlocks = blocks.filter(block => {
                        if (!block.trim()) return false;
                        const matchWithTag = block.match(/^\*\*@([^*]+)\*\*\s*-\s*\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);
                        const matchWithoutTag = block.match(/^\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);
                        const tag = matchWithTag ? (matchWithTag[1] || '').trim().toLowerCase() : '';
                        const rawName = matchWithTag ? (matchWithTag[2] || '') : (matchWithoutTag ? (matchWithoutTag[1] || '') : (block || ''));
                        const cleanName = rawName.replace(/^\[(x| )\]\s*/, '').trim().toLowerCase();

                        const matchesName = cleanName === normalizedTargetName;
                        const matchesTag = !targetTag || tag === targetTag;
                        return !(matchesName && matchesTag);
                    });

                    if (filteredBlocks.length === 0) {
                        delete newMilestones[dStr];
                    } else {
                        newMilestones[dStr] = filteredBlocks.join('\n\n');
                    }
                });

                if (setMilestones) {
                    setMilestones(newMilestones);
                }
                if (updateActiveRoutine) {
                    updateActiveRoutine({
                        ...activeRoutine, milestones: newMilestones
                    });
                }

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
        const lastWord = textBefore.split(/\s/).pop() || '';

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
        const val = String(milestoneForm[field as keyof typeof milestoneForm] || '');
        const el = modalInputRefs.current[field];
        if (!el) return;

        const cursor = el.selectionStart || 0;
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

    const repeatingDates = useMemo(() => {
        if (!milestoneForm.isRepeating || !milestoneForm.date || !milestoneForm.endDate) return [];
        if (milestoneForm.date > milestoneForm.endDate) return [];
        const results: string[] = [];
        const interval = Math.max(1, Number(milestoneForm.repeatInterval) || 1);
        const unit = milestoneForm.repeatUnit || 'weeks';
        const end = new Date(milestoneForm.endDate + 'T00:00:00');

        if (unit === 'days') {
            const cur = new Date(milestoneForm.date + 'T00:00:00');
            while (cur <= end && results.length < 500) {
                const yyyy = cur.getFullYear();
                const mm = String(cur.getMonth() + 1).padStart(2, '0');
                const dd = String(cur.getDate()).padStart(2, '0');
                results.push(`${yyyy}-${mm}-${dd}`);
                cur.setDate(cur.getDate() + interval);
            }
        } else {
            const targetDay = Number(milestoneForm.repeatDay ?? 4);
            const cur = new Date(milestoneForm.date + 'T00:00:00');
            // Advance to first matching weekday on or after start date
            while (cur.getDay() !== targetDay) {
                cur.setDate(cur.getDate() + 1);
            }
            const stepDays = interval * 7;
            while (cur <= end && results.length < 500) {
                const yyyy = cur.getFullYear();
                const mm = String(cur.getMonth() + 1).padStart(2, '0');
                const dd = String(cur.getDate()).padStart(2, '0');
                results.push(`${yyyy}-${mm}-${dd}`);
                cur.setDate(cur.getDate() + stepDays);
            }
        }
        return results;
    }, [
        milestoneForm.isRepeating,
        milestoneForm.date,
        milestoneForm.endDate,
        milestoneForm.repeatInterval,
        milestoneForm.repeatUnit,
        milestoneForm.repeatDay
    ]);

    const saveMilestone = (e: any) => {
        e.preventDefault();
        if (!milestoneForm.date || !milestoneForm.name) return;

        const isRepeating = !editingMilestoneIdx && milestoneForm.isRepeating;
        if (isRepeating && (!milestoneForm.endDate || repeatingDates.length === 0)) return;

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

        const sourceMilestones = passedMilestones || activeRoutine?.milestones || {};
        const newMilestones = {...sourceMilestones};

        if (editingMilestoneIdx) {
            const {dateStr: oldDate, idx} = editingMilestoneIdx;
            const targetName = (editingMilestoneIdx.originalName || '').trim().toLowerCase();
            const targetTag = (editingMilestoneIdx.originalTag || '').trim().toLowerCase();

            if (milestoneForm.applyToAllMatching) {
                Object.keys(newMilestones).forEach(dStr => {
                    const content = newMilestones[dStr];
                    if (!content || typeof content !== 'string') return;
                    const blocks = content.split('\n\n');
                    const updatedBlocks = blocks.map(block => {
                        if (!block.trim()) return block;
                        const matchWithTag = block.match(/^\*\*@([^*]+)\*\*\s*-\s*\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);
                        const matchWithoutTag = block.match(/^\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);
                        const bTag = matchWithTag ? (matchWithTag[1] || '').trim().toLowerCase() : '';
                        const rawName = matchWithTag ? (matchWithTag[2] || '') : (matchWithoutTag ? (matchWithoutTag[1] || '') : (block || ''));
                        const isItemDone = rawName.startsWith('[x] ');
                        const cleanName = rawName.replace(/^\[(x| )\]\s*/, '').trim().toLowerCase();

                        if (cleanName === targetName && (!targetTag || bTag === targetTag)) {
                            const itemName = isItemDone ? `[x] ${name}` : name;
                            let b = '';
                            if (tag) b += `**@${tag}** - `;
                            b += `**${itemName}**`;
                            if (desc) b += `  \n${desc}`;
                            return b;
                        }
                        return block;
                    });
                    newMilestones[dStr] = updatedBlocks.join('\n\n');
                });
            } else {
                const oldBlocks = (newMilestones[oldDate] || '').split('\n\n');
                oldBlocks.splice(idx, 1);
                newMilestones[oldDate] = oldBlocks.join('\n\n');

                if (isRepeating) {
                    for (const d of repeatingDates) {
                        const current = newMilestones[d] || '';
                        const existingBlocks = current.split('\n\n').filter(Boolean);
                        if (!existingBlocks.includes(newBlock)) {
                            newMilestones[d] = current ? current + '\n\n' + newBlock : newBlock;
                        }
                    }
                } else {
                    const currentNewDate = newMilestones[dateStr] || '';
                    newMilestones[dateStr] = currentNewDate ? currentNewDate + '\n\n' + newBlock : newBlock;
                }
            }
        } else if (isRepeating) {
            for (const d of repeatingDates) {
                const current = newMilestones[d] || '';
                const existingBlocks = current.split('\n\n').filter(Boolean);
                if (!existingBlocks.includes(newBlock)) {
                    newMilestones[d] = current ? current + '\n\n' + newBlock : newBlock;
                }
            }
        } else {
            const current = newMilestones[dateStr] || '';
            newMilestones[dateStr] = current ? current + '\n\n' + newBlock : newBlock;
        }

        Object.keys(newMilestones).forEach(k => {
            if (!newMilestones[k].trim()) {
                delete newMilestones[k];
            }
        });

        if (setMilestones) {
            setMilestones(newMilestones);
        }
        if (updateActiveRoutine) {
            updateActiveRoutine({
                ...activeRoutine, milestones: newMilestones
            });
        }

        const targetDates = isRepeating ? repeatingDates : [dateStr];

        // Auto-switch to "All" view if the milestone is outside the active routine range
        if (activeRoutine?.start && activeRoutine?.end) {
            const isOutside = targetDates.some(d => d < activeRoutine.start || d > activeRoutine.end);
            if (isOutside) {
                setShowAllMilestones(true);
            }
        }

        setShowMilestoneModal(false);
        setMilestoneForm({
            date: '',
            tag: '',
            name: '',
            desc: '',
            done: false,
            isRepeating: false,
            repeatInterval: 1,
            repeatUnit: 'weeks',
            repeatDay: 4,
            endDate: '',
            applyToAllMatching: false
        });
        setEditingMilestoneIdx(null);
        handleTabChange('milestones');
        if (setSelectedTargetDate) setSelectedTargetDate(targetDates[0] || dateStr);
    };
    const modalInputRefs = useRef<any>({});
    const routinePaneContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (routinePaneContentRef.current) {
            routinePaneContentRef.current.scrollTop = 0;
        }
    }, [calendarSubTab]);

    const [quickTasks, setQuickTasks] = useState<any[]>(() => {
        try {
            const parsed = JSON.parse(localStorage.getItem('whatchadoin_quick_tasks') || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        const handleUpdate = () => {
            try {
                const parsed = JSON.parse(localStorage.getItem('whatchadoin_quick_tasks') || '[]');
                setQuickTasks(Array.isArray(parsed) ? parsed : []);
            } catch {
                setQuickTasks([]);
            }
        };
        window.addEventListener('whatchadoin_quick_tasks_updated', handleUpdate);
        return () => window.removeEventListener('whatchadoin_quick_tasks_updated', handleUpdate);
    }, []);

    const publicFilter = (item: any) => !isPublicView || item.isPublic || (item.name || '').includes('[public]');
    const {
        allGoals, filteredGoals
    } = getAllGoalsForMention((routineGoals || []).filter(publicFilter), (habits || []).filter(publicFilter), (lifeGoals || []).filter(publicFilter), mentionQuery, (moneyGoals || []).filter(publicFilter), (quickTasks || []).filter(publicFilter));

    const tagOptions = useMemo(() => {
        const list: Array<{ value: string; label: React.ReactNode; textSearch: string }> = [
            { value: '', label: 'No Tag', textSearch: 'No Tag none clear' }
        ];

        allGoals.forEach((g: any) => {
            if (!g.name) return;
            const typeBadgeColor = 
                g.type === 'Routine Goal' ? 'var(--accent)' :
                g.type === 'Habit' ? '#60a5fa' :
                g.type === 'Life Goal' ? '#c084fc' :
                g.type === 'Money Goal' ? '#34d399' : '#94a3b8';
                
            const typeBadgeBg = 
                g.type === 'Routine Goal' ? 'rgba(234, 179, 8, 0.15)' :
                g.type === 'Habit' ? 'rgba(59, 130, 246, 0.15)' :
                g.type === 'Life Goal' ? 'rgba(168, 85, 247, 0.15)' :
                g.type === 'Money Goal' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)';

            list.push({
                value: g.name,
                textSearch: `[${g.type}] ${g.name}`,
                label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, width: '100%' }}>
                        <span style={{
                            fontSize: '10px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            background: typeBadgeBg,
                            color: typeBadgeColor,
                            letterSpacing: '0.3px',
                            flexShrink: 0
                        }}>
                            {g.type}
                        </span>
                        <span style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: g.color || 'inherit'
                        }}>
                            {g.name}
                        </span>
                    </div>
                )
            });
        });

        if (milestoneForm.tag && !list.some(opt => opt.value === milestoneForm.tag)) {
            list.splice(1, 0, {
                value: milestoneForm.tag,
                textSearch: `@${milestoneForm.tag}`,
                label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span style={{
                            fontSize: '10px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            background: 'rgba(234, 179, 8, 0.15)',
                            color: 'var(--accent)',
                            letterSpacing: '0.3px',
                            flexShrink: 0
                        }}>
                            Tag
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {milestoneForm.tag}
                        </span>
                    </div>
                )
            });
        }

        return list;
    }, [allGoals, milestoneForm.tag]);

    const getTodayStr = useCallback(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }, []);

    const formatHeaderDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleString('en-US', {month: 'long'});
        const getOrdinalNum = (n: number) => n + (n > 0 ? (['th', 'st', 'nd', 'rd'][(n > 3 && n < 21) || n % 10 > 3 ? 0 : n % 10] || '') : '');
        return `${getOrdinalNum(day)} ${month}`;
    };

    const effectiveDate = (isCalendarTab && !selectedTargetDate) ? getTodayStr() : selectedTargetDate;
    const timelogDate = isCalendarTab ? (selectedTargetDate || getTodayStr()) : getTodayStr();
    const currentTimeLogs: Record<string, any[]> = activeRoutine?.timeLogs || {};
    const dayTimeLogs: any[] = currentTimeLogs[timelogDate] || [];

    const calcDurationMinutes = (start: string, end: string) => {
        if (!start || !end) return 0;
        const [h1 = 0, m1 = 0] = start.split(':').map(Number);
        const [h2 = 0, m2 = 0] = end.split(':').map(Number);
        if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff < 0) diff += 24 * 60;
        return diff;
    };

    const formatDuration = (mins: number) => {
        if (mins <= 0) return '0m';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    };

    const currentTemplateId = useMemo(() => {
        if (effectiveDate) {
            const [y, m, d] = (effectiveDate || '').split('-');
            const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
            if (!isNaN(dateObj.getTime())) {
                const dayName = dateObj.toLocaleDateString('en-US', {weekday: 'long'});
                if (dayMapping && dayName && dayMapping[dayName]) {
                    return dayMapping[dayName];
                }
            }
        }
        return activeTemplateId || (templates && templates[0]?.id) || null;
    }, [effectiveDate, dayMapping, activeTemplateId, templates]);

    const templateDropdownOptions = useMemo(() => {
        const opts: Array<{ value: string; label: React.ReactNode }> = [
            { value: 'all', label: 'All Templates (Shared)' }
        ];
        (templates || []).forEach((t: any) => {
            if (t && t.id) {
                opts.push({
                    value: t.id,
                    label: t.name || 'Untitled Template'
                });
            }
        });
        return opts;
    }, [templates]);

    const openAddHabit = useCallback(() => {
        setEditingHabitId(null);
        setGoalSearchQuery('');
        setGoalCategoryFilter('all');
        setSortGoalsByName(false);
        setHabitForm({
            name: '',
            isPublic: true,
            desc: '',
            timeValue: '1:15',
            routineGoalIds: [],
            lifeGoalIds: [],
            moneyGoalIds: [],
            color: '',
            templateId: currentTemplateId || activeTemplateId || (templates && templates[0]?.id) || 'all'
        });
        setShowHabitModal(true);
    }, [currentTemplateId, activeTemplateId, templates]);

    useEffect(() => {
        const handleFab = () => {
            if (calendarSubTab === 'milestones') {
                setEditingMilestoneIdx(null);
                const curDate = effectiveDate || new Date().toISOString().split('T')[0] || '';
                const day = curDate ? new Date(curDate + 'T00:00:00').getDay() : 4;
                setMilestoneForm({
                    date: curDate,
                    tag: '',
                    name: '',
                    desc: '',
                    done: false,
                    isRepeating: false,
                    repeatInterval: 1,
                    repeatUnit: 'weeks',
                    repeatDay: day,
                    endDate: '',
                    applyToAllMatching: false
                });
                setShowMilestoneModal(true);
            } else {
                openAddHabit();
            }
        };
        window.addEventListener('fab:add-habits', handleFab);
        return () => window.removeEventListener('fab:add-habits', handleFab);
    }, [calendarSubTab, openAddHabit]);


    const openEditHabit = (goal: any) => {
        setEditingHabitId(goal.id);
        setGoalSearchQuery('');
        setGoalCategoryFilter('all');
        setSortGoalsByName(false);

        const rIds = Array.isArray(goal.routineGoalIds) ? goal.routineGoalIds : (goal.routineGoalId ? [goal.routineGoalId] : []);
        const lIds = Array.isArray(goal.lifeGoalIds) ? goal.lifeGoalIds : (goal.lifeGoalId ? [goal.lifeGoalId] : []);
        const mIds = Array.isArray(goal.moneyGoalIds) ? goal.moneyGoalIds : (goal.moneyGoalId ? [goal.moneyGoalId] : []);

        setHabitForm({
            name: goal.name || '',
            desc: goal.desc || '',
            timeValue: goal.time || (typeof goal.duration === 'number' && goal.duration > 0 ? `${goal.duration}m` : (goal.duration || '')),
            routineGoalIds: rIds,
            lifeGoalIds: lIds,
            moneyGoalIds: mIds,
            color: goal.color || '',
            isPublic: !!goal.isPublic,
            templateId: goal.templateId || currentTemplateId || activeTemplateId || (templates && templates[0]?.id) || 'all'
        });
        setShowHabitModal(true);
    };

    const duplicateHabit = (goal: any) => {
        const goalName = goal.name || '';
        const newGoal = {
            ...goal,
            name: '0_' + goalName,
            id: 'rg-' + Date.now(),
            completed: false,
            templateId: goal.templateId || currentTemplateId || 'all'
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
            moneyGoalIds: habitForm.moneyGoalIds,
            isPublic: !!habitForm.isPublic,
            color: habitForm.color,
            templateId: habitForm.templateId || currentTemplateId || activeTemplateId || 'all'
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


    const currentTemplate = templates?.find(t => t.id === currentTemplateId);
    const goalCounts: Record<string, number> = {};
    if (currentTemplate) {
        currentTemplate.blocks.forEach((b: any) => {
            if (b.routineGoalId) {
                goalCounts[b.routineGoalId] = (goalCounts[b.routineGoalId] || 0) + 1;
            }
        });
    }

    const allVisibleHabits = (habits || []).filter(g => (!isPublicView || g.isPublic || (g.name || '').includes('[public]')));
    const templateFilteredHabits = allVisibleHabits.filter(g => {
        if (g.templateId === 'all') return true;
        if (g.templateId) return currentTemplateId ? g.templateId === currentTemplateId : true;
        const defaultTemplateId = activeTemplateId || (templates && templates[0]?.id);
        return !currentTemplateId || currentTemplateId === defaultTemplateId;
    });
    let displayedRoutineGoals: any[] = templateFilteredHabits;

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
    }

    const isMilestoneBlockPublic = useCallback((block: string) => {
        if (block.toLowerCase().includes('[public]')) return true;
        const tagsMatch = block.match(/@([^\s*]+)/g);
        if (tagsMatch) {
            return tagsMatch.some((t: string) => {
                const tagName = t.slice(1).toLowerCase();
                return allGoals.some((g: any) => (g.name || '').toLowerCase() === tagName && (g.isPublic || (g.name || '').toLowerCase().includes('[public]')));
            });
        }
        return false;
    }, [allGoals]);

    const currentMilestones = useMemo(() => passedMilestones || activeRoutine?.milestones || {}, [passedMilestones, activeRoutine?.milestones]);
    const milestoneDates = useMemo(() => {
        const dates = Object.keys(currentMilestones).filter(d => {
            const text = (currentMilestones[d] || '').trim();
            if (!text) return false;

            // Filter by routine range if not showing all
            if (!showAllMilestones && activeRoutine?.start && activeRoutine?.end) {
                if (d < activeRoutine.start || d > activeRoutine.end) {
                    return false;
                }
            }

            // Filter by search query (matches date or content)
            if (milestoneSearchQuery.trim()) {
                const query = milestoneSearchQuery.toLowerCase().trim();
                const matchesDate = d.toLowerCase().includes(query);
                const matchesContent = text.toLowerCase().includes(query);
                if (!matchesDate && !matchesContent) {
                    return false;
                }
            }

            if (!isPublicView) return true;
            const blocks = text.split('\n\n');
            return blocks.some((b: string) => b.trim() && isMilestoneBlockPublic(b));
        });
        dates.sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());
        return dates;
    }, [currentMilestones, showAllMilestones, activeRoutine?.start, activeRoutine?.end, milestoneSearchQuery, isPublicView, isMilestoneBlockPublic]);

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

    useEffect(() => {
        const unsubscribe = addAppEventListener('navigate-to-milestone', () => {
            setLocalSubTab('milestones');
            if (setCalendarSubTab) setCalendarSubTab('milestones');
            if (setSubTab) setSubTab('milestones');
            setShowAllMilestones(true);
            setMilestoneSearchQuery('');
            setIsMobileExpanded(true);
        });
        return unsubscribe;
    }, [setCalendarSubTab, setSubTab]);

    // Parse markdown to render colored tags
    
    return (<aside
        className={`panel pane right-pane ${isExpanded ? '' : 'mobile-collapsed'} ${isRoutineDrawerOpen ? 'drawer-open' : ''}`}
        style={{display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', minHeight: 0}}>
        <div className="panel-header" onClick={toggleExpanded} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            cursor: 'pointer',
            borderBottom: isExpanded ? '1px solid var(--panel-border)' : 'none',
            userSelect: 'none'
        }}>
            <h2 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: '#fff', flex: 1, minWidth: 0}}>
                {effectiveDate ? (<>
                    <CheckCircle2 size={18} color="var(--accent)" style={{flexShrink: 0}} />
                    <span>{isCalendarTab ? `Habits for ${formatHeaderDate(effectiveDate)}` : `Check ${formatHeaderDate(effectiveDate)}`}</span>
                </>) : (<>
                    <ListTodo size={18} color="var(--accent)" style={{flexShrink: 0}} />
                    <span>{isCalendarTab ? 'Habits' : 'Routine'}</span>
                </>)}
            </h2>
            <button
                type="button"
                className="mobile-accordion-toggle-btn accordion-icon"
                onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded();
                }}
                aria-label={isExpanded ? 'Collapse habits pane' : 'Expand habits pane'}
            >
                <ChevronDown
                    size={18}
                    color="var(--accent)"
                    style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s ease'
                    }}
                />
            </button>
        </div>
        <div ref={routinePaneContentRef} className="routine-pane-content" style={{
            display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0
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
                    onClick={() => handleTabChange('mark_goals')}
                >
                    {isCalendarTab ? 'Mark Habits' : 'Habits'}
                </button>
                <button
                    className={`tab ${calendarSubTab === 'timelog' ? 'active' : ''}`}
                    onClick={() => handleTabChange('timelog')}
                >
                    Timelog
                </button>
                <button
                    className={`tab ${calendarSubTab === 'milestones' ? 'active' : ''}`}
                    onClick={() => handleTabChange('milestones')}
                >
                    Milestones
                </button>
            </div>

            {calendarSubTab === 'mark_goals' && (
    <HabitList
        openAddHabit={openAddHabit}
        isCalendarTab={isCalendarTab || false}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortByName={sortByName}
        setSortByName={setSortByName}
        habitFilterRoutineGoalId={habitFilterRoutineGoalId}
        setHabitFilterRoutineGoalId={setHabitFilterRoutineGoalId}
        habitFilterLifeGoalId={habitFilterLifeGoalId}
        setHabitFilterLifeGoalId={setHabitFilterLifeGoalId}
        effectiveDate={effectiveDate}
        dailyLogs={dailyLogs}
        displayedRoutineGoals={displayedRoutineGoals}
        checkRoutineAddressed={checkRoutineAddressed}
        routineGoals={routineGoals}
        lifeGoals={lifeGoals}
        moneyGoals={moneyGoals || []}
        currentTemplate={currentTemplate}
        goalCounts={goalCounts}
        isRoutineDrawerOpen={isRoutineDrawerOpen}
        handleDragStart={handleDragStart}
        toggleDailyGoal={toggleDailyGoal}
        duplicateHabit={duplicateHabit}
        openEditHabit={openEditHabit}
        setConfirmConfig={setConfirmConfig}
        habits={habits}
        setHabits={setHabits}
        onCardClick={(habit) => setInfoHabitId(habit.id)}
    />
)}
{calendarSubTab === 'milestones' && (
    <MilestonesView
        effectiveDate={effectiveDate}
        isCalendarTab={isCalendarTab || false}
        allGoals={allGoals}
        currentMilestones={currentMilestones}
        milestoneDates={milestoneDates}
        isPublicView={isPublicView}
        isMilestoneBlockPublic={isMilestoneBlockPublic}
        milestoneSearchQuery={milestoneSearchQuery}
        setMilestoneSearchQuery={setMilestoneSearchQuery}
        setSelectedDate={setSelectedTargetDate}
        openEditMilestone={openEditMilestone}
        setEditingMilestoneIdx={setEditingMilestoneIdx}
        setMilestoneForm={setMilestoneForm}
        setShowMilestoneModal={setShowMilestoneModal}
        showAllMilestones={showAllMilestones}
        setShowAllMilestones={setShowAllMilestones}
    />
)}
{calendarSubTab === 'timelog' && (
    <TimelogView
        isCalendarTab={isCalendarTab || false}
        timelogDate={timelogDate}
        dayTimeLogs={dayTimeLogs}
        allGoals={allGoals}
        currentTimeLogs={currentTimeLogs}
        updateActiveRoutine={updateActiveRoutine}
        formatHeaderDate={formatHeaderDate}
        setConfirmConfig={setConfirmConfig}
    />
)}

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
                    if (calendarSubTab === 'timelog') {
                        const totalMins = dayTimeLogs.reduce((acc, log) => acc + calcDurationMinutes(log.startTime, log.endTime), 0);
                        return (<>
                            <Clock size={14} color="var(--accent)"/>
                            <span>Total Logged : {formatDuration(totalMins)} ({dayTimeLogs.length} {dayTimeLogs.length === 1 ? 'entry' : 'entries'})</span>
                        </>);
                    }
                    if (calendarSubTab === 'milestones') {
                        const count = milestoneDates.length;
                        return (<>
                            <Target size={14} color="var(--accent)"/>
                            <span>Total Milestones : {count}</span>
                        </>);
                    }

                    let allocatedCount = 0;
                    const scopedHabits = (habits || []).filter(h => !isPublicView || h.isPublic || (h.name || '').includes('[public]')).filter(g => {
                        if (g.templateId === 'all') return true;
                        if (g.templateId) return currentTemplateId ? g.templateId === currentTemplateId : true;
                        const defaultTemplateId = activeTemplateId || (templates && templates[0]?.id);
                        return !currentTemplateId || currentTemplateId === defaultTemplateId;
                    });
                    if (currentTemplate && currentTemplate.blocks) {
                        allocatedCount = scopedHabits.filter(h => currentTemplate.blocks.some((b: any) => b.name === h.name)).length;
                    }
                    return (<>
                        <Activity size={14} color="var(--accent)"/>
                        <span>Allocated Habits : {allocatedCount} / {scopedHabits.length}</span>
                    </>);
                })()}
            </div>
        </div>

        {/* Habit Modal */}
        <BaseModal
            isOpen={showHabitModal}
            onClose={() => setShowHabitModal(false)}
            maxWidth="460px"
            bodyClassName="modal-body-fixed-footer"
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
            <form onSubmit={saveHabit} className="modal-form-layout">
                <div className="modal-form-content">

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
                        }}>Template</label>
                        <Dropdown
                            value={habitForm.templateId || 'all'}
                            options={templateDropdownOptions}
                            onChange={(val) => setHabitForm({ ...habitForm, templateId: String(val) })}
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

                    {(() => {
                        const selectedRoutineCount = (habitForm.routineGoalIds || []).length;
                        const selectedMoneyCount = (habitForm.moneyGoalIds || []).length;
                        const selectedLifeCount = (habitForm.lifeGoalIds || []).length;
                        const totalSelected = selectedRoutineCount + selectedMoneyCount + selectedLifeCount;

                        const normalizedQuery = goalSearchQuery.trim().toLowerCase();
                        const filterGoal = (g: any, selectedIds: string[]) => {
                            const isSelected = selectedIds.includes(g.id);
                            if (goalCategoryFilter === 'selected' && !isSelected) return false;
                            if (!normalizedQuery) return true;
                            const nameMatch = (g.name || '').toLowerCase().includes(normalizedQuery);
                            const descMatch = (g.desc || '').toLowerCase().includes(normalizedQuery);
                            return nameMatch || descMatch;
                        };

                        const visibleRoutine = (goalCategoryFilter === 'all' || goalCategoryFilter === 'routine' || goalCategoryFilter === 'selected')
                            ? (routineGoals || []).filter(g => filterGoal(g, habitForm.routineGoalIds || []))
                            : [];
                        const visibleMoney = (goalCategoryFilter === 'all' || goalCategoryFilter === 'money' || goalCategoryFilter === 'selected')
                            ? (moneyGoals || []).filter(g => filterGoal(g, habitForm.moneyGoalIds || []))
                            : [];
                        const visibleLife = (goalCategoryFilter === 'all' || goalCategoryFilter === 'life' || goalCategoryFilter === 'selected')
                            ? (lifeGoals || []).filter(g => filterGoal(g, habitForm.lifeGoalIds || []))
                            : [];
                        if (sortGoalsByName) {
                            visibleRoutine.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
                            visibleMoney.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
                            visibleLife.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
                        }

                        const totalVisible = visibleRoutine.length + visibleMoney.length + visibleLife.length;
                        const totalAvailable = (routineGoals || []).length + (moneyGoals || []).length + (lifeGoals || []).length;

                        return (
                            <div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '8px'
                                }}>
                                    <label style={{
                                        fontSize: '12px',
                                        color: 'var(--text-secondary)',
                                        margin: 0
                                    }}>
                                        Link to Goals {totalSelected > 0 && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>({totalSelected} selected)</span>}
                                    </label>
                                    {totalSelected > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setHabitForm({ ...habitForm, routineGoalIds: [], moneyGoalIds: [], lifeGoalIds: [] })}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--text-secondary)',
                                                fontSize: '11px',
                                                cursor: 'pointer',
                                                padding: '2px 6px',
                                                textDecoration: 'underline'
                                            }}
                                        >
                                            Clear selected
                                        </button>
                                    )}
                                </div>

                                <SearchSortBar
                                    searchQuery={goalSearchQuery}
                                    setSearchQuery={setGoalSearchQuery}
                                    placeholder="Search goals..."
                                    sortByName={sortGoalsByName}
                                    setSortByName={setSortGoalsByName}
                                    isFilterActive={goalCategoryFilter !== 'all' || !!goalSearchQuery}
                                    onFilterClear={() => {
                                        setGoalSearchQuery('');
                                        setGoalCategoryFilter('all');
                                    }}
                                />

                                {/* Category Filter Chips */}
                                {totalAvailable > 0 && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        flexWrap: 'wrap',
                                        marginBottom: '10px'
                                    }}>
                                        <button
                                            type="button"
                                            onClick={() => setGoalCategoryFilter('all')}
                                            style={{
                                                fontSize: '11px',
                                                padding: '3px 8px',
                                                borderRadius: '12px',
                                                background: goalCategoryFilter === 'all' ? 'var(--accent)' : 'var(--panel-bg)',
                                                color: goalCategoryFilter === 'all' ? '#000' : 'var(--text-secondary)',
                                                border: `1px solid ${goalCategoryFilter === 'all' ? 'var(--accent)' : 'var(--panel-border)'}`,
                                                cursor: 'pointer',
                                                fontWeight: goalCategoryFilter === 'all' ? 600 : 400
                                            }}
                                        >
                                            All ({totalAvailable})
                                        </button>
                                        {(routineGoals || []).length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setGoalCategoryFilter(goalCategoryFilter === 'routine' ? 'all' : 'routine')}
                                                style={{
                                                    fontSize: '11px',
                                                    padding: '3px 8px',
                                                    borderRadius: '12px',
                                                    background: goalCategoryFilter === 'routine' ? 'rgba(59, 130, 246, 0.25)' : 'var(--panel-bg)',
                                                    color: goalCategoryFilter === 'routine' ? '#60a5fa' : 'var(--text-secondary)',
                                                    border: `1px solid ${goalCategoryFilter === 'routine' ? '#3b82f6' : 'var(--panel-border)'}`,
                                                    cursor: 'pointer',
                                                    fontWeight: goalCategoryFilter === 'routine' ? 600 : 400
                                                }}
                                            >
                                                🎯 Routine ({(routineGoals || []).length})
                                            </button>
                                        )}
                                        {(lifeGoals || []).length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setGoalCategoryFilter(goalCategoryFilter === 'life' ? 'all' : 'life')}
                                                style={{
                                                    fontSize: '11px',
                                                    padding: '3px 8px',
                                                    borderRadius: '12px',
                                                    background: goalCategoryFilter === 'life' ? 'rgba(234, 179, 8, 0.25)' : 'var(--panel-bg)',
                                                    color: goalCategoryFilter === 'life' ? 'var(--accent)' : 'var(--text-secondary)',
                                                    border: `1px solid ${goalCategoryFilter === 'life' ? 'var(--accent)' : 'var(--panel-border)'}`,
                                                    cursor: 'pointer',
                                                    fontWeight: goalCategoryFilter === 'life' ? 600 : 400
                                                }}
                                            >
                                                ⭐ Life ({(lifeGoals || []).length})
                                            </button>
                                        )}
                                        {(moneyGoals || []).length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setGoalCategoryFilter(goalCategoryFilter === 'money' ? 'all' : 'money')}
                                                style={{
                                                    fontSize: '11px',
                                                    padding: '3px 8px',
                                                    borderRadius: '12px',
                                                    background: goalCategoryFilter === 'money' ? 'rgba(138, 201, 38, 0.25)' : 'var(--panel-bg)',
                                                    color: goalCategoryFilter === 'money' ? '#8AC926' : 'var(--text-secondary)',
                                                    border: `1px solid ${goalCategoryFilter === 'money' ? '#8AC926' : 'var(--panel-border)'}`,
                                                    cursor: 'pointer',
                                                    fontWeight: goalCategoryFilter === 'money' ? 600 : 400
                                                }}
                                            >
                                                💰 Money ({(moneyGoals || []).length})
                                            </button>
                                        )}
                                        {totalSelected > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setGoalCategoryFilter(goalCategoryFilter === 'selected' ? 'all' : 'selected')}
                                                style={{
                                                    fontSize: '11px',
                                                    padding: '3px 8px',
                                                    borderRadius: '12px',
                                                    background: goalCategoryFilter === 'selected' ? 'rgba(34, 197, 94, 0.25)' : 'var(--panel-bg)',
                                                    color: goalCategoryFilter === 'selected' ? 'var(--success, #22c55e)' : 'var(--text-secondary)',
                                                    border: `1px solid ${goalCategoryFilter === 'selected' ? 'var(--success, #22c55e)' : 'var(--panel-border)'}`,
                                                    cursor: 'pointer',
                                                    fontWeight: goalCategoryFilter === 'selected' ? 600 : 400
                                                }}
                                            >
                                                ✓ Selected ({totalSelected})
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Goal Pills Container */}
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    maxHeight: '180px',
                                    overflowY: 'auto',
                                    padding: '6px',
                                    border: '1px solid var(--panel-border)',
                                    borderRadius: '8px',
                                    background: 'rgba(0, 0, 0, 0.15)'
                                }}>
                                    {/* Routine Goals */}
                                    {visibleRoutine.map(sg => {
                                        const isSelected = (habitForm.routineGoalIds || []).includes(sg.id);
                                        const hex = sg.color || '#3b82f6';
                                        return (
                                            <div
                                                key={sg.id}
                                                onClick={() => {
                                                    const current = habitForm.routineGoalIds || [];
                                                    const next = isSelected ? current.filter((id: string) => id !== sg.id) : [...current, sg.id];
                                                    setHabitForm({ ...habitForm, routineGoalIds: next });
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    cursor: 'pointer',
                                                    fontWeight: isSelected ? '500' : 'normal',
                                                    background: isSelected ? `${hex}20` : 'var(--panel-bg)',
                                                    border: `1px ${isSelected ? 'solid' : 'dashed'} ${isSelected ? hex : 'var(--panel-border)'}`,
                                                    color: isSelected ? hex : 'var(--text-secondary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <span>🎯</span>
                                                <span>{sg.name}</span>
                                            </div>
                                        );
                                    })}

                                    {/* Money Goals */}
                                    {visibleMoney.map(mg => {
                                        const isSelected = (habitForm.moneyGoalIds || []).includes(mg.id);
                                        const hex = mg.color || '#8AC926';
                                        return (
                                            <div
                                                key={mg.id}
                                                onClick={() => {
                                                    const current = habitForm.moneyGoalIds || [];
                                                    const next = isSelected ? current.filter((id: string) => id !== mg.id) : [...current, mg.id];
                                                    setHabitForm({ ...habitForm, moneyGoalIds: next });
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    cursor: 'pointer',
                                                    fontWeight: isSelected ? '500' : 'normal',
                                                    background: isSelected ? `${hex}20` : 'var(--panel-bg)',
                                                    border: `1px ${isSelected ? 'solid' : 'dashed'} ${isSelected ? hex : 'var(--panel-border)'}`,
                                                    color: isSelected ? hex : 'var(--text-secondary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <span>💰</span>
                                                <span>{mg.name}</span>
                                            </div>
                                        );
                                    })}

                                    {/* Life Goals */}
                                    {visibleLife.map(lg => {
                                        const isSelected = (habitForm.lifeGoalIds || []).includes(lg.id);
                                        const hex = lg.color || '#eab308';
                                        return (
                                            <div
                                                key={lg.id}
                                                onClick={() => {
                                                    const current = habitForm.lifeGoalIds || [];
                                                    const next = isSelected ? current.filter((id: string) => id !== lg.id) : [...current, lg.id];
                                                    setHabitForm({ ...habitForm, lifeGoalIds: next });
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    cursor: 'pointer',
                                                    fontWeight: isSelected ? '500' : 'normal',
                                                    background: isSelected ? `${hex}20` : 'var(--panel-bg)',
                                                    border: `1px ${isSelected ? 'solid' : 'dashed'} ${isSelected ? hex : 'var(--panel-border)'}`,
                                                    color: isSelected ? hex : 'var(--text-secondary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <span>⭐</span>
                                                <span>{lg.name}</span>
                                            </div>
                                        );
                                    })}

                                    {totalVisible === 0 && (
                                        <div style={{
                                            padding: '12px',
                                            textAlign: 'center',
                                            color: 'var(--text-secondary)',
                                            fontSize: '12px',
                                            width: '100%'
                                        }}>
                                            {goalSearchQuery.trim() || goalCategoryFilter !== 'all' ? (
                                                <div>
                                                    No goals match your filter.{' '}
                                                    <span
                                                        onClick={() => { setGoalSearchQuery(''); setGoalCategoryFilter('all'); }}
                                                        style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                                                    >
                                                        Clear filter
                                                    </span>
                                                </div>
                                            ) : (
                                                'No goals available'
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '16px',
                        cursor: 'pointer'
                    }}
                         onClick={() => setHabitForm({...habitForm, isPublic: !habitForm.isPublic})}>
                    <span style={{
                        fontSize: '13px',
                        color: !habitForm.isPublic ? 'var(--danger)' : 'var(--text-secondary)',
                        fontWeight: !habitForm.isPublic ? 600 : 400,
                        opacity: !habitForm.isPublic ? 1 : 0.6
                    }}>Private</span>
                        <label className="ios-switch" onClick={(e) => e.stopPropagation()}>
                            <input
                                type="checkbox"
                                id="habit-public"
                                checked={!!habitForm.isPublic}
                                onChange={(e) => setHabitForm({...habitForm, isPublic: e.target.checked})}
                            />
                            <span className="ios-slider"></span>
                        </label>
                        <span style={{
                            fontSize: '13px',
                            color: habitForm.isPublic ? 'var(--success)' : 'var(--text-secondary)',
                            fontWeight: habitForm.isPublic ? 600 : 400,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            opacity: habitForm.isPublic ? 1 : 0.6
                        }}>
                        <Globe size={13}/> Public (Visible to others)
                    </span>
                    </div>
                </div>

                <div className="modal-form-actions" style={{flexWrap: 'wrap'}}>
                    {editingHabitId && (<button type="button"
                                                onClick={() => confirmDeleteHabit(editingHabitId, habitForm.name)}
                                                style={{
                                                    flex: '1 1 calc(30% - 4px)',
                                                    background: '#ef4444',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '10px 0',
                                                    borderRadius: '6px',
                                                    fontWeight: '500',
                                                    cursor: 'pointer'
                                                }}>Delete</button>)}
                    <button type="button" onClick={() => setShowHabitModal(false)} className="secondary"
                            style={{
                                flex: editingHabitId ? '1 1 calc(30% - 4px)' : '1 1 80px',
                                padding: '10px 0',
                                borderRadius: '6px',
                                fontWeight: '500'
                            }}>Cancel
                    </button>
                    <button type="submit" className="primary" style={{
                        flex: editingHabitId ? '2 1 calc(40% - 4px)' : '2 1 120px',
                        padding: '10px 0',
                        borderRadius: '6px',
                        fontWeight: 'bold'
                    }}>{editingHabitId ? 'Update' : 'Save'}</button>
                </div>
            </form>
        </BaseModal>


        {/* Add Milestone Modal */}
        <BaseModal
            isOpen={showMilestoneModal}
            onClose={() => setShowMilestoneModal(false)}
            maxWidth="460px"
            bodyClassName="modal-body-fixed-footer"
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
            <form onSubmit={saveMilestone} className="modal-form-layout">
                <div className="modal-form-content">
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid var(--panel-border)'
                    }}>
                        {editingMilestoneIdx && matchingOccurrences.length > 1 && (
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(234, 179, 8, 0.12)',
                                border: '1px solid rgba(234, 179, 8, 0.3)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px'
                            }}>
                                <span style={{fontSize: '12px', color: 'var(--accent)', fontWeight: 500}}>
                                    🔁 Repeats across <strong>{matchingOccurrences.length}</strong> dates
                                </span>
                                <label style={{
                                    fontSize: '12px',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    margin: 0,
                                    userSelect: 'none'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={!!milestoneForm.applyToAllMatching}
                                        onChange={(e) => setMilestoneForm(prev => ({...prev, applyToAllMatching: e.target.checked}))}
                                        style={{accentColor: 'var(--accent)', margin: 0, cursor: 'pointer', width: '14px', height: '14px'}}
                                    />
                                    Apply to all {matchingOccurrences.length}
                                </label>
                            </div>
                        )}
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
                                }}>{milestoneForm.isRepeating ? 'Start Date' : 'Date'}</label>
                                <input name="auto_field_33"
                                       type="date" value={milestoneForm.date}
                                       onChange={(e) => {
                                           const newDate = e.target.value;
                                           const day = newDate ? new Date(newDate + 'T00:00:00').getDay() : 4;
                                           setMilestoneForm(prev => ({
                                               ...prev,
                                               date: newDate,
                                               repeatDay: prev.isRepeating ? prev.repeatDay : day
                                           }));
                                       }}
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
                                    onChange={(val) => setMilestoneForm({...milestoneForm, tag: String(val)})}
                                    options={tagOptions}
                                    placeholder="No Tag"
                                />
                            </div>
                        </div>
                        {editingMilestoneIdx !== null && (
                            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px'}}>
                                <input type="checkbox" id="milestone-done" checked={milestoneForm.done}
                                       onChange={(e) => setMilestoneForm({...milestoneForm, done: e.target.checked})}
                                       style={{
                                           width: '18px',
                                           height: '18px',
                                           margin: 0,
                                           cursor: 'pointer',
                                           accentColor: 'var(--accent)'
                                       }}/>
                                <label htmlFor="milestone-done"
                                       style={{
                                           fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer', margin: 0
                                       }}>Mark
                                    as Done</label>
                            </div>)}
                        <div style={{
                            display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                padding: '12px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--panel-border)',
                                borderRadius: '8px'
                            }}>
                                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                                    <label htmlFor="milestone-repeat" style={{
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        margin: 0
                                    }}>
                                        <input
                                            type="checkbox"
                                            id="milestone-repeat"
                                            checked={!!milestoneForm.isRepeating}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                const dateDay = milestoneForm.date ? new Date(milestoneForm.date + 'T00:00:00').getDay() : 4;
                                                setMilestoneForm(prev => ({
                                                    ...prev,
                                                    isRepeating: checked,
                                                    repeatDay: prev.repeatDay ?? dateDay,
                                                    endDate: checked && !prev.endDate ? (activeRoutine?.end || '') : prev.endDate
                                                }));
                                            }}
                                            style={{
                                                width: '16px',
                                                height: '16px',
                                                margin: 0,
                                                cursor: 'pointer',
                                                accentColor: 'var(--accent)'
                                            }}
                                        />
                                        Repeat Event
                                    </label>
                                    {milestoneForm.isRepeating && activeRoutine?.end && (
                                        <button
                                            type="button"
                                            onClick={() => setMilestoneForm(prev => ({...prev, endDate: activeRoutine.end || ''}))}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--accent)',
                                                fontSize: '11px',
                                                cursor: 'pointer',
                                                padding: 0,
                                                textDecoration: 'underline'
                                            }}
                                        >
                                            Until routine end ({activeRoutine.end})
                                        </button>
                                    )}
                                </div>

                                {milestoneForm.isRepeating && (
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px'}}>
                                        {/* Presets and Every N Unit */}
                                        <div>
                                            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px'}}>
                                                <label style={{
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    color: 'var(--text-secondary)',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    margin: 0
                                                }}>Frequency</label>
                                                <div style={{display: 'flex', gap: '4px'}}>
                                                    {[
                                                        { label: 'Weekly', interval: 1, unit: 'weeks' as const },
                                                        { label: 'Biweekly', interval: 2, unit: 'weeks' as const },
                                                        { label: '10 Days', interval: 10, unit: 'days' as const }
                                                    ].map((preset) => {
                                                        const isActive = milestoneForm.repeatInterval === preset.interval && milestoneForm.repeatUnit === preset.unit;
                                                        return (
                                                            <button
                                                                key={preset.label}
                                                                type="button"
                                                                onClick={() => setMilestoneForm(prev => ({
                                                                    ...prev,
                                                                    repeatInterval: preset.interval,
                                                                    repeatUnit: preset.unit
                                                                }))}
                                                                style={{
                                                                    padding: '3px 8px',
                                                                    fontSize: '11px',
                                                                    fontWeight: isActive ? 700 : 500,
                                                                    borderRadius: '4px',
                                                                    border: isActive ? '1px solid var(--accent)' : '1px solid var(--panel-border)',
                                                                    background: isActive ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                                                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                {preset.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                                <span style={{fontSize: '13px', color: 'var(--text-secondary)'}}>Every</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="365"
                                                    value={milestoneForm.repeatInterval || 1}
                                                    onChange={(e) => setMilestoneForm(prev => ({
                                                        ...prev,
                                                        repeatInterval: Math.max(1, parseInt(e.target.value) || 1)
                                                    }))}
                                                    style={{
                                                        width: '65px',
                                                        padding: '8px 10px',
                                                        fontSize: '14px',
                                                        textAlign: 'center',
                                                        colorScheme: 'dark'
                                                    }}
                                                />
                                                <div style={{display: 'flex', gap: '4px'}}>
                                                    {(['days', 'weeks'] as const).map((u) => {
                                                        const isSelected = (milestoneForm.repeatUnit || 'weeks') === u;
                                                        return (
                                                            <button
                                                                key={u}
                                                                type="button"
                                                                onClick={() => setMilestoneForm(prev => ({...prev, repeatUnit: u}))}
                                                                style={{
                                                                    padding: '8px 14px',
                                                                    fontSize: '13px',
                                                                    fontWeight: isSelected ? 700 : 500,
                                                                    borderRadius: '6px',
                                                                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--panel-border)',
                                                                    background: isSelected ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)',
                                                                    color: isSelected ? '#000' : 'var(--text-primary)',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                {u === 'days' ? 'Day(s)' : 'Week(s)'}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* If unit === 'weeks', show Day of Week Selector */}
                                        {(milestoneForm.repeatUnit || 'weeks') === 'weeks' && (
                                            <div>
                                                <label style={{
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    color: 'var(--text-secondary)',
                                                    display: 'block',
                                                    marginBottom: '6px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>Repeat On Day</label>
                                                <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px'}}>
                                                    {[
                                                        { day: 0, label: 'Sun' },
                                                        { day: 1, label: 'Mon' },
                                                        { day: 2, label: 'Tue' },
                                                        { day: 3, label: 'Wed' },
                                                        { day: 4, label: 'Thu' },
                                                        { day: 5, label: 'Fri' },
                                                        { day: 6, label: 'Sat' }
                                                    ].map(({day, label}) => {
                                                        const isSelected = (milestoneForm.repeatDay ?? 4) === day;
                                                        return (
                                                            <button
                                                                key={day}
                                                                type="button"
                                                                onClick={() => setMilestoneForm(prev => ({...prev, repeatDay: day}))}
                                                                style={{
                                                                    padding: '6px 0',
                                                                    fontSize: '12px',
                                                                    fontWeight: isSelected ? 700 : 500,
                                                                    borderRadius: '6px',
                                                                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--panel-border)',
                                                                    background: isSelected ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)',
                                                                    color: isSelected ? '#000' : 'var(--text-primary)',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                            >
                                                                {label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label style={{
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: 'var(--text-secondary)',
                                                display: 'block',
                                                marginBottom: '6px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>Repeat Until</label>
                                            <input
                                                type="date"
                                                value={milestoneForm.endDate || ''}
                                                min={milestoneForm.date || ''}
                                                onChange={(e) => setMilestoneForm(prev => ({...prev, endDate: e.target.value}))}
                                                required={milestoneForm.isRepeating}
                                                onKeyDown={(e) => e.preventDefault()}
                                                onClick={(e) => (e.target as HTMLInputElement).showPicker()}
                                                style={{
                                                    width: '100%',
                                                    fontSize: '14px',
                                                    padding: '10px 12px',
                                                    colorScheme: 'dark',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        </div>

                                        <div style={{
                                            fontSize: '12px',
                                            color: repeatingDates.length > 0 ? 'var(--accent)' : '#ef4444',
                                            padding: '8px 12px',
                                            background: repeatingDates.length > 0 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            border: `1px solid ${repeatingDates.length > 0 ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <Calendar size={14} style={{flexShrink: 0}} />
                                            {repeatingDates.length > 0 ? (
                                                <span>
                                                    Will add <strong>{repeatingDates.length}</strong> {repeatingDates.length === 1 ? 'milestone' : 'milestones'}: {
                                                        repeatingDates.slice(0, 4).map(d => {
                                                            const dt = new Date(d + 'T00:00:00');
                                                            return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                        }).join(', ')
                                                    }{repeatingDates.length > 4 ? ` +${repeatingDates.length - 4} more` : ''}
                                                </span>
                                            ) : (
                                                <span>
                                                    {!milestoneForm.endDate ? 'Select an "Until" date to preview occurrences.' : 'No matching days found in the selected range.'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
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
                            }}>Milestone Name</label>
                            <input name="auto_field_34"
                                   type="text" placeholder="e.g. Go live @inmasjid" value={milestoneForm.name}
                                   ref={(el) => {
                                       modalInputRefs.current['name'] = el;
                                   }}
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
                                    key={String(g.id || i)}
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
                                      ref={(el) => {
                                          modalInputRefs.current['desc'] = el;
                                      }}
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
                                    key={String(g.id || i)}
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
                </div>

                <div className="modal-form-actions" style={{flexWrap: 'wrap'}}>
                    {editingMilestoneIdx !== null && (
                        <>
                            <button
                                type="button"
                                onClick={confirmDeleteMilestone}
                                style={{
                                    flex: '1 1 auto',
                                    padding: '10px 12px',
                                    background: matchingOccurrences.length > 1 ? 'rgba(239, 68, 68, 0.15)' : '#ef4444',
                                    color: matchingOccurrences.length > 1 ? '#ef4444' : 'white',
                                    border: matchingOccurrences.length > 1 ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                                    borderRadius: '6px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                {matchingOccurrences.length > 1 ? 'Delete This' : 'Delete'}
                            </button>
                            {matchingOccurrences.length > 1 && (
                                <button
                                    type="button"
                                    onClick={confirmDeleteAllMatching}
                                    style={{
                                        flex: '1 1 auto',
                                        padding: '10px 12px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Delete All ({matchingOccurrences.length})
                                </button>
                            )}
                        </>
                    )}
                    <button type="button" onClick={() => setShowMilestoneModal(false)} className="secondary"
                            style={{
                                flex: '1 1 auto',
                                padding: '10px 12px',
                                borderRadius: '6px',
                                fontWeight: '500'
                            }}>Cancel
                    </button>
                    <button type="submit" className="primary"
                            disabled={milestoneForm.isRepeating && (!milestoneForm.endDate || repeatingDates.length === 0)}
                            style={{
                                flex: '2 1 auto',
                                padding: '10px 14px',
                                borderRadius: '6px',
                                fontWeight: 'bold'
                            }}>
                        {editingMilestoneIdx !== null
                            ? (milestoneForm.isRepeating && repeatingDates.length > 0
                                ? `Update & Repeat (${repeatingDates.length})`
                                : (milestoneForm.applyToAllMatching && matchingOccurrences.length > 1
                                    ? `Update All (${matchingOccurrences.length})`
                                    : 'Update Milestone'))
                            : (milestoneForm.isRepeating && repeatingDates.length > 0
                                ? `Add ${repeatingDates.length} Milestones`
                                : 'Save Milestone')}
                    </button>
                </div>
            </form>
        </BaseModal>

        {/* Habit Info Modal */}
        {infoHabitId && (() => {
            const habit = (habits || []).find((h: any) => h.id === infoHabitId);
            if (!habit) return null;
            const hexes = getGoalColor(habit, routineGoals, lifeGoals, moneyGoals);
            const primaryColor = hexes[0] || habit.color || 'var(--accent)';
            const timeStr = habit.time || (typeof habit.duration === 'number' && habit.duration > 0 ? `${habit.duration}m` : '');
            const cadenceStr = habit.cadence === 'weekly' ? 'Weekly' : 'Daily';
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const targetDaysStr = Array.isArray(habit.targetDays) && habit.targetDays.length > 0
                ? habit.targetDays.map((d: number) => dayNames[d] || d).join(', ')
                : '';

            const rIds: string[] = habit.routineGoalIds || (habit.routineGoalId ? [habit.routineGoalId] : []);
            const lIds: string[] = habit.lifeGoalIds || (habit.lifeGoalId ? [habit.lifeGoalId] : []);
            const mIds: string[] = habit.moneyGoalIds || (habit.moneyGoalId ? [habit.moneyGoalId] : []);

            const linkedRoutineGoals = (routineGoals || []).filter((g: any) => rIds.includes(g.id));
            const linkedLifeGoals = (lifeGoals || []).filter((g: any) => lIds.includes(g.id));
            const linkedMoneyGoals = (moneyGoals || []).filter((g: any) => mIds.includes(g.id));

            let scheduledMins = 0;
            if (currentTemplate) {
                currentTemplate.blocks?.forEach((b: any) => {
                    if (String(b.routineGoalId) === String(habit.id)) scheduledMins += b.duration;
                });
            }
            const count = goalCounts[habit.id] || 0;

            const habitTemplateName = habit.templateId === 'all'
                ? 'All Templates (Shared)'
                : (templates || []).find((t: any) => t.id === habit.templateId)?.name || 'Default Template';

            return (
                <BaseModal
                    isOpen={true}
                    onClose={() => setInfoHabitId(null)}
                    title={
                        <span style={{display: 'flex', alignItems: 'center', gap: '8px', color: primaryColor}}>
                            <Sparkles size={18} color={primaryColor} />
                            {habit.name}
                        </span>
                    }
                >
                    <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                        <div style={{
                            background: `${primaryColor}15`,
                            border: `1px solid ${primaryColor}40`,
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <Layers size={15} color={primaryColor} />
                                <span style={{fontWeight: 600}}>{habitTemplateName}</span>
                            </div>
                            <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <Calendar size={15} color={primaryColor} />
                                <span style={{fontWeight: 600}}>{cadenceStr}</span>
                                {targetDaysStr && <span style={{color: 'var(--text-secondary)'}}>({targetDaysStr})</span>}
                            </div>
                            {timeStr && (
                                <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                    <Clock size={15} color={primaryColor} />
                                    <span>{timeStr}</span>
                                </div>
                            )}
                            {habit.isPublic && (
                                <div style={{display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)'}}>
                                    <Globe size={13} />
                                    <span style={{fontSize: '12px'}}>Public</span>
                                </div>
                            )}
                        </div>

                        {!!(habit.desc || habit.notes) && (
                            <div>
                                <div style={{fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 'bold'}}>
                                    Description / Notes
                                </div>
                                <div style={{background: 'var(--surface-light)', padding: '12px', borderRadius: '8px', fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.5}}>
                                    {String(habit.desc || habit.notes)}
                                </div>
                            </div>
                        )}

                        <div>
                            <div style={{fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 'bold'}}>
                                Schedule in Active Routine Template
                            </div>
                            <div style={{background: 'var(--surface-light)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                                <span>Occurrences in template:</span>
                                <span style={{fontWeight: 'bold', color: count > 0 ? 'var(--accent)' : 'var(--text-secondary)'}}>
                                    {count > 0 ? `${count} time${count > 1 ? 's' : ''} (${scheduledMins}m total)` : 'Not scheduled'}
                                </span>
                            </div>
                        </div>

                        <div>
                            <div style={{fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 'bold'}}>
                                Linked Goals ({linkedRoutineGoals.length + linkedLifeGoals.length + linkedMoneyGoals.length})
                            </div>
                            {linkedRoutineGoals.length === 0 && linkedLifeGoals.length === 0 && linkedMoneyGoals.length === 0 ? (
                                <div style={{fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic'}}>
                                    No linked goals.
                                </div>
                            ) : (
                                <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                                    {linkedRoutineGoals.map((g: any) => (
                                        <span key={g.id} style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            background: `${g.color || '#1982C4'}20`,
                                            color: g.color || '#1982C4',
                                            fontSize: '12px',
                                            border: `1px solid ${g.color || '#1982C4'}40`,
                                            fontWeight: 500
                                        }}>
                                            🎯 {g.name}
                                        </span>
                                    ))}
                                    {linkedLifeGoals.map((g: any) => (
                                        <span key={g.id} style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            background: `${g.color || '#FF595E'}20`,
                                            color: g.color || '#FF595E',
                                            fontSize: '12px',
                                            border: `1px solid ${g.color || '#FF595E'}40`,
                                            fontWeight: 500
                                        }}>
                                            ⭐ {g.name}
                                        </span>
                                    ))}
                                    {linkedMoneyGoals.map((g: any) => (
                                        <span key={g.id} style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            background: `${g.color || '#00F5D4'}20`,
                                            color: g.color || '#00F5D4',
                                            fontSize: '12px',
                                            border: `1px solid ${g.color || '#00F5D4'}40`,
                                            fontWeight: 500
                                        }}>
                                            💰 {g.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <LinkedMilestonesSection
                            name={habit.name}
                            milestones={currentMilestones}
                            primaryColor={primaryColor}
                            onCloseModal={() => setInfoHabitId(null)}
                        />

                        <div style={{display: 'flex', gap: '8px', marginTop: '8px'}}>
                            <button
                                type="button"
                                className="secondary"
                                onClick={() => setInfoHabitId(null)}
                                style={{flex: 1, padding: '10px 0', borderRadius: '6px', fontWeight: '500'}}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                className="primary"
                                onClick={() => {
                                    setInfoHabitId(null);
                                    openEditHabit(habit);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '10px 0',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Pencil size={14} /> Edit Habit
                            </button>
                        </div>
                    </div>
                </BaseModal>
            );
        })()}

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
