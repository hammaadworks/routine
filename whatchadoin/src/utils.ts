// @ts-nocheck
export function parseDuration(val: string | number | null | undefined): number {
  if (val === undefined || val === null || val === '') return 0;
  const str = String(val).toLowerCase().trim();

  // Support for 'h' and 'm' suffixes
  if (str.includes(':')) {
    const parts = str.split(':');
    const h = parseInt(parts[0] || "0") || 0;
    const m = parseInt(parts[1] || "0") || 0;
    return (h * 60) + m;
  }
  if (str.includes('h')) {
    const v = parseFloat(str);
    return isNaN(v) ? 0 : v * 60;
  }
  if (str.includes('m')) {
    const v = parseInt(str);
    return isNaN(v) ? 0 : v;
  }

  // The custom duration logic
  if (str.includes('.') || str.includes(',')) {
    const parts = str.split(/[.,]/);
    const hrs = parseInt(parts[0] || "0") || 0;
    let minsStr = parts[1] || '';
    let mins = 0;
    
    if (minsStr.length === 1) {
      mins = parseInt(minsStr) * 10 || 0;
    } else if (minsStr.length >= 2) {
      mins = parseInt(minsStr.slice(0, 2)) || 0;
    }
    
    // anything >.59 = full hour (60 mins)
    if (mins > 59) mins = 60;
    
    return (hrs * 60) + mins;
  }

  // Pure number
  return parseInt(str) || 0;
}



export function validateColor(hex: string): { isValid: boolean; error: string } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  if (diff < 30 || min > 220) {
    return { isValid: false, error: 'Grey/white is reserved.' };
  }
  return { isValid: true, error: '' };
}

export function getScheduledGoalsForDate(
  dateStr: string,
  habits: Record<string, any>[],
  dayMapping: Record<string, string> | null | undefined,
  templates: Record<string, any>[] | null | undefined
): Record<string, any>[] {
  if (!habits || habits.length === 0) return [];

  const parts = dateStr.split('-');
  const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const templateId = dayMapping ? dayMapping[dayName] : null;

  if (templateId && templates) {
    const template = templates.find((t: any) => t.id === templateId);
    if (template) {
      const blockGoalIds = template.blocks.map((b: any) => b.routineGoalId).filter(Boolean);
      const scheduledGoals = habits.filter((g: any) => blockGoalIds.includes(g.id));
      if (scheduledGoals.length > 0) {
        return scheduledGoals;
      }
    }
  }
  return habits;
}

export function getAllGoalsForMention(
  routineGoals: Record<string, any>[] | null | undefined,
  habits: Record<string, any>[] | null | undefined,
  lifeGoals: Record<string, any>[] | null | undefined,
  mentionQuery: string | null | undefined,
  moneyGoals?: Record<string, any>[] | null | undefined,
  tasks?: Record<string, any>[] | null | undefined
): { allGoals: Record<string, any>[]; filteredGoals: Record<string, any>[] } {
  const allGoals = [
    ...(routineGoals || []).map((g: any) => ({ ...g, type: 'Routine Goal' })),
    ...(habits || []).map((g: any) => ({ ...g, type: 'Habit' })),
    ...(lifeGoals || []).map((g: any) => ({ ...g, type: 'Life Goal' })),
    ...(moneyGoals || []).map((g: any) => ({ ...g, type: 'Money Goal' })),
    ...(tasks || []).map((g: any) => ({ ...g, type: 'Task' }))
  ];
  const filteredGoals = allGoals.filter((g: any) => 
    (g.name || '').toLowerCase().includes((mentionQuery || '').toLowerCase())
  );
  return { allGoals, filteredGoals };
}

export function sanitizeEntity<T = any>(item: any): T {
  if (!item || typeof item !== 'object') return item;
  const clean = { ...item };
  if (!clean.name) {
    clean.name = clean.text || clean.task || clean.title || '';
  }
  delete clean.text;
  delete clean.task;
  delete clean.title;
  return clean as T;
}

export function sanitizeEntities<T = any>(items: any[]): T[] {
  if (!Array.isArray(items)) return [];
  return items.map(sanitizeEntity);
}

