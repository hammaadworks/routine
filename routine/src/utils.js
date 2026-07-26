export function parseDuration(val) {
  if (val === undefined || val === null || val === '') return 0;
  const str = String(val).toLowerCase().trim();

  // Support for 'h' and 'm' suffixes
  if (str.includes(':')) {
    const parts = str.split(':');
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    return (h * 60) + m;
  }
  if (str.includes('h')) {
    const v = parseFloat(str);
    return isNaN(v) ? 0 : v * 60;
  }
  if (str.includes('m')) {
    const v = parseInt(str);
    return isNaN(v) ? 0 : v;
  }

  // The custom duration logic
  if (str.includes('.') || str.includes(',')) {
    const parts = str.split(/[.,]/);
    const hrs = parseInt(parts[0]) || 0;
    let minsStr = parts[1] || '';
    let mins = 0;
    
    if (minsStr.length === 1) {
      mins = parseInt(minsStr) * 10 || 0;
    } else if (minsStr.length >= 2) {
      mins = parseInt(minsStr.slice(0, 2)) || 0;
    }
    
    // anything >.59 = full hour (60 mins)
    if (mins > 59) mins = 60;
    
    return (hrs * 60) + mins;
  }

  // Pure number
  return parseInt(str) || 0;
}

export function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}
