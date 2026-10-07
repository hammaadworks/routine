import React from 'react';

export type GoalCategory = 'life' | 'money' | 'routine';

export interface TransferGoalParams {
    goalId?: string | null;
    sourceCategory: GoalCategory;
    targetCategory: GoalCategory;
    isDuplicate?: boolean;
    formData: {
        name: string; color: string; desc?: string; cost?: string | number; isPublic?: boolean; category?: GoalCategory;
    };
    originalGoal?: any;
    setLifeGoals?: React.Dispatch<React.SetStateAction<any[]>> | ((goals: any[]) => void);
    setMoneyGoals?: React.Dispatch<React.SetStateAction<any[]>> | ((goals: any[]) => void);
    setRoutineGoals?: React.Dispatch<React.SetStateAction<any[]>> | ((goals: any[]) => void);
    setActiveLeftTab?: (tab: GoalCategory) => void;
    onSuccess?: () => void;
}

export function moveOrSaveGoal({
                                   goalId,
                                   sourceCategory,
                                   targetCategory,
                                   isDuplicate,
                                   formData,
                                   originalGoal,
                                   setLifeGoals,
                                   setMoneyGoals,
                                   setRoutineGoals,
                                   setActiveLeftTab,
                                   onSuccess
                               }: TransferGoalParams) {
    const cleanName = formData.name.trim();
    if (!cleanName) return;

    let costValue: number | undefined = undefined;
    if (formData.cost !== undefined && formData.cost !== null && String(formData.cost).trim() !== '') {
        const parsed = parseFloat(String(formData.cost).replace(/,/g, ''));
        if (!isNaN(parsed)) costValue = parsed;
    }
    if (costValue === undefined && targetCategory === 'money') {
        costValue = 0;
    }

    const finalName = cleanName + (isDuplicate && sourceCategory === targetCategory ? ' (Copy)' : '');

    const baseData = {
        name: finalName,
        color: formData.color,
        desc: formData.desc || '',
        cost: costValue,
        isPublic: !!formData.isPublic,
        type: targetCategory
    };

    const addGoalToCategory = (cat: GoalCategory, goal: any) => {
        if (cat === 'life' && setLifeGoals) {
            (setLifeGoals as any)((prev: any[]) => [...(Array.isArray(prev) ? prev : []), goal]);
        } else if (cat === 'money' && setMoneyGoals) {
            (setMoneyGoals as any)((prev: any[]) => [...(Array.isArray(prev) ? prev : []), goal]);
        } else if (cat === 'routine' && setRoutineGoals) {
            (setRoutineGoals as any)((prev: any[]) => [...(Array.isArray(prev) ? prev : []), goal]);
        }
    };

    const removeGoalFromCategory = (cat: GoalCategory, id: string) => {
        if (cat === 'life' && setLifeGoals) {
            (setLifeGoals as any)((prev: any[]) => (Array.isArray(prev) ? prev : []).filter((g: any) => g.id !== id));
        } else if (cat === 'money' && setMoneyGoals) {
            (setMoneyGoals as any)((prev: any[]) => (Array.isArray(prev) ? prev : []).filter((g: any) => g.id !== id));
        } else if (cat === 'routine' && setRoutineGoals) {
            (setRoutineGoals as any)((prev: any[]) => (Array.isArray(prev) ? prev : []).filter((g: any) => g.id !== id));
        }
    };

    const updateGoalInCategory = (cat: GoalCategory, id: string, updates: any) => {
        const updater = (prev: any[]) => (Array.isArray(prev) ? prev : []).map((g: any) => {
            if (g.id !== id) return g;
            const {text: _text, title: _title, task: _task, ...cleanG} = g;
            return {...cleanG, ...updates};
        });
        if (cat === 'life' && setLifeGoals) (setLifeGoals as any)(updater); else if (cat === 'money' && setMoneyGoals) (setMoneyGoals as any)(updater); else if (cat === 'routine' && setRoutineGoals) (setRoutineGoals as any)(updater);
    };

    if (isDuplicate) {
        // Cloning
        const prefix = targetCategory === 'life' ? 'lg-' : targetCategory === 'money' ? 'mg-' : 'sg-';
        const clonedGoal = {
            ...(originalGoal || {}), ...baseData,
            id: prefix + Date.now(),
            completed: false,
            completedAt: undefined,
            createdAt: new Date().toISOString()
        };
        addGoalToCategory(targetCategory, clonedGoal);
        if (setActiveLeftTab) setActiveLeftTab(targetCategory);
        if (onSuccess) onSuccess();
        return;
    }

    if (goalId) {
        // Editing existing goal
        if (sourceCategory === targetCategory) {
            // Same category, normal update
            updateGoalInCategory(sourceCategory, goalId, baseData);
        } else {
            // Moving across categories!
            removeGoalFromCategory(sourceCategory, goalId);
            const prefix = targetCategory === 'life' ? 'lg-' : targetCategory === 'money' ? 'mg-' : 'sg-';
            const movedGoal = {
                ...(originalGoal || {}), ...baseData, id: prefix + Date.now()
            };
            addGoalToCategory(targetCategory, movedGoal);
            if (setActiveLeftTab) setActiveLeftTab(targetCategory);
        }
    } else {
        // Creating brand new goal
        const prefix = targetCategory === 'life' ? 'lg-' : targetCategory === 'money' ? 'mg-' : 'sg-';
        const newGoal = {
            ...baseData, id: prefix + Date.now(), completed: false, createdAt: new Date().toISOString()
        };
        addGoalToCategory(targetCategory, newGoal);
        if (setActiveLeftTab) setActiveLeftTab(targetCategory);
    }

    if (onSuccess) onSuccess();
}
