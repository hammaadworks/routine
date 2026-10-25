import { useMemo, useState } from 'react';
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
    Calendar,
    Sparkles,
    Info
} from 'lucide-react';
import { getGoalColor, formatDuration } from '../../utils';

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
    onBackToList,
    onCardClick
}: HabitWeeklyPieViewProps) {
    const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortAscending, setSortAscending] = useState(true); // lowest to highest by default

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
    const { allocatedHabits, unallocatedHabits, totalWeeklyMinsAll } = useMemo(() => {
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

                const matchingBlocks = ws.template.blocks.filter((b: any) => {
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
                            name: b.name,
                            duration: b.duration || 0,
                            startTime: typeof b.startTime === 'number' ? b.startTime : undefined
                        }))
                    });
                }
            });

            totalWeeklySum += habitWeeklyMins;

            return {
                habit,
                id: habit.id,
                name: habit.name || 'Untitled Habit',
                color,
                totalWeeklyMins: habitWeeklyMins,
                allocationsByDay,
                dayCount: allocationsByDay.length,
                isAllocated: habitWeeklyMins > 0
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

        return {
            allocatedHabits: allocated,
            unallocatedHabits: unallocated,
            totalWeeklyMinsAll: totalWeeklySum
        };
    }, [habits, isPublicView, weekSchedule, routineGoals, lifeGoals, moneyGoals, sortAscending]);

    // Selected habit data
    const selectedAllocation = useMemo(() => {
        if (!selectedHabitId) return null;
        return allocatedHabits.find(h => h.id === selectedHabitId)
            || unallocatedHabits.find(h => h.id === selectedHabitId)
            || null;
    }, [selectedHabitId, allocatedHabits, unallocatedHabits]);

    // Filter by search query
    const filteredAllocated = useMemo(() => {
        if (!searchQuery.trim()) return allocatedHabits;
        const q = searchQuery.toLowerCase().trim();
        return allocatedHabits.filter(h => h.name.toLowerCase().includes(q));
    }, [allocatedHabits, searchQuery]);

    const filteredUnallocated = useMemo(() => {
        if (!searchQuery.trim()) return unallocatedHabits;
        const q = searchQuery.toLowerCase().trim();
        return unallocatedHabits.filter(h => h.name.toLowerCase().includes(q));
    }, [unallocatedHabits, searchQuery]);

    const handleSelectHabit = (habitId: string) => {
        setSelectedHabitId(prev => prev === habitId ? null : habitId);
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
                    background: '#1A1F25',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    color: '#EDE7D9',
                    fontSize: '12px',
                    minWidth: '160px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
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
                        <span>Share of week:</span>
                        <span>{percent}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                        <span>Scheduled:</span>
                        <span>{data.dayCount} {data.dayCount === 1 ? 'day' : 'days'}</span>
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--accent)', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px' }}>
                        Click to reveal schedule
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="habit-weekly-pie-view" style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden'
        }}>
            {/* Header / Sub-controls Bar */}
            <div style={{
                flexShrink: 0,
                padding: '12px 14px 8px',
                borderBottom: '1px solid var(--panel-border)',
                background: 'rgba(0,0,0,0.15)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            background: 'rgba(201, 162, 39, 0.15)',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <PieChartIcon size={16} color="var(--accent)" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                Weekly Habit Allocation
                            </h3>
                            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                                Aggregated time across all 7 days of templates
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                            type="button"
                            onClick={() => setSortAscending(prev => !prev)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--panel-border)',
                                color: 'var(--text-secondary)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            title={`Sorted: ${sortAscending ? 'Lowest to Highest duration' : 'Highest to Lowest duration'}`}
                        >
                            <ArrowUpDown size={12} color="var(--accent)" />
                            <span>{sortAscending ? 'Lowest → Highest' : 'Highest → Lowest'}</span>
                        </button>
                    </div>
                </div>

                {/* Week's Templates Bar ("you get all the weeks template") */}
                <div style={{
                    marginTop: '8px',
                    padding: '8px 10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '6px',
                        fontSize: '11px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            <CalendarDays size={13} color="var(--accent)" />
                            <span>Week Schedule ({uniqueTemplates.length} {uniqueTemplates.length === 1 ? 'template' : 'templates'})</span>
                        </div>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                            {formatHoursFriendly(totalWeeklyMinsAll)} total scheduled
                        </span>
                    </div>

                    {/* Day-by-day template mapping pills */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                        gap: '3px'
                    }}>
                        {weekSchedule.map((ws) => {
                            const isDayActiveForSelectedHabit = selectedAllocation?.allocationsByDay.some(
                                d => d.day === ws.dayName
                            );

                            return (
                                <div
                                    key={ws.dayName}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        minWidth: 0,
                                        padding: '4px 2px',
                                        borderRadius: '6px',
                                        background: isDayActiveForSelectedHabit
                                            ? 'rgba(201, 162, 39, 0.18)'
                                            : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${isDayActiveForSelectedHabit ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
                                        transition: 'all 0.2s ease',
                                        textAlign: 'center'
                                    }}
                                    title={`${ws.dayName}: ${ws.templateName} (${formatHoursFriendly(ws.totalTemplateMins)})`}
                                >
                                    <span style={{
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        color: isDayActiveForSelectedHabit ? 'var(--accent)' : 'var(--text-secondary)'
                                    }}>
                                        {ws.dayShort}
                                    </span>
                                    <span style={{
                                        fontSize: '9.5px',
                                        maxWidth: '100%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        color: ws.templateId ? 'var(--text-primary)' : 'rgba(255,255,255,0.3)',
                                        marginTop: '1px'
                                    }}>
                                        {ws.templateName}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Search Bar */}
                <div style={{ position: 'relative', marginTop: '8px' }}>
                    <Search
                        size={13}
                        style={{
                            position: 'absolute',
                            left: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-secondary)'
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Search allocated or unallocated habits..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '6px 10px 6px 30px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: '1px solid var(--panel-border)',
                            background: 'rgba(0,0,0,0.25)',
                            color: 'var(--text-primary)',
                            outline: 'none'
                        }}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: 0
                            }}
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* Scrollable Main Body */}
            <div
                className="habits-list-scroll-container"
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}
            >
                {/* Visual Chart Card */}
                {allocatedHabits.length > 0 ? (
                    <div style={{
                        background: 'rgba(20, 24, 28, 0.7)',
                        border: '1px solid var(--panel-border)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px'
                        }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>
                                WEEKLY ALLOCATION PIE
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--accent)' }}>
                                {allocatedHabits.length} habits • {formatHoursFriendly(totalWeeklyMinsAll)}
                            </span>
                        </div>

                        {/* Recharts Pie Chart */}
                        <div style={{ width: '100%', height: '220px', position: 'relative' }}>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={allocatedHabits}
                                        dataKey="totalWeeklyMins"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={52}
                                        outerRadius={78}
                                        paddingAngle={2}
                                        cursor="pointer"
                                        onClick={(entry: any) => {
                                            if (entry && entry.id) {
                                                handleSelectHabit(entry.id);
                                            }
                                        }}
                                    >
                                        {allocatedHabits.map((entry) => {
                                            const isSelected = selectedHabitId === entry.id;
                                            return (
                                                <Cell
                                                    key={`pie-cell-${entry.id}`}
                                                    fill={entry.color}
                                                    stroke={isSelected ? '#FFFFFF' : 'rgba(0,0,0,0.6)'}
                                                    strokeWidth={isSelected ? 3 : 1}
                                                    style={{
                                                        outline: 'none',
                                                        filter: isSelected ? 'drop-shadow(0 0 6px rgba(255,255,255,0.4))' : 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                            );
                                        })}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Center Donut Label */}
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center',
                                pointerEvents: 'none',
                                maxWidth: '90px'
                            }}>
                                {selectedAllocation ? (
                                    <>
                                        <div style={{
                                            fontSize: '10px',
                                            color: 'var(--text-secondary)',
                                            textTransform: 'uppercase',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {selectedAllocation.name}
                                        </div>
                                        <div style={{
                                            fontSize: '15px',
                                            fontWeight: 700,
                                            color: selectedAllocation.color || 'var(--accent)'
                                        }}>
                                            {formatHoursFriendly(selectedAllocation.totalWeeklyMins)}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{
                                            fontSize: '16px',
                                            fontWeight: 700,
                                            color: 'var(--accent)'
                                        }}>
                                            {formatHoursFriendly(totalWeeklyMinsAll)}
                                        </div>
                                        <div style={{
                                            fontSize: '10px',
                                            color: 'var(--text-secondary)',
                                            textTransform: 'uppercase'
                                        }}>
                                            Total
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Interactive hint */}
                        <div style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            marginTop: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}>
                            <Sparkles size={12} color="var(--accent)" />
                            <span>Click a pie piece to reveal its day, template, and time allocation</span>
                        </div>
                    </div>
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

                {/* SELECTED HABIT DETAIL CARD (Reveals: "day - template name - time") */}
                {selectedAllocation && (
                    <div style={{
                        background: 'rgba(26, 31, 37, 0.95)',
                        border: `1px solid ${selectedAllocation.color || 'var(--accent)'}`,
                        borderRadius: '10px',
                        padding: '12px 14px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        transition: 'all 0.2s ease'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '10px',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            paddingBottom: '8px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <span style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: selectedAllocation.color,
                                    flexShrink: 0
                                }} />
                                <div>
                                    <h4 style={{
                                        margin: 0,
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: '#fff',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {selectedAllocation.name}
                                    </h4>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        {selectedAllocation.isAllocated
                                            ? `${formatHoursFriendly(selectedAllocation.totalWeeklyMins)} (${formatDuration(selectedAllocation.totalWeeklyMins)}) allocated entirely throughout the week pie`
                                            : 'Unallocated (0m scheduled this week)'}
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedHabitId(null)}
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer'
                                }}
                                title="Close details"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Breakdown: day - template name - time */}
                        {selectedAllocation.allocationsByDay.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    marginBottom: '2px'
                                }}>
                                    Allocated on ({selectedAllocation.allocationsByDay.length} {selectedAllocation.allocationsByDay.length === 1 ? 'day' : 'days'}):
                                </div>

                                {selectedAllocation.allocationsByDay.map((item, i) => {
                                    // Detail of time ranges if start times exist
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
                                                padding: '8px 10px',
                                                fontSize: '12px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                <Calendar size={13} color="var(--accent)" style={{ flexShrink: 0 }} />
                                                <div style={{ minWidth: 0 }}>
                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                        {item.day}
                                                    </span>
                                                    <span style={{ color: 'var(--text-secondary)', margin: '0 6px' }}>—</span>
                                                    <span style={{ color: 'var(--accent)' }}>
                                                        {item.templateName}
                                                    </span>
                                                    {timeRanges && (
                                                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                                                            {timeRanges}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontWeight: 600,
                                                color: '#fff',
                                                flexShrink: 0
                                            }}>
                                                <Clock size={12} color="var(--text-secondary)" />
                                                <span>{formatDuration(item.duration)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{
                                padding: '10px',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                textAlign: 'center'
                            }}>
                                This habit is not scheduled in any template active for this week.
                            </div>
                        )}

                        {onCardClick && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => onCardClick(selectedAllocation.habit)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--panel-border)',
                                        color: 'var(--text-secondary)',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        cursor: 'pointer'
                                    }}
                                    title="View habit details"
                                >
                                    <Info size={12} /> Details
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ALLOCATED HABITS LIST (Sorted lowest to highest) */}
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
                        <span>Allocated Habits ({filteredAllocated.length})</span>
                        <span style={{ fontSize: '10px', fontWeight: 'normal', color: 'var(--accent)' }}>
                            Sorted {sortAscending ? 'lowest → highest' : 'highest → lowest'}
                        </span>
                    </div>

                    {filteredAllocated.map((h) => {
                        const isSelected = selectedHabitId === h.id;
                        const percent = totalWeeklyMinsAll > 0
                            ? Math.round((h.totalWeeklyMins / totalWeeklyMinsAll) * 100)
                            : 0;

                        return (
                            <div
                                key={h.id}
                                onClick={() => handleSelectHabit(h.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    background: isSelected
                                        ? 'rgba(201, 162, 39, 0.12)'
                                        : 'rgba(255, 255, 255, 0.03)',
                                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--panel-border)'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
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
                                            fontWeight: 500,
                                            fontSize: '13px',
                                            color: '#fff',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {h.name}
                                        </div>
                                        <div style={{
                                            fontSize: '11px',
                                            color: 'var(--text-secondary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginTop: '2px'
                                        }}>
                                            <span>{h.dayCount} {h.dayCount === 1 ? 'day' : 'days'} this week</span>
                                            <span>•</span>
                                            <span>{percent}% of habit time</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    flexShrink: 0
                                }}>
                                    <div style={{
                                        textAlign: 'right'
                                    }}>
                                        <div style={{
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: isSelected ? 'var(--accent)' : 'var(--text-primary)'
                                        }}>
                                            {formatHoursFriendly(h.totalWeeklyMins)}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                            {formatDuration(h.totalWeeklyMins)}
                                        </div>
                                    </div>

                                    {onCardClick && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCardClick(h.habit);
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                padding: '4px',
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer'
                                            }}
                                            title="View Habit Info"
                                        >
                                            <Info size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* UNALLOCATED HABITS (STAY AT THE LAST) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
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
                            0m this week • Stays at the last
                        </span>
                    </div>

                    {filteredUnallocated.length > 0 ? (
                        filteredUnallocated.map(h => {
                            const isSelected = selectedHabitId === h.id;

                            return (
                                <div
                                    key={h.id}
                                    onClick={() => handleSelectHabit(h.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        background: isSelected
                                            ? 'rgba(255, 255, 255, 0.08)'
                                            : 'rgba(255, 255, 255, 0.015)',
                                        border: `1px solid ${isSelected ? 'var(--text-secondary)' : 'rgba(255, 255, 255, 0.05)'}`,
                                        opacity: 0.75,
                                        cursor: 'pointer',
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
                                            fontSize: '12.5px',
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
                                            fontSize: '10.5px',
                                            background: 'rgba(255,255,255,0.05)',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            Unallocated
                                        </span>
                                        {onCardClick && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onCardClick(h.habit);
                                                }}
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
                            );
                        })
                    ) : (
                        <div style={{
                            padding: '10px',
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
            </div>
        </div>
    );
}
