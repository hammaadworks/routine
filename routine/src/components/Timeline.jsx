import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Plus, Pencil, Copy, Trash2, ZoomIn, ZoomOut, X, Clock } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import Dropdown from './Dropdown';

import { parseDuration } from '../utils';

const formatTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = (minutes % 60).toString().padStart(2, '0');
  const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${ampm}`;
};

const formatTime24 = (minutes) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const parseTime = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const hexToRgb = (hex) => {
  if (!hex) return '234, 179, 8';
  const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
  return `${r}, ${g}, ${b}`;
};

function getLayout(blocks) {
  if (!blocks || blocks.length === 0) return [];
  
  const sorted = [...blocks].sort((a, b) => a.startTime - b.startTime || b.duration - a.duration);
  const groups = [];
  let currentGroup = [];
  let currentGroupEnd = 0;

  sorted.forEach(block => {
    if (currentGroup.length === 0) {
      currentGroup.push(block);
      currentGroupEnd = block.startTime + block.duration;
    } else if (block.startTime < currentGroupEnd) {
      currentGroup.push(block);
      currentGroupEnd = Math.max(currentGroupEnd, block.startTime + block.duration);
    } else {
      groups.push(currentGroup);
      currentGroup = [block];
      currentGroupEnd = block.startTime + block.duration;
    }
  });
  if (currentGroup.length > 0) groups.push(currentGroup);

  const laidOutBlocks = [];
  groups.forEach(group => {
    const columns = [];
    group.forEach(block => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const lastBlock = col[col.length - 1];
        if (lastBlock.startTime + lastBlock.duration <= block.startTime) {
          col.push(block);
          block.colIndex = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        block.colIndex = columns.length;
        columns.push([block]);
      }
    });

    const numCols = columns.length;
    group.forEach(block => {
      block.width = 100 / numCols;
      block.left = block.colIndex * block.width;
      laidOutBlocks.push(block);
    });
  });

  return laidOutBlocks;
}

export default function Timeline({ templates, setTemplates, activeTemplateId, setActiveTemplateId, dayMapping, setDayMapping }) {
  const [newTemplateName, setNewTemplateName] = useState('');
  // Inline editing for blocks now, no block modal needed
  const [dragHoverMins, setDragHoverMins] = useState(null);
  const [isEditingTemplateName, setIsEditingTemplateName] = useState(false);
  const [editingTemplateName, setEditingTemplateName] = useState('');
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);
  
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentTimeMins, setCurrentTimeMins] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTimeMins(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const activeTemplate = templates.find(t => t.id === activeTemplateId);
  const laidOutBlocks = activeTemplate ? getLayout(activeTemplate.blocks) : [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const addTemplate = (e) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    const newId = Date.now().toString();
    setTemplates([...templates, { id: newId, name: newTemplateName, blocks: [] }]);
    setActiveTemplateId(newId);
    setNewTemplateName('');
  };

  const saveTemplateName = (e) => {
    e.preventDefault();
    if (!editingTemplateName.trim()) {
      setIsEditingTemplateName(false);
      return;
    }
    setTemplates(templates.map(t => t.id === activeTemplateId ? { ...t, name: editingTemplateName } : t));
    setIsEditingTemplateName(false);
  };

  const duplicateTemplate = () => {
    if (!activeTemplate) return;
    const newId = Date.now().toString();
    setTemplates([...templates, { ...activeTemplate, id: newId, name: `${activeTemplate.name} (Copy)` }]);
    setActiveTemplateId(newId);
  };

  const deleteTemplate = () => {
    setConfirmConfig({
      title: 'Delete Template',
      message: `do you wanna delete ${activeTemplate?.name}?`,
      isDanger: true,
      onConfirm: () => {
        const newTemplates = templates.filter(t => t.id !== activeTemplateId);
        
        let finalTemplates;
        let newActiveId;

        if (newTemplates.length === 0) {
          newActiveId = Date.now().toString();
          finalTemplates = [{ id: newActiveId, name: 'Vanilla Routine', blocks: [] }];
        } else {
          finalTemplates = newTemplates;
          newActiveId = newTemplates[0].id;
        }

        setTemplates(finalTemplates);
        setActiveTemplateId(newActiveId);
        
        // Remove references in dayMapping
        const updatedMapping = { ...dayMapping };
        let mappingChanged = false;
        Object.keys(updatedMapping).forEach(day => {
          if (updatedMapping[day] === activeTemplateId) {
            updatedMapping[day] = newTemplates.length === 0 ? newActiveId : '';
            mappingChanged = true;
          }
        });
        if (mappingChanged) {
          setDayMapping(updatedMapping);
        }
        setConfirmConfig(null);
      },
      onCancel: () => setConfirmConfig(null)
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragHoverMins(null);
    if (!activeTemplateId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // Snap to 15 mins (15px * zoomLevel)
    let startMinutes = Math.floor(y / (15 * zoomLevel)) * 15;
    if (startMinutes < 0) startMinutes = 0;
    if (startMinutes > 1440 - 15) startMinutes = 1440 - 15;

    const source = e.dataTransfer.getData('source');
    
    let updatedTemplates = [...templates];
    let targetTemplate = updatedTemplates.find(t => t.id === activeTemplateId);

    if (source === 'sidebar') {
      const task = e.dataTransfer.getData('task');
      const timeStr = e.dataTransfer.getData('time');
      const color = e.dataTransfer.getData('color');
      const routineGoalId = e.dataTransfer.getData('routineGoalId');
      const duration = parseDuration(timeStr);

      targetTemplate.blocks.push({
        id: Date.now().toString(),
        name: task,
        startTime: startMinutes,
        duration: duration,
        color: color,
        routineGoalId: routineGoalId
      });
    } else if (source === 'timeline') {
      const blockId = e.dataTransfer.getData('blockId');
      const block = targetTemplate.blocks.find(b => b.id === blockId);
      if (block) {
        block.startTime = startMinutes;
      }
    }

    setTemplates(updatedTemplates);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let startMinutes = Math.floor(y / (15 * zoomLevel)) * 15;
    if (startMinutes < 0) startMinutes = 0;
    if (startMinutes > 1440 - 15) startMinutes = 1440 - 15;
    setDragHoverMins(startMinutes);
  };

  const handleDragLeave = () => {
    setDragHoverMins(null);
  };


  const deleteBlock = (id) => {
    let updatedTemplates = templates.map(t => {
      if (t.id === activeTemplateId) {
        return { ...t, blocks: t.blocks.filter(b => b.id !== id) };
      }
      return t;
    });
    setTemplates(updatedTemplates);
  };

  return (
    <div className="timeline-area" style={{ position: 'relative' }}>
      <div className="timeline-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="timeline-header-bar">
          {/* 1. Dropdown */}
          <div className="th-dropdown">
            <Dropdown 
              value={activeTemplateId}
              onChange={setActiveTemplateId}
              options={templates.map(t => ({ value: t.id, label: t.name }))}
              placeholder="Select Template..."
            />
          </div>

          {/* 2. Active on */}
          {activeTemplate && (
            <div className="th-active-on">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarDays size={14} color="var(--text-secondary)" />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Active on:</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
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
                    >
                      {day[0]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          
          {/* 3. Actions */}
          <div className="th-actions">
            <button className="secondary action-btn" onClick={() => setShowNewTemplateModal(true)}>
              <Plus size={12} /> New
            </button>
            <button className="secondary action-btn" onClick={() => { setEditingTemplateName(activeTemplate?.name || ''); setIsEditingTemplateName(true); }} disabled={!activeTemplateId}>
              <Pencil size={12} /> Rename
            </button>
            <button className="secondary action-btn" onClick={duplicateTemplate} disabled={!activeTemplateId}>
              <Copy size={12} /> Duplicate
            </button>
          </div>

          {/* 4. Delete Button */}
          <div className="th-delete">
            <button className="secondary template-delete-btn" onClick={deleteTemplate} disabled={!activeTemplateId}>
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="timeline-scroll">
        <div 
          className="timeline-grid" 
          onDrop={handleDrop} 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{ '--zoom': zoomLevel }}
        >
          {/* Hours Grid */}
          {Array.from({ length: 24 }).map((_, i) => {
            const isNoon = i === 12;
            const displayTime = i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`;
            return (
              <div key={i} className="time-slot">
                <div className="time-label" style={{ fontWeight: isNoon ? 'bold' : 'normal', color: isNoon ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {displayTime}
                </div>
                {isNoon && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', backgroundImage: 'linear-gradient(to right, var(--accent) 30%, transparent 30%)', backgroundSize: '15px 1px', backgroundRepeat: 'repeat-x', boxShadow: '0 0 10px rgba(234, 179, 8, 0.5)', zIndex: 1 }} />
                )}
                {(i === 3 || i === 21) && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', backgroundImage: 'linear-gradient(to right, #a855f7 30%, transparent 30%)', backgroundSize: '15px 1px', backgroundRepeat: 'repeat-x', boxShadow: '0 0 10px rgba(168, 85, 247, 0.5)', zIndex: 1 }} />
                )}
                {/* Subtle 30m grid line */}
                <div style={{ position: 'absolute', top: `${30 * zoomLevel}px`, left: 0, right: 0, borderBottom: '1px dotted rgba(255,255,255,0.03)' }} />
              </div>
            );
          })}

          {/* Current Time Indicator */}
          <div 
            style={{ 
              position: 'absolute', 
              top: `${currentTimeMins * zoomLevel}px`, 
              left: '-60px', 
              right: 0, 
              borderBottom: '2px solid var(--accent)', 
              boxShadow: '0 0 10px rgba(234, 179, 8, 0.5)', 
              zIndex: 15,
              pointerEvents: 'none'
            }} 
          >
            <div style={{
              position: 'absolute',
              left: 0,
              top: '-4px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 10px rgba(234, 179, 8, 0.8)'
            }} />
          </div>

          {/* Hover Phantom Indicator */}
          {dragHoverMins !== null && (
            <div 
              style={{
                position: 'absolute',
                top: `${dragHoverMins * zoomLevel}px`,
                left: '10px', right: '20px',
                height: `${30 * zoomLevel}px`,
                background: 'rgba(234, 179, 8, 0.1)',
                border: '2px dashed var(--accent)',
                borderRadius: '6px',
                zIndex: 20,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px'
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent)' }}>Drop to schedule at {formatTime(dragHoverMins)}</span>
            </div>
          )}

          {/* Overlapping GCal-style Blocks */}
          {laidOutBlocks.map(block => {
            const hex = block.color || '#eab308';
            return (
              <div 
                key={block.id} 
                className="time-block"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('source', 'timeline');
                  e.dataTransfer.setData('blockId', block.id);
                }}
                style={{
                  top: `${block.startTime * zoomLevel}px`,
                  height: `${block.duration * zoomLevel}px`,
                  left: `calc(10px + ${block.left}% * 0.9)`, // 0.9 scaling leaves room for right margin
                  width: `calc(${block.width}% * 0.9 - 4px)`,
                  backgroundColor: `rgba(${hexToRgb(hex)}, 0.15)`,
                  borderLeftColor: hex,
                  borderLeftWidth: '4px',
                  borderLeftStyle: 'solid',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  position: 'absolute',
                  padding: '8px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div className="time-block-title" style={{ color: hex, fontWeight: '600', fontSize: '13px', marginBottom: '2px', paddingRight: '16px' }}>{block.name}</div>
                <div className="time-block-meta" style={{ color: `rgba(${hexToRgb(hex)}, 0.8)`, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock 
                    size={10} 
                    color="#fff" 
                    style={{ cursor: 'pointer' }} 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.currentTarget.nextElementSibling.showPicker();
                    }}
                  />
                  <input 
                    type="time" 
                    value={formatTime24(block.startTime)}
                    onChange={(e) => {
                      const newMins = parseTime(e.target.value);
                      if (newMins !== null && !isNaN(newMins)) {
                        let updatedTemplates = templates.map(t => {
                          if (t.id === activeTemplateId) {
                            return { ...t, blocks: t.blocks.map(b => b.id === block.id ? { ...b, startTime: newMins } : b) };
                          }
                          return t;
                        });
                        setTemplates(updatedTemplates);
                      }
                    }}
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      color: 'inherit', 
                      fontSize: 'inherit',
                      fontFamily: 'inherit',
                      padding: 0,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span>- {formatTime(block.startTime + block.duration)}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBlock(block.id);
                  }}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: 'transparent',
                    border: 'none',
                    color: hex,
                    cursor: 'pointer',
                    opacity: 0.6,
                    padding: '2px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Zoom Controls */}
      <div style={{ 
        position: 'absolute', 
        bottom: '24px', 
        right: '24px', 
        display: 'flex', 
        alignItems: 'center',
        background: 'var(--panel-bg)', 
        border: '1px solid var(--panel-border)', 
        borderRadius: '24px', 
        padding: '4px', 
        gap: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        zIndex: 100 
      }}>
        <button 
          onClick={handleZoomOut} 
          title="Zoom Out"
          style={{ 
            background: 'transparent', 
            border: 'none', 
            borderRadius: '50%', 
            padding: '6px', 
            color: 'var(--text-secondary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <ZoomOut size={16} />
        </button>
        
        <div style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '12px', 
          fontWeight: 'bold',
          textAlign: 'center',
          minWidth: '40px',
          pointerEvents: 'none',
          userSelect: 'none'
        }}>
          {Math.round(zoomLevel * 100)}%
        </div>

        <button 
          onClick={handleZoomIn} 
          title="Zoom In"
          style={{ 
            background: 'transparent', 
            border: 'none', 
            borderRadius: '50%', 
            padding: '6px', 
            color: 'var(--text-secondary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <ZoomIn size={16} />
        </button>


      </div>

      {/* Rename Modal */}
      {isEditingTemplateName && createPortal(
        <div className="modal-overlay" onClick={() => setIsEditingTemplateName(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '16px', color: '#fff' }}>Rename Template</h3>
            <form onSubmit={saveTemplateName}>
              <input type="text" value={editingTemplateName} onChange={e => setEditingTemplateName(e.target.value)} autoFocus style={{ width: '100%', marginBottom: '16px' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ flex: 1, color: '#000' }}>Save</button>
                <button type="button" className="secondary" onClick={() => setIsEditingTemplateName(false)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* New Template Modal */}
      {showNewTemplateModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowNewTemplateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '16px', color: '#fff' }}>New Template</h3>
            <form onSubmit={(e) => { addTemplate(e); setShowNewTemplateModal(false); }}>
              <input type="text" placeholder="Template Name" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} autoFocus style={{ width: '100%', marginBottom: '16px' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ flex: 1, color: '#000' }}>Create</button>
                <button type="button" className="secondary" onClick={() => setShowNewTemplateModal(false)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      {/* Confirm Modal */}
      {confirmConfig && (
        <ConfirmModal 
          title={confirmConfig.title}
          message={confirmConfig.message}
          isDanger={confirmConfig.isDanger}
          onConfirm={confirmConfig.onConfirm}
          onCancel={confirmConfig.onCancel}
        />
      )}
    </div>
  );
}
