import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import getCaretCoordinates from 'textarea-caret';
import {
    AlertTriangle,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Copy,
    FilePlus,
    FileText,
    Folder,
    FolderPlus,
    HelpCircle,
    Info,
    Lightbulb,
    PanelLeftClose,
    PanelLeftOpen,
    Search,
    Trash2
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import {getAllGoalsForMention, normalizeListNewlines, sanitizeEntities} from '../utils';

interface Note {
    id: string;
    name: string;
    content: string;
    folderId: string | null;
    createdAt: string;
    isLife: boolean;
}

interface FolderType {
    id: string;
    name: string;
    parentId: string | null;
    isExpanded: boolean;
    isLife: boolean;
}

interface ConfirmConfig {
    title: string;
    message: string;
    isDanger: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

interface PlansPaneProps {
    isPublicView?: boolean;
    routineGoals: any[];
    habits: any[];
    lifeGoals: any[];
    moneyGoals?: any[];
    activeRoutineId: string;
}

function MarkdownCode({inline, className, children, ...props}: any) {
    const [copied, setCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');

    if (inline || (!match && !codeString.includes('\n'))) {
        return (
            <code
                style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#F6C177',
                    fontFamily: 'var(--font-mono, monospace)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.88em',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
                {...props}
            >
                {children}
            </code>
        );
    }

    const language = match ? match[1] : '';

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(codeString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            style={{
                margin: '10px 0',
                background: '#12161C',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    fontFamily: 'monospace',
                    letterSpacing: '0.05em'
                }}
            >
                <span>{language || 'code'}</span>
                <button
                    onClick={handleCopy}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: copied ? '#10B981' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px'
                    }}
                >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <pre style={{margin: 0, padding: '12px 14px', overflowX: 'auto'}}>
                <code
                    style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '13px',
                        lineHeight: 1.5,
                        color: '#EDE7D9'
                    }}
                    {...props}
                >
                    {codeString}
                </code>
            </pre>
        </div>
    );
}

