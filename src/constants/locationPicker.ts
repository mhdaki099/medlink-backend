export const LOCATION_OTHER_VALUE = '__OTHER__';
export const LOCATION_OTHER_LABEL = 'أخرى — إدخال يدوي';

export function withOtherOption<T extends { label: string; value: string }>(items: T[]): T[] {
    return [...items, { label: LOCATION_OTHER_LABEL, value: LOCATION_OTHER_VALUE } as T];
}

export function isOtherSelection(value: string | undefined | null): boolean {
    return value === LOCATION_OTHER_VALUE;
}
