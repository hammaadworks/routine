import React from 'react';
import { Palette, Globe } from 'lucide-react';

const PRESET_COLORS = ['#FF595E', '#FF9F1C', '#FFCA3A', '#8AC926', '#00F5D4', '#1982C4', '#4361EE', '#6A4C93', '#F15BB5'];

interface GoalFormState {
    name: string;
    color: string;
    desc: string;
    cost?: string | number;
    isPublic?: boolean;
}

interface GoalFormProps {
    formData: GoalFormState;
    setFormData: (data: GoalFormState) => void;
    onSubmit: (e: React.SyntheticEvent) => void;
    onCancel: () => void;
    onDelete?: () => void;
    isEditing: boolean;
    colorError: string;
    setColorError: (error: string) => void;
    requireCost?: boolean;
}

export default function GoalForm({
    formData,
    setFormData,
    onSubmit,
    onCancel,
    onDelete,
    isEditing,
    colorError,
    setColorError,
    requireCost
}: GoalFormProps) {
    const isCustomColor = formData.color && !PRESET_COLORS.map(c => c.toLowerCase()).includes(formData.color.toLowerCase());

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const hex = e.target.value;
        const isValid = /^#[0-9A-F]{6}$/i.test(hex);
        if (!isValid) {
            setColorError('Invalid color');
        } else {
            setColorError('');
        }
        setFormData({...formData, color: hex.toUpperCase()});
    };

    return (
        <form onSubmit={onSubmit} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <div>
                <label style={{
                    fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px'
                }}>Goal Name</label>
                <input name="auto_field_10"
                    type="text" placeholder="e.g. Write a Book" value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    style={{width: '100%'}}
                    required
                />
            </div>
            <div>
                <label style={{
                    fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px'
                }}>Estimated Cost {requireCost ? '' : <span style={{opacity: 0.5}}>(optional)</span>}</label>
                <input name="auto_field_11"
                    type="number" step="0.01" placeholder="e.g. 50" value={formData.cost || ''}
                    onChange={(e) => setFormData({...formData, cost: e.target.value})}
                    style={{width: '100%'}}
                    required={requireCost}
                />
            </div>
            <div>
                <label style={{
                    fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px'
                }}>Goal Description <span style={{opacity: 0.5}}>(optional)</span></label>
                <textarea name="auto_field_12"
                    placeholder="Add more details about this goal..." value={formData.desc}
                    onChange={(e) => setFormData({...formData, desc: e.target.value})}
                    style={{width: '100%', minHeight: '120px', resize: 'vertical'}}
                />
            </div>
            <div>
                <label style={{
                    fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px'
                }}>
                    Theme Color
                    {colorError && <span style={{color: '#ef4444', marginLeft: '8px'}}>{colorError}</span>}
                </label>
                <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center'}}>
                    {PRESET_COLORS.slice(0, 8).map(c => {
                        const isSelected = formData.color && formData.color.toLowerCase() === c.toLowerCase();
                        return (
<button
                            key={c}
                            type="button"
                            onClick={() => {
                                setColorError('');
                                setFormData({...formData, color: c});
                            }}
                            style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                padding: 0,
                                background: c,
                                border: `2px solid ${isSelected ? '#fff' : 'transparent'}`,
                                cursor: 'pointer',
                                transition: 'transform 0.1s',
                                transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                            }}
                        />);
                    })}

                    {/* Custom Color Picker */}
                    <div style={{
                        position: 'relative',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: isCustomColor ? formData.color : 'rgba(255, 255, 255, 0.1)',
                        border: `2px solid ${isCustomColor ? '#fff' : 'transparent'}`,
                        cursor: 'pointer',
                        transition: 'all 0.1s',
                        transform: isCustomColor ? 'scale(1.1)' : 'scale(1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isCustomColor ? '#fff' : 'var(--text-secondary)'
                    }}>
                        {!isCustomColor && <Palette size={12}/>}
                        <input name="auto_field_13"
                            type="color"
                            value={formData.color ? formData.color.toLowerCase() : '#ffffff'}
                            onChange={handleColorChange}
                            style={{
                                position: 'absolute',
                                top: '-10px',
                                left: '-10px',
                                width: '44px',
                                height: '44px',
                                cursor: 'pointer',
                                opacity: 0
                            }}
                            title="Custom Color"
                        />
                    </div>
                </div>
            </div>

            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px'}}>
                <input 
                    type="checkbox" 
                    id="goal-public"
                    checked={!!formData.isPublic}
                    onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
                    className="checkbox-square"
                />
                <label htmlFor="goal-public" style={{color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'}}>
                    <Globe size={14} /> Make Public (visible in Public View)
                </label>
            </div>
            <div style={{display: 'flex', gap: '8px', marginTop: '16px', width: '100%', padding: '8px 0'}}>
                {isEditing && onDelete && (
                    <button type="button" onClick={onDelete} style={{
                        flex: '0 0 20%',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '10px 0',
                        borderRadius: '6px',
                        fontWeight: '500'
                    }}>Delete</button>
                )}
                <button type="button" onClick={onCancel} className="secondary" style={{
                    flex: isEditing ? '0 0 25%' : '0 0 30%',
                    padding: '10px 0',
                    borderRadius: '6px',
                    fontWeight: '500'
                }}>Cancel</button>
                <button type="submit" className="primary" disabled={!!colorError || (requireCost && !formData.cost)} style={{
                    flex: 1, padding: '10px 0', borderRadius: '6px', fontWeight: 'bold'
                }}>{isEditing ? 'Update' : 'Save'}</button>
            </div>
        </form>
    );
}
