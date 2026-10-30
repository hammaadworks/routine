import {useCallback} from 'react';
import {useWebMCP} from 'use-webmcp-tool';
import {getAllWalletGoals, parseDuration, sanitizeEntities} from '../utils';
import {
    loadCounters,
    saveCounters,
    getTodayDateStr,
    recordCounterDelta,
    resetCounterDay,
    calculateCounterStats
} from '../utils/counterStore';
import {
    loadDispatchData,
    getResolvedPlatformSlots,
    toggleSlotCompletion,
    addAdHocSlot,
    calculateDailyMetrics
} from '../utils/dispatchStore';
import type { CounterItem, CounterCadence } from '../types/counter';

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function parseTimeStringToMinutes(val: string | number): number {
    if (typeof val === 'number') {
        return Math.max(0, Math.min(1439, Math.round(val)));
    }
    if (!val) return 0;
    const str = String(val).trim().toLowerCase();

    // Pure integer minutes string e.g. "840"
    if (/^\d+$/.test(str)) {
        return Math.max(0, Math.min(1439, parseInt(str, 10)));
    }

    const isPm = /pm/i.test(str);
    const isAm = /am/i.test(str);
    const cleaned = str.replace(/[apm\s]/gi, '');

    if (cleaned.includes(':')) {
        const parts = cleaned.split(':');
        let h = parseInt(parts[0] || '0', 10);
        const m = parseInt(parts[1] || '0', 10);
        if (isPm && h < 12) h += 12;
        if (isAm && h === 12) h = 0;
        return Math.max(0, Math.min(1439, (h * 60) + m));
    }

    let h = parseInt(cleaned || '0', 10);
    if (isPm && h < 12) h += 12;
    if (isAm && h === 12) h = 0;
    return Math.max(0, Math.min(1439, h * 60));
}

