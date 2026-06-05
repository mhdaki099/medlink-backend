export const SERVICE_AVAILABILITY = {
    available: { label: 'متاح', color: '#16A34A', bg: '#DCFCE7', bookable: true },
    limited: { label: 'محدود', color: '#D97706', bg: '#FEF3C7', bookable: true },
    unavailable: { label: 'غير متاح', color: '#6B7280', bg: '#F3F4F6', bookable: false },
    out_of_stock: { label: 'نفد المخزون', color: '#DC2626', bg: '#FEE2E2', bookable: false },
    out_of_service: { label: 'خارج الخدمة', color: '#7C3AED', bg: '#EDE9FE', bookable: false },
} as const;

export type ServiceAvailabilityKey = keyof typeof SERVICE_AVAILABILITY;

export const SERVICE_AVAILABILITY_OPTIONS: ServiceAvailabilityKey[] = [
    'available',
    'limited',
    'unavailable',
    'out_of_stock',
    'out_of_service',
];

export function getServiceAvailability(status?: string | null) {
    const key = (status || 'available') as ServiceAvailabilityKey;
    return SERVICE_AVAILABILITY[key] || SERVICE_AVAILABILITY.available;
}

export function isServiceBookable(status?: string | null): boolean {
    return getServiceAvailability(status).bookable;
}
