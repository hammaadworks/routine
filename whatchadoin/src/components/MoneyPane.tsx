import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import {Plus} from 'lucide-react';
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
}

interface MoneyPaneProps {
    moneyGoals: MoneyGoal[];
    setMoneyGoals: React.Dispatch<React.SetStateAction<MoneyGoal[]>>;
    headerTabs?: React.ReactNode;
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
                                     headerTabs
                                 }: MoneyPaneProps) {
    const [showMoneyGoalModal, setShowMoneyGoalModal] = useState(false);
    const [editingMoneyGoalId, setEditingMoneyGoalId] = useState<string | null>(null);
    const [moneyGoalForm, setMoneyGoalForm] = useState({text: '', color: '', cost: '', desc: ''});
    const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
    const [colorError, setColorError] = useState('');
    const [drawerMoneyGoalId, setDrawerMoneyGoalId] = useState<string | null>(null);

    const dragItem = useRef<any>(null);
    const dragOverItem = useRef<any>(null);

    const handleDragStart = (_e: React.DragEvent, position: number) => {
        dragItem.current = position;
    };

    const handleDragEnter = (_e: React.DragEvent, position: number) => {
        dragOverItem.current = position;
    };

    const handleDragEnd = () => {
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
        window.addEventListener('fab:add-money', handleFab);
        return () => window.removeEventListener('fab:add-money', handleFab);
    }, []);

    const openAddMoneyGoal = () => {
        setEditingMoneyGoalId(null);
        const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)] || '#FF595E';
        setMoneyGoalForm({text: '', color: randomColor, cost: '', desc: ''});
        setShowMoneyGoalModal(true);
    };

    const openEditMoneyGoal = (goal: MoneyGoal) => {
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

    const toggleMoney = (id: string) => {
        setMoneyGoals(moneyGoals.map(g => g.id === id ? {...g, completed: !g.completed} : g));
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

    let displayedGoals = moneyGoals.filter(g => g.text.toLowerCase().includes(searchQuery.toLowerCase()));
    if (sortByName) {
        displayedGoals.sort((a, b) => a.text.localeCompare(b.text));
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

                {moneyGoals.length > 0 && (
                    <SearchSortBar
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        sortByName={sortByName}
                        setSortByName={setSortByName}
                        placeholder="Search money goals..."
                    />
                )}

                <div className="custom-scrollbar"
                     style={{flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {displayedGoals.map((g, index) => (
                        <div
                            key={g.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            <GoalCard
                                goal={g}
                                index={index}
                                linkedCount={0}
                                draggable={!searchQuery && !sortByName}
                                onDragStart={handleDragStart}
                                onDragEnter={handleDragEnter}
                                onDragEnd={handleDragEnd}
                                onToggle={() => toggleMoney(g.id)}
                                onEdit={() => openEditMoneyGoal(g)}
                                onBadgeClick={(id) => setDrawerMoneyGoalId(drawerMoneyGoalId === id ? null : id)}
                            />
                        </div>
                    ))}
                    {displayedGoals.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '32px 0',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem'
                        }}>
                            {searchQuery ? 'No money goals match your search.' : 'No money goals yet.'}
                        </div>
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