export function formatMinutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60) % 24;
    const m = (minutes % 60).toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m} ${ampm}`;
}

export function normalizeDayName(dayStr: string): string | null {
    if (!dayStr) return null;
    const s = dayStr.trim().toLowerCase();
    for (const d of DAYS_OF_WEEK) {
        if (d.toLowerCase().startsWith(s.slice(0, 3))) {
            return d;
        }
    }
    return null;
}

import { AI_TOOL_DEFINITIONS, STRICT_PROMPT } from '../features/ai/toolDefinitions';

const getToolSchema = (name: string) => {
    const def = AI_TOOL_DEFINITIONS.find(t => t.function.name === name);
    return def ? def.function.parameters : { type: 'object', properties: {} };
};

const createRoutineSchema = getToolSchema('create_routine');
const switchRoutineSchema = getToolSchema('switch_routine');
const addLifeGoalSchema = getToolSchema('add_life_goal');
const addRoutineGoalSchema = getToolSchema('add_routine_goal');
const addMoneyGoalSchema = getToolSchema('add_money_goal');
const addHabitSchema = getToolSchema('add_habit');
const createTemplateSchema = getToolSchema('create_template');
const editTemplateSchema = getToolSchema('edit_template');
const scheduleBlockSchema = getToolSchema('schedule_myday_block');
const moveBlockSchema = getToolSchema('move_block');
const deleteBlockSchema = getToolSchema('delete_myday_block');
const mapTemplateToDaySchema = getToolSchema('map_template_to_day');
const readScheduleSchema = getToolSchema('read_schedule');
const readCoinsSchema = getToolSchema('read_coins');
const addCoinsEntrySchema = getToolSchema('add_coins_entry');
const navigateAppSchema = getToolSchema('navigate_app');
const readStateSchema = getToolSchema('read_state');
const addQuickTaskSchema = getToolSchema('add_quick_task');
const readQuickTasksSchema = getToolSchema('read_quick_tasks');
const createPlanSchema = getToolSchema('create_plan');
const readPlansSchema = getToolSchema('read_plans');
const readQuotesSchema = getToolSchema('read_quotes');
const addQuoteSchema = getToolSchema('add_quote');
const toggleQuickTaskSchema = getToolSchema('toggle_quick_task');
const deleteQuickTaskSchema = getToolSchema('delete_quick_task');
const clearCompletedTasksSchema = getToolSchema('clear_completed_tasks');
const toggleGoalSchema = getToolSchema('toggle_goal');
const deleteGoalSchema = getToolSchema('delete_goal');
const editGoalSchema = getToolSchema('edit_goal');
const deleteHabitSchema = getToolSchema('delete_habit');
const editHabitSchema = getToolSchema('edit_habit');
const toggleHabitLogSchema = getToolSchema('toggle_habit_log');
const deleteTemplateSchema = getToolSchema('delete_template');
const editRoutineSchema = getToolSchema('edit_routine');
const deleteRoutineSchema = getToolSchema('delete_routine');
const editPlanSchema = getToolSchema('edit_plan');
const deletePlanSchema = getToolSchema('delete_plan');
const deleteQuoteSchema = getToolSchema('delete_quote');
const deleteCoinsEntrySchema = getToolSchema('delete_coins_entry');
const setCoinsTargetSchema = getToolSchema('set_coins_target');
const readCountersSchema = getToolSchema('read_counters');
const updateCounterSchema = getToolSchema('update_counter');
const resetCounterSchema = getToolSchema('reset_counter');
const addCounterSchema = getToolSchema('add_counter');
const deleteCounterSchema = getToolSchema('delete_counter');
const readMilestonesSchema = getToolSchema('read_milestones');
const setMilestoneSchema = getToolSchema('set_milestone');
const deleteMilestoneSchema = getToolSchema('delete_milestone');
const readTimelogsSchema = getToolSchema('read_timelogs');
const addTimelogSchema = getToolSchema('add_timelog');
const deleteTimelogSchema = getToolSchema('delete_timelog');
const readHabitBundlesSchema = getToolSchema('read_habit_bundles');
const toggleHabitBundleSchema = getToolSchema('toggle_habit_bundle');
const readDispatchSchema = getToolSchema('read_dispatch');
const toggleDispatchSlotSchema = getToolSchema('toggle_dispatch_slot');
const addDispatchSlotSchema = getToolSchema('add_dispatch_slot');
const setCurrencySchema = getToolSchema('set_currency');

export function useWebMCPIntegration({
                                         setLifeGoals,
                                         setMoneyGoals,
                                         setRoutines,
                                         setActiveRoutineId,
                                         updateActiveRoutine,
                                         activeRoutine,
                                         routines,
                                         setActiveCenterTab,
                                         setActiveLeftTab,
                                         setMobileTab,
                                         setIsLeftPaneExpanded,
                                         lifeGoals,
                                         moneyGoals
                                     }: any) {
    // 0. Read State (Returns complete app state with fallback keys)

    const handleReadCoins = useCallback(async (inputs: any) => {
        let entries = [];
        let targets: Record<string, any> = {};
        try {
            entries = JSON.parse(localStorage.getItem('whatchadoin_coins_entries') || '[]');
            const rawTargets = localStorage.getItem('whatchadoin_coins_targets');
            if (rawTargets) targets = JSON.parse(rawTargets);
        } catch {}
        return { 
            totalEntries: entries.length, 
            totalTargets: Object.keys(targets || {}).length,
            coinsEntries: inputs?.includeEntries ? entries : undefined,
            coinsTargets: targets
        };
    }, []);

    useWebMCP({
        name: 'read_coins',
        description: 'Returns a structured summary of career coins and targets. Can optionally return raw coinsEntries list.',
        inputSchema: readCoinsSchema,
        execute: handleReadCoins,
        annotations: { readOnlyHint: true, untrustedContentHint: false, consequentialHint: false }
    });

    const handleAddCoinsEntry = useCallback(async (inputs: any) => {
        let entries = [];
        try {
            entries = JSON.parse(localStorage.getItem('whatchadoin_coins_entries') || '[]');
        } catch {}
        const newEntry = { ...inputs, id: Date.now().toString(36) };
        const updated = [...entries, newEntry];
        localStorage.setItem('whatchadoin_coins_entries', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('whatchadoin_coins_updated'));
        return { success: true, message: 'Added entry for ' + inputs.year + '-' + inputs.month };
    }, []);

    useWebMCP({
        name: 'add_coins_entry',
        description: 'Adds or updates a monthly coins record',
        inputSchema: addCoinsEntrySchema,
        execute: handleAddCoinsEntry,
        annotations: { readOnlyHint: false, untrustedContentHint: true, consequentialHint: false }
    });

    const handleReadState = useCallback(async () => {
        const allWalletGoals = getAllWalletGoals(lifeGoals, activeRoutine?.routineGoals, moneyGoals);
        const walletTotalRemaining = allWalletGoals.filter(g => !g.completed).reduce((sum, g) => sum + (g.cost || 0), 0);

        const rawHabits = Array.isArray(activeRoutine?.habits)
            ? activeRoutine.habits
            : [...(activeRoutine?.habits?.daily || []), ...(activeRoutine?.habits?.weekly || [])];

        
        const coinsEntries = JSON.parse(localStorage.getItem('whatchadoin_coins_entries') || '[]');
        const coinsTargets = JSON.parse(localStorage.getItem('whatchadoin_coins_targets') || '{}');
        let quickTasks = [];
        try {
            quickTasks = JSON.parse(localStorage.getItem('whatchadoin_quick_tasks') || '[]');
        } catch {}
        const counters = loadCounters();
        let milestones = {};
        try {
            milestones = JSON.parse(localStorage.getItem('whatchadoin_milestones') || '{}');
        } catch {}
        const currency = localStorage.getItem('whatchadoin_currency') || 'USD';
        const habitBundles = Array.isArray(activeRoutine?.habitBundles) ? activeRoutine.habitBundles : [];

        return {
            coins: { entries: coinsEntries, targets: coinsTargets },
            routines: (Array.isArray(routines) ? routines : []).map((r: any) => ({
                id: r.id,
                name: r.name,
                start: r.start,
                end: r.end,
                isActive: r.id === (activeRoutine?.id)
            })),
            activeRoutine: {
                id: activeRoutine?.id,
                name: activeRoutine?.name,
                start: activeRoutine?.start,
                end: activeRoutine?.end,
                activeTemplateId: activeRoutine?.activeTemplateId
            },
            templates: (Array.isArray(activeRoutine?.templates) ? activeRoutine.templates : []).map((t: any) => ({
                id: t.id,
                name: t.name,
                blocksCount: (Array.isArray(t.blocks) ? t.blocks : []).length,
                blocks: (Array.isArray(t.blocks) ? t.blocks : []).map((b: any) => {
                    const startMin = typeof b.startTime === 'number' ? b.startTime : parseTimeStringToMinutes(b.startTime);
                    const durMin = typeof b.duration === 'number' ? b.duration : parseDuration(b.duration);
                    return {
                        id: b.id,
                        name: b.name,
                        startTime: startMin,
                        timeFormatted: formatMinutesToTime(startMin),
                        duration: durMin,
                        endTimeFormatted: formatMinutesToTime(startMin + durMin),
                        color: b.color,
                        routineGoalId: b.routineGoalId,
                        isPublic: Boolean(b.isPublic)
                    };
                })
            })),
            dayMapping: activeRoutine?.dayMapping || {},
            habits: (Array.isArray(rawHabits) ? rawHabits : []).map((h: any) => {
                const durMin = typeof h.duration === 'number' ? h.duration : parseDuration(h.duration || h.time || '15m');
                return {
                    id: h.id,
                    name: h.name,
                    desc: h.desc || '',
                    duration: durMin,
                    time: h.time || `${durMin}m`,
                    type: h.type || 'daily',
                    isPublic: Boolean(h.isPublic)
                };
            }),
            lifeGoals: (Array.isArray(lifeGoals) ? lifeGoals : []).map((g: any) => ({
                id: g.id,
                name: g.name,
                desc: g.desc || '',
                cost: g.cost,
                completed: g.completed,
                isPublic: Boolean(g.isPublic)
            })),
            routineGoals: (Array.isArray(activeRoutine?.routineGoals) ? activeRoutine.routineGoals : []).map((g: any) => ({
                id: g.id,
                name: g.name,
                desc: g.desc || '',
                cost: g.cost,
                completed: g.completed,
                isPublic: Boolean(g.isPublic)
            })),
            moneyGoals: (Array.isArray(moneyGoals) ? moneyGoals : []).map((g: any) => ({
                id: g.id,
                name: g.name,
                desc: g.desc || '',
                cost: g.cost,
                completed: g.completed,
                isPublic: Boolean(g.isPublic)
            })),
            quickTasks: (Array.isArray(quickTasks) ? quickTasks : []).map((t: any) => ({
                id: t.id,
                name: t.name,
                completed: Boolean(t.completed),
                isPublic: Boolean(t.isPublic)
            })),
            walletTotalRemaining,
            walletGoals: (Array.isArray(allWalletGoals) ? allWalletGoals : []).map((g: any) => ({
                name: g.name,
                desc: g.desc || '',
                cost: g.cost,
                completed: g.completed,
                category: g.category,
                isPublic: Boolean(g.isPublic)
            })),
            counters,
            milestones,
            habitBundles,
            currency
        };
    }, [activeRoutine, lifeGoals, moneyGoals, routines]);

    useWebMCP({
        name: 'read_app_state',
        description: 'Read the current routines, templates, life goals, routine goals, money goals, habits, day mapping, and wallet states.',
        inputSchema: readStateSchema,
        execute: handleReadState,
        annotations: {readOnlyHint: true, untrustedContentHint: false, consequentialHint: false}
    });

    // Read Full Weekly Schedule Picture
    const handleReadSchedule = useCallback(async () => {
        const templates = Array.isArray(activeRoutine?.templates) ? activeRoutine.templates : [];
        const dayMapping = activeRoutine?.dayMapping || {};

        const weeklySchedule = DAYS_OF_WEEK.map(day => {
            const templateId = dayMapping[day];
            const template = templates.find((t: any) => t.id === templateId);
            const blocks = (Array.isArray(template?.blocks) ? template.blocks : []).map((b: any) => {
                const startMin = typeof b.startTime === 'number' ? b.startTime : parseTimeStringToMinutes(b.startTime);
                const durMin = typeof b.duration === 'number' ? b.duration : parseDuration(b.duration);
                return {
                    id: b.id,
                    name: b.name,
                    startTime: startMin,
                    timeFormatted: formatMinutesToTime(startMin),
                    duration: durMin,
                    endTimeFormatted: formatMinutesToTime(startMin + durMin),
                    color: b.color,
                    routineGoalId: b.routineGoalId
                };
            }).sort((a: any, b: any) => a.startTime - b.startTime);

            return {
                day,
                templateId: templateId || null,
                templateName: template ? template.name : (templateId ? 'Unknown Template' : 'No Template Assigned'),
                blocksCount: blocks.length,
                blocks
            };
        });

        const rawHabits = Array.isArray(activeRoutine?.habits)
            ? activeRoutine.habits
            : [...(activeRoutine?.habits?.daily || []), ...(activeRoutine?.habits?.weekly || [])];

        const habitsBank = (Array.isArray(rawHabits) ? rawHabits : []).map((h: any) => {
            const durMin = typeof h.duration === 'number' ? h.duration : parseDuration(h.duration || h.time || '15m');
            return {
                id: h.id,
                name: h.name,
                desc: h.desc || '',
                duration: durMin,
                time: h.time || `${durMin}m`,
                type: h.type || 'daily'
            };
        });

        return {
            routineName: activeRoutine?.name,
            weeklySchedule,
            allTemplates: templates.map((t: any) => ({
                id: t.id,
                name: t.name,
                blocksCount: (Array.isArray(t.blocks) ? t.blocks : []).length,
                assignedDays: DAYS_OF_WEEK.filter(d => dayMapping[d] === t.id)
            })),
            habitsBank
        };
    }, [activeRoutine]);

    useWebMCP({
        name: 'read_schedule',
        description: 'Read the full Weekly Schedule picture: view each day of the week (Monday-Sunday) with assigned templates, scheduled blocks, start/end times, and available habits in the bank.',
        inputSchema: readScheduleSchema,
        execute: handleReadSchedule,
        annotations: {readOnlyHint: true, untrustedContentHint: false, consequentialHint: false}
    });

    // 1. Create Routine
    const handleCreateRoutine = useCallback(async (inputs: any) => {
        if (!inputs.name) throw new Error("Invalid parameters: name is required");
        const defaultTemplateId = crypto.randomUUID();
        const newRoutine = {
            id: crypto.randomUUID(),
            name: inputs.name,
            desc: inputs.desc || '',
            start: inputs.start || '',
            end: inputs.end || '',
            routineGoals: [],
            habits: [],
            templates: [{ id: defaultTemplateId, name: 'Vanilla whatchadoin', blocks: [] }],
            activeTemplateId: defaultTemplateId,
            dayMapping: { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '', Saturday: '', Sunday: '' }
        };
        if (setRoutines) {
            setRoutines((prev: any[]) => [...(Array.isArray(prev) ? prev : []), newRoutine]);
        }
        if (setActiveRoutineId) {
            setActiveRoutineId(newRoutine.id);
        }
        return { success: true, routineId: newRoutine.id, message: `Routine '${inputs.name}' created and set as active.` };
    }, [setRoutines, setActiveRoutineId]);

    useWebMCP({
        name: 'create_routine',
        description: `Create a new top-level Routine (with name, optional start/end dates, and description) and set it as active.`,
        inputSchema: createRoutineSchema,
        execute: handleCreateRoutine,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 2. Switch Routine
    const handleSwitchRoutine = useCallback(async (inputs: any) => {
        if (!inputs.routineId) throw new Error("Invalid parameters: routineId is required");
        const target = (routines || []).find((r: any) => r.id === inputs.routineId);
        if (!target) throw new Error(`Routine with ID '${inputs.routineId}' not found.`);
        if (setActiveRoutineId) {
            setActiveRoutineId(target.id);
        }
        return { success: true, message: `Switched to routine '${target.name}'.` };
    }, [routines, setActiveRoutineId]);

    useWebMCP({
        name: 'switch_routine',
        description: 'Switch the active Routine to another existing Routine by routineId.',
        inputSchema: switchRoutineSchema,
        execute: handleSwitchRoutine,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: false}
    });

    // 3. Add Life Goal
    const handleAddLifeGoal = useCallback(async (inputs: any) => {
        const goalName = inputs.name;
        if (!goalName) throw new Error("Invalid parameters: name is required");
        setLifeGoals((prev: any[]) => [...prev, {
            id: crypto.randomUUID(),
            name: goalName,
            desc: inputs.desc || '',
            cost: inputs.cost ? Number(inputs.cost) : 0,
            color: inputs.color,
            isPublic: Boolean(inputs.isPublic),
            completed: false,
            createdAt: new Date().toISOString()
        }]);
        return {success: true, message: `Life goal '${goalName}' created.`};
    }, [setLifeGoals]);

    useWebMCP({
        name: 'add_life_goal',
        description: `Add a high-level life goal. ${STRICT_PROMPT}`,
        inputSchema: addLifeGoalSchema,
        execute: handleAddLifeGoal,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 4. Add Routine Goal
    const handleAddRoutineGoal = useCallback(async (inputs: any) => {
        const goalName = inputs.name;
        if (!goalName) throw new Error("Invalid parameters: name is required");
        updateActiveRoutine({
            routineGoals: [...(Array.isArray(activeRoutine?.routineGoals) ? activeRoutine.routineGoals : []), {
                id: crypto.randomUUID(),
                name: goalName,
                desc: inputs.desc || '',
                duration: inputs.duration || '30 min',
                lifeGoalId: inputs.linkedLifeGoalId || null,
                cost: inputs.cost ? Number(inputs.cost) : undefined,
                color: inputs.color,
                isPublic: Boolean(inputs.isPublic),
                completed: false,
                createdAt: new Date().toISOString()
            }]
        });
        return {success: true, message: `Routine goal '${goalName}' created in active routine.`};
    }, [activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'add_routine_goal',
        description: `Add a project/milestone goal to the Routine tab inside the active routine. ${STRICT_PROMPT}`,
        inputSchema: addRoutineGoalSchema,
        execute: handleAddRoutineGoal,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 5. Add Money Goal
    const handleAddMoneyGoal = useCallback(async (inputs: any) => {
        const goalName = inputs.name;
        if (!goalName) throw new Error("Invalid parameters: name is required");
        if (inputs.cost === undefined) throw new Error("Invalid parameters: cost is required");
        if (setMoneyGoals) {
            setMoneyGoals((prev: any[]) => [...(prev || []), {
                id: crypto.randomUUID(),
                name: goalName,
                desc: inputs.desc || '',
                cost: Number(inputs.cost) || 0,
                color: inputs.color || '#8AC926',
                isPublic: Boolean(inputs.isPublic),
                completed: false,
                createdAt: new Date().toISOString()
            }]);
        }
        return {success: true, message: `Money goal '${goalName}' created.`};
    }, [setMoneyGoals]);

    useWebMCP({
        name: 'add_money_goal',
        description: `Add a financial goal with cost to the Money tab. ${STRICT_PROMPT}`,
        inputSchema: addMoneyGoalSchema,
        execute: handleAddMoneyGoal,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 6. Add Habit (Dual-write duration and time)
    const handleAddHabit = useCallback(async (inputs: any) => {
        const habitName = inputs.name;
        if (!habitName) throw new Error("Invalid parameters: name is required");

        const durationMins = inputs.duration ? parseDuration(inputs.duration) : (inputs.time ? parseDuration(inputs.time) : 15);
        const timeStr = inputs.time || (inputs.duration ? String(inputs.duration) : `${durationMins}m`);

        let resolvedColor = inputs.color || null;
        if (!resolvedColor) {
            if (inputs.linkedRoutineGoalId) {
                const rg = (activeRoutine?.routineGoals || []).find((g: any) => g.id === inputs.linkedRoutineGoalId);
                if (rg?.color) resolvedColor = rg.color;
            } else if (inputs.linkedLifeGoalId) {
                const lg = (lifeGoals || []).find((g: any) => g.id === inputs.linkedLifeGoalId);
                if (lg?.color) resolvedColor = lg.color;
            } else if (inputs.linkedMoneyGoalId) {
                const mg = (moneyGoals || []).find((g: any) => g.id === inputs.linkedMoneyGoalId);
                if (mg?.color) resolvedColor = mg.color;
            }
        }

        const newHabit = {
            id: crypto.randomUUID(),
            name: habitName,
            desc: inputs.desc || '',
            duration: durationMins,
            time: timeStr,
            type: inputs.type || 'daily',
            color: resolvedColor,
            routineGoalId: inputs.linkedRoutineGoalId || null,
            routineGoalIds: inputs.linkedRoutineGoalId ? [inputs.linkedRoutineGoalId] : [],
            lifeGoalIds: inputs.linkedLifeGoalId ? [inputs.linkedLifeGoalId] : [],
            moneyGoalIds: inputs.linkedMoneyGoalId ? [inputs.linkedMoneyGoalId] : [],
            isPublic: Boolean(inputs.isPublic)
        };

        const currentHabits = activeRoutine?.habits || [];
        const isArray = Array.isArray(currentHabits);

        let newHabitsState;
        if (isArray) {
            newHabitsState = [...currentHabits, newHabit];
        } else {
            const target = newHabit.type === 'weekly' ? 'weekly' : 'daily';
            newHabitsState = {
                ...currentHabits, [target]: [...(currentHabits[target] || []), newHabit]
            };
        }

        updateActiveRoutine({habits: newHabitsState});
        return {success: true, message: `Habit '${habitName}' created in active routine.`};
    }, [activeRoutine, updateActiveRoutine, lifeGoals, moneyGoals]);

    useWebMCP({
        name: 'add_habit',
        description: `Add an atomic recurring habit to the Habits pane inside the active routine. ${STRICT_PROMPT}`,
        inputSchema: addHabitSchema,
        execute: handleAddHabit,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 7. Create Template
    const handleCreateTemplate = useCallback(async (inputs: any) => {
        if (!inputs.name) throw new Error("Invalid parameters: name is required");
        const newTemplate = {id: crypto.randomUUID(), name: inputs.name, blocks: []};
        updateActiveRoutine({
            templates: [...(Array.isArray(activeRoutine?.templates) ? activeRoutine.templates : []), newTemplate], activeTemplateId: newTemplate.id
        });
        return {success: true, message: `Template '${inputs.name}' created inside active routine.`};
    }, [activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'create_template',
        description: `Create a new daily template (e.g. "Workday", "Weekend") inside the active routine.`,
        inputSchema: createTemplateSchema,
        execute: handleCreateTemplate,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 8. Edit Template
    const handleEditTemplate = useCallback(async (inputs: any) => {
        if (!inputs.templateId || !inputs.name) throw new Error("Invalid parameters");
        const currentTemplates = Array.isArray(activeRoutine?.templates) ? activeRoutine.templates : [];
        const index = currentTemplates.findIndex((t: any) => t.id === inputs.templateId);
        if (index === -1) throw new Error("Wrong state: templateId not found");

        const updated = [...currentTemplates];
        updated[index] = {...updated[index], name: inputs.name};
        updateActiveRoutine({templates: updated});
        return {success: true, message: `Template name updated.`};
    }, [activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'edit_template',
        description: `Edit an existing template's name inside the active routine.`,
        inputSchema: editTemplateSchema,
        execute: handleEditTemplate,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 9. Schedule Block (With day resolution, uncoupling, and overlap detection)
    const handleScheduleBlock = useCallback(async (inputs: any) => {
        if (!inputs.name || inputs.startTime === undefined || !inputs.duration) {
            throw new Error("Invalid parameters: name, startTime, and duration are required");
        }

        let templates: any[] = [...(Array.isArray(activeRoutine?.templates) ? activeRoutine.templates : [])];
        let dayMapping: Record<string, string> = { ...(activeRoutine?.dayMapping || {}) };
        const normalizedDay = inputs.day ? normalizeDayName(inputs.day) : null;

        let targetTemplate: any = null;
        if (inputs.templateId) {
            targetTemplate = templates.find(t => t.id === inputs.templateId);
        } else if (normalizedDay) {
            const tId = dayMapping[normalizedDay];
            if (tId) {
                targetTemplate = templates.find(t => t.id === tId);
                if (targetTemplate) {
                    const sharedDays = DAYS_OF_WEEK.filter(d => dayMapping[d] === targetTemplate.id && d !== normalizedDay);
                    if (sharedDays.length > 0) {
                        const cloned = {
                            ...targetTemplate,
                            id: crypto.randomUUID(),
                            name: `${targetTemplate.name} (${normalizedDay})`,
                            blocks: [...(Array.isArray(targetTemplate.blocks) ? targetTemplate.blocks : []).map((b: any) => ({ ...b }))]
                        };
                        templates.push(cloned);
                        dayMapping[normalizedDay] = cloned.id;
                        targetTemplate = cloned;
                    }
                } else {
                    targetTemplate = { id: crypto.randomUUID(), name: `${normalizedDay} Schedule`, blocks: [] };
                    templates.push(targetTemplate);
                    dayMapping[normalizedDay] = targetTemplate.id;
                }
            } else {
                targetTemplate = { id: crypto.randomUUID(), name: `${normalizedDay} Schedule`, blocks: [] };
                templates.push(targetTemplate);
                dayMapping[normalizedDay] = targetTemplate.id;
            }
        } else {
            const activeId = activeRoutine?.activeTemplateId;
            targetTemplate = templates.find(t => t.id === activeId) || templates[0];
            if (!targetTemplate) {
                targetTemplate = { id: crypto.randomUUID(), name: 'Vanilla whatchadoin', blocks: [] };
                templates.push(targetTemplate);
            }
        }

        const startMinutes = parseTimeStringToMinutes(inputs.startTime);
        const durationMinutes = parseDuration(inputs.duration);

        // Overlap detection
        const endMinutes = startMinutes + durationMinutes;
        const overlappingBlocks = (Array.isArray(targetTemplate.blocks) ? targetTemplate.blocks : []).filter((eb: any) => {
            const ebStart = typeof eb.startTime === 'number' ? eb.startTime : parseTimeStringToMinutes(eb.startTime);
            const ebDur = typeof eb.duration === 'number' ? eb.duration : parseDuration(eb.duration);
            return Math.max(startMinutes, ebStart) < Math.min(endMinutes, ebStart + ebDur);
        });

        let overlapWarning = '';
        if (overlappingBlocks.length > 0) {
            const names = overlappingBlocks.map((b: any) => {
                const s = typeof b.startTime === 'number' ? b.startTime : parseTimeStringToMinutes(b.startTime);
                return `'${b.name}' at ${formatMinutesToTime(s)}`;
            }).join(', ');
            overlapWarning = ` (Note: Overlaps with ${names}.)`;
        }

        let blockColor = inputs.color || null;
        if (!blockColor && activeRoutine?.habits) {
            const habitsList: any[] = Array.isArray(activeRoutine.habits)
                ? activeRoutine.habits
                : [...(activeRoutine.habits.daily || []), ...(activeRoutine.habits.weekly || [])];
            const matchingHabit = habitsList.find((h: any) =>
                h.name?.trim().toLowerCase() === inputs.name?.trim().toLowerCase()
            );
            if (matchingHabit) {
                if (matchingHabit.color) {
                    blockColor = matchingHabit.color;
                } else if (matchingHabit.routineGoalId || (matchingHabit.routineGoalIds && matchingHabit.routineGoalIds.length > 0)) {
                    const rId = matchingHabit.routineGoalId || matchingHabit.routineGoalIds[0];
                    const rg = (activeRoutine?.routineGoals || []).find((g: any) => g.id === rId);
                    if (rg?.color) blockColor = rg.color;
                } else if (matchingHabit.lifeGoalIds && matchingHabit.lifeGoalIds.length > 0) {
                    const lg = (lifeGoals || []).find((g: any) => g.id === matchingHabit.lifeGoalIds[0]);
                    if (lg?.color) blockColor = lg.color;
                } else if (matchingHabit.moneyGoalIds && matchingHabit.moneyGoalIds.length > 0) {
                    const mg = (moneyGoals || []).find((g: any) => g.id === matchingHabit.moneyGoalIds[0]);
                    if (mg?.color) blockColor = mg.color;
                }
            }
        }
        if (!blockColor) {
            blockColor = '#3498db';
        }

        const newBlock = {
            id: crypto.randomUUID(),
            name: inputs.name,
            startTime: startMinutes,
            duration: durationMinutes,
            color: blockColor
        };

        const updatedTarget = {
            ...targetTemplate,
            blocks: [...(Array.isArray(targetTemplate.blocks) ? targetTemplate.blocks : []), newBlock]
        };

        templates = templates.map(t => t.id === updatedTarget.id ? updatedTarget : t);

        updateActiveRoutine({
            templates,
            dayMapping
        });

        return {
            success: true,
            block: newBlock,
            time: `${formatMinutesToTime(startMinutes)} - ${formatMinutesToTime(endMinutes)}`,
            message: `Block '${inputs.name}' scheduled on ${normalizedDay || targetTemplate.name} at ${formatMinutesToTime(startMinutes)} (${durationMinutes} min).${overlapWarning}`
        };
    }, [activeRoutine, updateActiveRoutine, lifeGoals, moneyGoals]);

    useWebMCP({
        name: 'schedule_myday_block',
        description: `Schedule a block on a My Day template or specific day of the week. ${STRICT_PROMPT}`,
        inputSchema: scheduleBlockSchema,
        execute: handleScheduleBlock,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: false}
    });

    // 10. Move Block (Supports cross-day moves, shared template uncoupling, habit bank fallback, collision warnings)
    const handleMoveBlock = useCallback(async (inputs: any) => {
        if (!inputs.habitName || inputs.toTime === undefined) {
            throw new Error("Invalid parameters: habitName and toTime are required");
        }

        const targetStartMinutes = parseTimeStringToMinutes(inputs.toTime);
        const fromStartMinutes = inputs.fromTime !== undefined ? parseTimeStringToMinutes(inputs.fromTime) : undefined;
        const normalizedFromDay = inputs.fromDay ? normalizeDayName(inputs.fromDay) : null;
        const normalizedToDay = inputs.toDay ? normalizeDayName(inputs.toDay) : (normalizedFromDay || null);

        let templates: any[] = [...(Array.isArray(activeRoutine?.templates) ? activeRoutine.templates : [])];
        let dayMapping: Record<string, string> = { ...(activeRoutine?.dayMapping || {}) };

        // 1. Identify Source Template
        let sourceTemplate: any = null;
        if (inputs.fromTemplateId) {
            sourceTemplate = templates.find(t => t.id === inputs.fromTemplateId);
        } else if (normalizedFromDay) {
            const mappedId = dayMapping[normalizedFromDay];
            if (mappedId) {
                sourceTemplate = templates.find(t => t.id === mappedId);
            }
        }

        // If sourceTemplate not yet identified, search across templates for the block
        if (!sourceTemplate) {
            const query = inputs.habitName.toLowerCase().trim();
            for (const t of templates) {
                const match = (Array.isArray(t.blocks) ? t.blocks : []).find((b: any) => {
                    const matchesName = b.id === inputs.habitName ||
                        (b.name && b.name.toLowerCase().includes(query));
                    if (!matchesName) return false;
                    if (fromStartMinutes !== undefined) {
                        const bStart = typeof b.startTime === 'number' ? b.startTime : parseTimeStringToMinutes(b.startTime);
                        return Math.abs(bStart - fromStartMinutes) <= 15;
                    }
                    return true;
                });
                if (match) {
                    sourceTemplate = t;
                    break;
                }
            }
        }

        // 2. Shared Template Uncoupling for Source Day
        if (sourceTemplate && normalizedFromDay) {
            const sourceSharedDays = DAYS_OF_WEEK.filter(d => dayMapping[d] === sourceTemplate.id);
            if (sourceSharedDays.length > 1) {
                const clonedSource = {
                    ...sourceTemplate,
                    id: crypto.randomUUID(),
                    name: `${sourceTemplate.name} (${normalizedFromDay})`,
                    blocks: [...(Array.isArray(sourceTemplate.blocks) ? sourceTemplate.blocks : []).map((b: any) => ({ ...b }))]
                };
                templates.push(clonedSource);
                dayMapping[normalizedFromDay] = clonedSource.id;
                sourceTemplate = clonedSource;
            }
        }

        // 3. Find and extract block from source template, or fallback to Habit Bank
        let extractedBlock: any = null;
        if (sourceTemplate) {
            const query = inputs.habitName.toLowerCase().trim();
            const blockIndex = (Array.isArray(sourceTemplate.blocks) ? sourceTemplate.blocks : []).findIndex((b: any) => {
                const matchesName = b.id === inputs.habitName ||
                    (b.name && b.name.toLowerCase().includes(query));
                if (!matchesName) return false;
                if (fromStartMinutes !== undefined) {
                    const bStart = typeof b.startTime === 'number' ? b.startTime : parseTimeStringToMinutes(b.startTime);
                    return Math.abs(bStart - fromStartMinutes) <= 15;
                }
                return true;
            });

            if (blockIndex !== -1) {
                extractedBlock = sourceTemplate.blocks[blockIndex];
                const updatedBlocks = [...sourceTemplate.blocks];
                updatedBlocks.splice(blockIndex, 1);
                sourceTemplate = { ...sourceTemplate, blocks: updatedBlocks };
                templates = templates.map(t => t.id === sourceTemplate.id ? sourceTemplate : t);
            }
        }

        // Habit Bank Fallback
        const rawHabits = Array.isArray(activeRoutine?.habits)
            ? activeRoutine.habits
            : [...(activeRoutine?.habits?.daily || []), ...(activeRoutine?.habits?.weekly || [])];
        const matchedHabit = (Array.isArray(rawHabits) ? rawHabits : []).find((h: any) =>
            h.id === inputs.habitName ||
            (h.name && h.name.toLowerCase().includes(inputs.habitName.toLowerCase().trim()))
        );

        const finalBlockName = extractedBlock?.name || matchedHabit?.name || inputs.habitName;
        const finalDuration = inputs.duration !== undefined
            ? parseDuration(inputs.duration)
            : (extractedBlock
                ? (typeof extractedBlock.duration === 'number' ? extractedBlock.duration : parseDuration(extractedBlock.duration))
                : (matchedHabit?.duration
                    ? parseDuration(matchedHabit.duration)
                    : (matchedHabit?.time ? parseDuration(matchedHabit.time) : 30)));
        const finalColor = extractedBlock?.color || matchedHabit?.color || '#3498db';
        const finalGoalId = extractedBlock?.routineGoalId || matchedHabit?.routineGoalId || matchedHabit?.linkedRoutineGoalId;

        // 4. Identify & Uncouple Target Template
        let targetTemplate: any = null;
        if (inputs.toTemplateId) {
            targetTemplate = templates.find(t => t.id === inputs.toTemplateId);
        } else if (normalizedToDay) {
            const targetTemplateId = dayMapping[normalizedToDay];
            if (targetTemplateId) {
                targetTemplate = templates.find(t => t.id === targetTemplateId);
                if (targetTemplate) {
                    const targetSharedDays = DAYS_OF_WEEK.filter(d => dayMapping[d] === targetTemplate.id && d !== normalizedToDay);
                    if (targetSharedDays.length > 0) {
                        const clonedTarget = {
                            ...targetTemplate,
                            id: crypto.randomUUID(),
                            name: `${targetTemplate.name} (${normalizedToDay})`,
                            blocks: [...(Array.isArray(targetTemplate.blocks) ? targetTemplate.blocks : []).map((b: any) => ({ ...b }))]
                        };
                        templates.push(clonedTarget);
                        dayMapping[normalizedToDay] = clonedTarget.id;
                        targetTemplate = clonedTarget;
                    }
                } else {
                    targetTemplate = {
                        id: crypto.randomUUID(),
                        name: `${normalizedToDay} Schedule`,
                        blocks: []
                    };
                    templates.push(targetTemplate);
                    dayMapping[normalizedToDay] = targetTemplate.id;
                }
            } else {
                targetTemplate = {
                    id: crypto.randomUUID(),
                    name: `${normalizedToDay} Schedule`,
                    blocks: []
                };
                templates.push(targetTemplate);
                dayMapping[normalizedToDay] = targetTemplate.id;
            }
        } else {
            targetTemplate = sourceTemplate || templates.find(t => t.id === activeRoutine?.activeTemplateId) || templates[0];
            if (!targetTemplate) {
                targetTemplate = { id: crypto.randomUUID(), name: 'Vanilla whatchadoin', blocks: [] };
                templates.push(targetTemplate);
            }
        }

        // 5. Collision / Overlap Detection
        const targetEndMinutes = targetStartMinutes + finalDuration;
        const overlappingBlocks = (Array.isArray(targetTemplate.blocks) ? targetTemplate.blocks : []).filter((eb: any) => {
            const ebStart = typeof eb.startTime === 'number' ? eb.startTime : parseTimeStringToMinutes(eb.startTime);
            const ebDur = typeof eb.duration === 'number' ? eb.duration : parseDuration(eb.duration);
            const ebEnd = ebStart + ebDur;
            return Math.max(targetStartMinutes, ebStart) < Math.min(targetEndMinutes, ebEnd);
        });

        let overlapWarning = '';
        if (overlappingBlocks.length > 0) {
            const names = overlappingBlocks.map((b: any) => {
                const s = typeof b.startTime === 'number' ? b.startTime : parseTimeStringToMinutes(b.startTime);
                return `'${b.name}' at ${formatMinutesToTime(s)}`;
            }).join(', ');
            overlapWarning = ` (Note: Overlaps with ${names}. Both will display side-by-side in My Day.)`;
        }

        // 6. Add Block to Target Template
        const newBlock = {
            id: crypto.randomUUID(),
            name: finalBlockName,
            startTime: targetStartMinutes,
            duration: finalDuration,
            color: finalColor,
            ...(finalGoalId ? { routineGoalId: finalGoalId } : {})
        };

        const updatedTarget = {
            ...targetTemplate,
            blocks: [...(Array.isArray(targetTemplate.blocks) ? targetTemplate.blocks : []), newBlock]
        };

        templates = templates.map(t => t.id === updatedTarget.id ? updatedTarget : t);

        updateActiveRoutine({
            templates,
            dayMapping
        });

        const fromLabel = normalizedFromDay || (sourceTemplate ? sourceTemplate.name : 'Unassigned');
        const toLabel = normalizedToDay || targetTemplate.name;

        return {
            success: true,
            movedBlock: newBlock,
            fromDay: fromLabel,
            toDay: toLabel,
            startTime: formatMinutesToTime(targetStartMinutes),
            endTime: formatMinutesToTime(targetEndMinutes),
            duration: `${finalDuration} min`,
            message: `Moved '${finalBlockName}' ${normalizedFromDay ? `from ${normalizedFromDay}` : ''} to ${toLabel} at ${formatMinutesToTime(targetStartMinutes)} (${finalDuration} min).${overlapWarning}`
        };
    }, [activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'move_block',
        description: 'Move a scheduled block or habit from one day/time to another (e.g. "move habit1 from monday 2pm to wed 3pm"). Handles uncoupling shared templates, auto-creating day templates, habit bank fallback, and collision detection.',
        inputSchema: moveBlockSchema,
        execute: handleMoveBlock,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: false}
    });

    // 11. Delete Block (With uncoupling)
    const handleDeleteBlock = useCallback(async (inputs: any) => {
        if (!inputs.blockName) throw new Error("Invalid parameters: blockName is required");

        let templates: any[] = [...(Array.isArray(activeRoutine?.templates) ? activeRoutine.templates : [])];
        let dayMapping: Record<string, string> = { ...(activeRoutine?.dayMapping || {}) };
        const normalizedDay = inputs.day ? normalizeDayName(inputs.day) : null;

        let targetTemplate: any = null;
        if (inputs.templateId) {
            targetTemplate = templates.find(t => t.id === inputs.templateId);
        } else if (normalizedDay) {
            const tId = dayMapping[normalizedDay];
            if (tId) targetTemplate = templates.find(t => t.id === tId);
        }

        if (!targetTemplate) {
            const query = inputs.blockName.toLowerCase().trim();
            for (const t of templates) {
                const hasBlock = (Array.isArray(t.blocks) ? t.blocks : []).some((b: any) =>
                    b.id === inputs.blockName ||
                    (b.name && b.name.toLowerCase().includes(query))
                );
                if (hasBlock) {
                    targetTemplate = t;
                    break;
                }
            }
        }

        if (!targetTemplate) {
            throw new Error(`Block '${inputs.blockName}' not found in any template.`);
        }

        if (normalizedDay) {
            const sharedDays = DAYS_OF_WEEK.filter(d => dayMapping[d] === targetTemplate.id);
            if (sharedDays.length > 1) {
                const cloned = {
                    ...targetTemplate,
                    id: crypto.randomUUID(),
                    name: `${targetTemplate.name} (${normalizedDay})`,
                    blocks: [...(Array.isArray(targetTemplate.blocks) ? targetTemplate.blocks : []).map((b: any) => ({ ...b }))]
                };
                templates.push(cloned);
                dayMapping[normalizedDay] = cloned.id;
                targetTemplate = cloned;
            }
        }

        const query = inputs.blockName.toLowerCase().trim();
        const blockIndex = (Array.isArray(targetTemplate.blocks) ? targetTemplate.blocks : []).findIndex((b: any) =>
            b.id === inputs.blockName ||
            (b.name && b.name.toLowerCase().includes(query))
        );

        if (blockIndex === -1) {
            throw new Error(`Block '${inputs.blockName}' not found in template '${targetTemplate.name}'.`);
        }

        const deletedName = targetTemplate.blocks[blockIndex].name;
        const updatedBlocks = [...targetTemplate.blocks];
        updatedBlocks.splice(blockIndex, 1);

        targetTemplate = { ...targetTemplate, blocks: updatedBlocks };
        templates = templates.map(t => t.id === targetTemplate.id ? targetTemplate : t);

        updateActiveRoutine({ templates, dayMapping });
        return {
            success: true,
            message: `Deleted block '${deletedName}' from ${normalizedDay || targetTemplate.name}.`
        };
    }, [activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'delete_myday_block',
        description: 'Delete a scheduled block from a specific day of the week or template. Uncouples shared templates so only the targeted day is modified.',
        inputSchema: deleteBlockSchema,
        execute: handleDeleteBlock,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: false}
    });

    // 10. Map Template to Day
    const handleMapTemplateToDay = useCallback(async (inputs: any) => {
        if (!inputs.day || !inputs.templateId) throw new Error("Invalid parameters: day and templateId are required");
        const templates = Array.isArray(activeRoutine?.templates) ? activeRoutine.templates : [];
        const templateExists = templates.some((t: any) => t.id === inputs.templateId);
        if (!templateExists) throw new Error(`Template with ID '${inputs.templateId}' not found.`);

        updateActiveRoutine({
            dayMapping: {
                ...(activeRoutine?.dayMapping || {}),
                [inputs.day]: inputs.templateId
            }
        });
        return {success: true, message: `Day '${inputs.day}' mapped to template.`};
    }, [activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'map_template_to_day',
        description: 'Assign a daily template to a specific day of the week (Monday - Sunday) in the active routine Weekly Schedule.',
        inputSchema: mapTemplateToDaySchema,
        execute: handleMapTemplateToDay,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: false}
    });

    // 11. Navigate App
    const handleNavigate = useCallback(async (inputs: any) => {
        if (inputs.centerTab) {
            const targetCenter = inputs.centerTab === 'timeline' ? 'myday' : inputs.centerTab;
            setActiveCenterTab(targetCenter);
            setMobileTab(targetCenter);
        }
        if (inputs.leftTab) {
            setActiveLeftTab(inputs.leftTab);
            if (setIsLeftPaneExpanded) {
                setIsLeftPaneExpanded(true);
            }
            if (!inputs.centerTab) {
                setMobileTab(inputs.leftTab === 'habits' ? 'habits' : 'goals');
            }
        }
        return {
            success: true,
            message: `Navigated to ${inputs.centerTab || 'current'} / ${inputs.leftTab || 'current'}`
        };
    }, [setActiveCenterTab, setActiveLeftTab, setMobileTab, setIsLeftPaneExpanded]);

    useWebMCP({
        name: 'navigate_app',
        description: 'Switch between different tabs and views: centerTab (myday, tasks, calendar, plans, coins, counters, dispatch) and leftTab (life, money, routine, habits).',
        inputSchema: navigateAppSchema,
        execute: handleNavigate,
        annotations: {readOnlyHint: true, untrustedContentHint: false, consequentialHint: false}
    });

    // 12. Read Quick Tasks
    const handleReadQuickTasks = useCallback(async () => {
        let tasks: any[] = [];
        try {
            tasks = sanitizeEntities(JSON.parse(localStorage.getItem('whatchadoin_quick_tasks') || '[]'));
        } catch {}
        return {
            tasks: tasks.map((t: any) => ({
                id: t.id,
                name: t.name,
                completed: Boolean(t.completed),
                createdAt: t.createdAt,
                completedAt: t.completedAt,
                isPublic: Boolean(t.isPublic)
            }))
        };
    }, []);

    useWebMCP({
        name: 'read_quick_tasks',
        description: 'Read all quick tasks (both active and completed).',
        inputSchema: readQuickTasksSchema,
        execute: handleReadQuickTasks,
        annotations: {readOnlyHint: true, untrustedContentHint: false, consequentialHint: false}
    });

    // 13. Add Quick Task
    const handleAddQuickTask = useCallback(async (inputs: any) => {
        const taskName = (inputs.name || '').trim();
        if (!taskName) throw new Error("Invalid parameters: 'name' is required");
        let tasks: any[] = [];
        try {
            tasks = sanitizeEntities(JSON.parse(localStorage.getItem('whatchadoin_quick_tasks') || '[]'));
        } catch {}
        const newTask = {
            id: crypto.randomUUID(),
            name: taskName,
            completed: false,
            isPublic: Boolean(inputs.isPublic),
            createdAt: new Date().toISOString()
        };
        const updated = [newTask, ...tasks];
        localStorage.setItem('whatchadoin_quick_tasks', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('whatchadoin_quick_tasks_updated'));
        return { success: true, message: `Task '${taskName}' added.` };
    }, []);

    useWebMCP({
        name: 'add_quick_task',
        description: 'Add a new task to the quick tasks inbox.',
        inputSchema: addQuickTaskSchema,
        execute: handleAddQuickTask,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 14. Read Plans
    const handleReadPlans = useCallback(async () => {
        let rNotes: any[] = [];
        let lNotes: any[] = [];
        try {
            const rSaved = localStorage.getItem(`whatchadoin_plans_${activeRoutine?.id}`);
            rNotes = rSaved ? sanitizeEntities(JSON.parse(rSaved)).map((n: any) => ({ ...n, isLife: false })) : [];
            const lSaved = localStorage.getItem(`whatchadoin_life_plans`);
            lNotes = lSaved ? sanitizeEntities(JSON.parse(lSaved)).map((n: any) => ({ ...n, isLife: true })) : [];
        } catch {}
        return {
            plans: [...lNotes, ...rNotes].map((n: any) => ({
                id: n.id,
                name: n.name || 'Untitled Plan',
                content: n.content || '',
                isLife: Boolean(n.isLife)
            }))
        };
    }, [activeRoutine?.id]);

    useWebMCP({
        name: 'read_plans',
        description: 'Read all plans and their content.',
        inputSchema: readPlansSchema,
        execute: handleReadPlans,
        annotations: {readOnlyHint: true, untrustedContentHint: false, consequentialHint: false}
    });

    // 15. Create Plan
    const handleCreatePlan = useCallback(async (inputs: any) => {
        const planName = (inputs.name || '').trim();
        if (!planName || !inputs.content) {
            throw new Error("Invalid parameters: name and content are required.");
        }
        const isLife = Boolean(inputs.isLife);
        const storageKey = isLife ? 'whatchadoin_life_plans' : `whatchadoin_plans_${activeRoutine?.id}`;
        let existingNotes: any[] = [];
        try {
            const raw = localStorage.getItem(storageKey);
            existingNotes = raw ? sanitizeEntities(JSON.parse(raw)) : [];
        } catch {}
        const newNote = {
            id: crypto.randomUUID(),
            name: planName,
            content: inputs.content,
            folderId: null,
            createdAt: new Date().toISOString(),
            isLife
        };
        const updated = [...existingNotes, newNote];
        localStorage.setItem(storageKey, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('whatchadoin_plans_updated'));
        return { success: true, message: `Plan '${planName}' created in ${isLife ? 'Life Plans' : 'Routine Plans'}.` };
    }, [activeRoutine?.id]);

    useWebMCP({
        name: 'create_plan',
        description: 'Create a new plan in the Plans section.',
        inputSchema: createPlanSchema,
        execute: handleCreatePlan,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 16. Read Quotes
    const handleReadQuotes = useCallback(async () => {
        let quotes = [];
        try {
            quotes = JSON.parse(localStorage.getItem('whatchadoin_quotes') || '[]');
        } catch {}
        return {
            totalQuotes: quotes.length,
            quotes
        };
    }, []);

    useWebMCP({
        name: 'read_quotes',
        description: 'Read all motivational quotes in the footer widget.',
        inputSchema: readQuotesSchema,
        execute: handleReadQuotes,
        annotations: {readOnlyHint: true, untrustedContentHint: false, consequentialHint: false}
    });

    // 17. Add Quote
    const handleAddQuote = useCallback(async (inputs: any) => {
        const text = (inputs.text || '').trim();
        if (!text) throw new Error("Invalid parameters: 'text' is required");
        let quotes = [];
        try {
            quotes = JSON.parse(localStorage.getItem('whatchadoin_quotes') || '[]');
        } catch {}
        const newQuote = { id: Date.now().toString(), text };
        const updated = [...quotes, newQuote];
        localStorage.setItem('whatchadoin_quotes', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('whatchadoin_quotes_updated'));
        return { success: true, quote: newQuote, message: `Quote added: "${text}"` };
    }, []);

    useWebMCP({
        name: 'add_quote',
        description: 'Add a new motivational quote to the widget at the bottom of the screen.',
        inputSchema: addQuoteSchema,
        execute: handleAddQuote,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 18. Toggle Quick Task / Todo
    const handleToggleQuickTask = useCallback(async (inputs: any) => {
        let tasks: any[] = [];
        try {
            tasks = sanitizeEntities(JSON.parse(localStorage.getItem('whatchadoin_quick_tasks') || '[]'));
        } catch {}

        let taskIndex = -1;
        if (inputs.taskId) {
            taskIndex = tasks.findIndex((t: any) => t.id === inputs.taskId);
        }
        if (taskIndex === -1 && inputs.name) {
            const query = inputs.name.toLowerCase().trim();
            taskIndex = tasks.findIndex((t: any) => t.name && t.name.toLowerCase().includes(query));
        }

        if (taskIndex === -1) {
            throw new Error(`Task '${inputs.taskId || inputs.name || 'unspecified'}' not found in quick tasks inbox.`);
        }

        const task = tasks[taskIndex];
        const newCompleted = inputs.completed !== undefined ? Boolean(inputs.completed) : !task.completed;
        const now = new Date().toISOString();
        const updatedTask = {
            ...task,
            completed: newCompleted,
            completedAt: newCompleted ? (task.completedAt || now) : undefined
        };

        const updated = [...tasks];
        updated[taskIndex] = updatedTask;
        localStorage.setItem('whatchadoin_quick_tasks', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('whatchadoin_quick_tasks_updated'));

        return {
            success: true,
            task: updatedTask,
            message: `Task '${updatedTask.name}' marked as ${newCompleted ? 'completed' : 'incomplete'}.`
        };
    }, []);

    useWebMCP({
        name: 'toggle_quick_task',
        description: 'Marks a quick task/todo complete or incomplete (toggles if completed not specified).',
        inputSchema: toggleQuickTaskSchema,
        execute: handleToggleQuickTask,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: false}
    });

    // 19. Delete Quick Task
    const handleDeleteQuickTask = useCallback(async (inputs: any) => {
        let tasks: any[] = [];
        try {
            tasks = sanitizeEntities(JSON.parse(localStorage.getItem('whatchadoin_quick_tasks') || '[]'));
        } catch {}

        let taskIndex = -1;
        if (inputs.taskId) {
            taskIndex = tasks.findIndex((t: any) => t.id === inputs.taskId);
        }
        if (taskIndex === -1 && inputs.name) {
            const query = inputs.name.toLowerCase().trim();
            taskIndex = tasks.findIndex((t: any) => t.name && t.name.toLowerCase().includes(query));
        }

        if (taskIndex === -1) {
            throw new Error(`Task '${inputs.taskId || inputs.name || 'unspecified'}' not found in quick tasks inbox.`);
        }

        const deletedName = tasks[taskIndex].name;
        const updated = tasks.filter((_, idx) => idx !== taskIndex);
        localStorage.setItem('whatchadoin_quick_tasks', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('whatchadoin_quick_tasks_updated'));

        return { success: true, message: `Task '${deletedName}' deleted.` };
    }, []);

    useWebMCP({
        name: 'delete_quick_task',
        description: 'Deletes a task from the quick tasks inbox.',
        inputSchema: deleteQuickTaskSchema,
        execute: handleDeleteQuickTask,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: false}
    });

    // 20. Clear Completed Quick Tasks
    const handleClearCompletedTasks = useCallback(async () => {
        let tasks: any[] = [];
        try {
            tasks = sanitizeEntities(JSON.parse(localStorage.getItem('whatchadoin_quick_tasks') || '[]'));
        } catch {}

        const activeTasks = tasks.filter((t: any) => !t.completed);
        const deletedCount = tasks.length - activeTasks.length;
        localStorage.setItem('whatchadoin_quick_tasks', JSON.stringify(activeTasks));
        window.dispatchEvent(new CustomEvent('whatchadoin_quick_tasks_updated'));

        return { success: true, deletedCount, message: `Cleared ${deletedCount} completed tasks.` };
    }, []);

    useWebMCP({
        name: 'clear_completed_tasks',
        description: 'Deletes all completed quick tasks from the inbox.',
        inputSchema: clearCompletedTasksSchema,
        execute: handleClearCompletedTasks,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: true}
    });

    // 21. Toggle Goal
    const handleToggleGoal = useCallback(async (inputs: any) => {
        const query = (inputs.name || '').toLowerCase().trim();
        const goalId = inputs.goalId;
        const searchType = inputs.type || 'any';
        const now = new Date().toISOString();

        if (searchType === 'any' || searchType === 'routine') {
            const rGoals = Array.isArray(activeRoutine?.routineGoals) ? activeRoutine.routineGoals : [];
            const rIdx = rGoals.findIndex((g: any) => g.id === goalId || (query && g.name && g.name.toLowerCase().includes(query)));
            if (rIdx !== -1) {
                const target = rGoals[rIdx];
                const newCompleted = inputs.completed !== undefined ? Boolean(inputs.completed) : !target.completed;
                const updatedTarget = {
                    ...target,
                    completed: newCompleted,
                    completedAt: newCompleted ? (target.completedAt || now) : undefined
                };
                const updatedList = [...rGoals];
                updatedList[rIdx] = updatedTarget;
                updateActiveRoutine({ routineGoals: updatedList });
                return {
                    success: true,
                    goalName: target.name,
                    completed: newCompleted,
                    type: 'routine',
                    message: `Routine goal '${target.name}' marked as ${newCompleted ? 'completed' : 'incomplete'}.`
                };
            }
        }

        if (searchType === 'any' || searchType === 'life') {
            const lGoals = Array.isArray(lifeGoals) ? lifeGoals : [];
            const lIdx = lGoals.findIndex((g: any) => g.id === goalId || (query && g.name && g.name.toLowerCase().includes(query)));
            if (lIdx !== -1) {
                const target = lGoals[lIdx];
                const newCompleted = inputs.completed !== undefined ? Boolean(inputs.completed) : !target.completed;
                const updatedTarget = {
                    ...target,
                    completed: newCompleted,
                    completedAt: newCompleted ? (target.completedAt || now) : undefined
                };
                const updatedList = [...lGoals];
                updatedList[lIdx] = updatedTarget;
                if (setLifeGoals) setLifeGoals(updatedList);
                return {
                    success: true,
                    goalName: target.name,
                    completed: newCompleted,
                    type: 'life',
                    message: `Life goal '${target.name}' marked as ${newCompleted ? 'completed' : 'incomplete'}.`
                };
            }
        }

        if (searchType === 'any' || searchType === 'money') {
            const mGoals = Array.isArray(moneyGoals) ? moneyGoals : [];
            const mIdx = mGoals.findIndex((g: any) => g.id === goalId || (query && g.name && g.name.toLowerCase().includes(query)));
            if (mIdx !== -1) {
                const target = mGoals[mIdx];
                const newCompleted = inputs.completed !== undefined ? Boolean(inputs.completed) : !target.completed;
                const updatedTarget = {
                    ...target,
                    completed: newCompleted,
                    completedAt: newCompleted ? (target.completedAt || now) : undefined
                };
                const updatedList = [...mGoals];
                updatedList[mIdx] = updatedTarget;
                if (setMoneyGoals) setMoneyGoals(updatedList);
                return {
                    success: true,
                    goalName: target.name,
                    completed: newCompleted,
                    type: 'money',
                    message: `Money goal '${target.name}' marked as ${newCompleted ? 'completed' : 'incomplete'}.`
                };
            }
        }

        throw new Error(`Goal '${goalId || inputs.name}' not found.`);
    }, [activeRoutine, updateActiveRoutine, lifeGoals, setLifeGoals, moneyGoals, setMoneyGoals]);

    useWebMCP({
        name: 'toggle_goal',
        description: 'Marks a goal complete or incomplete across routine, life, or money goals.',
        inputSchema: toggleGoalSchema,
        execute: handleToggleGoal,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: false}
    });

    // 22. Delete Goal
    const handleDeleteGoal = useCallback(async (inputs: any) => {
        const query = (inputs.name || '').toLowerCase().trim();
        const goalId = inputs.goalId;
        const searchType = inputs.type || 'any';

        if (searchType === 'any' || searchType === 'routine') {
            const rGoals = Array.isArray(activeRoutine?.routineGoals) ? activeRoutine.routineGoals : [];
            const match = rGoals.find((g: any) => g.id === goalId || (query && g.name && g.name.toLowerCase().includes(query)));
            if (match) {
                const updatedList = rGoals.filter((g: any) => g.id !== match.id);
                updateActiveRoutine({ routineGoals: updatedList });
                return { success: true, message: `Routine goal '${match.name}' deleted.` };
            }
        }

        if (searchType === 'any' || searchType === 'life') {
            const lGoals = Array.isArray(lifeGoals) ? lifeGoals : [];
            const match = lGoals.find((g: any) => g.id === goalId || (query && g.name && g.name.toLowerCase().includes(query)));
            if (match) {
                const updatedList = lGoals.filter((g: any) => g.id !== match.id);
                if (setLifeGoals) setLifeGoals(updatedList);
                return { success: true, message: `Life goal '${match.name}' deleted.` };
            }
        }

        if (searchType === 'any' || searchType === 'money') {
            const mGoals = Array.isArray(moneyGoals) ? moneyGoals : [];
            const match = mGoals.find((g: any) => g.id === goalId || (query && g.name && g.name.toLowerCase().includes(query)));
            if (match) {
                const updatedList = mGoals.filter((g: any) => g.id !== match.id);
                if (setMoneyGoals) setMoneyGoals(updatedList);
                return { success: true, message: `Money goal '${match.name}' deleted.` };
            }
        }

        throw new Error(`Goal '${goalId || inputs.name}' not found.`);
    }, [activeRoutine, updateActiveRoutine, lifeGoals, setLifeGoals, moneyGoals, setMoneyGoals]);

    useWebMCP({
        name: 'delete_goal',
        description: 'Deletes a goal from routine goals, life goals, or money goals.',
        inputSchema: deleteGoalSchema,
        execute: handleDeleteGoal,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: true}
    });

    // 23. Edit Goal
    const handleEditGoal = useCallback(async (inputs: any) => {
        const query = (inputs.name || '').toLowerCase().trim();
        const goalId = inputs.goalId;
        const searchType = inputs.type || 'any';

        const applyEdits = (g: any) => ({
            ...g,
            name: inputs.newName ? inputs.newName.trim() : g.name,
            cost: inputs.cost !== undefined ? Number(inputs.cost) : g.cost,
            desc: inputs.desc !== undefined ? inputs.desc : g.desc,
            color: inputs.color !== undefined ? inputs.color : g.color
        });

        if (searchType === 'any' || searchType === 'routine') {
            const rGoals = Array.isArray(activeRoutine?.routineGoals) ? activeRoutine.routineGoals : [];
            const idx = rGoals.findIndex((g: any) => g.id === goalId || (query && g.name && g.name.toLowerCase().includes(query)));
            if (idx !== -1) {
                const updated = [...rGoals];
                updated[idx] = applyEdits(updated[idx]);
                updateActiveRoutine({ routineGoals: updated });
                return { success: true, message: `Routine goal '${updated[idx].name}' updated.` };
            }
        }

        if (searchType === 'any' || searchType === 'life') {
            const lGoals = Array.isArray(lifeGoals) ? lifeGoals : [];
            const idx = lGoals.findIndex((g: any) => g.id === goalId || (query && g.name && g.name.toLowerCase().includes(query)));
            if (idx !== -1) {
                const updated = [...lGoals];
                updated[idx] = applyEdits(updated[idx]);
                if (setLifeGoals) setLifeGoals(updated);
                return { success: true, message: `Life goal '${updated[idx].name}' updated.` };
            }
        }

        if (searchType === 'any' || searchType === 'money') {
            const mGoals = Array.isArray(moneyGoals) ? moneyGoals : [];
            const idx = mGoals.findIndex((g: any) => g.id === goalId || (query && g.name && g.name.toLowerCase().includes(query)));
            if (idx !== -1) {
                const updated = [...mGoals];
                updated[idx] = applyEdits(updated[idx]);
                if (setMoneyGoals) setMoneyGoals(updated);
                return { success: true, message: `Money goal '${updated[idx].name}' updated.` };
            }
        }

        throw new Error(`Goal '${goalId || inputs.name}' not found.`);
    }, [activeRoutine, updateActiveRoutine, lifeGoals, setLifeGoals, moneyGoals, setMoneyGoals]);

    useWebMCP({
        name: 'edit_goal',
        description: "Edits an existing goal's name, cost, description, or color.",
        inputSchema: editGoalSchema,
        execute: handleEditGoal,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 24. Delete Habit
    const handleDeleteHabit = useCallback(async (inputs: any) => {
        const query = (inputs.name || '').toLowerCase().trim();
        const habitId = inputs.habitId;
        const currentHabits = activeRoutine?.habits || [];

        if (Array.isArray(currentHabits)) {
            const match = currentHabits.find((h: any) => h.id === habitId || (query && h.name && h.name.toLowerCase().includes(query)));
            if (!match) throw new Error(`Habit '${habitId || inputs.name}' not found.`);
            const updated = currentHabits.filter((h: any) => h.id !== match.id);
            updateActiveRoutine({ habits: updated });
            return { success: true, message: `Habit '${match.name}' deleted.` };
        } else {
            const daily = (currentHabits.daily || []).filter((h: any) => !(h.id === habitId || (query && h.name && h.name.toLowerCase().includes(query))));
            const weekly = (currentHabits.weekly || []).filter((h: any) => !(h.id === habitId || (query && h.name && h.name.toLowerCase().includes(query))));
            updateActiveRoutine({ habits: { daily, weekly } });
            return { success: true, message: `Habit deleted.` };
        }
    }, [activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'delete_habit',
        description: 'Deletes a habit from the Habits bank in the active routine.',
        inputSchema: deleteHabitSchema,
        execute: handleDeleteHabit,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: true}
    });

    // 25. Edit Habit
    const handleEditHabit = useCallback(async (inputs: any) => {
        const query = (inputs.name || '').toLowerCase().trim();
        const habitId = inputs.habitId;
        const currentHabits = activeRoutine?.habits || [];

        const applyEdits = (h: any) => {
            const durMin = inputs.duration ? parseDuration(inputs.duration) : (inputs.time ? parseDuration(inputs.time) : h.duration);
            const timeStr = inputs.time || (inputs.duration ? String(inputs.duration) : h.time);
            return {
                ...h,
                name: inputs.newName ? inputs.newName.trim() : h.name,
                duration: durMin,
                time: timeStr,
                desc: inputs.desc !== undefined ? inputs.desc : h.desc,
                color: inputs.color !== undefined ? inputs.color : h.color,
                type: inputs.type || h.type
            };
        };

        if (Array.isArray(currentHabits)) {
            const idx = currentHabits.findIndex((h: any) => h.id === habitId || (query && h.name && h.name.toLowerCase().includes(query)));
            if (idx === -1) throw new Error(`Habit '${habitId || inputs.name}' not found.`);
            const updated = [...currentHabits];
            updated[idx] = applyEdits(updated[idx]);
            updateActiveRoutine({ habits: updated });
            return { success: true, message: `Habit '${updated[idx].name}' updated.` };
        } else {
            let found = false;
            const daily = (currentHabits.daily || []).map((h: any) => {
                if (h.id === habitId || (query && h.name && h.name.toLowerCase().includes(query))) {
                    found = true;
                    return applyEdits(h);
                }
                return h;
            });
            const weekly = (currentHabits.weekly || []).map((h: any) => {
                if (h.id === habitId || (query && h.name && h.name.toLowerCase().includes(query))) {
                    found = true;
                    return applyEdits(h);
                }
                return h;
            });
            if (!found) throw new Error(`Habit '${habitId || inputs.name}' not found.`);
            updateActiveRoutine({ habits: { daily, weekly } });
            return { success: true, message: `Habit updated.` };
        }
    }, [activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'edit_habit',
        description: "Edits an existing habit's name, duration, description, color, or type in the active routine.",
        inputSchema: editHabitSchema,
        execute: handleEditHabit,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 26. Toggle Habit Log
    const handleToggleHabitLog = useCallback(async (inputs: any) => {
        const query = (inputs.name || '').toLowerCase().trim();
        const habitId = inputs.habitId;
        const currentHabits = Array.isArray(activeRoutine?.habits)
            ? activeRoutine.habits
            : [...(activeRoutine?.habits?.daily || []), ...(activeRoutine?.habits?.weekly || [])];

        const habit = currentHabits.find((h: any) => h.id === habitId || (query && h.name && h.name.toLowerCase().includes(query)));
        if (!habit) throw new Error(`Habit '${habitId || inputs.name}' not found.`);

        const dateStr = inputs.date || getTodayDateStr();
        const currentLogs = activeRoutine?.dailyLogs || {};
        const dayLog = currentLogs[dateStr] || {};
        const isCompleted = inputs.completed !== undefined ? Boolean(inputs.completed) : !(dayLog[habit.id] || false);

        updateActiveRoutine({
            dailyLogs: {
                ...currentLogs,
                [dateStr]: {
                    ...dayLog,
                    [habit.id]: isCompleted
                }
            }
        });

        return {
            success: true,
            habitName: habit.name,
            date: dateStr,
            completed: isCompleted,
            message: `Habit '${habit.name}' marked ${isCompleted ? 'done' : 'not done'} for ${dateStr}.`
        };
    }, [activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'toggle_habit_log',
        description: 'Checks or unchecks a habit for a given date in the daily log (defaults to today).',
        inputSchema: toggleHabitLogSchema,
        execute: handleToggleHabitLog,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: false}
    });

    // 27. Delete Template
    const handleDeleteTemplate = useCallback(async (inputs: any) => {
        const query = (inputs.name || '').toLowerCase().trim();
        const templateId = inputs.templateId;
        const currentTemplates = Array.isArray(activeRoutine?.templates) ? activeRoutine.templates : [];

        const target = currentTemplates.find((t: any) => t.id === templateId || (query && t.name && t.name.toLowerCase().includes(query)));
        if (!target) throw new Error(`Template '${templateId || inputs.name}' not found.`);

        if (currentTemplates.length <= 1) {
            throw new Error(`Cannot delete the only template in routine '${activeRoutine?.name}'.`);
        }

        const updatedTemplates = currentTemplates.filter((t: any) => t.id !== target.id);
        const dayMapping = { ...(activeRoutine?.dayMapping || {}) };
        for (const d of Object.keys(dayMapping)) {
            if (dayMapping[d] === target.id) {
                dayMapping[d] = '';
            }
        }
        const activeTemplateId = activeRoutine?.activeTemplateId === target.id ? updatedTemplates[0].id : activeRoutine?.activeTemplateId;

        updateActiveRoutine({
            templates: updatedTemplates,
            dayMapping,
            activeTemplateId
        });

        return { success: true, message: `Template '${target.name}' deleted.` };
    }, [activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'delete_template',
        description: 'Deletes a daily template from the active routine.',
        inputSchema: deleteTemplateSchema,
        execute: handleDeleteTemplate,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: true}
    });

    // 28. Edit Routine
    const handleEditRoutine = useCallback(async (inputs: any) => {
        const targetId = inputs.routineId || activeRoutine?.id;
        const currentRoutines = Array.isArray(routines) ? routines : [];
        const idx = currentRoutines.findIndex((r: any) => r.id === targetId);
        if (idx === -1) throw new Error(`Routine with ID '${targetId}' not found.`);

        const updatedRoutine = {
            ...currentRoutines[idx],
            name: inputs.name ? inputs.name.trim() : currentRoutines[idx].name,
            desc: inputs.desc !== undefined ? inputs.desc : currentRoutines[idx].desc,
            start: inputs.start !== undefined ? inputs.start : currentRoutines[idx].start,
            end: inputs.end !== undefined ? inputs.end : currentRoutines[idx].end
        };

        const updated = [...currentRoutines];
        updated[idx] = updatedRoutine;
        if (setRoutines) setRoutines(updated);
        if (targetId === activeRoutine?.id) {
            updateActiveRoutine({
                name: updatedRoutine.name,
                desc: updatedRoutine.desc,
                start: updatedRoutine.start,
                end: updatedRoutine.end
            });
        }

        return { success: true, message: `Routine '${updatedRoutine.name}' updated.` };
    }, [routines, setRoutines, activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'edit_routine',
        description: 'Edits routine metadata (name, description, start date, end date). Defaults to active routine.',
        inputSchema: editRoutineSchema,
        execute: handleEditRoutine,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 29. Delete Routine
    const handleDeleteRoutine = useCallback(async (inputs: any) => {
        const query = (inputs.name || '').toLowerCase().trim();
        const routineId = inputs.routineId;
        const currentRoutines = Array.isArray(routines) ? routines : [];

        if (currentRoutines.length <= 1) {
            throw new Error("Cannot delete the only routine.");
        }

        const match = currentRoutines.find((r: any) => r.id === routineId || (query && r.name && r.name.toLowerCase().includes(query)));
        if (!match) throw new Error(`Routine '${routineId || inputs.name}' not found.`);

        const updated = currentRoutines.filter((r: any) => r.id !== match.id);
        if (setRoutines) setRoutines(updated);
        if (activeRoutine?.id === match.id) {
            const nextActive = updated[0];
            if (setActiveRoutineId) setActiveRoutineId(nextActive.id);
        }

        return { success: true, message: `Routine '${match.name}' deleted.` };
    }, [routines, setRoutines, activeRoutine, setActiveRoutineId]);

    useWebMCP({
        name: 'delete_routine',
        description: 'Deletes a routine by routineId or name. Cannot delete if it is the only routine.',
        inputSchema: deleteRoutineSchema,
        execute: handleDeleteRoutine,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: true}
    });

    // 30. Edit Plan
    const handleEditPlan = useCallback(async (inputs: any) => {
        const query = (inputs.name || '').toLowerCase().trim();
        const planId = inputs.planId;
        const isLife = inputs.isLife;

        const tryUpdate = (storageKey: string, lifeFlag: boolean) => {
            let notes: any[] = [];
            try {
                notes = sanitizeEntities(JSON.parse(localStorage.getItem(storageKey) || '[]'));
            } catch {}
            const idx = notes.findIndex((n: any) => n.id === planId || (query && n.name && n.name.toLowerCase().includes(query)));
            if (idx !== -1) {
                const target = notes[idx];
                const updatedTarget = {
                    ...target,
                    name: inputs.newName ? inputs.newName.trim() : target.name,
                    content: inputs.content !== undefined ? inputs.content : target.content
                };
                notes[idx] = updatedTarget;
                localStorage.setItem(storageKey, JSON.stringify(notes));
                window.dispatchEvent(new CustomEvent('whatchadoin_plans_updated'));
                return { success: true, message: `Plan '${updatedTarget.name}' updated in ${lifeFlag ? 'Life Plans' : 'Routine Plans'}.` };
            }
            return null;
        };

        if (isLife === true) {
            const res = tryUpdate('whatchadoin_life_plans', true);
            if (res) return res;
        } else if (isLife === false) {
            const res = tryUpdate(`whatchadoin_plans_${activeRoutine?.id}`, false);
            if (res) return res;
        } else {
            const resR = tryUpdate(`whatchadoin_plans_${activeRoutine?.id}`, false);
            if (resR) return resR;
            const resL = tryUpdate('whatchadoin_life_plans', true);
            if (resL) return resL;
        }

        throw new Error(`Plan '${planId || inputs.name}' not found.`);
    }, [activeRoutine?.id]);

    useWebMCP({
        name: 'edit_plan',
        description: 'Edits the name or markdown content of an existing plan document.',
        inputSchema: editPlanSchema,
        execute: handleEditPlan,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 31. Delete Plan
    const handleDeletePlan = useCallback(async (inputs: any) => {
        const query = (inputs.name || '').toLowerCase().trim();
        const planId = inputs.planId;
        const isLife = inputs.isLife;

        const tryDelete = (storageKey: string, lifeFlag: boolean) => {
            let notes: any[] = [];
            try {
                notes = sanitizeEntities(JSON.parse(localStorage.getItem(storageKey) || '[]'));
            } catch {}
            const idx = notes.findIndex((n: any) => n.id === planId || (query && n.name && n.name.toLowerCase().includes(query)));
            if (idx !== -1) {
                const deletedName = notes[idx].name;
                notes.splice(idx, 1);
                localStorage.setItem(storageKey, JSON.stringify(notes));
                window.dispatchEvent(new CustomEvent('whatchadoin_plans_updated'));
                return { success: true, message: `Plan '${deletedName}' deleted from ${lifeFlag ? 'Life Plans' : 'Routine Plans'}.` };
            }
            return null;
        };

        if (isLife === true) {
            const res = tryDelete('whatchadoin_life_plans', true);
            if (res) return res;
        } else if (isLife === false) {
            const res = tryDelete(`whatchadoin_plans_${activeRoutine?.id}`, false);
            if (res) return res;
        } else {
            const resR = tryDelete(`whatchadoin_plans_${activeRoutine?.id}`, false);
            if (resR) return resR;
            const resL = tryDelete('whatchadoin_life_plans', true);
            if (resL) return resL;
        }

        throw new Error(`Plan '${planId || inputs.name}' not found.`);
    }, [activeRoutine?.id]);

    useWebMCP({
        name: 'delete_plan',
        description: 'Deletes a plan document by ID or name.',
        inputSchema: deletePlanSchema,
        execute: handleDeletePlan,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: true}
    });

    // 32. Delete Quote
    const handleDeleteQuote = useCallback(async (inputs: any) => {
        let quotes: any[] = [];
        try {
            quotes = JSON.parse(localStorage.getItem('whatchadoin_quotes') || '[]');
        } catch {}

        const query = (inputs.text || '').toLowerCase().trim();
        const quoteId = inputs.quoteId;

        const idx = quotes.findIndex((q: any) => q.id === quoteId || (query && q.text && q.text.toLowerCase().includes(query)));
        if (idx === -1) throw new Error(`Quote not found.`);

        const deleted = quotes[idx];
        quotes.splice(idx, 1);
        localStorage.setItem('whatchadoin_quotes', JSON.stringify(quotes));
        window.dispatchEvent(new CustomEvent('whatchadoin_quotes_updated'));

        return { success: true, message: `Quote "${deleted.text}" deleted.` };
    }, []);

    useWebMCP({
        name: 'delete_quote',
        description: 'Deletes a motivational quote by ID or quote text.',
        inputSchema: deleteQuoteSchema,
        execute: handleDeleteQuote,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: false}
    });

    // 33. Delete Coins Entry
    const handleDeleteCoinsEntry = useCallback(async (inputs: any) => {
        let entries: any[] = [];
        try {
            entries = JSON.parse(localStorage.getItem('whatchadoin_coins_entries') || '[]');
        } catch {}

        const entryId = inputs.entryId;
        const year = inputs.year ? Number(inputs.year) : undefined;
        const month = inputs.month ? Number(inputs.month) : undefined;
        const sourceQuery = (inputs.source || '').toLowerCase().trim();

        const idx = entries.findIndex((e: any) => {
            if (entryId) return e.id === entryId;
            if (year !== undefined && e.year !== year) return false;
            if (month !== undefined && e.month !== month) return false;
            if (sourceQuery && (!e.source || !e.source.toLowerCase().includes(sourceQuery))) return false;
            return true;
        });

        if (idx === -1) throw new Error("Coins entry not found.");

        const deleted = entries[idx];
        entries.splice(idx, 1);
        localStorage.setItem('whatchadoin_coins_entries', JSON.stringify(entries));
        window.dispatchEvent(new CustomEvent('whatchadoin_coins_updated'));

        return { success: true, message: `Deleted entry for ${deleted.year}-${deleted.month} (${deleted.source}: ${deleted.amount}).` };
    }, []);

    useWebMCP({
        name: 'delete_coins_entry',
        description: 'Deletes an earnings record from the Coins earnings ledger.',
        inputSchema: deleteCoinsEntrySchema,
        execute: handleDeleteCoinsEntry,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: false}
    });

    // 34. Set Coins Target
    const handleSetCoinsTarget = useCallback(async (inputs: any) => {
        if (!inputs.year || inputs.target === undefined) {
            throw new Error("Invalid parameters: year and target are required.");
        }
        let targets: Record<string, number> = {};
        try {
            targets = JSON.parse(localStorage.getItem('whatchadoin_coins_targets') || '{}');
        } catch {}

        targets[String(inputs.year)] = Number(inputs.target);
        localStorage.setItem('whatchadoin_coins_targets', JSON.stringify(targets));
        window.dispatchEvent(new CustomEvent('whatchadoin_coins_updated'));

        return { success: true, message: `Coins annual target for ${inputs.year} set to ${inputs.target}.` };
    }, []);

    useWebMCP({
        name: 'set_coins_target',
        description: 'Sets the annual financial target amount for a given year in Coins.',
        inputSchema: setCoinsTargetSchema,
        execute: handleSetCoinsTarget,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: false}
    });

    // 35. Read Counters
    const handleReadCounters = useCallback(async () => {
        const counters = loadCounters();
        const dateStr = getTodayDateStr();
        const enriched = counters.map(c => {
            const stats = calculateCounterStats(c, dateStr);
            return {
                id: c.id,
                name: c.name,
                cadence: c.cadence,
                todayCount: c.todayCount,
                targetToday: stats.targetToday,
                remainingToday: stats.remainingToday,
                isMet: stats.isMet,
                backlog: c.backlog,
                unit: c.unit,
                step: c.step,
                color: c.color,
                notes: c.notes
            };
        });
        return {
            totalCounters: counters.length,
            counters: enriched
        };
    }, []);

    useWebMCP({
        name: 'read_counters',
        description: 'Reads all counters with their cadence, today count, target, and backlog.',
        inputSchema: readCountersSchema,
        execute: handleReadCounters,
        annotations: {readOnlyHint: true, untrustedContentHint: false, consequentialHint: false}
    });

    // 36. Update Counter (delta)
    const handleUpdateCounter = useCallback(async (inputs: any) => {
        if (inputs.delta === undefined) throw new Error("Invalid parameters: delta is required.");
        const delta = Number(inputs.delta);
        const counters = loadCounters();
        const query = (inputs.name || '').toLowerCase().trim();
        const counterId = inputs.counterId;

        const target = counters.find(c => c.id === counterId || (query && c.name.toLowerCase().includes(query)));
        if (!target) throw new Error(`Counter '${counterId || inputs.name}' not found.`);

        const updated = recordCounterDelta(counters, target.id, delta, inputs.why);
        const updatedTarget = updated.find(c => c.id === target.id);

        return {
            success: true,
            counterName: target.name,
            delta,
            todayCount: updatedTarget?.todayCount,
            message: `Counter '${target.name}' updated by ${delta > 0 ? `+${delta}` : delta} (today: ${updatedTarget?.todayCount} ${target.unit || 'reps'}).`
        };
    }, []);

    useWebMCP({
        name: 'update_counter',
        description: 'Records an increment or decrement (delta) on a counter by ID or name.',
        inputSchema: updateCounterSchema,
        execute: handleUpdateCounter,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 37. Reset Counter
    const handleResetCounter = useCallback(async (inputs: any) => {
        const counters = loadCounters();
        const query = (inputs.name || '').toLowerCase().trim();
        const counterId = inputs.counterId;

        const target = counters.find(c => c.id === counterId || (query && c.name.toLowerCase().includes(query)));
        if (!target) throw new Error(`Counter '${counterId || inputs.name}' not found.`);

        resetCounterDay(counters, target.id);
        return { success: true, message: `Reset today's count for counter '${target.name}'.` };
    }, []);

    useWebMCP({
        name: 'reset_counter',
        description: "Resets today's count for a counter to zero.",
        inputSchema: resetCounterSchema,
        execute: handleResetCounter,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: false}
    });

    // 38. Add Counter
    const handleAddCounter = useCallback(async (inputs: any) => {
        if (!inputs.name) throw new Error("Invalid parameters: name is required.");
        const counters = loadCounters();
        const newCounter: CounterItem = {
            id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: inputs.name.trim(),
            cadence: (inputs.cadence || 'daily') as CounterCadence,
            targetCount: Number(inputs.targetCount) || 100,
            unit: inputs.unit || 'reps',
            step: Number(inputs.step) || 1,
            quickSteps: [1, 5, 10, 25],
            color: inputs.color || '#00F5D4',
            notes: inputs.notes || '',
            createdAt: Date.now(),
            todayCount: 0,
            backlog: 0,
            lastActiveDate: getTodayDateStr(),
            pastDaysCount: 0,
            pastTotalDid: 0,
            todayEvents: []
        };
        const updated = [...counters, newCounter];
        saveCounters(updated);
        return { success: true, counter: newCounter, message: `Counter '${newCounter.name}' created.` };
    }, []);

    useWebMCP({
        name: 'add_counter',
        description: 'Creates a new counter (daily, weekly, or total) with target and step.',
        inputSchema: addCounterSchema,
        execute: handleAddCounter,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 39. Delete Counter
    const handleDeleteCounter = useCallback(async (inputs: any) => {
        const counters = loadCounters();
        const query = (inputs.name || '').toLowerCase().trim();
        const counterId = inputs.counterId;

        const target = counters.find(c => c.id === counterId || (query && c.name.toLowerCase().includes(query)));
        if (!target) throw new Error(`Counter '${counterId || inputs.name}' not found.`);

        const updated = counters.filter(c => c.id !== target.id);
        saveCounters(updated);
        return { success: true, message: `Counter '${target.name}' deleted.` };
    }, []);

    useWebMCP({
        name: 'delete_counter',
        description: 'Deletes a counter by ID or name.',
        inputSchema: deleteCounterSchema,
        execute: handleDeleteCounter,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: true}
    });

    // 40. Read Milestones
    const handleReadMilestones = useCallback(async (inputs: any) => {
        let milestones: Record<string, string> = {};
        try {
            milestones = JSON.parse(localStorage.getItem('whatchadoin_milestones') || '{}');
        } catch {}

        if (inputs?.date) {
            return {
                date: inputs.date,
                content: milestones[inputs.date] || null
            };
        }

        const filter = (inputs?.filter || '').toLowerCase().trim();
        const entries = Object.entries(milestones)
            .filter(([date, text]) => !filter || date.includes(filter) || text.toLowerCase().includes(filter))
            .map(([date, text]) => ({ date, text }));

        return {
            totalEntries: entries.length,
            milestones: entries
        };
    }, []);

    useWebMCP({
        name: 'read_milestones',
        description: 'Reads calendar milestones and events across all dates or for a specific date.',
        inputSchema: readMilestonesSchema,
        execute: handleReadMilestones,
        annotations: {readOnlyHint: true, untrustedContentHint: false, consequentialHint: false}
    });

    // 41. Set Milestone
    const handleSetMilestone = useCallback(async (inputs: any) => {
        if (!inputs.date || !inputs.name) {
            throw new Error("Invalid parameters: date and name are required.");
        }
        let milestones: Record<string, string> = {};
        try {
            milestones = JSON.parse(localStorage.getItem('whatchadoin_milestones') || '{}');
        } catch {}

        let newBlock = inputs.tag ? `**@${inputs.tag}** - **${inputs.name}**` : `**${inputs.name}**`;
        if (inputs.desc) {
            newBlock += `\n${inputs.desc}`;
        }

        const existing = milestones[inputs.date];
        milestones[inputs.date] = existing ? `${existing}\n\n${newBlock}` : newBlock;

        localStorage.setItem('whatchadoin_milestones', JSON.stringify(milestones));
        window.dispatchEvent(new CustomEvent('whatchadoin_milestones_updated', { detail: milestones }));

        return { success: true, date: inputs.date, message: `Milestone added for ${inputs.date}.` };
    }, []);

    useWebMCP({
        name: 'set_milestone',
        description: 'Adds or sets a milestone for a specific date (YYYY-MM-DD).',
        inputSchema: setMilestoneSchema,
        execute: handleSetMilestone,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 42. Delete Milestone
    const handleDeleteMilestone = useCallback(async (inputs: any) => {
        if (!inputs.date) throw new Error("Invalid parameters: date is required.");
        let milestones: Record<string, string> = {};
        try {
            milestones = JSON.parse(localStorage.getItem('whatchadoin_milestones') || '{}');
        } catch {}

        const existing = milestones[inputs.date];
        if (!existing) throw new Error(`No milestones found on ${inputs.date}.`);

        if (inputs.name) {
            const query = inputs.name.toLowerCase().trim();
            const blocks = existing.split('\n\n');
            const remaining = blocks.filter(b => !b.toLowerCase().includes(query));
            if (remaining.length === blocks.length) {
                throw new Error(`Milestone '${inputs.name}' not found on ${inputs.date}.`);
            }
            if (remaining.length > 0) {
                milestones[inputs.date] = remaining.join('\n\n');
            } else {
                delete milestones[inputs.date];
            }
        } else {
            delete milestones[inputs.date];
        }

        localStorage.setItem('whatchadoin_milestones', JSON.stringify(milestones));
        window.dispatchEvent(new CustomEvent('whatchadoin_milestones_updated', { detail: milestones }));

        return { success: true, message: `Milestone(s) deleted for ${inputs.date}.` };
    }, []);

    useWebMCP({
        name: 'delete_milestone',
        description: 'Deletes a milestone on a specific calendar date (YYYY-MM-DD).',
        inputSchema: deleteMilestoneSchema,
        execute: handleDeleteMilestone,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: true}
    });

    // 43. Read Timelogs
    const handleReadTimelogs = useCallback(async (inputs: any) => {
        const dateStr = inputs?.date || getTodayDateStr();
        const logs = (activeRoutine?.timeLogs && activeRoutine.timeLogs[dateStr]) || [];
        return {
            date: dateStr,
            totalLogs: logs.length,
            timeLogs: logs
        };
    }, [activeRoutine?.timeLogs]);

    useWebMCP({
        name: 'read_timelogs',
        description: 'Reads time log entries for a specific date (defaults to today).',
        inputSchema: readTimelogsSchema,
        execute: handleReadTimelogs,
        annotations: {readOnlyHint: true, untrustedContentHint: false, consequentialHint: false}
    });

    // 44. Add Timelog
    const handleAddTimelog = useCallback(async (inputs: any) => {
        if (!inputs.startTime || !inputs.endTime) {
            throw new Error("Invalid parameters: startTime and endTime are required.");
        }
        const dateStr = inputs.date || getTodayDateStr();
        const currentLogs = { ...(activeRoutine?.timeLogs || {}) };
        const dayLogs = [...(currentLogs[dateStr] || [])];

        const startMin = parseTimeStringToMinutes(inputs.startTime);
        const endMin = parseTimeStringToMinutes(inputs.endTime);
        const durMin = endMin >= startMin ? endMin - startMin : (1440 - startMin + endMin);

        let tagName: string | undefined = undefined;
        let tagType: string | undefined = undefined;
        let color: string | undefined = undefined;

        if (inputs.tagGoalId) {
            const allGoals = getAllWalletGoals(lifeGoals, activeRoutine?.routineGoals, moneyGoals);
            const query = inputs.tagGoalId.toLowerCase().trim();
            const matchedGoal = allGoals.find(g => String(g.id) === String(inputs.tagGoalId) || g.name.toLowerCase().includes(query));
            if (matchedGoal) {
                tagName = matchedGoal.name;
                tagType = matchedGoal.category;
                color = (matchedGoal as any).color;
            }
        }

        const newLog = {
            id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            startTime: inputs.startTime,
            endTime: inputs.endTime,
            duration: durMin,
            desc: inputs.desc || '',
            tagGoalId: inputs.tagGoalId || '',
            tagName,
            tagType,
            color
        };

        dayLogs.push(newLog);
        currentLogs[dateStr] = dayLogs;
        updateActiveRoutine({ timeLogs: currentLogs });

        return {
            success: true,
            log: newLog,
            message: `Logged time for ${dateStr}: ${inputs.startTime} - ${inputs.endTime} (${durMin} min).`
        };
    }, [activeRoutine, updateActiveRoutine, lifeGoals, moneyGoals]);

    useWebMCP({
        name: 'add_timelog',
        description: 'Adds a time tracking log entry to the active routine.',
        inputSchema: addTimelogSchema,
        execute: handleAddTimelog,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 45. Delete Timelog
    const handleDeleteTimelog = useCallback(async (inputs: any) => {
        const dateStr = inputs.date || getTodayDateStr();
        const currentLogs = { ...(activeRoutine?.timeLogs || {}) };
        const dayLogs = [...(currentLogs[dateStr] || [])];

        const targetIndex = dayLogs.findIndex((l: any) => l.id === inputs.logId || (inputs.startTime && l.startTime === inputs.startTime));
        if (targetIndex === -1) {
            throw new Error(`Timelog not found for ${dateStr}.`);
        }

        dayLogs.splice(targetIndex, 1);
        currentLogs[dateStr] = dayLogs;
        updateActiveRoutine({ timeLogs: currentLogs });

        return { success: true, message: `Timelog deleted for ${dateStr}.` };
    }, [activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'delete_timelog',
        description: 'Deletes a time log entry by ID or date/time.',
        inputSchema: deleteTimelogSchema,
        execute: handleDeleteTimelog,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: true}
    });

    // 46. Read Habit Bundles
    const handleReadHabitBundles = useCallback(async () => {
        const bundles = Array.isArray(activeRoutine?.habitBundles) ? activeRoutine.habitBundles : [];
        return {
            totalBundles: bundles.length,
            habitBundles: bundles
        };
    }, [activeRoutine?.habitBundles]);

    useWebMCP({
        name: 'read_habit_bundles',
        description: 'Reads all habit bundles configured in the active routine.',
        inputSchema: readHabitBundlesSchema,
        execute: handleReadHabitBundles,
        annotations: {readOnlyHint: true, untrustedContentHint: false, consequentialHint: false}
    });

    // 47. Toggle Habit Bundle
    const handleToggleHabitBundle = useCallback(async (inputs: any) => {
        const bundles = Array.isArray(activeRoutine?.habitBundles) ? activeRoutine.habitBundles : [];
        const query = (inputs.name || '').toLowerCase().trim();
        const bundle = bundles.find((b: any) => b.id === inputs.bundleId || (query && b.name.toLowerCase().includes(query)));
        if (!bundle || !Array.isArray(bundle.items) || bundle.items.length === 0) {
            throw new Error(`Habit bundle '${inputs.bundleId || inputs.name}' not found.`);
        }

        const dateStr = inputs.date || getTodayDateStr();
        const currentLogs = { ...(activeRoutine?.dailyLogs || {}) };
        const dayLog = { ...(currentLogs[dateStr] || {}) };

        const isCurrentlyDone = bundle.items.every((item: any) => Boolean(dayLog[item.habitId]));
        const targetDone = inputs.completed !== undefined ? Boolean(inputs.completed) : !isCurrentlyDone;

        bundle.items.forEach((item: any) => {
            dayLog[item.habitId] = targetDone;
        });
        currentLogs[dateStr] = dayLog;
        updateActiveRoutine({ dailyLogs: currentLogs });

        return {
            success: true,
            bundleName: bundle.name,
            completed: targetDone,
            date: dateStr,
            message: `Habit bundle '${bundle.name}' marked ${targetDone ? 'completed' : 'incomplete'} for ${dateStr}.`
        };
    }, [activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'toggle_habit_bundle',
        description: 'Marks all habits in a habit bundle as complete or incomplete for a date.',
        inputSchema: toggleHabitBundleSchema,
        execute: handleToggleHabitBundle,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: false}
    });

    // 48. Read Content Dispatch
    const handleReadDispatch = useCallback(async (inputs: any) => {
        const data = loadDispatchData();
        const dateStr = inputs?.date || getTodayDateStr();
        const personas = data.personas || [];
        const activePersona = personas.find(p => p.id === data.selectedPersonaId) || personas[0];
        const platformsWithSlots = (activePersona?.platforms || []).map(plat => ({
            id: plat.id,
            platform: plat.platform,
            label: plat.label,
            slots: getResolvedPlatformSlots(data, dateStr, plat)
        }));
        const metrics = calculateDailyMetrics(data, dateStr, activePersona?.id);

        return {
            date: dateStr,
            activePersona: activePersona ? { id: activePersona.id, name: activePersona.name, handle: activePersona.handle } : null,
            totalPersonas: personas.length,
            metrics,
            platforms: platformsWithSlots
        };
    }, []);

    useWebMCP({
        name: 'read_dispatch',
        description: 'Reads Content Dispatch personas, platforms, and scheduled post slots for a date.',
        inputSchema: readDispatchSchema,
        execute: handleReadDispatch,
        annotations: {readOnlyHint: true, untrustedContentHint: false, consequentialHint: false}
    });

    // 49. Toggle Dispatch Slot
    const handleToggleDispatchSlot = useCallback(async (inputs: any) => {
        if (!inputs.slotId) throw new Error("Invalid parameters: slotId is required.");
        const data = loadDispatchData();
        const dateStr = inputs.date || getTodayDateStr();

        toggleSlotCompletion(data, dateStr, inputs.slotId);
        window.dispatchEvent(new CustomEvent('whatchadoin_content_dispatch_updated'));
        return { success: true, slotId: inputs.slotId, date: dateStr, message: `Toggled dispatch slot '${inputs.slotId}' for ${dateStr}.` };
    }, []);

    useWebMCP({
        name: 'toggle_dispatch_slot',
        description: 'Toggles completion status for a platform post slot in Content Dispatch.',
        inputSchema: toggleDispatchSlotSchema,
        execute: handleToggleDispatchSlot,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: false}
    });

    // 50. Add Dispatch Slot
    const handleAddDispatchSlot = useCallback(async (inputs: any) => {
        if (!inputs.platformId || !inputs.title) {
            throw new Error("Invalid parameters: platformId and title are required.");
        }
        const data = loadDispatchData();
        const dateStr = inputs.date || getTodayDateStr();

        addAdHocSlot(data, dateStr, inputs.platformId, inputs.title);
        window.dispatchEvent(new CustomEvent('whatchadoin_content_dispatch_updated'));
        return { success: true, message: `Ad-hoc dispatch post '${inputs.title}' scheduled for ${dateStr}.` };
    }, []);

    useWebMCP({
        name: 'add_dispatch_slot',
        description: 'Adds an ad-hoc post slot to a platform in Content Dispatch.',
        inputSchema: addDispatchSlotSchema,
        execute: handleAddDispatchSlot,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 51. Set Currency
    const handleSetCurrency = useCallback(async (inputs: any) => {
        const curr = (inputs.currency || '').trim().toUpperCase();
        if (!curr) throw new Error("Invalid parameters: currency is required.");
        localStorage.setItem('whatchadoin_currency', curr);
        window.dispatchEvent(new CustomEvent('whatchadoin_currency_updated', { detail: curr }));
        return { success: true, currency: curr, message: `Currency set to ${curr}.` };
    }, []);

    useWebMCP({
        name: 'set_currency',
        description: 'Sets the currency code for the application (e.g. USD, INR, EUR, GBP).',
        inputSchema: setCurrencySchema,
        execute: handleSetCurrency,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: false}
    });

    // Universal Tool Executor (Used by in-app AI agent via BroadcastChannel and external callers)
    const executeTool = useCallback(async (tool: string, args: any = {}) => {
        switch (tool) {
            case 'navigate_app':
                return await handleNavigate(args);
            case 'create_routine':
                return await handleCreateRoutine(args);
            case 'switch_routine':
                return await handleSwitchRoutine(args);
            case 'edit_routine':
            case 'update_routine':
                return await handleEditRoutine(args);
            case 'delete_routine':
            case 'remove_routine':
                return await handleDeleteRoutine(args);
            case 'add_life_goal':
                return await handleAddLifeGoal(args);
            case 'add_routine_goal':
                return await handleAddRoutineGoal(args);
            case 'add_money_goal':
                return await handleAddMoneyGoal(args);
            case 'toggle_goal':
            case 'complete_goal':
            case 'mark_goal_complete':
                return await handleToggleGoal(args);
            case 'delete_goal':
            case 'remove_goal':
                return await handleDeleteGoal(args);
            case 'edit_goal':
            case 'update_goal':
                return await handleEditGoal(args);
            case 'add_habit':
                return await handleAddHabit(args);
            case 'delete_habit':
            case 'remove_habit':
                return await handleDeleteHabit(args);
            case 'edit_habit':
            case 'update_habit':
                return await handleEditHabit(args);
            case 'toggle_habit_log':
            case 'log_habit':
            case 'check_habit':
                return await handleToggleHabitLog(args);
            case 'create_template':
                return await handleCreateTemplate(args);
            case 'edit_template':
                return await handleEditTemplate(args);
            case 'delete_template':
            case 'remove_template':
                return await handleDeleteTemplate(args);
            case 'schedule_myday_block':
            case 'schedule_habit_on_day':
                return await handleScheduleBlock({
                    name: args.name || args.habitName,
                    startTime: args.startTime || args.time || args.start,
                    duration: args.duration || args.dur || '30m',
                    day: args.day,
                    templateId: args.templateId
                });
            case 'move_block':
            case 'move_scheduled_habit':
                return await handleMoveBlock({
                    habitName: args.habitName || args.name || args.blockName,
                    toTime: args.toTime || args.toStartTime || args.targetTime,
                    toDay: args.toDay || args.day,
                    fromDay: args.fromDay,
                    fromTime: args.fromTime || args.fromStartTime || args.sourceTime,
                    fromTemplateId: args.fromTemplateId,
                    toTemplateId: args.toTemplateId,
                    duration: args.duration
                });
            case 'delete_myday_block':
            case 'delete_scheduled_habit_block':
                return await handleDeleteBlock({
                    blockName: args.blockName || args.name || args.habitName,
                    day: args.day,
                    templateId: args.templateId
                });
            case 'map_template_to_day':
                return await handleMapTemplateToDay(args);
            case 'add_quick_task':
                return await handleAddQuickTask(args);
            case 'read_quick_tasks':
                return await handleReadQuickTasks();
            case 'toggle_quick_task':
            case 'complete_quick_task':
            case 'mark_task_complete':
            case 'todo_mark_complete':
                return await handleToggleQuickTask(args);
            case 'delete_quick_task':
            case 'remove_quick_task':
                return await handleDeleteQuickTask(args);
            case 'clear_completed_tasks':
                return await handleClearCompletedTasks();
            case 'create_plan':
                return await handleCreatePlan(args);
            case 'read_plans':
                return await handleReadPlans();
            case 'edit_plan':
            case 'update_plan':
                return await handleEditPlan(args);
            case 'delete_plan':
            case 'remove_plan':
                return await handleDeletePlan(args);
            case 'read_app_state':
                return await handleReadState();
            case 'read_schedule':
                return await handleReadSchedule();
            case 'read_coins':
                return await handleReadCoins(args);
            case 'add_coins_entry':
                return await handleAddCoinsEntry(args);
            case 'delete_coins_entry':
            case 'remove_coins_entry':
                return await handleDeleteCoinsEntry(args);
            case 'set_coins_target':
                return await handleSetCoinsTarget(args);
            case 'read_quotes':
                return await handleReadQuotes();
            case 'add_quote':
                return await handleAddQuote(args);
            case 'delete_quote':
            case 'remove_quote':
                return await handleDeleteQuote(args);
            case 'read_counters':
                return await handleReadCounters();
            case 'update_counter':
            case 'increment_counter':
            case 'decrement_counter':
                return await handleUpdateCounter(args);
            case 'reset_counter':
                return await handleResetCounter(args);
            case 'add_counter':
            case 'create_counter':
                return await handleAddCounter(args);
            case 'delete_counter':
            case 'remove_counter':
                return await handleDeleteCounter(args);
            case 'read_milestones':
                return await handleReadMilestones(args);
            case 'set_milestone':
            case 'add_milestone':
                return await handleSetMilestone(args);
            case 'delete_milestone':
            case 'remove_milestone':
                return await handleDeleteMilestone(args);
            case 'read_timelogs':
                return await handleReadTimelogs(args);
            case 'add_timelog':
            case 'log_time':
                return await handleAddTimelog(args);
            case 'delete_timelog':
                return await handleDeleteTimelog(args);
            case 'read_habit_bundles':
                return await handleReadHabitBundles();
            case 'toggle_habit_bundle':
            case 'complete_habit_bundle':
                return await handleToggleHabitBundle(args);
            case 'read_dispatch':
                return await handleReadDispatch(args);
            case 'toggle_dispatch_slot':
            case 'complete_dispatch_slot':
                return await handleToggleDispatchSlot(args);
            case 'add_dispatch_slot':
                return await handleAddDispatchSlot(args);
            case 'set_currency':
                return await handleSetCurrency(args);
            default:
                throw new Error(`Unknown tool: ${tool}`);
        }
    }, [
        handleNavigate,
        handleCreateRoutine,
        handleSwitchRoutine,
        handleEditRoutine,
        handleDeleteRoutine,
        handleAddLifeGoal,
        handleAddRoutineGoal,
        handleAddMoneyGoal,
        handleToggleGoal,
        handleDeleteGoal,
        handleEditGoal,
        handleAddHabit,
        handleDeleteHabit,
        handleEditHabit,
        handleToggleHabitLog,
        handleCreateTemplate,
        handleEditTemplate,
        handleDeleteTemplate,
        handleScheduleBlock,
        handleMoveBlock,
        handleDeleteBlock,
        handleMapTemplateToDay,
        handleAddQuickTask,
        handleReadQuickTasks,
        handleToggleQuickTask,
        handleDeleteQuickTask,
        handleClearCompletedTasks,
        handleCreatePlan,
        handleReadPlans,
        handleEditPlan,
        handleDeletePlan,
        handleReadState,
        handleReadSchedule,
        handleReadCoins,
        handleAddCoinsEntry,
        handleDeleteCoinsEntry,
        handleSetCoinsTarget,
        handleReadQuotes,
        handleAddQuote,
        handleDeleteQuote,
        handleReadCounters,
        handleUpdateCounter,
        handleResetCounter,
        handleAddCounter,
        handleDeleteCounter,
        handleReadMilestones,
        handleSetMilestone,
        handleDeleteMilestone,
        handleReadTimelogs,
        handleAddTimelog,
        handleDeleteTimelog,
        handleReadHabitBundles,
        handleToggleHabitBundle,
        handleReadDispatch,
        handleToggleDispatchSlot,
        handleAddDispatchSlot,
        handleSetCurrency
    ]);

    return {
        executeTool,
        handleReadState,
        handleReadSchedule,
        handleCreateRoutine,
        handleSwitchRoutine,
        handleEditRoutine,
        handleDeleteRoutine,
        handleAddLifeGoal,
        handleAddRoutineGoal,
        handleAddMoneyGoal,
        handleToggleGoal,
        handleDeleteGoal,
        handleEditGoal,
        handleAddHabit,
        handleDeleteHabit,
        handleEditHabit,
        handleToggleHabitLog,
        handleCreateTemplate,
        handleEditTemplate,
        handleDeleteTemplate,
        handleScheduleBlock,
        handleMoveBlock,
        handleDeleteBlock,
        handleMapTemplateToDay,
        handleNavigate,
        handleAddQuickTask,
        handleReadQuickTasks,
        handleToggleQuickTask,
        handleDeleteQuickTask,
        handleClearCompletedTasks,
        handleCreatePlan,
        handleReadPlans,
        handleEditPlan,
        handleDeletePlan,
        handleReadCoins,
        handleAddCoinsEntry,
        handleDeleteCoinsEntry,
        handleSetCoinsTarget,
        handleReadQuotes,
        handleAddQuote,
        handleDeleteQuote,
        handleReadCounters,
        handleUpdateCounter,
        handleResetCounter,
        handleAddCounter,
        handleDeleteCounter,
        handleReadMilestones,
        handleSetMilestone,
        handleDeleteMilestone,
        handleReadTimelogs,
        handleAddTimelog,
        handleDeleteTimelog,
        handleReadHabitBundles,
        handleToggleHabitBundle,
        handleReadDispatch,
        handleToggleDispatchSlot,
        handleAddDispatchSlot,
        handleSetCurrency
    };
}
