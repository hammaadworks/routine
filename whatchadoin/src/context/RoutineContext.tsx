/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Routine, Template, Habit, RoutineGoal, DayMapping } from '../types/routine';
import { loadRoutines, loadActiveRoutineId } from '../utils/dataStore';
import { StorageService } from '../services/storage';

interface RoutineContextType {
    routines: Routine[];
    setRoutines: React.Dispatch<React.SetStateAction<Routine[]>>;
    activeRoutineId: string;
    setActiveRoutineId: (id: string) => void;
    activeRoutine: Routine;
    updateActiveRoutine: (updates: Partial<Routine>) => void;
    templates: Template[];
    activeTemplateId: string;
    activeTemplate: Template | undefined;
    habits: Habit[];
    routineGoals: RoutineGoal[];
    dayMapping: DayMapping;
    dailyLogs: Record<string, Record<string, boolean>>;
    timeLogs: Record<string, Record<string, number>>;
    addRoutine: (newRoutine: Routine) => void;
    deleteRoutine: (routineId: string) => void;
}

const RoutineContext = createContext<RoutineContextType | null>(null);

export const RoutineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [routines, setRoutines] = useState<Routine[]>(loadRoutines);
    const [activeRoutineId, setActiveRoutineIdState] = useState<string>(loadActiveRoutineId);

    const setActiveRoutineId = useCallback((id: string) => {
        setActiveRoutineIdState(id);
        StorageService.setItemImmediate('whatchadoin_active_routine_id', id);
    }, []);

    // Save routines whenever they change
    useEffect(() => {
        StorageService.setItemDebounced('whatchadoin_routines', routines, 200);
    }, [routines]);

    const activeRoutine = useMemo((): Routine => {
        const found = routines.find(r => r.id === activeRoutineId);
        if (found) return found;
        const first = routines[0];
        if (first) return first;
        return {
            id: 'routine-1',
            name: 'Routine 1',
            desc: 'Default Routine',
            start: '',
            end: '',
            routineGoals: [],
            habits: [],
            templates: [{ id: 't1', name: 'Vanilla whatchadoin', blocks: [] }],
            activeTemplateId: 't1',
            dayMapping: { 0: '', 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' },
            timeLogs: {}
        };
    }, [routines, activeRoutineId]);

    const updateActiveRoutine = useCallback((updates: Partial<Routine>) => {
        setRoutines(prev => {
            const index = prev.findIndex(r => r.id === activeRoutineId);
            if (index === -1) return prev;
            const target = prev[index];
            if (!target) return prev;
            const updated = [...prev];
            updated[index] = { ...target, ...updates };
            return updated;
        });
    }, [activeRoutineId]);

    const addRoutine = useCallback((newRoutine: Routine) => {
        setRoutines(prev => [...prev, newRoutine]);
        setActiveRoutineId(newRoutine.id);
    }, [setActiveRoutineId]);

    const deleteRoutine = useCallback((routineId: string) => {
        setRoutines(prev => {
            const filtered = prev.filter(r => r.id !== routineId);
            if (filtered.length === 0) {
                const fallback: Routine = {
                    id: 'routine-1',
                    name: 'Routine 1',
                    desc: 'Default Routine',
                    start: '',
                    end: '',
                    routineGoals: [],
                    habits: [],
                    templates: [{ id: 't1', name: 'Vanilla whatchadoin', blocks: [] }],
                    activeTemplateId: 't1',
                    dayMapping: { 0: '', 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' },
                    timeLogs: {}
                };
                return [fallback];
            }
            return filtered;
        });
        if (activeRoutineId === routineId) {
            const next = routines.find(r => r.id !== routineId);
            if (next) setActiveRoutineId(next.id);
        }
    }, [activeRoutineId, routines, setActiveRoutineId]);

    const habits: Habit[] = useMemo(() => {
        const h = activeRoutine.habits;
        if (!h) return [];
        if (Array.isArray(h)) return h;
        return [...(h.daily || []), ...(h.weekly || [])];
    }, [activeRoutine.habits]);

    const templates: Template[] = useMemo(() => {
        return activeRoutine.templates || [];
    }, [activeRoutine.templates]);

    const activeTemplateId = useMemo(() => {
        return activeRoutine.activeTemplateId || (templates[0]?.id ?? '');
    }, [activeRoutine.activeTemplateId, templates]);

    const activeTemplate = useMemo(() => {
        return templates.find(t => t.id === activeTemplateId) || templates[0];
    }, [templates, activeTemplateId]);

    const routineGoals: RoutineGoal[] = useMemo(() => {
        return activeRoutine.routineGoals || [];
    }, [activeRoutine.routineGoals]);

    const dayMapping: DayMapping = useMemo(() => {
        return activeRoutine.dayMapping || { 0: '', 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' };
    }, [activeRoutine.dayMapping]);

    const dailyLogs = useMemo(() => {
        return activeRoutine.dailyLogs || {};
    }, [activeRoutine.dailyLogs]);

    const timeLogs = useMemo(() => {
        return activeRoutine.timeLogs || {};
    }, [activeRoutine.timeLogs]);

    return (
        <RoutineContext.Provider value={{
            routines,
            setRoutines,
            activeRoutineId,
            setActiveRoutineId,
            activeRoutine,
            updateActiveRoutine,
            templates,
            activeTemplateId,
            activeTemplate,
            habits,
            routineGoals,
            dayMapping,
            dailyLogs,
            timeLogs,
            addRoutine,
            deleteRoutine
        }}>
            {children}
        </RoutineContext.Provider>
    );
};

export function useRoutine(): RoutineContextType {
    const context = useContext(RoutineContext);
    if (!context) {
        throw new Error('useRoutine must be used within a RoutineProvider');
    }
    return context;
}
