import React, { useState, useEffect, useRef } from 'react';
import { sendToProvider } from '../utils/aiProviders';
import { Settings, Send, PanelRight, PanelBottom, ExternalLink, X } from 'lucide-react';

const TOOLS = [
// ... keeping tools as is ...
  {
    type: "function",
    function: {
      name: "navigate_app",
      description: "Changes the active views/tabs in the main application UI.",
      parameters: {
        type: "object",
        properties: {
          centerTab: { type: "string", enum: ["timeline", "calendar", "plans"] },
          leftTab: { type: "string", enum: ["routine", "life"] }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_routine_goal",
      description: "Adds a new routine goal for the current active routine.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the goal" },
          status: { type: "string", enum: ["not_started", "in_progress", "completed"] },
          type: { type: "string", enum: ["task", "milestone", "habit"] }
        },
        required: ["title", "status", "type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_life_goal",
      description: "Adds a new life goal to the Life tab.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["not_started", "in_progress", "completed"] }
        },
        required: ["title"]
      }
    }
  }
];

export default function AIAgentApp({ isDocked = false }) {
  const [appState, setAppState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef(null);
  const pendingResolvers = useRef({}); 

  const changeDock = (position) => {
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
    return saved ? JSON.parse(saved) : {
      provider: 'openai',
      apiKey: '',
      model: 'gpt-4o',
      customEndpoint: ''
    };
  });
  const [showSettings, setShowSettings] = useState(!isDocked);

  useEffect(() => {
    localStorage.setItem('whatchadoin_ai_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    const handleConfigUpdate = (e) => {
      setConfig(e.detail);
    };
    window.addEventListener('ai_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('ai_config_updated', handleConfigUpdate);
  }, []);

  useEffect(() => {
    const bc = new BroadcastChannel('whatchadoin_ai_channel');
    channelRef.current = bc;
    
    bc.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'STATE_UPDATE') {
        setAppState(data.payload);
      } else if (data.type === 'TOOL_RESULT') {
        const { callId, status, error } = data;
        if (pendingResolvers.current[callId]) {
          pendingResolvers.current[callId]({ status, error });
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
    if (!config.apiKey) {
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
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const processLLMLoop = async (currentMsgs) => {
    const response = await sendToProvider(currentMsgs, appState, TOOLS, config);
    
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

        channelRef.current.postMessage({
          type: 'TOOL_EXECUTION',
          tool: toolName,
          args,
          callId
        });

        // Wait for result from main tab
        const result = await resultPromise;
        const contentStr = result.status === 'success' ? 'Action executed successfully.' : `Error: ${result.error}`;
        
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
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Provider</label>
              <select 
                value={config.provider} 
                onChange={e => setConfig({...config, provider: e.target.value})}
                style={{ width: '100%', padding: '8px', background: 'var(--bg)', border: '1px solid var(--panel-border)', color: '#fff', borderRadius: '4px' }}
              >
                <option value="openai">OpenAI</option>
                <option value="groq">Groq</option>
                <option value="gemini">Gemini</option>
                <option value="custom">Custom (OpenAI Compatible)</option>
              </select>
            </div>
            
            {config.provider === 'custom' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Custom Endpoint URL</label>
                <input 
                  type="text" 
                  value={config.customEndpoint} 
                  onChange={e => setConfig({...config, customEndpoint: e.target.value})}
                  placeholder="https://your-api.com/v1/chat/completions"
                  style={{ width: '100%', padding: '8px', background: 'var(--bg)', border: '1px solid var(--panel-border)', color: '#fff', borderRadius: '4px' }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Model</label>
              <input 
                type="text" 
                value={config.model} 
                onChange={e => setConfig({...config, model: e.target.value})}
                placeholder="gpt-4o"
                style={{ width: '100%', padding: '8px', background: 'var(--bg)', border: '1px solid var(--panel-border)', color: '#fff', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>API Key</label>
              <input 
                type="password" 
                value={config.apiKey} 
                onChange={e => setConfig({...config, apiKey: e.target.value})}
                style={{ width: '100%', padding: '8px', background: 'var(--bg)', border: '1px solid var(--panel-border)', color: '#fff', borderRadius: '4px' }}
              />
            </div>
          </div>
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
                  Working: {msg.tool_calls.map(tc => tc.function.name).join(', ')}...
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
            <input 
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
