import type {
    ContentDispatchStorage,
    CreatorPersona,
    PlatformConfig,
    ActiveSlot,
    DailyMetrics,
    CompactDayRecord
} from '../types/dispatch';

export const CONTENT_DISPATCH_STORAGE_KEY = 'whatchadoin_content_dispatch';

export function getTodayDateStr(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export function formatDisplayDate(dateStr: string): string {
    const today = getTodayDateStr();
    if (dateStr === today) return 'Today';

    const [y = 2026, m = 1, d = 1] = dateStr.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d);
    const todayDate = new Date();
    const diffDays = Math.round((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === -1) return 'Yesterday';
    if (diffDays === 1) return 'Tomorrow';

    return targetDate.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

export function addDays(dateStr: string, days: number): string {
    const [y = 2026, m = 1, d = 1] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export const DEFAULT_PERSONAS: CreatorPersona[] = [
    {
        id: 'persona_rawx',
        handle: 'hammaadrawx',
        name: 'Hammaad Rawx',
        chromeProfile: 'Profile 1',
        color: '#E1306C',
        platforms: [
            {
                id: 'plat_rawx_ig',
                platform: 'instagram',
                label: 'Instagram Reels',
                composeUrl: 'https://www.instagram.com/',
                color: '#E1306C',
                weeklySchedule: {
                    0: [{ id: 'slot_ig_1', title: 'Live stream clip' }, { id: 'slot_ig_2', title: 'xmfclub clip' }],
                    1: [{ id: 'slot_ig_1', title: 'Live stream clip' }, { id: 'slot_ig_2', title: 'xmfclub clip' }],
                    2: [{ id: 'slot_ig_1', title: 'Live stream clip' }, { id: 'slot_ig_2', title: 'xmfclub clip' }],
                    3: [{ id: 'slot_ig_1', title: 'Live stream clip' }, { id: 'slot_ig_2', title: 'xmfclub clip' }],
                    4: [{ id: 'slot_ig_1', title: 'Live stream clip' }, { id: 'slot_ig_2', title: 'xmfclub clip' }, { id: 'slot_ig_3', title: 'Boxing breakdown' }],
                    5: [{ id: 'slot_ig_1', title: 'Live stream clip' }, { id: 'slot_ig_2', title: 'xmfclub clip' }],
                    6: [{ id: 'slot_ig_1', title: 'Live stream clip' }, { id: 'slot_ig_2', title: 'xmfclub clip' }]
                }
            },
            {
                id: 'plat_rawx_fb',
                platform: 'facebook',
                label: 'Facebook Page',
                composeUrl: 'https://www.facebook.com/',
                color: '#1877F2',
                weeklySchedule: {
                    0: [{ id: 'slot_fb_1', title: 'Daily short clip' }],
                    1: [{ id: 'slot_fb_1', title: 'Daily short clip' }],
                    2: [{ id: 'slot_fb_1', title: 'Daily short clip' }],
                    3: [{ id: 'slot_fb_1', title: 'Daily short clip' }],
                    4: [{ id: 'slot_fb_1', title: 'Daily short clip' }],
                    5: [{ id: 'slot_fb_1', title: 'Daily short clip' }],
                    6: [{ id: 'slot_fb_1', title: 'Daily short clip' }]
                }
            }
        ]
    },
    {
        id: 'persona_works',
        handle: 'hammaadworks',
        name: 'Hammaad Works',
        chromeProfile: 'Profile 2',
        color: '#FF0000',
        platforms: [
            {
                id: 'plat_works_yt',
                platform: 'youtube',
                label: 'YouTube Shorts',
                composeUrl: 'https://studio.youtube.com/',
                color: '#FF0000',
                weeklySchedule: {
                    0: [{ id: 'slot_yt_1', title: 'Dev / Workflow insight' }],
                    1: [{ id: 'slot_yt_1', title: 'Dev / Workflow insight' }],
                    2: [{ id: 'slot_yt_1', title: 'Dev / Workflow insight' }],
                    3: [{ id: 'slot_yt_1', title: 'Dev / Workflow insight' }],
                    4: [{ id: 'slot_yt_1', title: 'Dev / Workflow insight' }],
                    5: [{ id: 'slot_yt_1', title: 'Dev / Workflow insight' }],
                    6: [{ id: 'slot_yt_1', title: 'Dev / Workflow insight' }]
                }
            },
            {
                id: 'plat_works_x',
                platform: 'x',
                label: 'X (Twitter)',
                composeUrl: 'https://x.com/compose/post',
                color: '#FFFFFF',
                weeklySchedule: {
                    0: [{ id: 'slot_x_1', title: 'Tech tip / Build log' }],
                    1: [{ id: 'slot_x_1', title: 'Tech tip / Build log' }],
                    2: [{ id: 'slot_x_1', title: 'Tech tip / Build log' }],
                    3: [{ id: 'slot_x_1', title: 'Tech tip / Build log' }],
                    4: [{ id: 'slot_x_1', title: 'Tech tip / Build log' }],
                    5: [{ id: 'slot_x_1', title: 'Tech tip / Build log' }],
                    6: [{ id: 'slot_x_1', title: 'Tech tip / Build log' }]
                }
            },
            {
                id: 'plat_works_li',
                platform: 'linkedin',
                label: 'LinkedIn',
                composeUrl: 'https://www.linkedin.com/feed/',
                color: '#0A66C2',
                weeklySchedule: {
                    1: [{ id: 'slot_li_1', title: 'Weekly professional recap' }],
                    3: [{ id: 'slot_li_2', title: 'Engineering post' }]
                }
            }
        ]
    },
    {
        id: 'persona_ihsanity',
        handle: 'ihsanity',
        name: 'ihsanity',
        chromeProfile: 'Profile 3',
        color: '#00F5D4',
        platforms: [
            {
                id: 'plat_ih_threads',
                platform: 'threads',
                label: 'Threads',
                composeUrl: 'https://www.threads.net/',
                color: '#EDE7D9',
                weeklySchedule: {
                    0: [{ id: 'slot_th_1', title: 'Daily thought / meme' }],
                    1: [{ id: 'slot_th_1', title: 'Daily thought / meme' }],
                    2: [{ id: 'slot_th_1', title: 'Daily thought / meme' }],
                    3: [{ id: 'slot_th_1', title: 'Daily thought / meme' }],
                    4: [{ id: 'slot_th_1', title: 'Daily thought / meme' }],
                    5: [{ id: 'slot_th_1', title: 'Daily thought / meme' }],
                    6: [{ id: 'slot_th_1', title: 'Daily thought / meme' }]
                }
            },
            {
                id: 'plat_ih_x',
                platform: 'x',
                label: 'X (ihsanity)',
                composeUrl: 'https://x.com/compose/post',
                color: '#FFFFFF',
                weeklySchedule: {
                    0: [{ id: 'slot_ih_x_1', title: 'Casual observation' }],
                    1: [{ id: 'slot_ih_x_1', title: 'Casual observation' }],
                    2: [{ id: 'slot_ih_x_1', title: 'Casual observation' }],
                    3: [{ id: 'slot_ih_x_1', title: 'Casual observation' }],
                    4: [{ id: 'slot_ih_x_1', title: 'Casual observation' }],
                    5: [{ id: 'slot_ih_x_1', title: 'Casual observation' }],
                    6: [{ id: 'slot_ih_x_1', title: 'Casual observation' }]
                }
            }
        ]
    }
];

export function pruneOldDays(data: ContentDispatchStorage, referenceDateStr = getTodayDateStr()): ContentDispatchStorage {
    // Strictly rolling 7-day window: keep today + past 6 days
    const cutoffDateStr = addDays(referenceDateStr, -7);
    const updatedDays: Record<string, CompactDayRecord> = {};

    for (const [dateStr, dayRecord] of Object.entries(data.days || {})) {
        if (dateStr >= cutoffDateStr) {
            const hasCompleted = (dayRecord.completedSlotIds || []).length > 0;
            const hasAdHoc = (dayRecord.adHocSlots || []).length > 0;
            if (hasCompleted || hasAdHoc) {
                updatedDays[dateStr] = dayRecord;
            }
        }
    }

    return {
        ...data,
        days: updatedDays
    };
}

export function loadDispatchData(): ContentDispatchStorage {
    if (typeof localStorage === 'undefined') {
        return { personas: DEFAULT_PERSONAS, days: {} };
    }
    try {
        const raw = localStorage.getItem(CONTENT_DISPATCH_STORAGE_KEY);
        if (!raw) {
            return {
                personas: DEFAULT_PERSONAS,
                days: {}
            };
        }
        const parsed = JSON.parse(raw) as ContentDispatchStorage;
        if (!parsed.personas || parsed.personas.length === 0) {
            parsed.personas = DEFAULT_PERSONAS;
        }
        if (!parsed.days) {
            parsed.days = {};
        }
        return parsed;
    } catch {
        return { personas: DEFAULT_PERSONAS, days: {} };
    }
}

export function saveDispatchData(data: ContentDispatchStorage): void {
    if (typeof localStorage === 'undefined') return;
    try {
        const pruned = pruneOldDays(data);
        localStorage.setItem(CONTENT_DISPATCH_STORAGE_KEY, JSON.stringify(pruned));
        window.dispatchEvent(new CustomEvent('whatchadoin_dispatch_updated'));
    } catch (e) {
        console.error('Failed to save content dispatch data:', e);
    }
}

/**
 * Returns all active slots for a given platform on dateStr.
 * Combines template slots for that day of week with ad-hoc slots,
 * and sets completed status according to completedSlotIds.
 */
export function getResolvedPlatformSlots(
    data: ContentDispatchStorage,
    dateStr: string,
    platform: PlatformConfig
): ActiveSlot[] {
    const dayRecord = data.days?.[dateStr] || { completedSlotIds: [], adHocSlots: [] };
    const completedSet = new Set(dayRecord.completedSlotIds || []);

    const [y = 2026, m = 1, d = 1] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const templateSlots = platform.weeklySchedule?.[dayOfWeek] || [];

    const resolvedTemplateSlots: ActiveSlot[] = templateSlots.map(t => ({
        id: t.id,
        title: t.title,
        notes: t.defaultNotes,
        completed: completedSet.has(t.id),
        isAdHoc: false
    }));

    // Filter ad-hoc slots belonging to this platform
    const platformAdHocSlots: ActiveSlot[] = (dayRecord.adHocSlots || [])
        .filter(slot => slot.id.startsWith(`${platform.id}_`))
        .map(slot => ({
            ...slot,
            completed: completedSet.has(slot.id),
            isAdHoc: true
        }));

    return [...resolvedTemplateSlots, ...platformAdHocSlots];
}

export function toggleSlotCompletion(
    data: ContentDispatchStorage,
    dateStr: string,
    slotId: string
): ContentDispatchStorage {
    const dayRecord = data.days?.[dateStr] || { completedSlotIds: [], adHocSlots: [] };
    const completedSet = new Set(dayRecord.completedSlotIds || []);

    if (completedSet.has(slotId)) {
        completedSet.delete(slotId);
    } else {
        completedSet.add(slotId);
    }

    const updatedDays = {
        ...data.days,
        [dateStr]: {
            ...dayRecord,
            completedSlotIds: Array.from(completedSet)
        }
    };

    const updated = { ...data, days: updatedDays };
    saveDispatchData(updated);
    return updated;
}

export function addAdHocSlot(
    data: ContentDispatchStorage,
    dateStr: string,
    platformId: string,
    title: string
): ContentDispatchStorage {
    if (!title.trim()) return data;

    const dayRecord = data.days?.[dateStr] || { completedSlotIds: [], adHocSlots: [] };
    const newSlot: ActiveSlot = {
        id: `${platformId}_adhoc_${Date.now()}`,
        title: title.trim(),
        completed: false,
        isAdHoc: true
    };

    const updatedDays = {
        ...data.days,
        [dateStr]: {
            ...dayRecord,
            adHocSlots: [...(dayRecord.adHocSlots || []), newSlot]
        }
    };

    const updated = { ...data, days: updatedDays };
    saveDispatchData(updated);
    return updated;
}

export function deleteSlot(
    data: ContentDispatchStorage,
    dateStr: string,
    slotId: string
): ContentDispatchStorage {
    const dayRecord = data.days?.[dateStr];
    if (!dayRecord) return data;

    const completedSet = new Set(dayRecord.completedSlotIds || []);
    completedSet.delete(slotId);

    const updatedAdHoc = (dayRecord.adHocSlots || []).filter(s => s.id !== slotId);

    const updatedDays = {
        ...data.days,
        [dateStr]: {
            ...dayRecord,
            completedSlotIds: Array.from(completedSet),
            adHocSlots: updatedAdHoc
        }
    };

    const updated = { ...data, days: updatedDays };
    saveDispatchData(updated);
    return updated;
}

export function calculateDailyMetrics(
    data: ContentDispatchStorage,
    dateStr: string,
    personaFilterId?: string
): DailyMetrics {
    let completed = 0;
    let total = 0;

    const personas = data.personas || [];
    const activePersonas = personaFilterId && personaFilterId !== 'all'
        ? personas.filter(p => p.id === personaFilterId)
        : personas;

    for (const persona of activePersonas) {
        for (const platform of persona.platforms || []) {
            const slots = getResolvedPlatformSlots(data, dateStr, platform);
            total += slots.length;
            completed += slots.filter(s => s.completed).length;
        }
    }

    const remaining = Math.max(0, total - completed);
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 100;
    const isAllComplete = total > 0 && completed >= total;

    return { completed, total, remaining, percentage, isAllComplete };
}

export function mergeDispatchData(
    currentData: ContentDispatchStorage | null,
    incomingData: Partial<ContentDispatchStorage>
): ContentDispatchStorage {
    const base = currentData || { personas: DEFAULT_PERSONAS, days: {} };
    if (!incomingData || typeof incomingData !== 'object') return base;

    // Merge personas non-destructively: preserve existing personas, add new incoming ones
    const existingPersonaMap = new Map((base.personas || []).map(p => [p.id, p]));
    const mergedPersonas = [...(base.personas || [])];

    for (const incPersona of incomingData.personas || []) {
        if (!incPersona || !incPersona.id) continue;
        if (!existingPersonaMap.has(incPersona.id)) {
            mergedPersonas.push(incPersona);
            existingPersonaMap.set(incPersona.id, incPersona);
        }
    }

    // Merge day records
    const mergedDays: Record<string, CompactDayRecord> = { ...(base.days || {}) };
    for (const [dateStr, incDay] of Object.entries(incomingData.days || {})) {
        if (!incDay) continue;
        const curDay = mergedDays[dateStr];
        if (!curDay) {
            mergedDays[dateStr] = incDay;
        } else {
            const completedSet = new Set([...(curDay.completedSlotIds || []), ...(incDay.completedSlotIds || [])]);
            const existingAdHocIds = new Set((curDay.adHocSlots || []).map(s => s.id));
            const mergedAdHoc = [...(curDay.adHocSlots || [])];
            for (const slot of incDay.adHocSlots || []) {
                if (slot && !existingAdHocIds.has(slot.id)) {
                    mergedAdHoc.push(slot);
                    existingAdHocIds.add(slot.id);
                }
            }
            mergedDays[dateStr] = {
                completedSlotIds: Array.from(completedSet),
                adHocSlots: mergedAdHoc
            };
        }
    }

    return {
        personas: mergedPersonas.length > 0 ? mergedPersonas : DEFAULT_PERSONAS,
        days: mergedDays,
        selectedPersonaId: base.selectedPersonaId || incomingData.selectedPersonaId
    };
}

/**
 * Designated Chrome Profile Launcher:
 * Attempts to hit the local Vite endpoint `/api/launch-chrome`.
 * If running on remote/offline or on error, falls back to `window.open(url, '_blank')`.
 */
export async function launchChromeProfile(profileName: string, targetUrl: string): Promise<{ success: boolean; fallbackUsed?: boolean }> {
    if (!targetUrl) return { success: false };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600);

        const response = await fetch(
            `/api/launch-chrome?profile=${encodeURIComponent(profileName)}&url=${encodeURIComponent(targetUrl)}`,
            { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                return { success: true };
            }
        }
    } catch {
        // Endpoint not running or fetch timed out / remote host
    }

    // Fallback: open URL directly in browser
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    return { success: true, fallbackUsed: true };
}
