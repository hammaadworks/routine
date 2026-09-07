import { CalendarDays, Plus, Pencil, Copy, Trash2 } from 'lucide-react';
import Dropdown from './Dropdown';

export default function MyDayMaker({
  templates,
  activeTemplateId,
  setActiveTemplateId,
  activeTemplate,
  dayMapping,
  setDayMapping,
  days,
  handleNewClick,
  setIsEditingTemplateName,
  setEditingTemplateName,
  duplicateTemplate,
  deleteTemplate
}) {
  return (
    <div className="myday-maker-header" style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--panel-bg)', minWidth: 0 }}>
      
      {/* Top Row: Template Selection & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', minWidth: 0 }}>
        <div style={{ flex: '1 1 150px', minWidth: 0 }}>
          <Dropdown 
            value={activeTemplateId}
            onChange={setActiveTemplateId}
            options={templates.map(t => ({ value: t.id, label: t.name }))}
            placeholder="Select Schedule..."
          />
        </div>
        
        <div className="th-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
          <button className="secondary action-btn" onClick={() => { setEditingTemplateName(activeTemplate?.name || ''); setIsEditingTemplateName(true); }} disabled={!activeTemplateId} title="Rename" style={{ flex: 1, minWidth: '36px', padding: '8px', justifyContent: 'center' }}>
            <Pencil size={14} /> <span className="mobile-hidden" style={{ marginLeft: '6px' }}>Rename</span>
          </button>
          <button className="secondary action-btn" onClick={handleNewClick} title="New" style={{ flex: 1, minWidth: '36px', padding: '8px', justifyContent: 'center' }}>
            <Plus size={14} /> <span className="mobile-hidden" style={{ marginLeft: '6px' }}>New</span>
          </button>
          <button className="secondary action-btn" onClick={duplicateTemplate} disabled={!activeTemplateId} title="Duplicate" style={{ flex: 1, minWidth: '36px', padding: '8px', justifyContent: 'center' }}>
            <Copy size={14} /> <span className="mobile-hidden" style={{ marginLeft: '6px' }}>Duplicate</span>
          </button>
          <button className="secondary template-delete-btn action-btn" onClick={deleteTemplate} disabled={!activeTemplateId} title="Delete" style={{ flex: 1, minWidth: '36px', padding: '8px', justifyContent: 'center' }}>
            <Trash2 size={14} /> <span className="mobile-hidden" style={{ marginLeft: '6px' }}>Delete</span>
          </button>
        </div>
      </div>
      
      {/* Bottom Row: Active On Days */}
      {activeTemplate && (
        <div className="th-active-on" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.15)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <CalendarDays size={14} color="var(--accent)" />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontWeight: '500' }}>Active on:</span>
          </div>
          <div className="day-btn-container" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            {days.map(day => {
              const isActive = dayMapping[day] === activeTemplateId;
              const assignedTemplateId = dayMapping[day];
              const isAssignedToOther = assignedTemplateId && assignedTemplateId !== activeTemplateId;
              const assignedTemplate = isAssignedToOther ? templates.find(t => t.id === assignedTemplateId) : null;
              
              return (
                <button
                  key={day}
                  onClick={() => setDayMapping({...dayMapping, [day]: isActive ? '' : activeTemplateId})}
                  className={`day-btn ${isActive ? 'active' : ''} ${isAssignedToOther ? 'assigned-other' : ''}`}
                  title={isActive ? day : assignedTemplate ? `${day} (Assigned to ${assignedTemplate.name})` : day}
                  style={{ 
                    borderRadius: '6px', 
                    padding: '4px 10px', 
                    fontSize: '12px', 
                    fontWeight: isActive ? 'bold' : '500',
                    border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
                    background: isActive ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255,255,255,0.05)',
                    color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flex: '1 1 auto',
                    textAlign: 'center'
                  }}
                >
                  {day.substring(0, 3)}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
}
