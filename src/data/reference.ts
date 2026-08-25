import type { Airline, Airport } from "@/services/types";

import dubaiImg from "@/assets/dest-dubai.jpg";
import istanbulImg from "@/assets/dest-istanbul.jpg";
import cairoImg from "@/assets/dest-cairo.jpg";
import beirutImg from "@/assets/dest-beirut.jpg";
import ammanImg from "@/assets/dest-amman.jpg";
import dohaImg from "@/assets/dest-doha.jpg";

export const AIRPORTS: Airport[] = [
  { code: "BGW", cityAr: "بغداد", cityEn: "Baghdad", cityKu: "بەغدا", nameAr: "مطار بغداد الدولي", nameEn: "Baghdad International", countryAr: "العراق", countryEn: "Iraq" },
  { code: "BSR", cityAr: "البصرة", cityEn: "Basra", cityKu: "بەسرە", nameAr: "مطار البصرة الدولي", nameEn: "Basra International", countryAr: "العراق", countryEn: "Iraq" },
  { code: "EBL", cityAr: "أربيل", cityEn: "Erbil", cityKu: "هەولێر", nameAr: "مطار أربيل الدولي", nameEn: "Erbil International", countryAr: "العراق", countryEn: "Iraq" },
  { code: "ISU", cityAr: "السليمانية", cityEn: "Sulaymaniyah", cityKu: "سلێمانی", nameAr: "مطار السليمانية", nameEn: "Sulaymaniyah International", countryAr: "العراق", countryEn: "Iraq" },
  { code: "NJF", cityAr: "النجف", cityEn: "Najaf", cityKu: "نەجەف", nameAr: "مطار النجف الدولي", nameEn: "Najaf International", countryAr: "العراق", countryEn: "Iraq" },
  { code: "DXB", cityAr: "دبي", cityEn: "Dubai", cityKu: "دوبەی", nameAr: "مطار دبي الدولي", nameEn: "Dubai International", countryAr: "الإمارات", countryEn: "UAE" },
  { code: "IST", cityAr: "إستانبول", cityEn: "Istanbul", cityKu: "ئەستەنبۆل", nameAr: "مطار إستانبول", nameEn: "Istanbul Airport", countryAr: "تركيا", countryEn: "Turkey" },
  { code: "CAI", cityAr: "القاهرة", cityEn: "Cairo", cityKu: "قاهیرە", nameAr: "مطار القاهرة الدولي", nameEn: "Cairo International", countryAr: "مصر", countryEn: "Egypt" },
  { code: "BEY", cityAr: "بيروت", cityEn: "Beirut", cityKu: "بەیرووت", nameAr: "مطار رفيق الحريري", nameEn: "Beirut Rafic Hariri", countryAr: "لبنان", countryEn: "Lebanon" },
  { code: "AMM", cityAr: "عمّان", cityEn: "Amman", cityKu: "عەمان", nameAr: "مطار الملكة علياء", nameEn: "Queen Alia International", countryAr: "الأردن", countryEn: "Jordan" },
  { code: "DOH", cityAr: "الدوحة", cityEn: "Doha", cityKu: "دۆحە", nameAr: "مطار حمد الدولي", nameEn: "Hamad International", countryAr: "قطر", countryEn: "Qatar" },
  { code: "LHR", cityAr: "لندن", cityEn: "London", cityKu: "لەندەن", nameAr: "مطار هيثرو", nameEn: "London Heathrow", countryAr: "بريطانيا", countryEn: "UK" },
  { code: "JED", cityAr: "جدة", cityEn: "Jeddah", cityKu: "جیدە", nameAr: "مطار الملك عبدالعزيز", nameEn: "King Abdulaziz International", countryAr: "السعودية", countryEn: "Saudi Arabia" },
  { code: "THR", cityAr: "طهران", cityEn: "Tehran", cityKu: "تاران", nameAr: "مطار الإمام الخميني", nameEn: "Imam Khomeini International", countryAr: "إيران", countryEn: "Iran" },
];

export function airport(code: string): Airport {
  return AIRPORTS.find((a) => a.code === code) ?? AIRPORTS[0]!;
}

export const AIRLINES: Airline[] = [
  { code: "EK", nameAr: "طيران الإمارات", nameEn: "Emirates", nameKu: "ئیمیرەیتس", tint: "#1b4332" },
  { code: "TK", nameAr: "الخطوط التركية", nameEn: "Turkish Airlines", nameKu: "هێڵی تورکی", tint: "#003e2b" },
  { code: "QR", nameAr: "القطرية", nameEn: "Qatar Airways", nameKu: "هێڵی قەتەر", tint: "#0b8757" },
  { code: "FZ", nameAr: "فلاي دبي", nameEn: "Flydubai", nameKu: "فلای دوبەی", tint: "#52b788" },
  { code: "IA", nameAr: "الخطوط الجوية العراقية", nameEn: "Iraqi Airways", nameKu: "هێڵی عێراقی", tint: "#002a1d" },
  { code: "RJ", nameAr: "الملكية الأردنية", nameEn: "Royal Jordanian", nameKu: "شاهانەی ئوردن", tint: "#1b4332" },
  { code: "MS", nameAr: "مصر للطيران", nameEn: "EgyptAir", nameKu: "میسر ئێر", tint: "#0b8757" },
];

export function airline(code: string): Airline {
  return AIRLINES.find((a) => a.code === code) ?? AIRLINES[0]!;
}

export type Destination = {
  code: string;
  image: string;
  fromPrice: number;
  nights: number;
  tagAr: string;
  tagEn: string;
  tagKu: string;
};

export const DESTINATIONS: Destination[] = [
  { code: "DXB", image: dubaiImg, fromPrice: 425000, nights: 4, tagAr: "شوبنغ وعوائل", tagEn: "Shopping and family", tagKu: "بازاڕ و خێزان" },
  { code: "IST", image: istanbulImg, fromPrice: 385000, nights: 5, tagAr: "الأكثر طلبًا", tagEn: "Most booked", tagKu: "زۆرترین حیجز" },
  { code: "CAI", image: cairoImg, fromPrice: 465000, nights: 5, tagAr: "تاريخ ونيل", tagEn: "History and the Nile", tagKu: "مێژوو و نیل" },
  { code: "BEY", image: beirutImg, fromPrice: 510000, nights: 3, tagAr: "بحر وسهرات", tagEn: "Sea and nights out", tagKu: "دەریا و شەوانە" },
  { code: "AMM", image: ammanImg, fromPrice: 340000, nights: 3, tagAr: "أرخص هالأسبوع", tagEn: "Cheapest this week", tagKu: "هەرزانترین ئەم هەفتەیە" },
  { code: "DOH", image: dohaImg, fromPrice: 480000, nights: 4, tagAr: "قريبة وسريعة", tagEn: "Close and quick", tagKu: "نزیک و خێرا" },
];

export const PROMOTIONS = [
  { code: "RAHAL50", discount: 50000, kind: "FLAT" as const, labelAr: "خصم 50,000 د.ع", labelEn: "50,000 IQD off" },
  { code: "SAFAR10", discount: 10, kind: "PERCENT" as const, labelAr: "خصم 10%", labelEn: "10% off" },
];
