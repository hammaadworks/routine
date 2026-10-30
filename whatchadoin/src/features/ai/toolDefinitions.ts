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
                    centerTab: { type: "string", enum: ["tasks", "myday", "calendar", "plans", "coins", "counters", "dispatch"], description: "Main center view: tasks, myday, calendar, plans, coins, counters, dispatch" },
                    leftTab: { type: "string", enum: ["life", "money", "routine", "habits"], description: "Left sidebar view: life, money, routine, habits" }
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
                    color: { type: "string", description: "Optional hex color code (e.g. #8AC926)" },
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
            description: "Adds an atomic recurring habit to the Habits bank in the active routine. Note: Habits should always be created here first before being scheduled on templates or timelines, so color and goal links are preserved.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "The name of the habit" },
                    desc: { type: "string", description: "Optional description of the habit" },
                    color: { type: "string", description: "Optional hex color code (e.g. #3498db). If omitted and linked to a goal, inherits goal color." },
                    duration: { type: "string", description: "Duration of the habit (e.g. '15 min', '30m', or minutes)" },
                    time: { type: "string", description: "Optional duration string (e.g. '15m', '1:15')" },
                    type: { type: "string", enum: ["daily", "weekly"], description: "Whether it is a daily or weekly habit" },
                    linkedRoutineGoalId: { type: "string", description: "Optional ID of a Routine Goal to link to" },
                    linkedLifeGoalId: { type: "string", description: "Optional ID of a Life Goal to link to" },
                    linkedMoneyGoalId: { type: "string", description: "Optional ID of a Money Goal to link to" },
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
            description: "Schedules a habit or custom block onto a specific day of the week or template in the active routine. Automatically inherits habit color or linked goal color if habit is in Habits bank.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Name of the block or habit to schedule" },
                    startTime: { type: "string", description: "Start time (e.g. '9am', '14:00', '2:30 PM', or minutes from midnight)" },
                    duration: { type: "string", description: "Duration in minutes or string (e.g. 60, '45m', '1h')" },
                    day: { type: "string", description: "Optional day of the week (e.g. 'Monday', 'Wednesday') to schedule on" },
                    templateId: { type: "string", description: "Optional template ID to schedule on" },
                    color: { type: "string", description: "Optional hex color code (e.g. #3498db). If omitted, resolves color from matching Habit or linked Goal." }
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
    },
    {
        type: "function",
        function: {
            name: "toggle_quick_task",
            description: "Marks a quick task/todo complete or incomplete (toggles if completed not specified).",
            parameters: {
                type: "object",
                properties: {
                    taskId: { type: "string", description: "ID of the task to toggle" },
                    name: { type: "string", description: "Name of the task to toggle if taskId not known" },
                    completed: { type: "boolean", description: "Explicit completion status (true for done, false for active). Inverts current state if omitted." }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "delete_quick_task",
            description: "Deletes a task from the quick tasks inbox.",
            parameters: {
                type: "object",
                properties: {
                    taskId: { type: "string", description: "ID of the task to delete" },
                    name: { type: "string", description: "Name of the task to delete if taskId not known" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "clear_completed_tasks",
            description: "Deletes all completed quick tasks from the inbox.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "toggle_goal",
            description: "Marks a goal complete or incomplete across routine, life, or money goals.",
            parameters: {
                type: "object",
                properties: {
                    goalId: { type: "string", description: "ID of the goal to toggle" },
                    name: { type: "string", description: "Name of the goal if goalId not known" },
                    type: { type: "string", enum: ["routine", "life", "money", "any"], description: "Goal category to look in (default 'any')" },
                    completed: { type: "boolean", description: "Explicit completion status (true/false). Inverts current state if omitted." }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "delete_goal",
            description: "Deletes a goal from routine goals, life goals, or money goals.",
            parameters: {
                type: "object",
                properties: {
                    goalId: { type: "string", description: "ID of the goal to delete" },
                    name: { type: "string", description: "Name of the goal to delete if goalId not known" },
                    type: { type: "string", enum: ["routine", "life", "money", "any"], description: "Goal category (default 'any')" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "edit_goal",
            description: "Edits an existing goal's name, cost, description, or color.",
            parameters: {
                type: "object",
                properties: {
                    goalId: { type: "string", description: "ID of the goal to edit" },
                    name: { type: "string", description: "Current name of the goal to find" },
                    newName: { type: "string", description: "New name for the goal" },
                    cost: { type: "number", description: "New cost/target amount" },
                    desc: { type: "string", description: "New description" },
                    color: { type: "string", description: "New hex color code" },
                    type: { type: "string", enum: ["routine", "life", "money", "any"], description: "Goal category (default 'any')" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "delete_habit",
            description: "Deletes a habit from the Habits bank in the active routine.",
            parameters: {
                type: "object",
                properties: {
                    habitId: { type: "string", description: "ID of the habit to delete" },
                    name: { type: "string", description: "Name of the habit to delete" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "edit_habit",
            description: "Edits an existing habit's name, duration, description, color, or type in the active routine.",
            parameters: {
                type: "object",
                properties: {
                    habitId: { type: "string", description: "ID of the habit to edit" },
                    name: { type: "string", description: "Current name of the habit" },
                    newName: { type: "string", description: "New name for the habit" },
                    duration: { type: "string", description: "New duration (e.g. '30m', '1h', 45)" },
                    time: { type: "string", description: "New time display string" },
                    desc: { type: "string", description: "New description" },
                    color: { type: "string", description: "New hex color code" },
                    type: { type: "string", enum: ["daily", "weekly"], description: "Whether daily or weekly habit" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "toggle_habit_log",
            description: "Checks or unchecks a habit for a given date in the daily log (defaults to today).",
            parameters: {
                type: "object",
                properties: {
                    habitId: { type: "string", description: "ID of the habit" },
                    name: { type: "string", description: "Name of the habit" },
                    date: { type: "string", description: "Date string in YYYY-MM-DD format (defaults to today)" },
                    completed: { type: "boolean", description: "Explicit completion status (true/false). Inverts current state if omitted." }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "delete_template",
            description: "Deletes a daily template from the active routine.",
            parameters: {
                type: "object",
                properties: {
                    templateId: { type: "string", description: "ID of the template to delete" },
                    name: { type: "string", description: "Name of the template to delete" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "edit_routine",
            description: "Edits routine metadata (name, description, start date, end date). Defaults to active routine.",
            parameters: {
                type: "object",
                properties: {
                    routineId: { type: "string", description: "Optional routine ID (defaults to active routine)" },
                    name: { type: "string", description: "New name for the routine" },
                    desc: { type: "string", description: "New description for the routine" },
                    start: { type: "string", description: "New start date (YYYY-MM-DD)" },
                    end: { type: "string", description: "New end date (YYYY-MM-DD)" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "delete_routine",
            description: "Deletes a routine by routineId or name. Cannot delete if it is the only routine.",
            parameters: {
                type: "object",
                properties: {
                    routineId: { type: "string", description: "ID of the routine to delete" },
                    name: { type: "string", description: "Name of the routine to delete" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "edit_plan",
            description: "Edits the name or markdown content of an existing plan document.",
            parameters: {
                type: "object",
                properties: {
                    planId: { type: "string", description: "ID of the plan to edit" },
                    name: { type: "string", description: "Current name of the plan to find" },
                    newName: { type: "string", description: "New name for the plan" },
                    content: { type: "string", description: "New markdown content for the plan body" },
                    isLife: { type: "boolean", description: "Whether to look in Life plans (true) or Routine plans (false)" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "delete_plan",
            description: "Deletes a plan document by ID or name.",
            parameters: {
                type: "object",
                properties: {
                    planId: { type: "string", description: "ID of the plan to delete" },
                    name: { type: "string", description: "Name of the plan to delete" },
                    isLife: { type: "boolean", description: "Whether the plan is in Life plans (true) or Routine plans (false)" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "delete_quote",
            description: "Deletes a motivational quote by ID or quote text.",
            parameters: {
                type: "object",
                properties: {
                    quoteId: { type: "string", description: "ID of the quote to delete" },
                    text: { type: "string", description: "Quote text to find and delete" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "delete_coins_entry",
            description: "Deletes an earnings record from the Coins earnings ledger.",
            parameters: {
                type: "object",
                properties: {
                    entryId: { type: "string", description: "ID of the entry to delete" },
                    year: { type: "number", description: "Year of the entry" },
                    month: { type: "number", description: "Month (1-12) of the entry" },
                    source: { type: "string", description: "Income source of the entry" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "set_coins_target",
            description: "Sets the annual financial target amount for a given year in Coins.",
            parameters: {
                type: "object",
                properties: {
                    year: { type: "number", description: "Target year (e.g. 2026)" },
                    target: { type: "number", description: "Annual target earnings amount" }
                },
                required: ["year", "target"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "read_counters",
            description: "Reads all counters with their cadence, today count, target, and backlog.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "update_counter",
            description: "Records an increment or decrement (delta) on a counter by ID or name.",
            parameters: {
                type: "object",
                properties: {
                    counterId: { type: "string", description: "ID of the counter" },
                    name: { type: "string", description: "Name of the counter" },
                    delta: { type: "number", description: "Amount to add or subtract (e.g. 1, -1, 5, 25)" },
                    why: { type: "string", description: "Optional note or reason for the log event" }
                },
                required: ["delta"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "reset_counter",
            description: "Resets today's count for a counter to zero.",
            parameters: {
                type: "object",
                properties: {
                    counterId: { type: "string", description: "ID of the counter" },
                    name: { type: "string", description: "Name of the counter" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_counter",
            description: "Creates a new counter (daily, weekly, or total) with target and step.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Name of the counter" },
                    cadence: { type: "string", enum: ["daily", "weekly", "total"], description: "Counter cadence (default 'daily')" },
                    targetCount: { type: "number", description: "Target count (default 100)" },
                    unit: { type: "string", description: "Measurement unit (e.g. 'reps', 'pages', 'km', default 'reps')" },
                    step: { type: "number", description: "Default increment step size (default 1)" },
                    color: { type: "string", description: "Optional hex color code" },
                    notes: { type: "string", description: "Optional notes" }
                },
                required: ["name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "delete_counter",
            description: "Deletes a counter by ID or name.",
            parameters: {
                type: "object",
                properties: {
                    counterId: { type: "string", description: "ID of the counter to delete" },
                    name: { type: "string", description: "Name of the counter to delete" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "read_milestones",
            description: "Reads calendar milestones and events across all dates or for a specific date.",
            parameters: {
                type: "object",
                properties: {
                    date: { type: "string", description: "Optional specific date (YYYY-MM-DD)" },
                    filter: { type: "string", description: "Optional text search query" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "set_milestone",
            description: "Adds or sets a milestone for a specific date (YYYY-MM-DD).",
            parameters: {
                type: "object",
                properties: {
                    date: { type: "string", description: "Target date in YYYY-MM-DD format" },
                    name: { type: "string", description: "Milestone title or content" },
                    tag: { type: "string", description: "Optional routine or goal tag (e.g. '100DREAM')" },
                    desc: { type: "string", description: "Optional description or notes" }
                },
                required: ["date", "name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "delete_milestone",
            description: "Deletes a milestone on a specific calendar date (YYYY-MM-DD).",
            parameters: {
                type: "object",
                properties: {
                    date: { type: "string", description: "Target date in YYYY-MM-DD format" },
                    name: { type: "string", description: "Specific milestone name to remove (if omitted, clears date)" }
                },
                required: ["date"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "read_timelogs",
            description: "Reads time log entries for a specific date (defaults to today).",
            parameters: {
                type: "object",
                properties: {
                    date: { type: "string", description: "Date string in YYYY-MM-DD format (defaults to today)" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_timelog",
            description: "Adds a time tracking log entry to the active routine.",
            parameters: {
                type: "object",
                properties: {
                    date: { type: "string", description: "Date string in YYYY-MM-DD format (defaults to today)" },
                    startTime: { type: "string", description: "Start time (e.g. '09:00', '9:30 AM')" },
                    endTime: { type: "string", description: "End time (e.g. '10:15', '10:30 AM')" },
                    desc: { type: "string", description: "Description or note of what was done" },
                    tagGoalId: { type: "string", description: "Optional linked goal or habit name/ID" }
                },
                required: ["startTime", "endTime"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "delete_timelog",
            description: "Deletes a time log entry by ID or date/time.",
            parameters: {
                type: "object",
                properties: {
                    logId: { type: "string", description: "ID of the timelog to delete" },
                    date: { type: "string", description: "Date string (YYYY-MM-DD, defaults to today)" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "read_habit_bundles",
            description: "Reads all habit bundles configured in the active routine.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "toggle_habit_bundle",
            description: "Marks all habits in a habit bundle as complete or incomplete for a date.",
            parameters: {
                type: "object",
                properties: {
                    bundleId: { type: "string", description: "ID of the bundle" },
                    name: { type: "string", description: "Name of the bundle" },
                    date: { type: "string", description: "Date string (YYYY-MM-DD, defaults to today)" },
                    completed: { type: "boolean", description: "Explicit completion status (inverts if omitted)" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "read_dispatch",
            description: "Reads Content Dispatch personas, platforms, and scheduled post slots for a date.",
            parameters: {
                type: "object",
                properties: {
                    date: { type: "string", description: "Date string (YYYY-MM-DD, defaults to today)" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "toggle_dispatch_slot",
            description: "Toggles completion status for a platform post slot in Content Dispatch.",
            parameters: {
                type: "object",
                properties: {
                    slotId: { type: "string", description: "ID of the slot to toggle" },
                    personaId: { type: "string", description: "Optional persona ID" },
                    date: { type: "string", description: "Date string (YYYY-MM-DD, defaults to today)" }
                },
                required: ["slotId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_dispatch_slot",
            description: "Adds an ad-hoc post slot to a platform in Content Dispatch.",
            parameters: {
                type: "object",
                properties: {
                    platformId: { type: "string", description: "ID of the platform" },
                    title: { type: "string", description: "Post/content title" },
                    notes: { type: "string", description: "Optional notes" },
                    personaId: { type: "string", description: "Optional persona ID" },
                    date: { type: "string", description: "Date string (YYYY-MM-DD, defaults to today)" }
                },
                required: ["platformId", "title"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "set_currency",
            description: "Sets the currency code for the application (e.g. 'USD', 'INR', 'EUR', 'GBP').",
            parameters: {
                type: "object",
                properties: {
                    currency: { type: "string", description: "3-letter currency code (e.g. USD, INR, EUR)" }
                },
                required: ["currency"]
            }
        }
    }
];

export const STRICT_PROMPT = "MANDATORY: You MUST proactively ask the user for ALL optional fields listed in the schema (e.g. cost, desc, linkedLifeGoalId, linkedRoutineGoalId, etc.) before invoking this tool, to ensure complete data entry. Do not proceed until you have explicitly asked about the optional fields.";
