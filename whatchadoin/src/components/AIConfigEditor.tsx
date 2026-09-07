import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export interface AIProfile {
  id: string;
  name: string;
  provider: string;
  model: string;
  apiKey: string;
  customEndpoint?: string;
}

export interface AIConfig {
  activeProfileId: string;
  profiles: AIProfile[];
}

interface AIConfigEditorProps {
  config: AIConfig;
  setConfig: (config: AIConfig) => void;
}

export default function AIConfigEditor({ config, setConfig }: AIConfigEditorProps) {
  const activeProfile = config.profiles.find(p => p.id === config.activeProfileId) || config.profiles[0];

  const updateActiveProfile = (updates: Partial<AIProfile>) => {
    const newProfiles = config.profiles.map(p => 
      p.id === activeProfile.id ? { ...p, ...updates } : p
    );
    setConfig({ ...config, profiles: newProfiles });
  };

  const addProfile = () => {
    const newId = 'profile-' + Date.now();
    const newProfile: AIProfile = {
      id: newId,
      name: 'New Profile',
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: '',
      customEndpoint: ''
    };
    setConfig({
      activeProfileId: newId,
      profiles: [...config.profiles, newProfile]
    });
  };

  const deleteProfile = (id: string) => {
    if (config.profiles.length === 1) {
      alert("You must have at least one profile.");
      return;
    }
    const newProfiles = config.profiles.filter(p => p.id !== id);
    let newActiveId = config.activeProfileId;
    if (newActiveId === id) {
      newActiveId = newProfiles[0].id;
    }
    setConfig({
      activeProfileId: newActiveId,
      profiles: newProfiles
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Active Profile</label>
          <select 
            value={config.activeProfileId} 
            onChange={e => setConfig({...config, activeProfileId: e.target.value})}
            style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--panel-border)', color: '#fff', borderRadius: '6px' }}
          >
            {config.profiles.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '4px', marginTop: '24px' }}>
          <button type="button" onClick={addProfile} className="icon-btn" style={{ padding: '10px', background: 'var(--bg)', border: '1px solid var(--panel-border)', borderRadius: '6px' }} title="Add Profile">
            <Plus size={16} />
          </button>
          <button type="button" onClick={() => deleteProfile(activeProfile.id)} className="icon-btn" style={{ padding: '10px', background: 'var(--bg)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: 'var(--danger)' }} title="Delete Profile">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Profile Name</label>
          <input 
            type="text" 
            value={activeProfile.name} 
            onChange={e => updateActiveProfile({ name: e.target.value })}
            placeholder="e.g., Work OpenAI"
            style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--panel-border)', color: '#fff', borderRadius: '6px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Provider</label>
          <select 
            value={activeProfile.provider} 
            onChange={e => updateActiveProfile({ provider: e.target.value })}
            style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--panel-border)', color: '#fff', borderRadius: '6px' }}
          >
            <option value="openai">OpenAI</option>
            <option value="groq">Groq</option>
            <option value="gemini">Gemini</option>
            <option value="custom">Custom (OpenAI Compatible)</option>
          </select>
        </div>
        
        {activeProfile.provider === 'custom' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Custom Endpoint URL</label>
            <input 
              type="text" 
              value={activeProfile.customEndpoint || ''} 
              onChange={e => updateActiveProfile({ customEndpoint: e.target.value })}
              placeholder="https://your-api.com/v1/chat/completions"
              style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--panel-border)', color: '#fff', borderRadius: '6px' }}
            />
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Model</label>
          <input 
            type="text" 
            value={activeProfile.model} 
            onChange={e => updateActiveProfile({ model: e.target.value })}
            placeholder="gpt-4o"
            style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--panel-border)', color: '#fff', borderRadius: '6px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>API Key</label>
          <input 
            type="password" 
            value={activeProfile.apiKey} 
            onChange={e => updateActiveProfile({ apiKey: e.target.value })}
            style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--panel-border)', color: '#fff', borderRadius: '6px' }}
          />
        </div>
      </div>
    </div>
  );
}

