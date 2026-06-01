// Syria Governorates, Districts, and Subdistricts Data
// المحافظات والمناطق والنواحي في سوريا

export interface SubDistrict {
  id: string;
  name: string;
  name_en: string;
}

export interface District {
  id: string;
  name: string;
  name_en: string;
  subDistricts: SubDistrict[];
}

export interface Governorate {
  id: string;
  name: string;
  name_en: string;
  districts: District[];
}

export const SYRIA_GOVERNORATES: Governorate[] = [
  {
    id: "damascus",
    name: "دمشق",
    name_en: "Damascus",
    districts: [
      {
        id: "damascus_city",
        name: "مدينة دمشق",
        name_en: "Damascus City",
        subDistricts: [
          { id: "malki", name: "المالكي", name_en: "Malki" },
          { id: "mazzeh", name: "المزة", name_en: "Mazzeh" },
          { id: "masaken_barzeh", name: "مساكن برزة", name_en: "Masaken Barzeh" },
          { id: "kark", name: "الكرك", name_en: "Kark" },
          { id: "sALhieh", name: "الصالحية", name_en: "Al-Salihiyah" },
          { id: "baramkeh", name: "البرامكة", name_en: "Baramkeh" },
          { id: "masaken_hejaz", name: "مساكن الحجاز", name_en: "Masaken Hejaz" }
        ]
      },
      {
        id: "rural_damascus",
        name: "ريف دمشق",
        name_en: "Rural Damascus",
        subDistricts: [
          { id: "douma", name: "دوما", name_en: "Douma" },
          { id: "harasta", name: "حرستا", name_en: "Harasta" },
          { id: "qaboun", name: "القابون", name_en: "Qaboun" },
          { id: "jobar", name: "جبر", name_en: "Jobar" },
          { id: "khan_alsheeh", name: "خان الشيح", name_en: "Khan al-Sheeh" },
          { id: "sahnaya", name: "صحنايا", name_en: "Sahnaya" },
          { id: "jaramana", name: "جرمانا", name_en: "Jaramana" },
          { id: "mleiha", name: "مليحة", name_en: "Mleiha" },
          { id: "zamalka", name: "زملكا", name_en: "Zamalka" }
        ]
      }
    ]
  },
  {
    id: "aleppo",
    name: "حلب",
    name_en: "Aleppo",
    districts: [
      {
        id: "aleppo_city",
        name: "مدينة حلب",
        name_en: "Aleppo City",
        subDistricts: [
          { id: "salah_aldeen", name: "صلاح الدين", name_en: "Salah al-Din" },
          { id: "hamdaniya", name: "الحمدانية", name_en: "Hamdaniyah" },
          { id: "mashhad", name: "المشهد", name_en: "Mashhad" },
          { id: "seif_dawla", name: "سيف الدولة", name_en: "Saif al-Dawla" },
          { id: "masakin_sabil", name: "مساكن السبيل", name_en: "Masakin al-Sabil" },
          { id: "aljamiliya", name: "الجميلية", name_en: "Al-Jamiliyah" },
          { id: "new_aleppo", name: "حلب الجديدة", name_en: "New Aleppo" },
          { id: "zahraa", name: "الزهراء", name_en: "Al-Zahraa" },
          { id: "mohafaza", name: "المحافظة", name_en: "Al-Muhafaza" }
        ]
      },
      {
        id: "rural_aleppo",
        name: "ريف حلب",
        name_en: "Rural Aleppo",
        subDistricts: [
          { id: "albab", name: "الباب", name_en: "Al-Bab" },
          { id: "azaz", name: "عزاز", name_en: "Azaz" },
          { id: "jarablus", name: "جرابلس", name_en: "Jarablus" },
          { id: "manbij", name: "منبج", name_en: "Manbij" },
          { id: "dayr_hafir", name: "دير حافر", name_en: "Dayr Hafir" },
          { id: "saraqib", name: "سراقب", name_en: "Saraqib" },
          { id: "atima", name: "أطمة", name_en: "Atima" },
          { id: "dudiyan", name: "دوديان", name_en: "Dudiyan" }
        ]
      }
    ]
  },
  {
    id: "homs",
    name: "حمص",
    name_en: "Homs",
    districts: [
      {
        id: "homs_city",
        name: "مدينة حمص",
        name_en: "Homs City",
        subDistricts: [
          { id: "hadara", name: "الحضارة", name_en: "Al-Hadara" },
          { id: "wahda", name: "الوحدة", name_en: "Al-Wahda" },
          { id: "sabil", name: "السبيل", name_en: "Al-Sabil" },
          { id: "adawiya", name: "العادلية", name_en: "Al-Adawiyah" },
          { id: "nuzha", name: "النزهة", name_en: "Al-Nuzha" },
          { id: "karama", name: "الكرامة", name_en: "Al-Karama" }
        ]
      },
      {
        id: "rural_homs",
        name: "ريف حمص",
        name_en: "Rural Homs",
        subDistricts: [
          { id: "talkalakh", name: "تلكلخ", name_en: "Talkalakh" },
          { id: "alrastan", name: "الرستن", name_en: "Al-Rastan" },
          { id: "talbiseh", name: "تلبيسة", name_en: "Talbiseh" },
          { id: "alhula", name: "الحولة", name_en: "Al-Hula" },
          { id: "almukharram", name: "المخرم", name_en: "Al-Mukharram" },
          { id: "qalat_alhosn", name: "قلعة الحصن", name_en: "Qalat al-Hosn" },
          { id: "fleita", name: "فليطة", name_en: "Fleita" },
          { id: "alzara", name: "الزراعة", name_en: "Al-Zara" }
        ]
      }
    ]
  },
  {
    id: "latakia",
    name: "اللاذقية",
    name_en: "Latakia",
    districts: [
      {
        id: "latakia_city",
        name: "مدينة اللاذقية",
        name_en: "Latakia City",
        subDistricts: [
          { id: "ramel_shamali", name: "الرمل الشمالي", name_en: "Ramel Shamali" },
          { id: "ramel_janoubi", name: "الرمل الجنوبي", name_en: "Ramel Janoubi" },
          { id: "masbah", name: "المصباح", name_en: "Al-Masbah" },
          { id: "saliba", name: "الصليبة", name_en: "Al-Saliba" },
          { id: "ain_alrouse", name: "عين الروسة", name_en: "Ain al-Rousse" },
          { id: "ain_sbaa", name: "عين الصباح", name_en: "Ain al-Sabah" }
        ]
      },
      {
        id: "rural_latakia",
        name: "ريف اللاذقية",
        name_en: "Rural Latakia",
        subDistricts: [
          { id: "jableh", name: "جبلة", name_en: "Jableh" },
          { id: "banias", name: "بانياس", name_en: "Banias" },
          { id: "qardaha", name: "القرداحة", name_en: "Qardaha" },
          { id: "alhaffah", name: "الحفة", name_en: "Al-Haffah" },
          { id: "kalmoun", name: "الكلمون", name_en: "Kalmoun" },
          { id: "slanfah", name: "صلنفة", name_en: "Slanfah" },
          { id: "ein_sharqiyah", name: "عين الشرقية", name_en: "Ain al-Sharqiyah" }
        ]
      }
    ]
  },
  {
    id: "tartous",
    name: "طرطوس",
    name_en: "Tartous",
    districts: [
      {
        id: "tartous_city",
        name: "مدينة طرطوس",
        name_en: "Tartous City",
        subDistricts: [
          { id: "kornish", name: "الكورنيش", name_en: "Al-Kornish" },
          { id: "wadi_eldahab", name: "وادي الذهب", name_en: "Wadi al-Dahab" },
          { id: "alhamama", name: "الحمامة", name_en: "Al-Hamama" },
          { id: "bani_younes", name: "بني يونس", name_en: "Bani Younes" },
          { id: "albashoura", name: "الباشورة", name_en: "Al-Bashoura" }
        ]
      },
      {
        id: "rural_tartous",
        name: "ريف طرطوس",
        name_en: "Rural Tartous",
        subDistricts: [
          { id: "safita", name: "صافيتا", name_en: "Safita" },
          { id: "banias", name: "بانياس", name_en: "Banias" },
          { id: "dreikish", name: "الدريكيش", name_en: "Dreikish" },
          { id: "sheikh_badr", name: "الشيخ بدر", name_en: "Sheikh Badr" },
          { id: "mashta_helou", name: "مشتى حلو", name_en: "Mashta Helou" },
          { id: "kafroun", name: "كفرون", name_en: "Kafroun" },
          { id: "hamin", name: "حامين", name_en: "Hamin" }
        ]
      }
    ]
  },
  {
    id: "hama",
    name: "حماة",
    name_en: "Hama",
    districts: [
      {
        id: "hama_city",
        name: "مدينة حماة",
        name_en: "Hama City",
        subDistricts: [
          { id: "alhamra", name: "الحمراء", name_en: "Al-Hamra" },
          { id: "almansoura", name: "المنصورة", name_en: "Al-Mansoura" },
          { id: "aljara", name: "الجارة", name_en: "Al-Jara" },
          { id: "altawbah", name: "التوبة", name_en: "Al-Tawbah" },
          { id: "alnaser", name: "الناصر", name_en: "Al-Naser" },
          { id: "alqusour", name: "القصور", name_en: "Al-Qusour" }
        ]
      },
      {
        id: "rural_hama",
        name: "ريف حماة",
        name_en: "Rural Hama",
        subDistricts: [
          { id: "salamieh", name: "سلمية", name_en: "Salamieh" },
          { id: "mharda", name: "محردة", name_en: "Mharda" },
          { id: "alrastan", name: "الرستن", name_en: "Al-Rastan" },
          { id: "talbiseh", name: "تلبيسة", name_en: "Talbiseh" },
          { id: "qalat_alhosen", name: "قلعة الحصن", name_en: "Qalat al-Hosen" },
          { id: "suran", name: "صوران", name_en: "Suran" },
          { id: "latamna", name: "اللطامنة", name_en: "Latamna" },
          { id: "kafr_zita", name: "كفرزيتا", name_en: "Kafr Zita" }
        ]
      }
    ]
  },
  {
    id: "daraa",
    name: "درعا",
    name_en: "Daraa",
    districts: [
      {
        id: "daraa_city",
        name: "مدينة درعا",
        name_en: "Daraa City",
        subDistricts: [
          { id: "albalad", name: "البلد", name_en: "Al-Balad" },
          { id: "alsad", name: "الساد", name_en: "Al-Sad" },
          { id: "alhijana", name: "الحجانة", name_en: "Al-Hijana" },
          { id: "almukhayam", name: "المخيم", name_en: "Al-Mukhayam" },
          { id: "almanshiya", name: "المنشية", name_en: "Al-Manshiya" }
        ]
      },
      {
        id: "rural_daraa",
        name: "ريف درعا",
        name_en: "Rural Daraa",
        subDistricts: [
          { id: "bosra", name: "بصرى", name_en: "Bosra" },
          { id: "nawa", name: "نوى", name_en: "Nawa" },
          { id: "alhari", name: "الحارة", name_en: "Al-Hari" },
          { id: "izra", name: "إزرع", name_en: "Izra" },
          { id: "sheikh_miskeen", name: "الشيخ مسكين", name_en: "Sheikh Miskeen" },
          { id: "saida", name: "صيدا", name_en: "Saida" },
          { id: "tafas", name: "طفس", name_en: "Tafas" },
          { id: "aljizah", name: "الجيزة", name_en: "Al-Jizah" }
        ]
      }
    ]
  },
  {
    id: "sweida",
    name: "السويداء",
    name_en: "Sweida",
    districts: [
      {
        id: "sweida_city",
        name: "مدينة السويداء",
        name_en: "Sweida City",
        subDistricts: [
          { id: "albasel", name: "الباسل", name_en: "Al-Basel" },
          { id: "south_road", name: "طريق الجنوب", name_en: "South Road" },
          { id: "aljolan", name: "الجولان", name_en: "Al-Jolan" },
          { id: "omari", name: "العمري", name_en: "Al-Omari" },
          { id: "almaaytah", name: "المعيطة", name_en: "Al-Maaytah" }
        ]
      },
      {
        id: "rural_sweida",
        name: "ريف السويداء",
        name_en: "Rural Sweida",
        subDistricts: [
          { id: "shahba", name: "شهبا", name_en: "Shahba" },
          { id: "salkhad", name: "صلخد", name_en: "Salkhad" },
          { id: "thabaa", name: "الثعبانة", name_en: "Al-Thabaa" },
          { id: "musrara", name: "المزرعة", name_en: "Al-Musrara" },
          { id: "batha", name: "بثة", name_en: "Batha" },
          { id: "arikah", name: "عريقة", name_en: "Arikah" },
          { id: "sahwat_balata", name: "سهوة البلاط", name_en: "Sahwat al-Balata" },
          { id: "alora", name: "العورة", name_en: "Al-Ora" }
        ]
      }
    ]
  }
];

