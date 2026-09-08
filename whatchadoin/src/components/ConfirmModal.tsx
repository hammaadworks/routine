import type {ReactNode} from 'react';
import BaseModal from './BaseModal';

export interface ConfirmModalProps {
    title?: string;
    message: ReactNode;
    image?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
}

export default function ConfirmModal({
                                         title = 'Confirm Action',
                                         message,
                                         image,
                                         onConfirm,
                                         onCancel,
                                         confirmText = 'Confirm',
                                         cancelText = 'Cancel',
                                         isDanger = true
                                     }: ConfirmModalProps) {
    return (<BaseModal isOpen={true} onClose={onCancel} title={title}>
            {image && (<img src={image} alt="Helper" style={{
                    width: '100%',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    border: '1px solid var(--panel-border)'
                }}/>)}
            <p style={{
                color: 'var(--text-secondary)',
                marginBottom: '0',
                fontSize: '14px',
                lineHeight: '1.5'
            }}>{message}</p>
            <div style={{marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '8px'}}>
                {onCancel && (<button
                        onClick={onCancel}
                        className="secondary"
                        style={{padding: '8px 16px'}}
                    >
                        {cancelText}
                    </button>)}
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
        </BaseModal>);
}
