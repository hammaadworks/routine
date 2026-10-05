import { ChevronUp, ChevronDown } from 'lucide-react';

export interface OrderControlsProps {
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    disabled?: boolean;
}

export function OrderControls({
    canMoveUp,
    canMoveDown,
    onMoveUp,
    onMoveDown,
    disabled = false
}: OrderControlsProps) {
    const isUpDisabled = disabled || !canMoveUp;
    const isDownDisabled = disabled || !canMoveDown;

    return (
        <div
            className="order-controls"
            style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                gap: '1px',
                marginRight: '2px',
                userSelect: 'none',
                touchAction: 'manipulation'
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <button
                type="button"
                className="order-btn order-btn-up"
                disabled={isUpDisabled}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isUpDisabled) onMoveUp();
                }}
                title={!isUpDisabled ? 'Move up' : undefined}
                aria-label="Move up"
                style={{
                    background: 'none',
                    border: 'none',
                    padding: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    opacity: isUpDisabled ? 0.2 : 0.65,
                    cursor: isUpDisabled ? 'default' : 'pointer',
                    transition: 'opacity 0.15s, color 0.15s, background-color 0.15s',
                    borderRadius: '3px',
                    minWidth: '22px',
                    minHeight: '14px',
                    lineHeight: 1,
                    touchAction: 'manipulation'
                }}
            >
                <ChevronUp size={13} strokeWidth={2.5} />
            </button>
            <button
                type="button"
                className="order-btn order-btn-down"
                disabled={isDownDisabled}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isDownDisabled) onMoveDown();
                }}
                title={!isDownDisabled ? 'Move down' : undefined}
                aria-label="Move down"
                style={{
                    background: 'none',
                    border: 'none',
                    padding: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    opacity: isDownDisabled ? 0.2 : 0.65,
                    cursor: isDownDisabled ? 'default' : 'pointer',
                    transition: 'opacity 0.15s, color 0.15s, background-color 0.15s',
                    borderRadius: '3px',
                    minWidth: '22px',
                    minHeight: '14px',
                    lineHeight: 1,
                    touchAction: 'manipulation'
                }}
            >
                <ChevronDown size={13} strokeWidth={2.5} />
            </button>
        </div>
    );
}

export default OrderControls;
