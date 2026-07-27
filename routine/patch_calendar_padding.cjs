const fs = require('fs');
let content = fs.readFileSync('src/components/CalendarPane.jsx', 'utf8');

content = content.replace(
  "padding: '12px 8px',",
  "padding: '8px 4px',"
);

fs.writeFileSync('src/components/CalendarPane.jsx', content);