// Helper functions
export function getGovernorates(): { id: string; name: string }[] {
  return SYRIA_GOVERNORATES.map(g => ({ id: g.id, name: g.name }));
}

export function getDistricts(governorateId: string): { id: string; name: string }[] {
  const governorate = SYRIA_GOVERNORATES.find(g => g.id === governorateId);
  if (!governorate) return [];
  return governorate.districts.map(d => ({ id: d.id, name: d.name }));
}

export function getSubDistricts(governorateId: string, districtId: string): { id: string; name: string }[] {
  const governorate = SYRIA_GOVERNORATES.find(g => g.id === governorateId);
  if (!governorate) return [];
  const district = governorate.districts.find(d => d.id === districtId);
  if (!district) return [];
  return district.subDistricts.map(s => ({ id: s.id, name: s.name }));
}

export function getLocationName(governorateId: string, districtId?: string, subDistrictId?: string): string {
  const parts: string[] = [];
  
  const governorate = SYRIA_GOVERNORATES.find(g => g.id === governorateId);
  if (governorate) {
    parts.push(governorate.name);
    
    if (districtId) {
      const district = governorate.districts.find(d => d.id === districtId);
      if (district) {
        parts.push(district.name);
        
        if (subDistrictId) {
          const subDistrict = district.subDistricts.find(s => s.id === subDistrictId);
          if (subDistrict) {
            parts.push(subDistrict.name);
          }
        }
      }
    }
  }
  
  return parts.join(' - ');
}
