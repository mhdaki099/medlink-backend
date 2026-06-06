/** Normalize time strings (09:00, 9:00 AM, etc.) to minutes since midnight for comparison. */
export function timeToMinutes(raw: string): number {
    let s = (raw || '').trim().toUpperCase().replace(/\s+/g, ' ');
    const isPM = s.includes('PM') || s.includes('م');
    const isAM = s.includes('AM') || s.includes('ص');
    s = s.replace(/\s*(AM|PM|ص|م)\s*/gi, '').trim();
    const parts = s.split(':');
    let hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

export function isSlotBookedForDate(
    bookedSlots: { date?: string; time?: string }[] | undefined,
    date: string,
    slot: string,
): boolean {
    if (!date || !slot || !bookedSlots?.length) return false;
    const slotMins = timeToMinutes(slot);
    return bookedSlots.some(
        (b) => b.date === date && timeToMinutes(b.time || '') === slotMins,
    );
}
