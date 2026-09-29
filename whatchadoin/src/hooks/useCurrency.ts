import {useCallback, useEffect, useMemo, useState} from 'react';

export const CURRENCY_LOCALES: Record<string, string> = {
    // South Asian currencies using Lakh / Crore grouping (e.g. 1,00,000 / 1,00,00,000)
    INR: 'en-IN',
    PKR: 'en-PK',
    BDT: 'en-BD',
    NPR: 'ne-NP',

    // Middle Eastern / Arabic currencies using standard thousands grouping (e.g. 100,000,000)
    AED: 'en-AE',
    SAR: 'en-SA',
    QAR: 'en-QA',
    KWD: 'en-KW',
    BHD: 'en-BH',
    OMR: 'en-OM',
    EGP: 'en-EG',

    // International & Western currencies (standard thousands grouping e.g. 100,000,000)
    USD: 'en-US',
    EUR: 'en-IE',
    GBP: 'en-GB',
    JPY: 'ja-JP',
    AUD: 'en-AU',
    CAD: 'en-CA',
    CHF: 'de-CH',
    CNY: 'zh-CN',
    SGD: 'en-SG',
    NZD: 'en-NZ',
    HKD: 'en-HK',
    KRW: 'ko-KR',
    BRL: 'pt-BR',
    ZAR: 'en-ZA',
    MXN: 'es-MX',
    RUB: 'ru-RU',
    TRY: 'tr-TR',
    SEK: 'sv-SE',
    NOK: 'nb-NO',
    DKK: 'da-DK',
    THB: 'th-TH',
    IDR: 'id-ID',
    MYR: 'en-MY',
    PHP: 'en-PH',
};

export const CURRENCIES = [{code: 'USD', label: 'US Dollar ($)'}, {code: 'EUR', label: 'Euro (€)'}, {
    code: 'GBP',
    label: 'British Pound (£)'
}, {code: 'INR', label: 'Indian Rupee (₹)'}, {code: 'AED', label: 'UAE Dirham (AED)'}, {
    code: 'SAR',
    label: 'Saudi Riyal (SAR)'
}, {code: 'QAR', label: 'Qatari Riyal (QAR)'}, {code: 'KWD', label: 'Kuwaiti Dinar (KWD)'}, {
    code: 'PKR',
    label: 'Pakistani Rupee (₨)'
}, {code: 'BDT', label: 'Bangladeshi Taka (৳)'}, {code: 'JPY', label: 'Japanese Yen (¥)'}, {
    code: 'AUD',
    label: 'Australian Dollar (A$)'
}, {code: 'CAD', label: 'Canadian Dollar (C$)'}, {code: 'CHF', label: 'Swiss Franc (CHF)'}, {
    code: 'CNY',
    label: 'Chinese Yuan (¥)'
}, {code: 'SGD', label: 'Singapore Dollar (S$)'}, {code: 'NZD', label: 'New Zealand Dollar (NZ$)'}, {
    code: 'HKD',
    label: 'Hong Kong Dollar (HK$)'
}, {code: 'KRW', label: 'South Korean Won (₩)'}, {code: 'BRL', label: 'Brazilian Real (R$)'}, {
    code: 'ZAR',
    label: 'South African Rand (R)'
}, {code: 'MXN', label: 'Mexican Peso (Mex$)'}, {code: 'RUB', label: 'Russian Ruble (₽)'}, {
    code: 'TRY',
    label: 'Turkish Lira (₺)'
}, {code: 'SEK', label: 'Swedish Krona (kr)'}, {code: 'NOK', label: 'Norwegian Krone (kr)'}, {
    code: 'DKK',
    label: 'Danish Krone (kr)'
}, {code: 'THB', label: 'Thai Baht (฿)'}, {code: 'IDR', label: 'Indonesian Rupiah (Rp)'}, {
    code: 'MYR',
    label: 'Malaysian Ringgit (RM)'
},];

export function getCurrencyLocale(currencyCode: string): string {
    return CURRENCY_LOCALES[currencyCode] || 'en-US';
}

export function getCurrencySymbol(currencyCode: string): string {
    try {
        const locale = getCurrencyLocale(currencyCode);
        return (0).toLocaleString(locale, {
            style: 'currency', currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0
        }).replace(/\d/g, '').trim();
    } catch {
        return currencyCode;
    }
}

export function useCurrency() {
    const [currency, setCurrencyState] = useState(() => localStorage.getItem('whatchadoin_currency') || 'USD');

    useEffect(() => {
        const handleCurrencyChange = (e: Event) => {
            const customEv = e as CustomEvent<string | undefined>;
            const val = customEv.detail || localStorage.getItem('whatchadoin_currency') || 'USD';
            setCurrencyState(val);
        };
        window.addEventListener('whatchadoin_currency_updated', handleCurrencyChange);
        window.addEventListener('currency-changed', handleCurrencyChange);
        return () => {
            window.removeEventListener('whatchadoin_currency_updated', handleCurrencyChange);
            window.removeEventListener('currency-changed', handleCurrencyChange);
        };
    }, []);

    const setCurrency = (newCurrency: string) => {
        localStorage.setItem('whatchadoin_currency', newCurrency);
        setCurrencyState(newCurrency);
        window.dispatchEvent(new CustomEvent('whatchadoin_currency_updated', {detail: newCurrency}));
    };

    const formatCurrency = useCallback((amount: number, options?: {
        minimumFractionDigits?: number;
        maximumFractionDigits?: number
    }) => {
        const locale = getCurrencyLocale(currency);
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: options?.minimumFractionDigits ?? 2,
            maximumFractionDigits: options?.maximumFractionDigits ?? 2
        }).format(amount);
    }, [currency]);

    const formatNumber = useCallback((amount: number, options?: Intl.NumberFormatOptions) => {
        const locale = getCurrencyLocale(currency);
        return new Intl.NumberFormat(locale, options).format(amount);
    }, [currency]);

    const currencySymbol = useMemo(() => getCurrencySymbol(currency), [currency]);

    return {currency, setCurrency, formatCurrency, formatNumber, currencySymbol, locale: getCurrencyLocale(currency)};
}
