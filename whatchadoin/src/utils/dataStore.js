export const loadRoutines = () => {
  const saved = localStorage.getItem('whatchadoin_routines');
  
  if (saved) {
    const parsed = JSON.parse(saved);
    
    const validRoutineIds = new Set(parsed.map(v => v.id));
    const keysToRemove = [];
    let keysRemoved = false;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('whatchadoin_plans_') || key.startsWith('whatchadoin_plans_folders_'))) {
        const isFolder = key.startsWith('whatchadoin_plans_folders_');
        const vId = key.replace(isFolder ? 'whatchadoin_plans_folders_' : 'whatchadoin_plans_', '');
        if (!validRoutineIds.has(vId)) {
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
    id: 'v1',
    name: 'Routine 1',
    desc: 'Default Routine',
    start: '',
    end: '',
    routineGoals: [],
    habits: [],
    templates: [{"id":"t1","name":"Vanilla whatchadoin","blocks":[]}],
    activeTemplateId: 't1',
    dayMapping: {"Monday":"","Tuesday":"","Wednesday":"","Thursday":"","Friday":"","Saturday":"","Sunday":""}
  }];
};

export const loadActiveRoutineId = () => {
  const saved = localStorage.getItem('whatchadoin_activeRoutineId');
  if (saved) return saved;
  return 'v1';
};
