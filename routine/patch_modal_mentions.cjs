const fs = require('fs');
let content = fs.readFileSync('src/components/RoutinePane.jsx', 'utf8');

// We need a ref for modal inputs
content = content.replace(
  'const textareaRefs = useRef({});',
  `const textareaRefs = useRef({});
  const modalInputRefs = useRef({});`
);

// We need to add state for tracking which modal field has active mention
content = content.replace(
  'const [mentionIndex, setMentionIndex] = useState(0);',
  `const [mentionIndex, setMentionIndex] = useState(0);
  const [activeModalField, setActiveModalField] = useState(null);`
);

const modalMentionFunctions = `
  const handleModalInput = (e, field) => {
    const val = e.target.value;
    setMilestoneForm(prev => ({ ...prev, [field]: val }));
    
    if (field === 'desc') {
      e.target.style.height = 'auto';
      e.target.style.height = (e.target.scrollHeight) + 'px';
    }
    
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    
    const match = textBeforeCursor.match(/(?:^|\\s)@([^\\s]*)$/);
    if (match) {
      const query = match[1];
      setMentionQuery(query);
      setShowMentionMenu(true);
      setMentionIndex(0);
      setActiveModalField(field);
      
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

  const handleModalKeyDown = (e, field) => {
    if (showMentionMenu && activeModalField === field) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredGoals.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredGoals.length) % filteredGoals.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredGoals.length > 0) {
          insertModalMention(filteredGoals[mentionIndex], field);
        }
      } else if (e.key === 'Escape') {
        setShowMentionMenu(false);
      }
    }
  };

  const insertModalMention = (goal, field) => {
    const goalText = goal.task || goal.text;
    const ref = modalInputRefs.current[field];
    const cursor = ref.selectionStart;
    
    const val = milestoneForm[field];
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/(?:^|\\s)@([^\\s]*)$/);
    
    if (match) {
      const startIdx = cursor - match[1].length - 1;
      const newText = val.slice(0, startIdx) + \`@\${goalText} \` + val.slice(cursor);
      
      setMilestoneForm(prev => ({ ...prev, [field]: newText }));
      
      setTimeout(() => {
        if (modalInputRefs.current[field]) {
          const newCursorPos = startIdx + goalText.length + 2;
          modalInputRefs.current[field].selectionStart = modalInputRefs.current[field].selectionEnd = newCursorPos;
          modalInputRefs.current[field].focus();
        }
      }, 0);
    }
    setShowMentionMenu(false);
    setActiveModalField(null);
  };
`;

content = content.replace(
  'const insertMention = (goal, idx) => {',
  modalMentionFunctions + '\n  const insertMention = (goal, idx) => {'
);

fs.writeFileSync('src/components/RoutinePane.jsx', content);
