import {useWebMCP} from 'use-webmcp-tool';
import {useCallback} from 'react';

// SCHEMAS
const addLifeGoalSchema = {
    type: 'object', properties: {
        title: {type: 'string', description: 'The title of the life goal'},
        cost: {type: 'number', description: 'Optional cost/value associated with the goal'}
    }, required: ['title']
};

const addRoutineGoalSchema = {
    type: 'object', properties: {
        title: {type: 'string', description: 'The title of the routine goal'},
        duration: {type: 'string', description: 'Estimated duration (e.g. "45 min")'},
        linkedLifeGoalId: {type: 'string', description: 'Optional ID of a Life Goal to link to'}
    }, required: ['title']
};

const addHabitSchema = {
    type: 'object', properties: {
        title: {type: 'string', description: 'The title of the habit'},
        duration: {type: 'string', description: 'Duration of the habit (e.g. "15 min")'},
        type: {type: 'string', enum: ['daily', 'weekly'], description: 'Whether it is a daily or weekly habit'},
        linkedRoutineGoalId: {type: 'string', description: 'Optional ID of a Routine Goal to link to'}
    }, required: ['title', 'duration']
};

const createTemplateSchema = {
    type: 'object', properties: {
        name: {type: 'string', description: 'Name for the new timeline template'}
    }, required: ['name']
};

const editTemplateSchema = {
    type: 'object', properties: {
        templateId: {type: 'string', description: 'ID of the template to edit'},
        name: {type: 'string', description: 'New name for the template'}
    }, required: ['templateId', 'name']
};

const scheduleBlockSchema = {
    type: 'object', properties: {
        templateId: {type: 'string', description: 'ID of the template to modify (optional, defaults to active)'},
        name: {type: 'string', description: 'Name of the block to schedule'},
        startTime: {type: 'number', description: 'Start time in minutes from midnight (e.g. 540 for 9:00 AM)'},
        duration: {type: 'number', description: 'Duration in minutes (e.g. 60)'}
    }, required: ['name', 'startTime', 'duration']
};

const navigateAppSchema = {
    type: 'object', properties: {
        centerTab: {type: 'string', enum: ['timeline', 'tasks', 'calendar', 'plans'], description: 'Main center view'},
        leftTab: {type: 'string', enum: ['life', 'money', 'routine'], description: 'Left sidebar view'}
    }
};

const readStateSchema = {
    type: 'object', properties: {}
};

// MANDATORY PROMPT ENFORCEMENT
const STRICT_PROMPT = "MANDATORY: You MUST proactively ask the user for ALL optional fields listed in the schema (e.g. cost, linkedLifeGoalId, linkedRoutineGoalId, etc.) before invoking this tool, to ensure complete data entry. Do not proceed until you have explicitly asked about the optional fields.";

