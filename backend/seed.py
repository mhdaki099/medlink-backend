"""
MedLink - In-Memory Database with comprehensive test data
All photos use Unsplash/picsum URLs for free access
"""
from datetime import datetime, date
from typing import List, Dict, Any
import copy

# ─────────────────────────────────────────────────────────────────────────────
# USERS
# ─────────────────────────────────────────────────────────────────────────────
USERS: List[Dict[str, Any]] = [
    # Patients
    {
        "id": "p1", "role": "patient", "name": "أحمد محمد الخليل", "name_en": "Ahmed Khalil",
        "email": "ahmed@medlink.sy", "password": "123456",
        "phone": "+963-911-123456", "dob": "1990-05-15", "gender": "male",
        "city": "دمشق", "address": "المزة، شارع الثلاثين",
        "photo": "https://i.pravatar.cc/150?img=11",
        "blood_type": "A+", "allergies": ["بنسلين"], "chronic_conditions": [],
        "is_active": True, "verified": True,
        "created_at": "2024-01-10T08:00:00"
    },
    {
        "id": "p2", "role": "patient", "name": "سارة عبد الله نور", "name_en": "Sara Nour",
        "email": "sara@medlink.sy", "password": "123456",
        "phone": "+963-933-654321", "dob": "1995-08-22", "gender": "female",
        "city": "حلب", "address": "العزيزية، شارع النيل",
        "photo": "https://i.pravatar.cc/150?img=5",
        "blood_type": "O+", "allergies": [], "chronic_conditions": ["ربو"],
        "is_active": True, "verified": True,
        "created_at": "2024-02-15T09:00:00"
    },
    {
        "id": "p3", "role": "patient", "name": "محمد علي الرشيد", "name_en": "Mohammed Al-Rashid",
        "email": "mohammed@medlink.sy", "password": "123456",
        "phone": "+963-944-789012", "dob": "1985-11-30", "gender": "male",
        "city": "دمشق", "address": "كفر سوسة، شارع المدينة الجامعية",
        "photo": "https://i.pravatar.cc/150?img=15",
        "blood_type": "B+", "allergies": ["سلفا"], "chronic_conditions": ["سكري"],
        "is_active": True, "verified": True,
        "created_at": "2024-03-01T10:00:00"
    },
    {
        "id": "p4", "role": "patient", "name": "لينا حسن العمر", "name_en": "Lina Al-Omar",
        "email": "lina@medlink.sy", "password": "123456",
        "phone": "+963-955-345678", "dob": "1998-03-10", "gender": "female",
        "city": "اللاذقية", "address": "الزراعة، شارع بغداد",
        "photo": "https://i.pravatar.cc/150?img=9",
        "blood_type": "AB-", "allergies": [], "chronic_conditions": [],
        "is_active": True, "verified": True,
        "created_at": "2024-03-20T11:00:00"
    },
    # Doctors
    {
        "id": "d1", "role": "doctor", "name": "د. كريم نصر الله", "name_en": "Dr. Karim Nasrallah",
        "email": "dr.karim@medlink.sy", "password": "123456",
        "phone": "+963-912-111222", "dob": "1975-03-20", "gender": "male",
        "city": "دمشق", "address": "المزة فيلات الشرقية",
        "photo": "/assets/doctors_sample/doctor male 1.png",
        "specialization": "قلبية",
        "specialization_en": "Cardiology",
        "clinic_name": "عيادة القلب المتخصصة",
        "clinic_address": "المزة، مقابل سفارة إيران، دمشق",
        "lat": 33.5024, "lng": 36.2538,
        "price_per_session": 95000,
        "experience_years": 18,
        "rating": 4.9, "total_reviews": 312,
        "education": ["دكتوراه طب - جامعة دمشق", "زمالة القلب - ألمانيا"],
        "languages": ["العربية", "الإنجليزية", "الألمانية"],
        "available_days": ["الأحد", "الثلاثاء", "الخميس"],
        "available_hours": "10:00 - 18:00",
        "is_active": True, "verified": True, "is_featured": True,
        "total_sessions": 1850, "created_at": "2023-06-01T08:00:00"
    },
    {
        "id": "d2", "role": "doctor", "name": "د. رنا سليمان", "name_en": "Dr. Rana Suleiman",
        "email": "dr.rana@medlink.sy", "password": "123456",
        "phone": "+963-933-222333", "dob": "1980-07-14", "gender": "female",
        "city": "دمشق", "address": "أبو رمانة",
        "photo": "/assets/doctors_sample/doctor female 2.png",
        "specialization": "طب الأطفال",
        "specialization_en": "Pediatrics",
        "clinic_name": "عيادة الأطفال البهجة",
        "clinic_address": "شارع أبو رمانة، بجانب مشفى دمشق، دمشق",
        "lat": 33.5138, "lng": 36.2856,
        "price_per_session": 84000,
        "experience_years": 14,
        "rating": 4.8, "total_reviews": 245,
        "education": ["ماجستير طب أطفال - جامعة دمشق"],
        "languages": ["العربية", "الإنجليزية"],
        "available_days": ["السبت", "الاثنين", "الأربعاء"],
        "available_hours": "09:00 - 17:00",
        "is_active": True, "verified": True, "is_featured": True,
        "total_sessions": 1420, "created_at": "2023-07-15T08:00:00"
    },
    {
        "id": "d3", "role": "doctor", "name": "د. فادي العلي", "name_en": "Dr. Fadi Al-Ali",
        "email": "dr.fadi@medlink.sy", "password": "123456",
        "phone": "+963-944-333444", "dob": "1972-09-25", "gender": "male",
        "city": "حلب", "address": "الفرقان",
        "photo": "/assets/doctors_sample/doctor male 3.png",
        "specialization": "هضمية",
        "specialization_en": "Gastroenterology",
        "clinic_name": "عيادة الهضم والكبد",
        "clinic_address": "حي الفرقان، شارع الجامعة، حلب",
        "lat": 36.2021, "lng": 37.1343,
        "price_per_session": 90000,
        "experience_years": 22,
        "rating": 4.7, "total_reviews": 198,
        "education": ["دكتوراه طب باطني - اختصاص هضمية", "زمالة أمراض الجهاز الهضمي - فرنسا"],
        "languages": ["العربية", "الفرنسية"],
        "available_days": ["الأحد", "الثلاثاء", "الأربعاء", "الخميس"],
        "available_hours": "11:00 - 19:00",
        "is_active": True, "verified": True, "is_featured": True,
        "total_sessions": 2100, "created_at": "2023-05-10T08:00:00"
    },
    {
        "id": "d4", "role": "doctor", "name": "د. ماهر البيروتي", "name_en": "Dr. Maher Al-Beiruti",
        "email": "dr.maher@medlink.sy", "password": "123456",
        "phone": "+963-955-444555", "dob": "1978-11-12", "gender": "male",
        "city": "دمشق", "address": "شارع بغداد",
        "photo": "/assets/doctors_sample/doctor female 4.png",
        "specialization": "الجهاز التنفسي",
        "specialization_en": "Pulmonology",
        "clinic_name": "عيادة الصدر والتنفس",
        "clinic_address": "شارع بغداد، عمارة النور رقم 12، دمشق",
        "lat": 33.5180, "lng": 36.2910,
        "price_per_session": 85000,
        "experience_years": 16,
        "rating": 4.6, "total_reviews": 178,
        "education": ["ماجستير طب رئة - جامعة حلب", "دبلوم تنظيري رئوي"],
        "languages": ["العربية", "الإنجليزية"],
        "available_days": ["السبت", "الاثنين", "الأربعاء", "الجمعة"],
        "available_hours": "08:00 - 16:00",
        "is_active": True, "verified": True,
        "total_sessions": 1360, "created_at": "2023-08-01T08:00:00"
    },
    {
        "id": "d5", "role": "doctor", "name": "د. هناء مراد", "name_en": "Dr. Hanaa Murad",
        "email": "dr.hanaa@medlink.sy", "password": "123456",
        "phone": "+963-966-555666", "dob": "1983-02-28", "gender": "female",
        "city": "حمص", "address": "وادي الذهب",
        "photo": "https://i.pravatar.cc/150?img=45",
        "specialization": "جلدية وتجميل",
        "specialization_en": "Dermatology",
        "clinic_name": "عيادة الجلد والجمال",
        "clinic_address": "وادي الذهب، مقابل المركز الثقافي، حمص",
        "lat": 34.7308, "lng": 36.7277,
        "price_per_session": 180000,
        "experience_years": 11,
        "rating": 4.9, "total_reviews": 421,
        "education": ["دكتوراه جلدية - جامعة دمشق", "زمالة تجميل - تركيا"],
        "languages": ["العربية", "الإنجليزية", "التركية"],
        "available_days": ["السبت", "الأحد", "الثلاثاء", "الخميس"],
        "available_hours": "10:00 - 20:00",
        "is_active": True, "verified": True,
        "total_sessions": 2340, "created_at": "2023-04-20T08:00:00"
    },
    {
        "id": "d6", "role": "doctor", "name": "د. طارق الصالح", "name_en": "Dr. Tariq Al-Saleh",
        "email": "dr.tariq@medlink.sy", "password": "123456",
        "phone": "+963-977-666777", "dob": "1970-06-15", "gender": "male",
        "city": "دمشق", "address": "ساروجة",
        "photo": "https://i.pravatar.cc/150?img=16",
        "specialization": "عظام ومفاصل",
        "specialization_en": "Orthopedics",
        "clinic_name": "عيادة العظام والمفاصل",
        "clinic_address": "ساروجة، بجانب المشفى العسكري، دمشق",
        "lat": 33.5122, "lng": 36.2961,
        "price_per_session": 300000,
        "experience_years": 24,
        "rating": 4.8, "total_reviews": 287,
        "education": ["دكتوراه جراحة عظام - دمشق", "زمالة مفاصل - بريطانيا"],
        "languages": ["العربية", "الإنجليزية"],
        "available_days": ["الأحد", "الاثنين", "الأربعاء", "الخميس"],
        "available_hours": "09:00 - 17:00",
        "is_active": True, "verified": True,
        "total_sessions": 2890, "created_at": "2023-03-01T08:00:00"
    },
    # Pharmacy
    {
        "id": "ph1", "role": "pharmacy", "name": "صيدلية الشفاء", "name_en": "Al-Shifa Pharmacy",
        "email": "pharma.nour@medlink.sy", "password": "123456",
        "phone": "+963-912-777888",
        "city": "دمشق", "address": "شارع الثورة، مقابل بنك سورية، دمشق",
        "photo": "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=200",
        "lat": 33.5085, "lng": 36.2920,
        "license_no": "PH-DAM-2019-0041",
        "is_active": True, "verified": True, "is_featured": True,
        "open_hours": "08:00 - 23:00",
        "created_at": "2023-06-01T08:00:00"
    },
    {
        "id": "ph2", "role": "pharmacy", "name": "صيدلية الأمل", "name_en": "Al-Amal Pharmacy",
        "email": "pharma.amal@medlink.sy", "password": "123456",
        "phone": "+963-933-888999",
        "city": "حلب", "address": "حي الجميلية، شارع الملك فيصل، حلب",
        "photo": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=200",
        "lat": 36.2135, "lng": 37.1612,
        "license_no": "PH-ALP-2020-0087",
        "is_active": True, "verified": True, "is_featured": True,
        "open_hours": "09:00 - 22:00",
        "created_at": "2023-08-15T08:00:00"
    },
    {
        "id": "ph3", "role": "pharmacy", "name": "صيدلية الياسمين", "name_en": "Al-Yasmin Pharmacy",
        "email": "pharma.yasmin@medlink.sy", "password": "123456",
        "phone": "+963-944-111222",
        "city": "دمشق", "address": "المزرعة، دمشق",
        "photo": "https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=200",
        "lat": 33.5210, "lng": 36.2950,
        "license_no": "PH-DAM-2021-0099",
        "is_active": True, "verified": True, "is_featured": True,
        "open_hours": "24/7",
        "created_at": "2024-01-01T08:00:00"
    },
    {
        "id": "ph4", "role": "pharmacy", "name": "صيدلية حلب المركزية", "name_en": "Aleppo Central Pharmacy",
        "email": "pharma.central@medlink.sy", "password": "123456",
        "phone": "+963-955-222333",
        "city": "حلب", "address": "مركز المدينة، حلب",
        "photo": "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=200",
        "lat": 36.2050, "lng": 37.1550,
        "license_no": "PH-ALP-2022-0150",
        "is_active": True, "verified": True, "is_featured": True,
        "open_hours": "24/7",
        "created_at": "2024-02-01T08:00:00"
    },
    # Laboratory
    {
        "id": "lab1", "role": "lab", "name": "مختبر النور الطبي", "name_en": "Al-Nour Medical Lab",
        "email": "lab.fadi@medlink.sy", "password": "123456",
        "phone": "+963-944-999000",
        "city": "دمشق", "address": "المهاجرين، شارع عبد المنعم رياض، دمشق",
        "photo": "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=200",
        "lat": 33.5220, "lng": 36.2840,
        "license_no": "LAB-DAM-2018-0023",
        "is_active": True, "verified": True,
        "open_hours": "07:00 - 20:00",
        "created_at": "2023-05-01T08:00:00"
    },
    {
        "id": "lab2", "role": "lab", "name": "مختبر حلب التخصصي", "name_en": "Aleppo Specialized Lab",
        "email": "lab.aleppo@medlink.sy", "password": "123456",
        "phone": "+963-955-001122",
        "city": "حلب", "address": "حي الحمدانية، دوار النسائية، حلب",
        "photo": "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=200",
        "lat": 36.2250, "lng": 37.1428,
        "license_no": "LAB-ALP-2019-0045",
        "is_active": True, "verified": True,
        "open_hours": "07:30 - 20:00",
        "created_at": "2023-09-10T08:00:00"
    },
    # Warehouse
    {
        "id": "wh1", "role": "warehouse", "name": "مستودع الدواء الرئيسي", "name_en": "Main Medical Warehouse",
        "email": "wh.main@medlink.sy", "password": "123456",
        "phone": "+963-966-112233",
        "city": "دمشق", "address": "منطقة عدرا الصناعية، دمشق الريف",
        "photo": "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=200",
        "lat": 33.5941, "lng": 36.5128,
        "license_no": "WH-SYR-2017-0011",
        "is_active": True, "verified": True,
        "created_at": "2023-01-01T08:00:00"
    },
    {
        "id": "wh2", "role": "warehouse", "name": "مستودع حلب للمستلزمات الطبية", "name_en": "Aleppo Medical Supplies Warehouse",
        "email": "wh.aleppo@medlink.sy", "password": "123456",
        "phone": "+963-977-223344",
        "city": "حلب", "address": "المنطقة الصناعية الجديدة، حلب",
        "photo": "https://images.unsplash.com/photo-1553413077-190dd305871c?w=200",
        "lat": 36.1934, "lng": 37.1571,
        "license_no": "WH-ALP-2018-0028",
        "is_active": True, "verified": True,
        "created_at": "2023-02-15T08:00:00"
    },
    # Admin
    {
        "id": "a1", "role": "admin", "name": "مدير النظام", "name_en": "System Admin",
        "email": "admin@medlink.sy", "password": "123456",
        "phone": "+963-911-000000",
        "city": "دمشق", "address": "المقر الرئيسي للمنصة",
        "photo": "https://i.pravatar.cc/150?img=68",
        "is_active": True, "verified": True,
        "created_at": "2023-01-01T00:00:00"
    },
    # Secretary (linked to Dr. Karim d1)
    {
        "id": "sec_amal", "role": "secretary", "name": "أمل السكرتيرة", "name_en": "Amal Secretary",
        "email": "sec.amal@medlink.sy", "password": "123456",
        "phone": "+963-933-445566",
        "city": "دمشق", "supervisor_id": "d1",
        "is_active": True, "verified": True,
        "created_at": "2023-06-01T08:00:00"
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# MEDICINES
# ─────────────────────────────────────────────────────────────────────────────
MEDICINES: List[Dict[str, Any]] = [
    {"id": "m1", "pharmacy_id": "ph1", "name": "أموكسيسيلين 500mg", "name_en": "Amoxicillin 500mg",
     "category": "مضادات حيوية", "price": 4500, "description": "مضاد حيوي واسع الطيف لعلاج الالتهابات البكتيرية",
     "manufacturer": "شركة دواء سورية", "stock_status": "in_stock", "quantity": 250,
     "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100",
     "alternatives": ["م4", "م5"], "requires_prescription": True},
    {"id": "m2", "pharmacy_id": "ph1", "name": "باراسيتامول 500mg", "name_en": "Paracetamol 500mg",
     "category": "مسكنات", "price": 1200, "description": "خافض للحرارة ومسكن للألم",
     "manufacturer": "تاميفو سورية", "stock_status": "in_stock", "quantity": 500,
     "image": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=100",
     "alternatives": [], "requires_prescription": False},
    {"id": "m3", "pharmacy_id": "ph1", "name": "أوميبرازول 20mg", "name_en": "Omeprazole 20mg",
     "category": "الجهاز الهضمي", "price": 6000, "description": "مثبط مضخة البروتون لعلاج الحموضة والقرحة",
     "manufacturer": "أسترازينيكا سورية", "stock_status": "in_stock", "quantity": 180,
     "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100",
     "alternatives": [], "requires_prescription": True},
    {"id": "m4", "pharmacy_id": "ph1", "name": "ازيثروميسين 250mg", "name_en": "Azithromycin 250mg",
     "category": "مضادات حيوية", "price": 8500, "description": "مضاد حيوي ماكرولايد لعلاج التهابات الجهاز التنفسي",
     "manufacturer": "فايزر سورية", "stock_status": "out_of_stock", "quantity": 0,
     "image": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=100",
     "alternatives": ["م1"], "requires_prescription": True},
    {"id": "m5", "pharmacy_id": "ph1", "name": "سيبروفلوكساسين 500mg", "name_en": "Ciprofloxacin 500mg",
     "category": "مضادات حيوية", "price": 7200, "description": "مضاد حيوي فلوروكينولون",
     "manufacturer": "باير سورية", "stock_status": "coming_soon", "quantity": 0,
     "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100",
     "alternatives": ["م1"], "requires_prescription": True},
    {"id": "m6", "pharmacy_id": "ph1", "name": "فيتامين D3 1000IU", "name_en": "Vitamin D3 1000IU",
     "category": "فيتامينات ومكملات", "price": 12000, "description": "مكمل فيتامين د للوقاية من النقص",
     "manufacturer": "بايو كير", "stock_status": "in_stock", "quantity": 320,
     "image": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=100",
     "alternatives": [], "requires_prescription": False},
    {"id": "m7", "pharmacy_id": "ph1", "name": "أسبرين 100mg", "name_en": "Aspirin 100mg",
     "category": "مسكنات", "price": 2500, "description": "مسكن مضاد للالتهاب وخافض للحرارة",
     "manufacturer": "باير سورية", "stock_status": "in_stock", "quantity": 400,
     "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100",
     "alternatives": [], "requires_prescription": False},
    {"id": "m8", "pharmacy_id": "ph1", "name": "لورانو 10mg", "name_en": "Loratadine 10mg",
     "category": "مضادات الحساسية", "price": 3800, "description": "مضاد هستامين لعلاج الحساسية",
     "manufacturer": "باير سورية", "stock_status": "in_stock", "quantity": 210,
     "image": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=100",
     "alternatives": [], "requires_prescription": False},
    {"id": "m9", "pharmacy_id": "ph2", "name": "ميتفورمين 500mg", "name_en": "Metformin 500mg",
     "category": "السكري", "price": 5500, "description": "دواء السكري من النوع الثاني",
     "manufacturer": "سانوفي سورية", "stock_status": "in_stock", "quantity": 370,
     "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100",
     "alternatives": [], "requires_prescription": True},
    {"id": "m10", "pharmacy_id": "ph2", "name": "امبريل 5mg", "name_en": "Amlodipine 5mg",
     "category": "ضغط الدم", "price": 9000, "description": "مثبط قنوات الكالسيوم لعلاج ارتفاع ضغط الدم",
     "manufacturer": "فايزر سورية", "stock_status": "in_stock", "quantity": 190,
     "image": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=100",
     "alternatives": [], "requires_prescription": True},
    {"id": "m11", "pharmacy_id": "ph2", "name": "أوميغا 3 1000mg", "name_en": "Omega 3 1000mg",
     "category": "فيتامينات ومكملات", "price": 15000, "description": "زيت السمك الغني بالأحماض الدهنية",
     "manufacturer": "ناتورال هيلث", "stock_status": "in_stock", "quantity": 280,
     "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100",
     "alternatives": [], "requires_prescription": False},
    {"id": "m12", "pharmacy_id": "ph2", "name": "سالبوتامول بخاخ", "name_en": "Salbutamol Inhaler",
     "category": "الجهاز التنفسي", "price": 18000, "description": "موسع قصبي لعلاج الربو",
     "manufacturer": "جلاكسو سوريا", "stock_status": "in_stock", "quantity": 85,
     "image": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=100",
     "alternatives": [], "requires_prescription": True},
]

# ─────────────────────────────────────────────────────────────────────────────
# LAB TESTS
# ─────────────────────────────────────────────────────────────────────────────
LAB_TESTS: List[Dict[str, Any]] = [
    {"id": "lt1", "lab_id": "lab1", "name": "صورة دم كاملة CBC", "name_en": "Complete Blood Count (CBC)",
     "category": "تحاليل الدم", "price": 3500, "duration_hours": 2,
     "description": "تحليل شامل لخلايا الدم الحمراء والبيضاء والصفائح الدموية",
     "preparation": "لا يشترط الصيام"},
    {"id": "lt2", "lab_id": "lab1", "name": "سكر الدم الصائم", "name_en": "Fasting Blood Glucose",
     "category": "تحاليل الدم", "price": 1800, "duration_hours": 1,
     "description": "قياس مستوى السكر في الدم بعد صيام 8 ساعات",
     "preparation": "الصيام 8 ساعات مطلوب"},
    {"id": "lt3", "lab_id": "lab1", "name": "وظائف الكبد LFT", "name_en": "Liver Function Test",
     "category": "تحاليل الدم", "price": 6500, "duration_hours": 4,
     "description": "فحص إنزيمات الكبد وبروتينات الدم",
     "preparation": "الصيام 8 ساعات مطلوب"},
    {"id": "lt4", "lab_id": "lab1", "name": "وظائف الكلى KFT", "name_en": "Kidney Function Test",
     "category": "تحاليل الدم", "price": 5500, "duration_hours": 3,
     "description": "قياس الكرياتينين واليوريا والكهارل",
     "preparation": "الصيام 4 ساعات مطلوب"},
    {"id": "lt5", "lab_id": "lab1", "name": "الدهون الثلاثية والكوليسترول", "name_en": "Lipid Profile",
     "category": "تحاليل الدم", "price": 5000, "duration_hours": 3,
     "description": "قياس الكوليسترول الكلي والـ HDL والـ LDL",
     "preparation": "الصيام 12 ساعة مطلوب"},
    {"id": "lt6", "lab_id": "lab1", "name": "هرمون الغدة الدرقية TSH", "name_en": "Thyroid Function (TSH)",
     "category": "هرمونات", "price": 8000, "duration_hours": 6,
     "description": "قياس مستوى هرمون تحفيز الغدة الدرقية",
     "preparation": "لا يشترط الصيام"},
    {"id": "lt7", "lab_id": "lab1", "name": "تحليل البول الكامل", "name_en": "Urinalysis",
     "category": "بول وميكروبيولوجيا", "price": 2000, "duration_hours": 1,
     "description": "فحص شامل للبول ميكروسكوبياً وكيميائياً",
     "preparation": "عينة أول الصباح مطلوبة"},
    {"id": "lt8", "lab_id": "lab2", "name": "تحليل الهيموغلوبين السكري HbA1c", "name_en": "HbA1c",
     "category": "تحاليل الدم", "price": 7500, "duration_hours": 4,
     "description": "مؤشر متوسط السكر على مدى 3 أشهر",
     "preparation": "لا يشترط الصيام"},
    {"id": "lt9", "lab_id": "lab2", "name": "فيروس التهاب الكبد B و C", "name_en": "Hepatitis B & C",
     "category": "فحوصات الفيروسات", "price": 12000, "duration_hours": 8,
     "description": "كشف فيروس التهاب الكبد الوبائي B و C",
     "preparation": "لا يشترط الصيام"},
    {"id": "lt10", "lab_id": "lab2", "name": "فيتامين D3 المصل", "name_en": "Vitamin D3 Level",
     "category": "تحاليل الدم", "price": 9000, "duration_hours": 6,
     "description": "قياس مستوى فيتامين د في الدم",
     "preparation": "لا يشترط الصيام"},
]

# ─────────────────────────────────────────────────────────────────────────────
# WAREHOUSE INVENTORY
# ─────────────────────────────────────────────────────────────────────────────
WAREHOUSE_INVENTORY: List[Dict[str, Any]] = [
    {"id": "wi1", "warehouse_id": "wh1", "name": "أموكسيسيلين 500mg (حزم 100)", "category": "مضادات حيوية",
     "bulk_price": 380000, "unit": "حزمة/100 علبة", "stock": 45, "min_order": 5},
    {"id": "wi2", "warehouse_id": "wh1", "name": "باراسيتامول 500mg (حزم 100)", "category": "مسكنات",
     "bulk_price": 95000, "unit": "حزمة/100 علبة", "stock": 120, "min_order": 10},
    {"id": "wi3", "warehouse_id": "wh1", "name": "فيتامين D3 1000IU (حزم 50)", "category": "فيتامينات",
     "bulk_price": 520000, "unit": "حزمة/50 علبة", "stock": 30, "min_order": 5},
    {"id": "wi4", "warehouse_id": "wh1", "name": "سالبوتامول بخاخ (حزم 24)", "category": "جهاز تنفسي",
     "bulk_price": 350000, "unit": "حزمة/24 قطعة", "stock": 20, "min_order": 3},
    {"id": "wi5", "warehouse_id": "wh2", "name": "ميتفورمين 500mg (حزم 100)", "category": "السكري",
     "bulk_price": 440000, "unit": "حزمة/100 علبة", "stock": 80, "min_order": 5},
    {"id": "wi6", "warehouse_id": "wh2", "name": "أوميغا 3 1000mg (حزم 50)", "category": "مكملات",
     "bulk_price": 680000, "unit": "حزمة/50 علبة", "stock": 25, "min_order": 3},
]

# ─────────────────────────────────────────────────────────────────────────────
# APPOINTMENTS
# ─────────────────────────────────────────────────────────────────────────────
APPOINTMENTS: List[Dict[str, Any]] = [
    {"id": "apt1", "patient_id": "p1", "doctor_id": "d1",
     "date": "2026-03-25", "time": "10:00", "status": "confirmed",
     "notes": "مراجعة دورية للقلب", "price": 25000,
     "record_access_granted": True, "created_at": "2026-03-20T10:00:00"},
    {"id": "apt2", "patient_id": "p2", "doctor_id": "d2",
     "date": "2026-03-26", "time": "11:00", "status": "pending",
     "notes": "فحص روتيني للطفل", "price": 20000,
     "record_access_granted": False, "created_at": "2026-03-21T11:00:00"},
    {"id": "apt3", "patient_id": "p1", "doctor_id": "d3",
     "date": "2026-03-28", "time": "14:00", "status": "confirmed",
     "notes": "ألم في المعدة مزمن", "price": 22000,
     "record_access_granted": True, "created_at": "2026-03-22T09:00:00"},
    {"id": "apt4", "patient_id": "p3", "doctor_id": "d4",
     "date": "2026-03-24", "time": "09:00", "status": "completed",
     "notes": "ضيق في التنفس", "price": 23000,
     "record_access_granted": False, "created_at": "2026-03-18T14:00:00"},
    {"id": "apt5", "patient_id": "p4", "doctor_id": "d5",
     "date": "2026-03-27", "time": "16:00", "status": "pending",
     "notes": "حساسية جلدية", "price": 18000,
     "record_access_granted": False, "created_at": "2026-03-23T08:00:00"},
]

# ─────────────────────────────────────────────────────────────────────────────
# MEDICINE ORDERS
# ─────────────────────────────────────────────────────────────────────────────
ORDERS: List[Dict[str, Any]] = [
    {"id": "ord1", "patient_id": "p1", "pharmacy_id": "ph1",
     "items": [{"medicine_id": "m1", "qty": 2, "price": 4500}, {"medicine_id": "m2", "qty": 3, "price": 1200}],
     "total": 12600, "status": "delivered", "delivery_address": "المزة، شارع الثلاثين",
     "created_at": "2026-03-15T10:00:00", "delivered_at": "2026-03-16T14:00:00"},
    {"id": "ord2", "patient_id": "p2", "pharmacy_id": "ph1",
     "items": [{"medicine_id": "m8", "qty": 1, "price": 3800}, {"medicine_id": "m6", "qty": 1, "price": 12000}],
     "total": 15800, "status": "processing", "delivery_address": "العزيزية، شارع النيل",
     "created_at": "2026-03-23T14:00:00", "delivered_at": None},
    {"id": "ord3", "patient_id": "p3", "pharmacy_id": "ph2",
     "items": [{"medicine_id": "m9", "qty": 2, "price": 5500}],
     "total": 11000, "status": "pending", "delivery_address": "كفر سوسة",
     "created_at": "2026-03-23T20:00:00", "delivered_at": None},
]

# Warehouse supply orders
WAREHOUSE_ORDERS: List[Dict[str, Any]] = [
    {"id": "wo1", "pharmacy_id": "ph1", "warehouse_id": "wh1",
     "items": [{"item_id": "wi1", "qty": 10}, {"item_id": "wi2", "qty": 20}],
     "total": 5700000, "status": "delivered",
     "delivery_time": "2026-03-18", "created_at": "2026-03-15T09:00:00"},
    {"id": "wo2", "pharmacy_id": "ph2", "warehouse_id": "wh2",
     "items": [{"item_id": "wi5", "qty": 15}],
     "total": 6600000, "status": "processing",
     "delivery_time": "2026-03-27", "created_at": "2026-03-22T11:00:00"},
]

# ─────────────────────────────────────────────────────────────────────────────
# LAB BOOKINGS & RESULTS
# ─────────────────────────────────────────────────────────────────────────────
LAB_BOOKINGS: List[Dict[str, Any]] = [
    {"id": "lb1", "patient_id": "p1", "lab_id": "lab1", "test_id": "lt1",
     "date": "2026-03-20", "time": "07:30", "status": "completed",
     "created_at": "2026-03-18T10:00:00"},
    {"id": "lb2", "patient_id": "p1", "lab_id": "lab1", "test_id": "lt3",
     "date": "2026-03-20", "time": "07:30", "status": "completed",
     "created_at": "2026-03-18T10:00:00"},
    {"id": "lb3", "patient_id": "p2", "lab_id": "lab1", "test_id": "lt2",
     "date": "2026-03-25", "time": "08:00", "status": "booked",
     "created_at": "2026-03-23T09:00:00"},
    {"id": "lb4", "patient_id": "p3", "lab_id": "lab2", "test_id": "lt8",
     "date": "2026-03-24", "time": "09:00", "status": "processing",
     "created_at": "2026-03-23T15:00:00"},
]

LAB_RESULTS: List[Dict[str, Any]] = [
    {"id": "lr1", "booking_id": "lb1", "patient_id": "p1", "lab_id": "lab1", "test_id": "lt1",
     "uploaded_by": "lab1", "date": "2026-03-20",
     "values": [
         {"parameter": "الهيموغلوبين", "value": "14.2", "unit": "g/dL", "reference": "13.5-17.5", "status": "normal"},
         {"parameter": "كريات الدم الحمراء", "value": "5.1", "unit": "×10⁶/μL", "reference": "4.5-5.9", "status": "normal"},
         {"parameter": "كريات الدم البيضاء", "value": "7.8", "unit": "×10³/μL", "reference": "4.5-11.0", "status": "normal"},
         {"parameter": "الصفائح الدموية", "value": "285", "unit": "×10³/μL", "reference": "150-400", "status": "normal"},
         {"parameter": "الهيماتوكريت", "value": "42", "unit": "%", "reference": "40-52", "status": "normal"},
     ],
     "notes": "النتائج طبيعية. لا توجد مؤشرات مرضية.",
     "doctor_note": None},
    {"id": "lr2", "booking_id": "lb2", "patient_id": "p1", "lab_id": "lab1", "test_id": "lt3",
     "uploaded_by": "lab1", "date": "2026-03-20",
     "values": [
         {"parameter": "ALT", "value": "32", "unit": "U/L", "reference": "7-56", "status": "normal"},
         {"parameter": "AST", "value": "28", "unit": "U/L", "reference": "10-40", "status": "normal"},
         {"parameter": "الفوسفاتيز القلوي", "value": "85", "unit": "U/L", "reference": "44-147", "status": "normal"},
         {"parameter": "البيليروبين الكلي", "value": "0.8", "unit": "mg/dL", "reference": "0.1-1.2", "status": "normal"},
         {"parameter": "البروتين الكلي", "value": "7.2", "unit": "g/dL", "reference": "6.3-8.2", "status": "normal"},
     ],
     "notes": "وظائف الكبد ضمن الحدود الطبيعية.",
     "doctor_note": None},
]

# ─────────────────────────────────────────────────────────────────────────────
# MEDICAL RECORDS
# ─────────────────────────────────────────────────────────────────────────────
MEDICAL_RECORDS: List[Dict[str, Any]] = [
    {"id": "mr1", "patient_id": "p1", "uploaded_by": "d1",
     "type": "تقرير طبي", "title": "تقرير فحص القلب",
     "content": "المريض في حالة جيدة. تخطيط القلب طبيعي. يوصى بالمتابعة الدورية كل 6 أشهر.",
     "date": "2026-02-15", "shared_with": ["d1", "d3"],
     "created_at": "2026-02-15T11:00:00"},
    {"id": "mr2", "patient_id": "p1", "uploaded_by": "p1",
     "type": "تاريخ مرضي", "title": "ملخص التاريخ الطبي",
     "content": "لا أمراض مزمنة معروفة. حساسية من البنسلين. لا عمليات جراحية سابقة.",
     "date": "2026-01-10", "shared_with": ["d1"],
     "created_at": "2026-01-10T09:00:00"},
    {"id": "mr3", "patient_id": "p3", "uploaded_by": "d4",
     "type": "تقرير طبي", "title": "تقرير فحص الرئة",
     "content": "مريض معروف بالسكري. الرئتان سليمتان. لا علامات على التهاب. يستمر على الميتفورمين.",
     "date": "2026-03-10", "shared_with": ["d4"],
     "created_at": "2026-03-10T14:00:00"},
]

# ─────────────────────────────────────────────────────────────────────────────
# SPECIALIZATIONS LIST
# ─────────────────────────────────────────────────────────────────────────────
SPECIALIZATIONS = [
    {"id": "sp1", "name": "قلبية", "name_en": "Cardiology", "icon": "heart"},
    {"id": "sp2", "name": "طب الأطفال", "name_en": "Pediatrics", "icon": "baby-face-outline"},
    {"id": "sp3", "name": "هضمية", "name_en": "Gastroenterology", "icon": "stomach"},
    {"id": "sp4", "name": "الجهاز التنفسي", "name_en": "Pulmonology", "icon": "lungs"},
    {"id": "sp5", "name": "جلدية وتجميل", "name_en": "Dermatology", "icon": "flower-outline"},
    {"id": "sp6", "name": "عظام ومفاصل", "name_en": "Orthopedics", "icon": "bone"},
    {"id": "sp7", "name": "طب العيون", "name_en": "Ophthalmology", "icon": "eye-outline"},
    {"id": "sp8", "name": "بلعوم", "name_en": "ENT", "icon": "ear-hearing"},
    {"id": "sp9", "name": "طب الأسنان", "name_en": "Dentistry", "icon": "tooth-outline"},
    {"id": "sp10", "name": "طب الأعصاب", "name_en": "Neurology", "icon": "brain"},
]

# ─────────────────────────────────────────────────────────────────────────────
# AUDIT LOGS
# ─────────────────────────────────────────────────────────────────────────────
AUDIT_LOGS: List[Dict[str, Any]] = [
    {"id": "al1", "user_id": "p1", "action": "login", "details": "تسجيل دخول", "timestamp": "2026-03-23T08:00:00"},
    {"id": "al2", "user_id": "p1", "action": "book_appointment", "details": "حجز موعد مع د. كريم", "timestamp": "2026-03-23T08:05:00"},
    {"id": "al3", "user_id": "d1", "action": "login", "details": "تسجيل دخول", "timestamp": "2026-03-23T09:00:00"},
    {"id": "al4", "user_id": "d1", "action": "accept_appointment", "details": "قبول موعد المريض أحمد", "timestamp": "2026-03-23T09:10:00"},
    {"id": "al5", "user_id": "p2", "action": "order_medicine", "details": "طلب أدوية من صيدلية الشفاء", "timestamp": "2026-03-23T14:00:00"},
    {"id": "al6", "user_id": "lab1", "action": "upload_result", "details": "رفع نتيجة تحليل CBC للمريض أحمد", "timestamp": "2026-03-20T15:00:00"},
]


# ─────────────────────────────────────────────────────────────────────────────
# REVIEWS, PRESCRIPTIONS, PAYMENTS
# ─────────────────────────────────────────────────────────────────────────────
REVIEWS: List[Dict[str, Any]] = [
    {"id": "rev1", "patient_id": "p1", "target_id": "d1", "rating": 5.0, "comment": "دكتور ممتاز جداً ومتعاون.", "created_at": "2026-03-20T12:00:00"},
    {"id": "rev2", "patient_id": "p2", "target_id": "ph1", "rating": 4.5, "comment": "خدمة سريعة وصيدلية متكاملة.", "created_at": "2026-03-21T10:00:00"},
]

PRESCRIPTIONS: List[Dict[str, Any]] = [
    {"id": "rx1", "doctor_id": "d1", "patient_id": "p1", "medications": ["أموكسيسيلين 500mg (حبتين يوميا)", "باراسيتامول (عند اللزوم)"], "notes": "الراحة لمدة ثلاثة أيام.", "is_dispensed": False, "created_at": "2026-03-25T10:30:00"},
]

PAYMENTS: List[Dict[str, Any]] = [
    {"id": "pay1", "user_id": "p1", "amount": 25000, "currency": "SYP", "status": "completed", "type": "appointment", "reference_id": "apt1", "created_at": "2026-03-25T09:50:00"},
    {"id": "pay2", "user_id": "p1", "amount": 12600, "currency": "SYP", "status": "completed", "type": "order", "reference_id": "ord1", "created_at": "2026-03-15T10:05:00"},
]

from db import engine, SessionLocal, Base
from models import (
    User, Medicine, LabTest, WarehouseInventory, Appointment,
    Order, WarehouseOrder, LabBooking, LabResult, MedicalRecord, AuditLog,
    Review, Prescription, Payment
)
from auth_utils import hash_password

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if we already have users
    if db.query(User).first():
        print("Database already seeded. Skipping...")
        db.close()
        return

    print("Seeding database with mock data...")

    try:
        # Seed Users
        for u_data in USERS:
            # Hash password before seeding
            u_data_copy = u_data.copy()
            u_data_copy["password"] = hash_password(u_data_copy["password"])
            u = User(**u_data_copy)
            db.add(u)
        
        # Seed Medicines
        for m_data in MEDICINES:
            m = Medicine(**m_data)
            db.add(m)
            
        # Seed Lab Tests
        for lt_data in LAB_TESTS:
            lt = LabTest(**lt_data)
            db.add(lt)
            
        # Seed Warehouse Inventory
        for wi_data in WAREHOUSE_INVENTORY:
            wi = WarehouseInventory(**wi_data)
            db.add(wi)
            
        # Seed Appointments
        for apt_data in APPOINTMENTS:
            apt = Appointment(**apt_data)
            db.add(apt)
            
        # Seed Orders
        for ord_data in ORDERS:
            o = Order(**ord_data)
            db.add(o)
            
        # Seed Warehouse Orders
        for wo_data in WAREHOUSE_ORDERS:
            wo = WarehouseOrder(**wo_data)
            db.add(wo)
            
        # Seed Lab Bookings
        for lb_data in LAB_BOOKINGS:
            lb = LabBooking(**lb_data)
            db.add(lb)
            
        # Seed Lab Results
        for lr_data in LAB_RESULTS:
            lr = LabResult(**lr_data)
            db.add(lr)
            
        # Seed Medical Records
        for mr_data in MEDICAL_RECORDS:
            mr = MedicalRecord(**mr_data)
            db.add(mr)
            
        # Seed Audit Logs
        for al_data in AUDIT_LOGS:
            al = AuditLog(**al_data)
            db.add(al)

        # Seed Reviews
        for rev_data in REVIEWS:
            rev = Review(**rev_data)
            db.add(rev)

        # Seed Prescriptions
        for rx_data in PRESCRIPTIONS:
            rx = Prescription(**rx_data)
            db.add(rx)

        # Seed Payments
        for pay_data in PAYMENTS:
            pay = Payment(**pay_data)
            db.add(pay)

        db.commit()
        print("✅ Database successfully seeded!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
