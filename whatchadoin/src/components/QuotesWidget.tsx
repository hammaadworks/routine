import {useEffect, useState} from 'react';
import {Check, Edit2, Plus, Settings, Shuffle, Trash2, X} from 'lucide-react';
import { useWebMCP } from 'use-webmcp-tool';
import BaseModal from './BaseModal';


export interface Quote {
    id: string;
    text: string;
}

const DEFAULT_QUOTES: Quote[] = [

    {id: '1', text: "Get up. Discipline is how ambition turns into money."}, {
        id: '2',
        text: "Consistency is boring, but it pays rent and freedom."
    }, {id: '3', text: "Your habits are literally designing your bank account."}, {
        id: '4',
        text: "Stand up and act like the disciplined routine of you."
    }, {id: '5', text: "One focused action today builds tomorrow's income."}, {
        id: '6',
        text: "Discipline beats motivation, especially on lazy days."
    }, {id: '7', text: "Do the small habit now. Let compounding cook."}, {
        id: '8',
        text: "Your identity decides your income, move accordingly."
    }, {id: '9', text: "Lock in daily. Success loves predictable effort."}, {
        id: '10',
        text: "Consistency is how underachievers turn unstoppable."
    }, {id: '11', text: "Build habits that make success automatic."}, {
        id: '12',
        text: "Focus is currency, stop spending it on nothing."
    }, {id: '13', text: "Act broke in effort, rich in discipline."}, {
        id: '14',
        text: "You don't feel disciplined. You act disciplined."
    }, {id: '15', text: "Your routine is your wealth strategy."}, {
        id: '16',
        text: "Show up tired. Consistency still counts."
    }, {id: '17', text: "Discipline today funds freedom tomorrow."}, {
        id: '18',
        text: "Stack disciplined days. Watch money follow."
    }, {id: '19', text: "Habits don't ask how you feel. Neither should you."}, {
        id: '20',
        text: "Get up. Become the person who doesn't quit."
    }];

