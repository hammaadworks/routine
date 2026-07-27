const fs = require('fs');
let content = fs.readFileSync('src/components/RoutinePane.jsx', 'utf8');

const targetStr = `        {isCalendarTab && calendarSubTab === 'milestones' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflowY: 'auto' }}>
            {milestoneDates.length === 0 ? (`;

const replacementStr = `        {isCalendarTab && calendarSubTab === 'milestones' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflowY: 'auto' }}>
            <button 
              onClick={() => setShowMilestoneModal(true)} className="secondary" 
              style={{ width: '100%', marginBottom: '16px', display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px', borderStyle: 'dashed', flexShrink: 0 }}
            >
              <Plus size={16} /> Add Milestone
            </button>
            {milestoneDates.length === 0 ? (`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync('src/components/RoutinePane.jsx', content);
  console.log("Successfully added dashed button");
} else {
  console.log("Could not find insertion point");
}
