export const formatTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = (minutes % 60).toString().padStart(2, '0');
    const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m} ${ampm}`;
};

export const formatTime24 = (minutes: number): string => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
};

export const parseTime = (timeStr: string, referenceMins?: number): number | null => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const raw = timeStr.trim().toLowerCase();
    if (!raw) return null;

    const hasPM = raw.includes('pm') || raw.includes('p');
    const hasAM = raw.includes('am') || raw.includes('a');

    // Remove letters and whitespace to extract numeric time parts
    const clean = raw.replace(/[apm\s]/g, '');
    if (!clean) return null;

    let h = 0;
    let m = 0;

    if (clean.includes(':')) {
        const parts = clean.split(':');
        if (parts[0] === undefined || parts[1] === undefined) return null;
        h = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
    } else if (clean.includes('.')) {
        const parts = clean.split('.');
        if (parts[0] === undefined || parts[1] === undefined) return null;
        h = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
    } else if (clean.length === 3 || clean.length === 4) {
        // Handle military / compact time like "930", "1030", "1100"
        const splitIdx = clean.length === 3 ? 1 : 2;
        const candidateH = parseInt(clean.slice(0, splitIdx), 10);
        const candidateM = parseInt(clean.slice(splitIdx), 10);
        if (!isNaN(candidateH) && !isNaN(candidateM) && candidateM >= 0 && candidateM <= 59 && candidateH <= 24) {
            h = candidateH;
            m = candidateM;
        } else {
            h = parseInt(clean, 10);
            m = referenceMins !== undefined ? (referenceMins % 60) : 0;
        }
    } else {
        h = parseInt(clean, 10);
        m = referenceMins !== undefined ? (referenceMins % 60) : 0;
    }

    if (isNaN(h) || isNaN(m)) return null;
    if (m < 0 || m > 59) return null;

    if (hasPM) {
        if (h < 12) h += 12;
    } else if (hasAM) {
        if (h === 12) h = 0;
    } else if (referenceMins !== undefined) {
        const refH = Math.floor(referenceMins / 60);
        if (refH >= 12 && refH < 24) {
            if (h < 12) h += 12;
        } else if (refH === 0 && h === 12) {
            h = 0;
        }
    }

    if (h < 0 || h > 24) return null;
    if (h === 24) h = 0;

    return h * 60 + m;
};
