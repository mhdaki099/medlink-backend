export const COUNTRIES = [
    'سوريا',
    'لبنان',
    'الأردن',
    'العراق',
    'فلسطين',
    'تركيا',
    'الإمارات',
    'السعودية',
    'مصر',
    'أخرى',
] as const;

export type CountryName = typeof COUNTRIES[number];
