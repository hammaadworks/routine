import { useState, useEffect, useRef } from 'react';
import { sendToProvider } from '../utils/aiProviders';
import { Settings, Send, PanelRight, PanelBottom, ExternalLink, X } from 'lucide-react';
import AIConfigEditor from './AIConfigEditor';

const TOOLS = [
  {
    type: "function",
    function: {
      name: "navigate_app",
      description: "Changes the active views/tabs in the main application UI.",
      parameters: {
        type: "object",
        properties: {
          centerTab: { type: "string", enum: ["tasks", "myday", "calendar", "plans", "coins"], description: "Main center view: tasks, myday, calendar, plans" },
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
          cost: { type: "number", description: "Optional target amount or cost" }
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
          linkedLifeGoalId: { type: "string", description: "Optional ID of a Life Goal to link to" }
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
          desc: { type: "string", description: "Optional description or note" }
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
          linkedRoutineGoalId: { type: "string", description: "Optional ID of a Routine Goal to link to" }
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
          name: { type: "string", description: "The name of the task" }
        },
        required: ["name"]
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
  }
];

export default function AIAgentApp({ isDocked = false }: { isDocked?: boolean }) {
  const [appState, setAppState] = useState<any>(null);
  const appStateRef = useRef<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const pendingResolvers = useRef<Record<string, (value: any) => void>>({}); 

  const changeDock = (position: string) => {
    if (channelRef.current) {
      channelRef.current.postMessage({ type: 'DOCK_COMMAND', payload: position });
    }
    // If we are currently popped out (not docked) and want to dock or close, close this window
    if (!isDocked && (position === 'right' || position === 'bottom' || position === 'closed')) {
      window.close();
    }
  };

  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('whatchadoin_ai_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.profiles) return parsed;
        return {
          activeProfileId: 'default',
          profiles: [{
            id: 'default',
            name: 'Default Profile',
            provider: parsed.provider || 'openai',
            model: parsed.model || 'gpt-4o',
            apiKey: parsed.apiKey || '',
            customEndpoint: parsed.customEndpoint || ''
          }]
        };
      } catch {}
    }
    return {
      activeProfileId: 'default',
      profiles: [{
        id: 'default',
        name: 'Default Profile',
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: '',
        customEndpoint: ''
      }]
    };
  });
  const [showSettings, setShowSettings] = useState(!isDocked);

  useEffect(() => {
    localStorage.setItem('whatchadoin_ai_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    const handleConfigUpdate = (e: any) => {
      setConfig(e.detail);
    };
    window.addEventListener('ai_config_updated', handleConfigUpdate as EventListener);
    return () => window.removeEventListener('ai_config_updated', handleConfigUpdate as EventListener);
  }, []);

  useEffect(() => {
    const bc = new BroadcastChannel('whatchadoin_ai_channel');
    channelRef.current = bc;
    
    bc.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'STATE_UPDATE') {
        setAppState(data.payload);
        appStateRef.current = data.payload;
      } else if (data.type === 'TOOL_RESULT') {
        const { callId, status, error, message } = data;
        if (pendingResolvers.current[callId]) {
          pendingResolvers.current[callId]({ status, error, message });
          delete pendingResolvers.current[callId];
        }
      }
    };
    
    // Request initial state
    bc.postMessage({ type: 'PING' });
    
    return () => bc.close();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    const activeProfile = config.profiles.find((p: any) => p.id === config.activeProfileId) || config.profiles[0];
    if (!activeProfile.apiKey) {
      alert("Please configure your API Key in Settings first.");
      if (!isDocked) {
        setShowSettings(true);
      } else {
        window.dispatchEvent(new CustomEvent('open_global_settings', { detail: 'ai' }));
      }
      return;
    }

    const newUserMsg = { role: 'user', content: input };
    const currentMsgs = [...messages, newUserMsg];
    setMessages(currentMsgs);
    setInput('');
    setIsLoading(true);

    try {
      await processLLMLoop(currentMsgs);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const processLLMLoop = async (currentMsgs: any[]) => {
    const activeProfile = config.profiles.find((p: any) => p.id === config.activeProfileId) || config.profiles[0];
    const currentAppState = appStateRef.current || appState;
    const response = await sendToProvider(currentMsgs, currentAppState, TOOLS, activeProfile);
    
    if (response.type === 'tool_call') {
      const assistantMsg = response.message;
      setMessages(prev => [...prev, assistantMsg]);
      
      const toolResultsMsgs = [];

      for (const call of response.toolCalls) {
        const callId = call.id;
        const toolName = call.function.name;
        const args = JSON.parse(call.function.arguments);
        
        // Broadcast execution
        const resultPromise = new Promise(resolve => {
          pendingResolvers.current[callId] = resolve;
        });

        channelRef.current?.postMessage({
          type: 'TOOL_EXECUTION',
          tool: toolName,
          args,
          callId
        });

        // Wait for result from main tab
        const result = await resultPromise as any;
        const contentStr = result.status === 'success' ? (result.message || 'Action executed successfully.') : `Error: ${result.error}`;
        
        toolResultsMsgs.push({
          role: 'tool',
          tool_call_id: callId,
          content: contentStr
        });
      }

      // Add tool results to history and call LLM again
      const nextMsgs = [...currentMsgs, assistantMsg, ...toolResultsMsgs];
      setMessages(nextMsgs);
      await processLLMLoop(nextMsgs); // Recurse
      
    } else {
      // Normal text response
      setMessages(prev => [...prev, response.message]);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', color: '#fff', fontFamily: 'system-ui' }}>
      {/* Sidebar Settings */}
      <div style={{ width: showSettings ? '300px' : '0', transition: 'width 0.3s', overflow: 'hidden', background: 'var(--panel-bg)', borderRight: '1px solid var(--panel-border)' }}>
        <div style={{ padding: '24px', width: '300px' }}>
          <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Settings size={20} /> AI Config
          </h2>
          
          <AIConfigEditor config={config} setConfig={setConfig} />
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '16px 24px', background: 'var(--panel-bg)', borderBottom: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {!isDocked && (
              <button onClick={() => setShowSettings(!showSettings)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <Settings size={20} />
              </button>
            )}
            <h1 style={{ fontSize: '18px', margin: 0 }}>whatchadoin AI</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginLeft: '12px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: appState ? '#4ade80' : '#f87171' }}></div>
              {appState ? 'Connected' : 'Waiting...'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => changeDock('right')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Dock to Right">
              <PanelRight size={18} />
            </button>
            <button onClick={() => changeDock('bottom')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Dock to Bottom">
              <PanelBottom size={18} />
            </button>
            <button onClick={() => changeDock('popped_out')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Pop Out into Window">
              <ExternalLink size={18} />
            </button>
            <button onClick={() => changeDock('closed')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: '12px' }} title="Close">
              <X size={18} />
            </button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.filter(m => m.role !== 'system').map((msg, i) => (
            <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
              {msg.role === 'tool' ? (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '8px' }}>
                  ⚙️ Tool executed: {msg.content}
                </div>
              ) : msg.role === 'assistant' && msg.tool_calls ? (
                <div style={{ fontSize: '12px', color: '#60a5fa', padding: '8px', background: 'rgba(96, 165, 250, 0.1)', borderRadius: '4px' }}>
                  Working: {msg.tool_calls.map((tc: any) => tc.function.name).join(', ')}...
                </div>
              ) : (
                <div style={{ padding: '12px 16px', background: msg.role === 'user' ? 'var(--accent)' : 'var(--panel-bg)', color: msg.role === 'user' ? '#000' : '#fff', borderRadius: '12px', border: msg.role === 'user' ? 'none' : '1px solid var(--panel-border)' }}>
                  {msg.content}
                </div>
              )}
            </div>
          ))}
          {isLoading && <div style={{ alignSelf: 'flex-start', padding: '12px', color: 'var(--text-secondary)' }}>Agent is thinking...</div>}
        </div>

        <div style={{ padding: '24px', borderTop: '1px solid var(--panel-border)', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', gap: '12px', maxWidth: '800px', margin: '0 auto' }}>
            <input name="auto_field_2" 
              type="text" 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="E.g. Switch to the calendar view, or add a new routine goal..."
              style={{ flex: 1, padding: '12px 16px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', color: '#fff', borderRadius: '8px', fontSize: '15px' }}
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !appState}
              style={{ padding: '0 20px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', cursor: (isLoading || !appState) ? 'not-allowed' : 'pointer', opacity: (isLoading || !appState) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
            >
              <Send size={18} /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
