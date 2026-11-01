// Wellness content (research §12, constitution III): every record carries a
// REQUIRED citation — verified by web/tests/content.test.ts.
export type ContentCategory = "NECK" | "SHOULDER" | "SLOUCH" | "GENERAL";

export interface Citation {
  source: string;
  reference: string;
  url: string;
}

export interface ContentRecord {
  id: string;
  title_fa: string;
  body_fa: string;
  category: ContentCategory;
  citation: Citation;
}

export interface EyeBreakRule {
  id: string;
  intervalMinutes: number;
  rule: string;
  title_fa: string;
  body_fa: string;
  citation: Citation;
}

const HANSRAJ: Citation = {
  source: "hansraj-2014",
  reference:
    'Hansraj KK, "Assessment of Stresses in the Cervical Spine Caused by Posture and Position of the Head," Surg Technol Int. 2014;25:277–279',
  url: "https://pubmed.ncbi.nlm.nih.gov/25393825/",
};

const NIOSH: Citation = {
  source: "niosh-97-141",
  reference:
    "DHHS (NIOSH) Publication No. 97-141, Musculoskeletal Disorders and Workplace Factors (1997)",
  url: "https://www.cdc.gov/niosh/docs/97-141/",
};

const AAO_20_20_20: Citation = {
  source: "aao-20-20-20",
  reference:
    'American Academy of Ophthalmology, "Computers, Digital Devices, and Eye Strain" (20-20-20 rule)',
  url: "https://www.aao.org/eye-health/tips-prevention/computer-usage",
};

export const TIPS: ContentRecord[] = [
  {
    id: "tip-neck-1",
    title_fa: "گردن در امتداد ستون فقرات",
    body_fa:
      "گوش‌ها را بالای شانه‌ها نگه دارید؛ هر سانتی‌متر جلو آمدن سر، بار وارده بر گردن را چند برابر می‌کند. هر چند دقیقه چانه را آرام به عقب بکشید.",
    category: "NECK",
    citation: HANSRAJ,
  },
  {
    id: "tip-shoulder-1",
    title_fa: "شانه‌ها را رها و عقب نگه دارید",
    body_fa:
      "شانه‌ها را از گوش‌ها دور نگه دارید و کمی به عقب بچرخانید. گرد شدن مداوم شانه‌ها از عوامل شناخته‌شده آسیب‌های اسکلتی-عضلانی است.",
    category: "SHOULDER",
    citation: NIOSH,
  },
  {
    id: "tip-slouch-1",
    title_fa: "تنه صاف، پاها روی زمین",
    body_fa:
      "پشت صندلی از گودی کمر پشتیبانی کند و کف پاها روی زمین باشد. نشستن قوزکرده طولانی، وضعیت نامتعارف تنه و عامل خطر آسیب است.",
    category: "SLOUCH",
    citation: NIOSH,
  },
  {
    id: "tip-general-1",
    title_fa: "هر نیم‌ساعت یک تغییر وضعیت",
    body_fa:
      "هیچ وضعیتی — حتی درست — نباید طولانی ثابت بماند. هر ۳۰ دقیقه بلند شوید، کشش کوتاهی بدهید و دوباره بنشینید.",
    category: "GENERAL",
    citation: NIOSH,
  },
];

export const EXERCISES: ContentRecord[] = [
  {
    id: "ex-neck-1",
    title_fa: "کشش چانه به عقب (چین تاک)",
    body_fa:
      "صاف بنشینید، چانه را مستقیم به عقب بکشید تا دوباره بالای شانه‌ها قرار گیرد، ۵ ثانیه نگه دارید و ۱۰ بار تکرار کنید.",
    category: "NECK",
    citation: HANSRAJ,
  },
  {
    id: "ex-shoulder-1",
    title_fa: "فشار دادن کتف‌ها",
    body_fa:
      "شانه‌ها را به عقب و به سمت یکدیگر فشار دهید، ۵ ثانیه نگه دارید و رها کنید. ۱۰ تکرار، دو بار در روز.",
    category: "SHOULDER",
    citation: NIOSH,
  },
  {
    id: "ex-slouch-1",
    title_fa: "کشش افتادن صندلی",
    body_fa:
      "لبه صندلی بنشینید، دست‌ها را پشت سر قلاب کنید و به آرامی به عقب باز شوید تا قفسه سینه باز شود؛ ۱۵ ثانیه نگه دارید.",
    category: "SLOUCH",
    citation: NIOSH,
  },
  {
    id: "ex-general-1",
    title_fa: "راه رفتن کوتاه",
    body_fa:
      "هر ساعت دو دقیقه راه رفتن، گردش خون و وضعیت عضلانی را بازیابی می‌کند و خستگی نشستن طولانی را کاهش می‌دهد.",
    category: "GENERAL",
    citation: NIOSH,
  },
];

export const EYE_BREAK_RULE: EyeBreakRule = {
  id: "eye-break-20-20-20",
  intervalMinutes: 20,
  rule: "20-20-20",
  title_fa: "استراحت چشم — قانون ۲۰-۲۰-۲۰",
  body_fa:
    "هر ۲۰ دقیقه، به مدت ۲۰ ثانیه به نقطه‌ای در فاصله ۲۰ فوتی (حدود ۶ متر) نگاه کنید. این کار خستگی چشم ناشی از صفحه‌نمایش را کاهش می‌دهد.",
  citation: AAO_20_20_20,
};

/** Rank content by the user's alert-category mix (FR-012/FR-013). */
export function rankByAlertMix(
  records: ContentRecord[],
  mix: Partial<Record<ContentCategory, number>>
): ContentRecord[] {
  return [...records].sort(
    (a, b) => (mix[b.category] ?? 0) - (mix[a.category] ?? 0) || a.id.localeCompare(b.id)
  );
}