export function sanitizeRoutine(routine: any): any {
  if (!routine || typeof routine !== 'object') return routine;
  const clean = { ...routine };
  if (Array.isArray(clean.routineGoals)) {
    clean.routineGoals = clean.routineGoals.map(sanitizeEntity);
  }
  if (Array.isArray(clean.habits)) {
    clean.habits = clean.habits.map(sanitizeEntity);
  } else if (clean.habits && typeof clean.habits === 'object') {
    if (Array.isArray(clean.habits.daily)) {
      clean.habits.daily = clean.habits.daily.map(sanitizeEntity);
    }
    if (Array.isArray(clean.habits.weekly)) {
      clean.habits.weekly = clean.habits.weekly.map(sanitizeEntity);
    }
  }
  if (Array.isArray(clean.templates)) {
    clean.templates = clean.templates.map((t: any) => {
      if (!t || !Array.isArray(t.blocks)) return t;
      return {
        ...t,
        blocks: t.blocks.map((b: any) => {
          const cleanB = { ...b };
          if (!cleanB.name && cleanB.task) {
            cleanB.name = cleanB.task;
          }
          delete cleanB.task;
          delete cleanB.text;
          delete cleanB.title;
          return cleanB;
        })
      };
    });
  }
  return clean;
}

export function sanitizeAllStorage(): void {
  if (typeof localStorage === 'undefined') return;

  // 1. Routines
  const routinesRaw = localStorage.getItem('whatchadoin_routines');
  if (routinesRaw) {
    try {
      const parsed = JSON.parse(routinesRaw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.map(sanitizeRoutine);
        const newRaw = JSON.stringify(cleaned);
        if (newRaw !== routinesRaw) {
          localStorage.setItem('whatchadoin_routines', newRaw);
        }
      }
    } catch (e) {
      console.error('Failed to sanitize routines in storage', e);
    }
  }

  // 2. Life Goals
  const lifeRaw = localStorage.getItem('whatchadoin_life_goals');
  if (lifeRaw) {
    try {
      const parsed = JSON.parse(lifeRaw);
      if (Array.isArray(parsed)) {
        const cleaned = sanitizeEntities(parsed);
        const newRaw = JSON.stringify(cleaned);
        if (newRaw !== lifeRaw) {
          localStorage.setItem('whatchadoin_life_goals', newRaw);
        }
      }
    } catch (e) {
      console.error('Failed to sanitize life goals in storage', e);
    }
  }

  // 3. Money Goals
  const moneyRaw = localStorage.getItem('whatchadoin_money_goals');
  if (moneyRaw) {
    try {
      const parsed = JSON.parse(moneyRaw);
      if (Array.isArray(parsed)) {
        const cleaned = sanitizeEntities(parsed);
        const newRaw = JSON.stringify(cleaned);
        if (newRaw !== moneyRaw) {
          localStorage.setItem('whatchadoin_money_goals', newRaw);
        }
      }
    } catch (e) {
      console.error('Failed to sanitize money goals in storage', e);
    }
  }

  // 4. Quick Tasks
  const tasksRaw = localStorage.getItem('whatchadoin_quick_tasks');
  if (tasksRaw) {
    try {
      const parsed = JSON.parse(tasksRaw);
      if (Array.isArray(parsed)) {
        const cleaned = sanitizeEntities(parsed);
        const newRaw = JSON.stringify(cleaned);
        if (newRaw !== tasksRaw) {
          localStorage.setItem('whatchadoin_quick_tasks', newRaw);
        }
      }
    } catch (e) {
      console.error('Failed to sanitize quick tasks in storage', e);
    }
  }

  // 5. Plans (Life and Routine plans)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('whatchadoin_plans_') || key === 'whatchadoin_life_plans') && !key.startsWith('whatchadoin_plans_folders_')) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = sanitizeEntities(parsed);
            const newRaw = JSON.stringify(cleaned);
            if (newRaw !== raw) {
              localStorage.setItem(key, newRaw);
            }
          }
        } catch (e) {
          console.error(`Failed to sanitize plans for key ${key}`, e);
        }
      }
    }
  }
}

export function getAllWalletGoals(
  lifeGoals: Record<string, any>[] | null | undefined,
  routineGoals: Record<string, any>[] | null | undefined,
  moneyGoals: Record<string, any>[] | null | undefined
): Record<string, any>[] {
  return [
    ...(lifeGoals || []).map((g: any) => ({ ...g, category: 'Life', type: 'life' })),
    ...(routineGoals || []).map((g: any) => ({ ...g, category: 'Routine', type: 'routine' })),
    ...(moneyGoals || []).map((g: any) => ({ ...g, category: 'Money', type: 'money' }))
  ]
    .filter((g: any) => typeof g.cost === 'number' && g.cost > 0)
    .sort((a: any, b: any) => b.cost - a.cost);
}

