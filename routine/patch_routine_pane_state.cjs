const fs = require('fs');

let content = fs.readFileSync('src/components/RoutinePane.jsx', 'utf8');

// Update props
content = content.replace(
    "isCalendarTab, activeVersion, updateActiveVersion\n})",
    "isCalendarTab, activeVersion, updateActiveVersion, calendarSubTab, setCalendarSubTab\n})"
);

// Remove local state
content = content.replace(
    "  const [calendarSubTab, setCalendarSubTab] = useState('mark_goals');\n",
    ""
);

fs.writeFileSync('src/components/RoutinePane.jsx', content, 'utf8');
