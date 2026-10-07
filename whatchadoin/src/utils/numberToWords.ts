import { getCurrencyLocale } from '../hooks/useCurrency';

const ONES = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

const SOUTH_ASIAN_CURRENCIES = new Set(['INR', 'PKR', 'BDT', 'NPR']);

export function isSouthAsianCurrency(currencyCode: string): boolean {
    return SOUTH_ASIAN_CURRENCIES.has((currencyCode || '').toUpperCase());
}

function numToWordsUnder1000(n: number): string {
    let s = '';
    if (n >= 100) {
        s += ONES[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
    }
    if (n >= 20) {
        s += TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
    } else if (n > 0) {
        s += ONES[n];
    }
    return s.trim();
}

/**
 * Converts a positive number to English words using regional grouping.
 * South Asian (INR, PKR, BDT, NPR): Crore, Lakh, Thousand, Hundred.
 * International (USD, EUR, AED, etc.): Billion, Million, Thousand, Hundred.
 */
export function numberToWords(num: number, isSouthAsian: boolean): string {
    if (num === 0) return 'Zero';
    if (!isFinite(num) || isNaN(num)) return '';

    let n = Math.floor(Math.abs(num));
    const parts: string[] = [];

    if (isSouthAsian) {
        const crore = Math.floor(n / 10000000);
        if (crore > 0) {
            parts.push(numberToWords(crore, true) + ' Crore');
            n %= 10000000;
        }
        const lakh = Math.floor(n / 100000);
        if (lakh > 0) {
            parts.push(numToWordsUnder1000(lakh) + ' Lakh');
            n %= 100000;
        }
        const thousand = Math.floor(n / 1000);
        if (thousand > 0) {
            parts.push(numToWordsUnder1000(thousand) + ' Thousand');
            n %= 1000;
        }
        if (n > 0) {
            parts.push(numToWordsUnder1000(n));
        }
    } else {
        const trillion = Math.floor(n / 1000000000000);
        if (trillion > 0) {
            parts.push(numToWordsUnder1000(trillion) + ' Trillion');
            n %= 1000000000000;
        }
        const billion = Math.floor(n / 1000000000);
        if (billion > 0) {
            parts.push(numToWordsUnder1000(billion) + ' Billion');
            n %= 1000000000;
        }
        const million = Math.floor(n / 1000000);
        if (million > 0) {
            parts.push(numToWordsUnder1000(million) + ' Million');
            n %= 1000000;
        }
        const thousand = Math.floor(n / 1000);
        if (thousand > 0) {
            parts.push(numToWordsUnder1000(thousand) + ' Thousand');
            n %= 1000;
        }
        if (n > 0) {
            parts.push(numToWordsUnder1000(n));
        }
    }

    return parts.join(' ').trim();
}

/**
 * Formats an amount into human-readable words with currency code.
 * E.g.:
 * 600000, 'INR'  -> "Six Lakh INR"
 * 6000000, 'USD' -> "Six Million USD"
 * 60000, 'AED'   -> "Sixty Thousand AED"
 * 120000.5, 'INR'-> "One Lakh Twenty Thousand and 50/100 INR"
 */
export function formatAmountInWords(amount: number, currencyCode: string): string {
    if (!amount || isNaN(amount) || amount <= 0) return '';

    const isSA = isSouthAsianCurrency(currencyCode);
    const intPart = Math.floor(amount);
    const decPart = Math.round((amount - intPart) * 100);

    const intWords = numberToWords(intPart, isSA);
    if (!intWords) return '';

    const code = (currencyCode || 'USD').toUpperCase();
    if (decPart > 0) {
        return `${intWords} and ${decPart}/100 ${code}`;
    }
    return `${intWords} ${code}`;
}

/**
 * Removes commas and extra spaces from formatted string.
 */
export function stripGroupingSeparators(val: string): string {
    return val.replace(/,/g, '').trim();
}

/**
 * Formats raw numeric input string with locale-specific grouping commas as the user types.
 * Preserves trailing decimal point (e.g. "120000.") and fractional decimals ("120000.5").
 */
export function formatLiveNumber(rawValue: string, currencyCode: string): string {
    if (!rawValue) return '';

    // Strip non-numeric characters except single decimal point
    const cleaned = rawValue.replace(/[^0-9.]/g, '');
    if (!cleaned) return '';

    const parts = cleaned.split('.');
    const integerPart = parts[0] || '0';
    const hasDecimal = parts.length > 1;
    const decimalPart = parts.slice(1).join(''); // ignore subsequent dots

    const locale = getCurrencyLocale(currencyCode);
    const num = Number(integerPart);

    let formattedInt = integerPart;
    if (!isNaN(num)) {
        try {
            formattedInt = new Intl.NumberFormat(locale, {
                useGrouping: true,
                maximumFractionDigits: 0
            }).format(num);
        } catch {
            formattedInt = integerPart;
        }
    }

    if (hasDecimal) {
        return `${formattedInt}.${decimalPart}`;
    }
    return formattedInt;
}
