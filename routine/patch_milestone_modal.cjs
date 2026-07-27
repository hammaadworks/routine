const fs = require('fs');
let content = fs.readFileSync('src/components/RoutinePane.jsx', 'utf8');

const milestoneModal = `
      {/* Add Milestone Modal */}
      {showMilestoneModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowMilestoneModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '460px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 style={{ color: '#fff', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px' }}>
                  <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '8px', borderRadius: '8px' }}>
                    <Plus size={20} color="#a855f7" /> 
                  </div>
                  Add Milestone
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Mark an important event or deadline on your calendar.
                </p>
              </div>
              <button onClick={() => setShowMilestoneModal(false)} className="icon-btn" style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}><X size={16} /></button>
            </div>
            
            <form onSubmit={saveMilestone} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
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
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowMilestoneModal(false)} className="secondary" style={{ padding: '10px 20px' }}>Cancel</button>
                <button type="submit" className="primary" style={{ padding: '10px 20px' }}>Save Milestone</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
`;

content = content.replace('{/* Confirm Modal */}', milestoneModal + '\n      {/* Confirm Modal */}');
fs.writeFileSync('src/components/RoutinePane.jsx', content);
console.log("Successfully injected modal");
