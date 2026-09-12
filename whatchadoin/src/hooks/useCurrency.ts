import { useState, useEffect } from 'react';

export const CURRENCIES = [
    { code: 'USD', label: 'US Dollar ($)' },
    { code: 'EUR', label: 'Euro (€)' },
    { code: 'GBP', label: 'British Pound (£)' },
    { code: 'INR', label: 'Indian Rupee (₹)' },
    { code: 'JPY', label: 'Japanese Yen (¥)' },
    { code: 'AUD', label: 'Australian Dollar (A$)' },
    { code: 'CAD', label: 'Canadian Dollar (C$)' },
    { code: 'CHF', label: 'Swiss Franc (CHF)' },
    { code: 'CNY', label: 'Chinese Yuan (¥)' },
    { code: 'SGD', label: 'Singapore Dollar (S$)' },
    { code: 'NZD', label: 'New Zealand Dollar (NZ$)' },
    { code: 'HKD', label: 'Hong Kong Dollar (HK$)' },
    { code: 'KRW', label: 'South Korean Won (₩)' },
    { code: 'BRL', label: 'Brazilian Real (R$)' },
    { code: 'ZAR', label: 'South African Rand (R)' },
    { code: 'MXN', label: 'Mexican Peso (Mex$)' },
    { code: 'RUB', label: 'Russian Ruble (₽)' },
    { code: 'TRY', label: 'Turkish Lira (₺)' },
    { code: 'SEK', label: 'Swedish Krona (kr)' },
    { code: 'NOK', label: 'Norwegian Krone (kr)' },
    { code: 'DKK', label: 'Danish Krone (kr)' },
    { code: 'THB', label: 'Thai Baht (฿)' },
    { code: 'IDR', label: 'Indonesian Rupiah (Rp)' },
];

export function useCurrency() {
    const [currency, setCurrencyState] = useState(() => localStorage.getItem('whatchadoin_currency') || 'USD');

    useEffect(() => {
        const handleCurrencyChange = (e: any) => {
            setCurrencyState(e.detail);
        };
        window.addEventListener('currency-changed', handleCurrencyChange);
        return () => window.removeEventListener('currency-changed', handleCurrencyChange);
    }, []);

    const setCurrency = (newCurrency: string) => {
        localStorage.setItem('whatchadoin_currency', newCurrency);
        setCurrencyState(newCurrency);
        window.dispatchEvent(new CustomEvent('currency-changed', { detail: newCurrency }));
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    return { currency, setCurrency, formatCurrency };
}
