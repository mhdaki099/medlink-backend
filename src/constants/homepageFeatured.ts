export type HomepageRole = 'doctor' | 'pharmacy' | 'lab' | 'radiology';

export const HOMEPAGE_SECTIONS: {
    key: HomepageRole;
    label: string;
    patientTitle: string;
    limit: number;
    icon: string;
    color: string;
}[] = [
    { key: 'doctor', label: 'أطباء', patientTitle: 'أهم الأطباء', limit: 3, icon: 'stethoscope', color: '#059669' },
    { key: 'pharmacy', label: 'صيدليات', patientTitle: 'صيدليات مناوبة', limit: 4, icon: 'pill', color: '#D97706' },
    { key: 'lab', label: 'مختبرات', patientTitle: 'مختبرات مميزة', limit: 2, icon: 'flask', color: '#8B5CF6' },
    { key: 'radiology', label: 'أشعة', patientTitle: 'مراكز أشعة', limit: 2, icon: 'radioactive', color: '#7C3AED' },
];

export const homepageSection = (role: string) =>
    HOMEPAGE_SECTIONS.find(s => s.key === role) || HOMEPAGE_SECTIONS[0];
