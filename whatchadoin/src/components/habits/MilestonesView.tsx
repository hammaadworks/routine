import { useMemo } from 'react';
import { Calendar, CheckCircle2, Globe, Pencil, Plus, } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import SearchSortBar from '../SearchSortBar';

interface MilestonesViewProps {
    effectiveDate: string | null;
    isCalendarTab: boolean;
    allGoals: any[];
    currentMilestones: Record<string, string>;
    milestoneDates: string[];
    isPublicView?: boolean;
    isMilestoneBlockPublic: (block: string) => boolean;
    setSelectedDate: (date: string) => void;
    openEditMilestone: (dateStr: string, idx: number, block: string) => void;
    setEditingMilestoneIdx: (idx: any) => void;
    setMilestoneForm: (form: any) => void;
    setShowMilestoneModal: (show: boolean) => void;
    showAllMilestones: boolean;
    milestoneSearchQuery: string;
    setMilestoneSearchQuery: (q: string) => void;
    setShowAllMilestones: (show: boolean) => void;
}

export default function MilestonesView({
    effectiveDate,
    isCalendarTab,
    allGoals,
    currentMilestones,
    milestoneDates,
    isPublicView,
    isMilestoneBlockPublic,
    setSelectedDate,
    openEditMilestone,
    setEditingMilestoneIdx,
    setMilestoneForm,
    setShowMilestoneModal,
    showAllMilestones,
    setShowAllMilestones,
    milestoneSearchQuery,
    setMilestoneSearchQuery
}: MilestonesViewProps) {
    
    const customMarkdownComponents = useMemo(() => ({
        strong: ({children, ...props}: any) => {
            const text = String(children).trim();
            if (text.startsWith('@')) {
                const goalName = text.slice(1);
                const goal = allGoals.find(g => (g.name || '').toLowerCase() === goalName.toLowerCase());
                if (goal && goal.color) {
                    return (<strong {...props} style={{
                        color: goal.color, background: `${goal.color}20`, padding: '0 4px', borderRadius: '4px'
                    }}>
                        {children}
                    </strong>);
                } else if (goal) {
                    return (<strong {...props} style={{
                        color: 'var(--accent)',
                        background: 'rgba(234, 179, 8, 0.1)',
                        padding: '0 4px',
                        borderRadius: '4px'
                    }}>
                        {children}
                    </strong>);
                }
            }
            return <strong {...props}>{children}</strong>;
        }
    }), [allGoals]);

    return (
        <>
            <button
                onClick={() => {
                    setEditingMilestoneIdx(null);
                    setMilestoneForm({
                        date: effectiveDate || new Date().toISOString().split('T')[0] || '',
                        tag: '',
                        name: '',
                        desc: '',
                        done: false
                    });
                    setShowMilestoneModal(true);
                }}
                className={`secondary ${isCalendarTab ? '' : 'desktop-only-btn'}`}
                style={{
                    width: '100%',
                    flexShrink: 0,
                    marginBottom: '16px',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderStyle: 'dashed'
                }}
            >
                <Plus size={16}/> Add Milestone
            </button>

            <SearchSortBar
                searchQuery={milestoneSearchQuery}
                setSearchQuery={setMilestoneSearchQuery}
                placeholder="Search milestones..."
                customButton={(<button
                        className={`secondary ${showAllMilestones ? 'sort-active-glow' : ''}`}
                        onClick={() => setShowAllMilestones(!showAllMilestones)}
                        style={{
                            padding: '8px 12px',
                            background: showAllMilestones ? 'var(--accent)' : '',
                            boxShadow: showAllMilestones ? '0 0 12px var(--accent)' : 'none',
                            color: showAllMilestones ? '#000' : 'currentColor',
                            borderColor: showAllMilestones ? 'var(--accent)' : '',
                            height: '37px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}
                        title={showAllMilestones ? "Showing All Milestones (Click for Routine)" : "Showing Routine Milestones (Click for All)"}
                    >
                        {showAllMilestones ? <Globe size={14}/> : <Calendar size={14}/>}
                    </button>)}
            />

            <div
                className="milestones-list-scroll-container"
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflowY: 'auto',
                    paddingRight: '4px',
                    minHeight: 0
                }}
            >
                {milestoneDates.length === 0 ? (
                    <div style={{padding: '20px', textAlign: 'center', color: 'var(--text-secondary)'}}>
                        {milestoneSearchQuery.trim() ? "No milestones match your search." : (showAllMilestones ? "No milestones found. Click 'Add Milestone' to create one." : "No routine milestones found. Switch to 'All' or click 'Add Milestone'.")}
                    </div>) : (<div style={{
                    maxWidth: '800px', margin: '0 auto', width: '100%', position: 'relative', padding: '0 24px'
                }}>
                    <div style={{
                        borderLeft: '2px solid var(--panel-border)', marginLeft: '12px', paddingBottom: '24px'
                    }}>
                        {milestoneDates.map((dateStr) => {
                            const contentStr = currentMilestones[dateStr] || '';
                            const blocks = (contentStr || '').split('\n\n');
                            const isActiveDate = effectiveDate === dateStr;

                            const todayDate = new Date();
                            todayDate.setHours(0, 0, 0, 0);
                            const blockDate = new Date(dateStr + 'T00:00:00');
                            blockDate.setHours(0, 0, 0, 0);
                            const isPast = blockDate < todayDate;

                            const diffTime = blockDate.getTime() - todayDate.getTime();
                            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                            const diffStr = diffDays > 0 ? `+${diffDays} days` : `${diffDays} days`;

                            const validBlocks = blocks.filter((b: string) => b.trim());
                            const isAllDone = validBlocks.length > 0 && validBlocks.every((b: string) => {
                                const titleMatchWithTag = b.match(/^\*\*@([^*]+)\*\*\s*-\s*\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);
                                const titleMatchWithoutTag = b.match(/^\*\*([^*]+)\*\*(?:\s*\n([\s\S]*))?$/);
                                const title = titleMatchWithTag ? (titleMatchWithTag[2] || '') : (titleMatchWithoutTag ? (titleMatchWithoutTag[1] || '') : b);
                                return title.startsWith('[x] ');
                            });

                            let nodeColor = isPast ? '#a855f7' : 'var(--accent)';
                            let multiColors: string[] = [];
                            const tagsMatch = contentStr.match(/@([^\s*]+)/g);
                            if (tagsMatch) {
                                const uniqueTags: string[] = Array.from(new Set(tagsMatch.map((t: string) => t.slice(1).toLowerCase())));
                                uniqueTags.forEach((tag: string) => {
                                    const goal = allGoals.find(g => (g.name || '').toLowerCase() === tag);
                                    if (goal && goal.color) {
                                        multiColors.push(String(goal.color));
                                    }
                                });
                            }

                            let backgroundStyle = nodeColor;
                            if (multiColors.length > 1) {
                                const sliceSize = 100 / multiColors.length;
                                let gradientStops: string[] = [];
                                multiColors.forEach((color, i) => {
                                    gradientStops.push(`${color} ${i * sliceSize}% ${(i + 1) * sliceSize}%`);
                                });
                                backgroundStyle = `conic-gradient(${gradientStops.join(', ')})`;
                            } else if (multiColors.length === 1) {
                                backgroundStyle = multiColors[0] || '';
                                nodeColor = multiColors[0] || '';
                            }

                            return (<div key={dateStr} id={`milestone-block-${dateStr}`} style={{
                                position: 'relative', marginBottom: '40px', paddingLeft: '24px'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    left: '-7px',
                                    top: '4px',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: backgroundStyle,
                                    border: '2px solid var(--panel-bg)',
                                    boxShadow: isActiveDate ? `0 0 10px ${nodeColor}80` : 'none',
                                    opacity: isActiveDate ? 1 : 0.6
                                }}/>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '16px'
                                }}>
                                    <div
                                        onClick={() => {
                                            if (setSelectedDate) setSelectedDate(dateStr);
                                        }}
                                        style={{
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            color: isActiveDate ? '#fff' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                    <span>
                                        {new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
                                            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                                        })}
                                    </span>
                                        {isAllDone ? (<CheckCircle2 size={16} color="var(--success, #22c55e)"/>) : (
                                            <span style={{
                                                fontSize: '12px',
                                                color: diffDays < 0 ? '#ef4444' : 'var(--accent)',
                                                fontWeight: 'normal'
                                            }}>
                                            {diffStr}
                                        </span>)}
                                    </div>
                                    <button
                                        className="icon-btn"
                                        onClick={() => openEditMilestone(dateStr, 0, blocks[0] || '')}
                                        style={{padding: '4px', display: 'flex', alignItems: 'center'}}
                                    >
                                        <Pencil size={14} color="var(--text-secondary)"/>
                                    </button>
                                </div>

                                {blocks.map((block: string, idx: number) => {
                                    if (!block.trim()) return null;
                                    if (isPublicView && !isMilestoneBlockPublic(block)) return null;
                                    return (<div
                                        key={idx}
                                        style={{
                                            padding: '2px 0', marginBottom: '8px'
                                        }}
                                    >
                                        <div className="markdown-preview">
                                            <ReactMarkdown
                                                components={customMarkdownComponents as any}>
                                                {block === '' ? '\u00A0' : block.trim()}
                                            </ReactMarkdown>
                                        </div>
                                    </div>);
                                })}
                            </div>);
                        })}
                    </div>

                    <div style={{height: '20vh'}}/>
                </div>)}
            </div>
        </>
    );
}
