import { useMemo, useState, useRef, useEffect } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip
} from 'recharts';
import {
    CalendarDays,
    Clock,
    PieChart as PieChartIcon,
    Search,
    ArrowUpDown,
    X,
    Sparkles,
    Info,
    Maximize2,
    Minimize2,
    ChevronDown,
    ChevronUp,
    CalendarClock
} from 'lucide-react';
import { getGoalColor, formatDuration, getEffectiveHabitBlocks } from '../../utils';

const COLOR_PALETTE = [
    '#FF595E', '#FF9F1C', '#FFCA3A', '#8AC926', '#00F5D4',
    '#1982C4', '#4361EE', '#6A4C93', '#F15BB5', '#E07A5F',
    '#00B4D8', '#52B788', '#E76F51', '#2A9D8F', '#E9C46A'
];

const DAYS_OF_WEEK = [
    { name: 'Sunday', short: 'Sun', index: 0 },
    { name: 'Monday', short: 'Mon', index: 1 },
    { name: 'Tuesday', short: 'Tue', index: 2 },
    { name: 'Wednesday', short: 'Wed', index: 3 },
    { name: 'Thursday', short: 'Thu', index: 4 },
    { name: 'Friday', short: 'Fri', index: 5 },
    { name: 'Saturday', short: 'Sat', index: 6 },
];

function formatHoursFriendly(mins: number): string {
    if (mins <= 0) return '0m';
    if (mins < 60) return `${mins}m`;
    const hrs = mins / 60;
    const formatted = hrs % 1 === 0 ? hrs.toFixed(0) : hrs.toFixed(1).replace(/\.0$/, '');
    return `${formatted}h`;
}

function formatMinutesToTime(totalMins: number): string {
    const normalized = Math.max(0, Math.min(1439, totalMins));
    const h24 = Math.floor(normalized / 60);
    const m = normalized % 60;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const mStr = String(m).padStart(2, '0');
    return `${h12}:${mStr} ${ampm}`;
}

export interface DayBlockItem {
    id: string;
    name: string;
    duration: number;
    startTime?: number;
}

export interface DayAllocation {
    day: string;
    dayShort: string;
    templateId: string;
    templateName: string;
    duration: number;
    blocks: DayBlockItem[];
}

export interface HabitWeeklyAllocation {
    habit: any;
    id: string;
    name: string;
    color: string;
    totalWeeklyMins: number;
    allocationsByDay: DayAllocation[];
    dayCount: number;
    isAllocated: boolean;
    avgMinsPerDay: number;
    avgMinsPerActiveDay: number;
    percentOfDay: number;
}

interface HabitWeeklyPieViewProps {
    habits: any[];
    templates: any[];
    dayMapping: Record<string, string> | undefined;
    activeTemplateId: string | null;
    routineGoals?: any[];
    lifeGoals?: any[];
    moneyGoals?: any[];
    isPublicView?: boolean;
    isPcExpanded?: boolean;
    onTogglePcExpand?: () => void;
    onBackToList?: () => void;
    onCardClick?: (habit: any) => void;
}

