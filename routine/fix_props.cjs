const fs = require('fs');
let content = fs.readFileSync('src/components/RoutinePane.jsx', 'utf8');

// Fix the props
content = content.replace(
  /effectiveDate, dailyLogs, toggleDailyGoal, dayMapping,/,
  'selectedTargetDate, dailyLogs, toggleDailyGoal, dayMapping,'
);

// Fix the definition of effectiveDate
content = content.replace(
  /const effectiveDate = \(isCalendarTab && !effectiveDate\) \? getTodayStr\(\) : effectiveDate;/,
  'const effectiveDate = (isCalendarTab && !selectedTargetDate) ? getTodayStr() : selectedTargetDate;'
);

// Fix setSelectedTargetDate calls (sed might have changed it to seteffectiveDate if I used case-insensitive, but I didn't)
// Wait, I used 'selectedTargetDate', so 'setSelectedTargetDate' became 'seteffectiveDate' ? No, 'setSelectedTargetDate' -> 'seteffectiveDate'
content = content.replace(/seteffectiveDate/g, 'setSelectedTargetDate');

fs.writeFileSync('src/components/RoutinePane.jsx', content);