export function hexToRgb(hex: string) {
  const defaultRgb = { r: 255, g: 255, b: 255 };
  if (!hex || typeof hex !== 'string') return defaultRgb;
  const h = hex.startsWith('#') ? hex : '#' + hex;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return { r: isNaN(r) ? 255 : r, g: isNaN(g) ? 255 : g, b: isNaN(b) ? 255 : b };
}

export function getGoalColor(
  goal: Record<string, any>,
  routineGoals: Record<string, any>[] | null | undefined,
  lifeGoals: Record<string, any>[] | null | undefined,
  moneyGoals?: Record<string, any>[] | null | undefined
): string[] {
  if (goal.color) {
    return [goal.color];
  }

  const colors: string[] = [];

  const rIds = Array.isArray(goal.routineGoalIds) ? goal.routineGoalIds : (goal.routineGoalId ? [goal.routineGoalId] : []);
  const lIds = Array.isArray(goal.lifeGoalIds) ? goal.lifeGoalIds : (goal.lifeGoalId ? [goal.lifeGoalId] : []);
  const mIds = Array.isArray(goal.moneyGoalIds) ? goal.moneyGoalIds : (goal.moneyGoalId ? [goal.moneyGoalId] : []);

  if (routineGoals) {
    rIds.forEach((id: string) => {
      const rg = routineGoals.find((sg: any) => sg.id === id);
      if (rg && rg.color) colors.push(rg.color);
    });
  }

  if (lifeGoals) {
    lIds.forEach((id: string) => {
      const lg = lifeGoals.find((lg: any) => lg.id === id);
      if (lg && lg.color) colors.push(lg.color);
    });
  }

  if (moneyGoals) {
    mIds.forEach((id: string) => {
      const mg = moneyGoals.find((mg: any) => mg.id === id);
      if (mg && mg.color) colors.push(mg.color);
    });
  }

  if (colors.length > 0) {
    return Array.from(new Set(colors));
  }

  return ['#ffffff'];
}

export function sortHabits(habitsList: Record<string, any>[] | null | undefined): Record<string, any>[] {
  return [...(habitsList || [])].sort((a: any, b: any) => {
    const hasTimeA = !!a.time;
    const hasTimeB = !!b.time;
    if (hasTimeA !== hasTimeB) return hasTimeA ? 1 : -1;
    if (hasTimeA && hasTimeB) {
      const durA = parseDuration(a.time);
      const durB = parseDuration(b.time);
      if (durA !== durB) return durA - durB;
    }
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return 0;
  });
}

export function getCardBgStyle(hexColors: string[] | string | null | undefined, hasColorExplicit: boolean = false): Record<string, string> {
  const colors = Array.isArray(hexColors) ? hexColors : (hexColors ? [hexColors] : ['#eab308']);
  const safeColors = colors.length > 0 ? colors : ['#eab308'];
  
  if (safeColors.length === 1) {
    const {r, g, b} = hexToRgb(safeColors[0]);
    return {
      border: `1px solid rgba(${r},${g},${b}, ${hasColorExplicit ? '0.3' : '0.1'})`,
      borderLeft: `4px solid ${safeColors[0]}`,
      background: `linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(${r},${g},${b},0.05) 100%)`,
      boxShadow: `0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)`,
    };
  }
  
  const gradientStops = safeColors.join(', ');
  const rgbaStops = safeColors.map(hex => {
    const {r, g, b} = hexToRgb(hex);
    return `rgba(${r},${g},${b},0.05)`;
  }).join(', ');
  
  return {
    border: '1px solid rgba(255,255,255,0.1)',
    borderLeft: '4px solid transparent',
    borderImage: `linear-gradient(to bottom, ${gradientStops}) 1 100%`,
    borderWidth: '1px 1px 1px 4px',
    background: `linear-gradient(145deg, rgba(255,255,255,0.03) 0%, ${rgbaStops})`,
    boxShadow: `0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)`,
  };
}

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, falling back to execCommand', err);
    }
  }

  // Fallback for mobile and non-secure contexts
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    if (!successful) {
      throw new Error('Fallback copy failed');
    }
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
    throw err;
  } finally {
    document.body.removeChild(textArea);
  }
}
