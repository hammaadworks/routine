import * as React from 'react';
import {Copy} from 'lucide-react';
import {copyToClipboard} from '../utils';

interface CopyBannerProps {
    title: string;
    textToCopy: string;
}

export default function CopyBanner({title, textToCopy}: CopyBannerProps) {
    const [copied, setCopied] = React.useState(false);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--panel-border)'
        }}>
            <span style={{fontSize: '12px', color: 'var(--text-secondary)'}}>
                {title}
            </span>
            <button
                type="button"
                onClick={async () => {
                    try {
                        await copyToClipboard(textToCopy);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                    } catch (err) {
                        console.error('Clipboard write failed:', err);
                        alert('Failed to copy to clipboard.');
                    }
                }}
                style={{
                    padding: '6px 12px',
                    background: copied ? 'var(--success)' : 'var(--accent)',
                    color: copied ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexShrink: 0,
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: copied ? 'scale(0.95)' : 'scale(1)'
                }}
                title="Copy Config"
            >
                {copied ? <span style={{fontSize: '12px'}}>Copied!</span> : <><Copy size={14}/> <span style={{fontSize: '12px'}}>Copy</span></>}
            </button>
        </div>
    );
}
