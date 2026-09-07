import React from 'react';
import { Command, Bot, Settings, ChevronDown } from 'lucide-react';
import RoutineSelector from './RoutineSelector';

export default function Header({
  activeRoutine,
  setRoutineModalView,
  setShowRoutineModal,
  setAiDockState,
  setShowSettingsModal
}) {
  return (
    <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '16px', flexShrink: 0, flexWrap: 'wrap', gap: '12px' }}>
      {/* Left: Identity */}
      <h1 className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, flex: 1, minWidth: 0 }}>
        <div style={{ background: 'var(--accent)', padding: '6px', borderRadius: '8px', display: 'flex', flexShrink: 0 }}>
          <Command size={20} color="#000" />
        </div>
        <span style={{ fontSize: '20px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>whatchadoin</span>
      </h1>

      {/* Center: Context (Routine Selector) */}
      <RoutineSelector 
        activeRoutine={activeRoutine}
        setRoutineModalView={setRoutineModalView}
        setShowRoutineModal={setShowRoutineModal}
      />

      {/* Right: Global Actions */}
      <div className="header-controls" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flex: 1, minWidth: 0 }}>
        <button className="icon-btn" style={{ padding: '8px', background: 'var(--accent)', border: '1px solid var(--panel-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} onClick={() => setAiDockState(prev => prev === 'closed' ? 'right' : 'closed')} title="AI Agent">
          <Bot size={16} color="#000" /> <span className="mobile-hidden" style={{ fontSize: '13px', fontWeight: '600', color: '#000' }}>AI Agent</span>
        </button>
        
        <button className="icon-btn" style={{ padding: '8px', background: 'var(--bg)', border: '1px solid var(--panel-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => setShowSettingsModal(true)} title="Settings">
          <Settings size={18} color="var(--text-secondary)" />
        </button>
      </div>
    </header>
  );
}


