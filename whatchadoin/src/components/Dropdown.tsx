import * as React from 'react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export interface Option {
  value: string | number;
  label: string | React.ReactNode;
  textSearch?: string;
}

export interface DropdownProps {
  options: Option[];
  value?: string | number | null;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Calculates a fuzzy match score between a query and a target string.
 * Returns -1 if no match, or a positive score where higher is better.
 */
export function fuzzyMatchScore(query: string, target: string): number {
  if (!query) return 1;
  const q = query.trim().toLowerCase();
  const t = target.toLowerCase();
  if (!q) return 1;

  // Exact match
  if (t === q) return 10000;

  // Prefix match
  if (t.startsWith(q)) return 5000 + (100 - Math.min(100, t.length));

  // Word boundary prefix match (e.g. "go" matches "Go Live", "live" matches "Go Live")
  const words = t.split(/[\s\-_[\]()@]+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word && word.startsWith(q)) {
      return 3000 + (50 - i * 5);
    }
  }

  // Exact substring match
  const subIdx = t.indexOf(q);
  if (subIdx !== -1) {
    return 2000 - subIdx * 5 - (t.length - q.length);
  }

  // Acronym match (e.g. "rg" matches "[Routine Goal]", "gl" matches "Go Live")
  const initials = words.map(w => (w ? w[0] : '')).filter(Boolean).join('');
  if (initials.includes(q)) {
    return 1500;
  }

  // Fuzzy subsequence match: every char of q appears in t in order
  let qIdx = 0;
  let score = 0;
  let consecutive = 0;
  let prevMatchIdx = -1;

  for (let tIdx = 0; tIdx < t.length; tIdx++) {
    if (t[tIdx] === q[qIdx]) {
      consecutive++;
      score += consecutive * 8;

      // Word boundary bonus
      const prevChar = tIdx > 0 ? t.charAt(tIdx - 1) : '';
      if (tIdx === 0 || /[\s\-_[\]()@]/.test(prevChar)) {
        score += 25;
      }

      // Penalty for distance between characters
      if (prevMatchIdx !== -1) {
        score -= Math.min(10, tIdx - prevMatchIdx - 1);
      }

      prevMatchIdx = tIdx;
      qIdx++;
      if (qIdx === q.length) {
        return Math.max(1, score);
      }
    } else {
      consecutive = 0;
    }
  }

  return -1;
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className,
  style
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const selectedOption = options.find(o => o.value === value);

  // Filter and rank options based on query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return options;
    }
    const scored = options
      .map(opt => {
        const textToSearch = opt.textSearch || (typeof opt.label === 'string' ? opt.label : String(opt.value));
        const score = fuzzyMatchScore(searchQuery, textToSearch);
        return { opt, score };
      })
      .filter(item => item.score > 0);

    // Sort descending by relevance score
    scored.sort((a, b) => b.score - a.score);
    return scored.map(item => item.opt);
  }, [options, searchQuery]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Viewport-aware coords
  const [coords, setCoords] = useState<{
    left: number;
    top: number;
    width: number;
    openUpwards: boolean;
    maxHeight: number;
  } | null>(null);

  const updateCoords = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const menuMaxHeight = 240;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpwards = spaceBelow < menuMaxHeight && spaceAbove > spaceBelow;
      const availableHeight = openUpwards ? spaceAbove - 16 : spaceBelow - 16;
      const maxHeight = Math.max(120, Math.min(menuMaxHeight, availableHeight));

      setCoords({
        left: rect.left,
        top: openUpwards ? rect.top - 4 : rect.bottom + 4,
        width: rect.width,
        openUpwards,
        maxHeight
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      return () => {
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('scroll', updateCoords, true);
      };
    }
  }, [isOpen]);

  // Handle open/close side effects
  useEffect(() => {
    if (isOpen) {
      hiddenInputRef.current?.focus();
    } else {
      setSearchQuery('');
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  // Reset highlight to 0 when search query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest'
      });
    }
  }, [highlightedIndex, isOpen]);

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      hiddenInputRef.current?.focus();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setHighlightedIndex(prev => (prev + 1) % filteredOptions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setHighlightedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        onChange(filteredOptions[highlightedIndex].value);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isOpen) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      hiddenInputRef.current?.focus();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setIsOpen(true);
      setSearchQuery(e.key);
      hiddenInputRef.current?.focus();
    }
  };

  return (
    <div
      ref={dropdownRef}
      style={{ position: 'relative', flex: 1, minWidth: 0, ...style }}
      className={className}
    >
      {/* Invisible input to capture typing on both desktop & mobile without displaying a visible search input */}
      <input
        ref={hiddenInputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleInputKeyDown}
        style={{
          position: 'fixed',
          top: coords ? coords.top : 0,
          left: coords ? coords.left : 0,
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          border: 'none',
          outline: 'none',
          padding: 0,
          margin: 0,
          fontSize: '16px', // Prevents iOS Safari auto-zoom
          color: 'transparent',
          background: 'transparent',
          zIndex: -1
        }}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Dropdown Trigger */}
      <div 
        onClick={toggleOpen}
        onKeyDown={handleTriggerKeyDown}
        tabIndex={0}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 12px', background: 'var(--panel-bg)', 
          border: '1px solid var(--panel-border)', borderRadius: '8px',
          cursor: 'pointer', color: selectedOption ? '#fff' : 'var(--text-secondary)',
          fontSize: '13px', minHeight: '40px', width: '100%', boxSizing: 'border-box',
          outline: 'none',
          userSelect: 'none'
        }}
      >
        <span style={{
          display: 'block',
          paddingRight: '8px',
          wordBreak: 'break-word',
          textAlign: 'left',
          lineHeight: '1.4',
          flex: 1,
          minWidth: 0
        }}>
          {selectedOption ? selectedOption.label : (value ? String(value) : placeholder)}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--text-secondary)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            flexShrink: 0
          }}
        />
      </div>

      {/* Popover Menu Portal */}
      {isOpen && coords && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            width: coords.width,
            transform: coords.openUpwards ? 'translateY(-100%)' : 'none',
            background: 'var(--bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.85)',
            zIndex: 10000,
            maxHeight: `${coords.maxHeight}px`,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Subtle query feedback indicator when user has typed (invisible input captures, Backspace clears) */}
          {searchQuery && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              background: 'rgba(234, 179, 8, 0.08)',
              borderBottom: '1px solid var(--panel-border)',
              fontSize: '11px',
              color: 'var(--accent)',
              userSelect: 'none',
              flexShrink: 0
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                Filter: <strong>{searchQuery}</strong>
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', flexShrink: 0 }}>
                ⌫ Backspace to clear
              </span>
            </div>
          )}

          {/* Filtered Options List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredOptions.length === 0 ? (
              <div style={{
                padding: '14px 12px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                fontStyle: 'italic'
              }}>
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    ref={el => { itemRefs.current[idx] = el; }}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    role="option"
                    aria-selected={isSelected}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: isSelected ? 'var(--accent)' : '#fff',
                      background: isSelected
                        ? 'rgba(234, 179, 8, 0.18)'
                        : isHighlighted
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'transparent',
                      transition: 'background 0.1s'
                    }}
                  >
                    {opt.label}
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

