import { AppLanguage } from "./i18n";

const LEVEL_NAMES_BY_LANG: Record<AppLanguage, Record<number, string>> = {
  en: {
    1: "New Soul", 2: "Curious", 3: "Sincere", 4: "Connected", 5: "Trusted",
    6: "Close Friend", 7: "Confidant", 8: "Devoted", 9: "Soulmate", 10: "Legend",
    11: "Goddess", 12: "Star", 13: "Queen", 14: "Divine", 15: "Legendary",
    16: "Perfect", 17: "Fairytale", 18: "Sacred", 19: "Eternal", 20: "Universe",
    21: "Cosmic", 22: "Echo", 23: "Awakening", 24: "Temple", 25: "Rebirth",
    26: "Storm", 27: "Abundance", 28: "Light", 29: "Freedom", 30: "Nirvana",
    31: "Ecstasy", 32: "God",
  },
  tr: {
    1: "Yeni Ruh", 2: "Meraklı", 3: "Samimi", 4: "Bağlı", 5: "Güvenilir",
    6: "Yakın Dost", 7: "Sırdaş", 8: "Sadık", 9: "Ruh Eşi", 10: "Efsane",
    11: "Tanrıça", 12: "Yıldız", 13: "Kraliçe", 14: "İlahi", 15: "Efsanevi",
    16: "Mükemmel", 17: "Masalı", 18: "Kutsal", 19: "Sonsuz", 20: "Evrenim",
    21: "Kozmik", 22: "Yankı", 23: "Açılış", 24: "Mabet", 25: "Diriliş",
    26: "Fırtına", 27: "Bereket", 28: "Işık", 29: "Özgürlük", 30: "Nirvana",
    31: "Ekstasi", 32: "Tanrı",
  },
  de: {
    1: "Neue Seele", 2: "Neugierig", 3: "Aufrichtig", 4: "Verbunden", 5: "Vertraut",
    6: "Enger Freund", 7: "Vertrauter", 8: "Treu", 9: "Seelenverwandter", 10: "Legende",
    11: "Göttin", 12: "Stern", 13: "Königin", 14: "Göttlich", 15: "Legendär",
    16: "Perfekt", 17: "Märchen", 18: "Heilig", 19: "Ewig", 20: "Universum",
    21: "Kosmisch", 22: "Echo", 23: "Erweckung", 24: "Tempel", 25: "Wiedergeburt",
    26: "Sturm", 27: "Fülle", 28: "Licht", 29: "Freiheit", 30: "Nirwana",
    31: "Ekstase", 32: "Gott",
  },
  zh: {
    1: "新灵魂", 2: "好奇", 3: "真诚", 4: "连结", 5: "信赖",
    6: "亲密朋友", 7: "知己", 8: "忠诚", 9: "灵魂伴侣", 10: "传奇",
    11: "女神", 12: "星星", 13: "女王", 14: "神圣", 15: "传奇之力",
    16: "完美", 17: "童话", 18: "神圣的", 19: "永恒", 20: "宇宙",
    21: "宇宙的", 22: "回响", 23: "觉醒", 24: "圣殿", 25: "重生",
    26: "风暴", 27: "丰盛", 28: "光明", 29: "自由", 30: "涅槃",
    31: "极乐", 32: "神",
  },
  ko: {
    1: "새로운 영혼", 2: "호기심", 3: "진솔함", 4: "연결", 5: "신뢰",
    6: "절친", 7: "비밀친구", 8: "충실한", 9: "소울메이트", 10: "전설",
    11: "여신", 12: "별", 13: "여왕", 14: "신성한", 15: "전설적인",
    16: "완벽한", 17: "동화", 18: "신성", 19: "영원", 20: "우주",
    21: "우주적", 22: "메아리", 23: "각성", 24: "성전", 25: "재탄생",
    26: "폭풍", 27: "풍요", 28: "빛", 29: "자유", 30: "열반",
    31: "황홀경", 32: "신",
  },
  es: {
    1: "Alma Nueva", 2: "Curioso", 3: "Sincero", 4: "Conectado", 5: "Confiable",
    6: "Amigo Cercano", 7: "Confidente", 8: "Leal", 9: "Alma Gemela", 10: "Leyenda",
    11: "Diosa", 12: "Estrella", 13: "Reina", 14: "Divino", 15: "Legendario",
    16: "Perfecto", 17: "Cuento", 18: "Sagrado", 19: "Eterno", 20: "Universo",
    21: "Cósmico", 22: "Eco", 23: "Despertar", 24: "Templo", 25: "Renacimiento",
    26: "Tormenta", 27: "Abundancia", 28: "Luz", 29: "Libertad", 30: "Nirvana",
    31: "Éxtasis", 32: "Dios",
  },
  ru: {
    1: "Новая Душа", 2: "Любопытный", 3: "Искренний", 4: "Связанный", 5: "Надёжный",
    6: "Близкий Друг", 7: "Доверенный", 8: "Преданный", 9: "Родная Душа", 10: "Легенда",
    11: "Богиня", 12: "Звезда", 13: "Королева", 14: "Божественный", 15: "Легендарный",
    16: "Совершенный", 17: "Сказочный", 18: "Священный", 19: "Вечный", 20: "Вселенная",
    21: "Космический", 22: "Эхо", 23: "Пробуждение", 24: "Храм", 25: "Возрождение",
    26: "Буря", 27: "Изобилие", 28: "Свет", 29: "Свобода", 30: "Нирвана",
    31: "Экстаз", 32: "Бог",
  },
};

export function getLevelName(level: number, lang?: string): string {
  const l = (lang ?? "en") as AppLanguage;
  const names = LEVEL_NAMES_BY_LANG[l] ?? LEVEL_NAMES_BY_LANG.en;
  return names[level] ?? LEVEL_NAMES_BY_LANG.en[level] ?? "Legend";
}
