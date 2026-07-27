const fs = require('fs');

let content = fs.readFileSync('src/components/RoutinePane.jsx', 'utf8');

// 1. Update activeBlockIdx state (no change needed to declaration, it just holds object)
// 2. update getMilestonesContent & updateMilestonesContent
content = content.replace(
  /const getMilestonesContent = \(\) => {\n\s*return activeVersion\.milestones\?\.\[selectedTargetDate\] \|\| '';\n\s*};\n\s*const updateMilestonesContent = \(content\) => {\n\s*updateActiveVersion\(\{ milestones: \{ \.\.\.\(activeVersion\.milestones \|\| \{\}\), \[selectedTargetDate\]: content \} \}\);\n\s*};/m,
  `const getMilestonesContent = (dateStr) => {
    return activeVersion.milestones?.[dateStr || selectedTargetDate] || '';
  };
  const updateMilestonesContent = (dateStr, content) => {
    updateActiveVersion({ milestones: { ...(activeVersion.milestones || {}), [dateStr]: content } });
  };`
);

// 3. update handleKeyDown signature and body
content = content.replace(
  /const handleKeyDown = \(e, idx\) => {/,
  `const handleKeyDown = (e, dateStr, idx) => {`
);
content = content.replace(
  /insertMention\(filteredGoals\[mentionIndex\], idx\);/g,
  `insertMention(filteredGoals[mentionIndex], dateStr, idx);`
);
content = content.replace(
  /const blocks = getMilestonesContent\(\)\.split\('\\n\\n'\);/g,
  `const blocks = getMilestonesContent(dateStr).split('\\n\\n');`
);
content = content.replace(
  /updateMilestonesContent\(newBlocks\.join\('\\n\\n'\)\);/g,
  `updateMilestonesContent(dateStr, newBlocks.join('\\n\\n'));`
);
content = content.replace(
  /setActiveBlockIdx\(idx \+ 1\);/g,
  `setActiveBlockIdx({ dateStr, idx: idx + 1 });`
);
content = content.replace(
  /setActiveBlockIdx\(idx - 1\);/g,
  `setActiveBlockIdx({ dateStr, idx: idx - 1 });`
);
content = content.replace(
  /textareaRefs\.current\[idx/g,
  `textareaRefs.current[\`\${dateStr}-\${idx}\`]`
);
content = content.replace(
  /textareaRefs\.current\[idx - 1\]/g,
  `textareaRefs.current[\`\${dateStr}-\${idx - 1}\`]`
);

// 4. update handleInput
content = content.replace(
  /const handleInput = \(e, idx\) => {/,
  `const handleInput = (e, dateStr, idx) => {`
);

// 5. update insertMention
content = content.replace(
  /const insertMention = \(goal, idx\) => {/,
  `const insertMention = (goal, dateStr, idx) => {`
);

// 6. fix useEffect for focus
content = content.replace(
  /useEffect\(\(\) => {\n\s*if \(activeBlockIdx !== null && textareaRefs\.current\[activeBlockIdx\]\) {\n\s*const ref = textareaRefs\.current\[activeBlockIdx\];\n\s*ref\.focus\(\);\n\s*ref\.style\.height = 'auto';\n\s*ref\.style\.height = \(ref\.scrollHeight\) \+ 'px';\n\s*}\n\s*}\, \[activeBlockIdx\]\);/m,
  `useEffect(() => {
    if (activeBlockIdx !== null) {
      const refKey = \`\${activeBlockIdx.dateStr}-\${activeBlockIdx.idx}\`;
      if (textareaRefs.current[refKey]) {
        const ref = textareaRefs.current[refKey];
        ref.focus();
        ref.style.height = 'auto';
        ref.style.height = (ref.scrollHeight) + 'px';
      }
    }
  }, [activeBlockIdx]);`
);

// 7. add scroll-into-view useEffect and timeline dates logic
content = content.replace(
  /  \/\/ Parse markdown to render colored tags/m,
  `  const milestoneDates = Object.keys(activeVersion.milestones || {}).filter(d => (activeVersion.milestones[d] || '').trim() !== '');
  if (selectedTargetDate && !milestoneDates.includes(selectedTargetDate)) {
    milestoneDates.push(selectedTargetDate);
  }
  milestoneDates.sort((a, b) => new Date(a) - new Date(b));

  useEffect(() => {
    if (isCalendarTab && calendarSubTab === 'milestones' && selectedTargetDate) {
      setTimeout(() => {
        const el = document.getElementById(\`milestone-block-\${selectedTargetDate}\`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [selectedTargetDate, isCalendarTab, calendarSubTab]);

  // Parse markdown to render colored tags`
);

// 8. Replace the milestone render block
const renderMilestoneOld = `          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflowY: 'auto' }}>
            {!selectedTargetDate ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Select a date in the calendar to write milestones.
              </div>
            ) : (
              <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', position: 'relative' }}>
                {(getMilestonesContent() || '').split('\\n\\n').map((block, idx) => {
                  const isActive = activeBlockIdx === idx;
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => setActiveBlockIdx(idx)}
                      style={{ 
                        minHeight: '28px', 
                        cursor: isActive ? 'text' : 'pointer',
                        padding: '4px 0',
                        marginBottom: '8px'
                      }}
                    >
                      {isActive ? (
                        <textarea
                          ref={el => textareaRefs.current[idx] = el}
                          value={block}
                          onChange={e => handleInput(e, idx)}
                          onKeyDown={e => handleKeyDown(e, idx)}
                          onBlur={() => setActiveBlockIdx(null)}
                          placeholder={idx === 0 && !block ? "Write your milestones for this day... (Use @ to tag goals)" : ""}
                          style={{
                            width: '100%', resize: 'none', background: 'transparent', 
                            border: 'none', color: 'var(--text-primary)', padding: 0,
                            fontSize: '14px', lineHeight: '1.6', outline: 'none', boxShadow: 'none',
                            fontFamily: 'inherit', overflow: 'hidden'
                          }}
                        />
                      ) : (
                        <div className="markdown-preview" style={{ minHeight: '24px' }}>
                          <ReactMarkdown components={customMarkdownComponents}>
                            {block === '' ? '\\u00A0' : block}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div 
                  style={{ height: '30vh', cursor: 'text' }} 
                  onClick={() => {
                    const contentStr = getMilestonesContent();
                    const blocks = (contentStr || '').split('\\n\\n');
                    if (blocks[blocks.length - 1] !== '') {
                      updateMilestonesContent(contentStr + '\\n\\n');
                    }
                    setActiveBlockIdx(blocks.length);
                  }}
                />
                
                {showMentionMenu && filteredGoals.length > 0 && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: mentionCoords.top + 'px',
                      left: mentionCoords.left + 'px', 
                      background: 'var(--bg)',
                      border: '1px solid var(--panel-border)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      zIndex: 100,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      minWidth: '250px'
                    }}
                  >
                    {filteredGoals.map((g, i) => (
                      <div 
                        key={g.id}
                        onMouseDown={(e) => {
                          e.preventDefault(); 
                          insertMention(g, activeBlockIdx);
                        }}
                        onMouseEnter={() => setMentionIndex(i)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          background: i === mentionIndex ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                          display: 'flex', flexDirection: 'column'
                        }}
                      >
                        <span style={{ fontSize: '13px', color: '#fff', fontWeight: i === mentionIndex ? 'bold' : 'normal' }}>
                          {g.task || g.text}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '2px' }}>
                          {g.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>`;

const renderMilestoneNew = `          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflowY: 'auto', padding: '24px' }}>
            {milestoneDates.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Select a date in the calendar to write milestones.
              </div>
            ) : (
              <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', position: 'relative' }}>
                <div style={{ borderLeft: '2px solid var(--panel-border)', marginLeft: '12px', paddingBottom: '24px' }}>
                  {milestoneDates.map((dateStr) => {
                    const contentStr = getMilestonesContent(dateStr);
                    const blocks = (contentStr || '').split('\\n\\n');
                    const isActiveDate = selectedTargetDate === dateStr;
                    
                    return (
                      <div key={dateStr} id={\`milestone-block-\${dateStr}\`} style={{ position: 'relative', marginBottom: '40px', paddingLeft: '24px' }}>
                        <div style={{ position: 'absolute', left: '-7px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', background: isActiveDate ? 'var(--accent)' : 'var(--panel-border)', border: '2px solid var(--panel-bg)' }} />
                        <div 
                          onClick={() => {
                            if (setSelectedTargetDate) setSelectedTargetDate(dateStr);
                          }}
                          style={{ fontSize: '16px', fontWeight: 'bold', color: isActiveDate ? '#fff' : 'var(--text-secondary)', marginBottom: '16px', cursor: 'pointer', display: 'inline-block' }}
                        >
                          {new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        
                        {blocks.map((block, idx) => {
                          const isActive = activeBlockIdx && activeBlockIdx.dateStr === dateStr && activeBlockIdx.idx === idx;
                          return (
                            <div 
                              key={idx} 
                              onClick={() => setActiveBlockIdx({ dateStr, idx })}
                              style={{ 
                                minHeight: '28px', 
                                cursor: isActive ? 'text' : 'pointer',
                                padding: '4px 0',
                                marginBottom: '8px'
                              }}
                            >
                              {isActive ? (
                                <textarea
                                  ref={el => textareaRefs.current[\`\${dateStr}-\${idx}\`] = el}
                                  value={block}
                                  onChange={e => handleInput(e, dateStr, idx)}
                                  onKeyDown={e => handleKeyDown(e, dateStr, idx)}
                                  onBlur={() => setActiveBlockIdx(null)}
                                  placeholder={idx === 0 && !block ? "Write your milestones for this day... (Use @ to tag goals)" : ""}
                                  style={{
                                    width: '100%', resize: 'none', background: 'transparent', 
                                    border: 'none', color: 'var(--text-primary)', padding: 0,
                                    fontSize: '14px', lineHeight: '1.6', outline: 'none', boxShadow: 'none',
                                    fontFamily: 'inherit', overflow: 'hidden'
                                  }}
                                />
                              ) : (
                                <div className="markdown-preview" style={{ minHeight: '24px' }}>
                                  <ReactMarkdown components={customMarkdownComponents}>
                                    {block === '' ? '\\u00A0' : block}
                                  </ReactMarkdown>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        <div 
                          style={{ height: '24px', cursor: 'text' }} 
                          onClick={() => {
                            if (blocks[blocks.length - 1] !== '') {
                              updateMilestonesContent(dateStr, contentStr + '\\n\\n');
                            }
                            setActiveBlockIdx({ dateStr, idx: blocks.length });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                
                <div style={{ height: '20vh' }} />

                {showMentionMenu && filteredGoals.length > 0 && activeBlockIdx && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: mentionCoords.top + 'px',
                      left: mentionCoords.left + 'px', 
                      background: 'var(--bg)',
                      border: '1px solid var(--panel-border)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      zIndex: 100,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      minWidth: '250px'
                    }}
                  >
                    {filteredGoals.map((g, i) => (
                      <div 
                        key={g.id}
                        onMouseDown={(e) => {
                          e.preventDefault(); 
                          insertMention(g, activeBlockIdx.dateStr, activeBlockIdx.idx);
                        }}
                        onMouseEnter={() => setMentionIndex(i)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          background: i === mentionIndex ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                          display: 'flex', flexDirection: 'column'
                        }}
                      >
                        <span style={{ fontSize: '13px', color: '#fff', fontWeight: i === mentionIndex ? 'bold' : 'normal' }}>
                          {g.task || g.text}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '2px' }}>
                          {g.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>`;

content = content.replace(renderMilestoneOld, renderMilestoneNew);
fs.writeFileSync('src/components/RoutinePane.jsx', content);
