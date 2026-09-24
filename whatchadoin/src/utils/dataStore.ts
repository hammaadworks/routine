import { sanitizeRoutine } from '../utils';

export const loadRoutines = () => {
  const saved = localStorage.getItem('whatchadoin_routines');
  
  if (saved) {
    const rawParsed = JSON.parse(saved);
    const parsed = Array.isArray(rawParsed) ? rawParsed.map(sanitizeRoutine) : rawParsed;
    const validRoutineIds = new Set(parsed.map((r: any) => r.id));
    const keysToRemove = [];
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
  }
  
  return [{
    id: 'routine-1',
    name: 'Routine 1',
    desc: 'Default Routine',
    start: '',
    end: '',
    routineGoals: [],
    habits: [],
    templates: [{"id":"t1","name":"Vanilla whatchadoin","blocks":[]}],
    activeTemplateId: 't1',
    dayMapping: {"Monday":"","Tuesday":"","Wednesday":"","Thursday":"","Friday":"","Saturday":"","Sunday":""},
    timeLogs: {}
  }];
};

export const loadActiveRoutineId = () => {
  return localStorage.getItem('whatchadoin_active_routine_id') || 'routine-1';
};
