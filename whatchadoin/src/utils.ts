import type { Routine, Habit, RoutineGoal, QuickTask } from './types/routine';
import type { LifeGoal, MoneyGoal, WalletGoal } from './types/goals';

export function parseDuration(val: string | number | null | undefined): number {
  if (val === undefined || val === null || val === '') return 0;
  const str = String(val).toLowerCase().trim();

  // Support for 'h' and 'm' suffixes
  if (str.includes(':')) {
    const parts = str.split(':');
    const h = parseInt(parts[0] || "0", 10) || 0;
    const m = parseInt(parts[1] || "0", 10) || 0;
    return (h * 60) + m;
  }
  if (str.includes('h')) {
    const v = parseFloat(str);
    return isNaN(v) ? 0 : Math.round(v * 60);
  }
  if (str.includes('m')) {
    const v = parseInt(str, 10);
    return isNaN(v) ? 0 : v;
  }

  // The custom duration logic
  if (str.includes('.') || str.includes(',')) {
    const parts = str.split(/[.,]/);
    const hrs = parseInt(parts[0] || "0", 10) || 0;
    const minsStr = parts[1] || '';
    let mins = 0;
    
    if (minsStr.length === 1) {
      mins = (parseInt(minsStr, 10) * 10) || 0;
    } else if (minsStr.length >= 2) {
      mins = parseInt(minsStr.slice(0, 2), 10) || 0;
    }
    
    // anything >.59 = full hour (60 mins)
    if (mins > 59) mins = 60;
    
    return (hrs * 60) + mins;
  }

  // Pure number
  return parseInt(str, 10) || 0;
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
  habits: Habit[],
  dayMapping: Record<string, string> | null | undefined,
  templates: Routine['templates'] | null | undefined
): Habit[] {
  if (!habits || habits.length === 0) return [];
  if (!dateStr) return habits;

  const parts = dateStr.split('-');
  if (parts.length !== 3) return [];
  const part0 = parts[0] || '0';
  const part1 = parts[1] || '1';
  const part2 = parts[2] || '1';
  const dateObj = new Date(parseInt(part0, 10), parseInt(part1, 10) - 1, parseInt(part2, 10));
  if (isNaN(dateObj.getTime())) return [];
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const templateId = dayMapping ? dayMapping[dayName] : null;

  if (templateId && templates && Array.isArray(templates)) {
    const template = templates.find((t) => String(t.id) === String(templateId));
    if (template && Array.isArray(template.blocks)) {
      const blockGoalIds = new Set(
        template.blocks.map((b) => b.routineGoalId ? String(b.routineGoalId) : null).filter(Boolean)
      );
      const blockNames = new Set(
        template.blocks.map((b) => (b.name || '').toLowerCase().trim()).filter(Boolean)
      );

      return habits.filter((g) => {
        if (g.id && blockGoalIds.has(String(g.id))) return true;
        const gName = (g.name || '').toLowerCase().trim();
        return !!(gName && blockNames.has(gName));

      });
    }
  }
  return [];
}

export function getAllGoalsForMention(
  routineGoals: RoutineGoal[] | null | undefined,
  habits: Habit[] | null | undefined,
  lifeGoals: LifeGoal[] | null | undefined,
  mentionQuery: string | null | undefined,
  moneyGoals?: MoneyGoal[] | null | undefined,
  tasks?: QuickTask[] | null | undefined
): { allGoals: Array<Record<string, unknown> & { name: string; type: string }>; filteredGoals: Array<Record<string, unknown> & { name: string; type: string }> } {
  const allGoals: Array<Record<string, unknown> & { name: string; type: string }> = [
    ...(Array.isArray(routineGoals) ? routineGoals : []).map((g) => ({ ...g, name: g.name || '', type: 'Routine Goal' })),
    ...(Array.isArray(habits) ? habits : []).map((g) => ({ ...g, name: g.name || '', type: 'Habit' })),
    ...(Array.isArray(lifeGoals) ? lifeGoals : []).map((g) => ({ ...g, name: g.name || '', type: 'Life Goal' })),
    ...(Array.isArray(moneyGoals) ? moneyGoals : []).map((g) => ({ ...g, name: g.name || '', type: 'Money Goal' })),
    ...(Array.isArray(tasks) ? tasks : []).map((g) => ({ ...g, name: (g.text || (g as { name?: string }).name || '') as string, type: 'Task' }))
  ];
  const query = (mentionQuery || '').toLowerCase();
  const filteredGoals = allGoals.filter((g) =>
    (g.name || '').toLowerCase().includes(query)
  );
  return { allGoals, filteredGoals };
}

