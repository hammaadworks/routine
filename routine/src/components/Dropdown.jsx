import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Dropdown({ options, value, onChange, placeholder = 'Select...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', flex: 1 }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 12px', background: 'var(--panel-bg)', 
          border: '1px solid var(--panel-border)', borderRadius: '8px',
          cursor: 'pointer', color: selectedOption ? '#fff' : 'var(--text-secondary)',
          fontSize: '13px'
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-secondary)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
          background: 'var(--bg)', border: '1px solid var(--panel-border)',
          borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 100, maxHeight: '200px', overflowY: 'auto'
        }}>
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                color: opt.value === value ? 'var(--accent)' : '#fff',
                background: opt.value === value ? 'rgba(234, 179, 8, 0.1)' : 'transparent',
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = opt.value === value ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = opt.value === value ? 'rgba(234, 179, 8, 0.1)' : 'transparent'}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
