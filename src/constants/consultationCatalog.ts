/** Predefined lab & radiology options for end-of-session consultation requests */

export const LAB_EXAM_OPTIONS = [
    { id: 'cbc', label: 'تحليل دم كامل (CBC)' },
    { id: 'glucose', label: 'سكر الدم الصائم' },
    { id: 'urine', label: 'تحليل بول' },
    { id: 'lft', label: 'وظائف الكبد (LFT)' },
    { id: 'kft', label: 'وظائف الكلى (KFT)' },
    { id: 'lipid', label: 'دهون الدم' },
    { id: 'vitamin_d', label: 'فيتامين د' },
    { id: 'thyroid', label: 'هرمونات الغدة الدرقية' },
    { id: 'other', label: 'أخرى' },
] as const;

export const RADIOLOGY_EXAM_OPTIONS = [
    { id: 'chest_xray', label: 'أشعة صدر' },
    { id: 'abdomen_xray', label: 'أشعة بطن' },
    { id: 'spine_xray', label: 'أشعة عمود فقري' },
    { id: 'ultrasound', label: 'سونار / موجات فوق صوتية' },
    { id: 'ct', label: 'أشعة مقطعية (CT)' },
    { id: 'mri', label: 'رنين مغناطيسي (MRI)' },
    { id: 'mammography', label: 'تصوير الثدي' },
    { id: 'other', label: 'أخرى' },
] as const;

export const getExamLabel = (
    options: readonly { id: string; label: string }[],
    examId: string,
    customName?: string,
) => {
    if (examId === 'other') return customName?.trim() || 'أخرى';
    return options.find(o => o.id === examId)?.label || examId;
};
