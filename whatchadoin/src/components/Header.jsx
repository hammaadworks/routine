import React from 'react';
import { Command, Bot, Settings, ChevronDown } from 'lucide-react';

export default function Header({
  activeRoutine,
  setRoutineModalView,
  setShowRoutineModal,
  setAiDockState,
  setShowSettingsModal
}) {
  return (
    <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '16px', flexShrink: 0 }}>
      {/* Left: Identity */}
      <h1 className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, flex: 1 }}>
        <div style={{ background: 'var(--accent)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
          <Command size={20} color="#000" />
        </div>
        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>whatchadoin</span>
      </h1>

      {/* Center: Context (Routine Selector) */}
      <div className="header-center-panel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, gap: '12px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>
          {formatHeaderDate(activeRoutine.start) || '...'}
        </span>

        <div className="routine-selector">
          <button 
            onClick={() => {
              setRoutineModalView('list');
              setShowRoutineModal(true);
            }} 
            className="icon-btn" 
            style={{ width: '100%', padding: '8px 16px', background: 'var(--bg)', border: '1px solid var(--panel-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#fff', fontSize: '14px', justifyContent: 'space-between' }} 
            title="Switch or Manage Routines"
          >
            <span>{activeRoutine?.name || 'Select Routine'}</span> <ChevronDown size={16} color="var(--text-secondary)" />
          </button>
        </div>

        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>
          {formatHeaderDate(activeRoutine.end) || '...'}
        </span>
      </div>

      {/* Right: Global Actions */}
      <div className="header-controls" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flex: 1 }}>
        <button className="icon-btn" style={{ padding: '8px', background: 'var(--accent)', border: '1px solid var(--panel-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setAiDockState(prev => prev === 'closed' ? 'right' : 'closed')} title="AI Agent">
          <Bot size={16} color="#000" /> <span className="mobile-hidden" style={{ fontSize: '13px', fontWeight: '600', color: '#000' }}>AI Agent</span>
        </button>
        
        <button className="icon-btn" style={{ padding: '8px', background: 'var(--bg)', border: '1px solid var(--panel-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowSettingsModal(true)} title="Settings">
          <Settings size={18} color="var(--text-secondary)" />
        </button>
      </div>
    </header>
  );
}

function formatHeaderDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear().toString().slice(-2);
  const day = d.getDate();
  
  const suffix = (day === 1 || day === 21 || day === 31) ? 'st' :
                 (day === 2 || day === 22) ? 'nd' :
                 (day === 3 || day === 23) ? 'rd' : 'th';
                 
  return `${day}${suffix} ${month}'${year}`;
}
