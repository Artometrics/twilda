/** Western zodiac sign computed from a birth month + day. */

export interface ZodiacSign {
  name: string;
  symbol: string;
  element: "fire" | "earth" | "air" | "water";
  modality: "cardinal" | "fixed" | "mutable";
  dateRange: string;
  ruling: string;
  description: string;
}

const SIGNS: ZodiacSign[] = [
  {
    name: "Aries", symbol: "♈", element: "fire", modality: "cardinal",
    dateRange: "Mar 21 – Apr 19", ruling: "Mars",
    description: "The Ram. Bold, ambitious, impulsive. First sign — the spark that starts the cycle.",
  },
  {
    name: "Taurus", symbol: "♉", element: "earth", modality: "fixed",
    dateRange: "Apr 20 – May 20", ruling: "Venus",
    description: "The Bull. Grounded, patient, sensual. Builds and values what endures.",
  },
  {
    name: "Gemini", symbol: "♊", element: "air", modality: "mutable",
    dateRange: "May 21 – Jun 20", ruling: "Mercury",
    description: "The Twins. Curious, versatile, communicative. Bridges ideas and people.",
  },
  {
    name: "Cancer", symbol: "♋", element: "water", modality: "cardinal",
    dateRange: "Jun 21 – Jul 22", ruling: "Moon",
    description: "The Crab. Intuitive, nurturing, protective. Home and memory anchor the self.",
  },
  {
    name: "Leo", symbol: "♌", element: "fire", modality: "fixed",
    dateRange: "Jul 23 – Aug 22", ruling: "Sun",
    description: "The Lion. Radiant, creative, proud. The heart that must shine.",
  },
  {
    name: "Virgo", symbol: "♍", element: "earth", modality: "mutable",
    dateRange: "Aug 23 – Sep 22", ruling: "Mercury",
    description: "The Virgin. Precise, analytical, devoted to service. Meaning through craft.",
  },
  {
    name: "Libra", symbol: "♎", element: "air", modality: "cardinal",
    dateRange: "Sep 23 – Oct 22", ruling: "Venus",
    description: "The Scales. Diplomatic, aesthetic, searching for balance and fairness.",
  },
  {
    name: "Scorpio", symbol: "♏", element: "water", modality: "fixed",
    dateRange: "Oct 23 – Nov 21", ruling: "Pluto / Mars",
    description: "The Scorpion. Intense, perceptive, transformative. What endures the death of what came before.",
  },
  {
    name: "Sagittarius", symbol: "♐", element: "fire", modality: "mutable",
    dateRange: "Nov 22 – Dec 21", ruling: "Jupiter",
    description: "The Archer. Philosophical, freedom-loving, expansive. The quest for meaning.",
  },
  {
    name: "Capricorn", symbol: "♑", element: "earth", modality: "cardinal",
    dateRange: "Dec 22 – Jan 19", ruling: "Saturn",
    description: "The Sea-Goat. Disciplined, ambitious, patient. Climbs toward structure and legacy.",
  },
  {
    name: "Aquarius", symbol: "♒", element: "air", modality: "fixed",
    dateRange: "Jan 20 – Feb 18", ruling: "Uranus / Saturn",
    description: "The Water-Bearer. Innovative, humanitarian, detached. The future seen from a distance.",
  },
  {
    name: "Pisces", symbol: "♓", element: "water", modality: "mutable",
    dateRange: "Feb 19 – Mar 20", ruling: "Neptune / Jupiter",
    description: "The Fish. Empathic, dreaming, dissolving boundaries. The last sign holds all the others.",
  },
];

/** Cutoff day for transition between signs: [month (1-based), day] → sign index (0-based) */
const CUTOFFS: [number, number][] = [
  [1, 20], [2, 19], [3, 21], [4, 20], [5, 21], [6, 21],
  [7, 23], [8, 23], [9, 23], [10, 23], [11, 22], [12, 22],
];

export function getZodiacSign(month: number, day: number): ZodiacSign {
  const [cutoffM, cutoffD] = CUTOFFS[month - 1];
  if (day < cutoffD) {
    // Before cutoff — use previous sign
    const prevIdx = ((month - 2) + 12) % 12;
    return SIGNS[prevIdx];
  }
  // On or after cutoff — use this month's sign
  const idx = (month - 1 + 11) % 12;
  return SIGNS[idx];
}

export function zodiacFromBirthDate(year: number, month: number, day: number): ZodiacSign {
  return getZodiacSign(month, day);
}

/** Chinese zodiac year animal */
export interface ChineseZodiac {
  animal: string;
  symbol: string;
  element: string;
  description: string;
}

const CHINESE_ANIMALS = [
  { animal: "Rat", symbol: "🐀", element: "Water", description: "Quick-witted, resourceful, and versatile." },
  { animal: "Ox", symbol: "🐂", element: "Earth", description: "Diligent, dependable, strong, determined." },
  { animal: "Tiger", symbol: "🐅", element: "Wood", description: "Brave, confident, competitive, unpredictable." },
  { animal: "Rabbit", symbol: "🐇", element: "Wood", description: "Quiet, elegant, kind, responsible." },
  { animal: "Dragon", symbol: "🐉", element: "Earth", description: "Confident, intelligent, enthusiastic." },
  { animal: "Snake", symbol: "🐍", element: "Fire", description: "Enigmatic, intuitive, introspective." },
  { animal: "Horse", symbol: "🐎", element: "Fire", description: "Animated, active, energetic." },
  { animal: "Goat", symbol: "🐐", element: "Earth", description: "Calm, gentle, sympathetic." },
  { animal: "Monkey", symbol: "🐒", element: "Metal", description: "Sharp, smart, curious." },
  { animal: "Rooster", symbol: "🐓", element: "Metal", description: "Observant, hardworking, courageous." },
  { animal: "Dog", symbol: "🐕", element: "Earth", description: "Lovely, honest, prudent." },
  { animal: "Pig", symbol: "🐖", element: "Water", description: "Compassionate, generous, diligent." },
];

export function getChineseZodiac(year: number): ChineseZodiac {
  const idx = ((year - 1900) % 12 + 12) % 12;
  return CHINESE_ANIMALS[idx];
}
