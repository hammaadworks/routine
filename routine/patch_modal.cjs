const fs = require('fs');
let content = fs.readFileSync('src/components/RoutinePane.jsx', 'utf8');

// Add states
content = content.replace(
  'const [confirmConfig, setConfirmConfig] = useState(null);',
  `const [confirmConfig, setConfirmConfig] = useState(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ date: '', title: '', desc: '' });`
);

// Add save function
content = content.replace(
  'const [activeBlockIdx, setActiveBlockIdx] = useState(null);',
  `const [activeBlockIdx, setActiveBlockIdx] = useState(null);
  
  const saveMilestone = (e) => {
    e.preventDefault();
    if (!milestoneForm.date || !milestoneForm.title) return;
    
    const dateStr = milestoneForm.date;
    const title = milestoneForm.title.trim();
    const desc = milestoneForm.desc.trim();
    
    let newBlock = \`**\${title}**\`;
    if (desc) newBlock += \`\\n\${desc}\`;
    
    const current = (activeVersion.milestones || {})[dateStr] || '';
    const updated = current ? current + '\\n\\n' + newBlock : newBlock;
    
    updateActiveVersion({
      ...activeVersion,
      milestones: {
        ...(activeVersion.milestones || {}),
        [dateStr]: updated
      }
    });
    
    setShowMilestoneModal(false);
    setMilestoneForm({ date: '', title: '', desc: '' });
    setCalendarSubTab('milestones');
    if (setSelectedTargetDate) setSelectedTargetDate(dateStr);
  };`
);

fs.writeFileSync('src/components/RoutinePane.jsx', content);
