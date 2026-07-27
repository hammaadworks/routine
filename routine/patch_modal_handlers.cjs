const fs = require('fs');
let content = fs.readFileSync('src/components/RoutinePane.jsx', 'utf8');

const replacementStr = `  const handleModalInput = (e, field) => {
    const val = e.target.value;
    setMilestoneForm(prev => ({ ...prev, [field]: val }));
    
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const lastWord = textBefore.split(/\\s/).pop();
    
    if (lastWord.startsWith('@')) {
      const q = lastWord.slice(1).toLowerCase();
      setMentionQuery(q);
      setShowMentionMenu(true);
      setActiveModalField(field);
      setMentionIndex(0);
      
      const getCaretCoordinates = require('textarea-caret');
      const coords = getCaretCoordinates(e.target, cursor);
      const rect = e.target.getBoundingClientRect();
      const containerRect = e.target.parentElement.getBoundingClientRect();
      
      setMentionCoords({
        top: coords.top + 24 + (rect.top - containerRect.top),
        left: coords.left
      });
    } else {
      setShowMentionMenu(false);
      setActiveModalField(null);
    }
  };

  const insertModalMention = (goal, field) => {
    const val = milestoneForm[field];
    const el = modalInputRefs.current[field];
    if (!el) return;
    
    const cursor = el.selectionStart;
    const textBefore = val.slice(0, cursor);
    const textAfter = val.slice(cursor);
    const words = textBefore.split(/\\s/);
    words.pop();
    
    const goalText = (goal.task || goal.text).replace(/\\s+/g, '-');
    const newBefore = words.join(' ') + (words.length > 0 ? ' ' : '') + '@' + goalText + ' ';
    const newVal = newBefore + textAfter;
    
    setMilestoneForm(prev => ({ ...prev, [field]: newVal }));
    setShowMentionMenu(false);
    setActiveModalField(null);
    
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(newBefore.length, newBefore.length);
    }, 0);
  };

  const handleModalKeyDown = (e, field) => {
    if (showMentionMenu && activeModalField === field) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(i => Math.min(i + 1, filteredGoals.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredGoals[mentionIndex]) {
          insertModalMention(filteredGoals[mentionIndex], field);
        }
      } else if (e.key === 'Escape') {
        setShowMentionMenu(false);
        setActiveModalField(null);
      }
    }
  };

  const saveMilestone = (e) => {`;

if (content.includes("const saveMilestone = (e) => {")) {
  content = content.replace("const saveMilestone = (e) => {", replacementStr);
  fs.writeFileSync('src/components/RoutinePane.jsx', content);
  console.log("Successfully added modal handlers");
} else {
  console.log("Could not find saveMilestone");
}
