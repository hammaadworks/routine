import React from 'react';
import { Target, CalendarDays, Zap, FileText } from 'lucide-react';

export default function MobileTabBar({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'goals', icon: Target, label: 'Goals' },
    { id: 'timeline', icon: CalendarDays, label: 'Schedule', default: true },
    { id: 'habits', icon: Zap, label: 'Habits' },
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
