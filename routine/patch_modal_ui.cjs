const fs = require('fs');
let content = fs.readFileSync('src/components/RoutinePane.jsx', 'utf8');

const mentionMenuJSX = `
                {showMentionMenu && activeModalField === FIELD_NAME && filteredGoals.length > 0 && (
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
                          insertModalMention(g, FIELD_NAME);
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
`;

const oldFormInputs = `              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</label>
                  <input 
                    type="date" value={milestoneForm.date}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, date: e.target.value })} required
                    style={{ width: '100%', fontSize: '14px', padding: '12px 14px', colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Milestone Title</label>
                  <input 
                    type="text" placeholder="e.g. Go live @inmasjid" value={milestoneForm.title}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} required
                    style={{ width: '100%', fontSize: '14px', padding: '12px 14px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description (Optional)</label>
                  <textarea 
                    placeholder="Any extra details..." value={milestoneForm.desc}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, desc: e.target.value })}
                    style={{ width: '100%', fontSize: '14px', padding: '12px 14px', minHeight: '60px', resize: 'vertical' }}
                  />
                </div>
              </div>`;

const newFormInputs = `              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</label>
                  <input 
                    type="date" value={milestoneForm.date}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, date: e.target.value })} required
                    onKeyDown={(e) => e.preventDefault()} onClick={(e) => e.target.showPicker()}
                    style={{ width: '100%', fontSize: '14px', padding: '12px 14px', colorScheme: 'dark', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Milestone Title</label>
                  <input 
                    type="text" placeholder="e.g. Go live @inmasjid" value={milestoneForm.title}
                    ref={el => modalInputRefs.current['title'] = el}
                    onChange={(e) => handleModalInput(e, 'title')}
                    onKeyDown={(e) => handleModalKeyDown(e, 'title')} required
                    style={{ width: '100%', fontSize: '14px', padding: '12px 14px' }}
                  />
${mentionMenuJSX.replace(/FIELD_NAME/g, "'title'")}
                </div>
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description (Optional)</label>
                  <textarea 
                    placeholder="Any extra details..." value={milestoneForm.desc}
                    ref={el => modalInputRefs.current['desc'] = el}
                    onChange={(e) => handleModalInput(e, 'desc')}
                    onKeyDown={(e) => handleModalKeyDown(e, 'desc')}
                    style={{ width: '100%', fontSize: '14px', padding: '12px 14px', minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }}
                  />
${mentionMenuJSX.replace(/FIELD_NAME/g, "'desc'")}
                </div>
              </div>`;

if (content.includes(oldFormInputs)) {
  content = content.replace(oldFormInputs, newFormInputs);
  fs.writeFileSync('src/components/RoutinePane.jsx', content);
  console.log("Successfully replaced modal form inputs");
} else {
  console.log("Could not find old form inputs");
}
