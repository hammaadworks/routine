import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Minus } from 'lucide-react';

export default function BaseModal({ isOpen = true, onClose, title, children, maxWidth = '400px' }) {
  const contentRef = useRef(null);
  const [dragY, setDragY] = useState(0);
  const touchStartRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      // Prevent iOS Safari background scrolling
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
      setDragY(0); // Reset drag on open
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    };
  }, [isOpen, onClose]);

  const handleTouchStart = (e) => {
    if (window.innerWidth <= 768) {
      touchStartRef.current = e.touches[0].clientY;
      if (contentRef.current) {
        contentRef.current.style.transition = 'none';
      }
    }
  };

  const handleTouchMove = (e) => {
    if (touchStartRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartRef.current;

    if (deltaY > 0) {
      setDragY(deltaY);
    } else {
      setDragY(0);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartRef.current === null) return;
    touchStartRef.current = null;
    
    if (contentRef.current) {
      contentRef.current.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    }

    if (dragY > 120 && onClose) {
      onClose();
      setTimeout(() => setDragY(0), 300);
    } else {
      setDragY(0);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="modal-overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      style={{ touchAction: 'none' }}
    >
      <div 
        ref={contentRef}
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth, 
          touchAction: 'auto',
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined 
        }}
      >
        <div 
          className="mobile-drag-handle" 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ display: window.innerWidth <= 768 ? 'flex' : 'none', justifyContent: 'center', paddingTop: '12px', paddingBottom: '12px', cursor: 'grab', touchAction: 'none' }}
        >
          <div style={{ width: '40px', height: '5px', background: 'var(--panel-border)', borderRadius: '10px' }} />
        </div>
        {(title || onClose) && (
          <div className="modal-header" style={{ paddingTop: window.innerWidth <= 768 ? '4px' : '16px' }}>
            <h2 className="modal-title">{title}</h2>
            {onClose && (
              <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
                <X size={24} />
              </button>
            )}
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
