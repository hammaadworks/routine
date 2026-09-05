import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export default function Dropdown({ options, value, onChange, placeholder = 'Select...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(o => o.value === value);

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setCoords({
        left: rect.left,
        top: rect.bottom + window.scrollY,
        width: rect.width
      });
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 12px', background: 'var(--panel-bg)', 
          border: '1px solid var(--panel-border)', borderRadius: '8px',
          cursor: 'pointer', color: selectedOption ? '#fff' : 'var(--text-secondary)',
          fontSize: '13px', minHeight: '40px', width: '100%', boxSizing: 'border-box'
        }}
      >
        <span style={{ display: 'block', paddingRight: '8px', wordBreak: 'break-word', textAlign: 'left', lineHeight: '1.4' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-secondary)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>

      {isOpen && coords && createPortal(
        <div ref={menuRef} style={{
          position: 'absolute', top: coords.top + 4, left: coords.left, width: coords.width,
          background: 'var(--bg)', border: '1px solid var(--panel-border)',
          borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
          zIndex: 10000, maxHeight: '200px', overflowY: 'auto'
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
        </div>,
        document.body
      )}
    </div>
  );
}
