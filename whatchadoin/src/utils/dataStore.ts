import {sanitizeRoutine} from '../utils';
import type {Routine} from '../types/routine';

export const loadRoutines = (): Routine[] => {
    const saved = localStorage.getItem('whatchadoin_routines');

    if (saved) {
        try {
            const rawParsed = JSON.parse(saved);
            const parsed: Routine[] = Array.isArray(rawParsed) ? rawParsed.map(sanitizeRoutine) : rawParsed;
            const validRoutineIds = new Set(parsed.map((r) => r.id));
            const keysToRemove: string[] = [];
            let keysRemoved = false;

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('whatchadoin_plans_') || key.startsWith('whatchadoin_plans_folders_'))) {
                    // Skip life plans keys
                    if (key === 'whatchadoin_life_plans' || key === 'whatchadoin_life_plans_folders') continue;

                    const isFolder = key.startsWith('whatchadoin_plans_folders_');
                    const routineId = key.replace(isFolder ? 'whatchadoin_plans_folders_' : 'whatchadoin_plans_', '');
                    if (!validRoutineIds.has(routineId)) {
                        keysToRemove.push(key);
                        keysRemoved = true;
                    }
                }
            }
            if (keysRemoved) {
                keysToRemove.forEach(k => localStorage.removeItem(k));
                localStorage.setItem('whatchadoin_force_sync_push', 'true');
            }

            return parsed;
        } catch (e) {
            console.error('Failed to load routines from storage', e);
        }
    }

    return [{
        id: 'routine-1',
        name: 'Routine 1',
        desc: 'Default Routine',
        start: '',
        end: '',
        routineGoals: [],
        habits: [],
        templates: [{id: "t1", name: "Vanilla whatchadoin", blocks: []}],
        activeTemplateId: 't1',
        dayMapping: {0: '', 1: '', 2: '', 3: '', 4: '', 5: '', 6: ''},
        timeLogs: {}
    }];
};

export const loadActiveRoutineId = (): string => {
    return localStorage.getItem('whatchadoin_active_routine_id') || 'routine-1';
};
