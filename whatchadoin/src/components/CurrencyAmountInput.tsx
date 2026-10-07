import React, { useEffect, useId, useRef, useState } from 'react';
import { useCurrency } from '../hooks/useCurrency';
import { formatAmountInWords, formatLiveNumber, stripGroupingSeparators } from '../utils/numberToWords';

export interface CurrencyAmountInputProps {
    value?: string | number;
    onChange: (valStr: string, numValue: number | undefined) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    currency?: string;
    showWords?: boolean;
    className?: string;
    style?: React.CSSProperties;
    id?: string;
    name?: string;
    autoFocus?: boolean;
}

export default function CurrencyAmountInput({
    value,
    onChange,
    placeholder = '0',
    required = false,
    disabled = false,
    currency: customCurrency,
    showWords = true,
    className = '',
    style,
    id,
    name,
    autoFocus = false
}: CurrencyAmountInputProps) {
    const { currency: defaultCurrency, currencySymbol } = useCurrency();
    const activeCurrency = customCurrency || defaultCurrency;
    const generatedId = useId();
    const inputId = id || generatedId;
    const inputRef = useRef<HTMLInputElement>(null);

    // Initial formatted state
    const formatValue = (v?: string | number): string => {
        if (v === undefined || v === null || v === '') return '';
        return formatLiveNumber(String(v), activeCurrency);
    };

    const [displayValue, setDisplayValue] = useState(() => formatValue(value));

    // Synchronize if incoming value changes externally
    useEffect(() => {
        const currentClean = stripGroupingSeparators(displayValue);
        const incomingClean = value !== undefined && value !== null ? stripGroupingSeparators(String(value)) : '';
        if (currentClean !== incomingClean) {
            setDisplayValue(formatValue(value));
        }
    }, [value, activeCurrency]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target;
        const raw = input.value;
        const cursor = input.selectionStart || 0;

        // Count digits before the cursor to preserve relative cursor position
        const digitsBeforeCursor = raw.slice(0, cursor).replace(/[^0-9.]/g, '').length;

        // Format with active locale commas
        const formatted = formatLiveNumber(raw, activeCurrency);
        setDisplayValue(formatted);

        // Calculate numeric value for callback
        const cleaned = stripGroupingSeparators(formatted);
        const parsed = cleaned === '' ? undefined : parseFloat(cleaned);
        const validNum = parsed !== undefined && !isNaN(parsed) ? parsed : undefined;

        onChange(cleaned, validNum);

        // Restore cursor position accurately after React re-render
        requestAnimationFrame(() => {
            if (!inputRef.current) return;
            let targetCursor = 0;
            let digitsSeen = 0;
            for (let i = 0; i < formatted.length; i++) {
                const char = formatted[i];
                if (char && /[0-9.]/.test(char)) {
                    digitsSeen++;
                }
                if (digitsSeen >= digitsBeforeCursor) {
                    targetCursor = i + 1;
                    break;
                }
            }
            if (digitsBeforeCursor === 0) targetCursor = 0;
            if (targetCursor > formatted.length) targetCursor = formatted.length;
            inputRef.current.setSelectionRange(targetCursor, targetCursor);
        });
    };

    const numericValue = (() => {
        const cleaned = stripGroupingSeparators(displayValue);
        const n = parseFloat(cleaned);
        return !isNaN(n) && n > 0 ? n : undefined;
    })();

    const wordsText = numericValue && showWords ? formatAmountInWords(numericValue, activeCurrency) : '';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                <input
                    ref={inputRef}
                    id={inputId}
                    name={name}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    autoFocus={autoFocus}
                    disabled={disabled}
                    required={required}
                    placeholder={placeholder}
                    value={displayValue}
                    onChange={handleInputChange}
                    className={className}
                    style={{
                        width: '100%',
                        fontVariantNumeric: 'tabular-nums',
                        ...style
                    }}
                />
            </div>
            {wordsText && (
                <div
                    style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: 'var(--accent)',
                        background: 'var(--surface-light)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        width: 'fit-content',
                        maxWidth: '100%',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                        lineHeight: 1.3,
                        animation: 'fadeIn 0.15s ease'
                    }}
                    title={`${currencySymbol} ${displayValue}`}
                >
                    <span style={{ opacity: 0.8 }}>✨</span>
                    <span>{wordsText}</span>
                </div>
            )}
        </div>
    );
}