export function useWebMCPIntegration({
                                         setLifeGoals,
                                         updateActiveRoutine,
                                         activeRoutine,
                                         setActiveCenterTab,
                                         setActiveLeftTab,
                                         setMobileTab,
                                         lifeGoals,
                                         moneyGoals
                                     }: any) {
    // 0. Read State (Crucial for getting IDs to link to)
    const handleReadState = useCallback(async () => {
        const allWalletGoals = [...(lifeGoals || []).map((g: any) => ({
            ...g, category: 'Life'
        })), ...(activeRoutine.routineGoals || []).map((g: any) => ({
            ...g, category: 'Routine'
        })), ...(moneyGoals || []).map((g: any) => ({
            ...g, category: 'Money'
        }))].filter((g: any) => typeof g.cost === 'number' && g.cost > 0).sort((a: any, b: any) => b.cost - a.cost);

        const walletTotalRemaining = allWalletGoals.filter(g => !g.completed).reduce((sum, g) => sum + (g.cost || 0), 0);

        return {
            templates: (activeRoutine.templates || []).map((t: any) => ({id: t.id, name: t.name})),
            lifeGoals: (lifeGoals || []).map((g: any) => ({
                id: g.id,
                title: g.title,
                cost: g.cost,
                completed: g.completed
            })),
            routineGoals: (activeRoutine.routineGoals || []).map((g: any) => ({
                id: g.id,
                title: g.title,
                cost: g.cost,
                completed: g.completed
            })),
            moneyGoals: (moneyGoals || []).map((g: any) => ({
                id: g.id,
                title: g.title,
                cost: g.cost,
                completed: g.completed
            })),
            walletTotalRemaining,
            walletGoals: allWalletGoals.map((g: any) => ({
                title: g.title,
                cost: g.cost,
                completed: g.completed,
                category: g.category
            }))
        };
    }, [activeRoutine, lifeGoals, moneyGoals]);

    useWebMCP({
        name: 'read_app_state',
        description: 'Read the current templates, life goals, routine goals, and wallet/money states.',
        inputSchema: readStateSchema,
        execute: handleReadState,
        annotations: {readOnlyHint: true, untrustedContentHint: false, consequentialHint: false}
    });

    // 1. Add Life Goal
    const handleAddLifeGoal = useCallback(async (inputs: any) => {
        if (!inputs.title) throw new Error("Invalid parameters: title is required");
        setLifeGoals((prev: any[]) => [...prev, {
            id: crypto.randomUUID(),
            title: inputs.title,
            cost: inputs.cost || 0,
            completed: false,
            createdAt: new Date().toISOString()
        }]);
        return {success: true, message: `Life goal '${inputs.title}' created.`};
    }, [setLifeGoals]);

    useWebMCP({
        name: 'add_life_goal',
        description: `Add a high-level life goal. ${STRICT_PROMPT}`,
        inputSchema: addLifeGoalSchema,
        execute: handleAddLifeGoal,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 2. Add Routine Goal
    const handleAddRoutineGoal = useCallback(async (inputs: any) => {
        if (!inputs.title) throw new Error("Invalid parameters: title is required");
        updateActiveRoutine({
            routineGoals: [...(activeRoutine.routineGoals || []), {
                id: crypto.randomUUID(),
                title: inputs.title,
                duration: inputs.duration || '30 min',
                lifeGoalId: inputs.linkedLifeGoalId || null,
                createdAt: new Date().toISOString()
            }]
        });
        return {success: true, message: `Routine goal '${inputs.title}' created.`};
    }, [activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'add_routine_goal',
        description: `Add a routine goal. ${STRICT_PROMPT}`,
        inputSchema: addRoutineGoalSchema,
        execute: handleAddRoutineGoal,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 3. Add Habit
    const handleAddHabit = useCallback(async (inputs: any) => {
        if (!inputs.title) throw new Error("Invalid parameters: title is required");

        const newHabit = {
            id: crypto.randomUUID(),
            title: inputs.title,
            duration: inputs.duration || '15 min',
            type: inputs.type || 'daily',
            routineGoalId: inputs.linkedRoutineGoalId || null
        };

        const currentHabits = activeRoutine.habits || {daily: [], weekly: []};
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
        return {success: true, message: `Habit '${inputs.title}' created.`};
    }, [activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'add_habit',
        description: `Add an atomic habit. ${STRICT_PROMPT}`,
        inputSchema: addHabitSchema,
        execute: handleAddHabit,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 4. Create Template
    const handleCreateTemplate = useCallback(async (inputs: any) => {
        if (!inputs.name) throw new Error("Invalid parameters: name is required");
        const newTemplate = {id: crypto.randomUUID(), name: inputs.name, blocks: []};
        updateActiveRoutine({
            templates: [...(activeRoutine.templates || []), newTemplate], activeTemplateId: newTemplate.id
        });
        return {success: true, message: `Template '${inputs.name}' created.`};
    }, [activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'create_template',
        description: `Create a new timeline template.`,
        inputSchema: createTemplateSchema,
        execute: handleCreateTemplate,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 5. Edit Template
    const handleEditTemplate = useCallback(async (inputs: any) => {
        if (!inputs.templateId || !inputs.name) throw new Error("Invalid parameters");
        const currentTemplates = activeRoutine.templates || [];
        const index = currentTemplates.findIndex((t: any) => t.id === inputs.templateId);
        if (index === -1) throw new Error("Wrong state: templateId not found");

        const updated = [...currentTemplates];
        updated[index] = {...updated[index], name: inputs.name};
        updateActiveRoutine({templates: updated});
        return {success: true, message: `Template name updated.`};
    }, [activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'edit_template',
        description: `Edit an existing timeline template's name.`,
        inputSchema: editTemplateSchema,
        execute: handleEditTemplate,
        annotations: {readOnlyHint: false, untrustedContentHint: true, consequentialHint: false}
    });

    // 6. Schedule Timeline Block
    const handleScheduleBlock = useCallback(async (inputs: any) => {
        if (!inputs.name || inputs.startTime === undefined || !inputs.duration) {
            throw new Error("Invalid parameters");
        }

        const targetTemplateId = inputs.templateId || activeRoutine.activeTemplateId;
        if (!targetTemplateId) throw new Error("Wrong state: No active template selected and no templateId provided.");

        const currentTemplates = activeRoutine.templates || [];
        const templateIndex = currentTemplates.findIndex((t: any) => t.id === targetTemplateId);
        if (templateIndex === -1) throw new Error(`Invalid parameters: Template ${targetTemplateId} not found.`);

        const newBlock = {
            id: crypto.randomUUID(),
            name: inputs.name,
            startTime: inputs.startTime,
            duration: inputs.duration,
            color: '#3498db'
        };

        const updatedTemplates = [...currentTemplates];
        updatedTemplates[templateIndex] = {
            ...updatedTemplates[templateIndex], blocks: [...(updatedTemplates[templateIndex].blocks || []), newBlock]
        };

        updateActiveRoutine({templates: updatedTemplates});
        return {success: true, message: `Block '${inputs.name}' scheduled.`};
    }, [activeRoutine, updateActiveRoutine]);

    useWebMCP({
        name: 'schedule_timeline_block',
        description: `Schedule a block on a timeline template. ${STRICT_PROMPT}`,
        inputSchema: scheduleBlockSchema,
        execute: handleScheduleBlock,
        annotations: {readOnlyHint: false, untrustedContentHint: false, consequentialHint: false}
    });

    // 7. Navigate App
    const handleNavigate = useCallback(async (inputs: any) => {
        if (inputs.centerTab) {
            setActiveCenterTab(inputs.centerTab);
            setMobileTab(inputs.centerTab === 'timeline' ? 'myday' : inputs.centerTab);
        }
        if (inputs.leftTab) {
            setActiveLeftTab(inputs.leftTab);
        }
        return {
            success: true,
            message: `Navigated to ${inputs.centerTab || 'current'} / ${inputs.leftTab || 'current'}`
        };
    }, [setActiveCenterTab, setActiveLeftTab, setMobileTab]);

    useWebMCP({
        name: 'navigate_app',
        description: 'Switch between different tabs and views.',
        inputSchema: navigateAppSchema,
        execute: handleNavigate,
        annotations: {readOnlyHint: true, untrustedContentHint: false, consequentialHint: false}
    });
}
