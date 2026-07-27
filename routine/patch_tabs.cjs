const fs = require('fs');
let content = fs.readFileSync('src/components/RoutinePane.jsx', 'utf8');

const oldTabs = `{isCalendarTab && (
          <div className="tabs" style={{ marginBottom: '16px', borderBottom: '1px solid var(--panel-border)', background: 'transparent' }}>
            <button 
              className={\`tab \${calendarSubTab === 'mark_goals' ? 'active' : ''}\`} 
              onClick={() => setCalendarSubTab('mark_goals')}
            >
              Mark Goals
            </button>
            <button 
              className={\`tab \${calendarSubTab === 'milestones' ? 'active' : ''}\`} 
              onClick={() => setCalendarSubTab('milestones')}
            >
              Milestones
            </button>
          </div>
        )}`;

const newTabs = `{isCalendarTab && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--panel-border)' }}>
            <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none', background: 'transparent' }}>
              <button 
                className={\`tab \${calendarSubTab === 'mark_goals' ? 'active' : ''}\`} 
                onClick={() => setCalendarSubTab('mark_goals')}
              >
                Mark Goals
              </button>
              <button 
                className={\`tab \${calendarSubTab === 'milestones' ? 'active' : ''}\`} 
                onClick={() => setCalendarSubTab('milestones')}
              >
                Milestones
              </button>
            </div>
            <button 
              className="secondary" 
              onClick={() => setShowMilestoneModal(true)} 
              style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
            >
              <Plus size={14} /> Add Milestone
            </button>
          </div>
        )}`;

if (content.includes(oldTabs)) {
  content = content.replace(oldTabs, newTabs);
  fs.writeFileSync('src/components/RoutinePane.jsx', content);
  console.log("Successfully replaced tabs");
} else {
  console.log("Could not find old tabs");
}