export default function PlansPane({
    isPublicView, routineGoals, habits, lifeGoals, moneyGoals, activeRoutineId}: PlansPaneProps) {

    const [notes, setNotes] = useState<Note[]>(() => {
        const rSaved = localStorage.getItem(`whatchadoin_plans_${activeRoutineId}`);
        const rNotes = rSaved ? sanitizeEntities<Note>(JSON.parse(rSaved)).map((n: any) => ({...n, isLife: false, content: normalizeListNewlines(n.content || '')})) : [];
        const lSaved = localStorage.getItem(`whatchadoin_life_plans`);
        const lNotes = lSaved ? sanitizeEntities<Note>(JSON.parse(lSaved)).map((n: any) => ({...n, isLife: true, content: normalizeListNewlines(n.content || '')})) : [];
        return [...lNotes, ...rNotes];
    });
    const [folders, setFolders] = useState<FolderType[]>(() => {
        const rSaved = localStorage.getItem(`whatchadoin_plans_folders_${activeRoutineId}`);
        const rFolders = rSaved ? JSON.parse(rSaved).map((f: any) => ({...f, isLife: false})) : [];
        const lSaved = localStorage.getItem(`whatchadoin_life_plans_folders`);
        const lFolders = lSaved ? JSON.parse(lSaved).map((f: any) => ({...f, isLife: true})) : [];
        return [...lFolders, ...rFolders];
    });

    const [activeNoteId, setActiveNoteId] = useState<string | null>(notes.length > 0 ? notes[0]?.id || null : null);
    const [searchQuery, setSearchQuery] = useState('');


    const [showMentionMenu, setShowMentionMenu] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionCoords, setMentionCoords] = useState({top: 0, left: 0});
    const [mentionIndex, setMentionIndex] = useState(0);
    const [activeBlockIdx, setActiveBlockIdx] = useState<number | null>(null);
    const [isDocBarCollapsed, setIsDocBarCollapsed] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
    const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
    useEffect(() => {
        const mql = window.matchMedia('(max-width: 768px)');
        const handleResize = (e: MediaQueryListEvent) => setIsMobile(e.matches);

        // Add event listener (using fallback for older browsers just in case)
        if (mql.addEventListener) {
            mql.addEventListener('change', handleResize);
            return () => mql.removeEventListener('change', handleResize);
        } else {
            mql.addListener(handleResize);
            return () => mql.removeListener(handleResize);
        }
    }, []);

    const textareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

    // All goals, habits, money goals, and tasks for mentioning
    let quickTasks: any[] = [];
    try {
        quickTasks = JSON.parse(localStorage.getItem('whatchadoin_quick_tasks') || '[]');
    } catch {
        quickTasks = [];
    }

    const {allGoals, filteredGoals} = getAllGoalsForMention(routineGoals, habits, lifeGoals, mentionQuery, moneyGoals, quickTasks);

    useEffect(() => {
        const rNotes = notes.filter(n => !n.isLife);
        const lNotes = notes.filter(n => n.isLife);
        localStorage.setItem(`whatchadoin_plans_${activeRoutineId}`, JSON.stringify(rNotes));
        localStorage.setItem(`whatchadoin_life_plans`, JSON.stringify(lNotes));
    }, [notes, activeRoutineId]);

    useEffect(() => {
        const rFolders = folders.filter(f => !f.isLife);
        const lFolders = folders.filter(f => f.isLife);
        localStorage.setItem(`whatchadoin_plans_folders_${activeRoutineId}`, JSON.stringify(rFolders));
        localStorage.setItem(`whatchadoin_life_plans_folders`, JSON.stringify(lFolders));
    }, [folders, activeRoutineId]);

    const createNote = useCallback((folderId: string | null = null, isLife = false) => {
        if (folderId) {
            const folder = folders.find(f => f.id === folderId);
            if (folder) isLife = folder.isLife;
        }
        const defaultName = isLife
            ? (isPublicView ? 'Untitled Life Plan [public]' : 'Untitled Life Plan')
            : (isPublicView ? 'Untitled Routine Plan [public]' : 'Untitled Routine Plan');
        const newNote: Note = {
            id: Date.now().toString(),
            name: defaultName,
            content: '',
            folderId,
            createdAt: new Date().toISOString(),
            isLife
        };
        setNotes(prev => [...prev, newNote]);
        setActiveNoteId(newNote.id);
        if (isMobile) {
            setIsDocBarCollapsed(true);
        }
    }, [folders, isMobile, isPublicView]);

    useEffect(() => {
        const handleFabAddPlan = () => {
            // By default create a routine note, unless they are currently looking at a life folder
            createNote(null, false);
            setTimeout(() => {
                const titleInput = document.getElementById('plan-note-title-input');
                if (titleInput) {
                    titleInput.focus();
                    (titleInput as HTMLInputElement).select?.();
                }
            }, 100);
        };
        window.addEventListener('fab:add-plan', handleFabAddPlan);
        return () => window.removeEventListener('fab:add-plan', handleFabAddPlan);
    }, [createNote]);

    const isPlanPublic = (n: Note) => (n.name || '').includes('[public]') || (n.content || '').includes('[public]');
    const visibleNotes = isPublicView ? notes.filter(isPlanPublic) : notes;
    const activeNote = visibleNotes.find(n => n.id === activeNoteId) || (visibleNotes.length > 0 ? visibleNotes[0] : null);

    const createFolder = (parentId: string | null = null, isLife = false) => {
        if (parentId) isLife = folders.find(f => f.id === parentId)?.isLife || false;
        const defaultFolderName = isPublicView ? 'New Folder [public]' : 'New Folder';
        const newFolder: FolderType = {
            id: 'folder_' + Date.now().toString(), name: defaultFolderName, parentId, isExpanded: true, isLife
        };
        setFolders([...folders, newFolder]);
    };

    const updateFolder = (id: string, updates: Partial<FolderType>) => {
        setFolders(folders.map(f => f.id === id ? {...f, ...updates} : f));
    };

    const deleteFolder = (id: string) => {
        setConfirmConfig({
            title: 'Delete Folder',
            message: 'Are you sure you want to delete this folder and all its contents?',
            isDanger: true,
            onConfirm: () => {
                const subfolderIds = new Set<string>([id]);
                let changed = true;
                while (changed) {
                    changed = false;
                    folders.forEach(f => {
                        if (f.parentId && subfolderIds.has(f.parentId) && !subfolderIds.has(f.id)) {
                            subfolderIds.add(f.id);
                            changed = true;
                        }
                    });
                }

                setFolders(folders.map(f => f).filter(f => !subfolderIds.has(f.id)));
                const newNotes = notes.filter(n => (n.folderId ? !subfolderIds.has(n.folderId) : true));
                setNotes(newNotes);
                const activeFolderId = notes.find(n => n.id === activeNoteId)?.folderId;
                if (activeNoteId && activeFolderId && subfolderIds.has(activeFolderId)) {
                    setActiveNoteId(null);
                }
                setConfirmConfig(null);
            },
            onCancel: () => setConfirmConfig(null)
        });
    };

    useEffect(() => {
        const handleUpdate = () => {
            const rSaved = localStorage.getItem(`whatchadoin_plans_${activeRoutineId}`);
            const rNotes = rSaved ? sanitizeEntities<Note>(JSON.parse(rSaved)).map((n: any) => ({...n, isLife: false, content: normalizeListNewlines(n.content || '')})) : [];
            const lSaved = localStorage.getItem(`whatchadoin_life_plans`);
            const lNotes = lSaved ? sanitizeEntities<Note>(JSON.parse(lSaved)).map((n: any) => ({...n, isLife: true, content: normalizeListNewlines(n.content || '')})) : [];
            const merged = [...lNotes, ...rNotes];
            setNotes(prev => {
                if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
                return merged;
            });
        };
        window.addEventListener('whatchadoin_plans_updated', handleUpdate);
        return () => window.removeEventListener('whatchadoin_plans_updated', handleUpdate);
    }, [activeRoutineId]);

    const updateActiveNote = (updates: Partial<Note>) => {
        const targetId = activeNote?.id;
        if (!targetId) return;
        setNotes(prevNotes => prevNotes.map(n => n.id === targetId ? {...n, ...updates} : n));
    };

    const deleteNote = (id: string) => {
        setConfirmConfig({
            title: 'Delete Plan',
            message: 'Are you sure you want to delete this plan?',
            isDanger: true,
            onConfirm: () => {
                const newNotes = notes.filter(n => n.id !== id);
                setNotes(newNotes);
                if (activeNoteId === id) {
                    setActiveNoteId(newNotes.length > 0 ? newNotes[0]?.id || null : null);
                }
                setConfirmConfig(null);
            },
            onCancel: () => setConfirmConfig(null)
        });
    };

    const duplicateNote = (id: string) => {
        const noteToCopy = notes.find(n => n.id === id);
        if (!noteToCopy) return;

        const currentName = noteToCopy.name || 'Plan';
        const newNote: Note = {
            ...noteToCopy,
            id: Date.now().toString(),
            name: `${currentName} (Copy)`,
            createdAt: new Date().toISOString()
        };

        const newNotes = [...notes, newNote];
        setNotes(newNotes);
        setActiveNoteId(newNote.id);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, idx: number) => {
        if (showMentionMenu) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex(prev => (prev + 1) % filteredGoals.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex(prev => (prev - 1 + filteredGoals.length) % filteredGoals.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredGoals.length > 0) {
                    insertMention(filteredGoals[mentionIndex], idx);
                }
            } else if (e.key === 'Escape') {
                setShowMentionMenu(false);
            }
            return;
        }

        if (!activeNote) return;

        const blocks = (activeNote.content || '').split('\n\n');
        const target = e.target as HTMLTextAreaElement;

        if (e.key === 'Tab') {
            e.preventDefault();
            const cursor = target.selectionStart;
            const val = target.value;
            const textBefore = val.slice(0, cursor);
            const lastLineBreak = textBefore.lastIndexOf('\n');
            const lineStart = lastLineBreak + 1;
            const nextLineBreak = val.indexOf('\n', cursor);
            const lineEnd = nextLineBreak === -1 ? val.length : nextLineBreak;
            const fullLine = val.slice(lineStart, lineEnd);

            if (e.shiftKey) {
                // Outdent
                if (fullLine.startsWith('  ')) {
                    const newLine = fullLine.slice(2);
                    const newBlockVal = val.slice(0, lineStart) + newLine + val.slice(lineEnd);
                    const newBlocks = [...blocks];
                    newBlocks[idx] = newBlockVal;
                    updateActiveNote({content: newBlocks.join('\n\n')});
                    setTimeout(() => {
                        const ref = textareaRefs.current[idx];
                        if (ref) {
                            const newPos = Math.max(lineStart, cursor - 2);
                            ref.selectionStart = ref.selectionEnd = newPos;
                        }
                    }, 0);
                } else if (fullLine.startsWith(' ')) {
                    const newLine = fullLine.slice(1);
                    const newBlockVal = val.slice(0, lineStart) + newLine + val.slice(lineEnd);
                    const newBlocks = [...blocks];
                    newBlocks[idx] = newBlockVal;
                    updateActiveNote({content: newBlocks.join('\n\n')});
                    setTimeout(() => {
                        const ref = textareaRefs.current[idx];
                        if (ref) {
                            const newPos = Math.max(lineStart, cursor - 1);
                            ref.selectionStart = ref.selectionEnd = newPos;
                        }
                    }, 0);
                }
            } else {
                // Indent
                const newLine = '  ' + fullLine;
                const newBlockVal = val.slice(0, lineStart) + newLine + val.slice(lineEnd);
                const newBlocks = [...blocks];
                newBlocks[idx] = newBlockVal;
                updateActiveNote({content: newBlocks.join('\n\n')});
                setTimeout(() => {
                    const ref = textareaRefs.current[idx];
                    if (ref) {
                        ref.selectionStart = ref.selectionEnd = cursor + 2;
                    }
                }, 0);
            }
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            const cursor = target.selectionStart;
            const val = target.value;
            const textBefore = val.slice(0, cursor);
            const textAfter = val.slice(cursor);
            const lastLineBreak = textBefore.lastIndexOf('\n');
            const lineStart = lastLineBreak + 1;
            const nextLineBreak = textAfter.indexOf('\n');
            const lineEnd = nextLineBreak === -1 ? val.length : cursor + nextLineBreak;
            const fullLine = val.slice(lineStart, lineEnd);

            const taskMatch = fullLine.match(/^(\s*)([-*+]\s+\[[ xX]\])\s*(.*)$/);
            const quoteMatch = fullLine.match(/^(\s*>)\s*(.*)$/);
            const bulletMatch = fullLine.match(/^(\s*)([-*+])\s*(.*)$/);
            const orderedMatch = fullLine.match(/^(\s*)(\d+)\.\s*(.*)$/);

            if (taskMatch) {
                e.preventDefault();
                const indent = taskMatch[1] || '';
                const lineContent = taskMatch[3] || '';

                if (lineContent.trim() === '') {
                    // Empty task line -> exit task list cleanly
                    const beforeLine = val.slice(0, lineStart).replace(/\n$/, '');
                    const afterLine = val.slice(lineEnd).replace(/^\n/, '');
                    const newBlocks = [...blocks];
                    if (beforeLine === '' && afterLine === '') {
                        newBlocks[idx] = '';
                        updateActiveNote({content: newBlocks.join('\n\n')});
                    } else {
                        newBlocks[idx] = beforeLine;
                        newBlocks.splice(idx + 1, 0, afterLine);
                        updateActiveNote({content: newBlocks.join('\n\n')});
                        setActiveBlockIdx(idx + 1);
                    }
                } else {
                    // Non-empty task line -> continue task list on next line in same block
                    const nextBullet = `\n${indent}- [ ] `;
                    const newBlockVal = textBefore + nextBullet + textAfter;
                    const newBlocks = [...blocks];
                    newBlocks[idx] = newBlockVal;
                    updateActiveNote({content: newBlocks.join('\n\n')});
                    setTimeout(() => {
                        const ref = textareaRefs.current[idx];
                        if (ref) {
                            const newPos = cursor + nextBullet.length;
                            ref.selectionStart = ref.selectionEnd = newPos;
                            ref.style.height = 'auto';
                            ref.style.height = ref.scrollHeight + 'px';
                        }
                    }, 0);
                }
                return;
            } else if (quoteMatch) {
                e.preventDefault();
                const indentPrefix = quoteMatch[1] || '>';
                const lineContent = quoteMatch[2] || '';

                if (lineContent.trim() === '') {
                    // Empty quote line -> exit quote cleanly
                    const beforeLine = val.slice(0, lineStart).replace(/\n$/, '');
                    const afterLine = val.slice(lineEnd).replace(/^\n/, '');
                    const newBlocks = [...blocks];
                    if (beforeLine === '' && afterLine === '') {
                        newBlocks[idx] = '';
                        updateActiveNote({content: newBlocks.join('\n\n')});
                    } else {
                        newBlocks[idx] = beforeLine;
                        newBlocks.splice(idx + 1, 0, afterLine);
                        updateActiveNote({content: newBlocks.join('\n\n')});
                        setActiveBlockIdx(idx + 1);
                    }
                } else {
                    // Non-empty quote line -> continue quote on next line in same block
                    const nextBullet = `\n${indentPrefix} `;
                    const newBlockVal = textBefore + nextBullet + textAfter;
                    const newBlocks = [...blocks];
                    newBlocks[idx] = newBlockVal;
                    updateActiveNote({content: newBlocks.join('\n\n')});
                    setTimeout(() => {
                        const ref = textareaRefs.current[idx];
                        if (ref) {
                            const newPos = cursor + nextBullet.length;
                            ref.selectionStart = ref.selectionEnd = newPos;
                            ref.style.height = 'auto';
                            ref.style.height = ref.scrollHeight + 'px';
                        }
                    }, 0);
                }
                return;
            } else if (bulletMatch) {
                e.preventDefault();
                const indent = bulletMatch[1] || '';
                const bullet = bulletMatch[2] || '-';
                const lineContent = bulletMatch[3] || '';

                if (lineContent.trim() === '') {
                    // Empty bullet line -> exit list cleanly
                    const beforeLine = val.slice(0, lineStart).replace(/\n$/, '');
                    const afterLine = val.slice(lineEnd).replace(/^\n/, '');
                    const newBlocks = [...blocks];
                    if (beforeLine === '' && afterLine === '') {
                        newBlocks[idx] = '';
                        updateActiveNote({content: newBlocks.join('\n\n')});
                    } else {
                        newBlocks[idx] = beforeLine;
                        newBlocks.splice(idx + 1, 0, afterLine);
                        updateActiveNote({content: newBlocks.join('\n\n')});
                        setActiveBlockIdx(idx + 1);
                    }
                } else {
                    // Non-empty bullet line -> continue list on next line in same block
                    const nextBullet = `\n${indent}${bullet} `;
                    const newBlockVal = textBefore + nextBullet + textAfter;
                    const newBlocks = [...blocks];
                    newBlocks[idx] = newBlockVal;
                    updateActiveNote({content: newBlocks.join('\n\n')});
                    setTimeout(() => {
                        const ref = textareaRefs.current[idx];
                        if (ref) {
                            const newPos = cursor + nextBullet.length;
                            ref.selectionStart = ref.selectionEnd = newPos;
                            ref.style.height = 'auto';
                            ref.style.height = ref.scrollHeight + 'px';
                        }
                    }, 0);
                }
                return;
            } else if (orderedMatch) {
                e.preventDefault();
                const indent = orderedMatch[1] || '';
                const num = parseInt(orderedMatch[2] || '1', 10);
                const lineContent = orderedMatch[3] || '';

                if (lineContent.trim() === '') {
                    // Empty ordered line -> exit list cleanly
                    const beforeLine = val.slice(0, lineStart).replace(/\n$/, '');
                    const afterLine = val.slice(lineEnd).replace(/^\n/, '');
                    const newBlocks = [...blocks];
                    if (beforeLine === '' && afterLine === '') {
                        newBlocks[idx] = '';
                        updateActiveNote({content: newBlocks.join('\n\n')});
                    } else {
                        newBlocks[idx] = beforeLine;
                        newBlocks.splice(idx + 1, 0, afterLine);
                        updateActiveNote({content: newBlocks.join('\n\n')});
                        setActiveBlockIdx(idx + 1);
                    }
                } else {
                    // Non-empty ordered line -> auto-increment number on next line in same block
                    const nextBullet = `\n${indent}${num + 1}. `;
                    const newBlockVal = textBefore + nextBullet + textAfter;
                    const newBlocks = [...blocks];
                    newBlocks[idx] = newBlockVal;
                    updateActiveNote({content: newBlocks.join('\n\n')});
                    setTimeout(() => {
                        const ref = textareaRefs.current[idx];
                        if (ref) {
                            const newPos = cursor + nextBullet.length;
                            ref.selectionStart = ref.selectionEnd = newPos;
                            ref.style.height = 'auto';
                            ref.style.height = ref.scrollHeight + 'px';
                        }
                    }, 0);
                }
                return;
            } else {
                // Regular paragraph: standard block split
                e.preventDefault();
                const before = val.slice(0, cursor);
                const after = val.slice(cursor);
                const newBlocks = [...blocks];
                newBlocks[idx] = before;
                newBlocks.splice(idx + 1, 0, after);
                updateActiveNote({content: newBlocks.join('\n\n')});
                setActiveBlockIdx(idx + 1);
                return;
            }
        } else if (e.key === 'Backspace' && target.selectionStart === 0 && idx > 0) {
            e.preventDefault();
            const prevBlock = blocks[idx - 1] || '';
            const newBlocks = [...blocks];
            newBlocks[idx - 1] = prevBlock + (newBlocks[idx] ? '\n\n' + newBlocks[idx] : '');
            newBlocks.splice(idx, 1);
            updateActiveNote({content: newBlocks.join('\n\n')});
            setActiveBlockIdx(idx - 1);
            setTimeout(() => {
                const ref = textareaRefs.current[idx - 1];
                if (ref) {
                    ref.focus();
                    ref.selectionStart = ref.selectionEnd = prevBlock.length;
                }
            }, 0);
        } else if (e.key === 'ArrowUp' && target.selectionStart === 0 && idx > 0) {
            setActiveBlockIdx(idx - 1);
        } else if (e.key === 'ArrowDown' && target.selectionStart === target.value.length && idx < blocks.length - 1) {
            setActiveBlockIdx(idx + 1);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>, idx: number) => {
        if (!activeNote) return;
        const target = e.target;
        const val = target.value;
        const blocks = activeNote.content.split('\n\n');
        blocks[idx] = val;
        updateActiveNote({content: blocks.join('\n\n')});

        target.style.height = 'auto';
        target.style.height = (target.scrollHeight) + 'px';

        const cursor = target.selectionStart;
        const textBeforeCursor = val.slice(0, cursor);

        const match = textBeforeCursor.match(/(?:^|\s)@(\S*)$/);
        if (match) {
            const query = match[1] || '';
            setMentionQuery(query);
            setShowMentionMenu(true);
            setMentionIndex(0);

            const coords = getCaretCoordinates(target, cursor);
            const rect = target.getBoundingClientRect();
            const containerRect = target.parentElement?.getBoundingClientRect() || {top: 0};

            setMentionCoords({
                top: coords.top + 24 + (rect.top - containerRect.top), left: coords.left
            });
        } else {
            setShowMentionMenu(false);
        }
    };

    const handleBlur = () => {
        setActiveBlockIdx(null);
        if (activeNote) {
            const normalized = normalizeListNewlines(activeNote.content || '');
            if (normalized !== activeNote.content) {
                updateActiveNote({content: normalized});
            }
        }
    };

    const toggleTaskInActiveNote = (taskText: string, currentChecked: boolean) => {
        const targetNote = activeNote;
        if (!targetNote) return;
        const cleanText = taskText.trim().replace(/\s+/g, ' ');
        const lines = (targetNote.content || '').split('\n');
        let replaced = false;
        const newLines = lines.map(line => {
            if (replaced) return line;
            const taskRegex = currentChecked
                ? /^(\s*[-*+]\s+)\[[xX]\](\s*.*)$/
                : /^(\s*[-*+]\s+)\[ \](\s*.*)$/;
            const m = line.match(taskRegex);
            if (m) {
                const lineRest = (m[2] || '').trim().replace(/\s+/g, ' ');
                const lineRestClean = lineRest.replace(/[*_~`#]|(\[\[)|(\]\])/g, '').trim();
                const cleanTextClean = cleanText.replace(/[*_~`#]|(\[\[)|(\]\])/g, '').trim();
                if (!cleanText || lineRest === cleanText || lineRestClean === cleanTextClean || lineRestClean.includes(cleanTextClean) || cleanTextClean.includes(lineRestClean)) {
                    replaced = true;
                    const newPrefix = currentChecked ? '[ ]' : '[x]';
                    return `${m[1] || ''}${newPrefix}${m[2] || ''}`;
                }
            }
            return line;
        });

        if (replaced) {
            updateActiveNote({ content: newLines.join('\n') });
        }
    };

    const insertMention = (goal: any, idx: number) => {
        const goalText = goal.name;
        const ref = textareaRefs.current[idx];
        if (!ref) return;
        const cursor = ref.selectionStart;

        if (!activeNote) return;

        const blocks = activeNote.content.split('\n\n');
        const blockContent = blocks[idx] || '';
        const textBeforeCursor = blockContent.slice(0, cursor);
        const match = textBeforeCursor.match(/(?:^|\s)@(\S*)$/);

        if (match) {
            const matchLength = match[1]?.length || 0;
            const startIdx = cursor - matchLength - 1;
            blocks[idx] = blockContent.slice(0, startIdx) + `**@${goalText}** ` + blockContent.slice(cursor);
            updateActiveNote({content: blocks.join('\n\n')});

            setTimeout(() => {
                if (textareaRefs.current[idx]) {
                    const newCursorPos = startIdx + goalText.length + 4;
                    textareaRefs.current[idx]!.selectionStart = textareaRefs.current[idx]!.selectionEnd = newCursorPos;
                    textareaRefs.current[idx]!.focus();
                }
            }, 0);
        }
        setShowMentionMenu(false);
    };

    useEffect(() => {
        if (activeBlockIdx !== null && textareaRefs.current[activeBlockIdx]) {
            const ref = textareaRefs.current[activeBlockIdx];
            if (ref) {
                ref.focus();
                ref.style.height = 'auto';
                ref.style.height = (ref.scrollHeight) + 'px';
            }
        }
    }, [activeBlockIdx]);

    const renderBlock = (rawBlock: string) => {
        if (!rawBlock) return '\u00A0';
        let content = rawBlock;
        // Preprocess ==highlight==
        content = content.replace(/==([^=\n]+)==/g, '**§HL§$1§HL§**');
        // Preprocess [[Wiki Note]]
        content = content.replace(/\[\[([^\]\n]+)\]\]/g, '**§WIKI§$1§WIKI§**');
        return content;
    };

    const customMarkdownComponents: Record<string, React.ElementType> = {
        ul: ({children, ...props}: any) => {
            const cleanChildren = React.Children.toArray(children).filter(child =>
                typeof child !== 'string' || child.trim() !== ''
            );
            return <ul {...props}>{cleanChildren}</ul>;
        },
        ol: ({children, ...props}: any) => {
            const cleanChildren = React.Children.toArray(children).filter(child =>
                typeof child !== 'string' || child.trim() !== ''
            );
            return <ol {...props}>{cleanChildren}</ol>;
        },
        li: ({children, checked, className, node, ...props}: any) => {
            let isTask = className?.includes('task-list-item') || typeof checked === 'boolean';
            let isChecked = typeof checked === 'boolean' ? checked : false;

            // Extract checkbox state from hast node properties if available
            if (node?.children) {
                const inputChild = node.children.find((c: any) => c.tagName === 'input' && c.properties?.type === 'checkbox');
                if (inputChild) {
                    isTask = true;
                    isChecked = Boolean(inputChild.properties?.checked);
                }
            }

            // Also check React children for input checkbox
            if (!isChecked) {
                React.Children.forEach(children, child => {
                    if (React.isValidElement(child) && (child.type === 'input' || (child.props as any)?.type === 'checkbox')) {
                        isTask = true;
                        if ((child.props as any)?.checked !== undefined) {
                            isChecked = Boolean((child.props as any).checked);
                        } else if ((child.props as any)?.defaultChecked !== undefined) {
                            isChecked = Boolean((child.props as any).defaultChecked);
                        }
                    }
                });
            }

            if (isTask) {
                const extractCleanText = (nodes: any): string => {
                    let result = '';
                    React.Children.forEach(nodes, node => {
                        if (!node) return;
                        if (typeof node === 'string' || typeof node === 'number') {
                            result += ' ' + node;
                        } else if (React.isValidElement(node)) {
                            if (node.type === 'input' || (node.props as any)?.type === 'checkbox') return;
                            if ((node.props as any)?.children) {
                                result += ' ' + extractCleanText((node.props as any).children);
                            }
                        }
                    });
                    return result.trim();
                };
                const taskText = extractCleanText(children);

                const filteredChildren = React.Children.toArray(children).filter(child => {
                    if (React.isValidElement(child) && (child.type === 'input' || (child.props as any)?.type === 'checkbox')) return false;
                    return typeof child !== 'string' || child.trim() !== '';
                });

                return (
                    <li
                        className="obsidian-task-item"
                        style={{
                            listStyleType: 'none',
                            display: 'flex',
                            alignItems: 'flex-start',
                            margin: '4px 0',
                            lineHeight: 1.65,
                            whiteSpace: 'normal',
                            gap: '9px'
                        }}
                        {...props}
                    >
                        <span
                            role="checkbox"
                            aria-checked={isChecked}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleTaskInActiveNote(taskText, isChecked);
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '16px',
                                height: '16px',
                                marginTop: '4px',
                                borderRadius: '4px',
                                border: isChecked ? '1.5px solid var(--accent, #EAB308)' : '1.5px solid rgba(255, 255, 255, 0.35)',
                                background: isChecked ? 'var(--accent, #EAB308)' : 'rgba(255, 255, 255, 0.05)',
                                cursor: 'pointer',
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {isChecked && <Check size={11} color="#000" strokeWidth={3.5} />}
                        </span>
                        <span style={{
                            flex: 1,
                            textDecoration: isChecked ? 'line-through' : 'none',
                            opacity: isChecked ? 0.55 : 1,
                            color: isChecked ? 'var(--text-secondary)' : 'inherit'
                        }}>
                            {filteredChildren}
                        </span>
                    </li>
                );
            }

            const cleanChildren = React.Children.toArray(children).filter(child =>
                typeof child !== 'string' || child.trim() !== ''
            );
            return <li {...props}>{cleanChildren}</li>;
        },
        pre: ({children}: any) => <>{children}</>,
        code: MarkdownCode,
        blockquote: ({children, ...props}: any) => {
            const childArray = React.Children.toArray(children).filter(child => typeof child !== 'string' || child.trim() !== '');
            let firstText = '';
            if (childArray.length > 0) {
                const first = childArray[0];
                if (typeof first === 'string') {
                    firstText = first.trim();
                } else if (React.isValidElement(first) && (first.props as any)?.children) {
                    const inner = React.Children.toArray((first.props as any).children).filter(c => typeof c !== 'string' || c.trim() !== '');
                    if (typeof inner[0] === 'string') firstText = inner[0].trim();
                }
            }

            const calloutMatch = firstText.match(/^\[!([a-zA-Z_-]+)\](?:\s*(.*))?$/m);
            if (calloutMatch) {
                const rawType = (calloutMatch[1] || 'note').toLowerCase();
                const customTitle = calloutMatch[2]?.trim();

                const config: Record<string, { color: string; label: string; icon: any; bg: string }> = {
                    note: { color: '#3B82F6', label: 'Note', icon: Info, bg: 'rgba(59, 130, 246, 0.08)' },
                    info: { color: '#06B6D4', label: 'Info', icon: Info, bg: 'rgba(6, 182, 212, 0.08)' },
                    tip: { color: '#10B981', label: 'Tip', icon: Lightbulb, bg: 'rgba(16, 185, 129, 0.08)' },
                    hint: { color: '#10B981', label: 'Hint', icon: Lightbulb, bg: 'rgba(16, 185, 129, 0.08)' },
                    important: { color: '#8B5CF6', label: 'Important', icon: AlertTriangle, bg: 'rgba(139, 92, 246, 0.08)' },
                    warning: { color: '#F59E0B', label: 'Warning', icon: AlertTriangle, bg: 'rgba(245, 158, 11, 0.08)' },
                    caution: { color: '#F97316', label: 'Caution', icon: AlertTriangle, bg: 'rgba(249, 115, 22, 0.08)' },
                    danger: { color: '#EF4444', label: 'Danger', icon: AlertTriangle, bg: 'rgba(239, 68, 68, 0.08)' },
                    error: { color: '#EF4444', label: 'Error', icon: AlertTriangle, bg: 'rgba(239, 68, 68, 0.08)' },
                    success: { color: '#10B981', label: 'Success', icon: CheckCircle2, bg: 'rgba(16, 185, 129, 0.08)' },
                    done: { color: '#10B981', label: 'Done', icon: CheckCircle2, bg: 'rgba(16, 185, 129, 0.08)' },
                    check: { color: '#10B981', label: 'Check', icon: CheckCircle2, bg: 'rgba(16, 185, 129, 0.08)' },
                    question: { color: '#A855F7', label: 'Question', icon: HelpCircle, bg: 'rgba(168, 85, 247, 0.08)' },
                    help: { color: '#A855F7', label: 'Help', icon: HelpCircle, bg: 'rgba(168, 85, 247, 0.08)' },
                    faq: { color: '#A855F7', label: 'FAQ', icon: HelpCircle, bg: 'rgba(168, 85, 247, 0.08)' }
                };

                const current = config[rawType] || {
                    color: 'var(--accent, #EAB308)',
                    label: rawType.toUpperCase(),
                    icon: Info,
                    bg: 'rgba(234, 179, 8, 0.08)'
                };
                const CalloutIcon = current.icon;
                const title = customTitle || current.label;

                const cleanChildren = React.Children.map(childArray, (child, idx) => {
                    if (idx === 0 && React.isValidElement(child)) {
                        const childProps = child.props as any;
                        const innerChildren = React.Children.toArray(childProps.children);
                        const firstInnerIdx = innerChildren.findIndex(c => typeof c === 'string' && c.trim().startsWith('[!'));
                        if (firstInnerIdx !== -1) {
                            const str = innerChildren[firstInnerIdx] as string;
                            const remaining = str.replace(/^\[!([a-zA-Z_-]+)\](?:\s*(.*))?(?:\n|$)/m, '');
                            const newInner = [...innerChildren];
                            if (!remaining.trim()) {
                                newInner.splice(firstInnerIdx, 1);
                            } else {
                                newInner[firstInnerIdx] = remaining;
                            }
                            if (newInner.length === 0) return null;
                            return React.cloneElement(child, {
                                ...childProps,
                                children: newInner
                            });
                        }
                    }
                    return child;
                });

                return (
                    <div
                        className={`obsidian-callout obsidian-callout-${rawType}`}
                        style={{
                            margin: '12px 0',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            borderLeft: `4px solid ${current.color}`,
                            background: current.bg,
                            borderTop: `1px solid ${current.color}25`,
                            borderRight: `1px solid ${current.color}25`,
                            borderBottom: `1px solid ${current.color}25`
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 600,
                            fontSize: '14px',
                            color: current.color,
                            marginBottom: cleanChildren.filter(Boolean).length > 0 ? '6px' : 0
                        }}>
                            <CalloutIcon size={16} strokeWidth={2.5} />
                            <span>{title}</span>
                        </div>
                        <div style={{fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary)'}}>
                            {cleanChildren}
                        </div>
                    </div>
                );
            }

            return (
                <blockquote
                    {...props}
                    style={{
                        margin: '10px 0',
                        padding: '8px 16px',
                        borderLeft: '3px solid var(--accent, #EAB308)',
                        background: 'rgba(234, 179, 8, 0.04)',
                        borderRadius: '0 8px 8px 0',
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic',
                        lineHeight: 1.6
                    }}
                >
                    {children}
                </blockquote>
            );
        },
        table: ({children, ...props}: any) => (
            <div style={{overflowX: 'auto', margin: '12px 0'}}>
                <table className="obsidian-table" {...props}>{children}</table>
            </div>
        ),
        hr: () => (
            <hr style={{
                border: 'none',
                borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                margin: '18px 0',
                width: '100%'
            }} />
        ),
        a: ({href, children, ...props}: any) => (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    color: 'var(--accent, #EAB308)',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                    wordBreak: 'break-all',
                    cursor: 'pointer'
                }}
                onClick={(e) => e.stopPropagation()}
                {...props}
            >
                {children}
            </a>
        ),
        del: ({children, ...props}: any) => (
            <del style={{
                textDecoration: 'line-through',
                opacity: 0.6,
                color: 'var(--text-secondary)'
            }} {...props}>
                {children}
            </del>
        ),
        strong: ({children, ...props}: any) => {
            const text = String(children).trim();
            if (text.startsWith('§HL§') && text.endsWith('§HL§')) {
                const hlContent = text.slice(4, -4);
                return (
                    <mark style={{
                        background: 'rgba(234, 179, 8, 0.25)',
                        color: '#FFF',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        borderBottom: '1.5px solid var(--accent, #EAB308)'
                    }}>
                        {hlContent}
                    </mark>
                );
            }
            if (text.startsWith('§WIKI§') && text.endsWith('§WIKI§')) {
                const noteName = text.slice(6, -6);
                return (
                    <span
                        onClick={(e) => {
                            e.stopPropagation();
                            const targetNote = notes.find(n => (n.name || '').toLowerCase() === noteName.toLowerCase());
                            if (targetNote) {
                                setActiveNoteId(targetNote.id);
                            }
                        }}
                        className="obsidian-wikilink"
                        style={{
                            color: 'var(--accent, #EAB308)',
                            background: 'rgba(234, 179, 8, 0.1)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            border: '1px solid rgba(234, 179, 8, 0.3)',
                            transition: 'all 0.15s ease'
                        }}
                        title={`Go to note: ${noteName}`}
                    >
                        <FileText size={12} />
                        {noteName}
                    </span>
                );
            }
            if (text.startsWith('@')) {
                const goalName = text.slice(1);
                const goal = allGoals.find((g: any) => (g.name || '').toLowerCase() === goalName.toLowerCase());
                if (goal && goal.color) {
                    return (<strong {...props} style={{
                            color: goal.color,
                            background: `${goal.color}20`,
                            padding: '0 4px',
                            borderRadius: '4px'
                        }}>
                            {children}
                        </strong>);
                } else if (goal) {
                    return (<strong {...props} style={{
                            color: 'var(--text-primary)',
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
    };

    const isFolderVisible = (f: FolderType): boolean => {
        if (!isPublicView) return true;
        if ((f.name || '').includes('[public]')) return true;
        const hasNote = visibleNotes.some(n => n.folderId === f.id);
        if (hasNote) return true;
        const subFolders = folders.filter(sf => sf.parentId === f.id);
        return subFolders.some(isFolderVisible);
    };

    const filteredNotes = visibleNotes.filter(n => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (n.name || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q);
    });

    const renderTree = (parentId: string | null = null, level = 0, isLife = false) => {
        const childFolders = folders.filter(f => f.parentId === parentId && f.isLife === isLife && isFolderVisible(f));
        let childNotes = visibleNotes.filter(n => (n.folderId || null) === parentId && n.isLife === isLife);

        if (searchQuery) {
            if (parentId !== null) return null;
            childNotes = filteredNotes;
        } else {
            childNotes = childNotes.filter(n => filteredNotes.some(fn => fn.id === n.id));
        }

        return (<div style={{paddingLeft: level === 0 ? '0' : '12px'}}>
                {!searchQuery && childFolders.map(f => (<div key={f.id}>
                        <div
                            style={{
                                padding: '10px 12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                                fontWeight: '500'
                            }}
                            className="tree-item"
                        >
                            <div
                                style={{display: 'flex', alignItems: 'center', gap: '6px', flex: 1, overflow: 'hidden'}}
                                onClick={() => updateFolder(f.id, {isExpanded: !f.isExpanded})}
                            >
                                {f.isExpanded ?
                                    <ChevronDown size={16} style={{flexShrink: 0, color: 'var(--text-secondary)'}}/> :
                                    <ChevronRight size={16} style={{flexShrink: 0, color: 'var(--text-secondary)'}}/>}
                                <Folder size={16} style={{flexShrink: 0, color: 'var(--text-secondary)'}}/>
                                <input
                                    value={f.name}
                                    onChange={(e) => updateFolder(f.id, {name: e.target.value})}
                                    onBlur={(e) => updateFolder(f.id, {name: e.target.value.trim()})}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'inherit',
                                        fontSize: '14px',
                                        outline: 'none',
                                        width: '100%',
                                        textOverflow: 'ellipsis',
                                        fontWeight: 'inherit'
                                    }}
                                />
                            </div>
                            <div style={{display: 'flex', gap: '4px', flexShrink: 0}} className="tree-item-actions">
                                <button className="icon-btn" onClick={() => createNote(f.id)} style={{padding: '6px'}}
                                        title="New Plan here"><FilePlus size={14}/></button>
                                <button className="icon-btn" onClick={() => createFolder(f.id)} style={{padding: '6px'}}
                                        title="New Subfolder"><FolderPlus size={14}/></button>
                                <button className="icon-btn" onClick={() => deleteFolder(f.id)} style={{padding: '6px'}}
                                        title="Delete Folder"><Trash2 size={14} color="var(--danger)"/></button>
                            </div>
                        </div>
                        {f.isExpanded && renderTree(f.id, level + 1, isLife)}
                    </div>))}
                {childNotes.map(n => {
                    const isActive = n.id === activeNoteId;
                    const snippet = (n.content || '').split('\n').find(l => l.trim().length > 0)?.substring(0, 40) || 'No additional text';
                    const date = new Date(n.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
                    return (<div
                            key={n.id}
                            onClick={() => {
                                setActiveNoteId(n.id);
                                if (isMobile) setIsDocBarCollapsed(true);
                            }}
                            style={{
                                padding: '10px 14px',
                                margin: '2px 8px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                background: isActive ? 'var(--accent)' : 'transparent',
                                color: isActive ? '#000' : 'inherit',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                transition: 'all 0.15s ease',
                            }}
                            className={`tree-item ${isActive ? 'active' : ''}`}
                        >
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span style={{
                    fontSize: '14px',
                    fontWeight: isActive ? '600' : '500',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: isActive ? '#000' : 'var(--text-primary)'
                }}>
                  {n.name || 'Untitled Plan'}
                </span>
                                <div style={{display: 'flex', gap: '4px', flexShrink: 0}} className="tree-item-actions">
                                    <button
                                        className="icon-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            duplicateNote(n.id);
                                        }}
                                        style={{padding: '4px', color: isActive ? 'rgba(0,0,0,0.6)' : 'inherit'}}
                                        title="Duplicate Plan"
                                    >
                                        <Copy size={14}/>
                                    </button>
                                    <button
                                        className="icon-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNote(n.id);
                                        }}
                                        style={{padding: '4px', color: isActive ? 'rgba(0,0,0,0.6)' : 'var(--danger)'}}
                                        title="Delete Plan"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'center',
                                fontSize: '12px',
                                color: isActive ? 'rgba(0,0,0,0.6)' : 'var(--text-secondary)'
                            }}>
                                <span style={{fontWeight: isActive ? '600' : '500'}}>{date}</span>
                                <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                  {snippet}
                </span>
                            </div>
                        </div>);
                })}
            </div>);
    };

    const showSidebar = isMobile ? !activeNote : !isDocBarCollapsed;
    const showEditor = isMobile ? !!activeNote : true;

    return (<div className="plans-pane-container"
                 style={{display: 'flex', flexDirection: 'row', width: '100%', height: '100%'}}>
            <style>{`
        .tree-item-actions { opacity: 0; transition: opacity 0.2s; }
        .tree-item:hover .tree-item-actions, .tree-item.active .tree-item-actions { opacity: 1; }
        .tree-item:hover:not(.active) { background: rgba(255, 255, 255, 0.05); }
      `}</style>
            {/* Sidebar for Plans */}
            {showSidebar && (<div className="plans-sidebar" style={{
                    borderRight: '1px solid var(--panel-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0
                }}>
                    <div style={{
                        padding: '16px',
                        borderBottom: '1px solid var(--panel-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <button
                                onClick={() => createNote(null, true)}
                                style={{
                                    flex: 1,
                                    background: 'var(--accent)',
                                    color: '#000',
                                    border: 'none',
                                    padding: '8px 6px',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                                title="Add Life Plan"
                            >
                                <FilePlus size={14}/> + Life Plan
                            </button>
                            {!isMobile && (
                                <button
                                    className="hide-on-mobile"
                                    onClick={() => createNote(null, false)}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--panel-border)',
                                        padding: '8px 6px',
                                        borderRadius: '6px',
                                        fontWeight: '600',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                    title="Add Routine Plan"
                                >
                                    <FilePlus size={14}/> + Routine Plan
                                </button>
                            )}
                            {!isMobile && (<button className="icon-btn" onClick={() => setIsDocBarCollapsed(true)}
                                                   style={{
                                                       padding: '6px',
                                                       display: 'flex',
                                                       color: 'var(--text-secondary)',
                                                       flexShrink: 0
                                                   }} title="Close sidebar">
                                    <PanelLeftClose size={18}/>
                                </button>)}
                        </div>
                        <div style={{position: 'relative'}}>
                            <Search size={14} style={{
                                position: 'absolute',
                                left: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-secondary)'
                            }}/>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search plans..."
                                style={{
                                    width: '100%',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--panel-border)',
                                    borderRadius: '4px',
                                    padding: '6px 10px 6px 30px',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>
                    <div className="plans-sidebar-content" style={{flex: 1, overflowY: 'auto', padding: '8px 0'}}>
                        {(!searchQuery) && (<div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0 12px',
                                marginBottom: '8px',
                                marginTop: '8px'
                            }}>
                                <h3 style={{
                                    margin: 0,
                                    fontSize: '11px',
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>Life Plans</h3>
                                <div style={{display: 'flex', gap: '4px'}}>
                                    <button className="icon-btn" onClick={() => createFolder(null, true)}
                                            style={{padding: '6px'}} title="Add Life Folder">
                                        <FolderPlus size={16}/>
                                    </button>
                                    <button className="icon-btn" onClick={() => createNote(null, true)}
                                            style={{padding: '6px'}} title="Add Life Plan">
                                        <FilePlus size={16}/>
                                    </button>
                                </div>
                            </div>)}

                        {renderTree(null, 0, true)}

                        {(!searchQuery) && (<>
                                <div
                                    style={{margin: '16px 12px 8px 12px', borderTop: '1px solid var(--panel-border)'}}/>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0 12px',
                                    marginBottom: '8px'
                                }}>
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: '11px',
                                        color: 'var(--text-secondary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>Routine Plans</h3>
                                    <div style={{display: 'flex', gap: '4px'}}>
                                        <button className="icon-btn" onClick={() => createFolder(null, false)}
                                                style={{padding: '6px'}} title="Add Routine Folder">
                                            <FolderPlus size={16}/>
                                        </button>
                                        <button className="icon-btn" onClick={() => createNote(null, false)}
                                                style={{padding: '6px'}} title="Add Routine Plan">
                                            <FilePlus size={16}/>
                                        </button>
                                    </div>
                                </div>
                            </>)}

                        {renderTree(null, 0, false)}

                        {visibleNotes.length === 0 && folders.length === 0 && !searchQuery && (<div style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: 'var(--text-secondary)',
                                fontSize: '11px'
                            }}>
                                {isPublicView ? 'No public plans yet. Mark a plan name with [public] to display it here.' : 'No plans yet. Click + to create one.'}
                            </div>)}
                        {searchQuery && filteredNotes.length === 0 && (<div style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: 'var(--text-secondary)',
                                fontSize: '11px'
                            }}>
                                No matches found.
                            </div>)}
                    </div>
                </div>)}

            {/* Editor Area */}
            {showEditor && (<div className={`plans-editor-wrapper ${!activeNote ? 'empty-state' : ''}`} style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    minWidth: 0
                }}>

                    {activeNote ? (<>
                            <div style={{
                                padding: '16px 24px',
                                borderBottom: '1px solid var(--panel-border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px'
                            }}>
                                {isMobile ? (<div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        color: 'var(--accent)',
                                        marginRight: '4px'
                                    }} onClick={() => setActiveNoteId(null)}>
                                        <ChevronLeft size={24} style={{marginLeft: '-8px'}}/>
                                        <span style={{fontSize: '16px', fontWeight: '500'}}>Plans</span>
                                    </div>) : isDocBarCollapsed && (
                                    <button className="icon-btn" onClick={() => setIsDocBarCollapsed(false)}
                                            style={{padding: '4px', display: 'flex', color: 'var(--text-secondary)'}}
                                            title="Expand sidebar">
                                        <PanelLeftOpen size={18}/>
                                    </button>)}
                                <input
                                    id="plan-note-title-input"
                                    type="text"
                                    value={activeNote.name || ''}
                                    onChange={e => updateActiveNote({name: e.target.value})}
                                    onBlur={e => updateActiveNote({name: e.target.value.trim()})}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#fff',
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        width: '100%',
                                        padding: 0,
                                        outline: 'none',
                                        boxShadow: 'none'
                                    }}
                                    placeholder="Plan Name"
                                />
                            </div>
                            <div className="plans-editor-scroll" style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative',
                                padding: '24px',
                                overflowY: 'auto'
                            }}>

                                {/* Single Pane Obsidian-style Blocks */}
                                <div style={{maxWidth: '800px', margin: '0 auto', width: '100%', position: 'relative'}}>
                                    {(activeNote.content || '').split('\n\n').map((block, idx) => {
                                        const isActive = activeBlockIdx === idx;

                                        return (<div
                                                key={idx}
                                                onClick={() => setActiveBlockIdx(idx)}
                                                style={{
                                                    minHeight: '28px',
                                                    cursor: isActive ? 'text' : 'pointer',
                                                    padding: '4px 0',
                                                    marginBottom: '8px'
                                                }}
                                            >
                                                {isActive ? (<textarea
                                                        ref={el => {
                                                            textareaRefs.current[idx] = el;
                                                        }}
                                                        value={block}
                                                        onChange={e => handleInput(e, idx)}
                                                        onKeyDown={e => handleKeyDown(e, idx)}
                                                        onBlur={handleBlur}
                                                        placeholder={idx === 0 && !block ? "Start typing your plan... (Use @ to tag goals)" : ""}
                                                        style={{
                                                            width: '100%',
                                                            resize: 'none',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--text-primary)',
                                                            padding: 0,
                                                            fontSize: '16px',
                                                            lineHeight: '1.6',
                                                            outline: 'none',
                                                            boxShadow: 'none',
                                                            fontFamily: 'inherit',
                                                            overflow: 'hidden',
                                                            wordBreak: 'break-word',
                                                            whiteSpace: 'pre-wrap'
                                                        }}
                                                    />) : (
                                                    <div className="markdown-preview" style={{minHeight: '24px'}}>
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={customMarkdownComponents}>
                                                            {renderBlock(block)}
                                                        </ReactMarkdown>
                                                    </div>)}
                                            </div>);
                                    })}

                                    {/* Empty space at bottom to allow clicking to add new blocks */}
                                    <div
                                        style={{height: '60vh', cursor: 'text'}}
                                        onClick={() => {
                                            const blocks = (activeNote.content || '').split('\n\n');
                                            if (blocks[blocks.length - 1] !== '') {
                                                updateActiveNote({content: activeNote.content + '\n\n'});
                                            }
                                            setActiveBlockIdx(blocks.length);
                                        }}
                                    />

                                    {/* Mention Menu Overlay */}
                                    {showMentionMenu && filteredGoals.length > 0 && (<div
                                            style={{
                                                position: 'absolute',
                                                top: mentionCoords.top + 'px',
                                                left: mentionCoords.left + 'px',
                                                background: 'var(--bg)',
                                                border: '1px solid var(--panel-border)',
                                                borderRadius: '8px',
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                                zIndex: 100,
                                                maxHeight: '200px',
                                                overflowY: 'auto',
                                                minWidth: '250px'
                                            }}
                                        >
                                            {filteredGoals.map((g, i) => (<div
                                                    key={String(g.id || i)}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        if (activeBlockIdx !== null) {
                                                            insertMention(g, activeBlockIdx);
                                                        }
                                                    }}
                                                    onMouseEnter={() => setMentionIndex(i)}
                                                    style={{
                                                        padding: '10px 14px',
                                                        cursor: 'pointer',
                                                        background: i === mentionIndex ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                                                        display: 'flex',
                                                        flexDirection: 'column'
                                                    }}
                                                >
                        <span style={{
                            fontSize: '13px',
                            color: '#fff',
                            fontWeight: i === mentionIndex ? 'bold' : 'normal'
                        }}>
                          {g.name}
                        </span>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        color: 'var(--text-primary)',
                                                        marginTop: '2px'
                                                    }}>
                          {g.type}
                        </span>
                                                </div>))}
                                        </div>)}
                                </div>
                            </div>
                        </>) : (<div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                            {isDocBarCollapsed && (
                                <div style={{padding: '16px 24px', borderBottom: '1px solid var(--panel-border)'}}>
                                    <button className="icon-btn" onClick={() => setIsDocBarCollapsed(false)}
                                            style={{padding: '4px', display: 'flex', color: 'var(--text-secondary)'}}
                                            title="Expand sidebar">
                                        <PanelLeftOpen size={18}/>
                                    </button>
                                </div>)}
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-secondary)'
                            }}>
                                {isPublicView
                                    ? 'No public plan selected. Plans without [public] in their title are hidden in Public Mode.'
                                    : 'Select or create a plan to start writing'}
                            </div>
                        </div>)}
                </div>)}

            {/* Confirm Modal */}
            {confirmConfig && (<ConfirmModal
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    isDanger={confirmConfig.isDanger}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={confirmConfig.onCancel}
                />)}
        </div>);
}
