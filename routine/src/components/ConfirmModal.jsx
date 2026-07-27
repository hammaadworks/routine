import { createPortal } from 'react-dom';
import { AlertTriangle, Info } from 'lucide-react';

export default function ConfirmModal({ title = 'Confirm Action', message, image, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = true }) {
  return createPortal(
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <h3 style={{ marginBottom: '16px', color: '#fff', fontSize: '16px' }}>{title}</h3>
        {image && (
          <img src={image} alt="Helper" style={{ width: '100%', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--panel-border)' }} />
        )}
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px', lineHeight: '1.5' }}>{message}</p>
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          {onCancel && (
            <button 
              onClick={onCancel} 
              className="secondary" 
              style={{ padding: '8px 16px' }}
            >
              {cancelText}
            </button>
          )}
          <button 
            onClick={onConfirm} 
            style={{ 
              padding: '8px 16px', 
              background: isDanger ? 'var(--danger)' : 'var(--accent)',
              color: isDanger ? '#fff' : '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
