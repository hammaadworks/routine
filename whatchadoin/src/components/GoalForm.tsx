import React from 'react';
import {Copy, Globe, Palette, Star, Target, Wallet} from 'lucide-react';
import type {GoalCategory} from '../utils/goalTransfer';
import {useCurrency} from '../hooks/useCurrency';
import CurrencyAmountInput from './CurrencyAmountInput';

const PRESET_COLORS = ['#FF595E', '#FF9F1C', '#FFCA3A', '#8AC926', '#00F5D4', '#1982C4', '#4361EE', '#6A4C93', '#F15BB5'];

export interface GoalFormState {
    name: string;
    color: string;
    desc: string;
    cost?: string | number;
    isPublic?: boolean;
    category?: GoalCategory;
}

export interface GoalFormProps {
    formData: GoalFormState;
    setFormData: (data: GoalFormState) => void;
    onSubmit: (e: React.SyntheticEvent) => void;
    onCancel: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    isEditing: boolean;
    colorError: string;
    setColorError: (error: string) => void;
    requireCost?: boolean;
    currentCategory?: GoalCategory;
}

export default function GoalForm({
                                     formData,
                                     setFormData,
                                     onSubmit,
                                     onCancel,
                                     onDelete,
                                     onDuplicate,
                                     isEditing,
                                     colorError,
                                     setColorError,
                                     requireCost,
                                     currentCategory
                                 }: GoalFormProps) {
    const { currency, currencySymbol } = useCurrency();
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

    const targetCategory = formData.category || currentCategory || 'life';
    const isCostRequired = targetCategory === 'money' || Boolean(requireCost);
    const isMoved = isEditing && currentCategory && targetCategory !== currentCategory;
    const targetCatLabel = targetCategory.charAt(0).toUpperCase() + targetCategory.slice(1);

    let submitLabel = 'Save';
    if (isEditing) {
        submitLabel = isMoved ? `Move to ${targetCatLabel}` : 'Update';
    } else if (currentCategory && targetCategory !== currentCategory) {
        submitLabel = `Save to ${targetCatLabel}`;
    }

    const parsedCost = formData.cost !== undefined && formData.cost !== null && String(formData.cost).trim() !== ''
        ? parseFloat(String(formData.cost).replace(/,/g, ''))
        : NaN;
    const isCostValid = !isNaN(parsedCost) && parsedCost >= 0;
    const isDuplicateDisabled = !formData.name?.trim() || (isCostRequired && !isCostValid);
    const isSubmitDisabled = !!colorError || !formData.name?.trim() || (isCostRequired && !isCostValid);

    return (<form onSubmit={onSubmit} className="modal-form-layout">
            <div className="modal-form-content">
                {/* Category Selector */}
                <div>
                    <label style={{
                        fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px'
                    }}>Category</label>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px'}}>
                        {([{key: 'life' as const, label: 'Life', icon: Star, color: '#eab308'}, {
                            key: 'money' as const,
                            label: 'Money',
                            icon: Wallet,
                            color: '#10b981'
                        }, {key: 'routine' as const, label: 'Routine', icon: Target, color: '#3b82f6'}]).map(cat => {
                            const isSelected = targetCategory === cat.key;
                            return (<button
                                    key={cat.key}
                                    type="button"
                                    onClick={() => setFormData({...formData, category: cat.key})}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: isSelected ? 600 : 400,
                                        border: isSelected ? `2px solid ${cat.color}` : '1px solid var(--border)',
                                        background: isSelected ? `${cat.color}25` : 'var(--surface-light)',
                                        color: isSelected ? '#fff' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <cat.icon size={14} color={isSelected ? cat.color : 'currentColor'}/>
                                    <span>{cat.label}</span>
                                </button>);
                        })}
                    </div>
                </div>

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
                    }}>
                        {targetCategory === 'money' ? 'Target Cost' : 'Estimated Cost'} ({currencySymbol}) {isCostRequired ? <span style={{color: '#ef4444'}}>*</span> :
                        <span style={{opacity: 0.5}}>(optional)</span>}
                    </label>
                    <CurrencyAmountInput
                        name="auto_field_11"
                        placeholder={isCostRequired ? `e.g. 50,000 (required for money)` : `e.g. 50,000`}
                        value={formData.cost ?? ''}
                        onChange={(valStr) => setFormData({...formData, cost: valStr})}
                        required={isCostRequired}
                        currency={currency}
                        showWords={true}
                    />
                </div>
                <div>
                    <label style={{
                        fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px'
                    }}>Goal Description <span style={{opacity: 0.5}}>(optional)</span></label>
                    <textarea name="auto_field_12"
                              placeholder="Add more details about this goal..." value={formData.desc || ''}
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
                            return (<button
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

                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', cursor: 'pointer'}}
                     onClick={() => setFormData({...formData, isPublic: !formData.isPublic})}>
                    <span style={{
                        fontSize: '13px',
                        color: !formData.isPublic ? 'var(--danger)' : 'var(--text-secondary)',
                        fontWeight: !formData.isPublic ? 600 : 400,
                        opacity: !formData.isPublic ? 1 : 0.6
                    }}>Private</span>
                    <label className="ios-switch" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            id="goal-public"
                            checked={!!formData.isPublic}
                            onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
                        />
                        <span className="ios-slider"></span>
                    </label>
                    <span style={{
                        fontSize: '13px',
                        color: formData.isPublic ? 'var(--success)' : 'var(--text-secondary)',
                        fontWeight: formData.isPublic ? 600 : 400,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        opacity: formData.isPublic ? 1 : 0.6
                    }}>
                    <Globe size={13}/> Public (Visible to others)
                </span>
                </div>
            </div>

            <div className="modal-form-actions" style={{flexWrap: 'wrap'}}>
                {isEditing && onDelete && (<button type="button" onClick={onDelete} style={{
                        flex: '1 1 calc(50% - 4px)',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '10px 0',
                        borderRadius: '6px',
                        fontWeight: '500',
                        cursor: 'pointer'
                    }}>Delete</button>)}
                {isEditing && onDuplicate && (<button
                        type="button"
                        onClick={onDuplicate}
                        disabled={isDuplicateDisabled}
                        style={{
                            flex: '1 1 calc(50% - 4px)',
                            background: 'var(--surface-light)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border)',
                            padding: '10px 0',
                            borderRadius: '6px',
                            fontWeight: '500',
                            cursor: isDuplicateDisabled ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            opacity: isDuplicateDisabled ? 0.5 : 1
                        }}
                    >
                        <Copy size={14}/> Duplicate
                    </button>)}
                <button type="button" onClick={onCancel} className="secondary" style={{
                    flex: isEditing ? '1 1 calc(40% - 4px)' : '1 1 80px',
                    padding: '10px 0',
                    borderRadius: '6px',
                    fontWeight: '500'
                }}>Cancel
                </button>
                <button
                    type="submit"
                    className="primary"
                    disabled={isSubmitDisabled}
                    style={{
                        flex: isEditing ? '2 1 calc(60% - 4px)' : '2 1 120px',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    {submitLabel}
                </button>
            </div>
        </form>);
}
