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

export function getGoalColor(
  goal: Record<string, any>,
  routineGoals: Record<string, any>[] | null | undefined,
  lifeGoals: Record<string, any>[] | null | undefined
): string {
  const linkedRoutineGoal = routineGoals?.find((sg: any) => sg.id === goal.routineGoalId);
  const linkedLifeGoal = lifeGoals?.find((lg: any) => lg.id === goal.lifeGoalId);

  let hex = '#ffffff';
  if (goal.color) {
    hex = goal.color;
  } else if (linkedRoutineGoal && linkedRoutineGoal.color) {
    hex = linkedRoutineGoal.color;
  } else if (linkedLifeGoal && linkedLifeGoal.color) {
    hex = linkedLifeGoal.color;
  }
  return hex;
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

export function getCardBgStyle(hexColor: string | null | undefined): Record<string, string> {
  const hex = hexColor || '#eab308';
  const r = parseInt(hex.slice(1,3), 16) || 255;
  const g = parseInt(hex.slice(3,5), 16) || 255;
  const b = parseInt(hex.slice(5,7), 16) || 255;
  return {
    borderLeft: `4px solid ${hex}`,
    background: `rgba(${r},${g},${b},0.1)`,
  };
}
