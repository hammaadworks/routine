import React from 'react';
import { ChevronDown } from 'lucide-react';

function formatHeaderDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear().toString().slice(-2);
  const day = d.getDate();
  
  return `${day}-${month}'${year}`;
}

export default function RoutineSelector({ activeRoutine, setRoutineModalView, setShowRoutineModal }) {
  return (
    <div className="header-center-panel" style={{ minWidth: 0, padding: '0 4px' }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
        alignItems: 'center', 
        background: 'rgba(0,0,0,0.3)', 
        border: '1px solid var(--panel-border)', 
        borderRadius: '24px', 
        padding: '4px',
        width: '100%',
        maxWidth: '400px',
        margin: '0 auto',
        minWidth: 0
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'center', minWidth: 0, padding: '0 8px' }}>
          <span style={{ fontSize: '11px', color: activeRoutine?.start ? '#fff' : 'var(--text-secondary)', fontWeight: '700', whiteSpace: 'nowrap', opacity: activeRoutine?.start ? 1 : 0.6, letterSpacing: '0.5px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {formatHeaderDate(activeRoutine?.start) || 'START'}
          </span>
        </div>

        <button 
          onClick={() => {
            setRoutineModalView('list');
            setShowRoutineModal(true);
          }} 
          style={{ 
            padding: '6px 16px', 
            background: 'rgba(234, 179, 8, 0.1)', 
            border: '1px solid var(--accent)', 
            borderRadius: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '8px', 
            fontWeight: 'bold', 
            color: 'var(--accent)', 
            fontSize: '13px', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)', 
            cursor: 'pointer', 
            transition: 'all 0.2s', 
            minWidth: 0,
            maxWidth: '100%'
          }} 
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(234, 179, 8, 0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(234, 179, 8, 0.1)'; }}
          title="Switch or Manage Routines"
        >
          <div style={{ width: 14, flexShrink: 0 }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeRoutine?.name || 'Select Routine'}
          </span> 
          <ChevronDown size={14} color="inherit" style={{ flexShrink: 0 }} />
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', minWidth: 0, padding: '0 8px' }}>
          <span style={{ fontSize: '11px', color: activeRoutine?.end ? '#fff' : 'var(--text-secondary)', fontWeight: '700', whiteSpace: 'nowrap', opacity: activeRoutine?.end ? 1 : 0.6, letterSpacing: '0.5px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {formatHeaderDate(activeRoutine?.end) || 'END'}
          </span>
        </div>
        
      </div>
    </div>
  );
}
