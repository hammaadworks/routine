export interface ToolDefinition {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: "object";
            properties: Record<string, unknown>;
            required?: string[];
        };
    };
}

export const AI_TOOL_DEFINITIONS: ToolDefinition[] = [
    {
        type: "function",
        function: {
            name: "navigate_app",
            description: "Changes the active views/tabs in the main application UI.",
            parameters: {
                type: "object",
                properties: {
                    centerTab: { type: "string", enum: ["tasks", "myday", "calendar", "plans", "coins"], description: "Main center view: tasks, myday, calendar, plans, coins" },
                    leftTab: { type: "string", enum: ["life", "money", "routine"], description: "Left sidebar view: life, money, routine" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "create_routine",
            description: "Creates a new top-level Routine (with name, optional start/end dates, and description) and sets it as active.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Name of the new Routine (e.g. 'Routine 1', 'Summer Sprint')" },
                    desc: { type: "string", description: "Optional description of the routine" },
                    start: { type: "string", description: "Optional start date (YYYY-MM-DD)" },
                    end: { type: "string", description: "Optional end date (YYYY-MM-DD)" }
                },
                required: ["name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "switch_routine",
            description: "Switches the active Routine to another existing Routine by routineId.",
            parameters: {
                type: "object",
                properties: {
                    routineId: { type: "string", description: "ID of the routine to switch to" }
                },
                required: ["routineId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_life_goal",
            description: "Adds a new high-level life goal to the Life tab.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Name of the life goal" },
                    desc: { type: "string", description: "Optional description of the life goal" },
                    color: { type: "string", description: "Optional color code (e.g. #3498db)" },
                    cost: { type: "number", description: "Optional target amount or cost" },
                    isPublic: { type: "boolean", description: "Whether this goal is visible in Public Mode (default false)" }
                },
                required: ["name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_routine_goal",
            description: "Adds a new routine goal/project for the current active routine.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Name of the routine goal" },
                    desc: { type: "string", description: "Description of the routine goal" },
                    color: { type: "string", description: "Optional color code (e.g. #3498db)" },
                    duration: { type: "string", description: "Estimated duration (e.g. '45 min')" },
                    cost: { type: "number", description: "Target amount or cost" },
                    linkedLifeGoalId: { type: "string", description: "Optional ID of a Life Goal to link to" },
                    isPublic: { type: "boolean", description: "Whether this goal is visible in Public Mode (default false)" }
                },
                required: ["name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_money_goal",
            description: "Adds a financial goal with cost to the Money tab.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "The name of the money goal" },
                    cost: { type: "number", description: "Target financial amount or cost" },
                    desc: { type: "string", description: "Optional description or note" },
                    isPublic: { type: "boolean", description: "Whether this goal is visible in Public Mode (default false)" }
                },
                required: ["name", "cost"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_habit",
            description: "Adds an atomic recurring habit to the Habits bank in the active routine.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "The name of the habit" },
                    desc: { type: "string", description: "Optional description of the habit" },
                    duration: { type: "string", description: "Duration of the habit (e.g. '15 min', '30m', or minutes)" },
                    time: { type: "string", description: "Optional duration string (e.g. '15m', '1:15')" },
                    type: { type: "string", enum: ["daily", "weekly"], description: "Whether it is a daily or weekly habit" },
                    linkedRoutineGoalId: { type: "string", description: "Optional ID of a Routine Goal to link to" },
                    isPublic: { type: "boolean", description: "Whether this habit is visible in Public Mode (default false)" }
                },
                required: ["name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "create_template",
            description: "Creates a new daily template (e.g. 'Workday', 'Weekend') inside the active routine.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Name for the new daily template" }
                },
                required: ["name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "edit_template",
            description: "Edits an existing daily template's name inside the active routine.",
            parameters: {
                type: "object",
                properties: {
                    templateId: { type: "string", description: "ID of the template to edit" },
                    name: { type: "string", description: "New name for the template" }
                },
                required: ["templateId", "name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "schedule_myday_block",
            description: "Schedules a habit or custom block onto a specific day of the week (e.g. 'Monday', 'Tuesday') or template in the active routine.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Name of the block or habit to schedule" },
                    startTime: { type: "string", description: "Start time (e.g. '9am', '14:00', '2:30 PM', or minutes from midnight)" },
                    duration: { type: "string", description: "Duration in minutes or string (e.g. 60, '45m', '1h')" },
                    day: { type: "string", description: "Optional day of the week (e.g. 'Monday', 'Wednesday') to schedule on" },
                    templateId: { type: "string", description: "Optional template ID to schedule on" }
                },
                required: ["name", "startTime", "duration"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "move_block",
            description: "Moves a scheduled block or habit from one day/time to another (e.g. 'move habit1 from monday 2pm to wed 3pm'). Uncouples shared templates, auto-creates day templates, and detects collisions.",
            parameters: {
                type: "object",
                properties: {
                    habitName: { type: "string", description: "Name, task, or ID of the habit or scheduled block to move" },
                    toTime: { type: "string", description: "Target start time on the schedule (e.g. '3pm', '15:00', '3:30 PM')" },
                    toDay: { type: "string", description: "Target day of the week (e.g. 'Wednesday', 'Monday'). If omitted, moves within the same day/template." },
                    fromDay: { type: "string", description: "Optional source day of the week (e.g. 'Monday') where the block is currently scheduled" },
                    fromTime: { type: "string", description: "Optional source time (e.g. '2pm', '14:00') to disambiguate if multiple blocks share the same habit name" },
                    fromTemplateId: { type: "string", description: "Optional source template ID" },
                    toTemplateId: { type: "string", description: "Optional target template ID" },
                    duration: { type: "string", description: "Optional new duration (e.g. '45m', '1h', 45)" }
                },
                required: ["habitName", "toTime"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "delete_myday_block",
            description: "Deletes a scheduled block from a specific day of the week or template. Uncouples shared templates so only the targeted day is modified.",
            parameters: {
                type: "object",
                properties: {
                    blockName: { type: "string", description: "Name, task, or ID of the block to delete" },
                    day: { type: "string", description: "Optional day of the week (e.g. 'Monday') where the block is scheduled" },
                    templateId: { type: "string", description: "Optional template ID where the block is scheduled" }
                },
                required: ["blockName"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "map_template_to_day",
            description: "Assigns a daily template to a specific day of the week in the active routine Weekly Schedule.",
            parameters: {
                type: "object",
                properties: {
                    day: {
                        type: "string",
                        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                        description: "Day of the week"
                    },
                    templateId: { type: "string", description: "ID of the template to assign to this day" }
                },
                required: ["day", "templateId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_quick_task",
            description: "Adds a new task to the quick tasks inbox.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "The name of the task" },
                    isPublic: { type: "boolean", description: "Whether this task is visible in Public Mode (default false)" }
                },
                required: ["name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "read_quick_tasks",
            description: "Reads all quick tasks from the quick tasks inbox.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "create_plan",
            description: "Creates a new plan/document in the Plans section.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Name of the plan" },
                    content: { type: "string", description: "Markdown content for the plan body" },
                    isLife: { type: "boolean", description: "If true, stores it in Life plans instead of the active Routine (default false)" }
                },
                required: ["name", "content"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "read_plans",
            description: "Reads all plan documents for both the active routine and global life plans.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "read_schedule",
            description: "Reads the entire weekly schedule, day templates, habits, and routine goals.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "read_state",
            description: "Reads comprehensive app state including all routines, goals, and active context.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "read_quotes",
            description: "Reads the list of motivational quotes.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_quote",
            description: "Adds a motivational quote to the quotes library.",
            parameters: {
                type: "object",
                properties: {
                    text: { type: "string", description: "The quote text" }
                },
                required: ["text"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "read_coins",
            description: "Reads financial coins earnings summary and timeline data.",
            parameters: {
                type: "object",
                properties: {
                    includeEntries: { type: "boolean", description: "Whether to include raw log entries" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_coins_entry",
            description: "Adds an earnings entry to the Coins earnings ledger.",
            parameters: {
                type: "object",
                properties: {
                    year: { type: "number", description: "Year (e.g. 2026)" },
                    month: { type: "number", description: "Month 1-12" },
                    amount: { type: "number", description: "Amount earned" },
                    source: { type: "string", description: "Income source category" },
                    notes: { type: "string", description: "Optional notes" }
                },
                required: ["year", "month", "amount", "source"]
            }
        }
    }
];

export const STRICT_PROMPT = "MANDATORY: You MUST proactively ask the user for ALL optional fields listed in the schema (e.g. cost, desc, linkedLifeGoalId, linkedRoutineGoalId, etc.) before invoking this tool, to ensure complete data entry. Do not proceed until you have explicitly asked about the optional fields.";
