const fs = require('fs');
let content = fs.readFileSync('src/components/RoutinePane.jsx', 'utf8');

const targetStr = `                    const isPast = blockDate < todayDate;
                    const nodeColor = isPast ? '#a855f7' : 'var(--accent)';
                    
                    return (
                      <div key={dateStr} id={\`milestone-block-\${dateStr}\`} style={{ position: 'relative', marginBottom: '40px', paddingLeft: '24px' }}>
                        <div style={{ position: 'absolute', left: '-7px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', background: nodeColor, border: '2px solid var(--panel-bg)', boxShadow: isActiveDate ? \`0 0 10px \${nodeColor}80\` : 'none', opacity: isActiveDate ? 1 : 0.6 }} />`;

const replacementStr = `                    const isPast = blockDate < todayDate;
                    let nodeColor = isPast ? '#a855f7' : 'var(--accent)';
                    let multiColors = [];
                    const tagsMatch = contentStr.match(/@([^\\s*]+)/g);
                    if (tagsMatch) {
                      const uniqueTags = [...new Set(tagsMatch.map(t => t.slice(1).toLowerCase()))];
                      uniqueTags.forEach(tag => {
                        const goal = allGoals.find(g => (g.task || g.text || '').toLowerCase() === tag);
                        if (goal && goal.color) {
                          multiColors.push(goal.color);
                        }
                      });
                    }
                    
                    let backgroundStyle = nodeColor;
                    if (multiColors.length > 1) {
                      const sliceSize = 100 / multiColors.length;
                      let gradientStops = [];
                      multiColors.forEach((color, i) => {
                        gradientStops.push(\`\${color} \${i * sliceSize}% \${(i + 1) * sliceSize}%\`);
                      });
                      backgroundStyle = \`conic-gradient(\${gradientStops.join(', ')})\`;
                    } else if (multiColors.length === 1) {
                      backgroundStyle = multiColors[0];
                      nodeColor = multiColors[0];
                    }
                    
                    return (
                      <div key={dateStr} id={\`milestone-block-\${dateStr}\`} style={{ position: 'relative', marginBottom: '40px', paddingLeft: '24px' }}>
                        <div style={{ position: 'absolute', left: '-7px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', background: backgroundStyle, border: '2px solid var(--panel-bg)', boxShadow: isActiveDate ? \`0 0 10px \${nodeColor}80\` : 'none', opacity: isActiveDate ? 1 : 0.6 }} />`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync('src/components/RoutinePane.jsx', content);
  console.log("Successfully patched timeline dot colors");
} else {
  console.log("Could not find timeline dot code");
}
