/**
 * Intent classification — keyword scoring adapted from Nawwar.
 * No AI call needed. Runs in ~0ms.
 */

const INTENT_KEYWORDS: Record<string, string[]> = {
  billing: [
    'فاتور', 'فواتير', 'bill', 'مبلغ', 'amount', 'دفع', 'pay',
    'رصيد', 'balance', 'حساب', 'اشتراك', 'دينار', 'فلس',
    'كم فاتورتي', 'كم حسابي', 'how much',
  ],
  tariff: [
    'تعرفة', 'tariff', 'شريحة', 'tier', 'سعر', 'rate', 'كيلوواط',
    'سكنية', 'منزلية', 'تجاري', 'زراعي', 'صناعي', 'مدعوم', 'دعم',
  ],
  savings: [
    'توفير', 'وفر', 'أوفر', 'save', 'تخفيض', 'reduce', 'نصائح', 'tips',
    'ترشيد', 'شمسي', 'solar', 'أقلل', 'أنزل',
  ],
  complaint: [
    'شكوى', 'شكاوي', 'complaint', 'مشكلة', 'problem', 'أشتكي',
    'بدي أشتكي', 'عندي مشكلة', 'I want to complain',
  ],
  outage: [
    'انقطاع', 'outage', 'عطل', 'fault', 'كهرباء مقطوعة', 'مقطوعة',
    'power cut', 'power out', 'الكهرباء فصلت',
  ],
  contact: [
    'رقم', 'هاتف', 'اتصل', 'phone', 'contact', 'فرع', 'branch',
    'عنوان', 'address', 'جيبكو', 'jepco', 'شركة الكهرباء',
  ],
};

export type Intent = 'billing' | 'tariff' | 'savings' | 'complaint' | 'outage' | 'contact' | 'general';

export function classifyIntent(text: string): Intent {
  const lower = text.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > 0) scores[intent] = score;
  }

  if (Object.keys(scores).length === 0) return 'general';

  // Return the intent with the highest score
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as Intent;
}

// Map Arabic complaint type words to enum values
export function parseComplaintType(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes('انقطاع') || lower.includes('outage') || lower.includes('power')) return 'OUTAGE';
  if (lower.includes('فاتور') || lower.includes('bill')) return 'BILLING';
  if (lower.includes('عداد') || lower.includes('meter')) return 'METER';
  if (lower.includes('جهد') || lower.includes('voltage')) return 'VOLTAGE';
  if (lower.includes('أخرى') || lower.includes('other')) return 'OTHER';
  return null;
}

// Detect confirmation (yes/no) in Arabic/English
export function isConfirmation(text: string): boolean | null {
  const lower = text.toLowerCase().trim();
  const yes = ['أيوا', 'ايوا', 'نعم', 'اه', 'yes', 'yeah', 'yep', 'ok', 'أكيد', 'تمام'];
  const no = ['لا', 'لأ', 'no', 'nope', 'cancel', 'إلغاء', 'الغاء'];
  if (yes.some((w) => lower.includes(w))) return true;
  if (no.some((w) => lower.includes(w))) return false;
  return null;
}
