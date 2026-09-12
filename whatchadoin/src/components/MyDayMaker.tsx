// @ts-nocheck
import { useState } from 'react';
import { CalendarDays, ChevronDown, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import Dropdown from './Dropdown';
import BaseModal from './BaseModal';

export interface Template {
    id: string;
    name: string;
    [key: string]: any;
}

export interface MyDayMakerProps {
    templates: Template[];
    activeTemplateId: string;
    setActiveTemplateId: (id: any) => void;
    activeTemplate?: Template | null;
    dayMapping: Record<string, string>;
    setDayMapping: (mapping: Record<string, string>) => void;
    days: string[];
    handleNewClick: () => void;
    setIsEditingTemplateName: (isEditing: boolean) => void;
    setEditingTemplateName: (name: string) => void;
    duplicateTemplate: () => void;
    deleteTemplate: () => void;
}


import type { Template } from './MyDay';

export interface MyDayMakerProps {
    templates: Template[];
    activeTemplateId: string;
    setActiveTemplateId: (id: any) => void;
    activeTemplate?: Template | null;
    dayMapping: Record<string, string>;
    setDayMapping: (mapping: Record<string, string>) => void;
    days: string[];
    handleNewClick: () => void;
    setIsEditingTemplateName: (isEditing: boolean) => void;
    setEditingTemplateName: (name: string) => void;
    duplicateTemplate: () => void;
    deleteTemplate: () => void;
}

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
                                   }: MyDayMakerProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const activeDaysArray = days.filter(d => dayMapping[d] === activeTemplateId);

    let activeDaysStr = 'Not scheduled';
    if (activeDaysArray.length > 0) {
        const hasMon = activeDaysArray.includes('Monday');
        const hasTue = activeDaysArray.includes('Tuesday');
        const hasWed = activeDaysArray.includes('Wednesday');
        const hasThu = activeDaysArray.includes('Thursday');
        const hasFri = activeDaysArray.includes('Friday');
        const hasSat = activeDaysArray.includes('Saturday');
        const hasSun = activeDaysArray.includes('Sunday');

        const hasAllWeekdays = hasMon && hasTue && hasWed && hasThu && hasFri;
        const hasBothWeekends = hasSat && hasSun;

        if (activeDaysArray.length === 7) activeDaysStr = 'Everyday'; else if (hasAllWeekdays && hasSat && !hasSun) activeDaysStr = 'Weekdays & Saturday'; else if (hasAllWeekdays && !hasSat && !hasSun) activeDaysStr = 'Weekdays'; else if (hasBothWeekends && !hasMon && !hasTue && !hasWed && !hasThu && !hasFri) activeDaysStr = 'Weekends'; else if (hasBothWeekends && hasMon && !hasTue && !hasWed && !hasThu && !hasFri) activeDaysStr = 'Monday & Weekends'; else activeDaysStr = activeDaysArray.map(d => d.substring(0, 3)).join(', ');
    }

    return (<>
            {/* Minimal Sticky Header */}
            <div
                className="myday-maker-sticky"
                style={{
                    position: 'relative',
                    zIndex: 50,
                    background: 'rgba(20, 20, 20, 0.8)',
                    backdropFilter: 'blur(8px)',
                    borderBottom: '1px solid var(--panel-border)',
                    padding: '8px 16px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                }}
                onClick={() => setIsModalOpen(true)}
            >
                <div className="myday-maker-badge">
          <div className="myday-maker-top-row">
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Template:</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {activeTemplate?.name || 'Select'}
              <ChevronDown size={14} />
            </span>
          </div>
          <div className="myday-maker-divider" />
          <span className="myday-maker-days" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>
            {activeDaysStr}
          </span>
        </div>
            </div>

            {/* Configuration Modal */}
            <BaseModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Manage Schedules"
            >
                <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>

                    {/* Template Selection */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '13px',
                            color: 'var(--text-secondary)'
                        }}>Current Template</label>
                        <Dropdown
                            value={activeTemplateId}
                            onChange={setActiveTemplateId}
                            options={templates.map((t: Template) => ({value: t.id, label: t.name}))}
                            placeholder="Select Schedule..."
                        />
                    </div>

                    {/* Active On Days */}
                    {activeTemplate && (<div className="th-active-on" style={{
                            background: 'rgba(0,0,0,0.15)',
                            padding: '12px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px'}}>
                                <CalendarDays size={16} color="var(--accent)"/>
                                <span style={{fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600'}}>Active on:</span>
                            </div>
                            <div className="day-btn-container"
                                 style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px'}}>
                                {days.map(day => {
                                    const isActive = dayMapping[day] === activeTemplateId;
                                    const assignedTemplateId = dayMapping[day];
                                    const isAssignedToOther = assignedTemplateId && assignedTemplateId !== activeTemplateId;
                                    const assignedTemplate = isAssignedToOther ? templates.find((t: Template) => t.id === assignedTemplateId) : null;

                                    return (<button
                                            key={day}
                                            onClick={() => setDayMapping({
                                                ...dayMapping,
                                                [day]: isActive ? '' : activeTemplateId
                                            })}
                                            className={`day-btn ${isActive ? 'active' : ''} ${isAssignedToOther ? 'assigned-other' : ''}`}
                                            title={isActive ? day : assignedTemplate ? `${day} (Assigned to ${assignedTemplate.name})` : day}
                                            style={{
                                                borderRadius: '6px',
                                                padding: '6px 2px',
                                                fontSize: '12px',
                                                fontWeight: isActive ? 'bold' : '500',
                                                border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
                                                background: isActive ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255,255,255,0.05)',
                                                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                textAlign: 'center'
                                            }}
                                        >
                                            {day.substring(0, 3)}
                                        </button>)
                                })}
                            </div>
                            <div style={{
                                marginTop: '8px',
                                fontSize: '11px',
                                color: 'var(--text-secondary)',
                                textAlign: 'center'
                            }}>
                                Click a day to assign this template to it.
                            </div>
                        </div>)}

                    {/* Actions */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '13px',
                            color: 'var(--text-secondary)'
                        }}>Actions</label>
                        <div className="th-actions"
                             style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                            <button className="secondary action-btn" onClick={() => {
                                setIsModalOpen(false);
                                setEditingTemplateName(activeTemplate?.name || '');
                                setIsEditingTemplateName(true);
                            }} disabled={!activeTemplateId} style={{padding: '10px', justifyContent: 'center'}}>
                                <Pencil size={16}/> <span style={{marginLeft: '8px'}}>Rename</span>
                            </button>
                            <button className="secondary action-btn" onClick={() => {
                                setIsModalOpen(false);
                                handleNewClick();
                            }} style={{padding: '10px', justifyContent: 'center'}}>
                                <Plus size={16}/> <span style={{marginLeft: '8px'}}>New</span>
                            </button>
                            <button className="secondary action-btn" onClick={() => {
                                setIsModalOpen(false);
                                duplicateTemplate();
                            }} disabled={!activeTemplateId} style={{padding: '10px', justifyContent: 'center'}}>
                                <Copy size={16}/> <span style={{marginLeft: '8px'}}>Duplicate</span>
                            </button>
                            <button className="secondary template-delete-btn action-btn" onClick={() => {
                                setIsModalOpen(false);
                                deleteTemplate();
                            }} disabled={!activeTemplateId} style={{
                                padding: '10px',
                                justifyContent: 'center',
                                color: '#ef4444',
                                borderColor: 'rgba(239, 68, 68, 0.3)'
                            }}>
                                <Trash2 size={16}/> <span style={{marginLeft: '8px'}}>Delete</span>
                            </button>
                        </div>
                    </div>

                </div>
            </BaseModal>
        </>);
}
