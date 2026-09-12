import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import {Plus, Wallet} from 'lucide-react';
import SearchSortBar from './SearchSortBar';
import ConfirmModal from './ConfirmModal';
import BaseModal from './BaseModal';
import GoalCard from './GoalCard';
import GoalForm from './GoalForm';


const PRESET_COLORS = ['#FF595E', '#FF9F1C', '#FFCA3A', '#8AC926', '#00F5D4', '#1982C4', '#4361EE', '#6A4C93', '#F15BB5'];

export interface MoneyGoal {
    id: string;
    text: string;
    cost: number;
    color?: string;
    completed?: boolean;
    desc?: string;
    type?: string;
}

interface MoneyPaneProps {
    moneyGoals: MoneyGoal[];
    setMoneyGoals: React.Dispatch<React.SetStateAction<MoneyGoal[]>>;
    headerTabs?: React.ReactNode;
    allWalletGoals?: any[];
    setLifeGoals?: React.Dispatch<React.SetStateAction<any[]>>;
    setRoutineGoals?: React.Dispatch<React.SetStateAction<any[]>>;
}

interface ConfirmConfig {
    title: string;
    message: string;
    isDanger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function MoneyPane({
                                     moneyGoals,
                                     setMoneyGoals,
                                     headerTabs,
                                     allWalletGoals,
                                     setLifeGoals,
                                     setRoutineGoals
                                 }: MoneyPaneProps) {
    const [showMoneyGoalModal, setShowMoneyGoalModal] = useState(false);
    const [editingMoneyGoalId, setEditingMoneyGoalId] = useState<string | null>(null);
    const [editingGoalType, setEditingGoalType] = useState<string>('money');
    const [moneyGoalForm, setMoneyGoalForm] = useState({text: '', color: '', cost: '', desc: ''});
    const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
    const [colorError, setColorError] = useState('');
    const [drawerMoneyGoalId, setDrawerMoneyGoalId] = useState<string | null>(null);
    const [isWalletView, setIsWalletView] = useState(false);


    const dragItem = useRef<any>(null);
    const dragOverItem = useRef<any>(null);

    const handleDragStart = (_e: React.DragEvent, position: number) => {
        dragItem.current = position;
    };

    const handleDragEnter = (_e: React.DragEvent, position: number) => {
        dragOverItem.current = position;
    };

    const handleDragEnd = () => {
        if (isWalletView) return; // Disable drag and drop in wallet view
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current >= 0 && dragOverItem.current >= 0) {
            const newList = [...moneyGoals];
            const draggedItemContent = newList[dragItem.current];
            if (draggedItemContent) {
                newList.splice(dragItem.current, 1);
                newList.splice(dragOverItem.current, 0, draggedItemContent);
                setMoneyGoals(newList);
            }
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };


    useEffect(() => {
        const handleFab = () => openAddMoneyGoal();
        const handleOpenWalletView = () => setIsWalletView(true);
        window.addEventListener('fab:add-money', handleFab);
        window.addEventListener('open-wallet-view', handleOpenWalletView);
        return () => {
            window.removeEventListener('fab:add-money', handleFab);
            window.removeEventListener('open-wallet-view', handleOpenWalletView);
        }
    }, []);

    const openAddMoneyGoal = () => {
        setEditingMoneyGoalId(null);
        const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)] || '#FF595E';
        setMoneyGoalForm({text: '', color: randomColor, cost: '', desc: ''});
        setShowMoneyGoalModal(true);
    };

    const openEditMoneyGoal = (goal: MoneyGoal) => {
        if (goal.type && goal.type !== 'money') return; // Cannot edit life/routine goals from here
        setEditingMoneyGoalId(goal.id);
        setColorError('');
        const goalColor = goal.color || PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)] || '#FF595E';
        setMoneyGoalForm({text: goal.text, color: goalColor, cost: String(goal.cost), desc: goal.desc || ''});
        setShowMoneyGoalModal(true);
    };



    const saveMoneyGoal = (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (!moneyGoalForm.text.trim() || !moneyGoalForm.cost.trim()) return;
        const cleanText = moneyGoalForm.text.trim();
        const costValue = parseFloat(moneyGoalForm.cost);
        if (isNaN(costValue)) return;

        if (editingMoneyGoalId) {
            setMoneyGoals(prev => prev.map(g => g.id === editingMoneyGoalId ? {
                ...g, text: cleanText, color: moneyGoalForm.color, cost: costValue, desc: moneyGoalForm.desc
            } : g));
        } else {
            setMoneyGoals([...moneyGoals, {
                id: 'mg-' + Date.now(),
                text: cleanText,
                color: moneyGoalForm.color,
                cost: costValue,
                completed: false,
                desc: moneyGoalForm.desc
            }]);
        }
        setShowMoneyGoalModal(false);
    };

    const toggleGoal = (id: string, type?: string) => {
        if (type === 'life' && setLifeGoals) {
            setLifeGoals(prev => prev.map(g => g.id === id ? {...g, completed: !g.completed} : g));
        } else if (type === 'routine' && setRoutineGoals) {
            setRoutineGoals(prev => prev.map(g => g.id === id ? {...g, completed: !g.completed} : g));
        } else {
            setMoneyGoals(prev => prev.map(g => g.id === id ? {...g, completed: !g.completed} : g));
        }
    };

    const deleteMoneyGoal = (id: string, text: string) => {
        setConfirmConfig({
            title: 'Delete Money Goal',
            message: `Are you sure you want to delete the money goal: "${text}"?`,
            isDanger: true,
            onConfirm: () => {
                setMoneyGoals(moneyGoals.filter(g => g.id !== id));
                setConfirmConfig(null);
            },
            onCancel: () => setConfirmConfig(null)
        });
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [sortByName, setSortByName] = useState(false);

    let baseGoals = isWalletView && allWalletGoals ? allWalletGoals : moneyGoals;
    let displayedGoals = baseGoals.filter(g => g.text.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (sortByName) {
        displayedGoals.sort((a, b) => a.text.localeCompare(b.text));
    } else if (isWalletView) {
        // allWalletGoals is already sorted by cost in App.tsx, but filter might have messed up the order or we just rely on base order
        displayedGoals.sort((a, b) => (b.cost || 0) - (a.cost || 0));
    }



    return (
        <div style={{display: 'flex', flexDirection: 'column', flex: 1, padding: 0, overflow: 'hidden', minHeight: 0}}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                padding: '24px',
                paddingTop: '16px',
                overflow: 'hidden',
                minHeight: 0
            }}>
                {headerTabs}

                <button
                    onClick={openAddMoneyGoal}
                    className="secondary desktop-only-btn"
                    style={{
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        background: 'var(--panel-bg)',
                        border: '1px dashed var(--panel-border)',
                        color: 'var(--text-secondary)'
                    }}
                >
                    <Plus size={16}/> Add Money Goal
                </button>

                <SearchSortBar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    sortByName={sortByName}
                    setSortByName={setSortByName}
                    placeholder="Search money goals..."
                    isFilterActive={searchQuery.length > 0 || sortByName}
                    onFilterClear={() => {
                        setSearchQuery('');
                        setSortByName(false);
                    }}
                >
                    <button
                        className={`secondary ${isWalletView ? 'sort-active-glow' : ''}`}
                        onClick={() => setIsWalletView(!isWalletView)}
                        style={{
                            padding: '8px 12px',
                            background: isWalletView ? 'var(--accent)' : '',
                            boxShadow: isWalletView ? '0 0 12px var(--accent)' : 'none',
                            color: isWalletView ? '#000' : 'currentColor',
                            borderColor: isWalletView ? 'var(--accent)' : ''
                        }}
                        title="Toggle Wallet Goal View"
                    >
                        <Wallet size={16} />
                    </button>
                </SearchSortBar>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    overflowY: 'auto',
                    flex: 1,
                    padding: '8px 12px 8px 4px',
                    marginTop: '-8px'
                }}>
                    {(() => {
                        const activeGoals = displayedGoals.filter((g: MoneyGoal) => !g.completed);
                        const completedGoals = displayedGoals.filter((g: MoneyGoal) => g.completed);

                        const renderGoal = (goal: MoneyGoal) => {
                            const absoluteIndex = moneyGoals.findIndex((g: MoneyGoal) => g.id === goal.id);
                            return (<GoalCard
                                key={goal.id}
                                goal={goal}
                                index={absoluteIndex}
                                linkedCount={0}
                                draggable={!searchQuery && !sortByName && !isWalletView}
                                onDragStart={handleDragStart}
                                onDragEnter={handleDragEnter}
                                onDragEnd={handleDragEnd}
                                onToggle={() => toggleGoal(goal.id, goal.type)}
                                onEdit={() => openEditMoneyGoal(goal)}
                                onBadgeClick={(id) => setDrawerMoneyGoalId(drawerMoneyGoalId === id ? null : id)}
                            />);
                        };

                        return (<>
                            {activeGoals.map(renderGoal)}
                            {completedGoals.length > 0 && (
                                <div style={{display: 'flex', alignItems: 'center', margin: '16px 0 8px 0'}}>
                                    <div style={{flex: 1, height: '1px', background: 'var(--panel-border)'}}></div>
                                    <span style={{
                                        padding: '0 12px',
                                        fontSize: '12px',
                                        color: 'var(--text-secondary)',
                                        fontWeight: 500
                                    }}>
                                        Completed
                                    </span>
                                    <div style={{flex: 1, height: '1px', background: 'var(--panel-border)'}}></div>
                                </div>)}
                            {completedGoals.map(renderGoal)}
                        </>);
                    })()}
                    {baseGoals.length === 0 && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '40px 20px',
                            color: 'var(--text-secondary)',
                            textAlign: 'center',
                            border: '1px dashed var(--panel-border)',
                            borderRadius: '12px',
                            marginTop: '8px'
                        }}>
                            <div style={{fontSize: '14px', fontWeight: '500', color: '#fff'}}>{isWalletView ? 'No goals with cost yet' : 'No money goals yet'}</div>
                            <div style={{fontSize: '12px', marginTop: '4px', opacity: 0.7}}>{isWalletView ? 'Add costs to your goals to see them here.' : 'Add goals you want to save money for.'}</div>
                        </div>
                    )}
                </div>
            </div>

            <div style={{
                flex: 'none',
                background: 'rgba(0,0,0,0.3)',
                borderTop: '1px solid var(--panel-border)',
                padding: '0 16px',
                minHeight: '44px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '8px'
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)'
                }}>
                    {isWalletView ? (
                        <>
                            <Wallet size={14} color="var(--accent)"/>
                            Wallet Goals : {baseGoals.filter(g => g.completed).length} / {baseGoals.length}
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            Money Goals : {moneyGoals.filter(g => g.completed).length} / {moneyGoals.length}
                        </>
                    )}
                </div>
            </div>

            {confirmConfig && (
                <ConfirmModal
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    isDanger={confirmConfig.isDanger}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={confirmConfig.onCancel}
                />
            )}

            {showMoneyGoalModal && (
                <BaseModal title={editingMoneyGoalId ? "Edit Money Goal" : "New Money Goal"}
                           onClose={() => setShowMoneyGoalModal(false)}>
                <GoalForm
                    formData={moneyGoalForm}
                    setFormData={setMoneyGoalForm as any}
                    onSubmit={saveMoneyGoal}
                    onCancel={() => setShowMoneyGoalModal(false)}
                    onDelete={editingMoneyGoalId ? () => {
                        deleteMoneyGoal(editingMoneyGoalId, moneyGoalForm.text);
                        setShowMoneyGoalModal(false);
                    } : undefined}
                    isEditing={!!editingMoneyGoalId}
                    colorError={colorError}
                    setColorError={setColorError}
                    requireCost={true}
                />
                </BaseModal>
            )}
        </div>
    );
}