export default function HabitWeeklyPieView({
    habits,
    templates,
    dayMapping,
    activeTemplateId,
    routineGoals = [],
    lifeGoals = [],
    moneyGoals = [],
    isPublicView = false,
    isPcExpanded = false,
    onTogglePcExpand,
    onBackToList,
    onCardClick
}: HabitWeeklyPieViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);

    const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
    const [hoveredHabitId, setHoveredHabitId] = useState<string | null>(null);
    const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'habit' | 'day'>('habit');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortAscending, setSortAscending] = useState(true);

    // Track container width for responsive 2-column or 1-column layouts
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const isWideLayout = isPcExpanded || containerWidth >= 490;

    // 1. Resolve the week's templates for each of the 7 days
    const weekSchedule = useMemo(() => {
        const safeTemplates = templates || [];
        const hasAnyDayMapping = Object.values(dayMapping || {}).some(val =>
            Boolean(val && safeTemplates.some(t => t.id === val))
        );

        return DAYS_OF_WEEK.map(({ name, short, index }) => {
            let tId = dayMapping?.[name]
                || dayMapping?.[name.toLowerCase()]
                || dayMapping?.[short]
                || dayMapping?.[index]
                || dayMapping?.[String(index)];

            if (!tId && !hasAnyDayMapping) {
                tId = activeTemplateId || safeTemplates[0]?.id;
            }

            const template = safeTemplates.find(t => t.id === tId) || null;
            const totalTemplateMins = (template?.blocks || []).reduce((acc: number, b: any) => acc + (b.duration || 0), 0);

            return {
                dayName: name,
                dayShort: short,
                dayIndex: index,
                templateId: template?.id || null,
                templateName: template?.name || 'Unscheduled',
                template,
                totalTemplateMins
            };
        });
    }, [templates, dayMapping, activeTemplateId]);

    // Unique active templates in the week
    const uniqueTemplates = useMemo(() => {
        const map = new Map<string, { id: string; name: string; days: string[] }>();
        weekSchedule.forEach(ws => {
            if (ws.templateId && ws.template) {
                const existing = map.get(ws.templateId);
                if (existing) {
                    existing.days.push(ws.dayShort);
                } else {
                    map.set(ws.templateId, {
                        id: ws.templateId,
                        name: ws.templateName,
                        days: [ws.dayShort]
                    });
                }
            }
        });
        return Array.from(map.values());
    }, [weekSchedule]);

    // 2. Compute weekly allocations for all visible habits
    const { allocatedHabits, unallocatedHabits, totalWeeklyMinsAll, maxAllocatedMins, overallDailyAvgMins, overallDailyCapacityPercent } = useMemo(() => {
        const visibleHabits = (habits || []).filter(h =>
            !isPublicView || h.isPublic || (h.name || '').includes('[public]')
        );

        let totalWeeklySum = 0;

        const processed: HabitWeeklyAllocation[] = visibleHabits.map((habit, idx) => {
            const hColors = getGoalColor(habit, routineGoals, lifeGoals, moneyGoals);
            const color = (hColors && hColors[0]) || habit.color || COLOR_PALETTE[idx % COLOR_PALETTE.length];

            let habitWeeklyMins = 0;
            const allocationsByDay: DayAllocation[] = [];

            weekSchedule.forEach(ws => {
                if (!ws.template || !ws.template.blocks) return;

                const effBlocks = getEffectiveHabitBlocks(ws.template.blocks);
                const matchingBlocks = effBlocks.filter((b: any) => {
                    const matchId = b.routineGoalId && String(b.routineGoalId) === String(habit.id);
                    const matchName = b.name && habit.name && b.name.trim().toLowerCase() === habit.name.trim().toLowerCase();
                    return matchId || matchName;
                });

                if (matchingBlocks.length > 0) {
                    const dayDuration = matchingBlocks.reduce((acc: number, b: any) => acc + (b.duration || 0), 0);
                    habitWeeklyMins += dayDuration;
                    allocationsByDay.push({
                        day: ws.dayName,
                        dayShort: ws.dayShort,
                        templateId: ws.templateId || '',
                        templateName: ws.templateName,
                        duration: dayDuration,
                        blocks: matchingBlocks.map((b: any) => ({
                            id: b.id,
                            name: b.bundleName ? `[${b.bundleName}] ${b.name}` : b.name,
                            duration: b.duration || 0,
                            startTime: typeof b.startTime === 'number' ? b.startTime : undefined
                        }))
                    });
                }
            });

            totalWeeklySum += habitWeeklyMins;

            const avgMinsPerDay = Math.round(habitWeeklyMins / 7);
            const avgMinsPerActiveDay = allocationsByDay.length > 0
                ? Math.round(habitWeeklyMins / allocationsByDay.length)
                : 0;
            const percentOfDay = Number(((avgMinsPerDay / 1440) * 100).toFixed(1));

            return {
                habit,
                id: habit.id,
                name: habit.name || 'Untitled Habit',
                color,
                totalWeeklyMins: habitWeeklyMins,
                allocationsByDay,
                dayCount: allocationsByDay.length,
                isAllocated: habitWeeklyMins > 0,
                avgMinsPerDay,
                avgMinsPerActiveDay,
                percentOfDay
            };
        });

        // Split into allocated vs unallocated
        const allocated = processed.filter(p => p.isAllocated);
        const unallocated = processed.filter(p => !p.isAllocated);

        // Sort allocated: lowest to highest by default (or highest to lowest)
        allocated.sort((a, b) => {
            if (sortAscending) {
                return a.totalWeeklyMins - b.totalWeeklyMins || a.name.localeCompare(b.name);
            }
            return b.totalWeeklyMins - a.totalWeeklyMins || a.name.localeCompare(b.name);
        });

        // Unallocated habits stay at the last, sorted by name
        unallocated.sort((a, b) => a.name.localeCompare(b.name));

        const maxMins = allocated.reduce((max, h) => Math.max(max, h.totalWeeklyMins), 1);
        const overallDailyAvgMins = Math.round(totalWeeklySum / 7);
        const overallDailyCapacityPercent = Number(((overallDailyAvgMins / 1440) * 100).toFixed(1));

        return {
            allocatedHabits: allocated,
            unallocatedHabits: unallocated,
            totalWeeklyMinsAll: totalWeeklySum,
            maxAllocatedMins: maxMins,
            overallDailyAvgMins,
            overallDailyCapacityPercent
        };
    }, [habits, isPublicView, weekSchedule, routineGoals, lifeGoals, moneyGoals, sortAscending]);

    // Active habit for donut center readout (hover takes priority, then selection)
    const activeDisplayHabit = useMemo(() => {
        const targetId = hoveredHabitId || selectedHabitId;
        if (!targetId) return null;
        return allocatedHabits.find(h => h.id === targetId)
            || unallocatedHabits.find(h => h.id === targetId)
            || null;
    }, [hoveredHabitId, selectedHabitId, allocatedHabits, unallocatedHabits]);

    // Selected habit data
    const selectedAllocation = useMemo(() => {
        if (!selectedHabitId) return null;
        return allocatedHabits.find(h => h.id === selectedHabitId)
            || unallocatedHabits.find(h => h.id === selectedHabitId)
            || null;
    }, [selectedHabitId, allocatedHabits, unallocatedHabits]);

    // Filter allocated habits by search query AND day filter
    const filteredAllocated = useMemo(() => {
        let list = allocatedHabits;
        if (selectedDayFilter) {
            list = list.filter(h => h.allocationsByDay.some(d => d.day === selectedDayFilter));
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(h => h.name.toLowerCase().includes(q));
        }
        return list;
    }, [allocatedHabits, selectedDayFilter, searchQuery]);

    // Filter unallocated habits
    const filteredUnallocated = useMemo(() => {
        if (selectedDayFilter) return []; // Unallocated habits are not on any day
        if (!searchQuery.trim()) return unallocatedHabits;
        const q = searchQuery.toLowerCase().trim();
        return unallocatedHabits.filter(h => h.name.toLowerCase().includes(q));
    }, [unallocatedHabits, selectedDayFilter, searchQuery]);

    // Day schedule breakdown for "By Day" view
    const dayBreakdownList = useMemo(() => {
        return weekSchedule.map(ws => {
            const dayHabits: Array<{
                habit: any;
                id: string;
                name: string;
                color: string;
                duration: number;
                blocks: DayBlockItem[];
            }> = [];

            allocatedHabits.forEach(h => {
                const dayAlloc = h.allocationsByDay.find(d => d.day === ws.dayName);
                if (dayAlloc) {
                    dayHabits.push({
                        habit: h.habit,
                        id: h.id,
                        name: h.name,
                        color: h.color,
                        duration: dayAlloc.duration,
                        blocks: dayAlloc.blocks
                    });
                }
            });

            // Sort habits on this day by start time if available, otherwise by duration
            dayHabits.sort((a, b) => {
                const aStart = a.blocks[0]?.startTime ?? 9999;
                const bStart = b.blocks[0]?.startTime ?? 9999;
                return aStart - bStart || b.duration - a.duration;
            });

            const dayTotalAllocatedMins = dayHabits.reduce((acc, dh) => acc + dh.duration, 0);

            return {
                ...ws,
                habits: dayHabits,
                totalAllocatedMins: dayTotalAllocatedMins
            };
        });
    }, [weekSchedule, allocatedHabits]);

    // Handle selecting a habit from pie or list
    const handleSelectHabit = (habitId: string) => {
        setSelectedHabitId(prev => {
            const next = prev === habitId ? null : habitId;
            if (next) {
                // Scroll into view if needed
                setTimeout(() => {
                    const el = document.getElementById(`pie-habit-row-${habitId}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, 50);
            }
            return next;
        });
    };

    // Tooltip renderer for PieChart
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data: HabitWeeklyAllocation = payload[0].payload;
            const percent = totalWeeklyMinsAll > 0
                ? ((data.totalWeeklyMins / totalWeeklyMinsAll) * 100).toFixed(1)
                : '0';

            return (
                <div style={{
                    background: '#181C20',
                    border: `1px solid ${data.color || 'var(--panel-border)'}`,
                    borderRadius: '8px',
                    padding: '8px 12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    color: '#EDE7D9',
                    fontSize: '12px',
                    minWidth: '185px',
                    pointerEvents: 'none',
                    zIndex: 1000
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                        <span style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: data.color,
                            display: 'inline-block'
                        }} />
                        <span style={{ fontWeight: 600 }}>{data.name}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                        <span>Weekly Total:</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                            {formatHoursFriendly(data.totalWeeklyMins)} ({formatDuration(data.totalWeeklyMins)})
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                        <span>Daily Pace (7d):</span>
                        <span style={{ color: '#00F5D4', fontWeight: 600 }}>
                            ~{formatDuration(data.avgMinsPerDay)}/day
                        </span>
                    </div>

                    {data.dayCount < 7 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                            <span>Active Day Avg:</span>
                            <span style={{ color: '#fff', fontWeight: 500 }}>
                                {formatDuration(data.avgMinsPerActiveDay)}/session ({data.dayCount}d)
                            </span>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                        <span>Share of Routine:</span>
                        <span style={{ color: '#fff', fontWeight: 500 }}>{percent}%</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                        <span>Share of 24h Day:</span>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{data.percentOfDay}%</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                        <span>Frequency:</span>
                        <span>{data.dayCount} / 7 days</span>
                    </div>

                    <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--accent)', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px' }}>
                        Click to view day breakdown
                    </div>
                </div>
            );
        }
        return null;
    };

    // Render the interactive Donut Chart component
    const renderPieChartCard = (compact: boolean = false) => {
        const chartHeight = compact ? 175 : 210;
        const outerRad = compact ? 70 : 85;
        const innerRad = compact ? 46 : 56;

        return (
            <div style={{
                background: 'rgba(20, 24, 28, 0.75)',
                border: '1px solid var(--panel-border)',
                borderRadius: '10px',
                padding: compact ? '10px 12px' : '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0,
                position: 'relative'
            }}>
                <div style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2px'
                }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>
                        WEEKLY ALLOCATION PIE
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 500 }}>
                        {allocatedHabits.length} habits • {formatHoursFriendly(totalWeeklyMinsAll)} (~{formatDuration(overallDailyAvgMins)}/day)
                    </span>
                </div>

                <div style={{ width: '100%', height: `${chartHeight}px`, position: 'relative' }}>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                        <PieChart>
                            <Pie
                                data={allocatedHabits}
                                dataKey="totalWeeklyMins"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={innerRad}
                                outerRadius={outerRad}
                                paddingAngle={2}
                                cursor="pointer"
                                onMouseEnter={(entry: any) => {
                                    if (entry && entry.id) setHoveredHabitId(entry.id);
                                }}
                                onMouseLeave={() => setHoveredHabitId(null)}
                                onClick={(entry: any) => {
                                    if (entry && entry.id) {
                                        handleSelectHabit(entry.id);
                                    }
                                }}
                            >
                                {allocatedHabits.map((entry) => {
                                    const isSelected = selectedHabitId === entry.id;
                                    const isHovered = hoveredHabitId === entry.id;
                                    return (
                                        <Cell
                                            key={`pie-cell-${entry.id}`}
                                            fill={entry.color}
                                            stroke={isSelected || isHovered ? '#FFFFFF' : 'rgba(0,0,0,0.6)'}
                                            strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                                            style={{
                                                outline: 'none',
                                                filter: isSelected
                                                    ? 'drop-shadow(0 0 8px rgba(255,255,255,0.5))'
                                                    : isHovered
                                                        ? 'drop-shadow(0 0 5px rgba(255,255,255,0.3))'
                                                        : 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        />
                                    );
                                })}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Dynamic Center Donut Label */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        pointerEvents: 'none',
                        maxWidth: compact ? '86px' : '105px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {activeDisplayHabit ? (
                            <>
                                <div style={{
                                    fontSize: '9.5px',
                                    fontWeight: 600,
                                    color: activeDisplayHabit.color || 'var(--accent)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    width: '100%',
                                    lineHeight: 1.2
                                }}>
                                    {activeDisplayHabit.name}
                                </div>
                                <div style={{
                                    fontSize: compact ? '13px' : '15px',
                                    fontWeight: 700,
                                    color: '#fff',
                                    marginTop: '1px',
                                    lineHeight: 1.1
                                }}>
                                    {formatHoursFriendly(activeDisplayHabit.totalWeeklyMins)}/wk
                                </div>
                                <div style={{
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    color: 'var(--accent)',
                                    marginTop: '1px',
                                    lineHeight: 1.1
                                }}>
                                    ~{formatDuration(activeDisplayHabit.avgMinsPerDay)}/day
                                </div>
                                <div style={{
                                    fontSize: '8.5px',
                                    color: 'var(--text-secondary)',
                                    marginTop: '1px'
                                }}>
                                    {activeDisplayHabit.dayCount}d/wk • {totalWeeklyMinsAll > 0
                                        ? `${((activeDisplayHabit.totalWeeklyMins / totalWeeklyMinsAll) * 100).toFixed(0)}%`
                                        : '0%'}
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{
                                    fontSize: compact ? '14px' : '16px',
                                    fontWeight: 700,
                                    color: 'var(--accent)',
                                    lineHeight: 1.1
                                }}>
                                    {formatHoursFriendly(totalWeeklyMinsAll)}
                                </div>
                                <div style={{
                                    fontSize: '9px',
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.4px',
                                    marginTop: '1px'
                                }}>
                                    Total Week
                                </div>
                                <div style={{
                                    fontSize: '9.5px',
                                    color: '#00F5D4',
                                    fontWeight: 600,
                                    marginTop: '1px'
                                }}>
                                    ~{formatDuration(overallDailyAvgMins)}/day
                                </div>
                                <div style={{
                                    fontSize: '8px',
                                    color: 'rgba(255,255,255,0.4)',
                                    marginTop: '1px'
                                }}>
                                    {allocatedHabits.length} habits
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Sub-chart quick interactive stats & hint */}
                <div style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '2px',
                    paddingTop: '6px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    fontSize: '10.5px',
                    color: 'var(--text-secondary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={11} color="var(--accent)" />
                        <span>{selectedHabitId ? 'Click slice to deselect' : 'Click slice to inspect breakdown'}</span>
                    </div>

                    {selectedHabitId && (
                        <button
                            type="button"
                            onClick={() => setSelectedHabitId(null)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--accent)',
                                fontSize: '10px',
                                cursor: 'pointer',
                                padding: '1px 4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px'
                            }}
                        >
                            <span>Clear</span>
                            <X size={10} />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // Render the Interactive 7-Day Pill Bar
    const renderDayPillBar = () => {
        return (
            <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '6px 8px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '5px',
                    fontSize: '10.5px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        <CalendarDays size={12} color="var(--accent)" />
                        <span>Filter by Day ({uniqueTemplates.length} {uniqueTemplates.length === 1 ? 'template' : 'templates'})</span>
                    </div>
                    {selectedDayFilter ? (
                        <button
                            type="button"
                            onClick={() => setSelectedDayFilter(null)}
                            style={{
                                background: 'rgba(201, 162, 39, 0.15)',
                                border: '1px solid var(--accent)',
                                borderRadius: '4px',
                                color: 'var(--accent)',
                                fontSize: '10px',
                                padding: '1px 6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                            }}
                        >
                            <span>{selectedDayFilter}</span>
                            <X size={10} />
                        </button>
                    ) : (
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                            Click day to filter
                        </span>
                    )}
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                    gap: '3px'
                }}>
                    {weekSchedule.map((ws) => {
                        const isDayFilterActive = selectedDayFilter === ws.dayName;
                        const habitAlloc = selectedAllocation?.allocationsByDay.find(
                            d => d.day === ws.dayName
                        );
                        const isDayActiveForSelectedHabit = Boolean(habitAlloc);

                        return (
                            <button
                                key={ws.dayName}
                                type="button"
                                onClick={() => setSelectedDayFilter(prev => prev === ws.dayName ? null : ws.dayName)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    minWidth: 0,
                                    padding: '3px 2px',
                                    borderRadius: '5px',
                                    background: isDayFilterActive
                                        ? 'rgba(201, 162, 39, 0.25)'
                                        : isDayActiveForSelectedHabit
                                            ? 'rgba(201, 162, 39, 0.15)'
                                            : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${
                                        isDayFilterActive
                                            ? 'var(--accent)'
                                            : isDayActiveForSelectedHabit
                                                ? (selectedAllocation?.color || 'var(--accent)')
                                                : 'rgba(255,255,255,0.06)'
                                    }`,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    textAlign: 'center',
                                    outline: 'none'
                                }}
                                title={`${ws.dayName}: ${ws.templateName} (${formatHoursFriendly(ws.totalTemplateMins)})${habitAlloc ? ` • ${selectedAllocation?.name}: ${formatDuration(habitAlloc.duration)}` : ''}`}
                            >
                                <span style={{
                                    fontSize: '9.5px',
                                    fontWeight: 700,
                                    color: isDayFilterActive || isDayActiveForSelectedHabit
                                        ? 'var(--accent)'
                                        : 'var(--text-secondary)'
                                }}>
                                    {ws.dayShort}
                                </span>
                                <span style={{
                                    fontSize: '8.5px',
                                    color: isDayActiveForSelectedHabit
                                        ? '#fff'
                                        : isDayFilterActive
                                            ? 'var(--accent)'
                                            : 'rgba(255,255,255,0.4)',
                                    marginTop: '1px',
                                    fontWeight: isDayActiveForSelectedHabit ? 600 : 400
                                }}>
                                    {isDayActiveForSelectedHabit && habitAlloc
                                        ? formatHoursFriendly(habitAlloc.duration)
                                        : formatHoursFriendly(ws.totalTemplateMins)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Render the Habit List with Accordion items
    const renderHabitList = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '0 2px'
                }}>
                    <span>
                        Allocated Habits ({filteredAllocated.length})
                        {selectedDayFilter && <span style={{ color: 'var(--accent)', marginLeft: '4px', textTransform: 'none' }}>on {selectedDayFilter}</span>}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 'normal', color: 'var(--accent)' }}>
                        Sorted {sortAscending ? 'lowest → highest' : 'highest → lowest'}
                    </span>
                </div>

                {filteredAllocated.length === 0 ? (
                    <div style={{
                        padding: '16px',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.04)'
                    }}>
                        {selectedDayFilter
                            ? `No habits scheduled on ${selectedDayFilter}`
                            : 'No matching allocated habits found'}
                    </div>
                ) : (
                    filteredAllocated.map((h) => {
                        const isSelected = selectedHabitId === h.id;
                        const percent = totalWeeklyMinsAll > 0
                            ? ((h.totalWeeklyMins / totalWeeklyMinsAll) * 100).toFixed(1)
                            : '0';

                        // Proportional progress bar width relative to highest habit
                        const barWidthPercent = maxAllocatedMins > 0
                            ? Math.max(3, Math.min(100, Math.round((h.totalWeeklyMins / maxAllocatedMins) * 100)))
                            : 0;

                        return (
                            <div
                                key={h.id}
                                id={`pie-habit-row-${h.id}`}
                                style={{
                                    borderRadius: '8px',
                                    background: isSelected
                                        ? 'rgba(201, 162, 39, 0.12)'
                                        : 'rgba(255, 255, 255, 0.03)',
                                    border: `1px solid ${isSelected ? (h.color || 'var(--accent)') : 'var(--panel-border)'}`,
                                    transition: 'all 0.15s ease',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}
                            >
                                {/* Background Proportional Duration Bar */}
                                <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: `${barWidthPercent}%`,
                                    background: h.color,
                                    opacity: isSelected ? 0.22 : 0.08,
                                    pointerEvents: 'none',
                                    transition: 'width 0.3s ease'
                                }} />

                                {/* Main Habit Header Row */}
                                <div
                                    onClick={() => handleSelectHabit(h.id)}
                                    onMouseEnter={() => setHoveredHabitId(h.id)}
                                    onMouseLeave={() => setHoveredHabitId(null)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 10px',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        zIndex: 1
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                        <span style={{
                                            width: '10px',
                                            height: '10px',
                                            borderRadius: '50%',
                                            background: h.color,
                                            flexShrink: 0
                                        }} />

                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{
                                                fontWeight: 600,
                                                fontSize: '12.5px',
                                                color: '#fff',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {h.name}
                                            </div>
                                            <div style={{
                                                fontSize: '10.5px',
                                                color: 'var(--text-secondary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                marginTop: '2px',
                                                flexWrap: 'wrap'
                                            }}>
                                                <span style={{
                                                    background: 'rgba(255,255,255,0.06)',
                                                    padding: '1px 5px',
                                                    borderRadius: '4px',
                                                    fontSize: '9.5px',
                                                    color: 'var(--text-secondary)'
                                                }}>
                                                    {h.dayCount}/7 days
                                                </span>
                                                <span>•</span>
                                                <span style={{
                                                    color: 'var(--accent)',
                                                    fontWeight: 600
                                                }}>
                                                    ~{formatDuration(h.avgMinsPerDay)}/day
                                                </span>
                                                {h.dayCount < 7 && (
                                                    <>
                                                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }} title="Average duration on active days">
                                                            {formatDuration(h.avgMinsPerActiveDay)}/act day
                                                        </span>
                                                    </>
                                                )}
                                                <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                                                <span style={{ color: isSelected ? 'var(--accent)' : 'inherit', fontSize: '10px' }}>
                                                    {percent}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        flexShrink: 0,
                                        marginLeft: '8px'
                                    }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{
                                                fontSize: '12.5px',
                                                fontWeight: 700,
                                                color: isSelected ? 'var(--accent)' : 'var(--text-primary)'
                                            }}>
                                                {formatHoursFriendly(h.totalWeeklyMins)}
                                            </div>
                                            <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                                                /wk ({formatDuration(h.totalWeeklyMins)})
                                            </div>
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                                            padding: '2px'
                                        }}>
                                            {isSelected ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Accordion: Inline Schedule Breakdown when Selected */}
                                {isSelected && (
                                    <div style={{
                                        borderTop: '1px solid rgba(255,255,255,0.08)',
                                        background: 'rgba(0,0,0,0.3)',
                                        padding: '8px 10px 10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        position: 'relative',
                                        zIndex: 1
                                    }}>
                                        {/* Habit Daily Pace & Stats Bar */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                            gap: '4px',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: '6px',
                                            padding: '5px 8px',
                                            fontSize: '10px',
                                            marginBottom: '2px'
                                        }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '9px' }}>7-DAY PACE</div>
                                                <div style={{ color: 'var(--accent)', fontWeight: 600, marginTop: '1px' }}>
                                                    ~{formatDuration(h.avgMinsPerDay)}/day
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '9px' }}>ACTIVE SESSIONS</div>
                                                <div style={{ color: '#fff', fontWeight: 600, marginTop: '1px' }}>
                                                    {formatDuration(h.avgMinsPerActiveDay)}/session ({h.dayCount}d)
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '9px' }}>24H DAY SHARE</div>
                                                <div style={{ color: '#00F5D4', fontWeight: 600, marginTop: '1px' }}>
                                                    {h.percentOfDay}% of day
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            color: 'var(--text-secondary)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.4px',
                                            marginBottom: '2px'
                                        }}>
                                            <span>Weekly Schedule Breakdown ({h.allocationsByDay.length} days):</span>
                                            {onCardClick && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onCardClick(h.habit);
                                                    }}
                                                    style={{
                                                        background: 'rgba(255,255,255,0.06)',
                                                        border: '1px solid var(--panel-border)',
                                                        borderRadius: '4px',
                                                        color: 'var(--text-secondary)',
                                                        padding: '1px 6px',
                                                        fontSize: '10px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '3px'
                                                    }}
                                                    title="View Habit Info Modal"
                                                >
                                                    <Info size={10} /> Edit / Info
                                                </button>
                                            )}
                                        </div>

                                        {h.allocationsByDay.map((item, i) => {
                                            const timeRanges = item.blocks
                                                .filter(b => typeof b.startTime === 'number')
                                                .map(b => `${formatMinutesToTime(b.startTime!)} - ${formatMinutesToTime(b.startTime! + b.duration)}`)
                                                .join(', ');

                                            return (
                                                <div
                                                    key={`${item.day}-${i}`}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.05)',
                                                        borderRadius: '6px',
                                                        padding: '5px 8px',
                                                        fontSize: '11px'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                                        <span style={{
                                                            fontSize: '9.5px',
                                                            fontWeight: 700,
                                                            padding: '1px 5px',
                                                            borderRadius: '3px',
                                                            background: 'rgba(201, 162, 39, 0.15)',
                                                            color: 'var(--accent)',
                                                            flexShrink: 0
                                                        }}>
                                                            {item.dayShort}
                                                        </span>
                                                        <div style={{ minWidth: 0 }}>
                                                            <div style={{
                                                                fontWeight: 500,
                                                                color: 'var(--text-primary)',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                fontSize: '11px'
                                                            }}>
                                                                {item.templateName}
                                                            </div>
                                                            {timeRanges && (
                                                                <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                                                                    {timeRanges}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '3px',
                                                        fontWeight: 600,
                                                        color: '#fff',
                                                        fontSize: '11px',
                                                        flexShrink: 0
                                                    }}>
                                                        <Clock size={11} color="var(--text-secondary)" />
                                                        <span>{formatDuration(item.duration)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}

                {/* Unallocated Habits */}
                {!selectedDayFilter && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            padding: '0 2px'
                        }}>
                            <span>Unallocated Habits ({filteredUnallocated.length})</span>
                            <span style={{ fontSize: '10px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                                0m this week
                            </span>
                        </div>

                        {filteredUnallocated.length > 0 ? (
                            filteredUnallocated.map(h => (
                                <div
                                    key={h.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '7px 10px',
                                        borderRadius: '7px',
                                        background: 'rgba(255, 255, 255, 0.015)',
                                        border: '1px solid rgba(255, 255, 255, 0.04)',
                                        opacity: 0.75,
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                        <span style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: h.color || 'var(--text-secondary)',
                                            opacity: 0.6,
                                            flexShrink: 0
                                        }} />
                                        <span style={{
                                            fontSize: '12px',
                                            color: 'var(--text-secondary)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {h.name}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{
                                            fontSize: '10px',
                                            background: 'rgba(255,255,255,0.05)',
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            Unallocated
                                        </span>
                                        {onCardClick && (
                                            <button
                                                type="button"
                                                onClick={() => onCardClick(h.habit)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    padding: '2px',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer'
                                                }}
                                                title="View Habit Info"
                                            >
                                                <Info size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{
                                padding: '8px',
                                textAlign: 'center',
                                fontSize: '11px',
                                color: 'var(--text-secondary)',
                                background: 'rgba(255,255,255,0.01)',
                                borderRadius: '6px'
                            }}>
                                {searchQuery ? 'No matching unallocated habits' : 'All habits are allocated this week! 🎉'}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Render "By Day" Schedule View
    const renderDayBreakdownView = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '0 2px'
                }}>
                    <span>Week Schedule by Day</span>
                    <span style={{ fontSize: '10px', color: 'var(--accent)' }}>
                        7 Days • {formatHoursFriendly(totalWeeklyMinsAll)} Total
                    </span>
                </div>

                {dayBreakdownList.map((dayItem) => {
                    const isDaySelected = selectedDayFilter === dayItem.dayName;
                    const dayLoadPercent = Math.min(100, Math.round((dayItem.totalTemplateMins / 1440) * 100));

                    return (
                        <div
                            key={dayItem.dayName}
                            style={{
                                background: isDaySelected ? 'rgba(201, 162, 39, 0.08)' : 'rgba(255, 255, 255, 0.025)',
                                border: `1px solid ${isDaySelected ? 'var(--accent)' : 'var(--panel-border)'}`,
                                borderRadius: '8px',
                                overflow: 'hidden',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {/* Day Header */}
                            <div
                                onClick={() => setSelectedDayFilter(prev => prev === dayItem.dayName ? null : dayItem.dayName)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 10px',
                                    cursor: 'pointer',
                                    background: 'rgba(0,0,0,0.2)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: isDaySelected ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                                        color: isDaySelected ? '#000' : 'var(--text-primary)'
                                    }}>
                                        {dayItem.dayShort}
                                    </span>
                                    <div>
                                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff' }}>
                                            {dayItem.dayName}
                                        </div>
                                        <div style={{ fontSize: '10.5px', color: 'var(--accent)' }}>
                                            Template: {dayItem.templateName}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                                        {formatHoursFriendly(dayItem.totalTemplateMins)}
                                    </div>
                                    <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                                        {dayItem.habits.length} habits • {dayLoadPercent}% of 24h
                                    </div>
                                </div>
                            </div>

                            {/* Habits in this day */}
                            <div style={{
                                padding: '6px 10px 8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                borderTop: '1px solid rgba(255,255,255,0.04)'
                            }}>
                                {dayItem.habits.length > 0 ? (
                                    dayItem.habits.map((dh) => {
                                        const timeRange = dh.blocks
                                            .filter(b => typeof b.startTime === 'number')
                                            .map(b => `${formatMinutesToTime(b.startTime!)} - ${formatMinutesToTime(b.startTime! + b.duration)}`)
                                            .join(', ');

                                        return (
                                            <div
                                                key={dh.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '4px 6px',
                                                    borderRadius: '4px',
                                                    background: 'rgba(255,255,255,0.02)',
                                                    fontSize: '11px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                                    <span style={{
                                                        width: '7px',
                                                        height: '7px',
                                                        borderRadius: '50%',
                                                        background: dh.color,
                                                        flexShrink: 0
                                                    }} />
                                                    <span style={{
                                                        fontWeight: 500,
                                                        color: 'var(--text-primary)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {dh.name}
                                                    </span>
                                                    {timeRange && (
                                                        <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                                                            ({timeRange})
                                                        </span>
                                                    )}
                                                </div>

                                                <span style={{ fontWeight: 600, color: 'var(--accent)', flexShrink: 0 }}>
                                                    {formatDuration(dh.duration)}
                                                </span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', padding: '4px' }}>
                                        No habits scheduled for this day
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div
            ref={containerRef}
            className="habit-weekly-pie-view"
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden'
            }}
        >
            {/* Top Toolbar / Sub-controls Bar */}
            <div style={{
                flexShrink: 0,
                padding: '10px 12px 6px',
                borderBottom: '1px solid var(--panel-border)',
                background: 'rgba(0,0,0,0.2)'
            }}>
                {/* Header Row: Title, View Switcher, Sort, Wide Mode */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    gap: '6px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <div style={{
                            background: 'rgba(201, 162, 39, 0.15)',
                            padding: '5px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <PieChartIcon size={15} color="var(--accent)" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: '13px',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                Weekly Allocation
                            </h3>
                            <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-secondary)' }}>
                                7-day template time distribution
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        {/* View Switcher: Habit vs Day */}
                        <div style={{
                            display: 'flex',
                            background: 'rgba(255,255,255,0.04)',
                            borderRadius: '6px',
                            padding: '2px',
                            border: '1px solid var(--panel-border)'
                        }}>
                            <button
                                type="button"
                                onClick={() => setViewMode('habit')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    background: viewMode === 'habit' ? 'rgba(201, 162, 39, 0.2)' : 'transparent',
                                    border: 'none',
                                    color: viewMode === 'habit' ? 'var(--accent)' : 'var(--text-secondary)',
                                    padding: '3px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10.5px',
                                    fontWeight: viewMode === 'habit' ? 600 : 400,
                                    cursor: 'pointer'
                                }}
                                title="View Habit Allocation Pie & List"
                            >
                                <PieChartIcon size={12} />
                                <span>Habits</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('day')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    background: viewMode === 'day' ? 'rgba(201, 162, 39, 0.2)' : 'transparent',
                                    border: 'none',
                                    color: viewMode === 'day' ? 'var(--accent)' : 'var(--text-secondary)',
                                    padding: '3px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10.5px',
                                    fontWeight: viewMode === 'day' ? 600 : 400,
                                    cursor: 'pointer'
                                }}
                                title="View Schedule by Day of the Week"
                            >
                                <CalendarClock size={12} />
                                <span>By Day</span>
                            </button>
                        </div>

                        {/* Sort Asc/Desc button */}
                        <button
                            type="button"
                            onClick={() => setSortAscending(prev => !prev)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--panel-border)',
                                color: 'var(--text-secondary)',
                                padding: '4px 6px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                cursor: 'pointer'
                            }}
                            title={`Sorted: ${sortAscending ? 'Lowest to Highest duration' : 'Highest to Lowest duration'}`}
                        >
                            <ArrowUpDown size={12} color="var(--accent)" />
                        </button>

                        {/* Wide Mode Toggle (if available) */}
                        {onTogglePcExpand && (
                            <button
                                type="button"
                                onClick={onTogglePcExpand}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: isPcExpanded ? 'rgba(201, 162, 39, 0.2)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${isPcExpanded ? 'var(--accent)' : 'var(--panel-border)'}`,
                                    color: isPcExpanded ? 'var(--accent)' : 'var(--text-secondary)',
                                    padding: '4px 6px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                }}
                                title={isPcExpanded ? "Compact Pane View" : "Expand Pane (Wide View)"}
                            >
                                {isPcExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Day Filter Pills Strip (Only in standard 1-column view, or top bar) */}
                {!isWideLayout && (
                    <div style={{ marginBottom: '6px' }}>
                        {renderDayPillBar()}
                    </div>
                )}

                {/* Search Bar */}
                <div style={{ position: 'relative' }}>
                    <Search
                        size={12}
                        style={{
                            position: 'absolute',
                            left: '9px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-secondary)'
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Search habits or days..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '5px 8px 5px 28px',
                            fontSize: '11.5px',
                            borderRadius: '6px',
                            border: '1px solid var(--panel-border)',
                            background: 'rgba(0,0,0,0.25)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            style={{
                                position: 'absolute',
                                right: '7px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: 0
                            }}
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            {isWideLayout ? (
                /* 2-COLUMN SPLIT LAYOUT FOR WIDE MODE */
                <div style={{
                    display: 'flex',
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden'
                }}>
                    {/* Left Sticky Column: Chart & Day Pills */}
                    <div style={{
                        width: '260px',
                        flexShrink: 0,
                        borderRight: '1px solid var(--panel-border)',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        overflowY: 'auto',
                        background: 'rgba(0,0,0,0.1)'
                    }}>
                        {renderPieChartCard(false)}
                        {renderDayPillBar()}

                        {/* Quick Stats Summary Card */}
                        <div style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            fontSize: '11px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                <span>Allocated:</span>
                                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                                    {allocatedHabits.length} habits ({formatHoursFriendly(totalWeeklyMinsAll)})
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                <span>Daily Routine Load:</span>
                                <span style={{ color: '#00F5D4', fontWeight: 600 }}>
                                    ~{formatDuration(overallDailyAvgMins)}/day ({overallDailyCapacityPercent}% of 24h)
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                <span>Unallocated:</span>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                    {unallocatedHabits.length} habits
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                <span>Active Templates:</span>
                                <span style={{ color: '#fff' }}>
                                    {uniqueTemplates.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Scrollable Column: Habits / Day Breakdown */}
                    <div
                        className="habits-list-scroll-container"
                        style={{
                            flex: 1,
                            minWidth: 0,
                            overflowY: 'auto',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}
                    >
                        {viewMode === 'habit' ? renderHabitList() : renderDayBreakdownView()}
                    </div>
                </div>
            ) : (
                /* SINGLE-COLUMN LAYOUT (COMPACT & HIGH DENSITY) */
                <div
                    className="habits-list-scroll-container"
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}
                >
                    {allocatedHabits.length > 0 ? (
                        <>
                            {viewMode === 'habit' ? (
                                <>
                                    {renderPieChartCard(true)}
                                    {renderHabitList()}
                                </>
                            ) : (
                                renderDayBreakdownView()
                            )}
                        </>
                    ) : (
                        <div style={{
                            background: 'rgba(20, 24, 28, 0.7)',
                            border: '1px solid var(--panel-border)',
                            borderRadius: '10px',
                            padding: '24px 16px',
                            textAlign: 'center',
                            color: 'var(--text-secondary)'
                        }}>
                            <Clock size={28} color="var(--accent)" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
                            <h4 style={{ margin: '0 0 4px', color: 'var(--text-primary)' }}>No Habits Allocated This Week</h4>
                            <p style={{ margin: '0 0 12px', fontSize: '12px' }}>
                                Your habits haven't been assigned to any blocks in this week's templates yet.
                            </p>
                            {onBackToList && (
                                <button
                                    type="button"
                                    onClick={onBackToList}
                                    style={{
                                        background: 'var(--panel-bg)',
                                        border: '1px solid var(--accent)',
                                        color: 'var(--accent)',
                                        padding: '6px 14px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Go to Habit List
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
