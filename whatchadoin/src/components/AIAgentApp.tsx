import {useEffect, useRef, useState} from 'react';
import {sendToProvider} from '../utils/aiProviders';
import {ExternalLink, PanelBottom, PanelRight, Send, Settings, X} from 'lucide-react';
import AIConfigEditor from './AIConfigEditor';
import {AI_TOOL_DEFINITIONS as TOOLS} from '../features/ai/toolDefinitions';

export default function AIAgentApp({isDocked = false}: { isDocked?: boolean }) {
    const [appState, setAppState] = useState<any>(null);
    const appStateRef = useRef<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const channelRef = useRef<BroadcastChannel | null>(null);
    const pendingResolvers = useRef<Record<string, (value: any) => void>>({});

    const changeDock = (position: string) => {
        if (channelRef.current) {
            channelRef.current.postMessage({type: 'DOCK_COMMAND', payload: position});
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
                    activeProfileId: 'default', profiles: [{
                        id: 'default',
                        name: 'Default Profile',
                        provider: parsed.provider || 'openai',
                        model: parsed.model || 'gpt-4o',
                        apiKey: parsed.apiKey || '',
                        customEndpoint: parsed.customEndpoint || ''
                    }]
                };
            } catch {
            }
        }
        return {
            activeProfileId: 'default', profiles: [{
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
                const {callId, status, error, message, result} = data;
                if (pendingResolvers.current[callId]) {
                    pendingResolvers.current[callId]({status, error, message: message || result?.message, result});
                    delete pendingResolvers.current[callId];
                }
            }
        };

        // Request initial state
        bc.postMessage({type: 'PING'});

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
                window.dispatchEvent(new CustomEvent('open_global_settings', {detail: 'ai'}));
            }
            return;
        }

        const newUserMsg = {role: 'user', content: input};
        const currentMsgs = [...messages, newUserMsg];
        setMessages(currentMsgs);
        setInput('');
        setIsLoading(true);

        try {
            await processLLMLoop(currentMsgs);
        } catch (err: any) {
            setMessages(prev => [...prev, {role: 'assistant', content: `Error: ${err.message}`}]);
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
                    type: 'TOOL_EXECUTION', tool: toolName, args, callId
                });

                // Wait for result from main tab
                const result = await resultPromise as any;
                let contentStr = '';
                if (result.status === 'success') {
                    if (result.result !== undefined) {
                        contentStr = typeof result.result === 'object' ? JSON.stringify(result.result) : String(result.result);
                    } else if (result.message) {
                        contentStr = result.message;
                    } else {
                        contentStr = 'Action executed successfully.';
                    }
                } else {
                    contentStr = `Error: ${result.error}`;
                }

                toolResultsMsgs.push({
                    role: 'tool', tool_call_id: callId, content: contentStr
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

    return (<div
        style={{display: 'flex', height: '100vh', background: 'var(--bg)', color: '#fff', fontFamily: 'system-ui'}}>
        {/* Sidebar Settings */}
        <div style={{
            width: showSettings ? '300px' : '0',
            transition: 'width 0.3s',
            overflow: 'hidden',
            background: 'var(--panel-bg)',
            borderRight: '1px solid var(--panel-border)'
        }}>
            <div style={{padding: '24px', width: '300px'}}>
                <h2 style={{
                    fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px'
                }}>
                    <Settings size={20}/> AI Config
                </h2>

                <AIConfigEditor config={config} setConfig={setConfig}/>
            </div>
        </div>

        {/* Main Chat Area */}
        <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <header style={{
                padding: '16px 24px',
                background: 'var(--panel-bg)',
                borderBottom: '1px solid var(--panel-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    {!isDocked && (<button onClick={() => setShowSettings(!showSettings)} style={{
                        background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer'
                    }}>
                        <Settings size={20}/>
                    </button>)}
                    <h1 style={{fontSize: '18px', margin: 0}}>whatchadoin AI</h1>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginLeft: '12px'
                    }}>
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%', background: appState ? '#4ade80' : '#f87171'
                        }}></div>
                        {appState ? 'Connected' : 'Waiting...'}
                    </div>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <button onClick={() => changeDock('right')} style={{
                        background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer'
                    }} title="Dock to Right">
                        <PanelRight size={18}/>
                    </button>
                    <button onClick={() => changeDock('bottom')} style={{
                        background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer'
                    }} title="Dock to Bottom">
                        <PanelBottom size={18}/>
                    </button>
                    <button onClick={() => changeDock('popped_out')} style={{
                        background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer'
                    }} title="Pop Out into Window">
                        <ExternalLink size={18}/>
                    </button>
                    <button onClick={() => changeDock('closed')} style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        marginLeft: '12px'
                    }} title="Close">
                        <X size={18}/>
                    </button>
                </div>
            </header>

            <div style={{
                flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px'
            }}>
                {messages.filter(m => m.role !== 'system').map((msg, i) => (<div key={i} style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '70%'
                }}>
                    {msg.role === 'tool' ? (<div style={{
                        fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '8px'
                    }}>
                        ⚙️ Tool executed: {msg.content}
                    </div>) : msg.role === 'assistant' && msg.tool_calls ? (<div style={{
                        fontSize: '12px',
                        color: '#60a5fa',
                        padding: '8px',
                        background: 'rgba(96, 165, 250, 0.1)',
                        borderRadius: '4px'
                    }}>
                        Working: {msg.tool_calls.map((tc: any) => tc.function.name).join(', ')}...
                    </div>) : (<div style={{
                        padding: '12px 16px',
                        background: msg.role === 'user' ? 'var(--accent)' : 'var(--panel-bg)',
                        color: msg.role === 'user' ? '#000' : '#fff',
                        borderRadius: '12px',
                        border: msg.role === 'user' ? 'none' : '1px solid var(--panel-border)'
                    }}>
                        {msg.content}
                    </div>)}
                </div>))}
                {isLoading &&
                    <div style={{alignSelf: 'flex-start', padding: '12px', color: 'var(--text-secondary)'}}>Agent is
                        thinking...</div>}
            </div>

            <div style={{padding: '24px', borderTop: '1px solid var(--panel-border)', background: 'var(--bg)'}}>
                <div style={{display: 'flex', gap: '12px', maxWidth: '800px', margin: '0 auto'}}>
                    <input name="auto_field_2"
                           type="text"
                           value={input}
                           onChange={e => setInput(e.target.value)}
                           onKeyDown={e => e.key === 'Enter' && handleSend()}
                           placeholder="E.g. Switch to the calendar view, or add a new routine goal..."
                           style={{
                               flex: 1,
                               padding: '12px 16px',
                               background: 'var(--panel-bg)',
                               border: '1px solid var(--panel-border)',
                               color: '#fff',
                               borderRadius: '8px',
                               fontSize: '15px'
                           }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !appState}
                        style={{
                            padding: '0 20px',
                            background: 'var(--accent)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: (isLoading || !appState) ? 'not-allowed' : 'pointer',
                            opacity: (isLoading || !appState) ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 'bold'
                        }}
                    >
                        <Send size={18}/> Send
                    </button>
                </div>
            </div>
        </div>
    </div>);
}
