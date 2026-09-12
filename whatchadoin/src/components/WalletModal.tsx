import BaseModal from './BaseModal';
import { useCurrency } from '../hooks/useCurrency';

interface WalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    allGoals: any[];
}

export default function WalletModal({ isOpen, onClose, allGoals }: WalletModalProps) {
    const { formatCurrency } = useCurrency();
    if (!isOpen) return null;

    return (
        <BaseModal title="Wallet Goal" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>All Cost Goals</h3>
                </div>
                {allGoals.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>
                        No goals with a cost assigned yet.
                    </div>
                ) : (
                    allGoals.map((g, idx) => (
                        <div key={g.id + idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{g.text}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{g.category}</span>
                            </div>
                            <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>
                                {formatCurrency(g.cost || 0)}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </BaseModal>
    );
}