export function sanitizeEntity<T = Record<string, unknown>>(item: unknown): T {
  if (!item || typeof item !== 'object') return item as T;
  const clean = { ...(item as Record<string, unknown>) };
  if (!clean['name']) {
    clean['name'] = clean['text'] || clean['task'] || clean['title'] || '';
  }
  delete clean['text'];
  delete clean['task'];
  delete clean['title'];
  return clean as unknown as T;
}

export function sanitizeEntities<T = Record<string, unknown>>(items: unknown[]): T[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => sanitizeEntity<T>(item));
}

export function sanitizeRoutine(routine: unknown): Routine {
  if (!routine || typeof routine !== 'object') return routine as Routine;
  const clean = { ...(routine as Routine) };
  if (Array.isArray(clean.routineGoals)) {
    clean.routineGoals = clean.routineGoals.map((g) => sanitizeEntity<RoutineGoal>(g));
  }
  if (Array.isArray(clean.habits)) {
    clean.habits = clean.habits.map((h) => sanitizeEntity<Habit>(h));
  } else if (clean.habits && typeof clean.habits === 'object') {
    const habitObj = clean.habits as { daily?: Habit[]; weekly?: Habit[] };
    if (Array.isArray(habitObj.daily)) {
      habitObj.daily = habitObj.daily.map((h) => sanitizeEntity<Habit>(h));
    }
    if (Array.isArray(habitObj.weekly)) {
      habitObj.weekly = habitObj.weekly.map((h) => sanitizeEntity<Habit>(h));
    }
  }
  if (Array.isArray(clean.templates)) {
    clean.templates = clean.templates.map((t) => {
      if (!t || !Array.isArray(t.blocks)) return t;
      return {
        ...t,
        blocks: t.blocks.map((b) => {
          const cleanB = { ...b } as Record<string, unknown>;
          if (!cleanB['name'] && cleanB['task']) {
            cleanB['name'] = cleanB['task'];
          }
          delete cleanB['task'];
          delete cleanB['text'];
          delete cleanB['title'];
          return cleanB as unknown as typeof b;
        })
      };
    });
  }
  if (clean.timeLogs && typeof clean.timeLogs === 'object') {
    clean.timeLogs = { ...clean.timeLogs };
  } else if (!clean.timeLogs) {
    clean.timeLogs = {};
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
        const cleaned = sanitizeEntities<LifeGoal>(parsed);
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
        const cleaned = sanitizeEntities<MoneyGoal>(parsed);
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
        const cleaned = sanitizeEntities<QuickTask>(parsed);
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
  lifeGoals: LifeGoal[] | null | undefined,
  routineGoals: RoutineGoal[] | null | undefined,
  moneyGoals: MoneyGoal[] | null | undefined
): WalletGoal[] {
  return [
    ...(Array.isArray(lifeGoals) ? lifeGoals : []).map((g) => ({ ...g, category: 'Life' as const, type: 'life' as const })),
    ...(Array.isArray(routineGoals) ? routineGoals : []).map((g) => ({ ...g, category: 'Routine' as const, type: 'routine' as const })),
    ...(Array.isArray(moneyGoals) ? moneyGoals : []).map((g) => ({ ...g, category: 'Money' as const, type: 'money' as const }))
  ]
    .filter((g) => typeof g.cost === 'number' && g.cost > 0)
    .sort((a, b) => (b.cost || 0) - (a.cost || 0));
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const defaultRgb = { r: 255, g: 255, b: 255 };
  if (!hex || typeof hex !== 'string') return defaultRgb;
  const h = hex.startsWith('#') ? hex : '#' + hex;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return { r: isNaN(r) ? 255 : r, g: isNaN(g) ? 255 : g, b: isNaN(b) ? 255 : b };
}

export function getGoalColor(
  goal: { color?: string; routineGoalId?: string; routineGoalIds?: string[]; lifeGoalId?: string; lifeGoalIds?: string[]; moneyGoalId?: string; moneyGoalIds?: string[] },
  routineGoals: RoutineGoal[] | null | undefined,
  lifeGoals: LifeGoal[] | null | undefined,
  moneyGoals?: MoneyGoal[] | null | undefined
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
      const rg = routineGoals.find((sg) => sg.id === id);
      if (rg && rg.color) colors.push(rg.color);
    });
  }

  if (lifeGoals) {
    lIds.forEach((id: string) => {
      const lg = lifeGoals.find((item) => item.id === id);
      if (lg && lg.color) colors.push(lg.color);
    });
  }

  if (moneyGoals) {
    mIds.forEach((id: string) => {
      const mg = moneyGoals.find((item) => item.id === id);
      if (mg && mg.color) colors.push(mg.color);
    });
  }

  if (colors.length > 0) {
    return Array.from(new Set(colors));
  }

  return ['#ffffff'];
}

