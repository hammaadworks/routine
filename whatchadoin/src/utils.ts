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
  mentionQuery: string | null | undefined
): { allGoals: Record<string, any>[]; filteredGoals: Record<string, any>[] } {
  const allGoals = [
    ...(routineGoals || []).map((g: any) => ({ ...g, type: 'Routine' })),
    ...(habits || []).map((g: any) => ({ ...g, type: 'Routine' })),
    ...(lifeGoals || []).map((g: any) => ({ ...g, type: 'Life' }))
  ];
  const filteredGoals = allGoals.filter((g: any) => 
    (g.task || g.text || '').toLowerCase().includes((mentionQuery || '').toLowerCase())
  );
  return { allGoals, filteredGoals };
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
  lifeGoals: Record<string, any>[] | null | undefined
): string[] {
  if (goal.color) {
    return [goal.color];
  }

  const colors: string[] = [];

  const rIds = Array.isArray(goal.routineGoalIds) ? goal.routineGoalIds : (goal.routineGoalId ? [goal.routineGoalId] : []);
  const lIds = Array.isArray(goal.lifeGoalIds) ? goal.lifeGoalIds : (goal.lifeGoalId ? [goal.lifeGoalId] : []);

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
