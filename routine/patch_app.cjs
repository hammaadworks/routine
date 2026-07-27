const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// Add calendarSubTab state
content = content.replace(
  "const [activeCenterTab, setActiveCenterTab] = useState('calendar');",
  "const [activeCenterTab, setActiveCenterTab] = useState('calendar');\n  const [calendarSubTab, setCalendarSubTab] = useState('mark_goals');"
);

// Pass to TargetPane (which is CalendarPane)
content = content.replace(
  "<TargetPane \n                activeVersion={activeVersion}",
  "<TargetPane \n                activeVersion={activeVersion}\n                setCalendarSubTab={setCalendarSubTab}"
);

// Pass to RoutinePane
content = content.replace(
  "isCalendarTab={activeCenterTab === 'target'}\n          activeVersion={activeVersion}",
  "isCalendarTab={activeCenterTab === 'target'}\n          activeVersion={activeVersion}\n          calendarSubTab={calendarSubTab}\n          setCalendarSubTab={setCalendarSubTab}"
);

fs.writeFileSync('src/App.jsx', content, 'utf8');