export function sortHabits<T extends { time?: string | number; completed?: boolean }>(habitsList: T[] | null | undefined): T[] {
  return [...(habitsList || [])].sort((a, b) => {
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

export function getCardBgStyle(hexColors: string[] | string | null | undefined, hasColorExplicit = false): React.CSSProperties {
  const colors = Array.isArray(hexColors) ? hexColors : (hexColors ? [hexColors] : ['#eab308']);
  const safeColors = colors.length > 0 ? colors : ['#eab308'];
  const firstColor = safeColors[0] || '#eab308';
  
  if (safeColors.length === 1) {
    const {r, g, b} = hexToRgb(firstColor);
    return {
      border: `1px solid rgba(${r},${g},${b}, ${hasColorExplicit ? '0.3' : '0.1'})`,
      borderLeft: `4px solid ${firstColor}`,
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

export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
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

  let successful = false;
  try {
    successful = document.execCommand('copy');
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  } finally {
    document.body.removeChild(textArea);
  }
  return successful;
}

export function extractTimestamp(idOrDate?: string | number): number | null {
  if (!idOrDate) return null;
  if (typeof idOrDate === 'number') return idOrDate;
  
  const parsedDate = new Date(idOrDate).getTime();
  if (!isNaN(parsedDate) && parsedDate > 946684800000) {
    return parsedDate;
  }
  
  const match = String(idOrDate).match(/(?:lg|mg|rg|task)-(\d{10,13})/);
  if (match && match[1]) {
    const ts = parseInt(match[1], 10);
    if (!isNaN(ts) && ts > 946684800000) {
      return ts;
    }
  }
  return null;
}

export function formatCompactDuration(
  createdAt?: string | number,
  completedAt?: string | number,
  isCompleted?: boolean,
  id?: string
): { formatted: string; fullText: string; isCompleted: boolean } | null {
  let startMs = extractTimestamp(createdAt);
  if (!startMs && id) {
    startMs = extractTimestamp(id);
  }
  if (!startMs) return null;

  const completedMs = extractTimestamp(completedAt);
  const endMs = (isCompleted || completedMs) ? (completedMs || Date.now()) : Date.now();

  const diffMs = Math.max(0, endMs - startMs);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHr = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30.4375);

  const startDateStr = new Date(startMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const endDateStr = completedMs ? new Date(completedMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  let formatted = '';

  if (diffSec < 60) {
    formatted = `${diffSec}s`;
  } else if (diffMin < 60) {
    const roundedMin = Math.ceil(diffMs / (1000 * 60));
    formatted = `${roundedMin}m`;
  } else if (diffHr < 24) {
    formatted = `${diffHr}h`;
  } else if (diffDays < 14) {
    formatted = `${diffDays}d`;
  } else if (diffDays < 60) {
    formatted = `${diffWeeks}w`;
  } else {
    formatted = `${diffMonths}M`;
  }

  const completedState = !!(isCompleted || completedMs);
  let fullText = '';
  if (completedState) {
    fullText = endDateStr ? `Achieved on ${endDateStr} (Took ${formatted}, dreamt on ${startDateStr})` : `Achieved (Took ${formatted}, dreamt on ${startDateStr})`;
  } else {
    fullText = `Dreamt on ${startDateStr} (${formatted} ago)`;
  }

  return { formatted, fullText, isCompleted: completedState };
}

