import React from 'react';
import { Target, CalendarDays, Zap, FileText } from 'lucide-react';

export default function MobileTabBar({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'timeline', icon: CalendarDays, label: 'Timeline' },
    { id: 'habits', icon: Zap, label: 'Habits' },
    { id: 'goals', icon: Target, label: 'Goals' }
  ];

  return (
    <div className="mobile-tab-bar">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon size={20} color={isActive ? 'var(--accent)' : 'var(--text-secondary)'} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
