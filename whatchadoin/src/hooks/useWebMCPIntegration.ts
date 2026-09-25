import {useCallback} from 'react';
import {useWebMCP} from 'use-webmcp-tool';
import {getAllWalletGoals, parseDuration, sanitizeEntities} from '../utils';

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
            }))
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
                setMobileTab('goals');
            }
        }
        return {
            success: true,
            message: `Navigated to ${inputs.centerTab || 'current'} / ${inputs.leftTab || 'current'}`
        };
    }, [setActiveCenterTab, setActiveLeftTab, setMobileTab, setIsLeftPaneExpanded]);

    useWebMCP({
        name: 'navigate_app',
        description: 'Switch between different tabs and views: centerTab (myday, tasks, calendar, plans, coins) and leftTab (life, money, routine).',
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
                completed: Boolean(t.completed)
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

    // Universal Tool Executor (Used by in-app AI agent via BroadcastChannel and external callers)
    const executeTool = useCallback(async (tool: string, args: any = {}) => {
        switch (tool) {
            case 'navigate_app':
                return await handleNavigate(args);
            case 'create_routine':
                return await handleCreateRoutine(args);
            case 'switch_routine':
                return await handleSwitchRoutine(args);
            case 'add_life_goal':
                return await handleAddLifeGoal(args);
            case 'add_routine_goal':
                return await handleAddRoutineGoal(args);
            case 'add_money_goal':
                return await handleAddMoneyGoal(args);
            case 'add_habit':
                return await handleAddHabit(args);
            case 'create_template':
                return await handleCreateTemplate(args);
            case 'edit_template':
                return await handleEditTemplate(args);
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
            case 'create_plan':
                return await handleCreatePlan(args);
            case 'read_plans':
                return await handleReadPlans();
            case 'read_app_state':
                return await handleReadState();
            case 'read_schedule':
                return await handleReadSchedule();
            case 'read_coins':
                return await handleReadCoins(args);
            case 'add_coins_entry':
                return await handleAddCoinsEntry(args);
            case 'read_quotes':
                return await handleReadQuotes();
            case 'add_quote':
                return await handleAddQuote(args);
            default:
                throw new Error(`Unknown tool: ${tool}`);
        }
    }, [
        handleNavigate,
        handleCreateRoutine,
        handleSwitchRoutine,
        handleAddLifeGoal,
        handleAddRoutineGoal,
        handleAddMoneyGoal,
        handleAddHabit,
        handleCreateTemplate,
        handleEditTemplate,
        handleScheduleBlock,
        handleMoveBlock,
        handleDeleteBlock,
        handleMapTemplateToDay,
        handleAddQuickTask,
        handleReadQuickTasks,
        handleCreatePlan,
        handleReadPlans,
        handleReadState,
        handleReadSchedule,
        handleReadCoins,
        handleAddCoinsEntry,
        handleReadQuotes,
        handleAddQuote
    ]);

    return {
        executeTool,
        handleReadState,
        handleReadSchedule,
        handleCreateRoutine,
        handleSwitchRoutine,
        handleAddLifeGoal,
        handleAddRoutineGoal,
        handleAddMoneyGoal,
        handleAddHabit,
        handleCreateTemplate,
        handleEditTemplate,
        handleScheduleBlock,
        handleMoveBlock,
        handleDeleteBlock,
        handleMapTemplateToDay,
        handleNavigate,
        handleAddQuickTask,
        handleReadQuickTasks,
        handleCreatePlan,
        handleReadPlans,
        handleReadCoins,
        handleAddCoinsEntry
    };
}
