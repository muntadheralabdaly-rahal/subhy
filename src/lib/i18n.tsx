import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "ar" | "en" | "ku";

export const LANGS: { code: Lang; label: string; tag: string }[] = [
  { code: "ar", label: "العربية", tag: "ar-IQ" },
  { code: "en", label: "English", tag: "en" },
  { code: "ku", label: "کوردی", tag: "ckb-IQ" },
];

/** Pick from all three languages at once. Arabic is the source of truth. */
export function pick(lng: Lang, ar: string, en?: string, ku?: string): string {
  if (lng === "en") return en || ar;
  if (lng === "ku") return ku || ar;
  return ar;
}

export function dirOf(lng: Lang): "rtl" | "ltr" {
  return lng === "en" ? "ltr" : "rtl";
}

/** [ar, en, ku] triples. Empty en/ku fall back to Arabic. */
type Entry = [string, string, string];

export const dict = {
  brand: ["رحّال", "Rahal", "رحّال"],
  tagline: [
    "كلّ رحلتك من مكان واحد",
    "Your whole trip, in one place",
    "هەموو گەشتەکەت لە یەک شوێن",
  ],
  nav_home: ["الرئيسية", "Home", "سەرەکی"],
  nav_flights: ["طيران", "Flights", "گەشتی ئاسمانی"],
  nav_hotels: ["فنادق", "Hotels", "هوتێل"],
  nav_packages: ["باقات", "Packages", "پاکێج"],
  nav_trips: ["سافر مع رحّال", "Travel with Rahal", "گەشت لەگەڵ رحّال"],
  nav_bookings: ["حجوزاتي", "My Bookings", "حیجزەکانم"],
  nav_profile: ["حسابي", "Profile", "هەژمارم"],
  nav_support: ["الدعم", "Support", "پشتگیری"],
  nav_notifications: ["التنبيهات", "Notifications", "ئاگادارییەکان"],

  hero_title: ["وين تريد تسافر؟", "Where do you want to go?", "دەتەوێت بۆ کوێ بڕۆیت؟"],
  hero_sub: [
    "طيران، فنادق وباقات بأسعار واضحة وبالدينار",
    "Flights, hotels and packages with clear prices in IQD",
    "گەشت، هوتێل و پاکێج بە نرخی ڕوون بە دینار",
  ],
  tab_flights: ["طيران", "Flights", "گەشت"],
  tab_hotels: ["فنادق", "Hotels", "هوتێل"],
  tab_packages: ["باقات", "Packages", "پاکێج"],
  trip_round: ["ذهاب وعودة", "Round trip", "چوون و گەڕانەوە"],
  trip_one: ["ذهاب فقط", "One way", "تەنها چوون"],
  trip_multi: ["متعدد المدن", "Multi-city", "چەند شار"],
  f_from: ["من", "From", "لە"],
  f_to: ["إلى", "To", "بۆ"],
  f_depart: ["تاريخ الذهاب", "Departure", "ڕۆژی چوون"],
  f_return: ["تاريخ العودة", "Return", "ڕۆژی گەڕانەوە"],
  f_travelers: ["المسافرون", "Travelers", "گەشتیارەکان"],
  f_cabin: ["الدرجة", "Cabin", "پۆل"],
  search: ["دوّر", "Search", "گەڕان"],
  adults: ["بالغ", "Adults", "گەورە"],
  children: ["طفل", "Children", "منداڵ"],
  infants: ["رضيع", "Infants", "ساوا"],
  cabin_economy: ["اقتصادية", "Economy", "ئابووری"],
  cabin_premium: ["اقتصادية مميزة", "Premium Economy", "ئابووری تایبەت"],
  cabin_business: ["الأعمال", "Business", "بازرگانی"],
  cabin_first: ["الأولى", "First", "یەکەم"],
  recent_searches: ["بحثك الأخير", "Recent searches", "گەڕانی دواتر"],
  popular_dest: ["وجهات يحبها العراقيون", "Where Iraqis travel most", "زۆرترین شوێنی گەشت"],
  trending: ["ترند هالأسبوع", "Trending this week", "بەناوبانگی ئەم هەفتەیە"],
  cheapest_dest: ["أرخص الوجهات", "Cheapest destinations", "هەرزانترین شوێنەکان"],
  from_price: ["من", "From", "لە"],

  results_title: ["نتائج الطيران", "Flight results", "ئەنجامەکانی گەشت"],
  results_count: ["رحلة متاحة", "flights available", "گەشتی بەردەست"],
  filters: ["فلتر", "Filters", "فلتەر"],
  sort: ["ترتيب", "Sort", "ڕیزکردن"],
  sort_recommended: ["المقترح", "Recommended", "پێشنیارکراو"],
  sort_cheapest: ["الأرخص", "Cheapest", "هەرزانترین"],
  sort_fastest: ["الأسرع", "Fastest", "خێراترین"],
  sort_earliest: ["الأبكر", "Earliest", "زووترین"],
  price_range: ["السعر", "Price", "نرخ"],
  airlines: ["الخطوط", "Airlines", "هێڵەکان"],
  stops: ["التوقفات", "Stops", "وەستان"],
  direct: ["مباشر", "Direct", "ڕاستەوخۆ"],
  one_stop: ["توقف واحد", "1 stop", "یەک وەستان"],
  two_stops: ["توقفين أو أكثر", "2+ stops", "٢ وەستان یان زیاتر"],
  depart_time: ["وقت الذهاب", "Departure time", "کاتی چوون"],
  baggage: ["الوزن", "Baggage", "بار"],
  duration: ["المدة", "Duration", "درێژی"],
  apply: ["طبّق", "Apply", "جێبەجێ بکە"],
  reset: ["صفّر", "Reset", "سفر"],
  select: ["اختر", "Select", "هەڵبژێرە"],
  details: ["التفاصيل", "View details", "وردەکاری"],
  back: ["رجوع", "Back", "گەڕانەوە"],
  change: ["تغيير", "Change", "گۆڕین"],
  continue_: ["كمّل", "Continue", "بەردەوام بە"],
  book_now: ["احجز هسّه", "Book now", "ئێستا حیجز بکە"],

  fare_calendar: ["أسعار الأيام القريبة", "Prices around your date", "نرخی ڕۆژانی نزیک"],
  cheapest_day: ["أرخص يوم", "Cheapest day", "هەرزانترین ڕۆژ"],

  journey: ["مسار الرحلة", "Journey", "ڕێڕەوی گەشت"],
  aircraft: ["الطائرة", "Aircraft", "فڕۆکە"],
  flight_no: ["رقم الرحلة", "Flight number", "ژمارەی گەشت"],
  fare_rules: ["شروط التذكرة", "Fare rules", "مەرجەکانی بلیت"],
  cancel_rules: ["الإلغاء", "Cancellation", "هەڵوەشاندنەوە"],
  change_rules: ["التغيير", "Changes", "گۆڕانکاری"],
  cabin_bag: ["حقيبة يد", "Cabin bag", "جانتای دەست"],

  travelers_title: ["معلومات المسافرين", "Traveler information", "زانیاری گەشتیارەکان"],
  traveler: ["مسافر", "Traveler", "گەشتیار"],
  first_name: ["الاسم", "First name", "ناو"],
  last_name: ["اللقب", "Last name", "ناوی خێزان"],
  dob: ["تاريخ الميلاد", "Date of birth", "بەرواری لەدایکبوون"],
  gender: ["الجنس", "Gender", "ڕەگەز"],
  male: ["ذكر", "Male", "نێر"],
  female: ["أنثى", "Female", "مێ"],
  nationality: ["الجنسية", "Nationality", "نەتەوە"],
  passport: ["رقم الجواز", "Passport number", "ژمارەی پاسپۆرت"],
  passport_exp: ["انتهاء الجواز", "Passport expiry", "بەسەرچوونی پاسپۆرت"],
  phone: ["الموبايل", "Phone", "مۆبایل"],
  email: ["الإيميل", "Email", "ئیمێل"],
  saved_travelers: ["مسافرين محفوظين", "Saved travelers", "گەشتیارانی پاشەکەوتکراو"],
  use_saved: ["استخدم بياناته", "Use this traveler", "ئەم گەشتیارە بەکاربێنە"],
  save_traveler: ["احفظ للحجوزات القادمة", "Save for next time", "پاشەکەوت بۆ داهاتوو"],

  checkout: ["إتمام الحجز", "Checkout", "تەواوکردنی حیجز"],
  trip_summary: ["ملخص الرحلة", "Trip summary", "کورتەی گەشت"],
  price_breakdown: ["تفاصيل السعر", "Price breakdown", "وردەکاری نرخ"],
  base_fare: ["سعر التذكرة", "Flight", "بلیت"],
  taxes: ["ضرائب ورسوم", "Taxes and fees", "باج و کرێ"],
  service_fee: ["أجور خدمة", "Service fee", "کرێی خزمەت"],
  discount: ["خصم", "Discount", "داشکاندن"],
  total: ["المجموع", "Total", "کۆی گشتی"],
  promo_code: ["كود خصم", "Promo code", "کۆدی داشکاندن"],
  promo_apply: ["فعّل", "Apply", "چالاک بکە"],
  promo_ok: ["تم تطبيق الخصم", "Discount applied", "داشکاندن جێبەجێ کرا"],
  promo_bad: ["الكود غير صحيح", "That code is not valid", "کۆد دروست نییە"],

  payment: ["الدفع", "Payment", "پارەدان"],
  pay_card: ["بطاقة", "Card", "کارت"],
  pay_local: ["دفع محلي", "Local payment", "پارەدانی ناوخۆ"],
  pay_bnpl: ["قسّط حجزك", "Pay in installments", "بە قیست بدە"],
  pay_now: ["ادفع", "Pay", "پارە بدە"],
  card_number: ["رقم البطاقة", "Card number", "ژمارەی کارت"],
  card_name: ["الاسم على البطاقة", "Name on card", "ناو لەسەر کارت"],
  card_exp: ["الانتهاء", "Expiry", "بەسەرچوون"],
  card_cvc: ["CVC", "CVC", "CVC"],
  bnpl_eligible: ["أنت مؤهل للتقسيط", "You are eligible for installments", "تۆ شیاوی قیستی"],
  bnpl_available: ["المبلغ المتاح إلك", "Your available amount", "بڕی بەردەست بۆ تۆ"],
  bnpl_months: ["عدد الأقساط", "Installments", "ژمارەی قیست"],
  bnpl_monthly: ["القسط الشهري", "Monthly installment", "قیستی مانگانە"],
  bnpl_over: [
    "أنت مؤهل للتقسيط، لكن سعر هالرحلة أعلى من المبلغ المتاح إلك حاليًا.",
    "You are eligible for installments, but this trip costs more than your available amount.",
    "تۆ شیاوی قیستی، بەڵام نرخی ئەم گەشتە لە بڕی بەردەستت زیاترە.",
  ],
  remaining: ["الباقي إلك", "Remaining for you", "ماوە بۆ تۆ"],

  confirmed_title: ["تم تأكيد حجزك 🎉", "Your booking is confirmed 🎉", "حیجزەکەت پەسەند کرا 🎉"],
  confirmed_sub: [
    "التذكرة وصلت على إيميلك، وتلقاها بحجوزاتك",
    "The ticket is in your email and in My Bookings",
    "بلیت لە ئیمێلت و لە حیجزەکانمە"
  ],
  booking_ref: ["رقم الحجز", "Booking reference", "ژمارەی حیجز"],
  view_booking: ["شوف الحجز", "View booking", "حیجز ببینە"],
  download_voucher: ["نزّل الفاوتشر", "Download voucher", "ڤاوچەر دابەزێنە"],
  share_booking: ["شارك الحجز", "Share booking", "حیجز هاوبەش بکە"],
  contact_support: ["كلّم الدعم", "Contact support", "پەیوەندی بە پشتگیری"],
  need_help_booking: ["تحتاج مساعدة بهذا الحجز؟", "Need help with this booking?", "یارمەتی دەوێت؟"],

  upcoming: ["القادمة", "Upcoming", "داهاتووەکان"],
  completed: ["المنتهية", "Completed", "تەواوبووەکان"],
  cancelled: ["الملغية", "Cancelled", "هەڵوەشاوەکان"],
  no_bookings: ["ماكو حجوزات هنا هسّه", "No bookings here yet", "هێشتا حیجز نییە"],
  no_bookings_cta: ["ابدأ من البحث ودوّر رحلتك", "Start with a search", "بە گەڕان دەست پێ بکە"],
  documents: ["المستندات", "Documents", "بەڵگەنامەکان"],
  ticket: ["التذكرة", "Ticket", "بلیت"],
  invoice: ["الفاتورة", "Invoice", "پسووڵە"],
  payment_status: ["حالة الدفع", "Payment status", "دۆخی پارەدان"],
  booking_status: ["حالة الحجز", "Booking status", "دۆخی حیجز"],

  loading: ["نجمع إلك أفضل الأسعار", "Finding the best fares", "باشترین نرخ دەدۆزینەوە"],
  empty_results: ["ماكو رحلات بهذا التاريخ", "No flights for this date", "گەشت نییە بۆ ئەم ڕۆژە"],
  empty_results_cta: ["جرّب تاريخ ثاني أو شيل بعض الفلاتر", "Try another date or clear filters", "ڕۆژێکی تر تاقی بکە"],
  empty_results_ia: [
    "ماكو مقاعد للخطوط العراقية على هذا الخط بهذا التاريخ. جرّب تاريخ ثاني.",
    "Iraqi Airways has no seats on this route for this date. Try another date.",
    "هێڵی عێراقی کورسی نییە لەم ڕێگایە بۆ ئەم ڕۆژە. ڕۆژێکی تر تاقی بکە.",
  ],
  error_title: ["صارت مشكلة", "Something went wrong", "کێشەیەک ڕوویدا"],
  retry: ["جرّب مرة ثانية", "Try again", "دووبارە تاقی بکە"],
  soon: ["قريبًا", "Coming soon", "بەم زووانە"],

  status_CONFIRMED: ["مؤكد", "Confirmed", "پەسەندکراو"],
  status_PENDING: ["قيد المعالجة", "Pending", "چاوەڕوان"],
  status_PAYMENT_PENDING: ["بانتظار الدفع", "Payment pending", "چاوەڕوانی پارەدان"],
  status_FAILED: ["فشل", "Failed", "سەرکەوتوو نەبوو"],
  status_CANCELLED: ["ملغي", "Cancelled", "هەڵوەشێنراوە"],
  status_REFUNDED: ["مرجّع", "Refunded", "گەڕێندراوە"],
  status_PAID: ["مدفوع", "Paid", "دراوە"],
  status_UNPAID: ["غير مدفوع", "Unpaid", "نەدراوە"],
  status_INSTALLMENTS: ["بالتقسيط", "Installments", "بە قیست"],
} satisfies Record<string, Entry>;

export type Key = keyof typeof dict;

type Ctx = {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
  p: (ar: string, en?: string, ku?: string) => string;
};

const LangContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "rahal.lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && LANGS.some((l) => l.code === saved)) setLangState(saved);
  }, []);

  useEffect(() => {
    const tag = LANGS.find((l) => l.code === lang)?.tag ?? "ar-IQ";
    document.documentElement.lang = tag;
    document.documentElement.dir = dirOf(lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback((k: Key) => {
    const entry = dict[k] as Entry | undefined;
    if (!entry) return String(k);
    const [ar, en, ku] = entry;
    return pick(lang, ar, en, ku);
  }, [lang]);

  const p = useCallback(
    (ar: string, en?: string, ku?: string) => pick(lang, ar, en, ku),
    [lang],
  );

  const value = useMemo<Ctx>(
    () => ({ lang, dir: dirOf(lang), setLang, t, p }),
    [lang, setLang, t, p],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useI18n must be used inside LanguageProvider");
  return ctx;
}