export default function QuotesWidget() {
    const [quotes, setQuotes] = useState<Quote[]>(() => {
        const saved = localStorage.getItem('whatchadoin_quotes');
        if (saved) return JSON.parse(saved);
        return DEFAULT_QUOTES;
    });

    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [newQuoteText, setNewQuoteText] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    useEffect(() => {
        localStorage.setItem('whatchadoin_quotes', JSON.stringify(quotes));
    }, [quotes]);

    const handleShuffle = () => {
        if (quotes.length <= 1) return;
        let nextIndex = currentQuoteIndex;
        while (nextIndex === currentQuoteIndex) {
            nextIndex = Math.floor(Math.random() * quotes.length);
        }
        setCurrentQuoteIndex(nextIndex);
    };

    const handleAdd = (text?: string | any) => {
        const txt = typeof text === 'string' ? text : newQuoteText;
        if (!txt.trim()) return;
        const newQuote = {id: Date.now().toString(), text: txt.trim()};
        const newQuotes = [...quotes, newQuote];
        setQuotes(newQuotes);
        setNewQuoteText('');
        setCurrentQuoteIndex(newQuotes.length - 1);
    };

    useWebMCP({
        name: 'add_quote',
        description: 'Add a new motivational quote to the widget at the bottom of the screen.',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'The text of the quote to add' }
            },
            required: ['text']
        },
        execute: async (inputs: any) => {
            handleAdd(inputs.text);
            return { success: true, message: `Quote added.` };
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true, consequentialHint: false }
    });

    const handleDelete = (id: string) => {
        const updated = quotes.filter(q => q.id !== id);
        if (updated.length === 0) {
            const defaultOne = {id: Date.now().toString(), text: "Keep going."};
            setQuotes([defaultOne]);
            setCurrentQuoteIndex(0);
        } else {
            setQuotes(updated);
            if (currentQuoteIndex >= updated.length) {
                setCurrentQuoteIndex(0);
            }
        }
    };

    const startEdit = (quote: Quote) => {
        setEditingId(quote.id);
        setEditText(quote.text);
    };

    const saveEdit = (id: string) => {
        if (!editText.trim()) return;
        setQuotes(quotes.map(q => q.id === id ? {...q, text: editText.trim()} : q));
        setEditingId(null);
    };

    const currentQuote = quotes[currentQuoteIndex] || quotes[0];

    return (<>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                <div style={{fontStyle: 'italic', cursor: 'pointer'}} onClick={handleShuffle} title="Click to shuffle">
                    "{currentQuote?.text}"
                </div>
                <button onClick={handleShuffle} className="icon-btn" style={{padding: '4px', opacity: 0.7}}
                        title="Shuffle">
                    <Shuffle size={12}/>
                </button>
                <button onClick={() => setShowModal(true)} className="icon-btn" style={{padding: '4px', opacity: 0.7}}
                        title="Manage Quotes">
                    <Settings size={12}/>
                </button>
            </div>

            <BaseModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Manage Quotes"
                maxWidth="500px"
            >
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>

                    <div style={{display: 'flex', gap: '8px'}}>
                        <input name="auto_field_22"
                            type="text"
                            placeholder="Add a new quote..."
                            value={newQuoteText}
                            onChange={e => setNewQuoteText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--panel-border)',
                                background: 'var(--bg)',
                                color: '#fff'
                            }}
                        />
                        <button onClick={handleAdd} className="primary" style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <Plus size={16}/> Add
                        </button>
                    </div>

                    <div style={{
                        maxHeight: '300px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        border: '1px solid var(--panel-border)',
                        borderRadius: '6px',
                        padding: '8px',
                        background: 'rgba(0,0,0,0.2)'
                    }}>
                        {quotes.map((q: Quote, idx: number) => (<div key={q.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                padding: '8px',
                                background: 'var(--panel-bg)',
                                borderRadius: '6px',
                                border: currentQuoteIndex === idx ? '1px solid var(--accent)' : '1px solid var(--panel-border)'
                            }}>
                                {editingId === q.id ? (<div style={{display: 'flex', gap: '8px', flex: 1}}>
                                        <input name="auto_field_23"
                                            type="text"
                                            value={editText}
                                            onChange={e => setEditText(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && saveEdit(q.id)}
                                            style={{
                                                flex: 1,
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                border: '1px solid var(--accent)',
                                                background: 'var(--bg)',
                                                color: '#fff'
                                            }}
                                            autoFocus
                                        />
                                        <button onClick={() => saveEdit(q.id)} className="icon-btn"
                                                style={{color: 'var(--accent)'}}><Check size={16}/></button>
                                        <button onClick={() => setEditingId(null)} className="icon-btn"
                                                style={{color: 'var(--text-secondary)'}}><X size={16}/></button>
                                    </div>) : (<>
                                        <div
                                            style={{
                                                flex: 1,
                                                fontStyle: 'italic',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                color: currentQuoteIndex === idx ? 'var(--accent)' : 'inherit'
                                            }}
                                            onClick={() => setCurrentQuoteIndex(idx)}
                                            title="Set as active quote"
                                        >
                                            "{q.text}"
                                        </div>
                                        <div style={{display: 'flex', gap: '4px'}}>
                                            <button onClick={() => startEdit(q)} className="icon-btn"
                                                    style={{padding: '4px', color: 'var(--text-secondary)'}}
                                                    title="Edit"><Edit2 size={14}/></button>
                                            <button onClick={() => handleDelete(q.id)} className="icon-btn"
                                                    style={{padding: '4px', color: 'var(--danger)'}} title="Delete">
                                                <Trash2 size={14}/></button>
                                        </div>
                                    </>)}
                            </div>))}
                    </div>

                    <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '8px'}}>
                        <button onClick={() => setShowModal(false)} className="primary"
                                style={{padding: '8px 24px', color: '#000'}}>Done
                        </button>
                    </div>
                </div>
            </BaseModal>
        </>);
}
