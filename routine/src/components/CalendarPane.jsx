import React, { useState } from 'react';
import { Flag, Plus, Trash2, X } from 'lucide-react';
import Dropdown from './Dropdown';

const TargetPane = ({ 
  activeVersion, updateActiveVersion, sprintGoals,
  selectedTargetDate, setSelectedTargetDate, 
  routineGoals, templates, dayMapping,
  setCalendarSubTab
}) => {

  if (!activeVersion.start || !activeVersion.end) {
    return (
      <div style={{ padding: '24px', color: 'var(--text-secondary)', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Please set a start and end date for the active version to view the Target Calendar.
      </div>
    );
  }

  const parseDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-');
    return new Date(y, m - 1, d);
  };

  const startDate = parseDate(activeVersion.start);
  const endDate = parseDate(activeVersion.end);

  if (startDate > endDate) {
    return (
      <div style={{ padding: '24px', color: 'var(--danger)', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Start date must be before end date.
      </div>
    );
  }

  const monthDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
  if (monthDiff > 6) {
    return (
      <div style={{ padding: '24px', color: 'var(--danger)', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Target period cannot exceed 6 months. Please adjust the version dates.
      </div>
    );
  }

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getGoalsForDateStr = (dateStr) => {
    if (!routineGoals || routineGoals.length === 0) return [];
    
    const d = parseDate(dateStr);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const templateId = dayMapping ? dayMapping[dayName] : null;
    
    if (templateId && templates) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        const blockGoalIds = template.blocks.map(b => b.routineGoalId).filter(Boolean);
        const scheduledGoals = routineGoals.filter(g => blockGoalIds.includes(g.id));
        if (scheduledGoals.length > 0) {
          return scheduledGoals;
        }
      }
    }
    return routineGoals;
  };

  const isDateComplete = (dateStr) => {
    const goalsForDay = getGoalsForDateStr(dateStr);
    if (goalsForDay.length === 0) return false;
    
    const dayLog = activeVersion.dailyLogs?.[dateStr] || {};
    return goalsForDay.every(g => dayLog[g.id] === true);
  };

  const months = [];
  let currentMonthDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endMonthDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (currentMonthDate <= endMonthDate) {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d));
    }
    
    months.push({
      year,
      month,
      monthName: currentMonthDate.toLocaleString('default', { month: 'long' }),
      days
    });
    
    currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
  }

  const isDateInRange = (dateStr) => {
    return dateStr >= activeVersion.start && dateStr <= activeVersion.end;
  };

  const milestones = activeVersion.milestones || {};

  return (
    <div style={{ display: 'flex', height: '100%', flex: 1, overflow: 'hidden' }}>
      <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {months.map((m) => {
          let doneDays = 0;
          let totalDays = 0;
          
          m.days.forEach(d => {
            if (d) {
              const dateStr = formatDate(d);
              if (isDateInRange(dateStr)) {
                totalDays++;
                if (isDateComplete(dateStr)) {
                  doneDays++;
                }
              }
            }
          });

          return (
            <div key={`${m.year}-${m.month}`} style={{ background: 'var(--panel-bg)', borderRadius: '12px', border: '1px solid var(--panel-border)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>{m.monthName} {m.year}</h3>
                {totalDays > 0 && (
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px' }}>
                    <span style={{ color: doneDays > 0 ? 'var(--accent)' : '#fff' }}>{doneDays}</span> / {totalDays}
                  </div>
                )}
              </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '8px' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                  {day}
                </div>
              ))}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {m.days.map((d, dIdx) => {
                if (!d) return <div key={`empty-${dIdx}`} />;
                
                const dateStr = formatDate(d);
                const inRange = isDateInRange(dateStr);
                const isToday = dateStr === formatDate(new Date());
                const isSelected = selectedTargetDate === dateStr;
                const completed = isDateComplete(dateStr);
                const hasMilestone = !!milestones[dateStr];
                
                let bg = 'transparent';
                let borderColor = 'transparent';
                let textColor = 'var(--text-secondary)';
                let opacity = 0.2;
                let shadow = 'none';
                let fontWeight = 'normal';

                if (inRange) {
                  opacity = 1;
                  if (completed) {
                    bg = 'var(--accent)';
                    borderColor = 'var(--accent)';
                    textColor = '#000';
                    fontWeight = 'bold';
                    shadow = '0 0 12px rgba(234, 179, 8, 0.4)';
                  } else if (isToday) {
                    bg = 'rgba(234, 179, 8, 0.15)';
                    borderColor = 'var(--accent)';
                    textColor = 'var(--accent)';
                    fontWeight = 'bold';
                  } else {
                    bg = 'rgba(255, 255, 255, 0.03)';
                    borderColor = 'var(--panel-border)';
                    textColor = '#fff';
                  }
                }

                if (isSelected) {
                  borderColor = '#fff'; // White border to clearly indicate selection
                  if (!completed) {
                    bg = 'rgba(255, 255, 255, 0.1)';
                    textColor = '#fff';
                  }
                }

                return (
                  <div 
                    key={`day-${d.getDate()}`}
                    onClick={() => {
                      if (inRange) {
                        setSelectedTargetDate(isSelected ? null : dateStr);
                        if (setCalendarSubTab) setCalendarSubTab('mark_goals');
                      }
                    }}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '8px',
                      background: bg,
                      border: `1px solid ${borderColor}`,
                      color: textColor,
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: fontWeight,
                      opacity: opacity,
                      boxShadow: shadow,
                      cursor: inRange ? 'pointer' : 'default',
                      position: 'relative',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '40px'
                    }}
                  >
                    {d.getDate()}
                    {hasMilestone && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (inRange) {
                            setSelectedTargetDate(dateStr);
                            if (setCalendarSubTab) setCalendarSubTab('milestones');
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: -1,
                          right: -1,
                          width: '0',
                          height: '0',
                          borderTop: `18px solid ${completed ? '#000' : 'var(--accent)'}`,
                          borderLeft: '18px solid transparent',
                          borderTopRightRadius: '8px',
                          cursor: 'pointer',
                          opacity: 0.9
                        }}
                        title="View Milestones"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )})}
      </div>
    </div>
  );
};

export default TargetPane;
