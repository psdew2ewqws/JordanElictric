/**
 * One-time seed function: loads knowledge docs into pgvector.
 * Call once: curl -X POST https://pehberdmrsnaeqtlopbq.supabase.co/functions/v1/seed-knowledge
 */
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { getEmbedding } from "../_shared/ai-clients.ts";

// Knowledge chunks — from Nawwar, adapted for Diaa
const CHUNKS = [
  // ── Tariffs ──
  { source: "tariffs.md", section: "التعرفة السكنية المدعومة", content: `التعرفة السكنية المدعومة في الأردن:
الشريحة الأولى: 0 إلى 300 كيلوواط ساعة بسعر 50 فلس لكل كيلوواط (0.050 دينار)
الشريحة الثانية: 301 إلى 600 كيلوواط ساعة بسعر 100 فلس (0.100 دينار)
الشريحة الثالثة: أكثر من 600 كيلوواط ساعة بسعر 200 فلس (0.200 دينار)
الدعم المباشر: خصم 2.5 دينار للاستهلاك 51-200 كيلوواط، وخصم 2 دينار للاستهلاك 201-600 كيلوواط.
الحد الأدنى للفاتورة: 1.750 دينار شهرياً.` },

  { source: "tariffs.md", section: "رسوم ثابتة", content: `الرسوم الثابتة على فاتورة الكهرباء:
إيجار العداد: 200 فلس (0.200 دينار) شهرياً
رسم التلفزيون: 1 دينار شهرياً
رسم التنمية الريفية: 1 فلس لكل كيلوواط ساعة
ضريبة البلدية: 10% من قيمة الاستهلاك
رسم إعادة التوصيل: 5 دنانير (في حال الفصل)` },

  { source: "tariffs.md", section: "Residential Subsidized Tariff", content: `Jordan residential subsidized electricity tariff:
Tier 1: 0-300 kWh at 50 fils/kWh (JD 0.050)
Tier 2: 301-600 kWh at 100 fils/kWh (JD 0.100)
Tier 3: 600+ kWh at 200 fils/kWh (JD 0.200)
Direct subsidy: JD 2.5 deducted for 51-200 kWh, JD 2.0 for 201-600 kWh.
Minimum monthly charge: JD 1.750.
Fixed charges: meter rent JD 0.200, TV license JD 1.000, municipality tax 10%.` },

  // ── Bill Anatomy ──
  { source: "bill_anatomy.md", section: "تشريح الفاتورة", content: `كيف تقرأ فاتورة الكهرباء:
رقم المرجع (رقم الملف): 13 رقم يبدأ بـ 015، مثل 01/50706/667387. هذا أهم رقم في الفاتورة.
بنود الفاتورة: استهلاك الكهرباء (حسب الشريحة)، تعديل سعر الوقود، إيجار العداد (200 فلس)، رسم التنمية الريفية، رسم التلفزيون (1 دينار)، رسم النفايات، خصم الدعم (2 دينار للمدعوم).
توزيع التكلفة: 87% تكلفة الكهرباء الفعلية، 13% رسوم حكومية.` },

  { source: "bill_anatomy.md", section: "Understanding Your Bill", content: `How to read your electricity bill:
Reference number (file number): 13 digits starting with 015, e.g., 01/50706/667387. This is the most important number.
Line items: electricity consumption (by tier), fuel price adjustment, meter rent (200 fils), rural development fee, TV license (1 JD), waste fee, subsidy credit (-2 JD for subsidized).
Cost breakdown: 87% actual electricity, 13% government fees.` },

  // ── Savings Tips ──
  { source: "savings_tips.md", section: "نصائح التكييف", content: `التكييف يشكل 40-60% من فاتورة الكهرباء في الصيف.
اضبط درجة الحرارة على 24 مئوية بدل أقل. كل درجة أقل تزيد التكلفة 6%.
استخدم مكيف انفرتر (يوفر 30-50% مقارنة بالعادي).
نظف فلاتر المكيف كل شهر.
أغلق الستائر نهاراً لمنع حرارة الشمس.` },

  { source: "savings_tips.md", section: "نصائح الإضاءة", content: `الإضاءة: استبدل المصابيح العادية بـ LED — توفر 80% من استهلاك الإضاءة.
مصباح LED 10 واط يعطي نفس إضاءة مصباح عادي 60 واط.
استخدم الإضاءة الطبيعية قدر الإمكان.
أطفئ الأنوار عند مغادرة الغرفة.` },

  { source: "savings_tips.md", section: "استراتيجية الشرائح", content: `الهدف الذهبي: استهلاك أقل من 300 كيلوواط شهرياً.
إذا كنت في الشريحة الثانية (301-600 kWh)، حاول تقليل 15% للنزول للشريحة الأولى.
الفرق بين 300 kWh و 301 kWh: الكيلوواط الـ 301 يُحسب بـ 100 فلس بدل 50 فلس.
ركز على تقليل "آخر كيلوواط" لأنه الأغلى.` },

  { source: "savings_tips.md", section: "Energy Saving Tips", content: `AC: 40-60% of summer bill. Set to 24C. Use inverter AC (saves 30-50%). Clean filters monthly.
Lighting: Switch to LED (80% savings). 10W LED = 60W incandescent.
Water heater: Solar heater saves 80%. Set electric to 55C. Use timer.
Standby: Disconnect devices not in use. Use power strips. TVs, chargers, routers consume power even when "off".
Golden target: Stay under 300 kWh/month to remain in Tier 1 (cheapest rate).` },

  { source: "savings_tips.md", section: "الطاقة الشمسية", content: `نظام الطاقة الشمسية المنزلي:
آلية صافي القياس (Net Billing): تبيع الفائض لشركة الكهرباء بـ 50 فلس/كيلوواط.
الحجم المناسب: 5.4 إلى 15 كيلوواط.
التكلفة: 1,500 إلى 3,000 دينار.
فترة الاسترداد: 4-6 سنوات.
يقلل الفاتورة 60-90%.` },

  // ── JEPCO Info ──
  { source: "jepco_faq.md", section: "معلومات جيبكو", content: `شركة توزيع الكهرباء الأردنية (جيبكو - JEPCO):
تخدم: عمان، الزرقاء، مادبا، السلط
رقم الطوارئ: 1220
خدمة العملاء: 1222 أو +962-6-4600-600
الموقع: services.jepco.com.jo
يمكنك تسجيل شكوى أو متابعة فاتورتك من خلال تطبيق جيبكو أو الموقع.` },

  { source: "jepco_faq.md", section: "طريقة الدفع", content: `طرق دفع فاتورة الكهرباء:
إي فواتيركم (eFAWATEERcom) — أونلاين أو من أي بنك
تطبيق جيبكو الرسمي
فروع جيبكو المنتشرة
البنوك ومكاتب البريد
محافظ إلكترونية (أورنج موني، زين كاش)
الدفع بالكاشير في المولات والسوبرماركت` },

  // ── Appliances ──
  { source: "appliance_profiles.md", section: "استهلاك الأجهزة", content: `تقديرات استهلاك الأجهزة المنزلية الشهرية:
مكيف (1.5 طن): 180-250 كيلوواط (42% من الاستهلاك النموذجي)
سخان مياه: 100-150 كيلوواط (15%)
ثلاجة: 30-50 كيلوواط (8%)
غسالة ملابس: 15-25 كيلوواط (4%)
تلفزيون: 10-15 كيلوواط (3%)
إضاءة: 20-40 كيلوواط (7%)
أجهزة ستاندباي: 10-20 كيلوواط (3%)
المعدل الوطني الأردني: 297 كيلوواط شهرياً` },

  // ── Environmental ──
  { source: "sector_overview.md", section: "البصمة البيئية", content: `البصمة البيئية للكهرباء في الأردن:
كل كيلوواط ساعة ينتج 0.6 كغم ثاني أكسيد الكربون (CO2).
كل كيلوواط ساعة يستهلك 2 لتر ماء في عملية التوليد.
شجرة واحدة تمتص حوالي 21 كغم CO2 سنوياً.
استهلاك 300 كيلوواط شهرياً = 180 كغم CO2 = تحتاج 9 أشجار سنوياً.
تقليل الاستهلاك 15% يوفر 27 كغم CO2 شهرياً.` },

  // ── Solar & Renewables (from Nawwar) ──
  { source: "solar.md", section: "Solar Net Billing", content: `Solar net billing in Jordan (Bylaw 58/2024):
Residential systems: max 5.4 kWp (single-phase), 15 kWp (three-phase).
Export compensation: 50 fils/kWh for residential, 40 fils/kWh for commercial.
Mechanisms: Net Billing (most common), Zero Export, Buy-All/Sell-All, Wheeling.
Typical ROI: 4-6 year payback. System life: 25+ years.
Monthly savings: 60-90% of electricity bill. A 5 kW system generates ~700 kWh/month.` },

  { source: "solar.md", section: "الطاقة الشمسية - صافي القياس", content: `نظام صافي القياس (صافي الفوترة) في الأردن (نظام 58/2024):
الأنظمة السكنية: حد أقصى 5.4 كيلوواط (أحادي الطور)، 15 كيلوواط (ثلاثي الطور).
تعويض التصدير: 50 فلس/كيلوواط للمنازل، 40 فلس/كيلوواط للتجاري.
الآليات: صافي الفوترة (الأكثر شيوعاً)، صفر تصدير، شراء الكل/بيع الكل.
فترة الاسترداد: 4-6 سنوات. عمر النظام: 25+ سنة.
نظام 5 كيلوواط ينتج حوالي 700 كيلوواط/شهر.` },

  // ── Other Tariff Sectors ──
  { source: "tariffs.md", section: "التعرفة التجارية والصناعية", content: `التعرفة التجارية:
الشريحة الأولى: 1-2000 كيلوواط بسعر 120 فلس/كيلوواط.
الشريحة الثانية: أكثر من 2000 كيلوواط بسعر 152 فلس/كيلوواط.

التعرفة الصناعية الصغيرة: 60/68 فلس للشريحتين.
التعرفة الصناعية المتوسطة (حسب وقت الاستخدام): ذروة 79 فلس، جزئي 69 فلس، خارج الذروة 59 فلس.
التعرفة الزراعية: 55 فلس نهاراً، 49 فلس ليلاً.
الفنادق: 82 فلس. المستشفيات: 140 فلس. شحن سيارات كهربائية: 103-160 فلس.` },

  { source: "tariffs.md", section: "Commercial and Industrial Tariffs", content: `Commercial tariff:
Tier 1 (1-2000 kWh): 120 fils/kWh. Tier 2 (2000+ kWh): 152 fils/kWh.

Industrial Small: 60/68 fils. Industrial Medium (TOU): Peak 79, Partial 69, Off-peak 59 fils.
Agricultural: 55 fils (day), 49 fils (night).
Hotels: 82 fils. Hospitals: 140 fils. EV charging: 103-160 fils.
Residential Unsubsidized: Tier 1 (1-1000 kWh): 120 fils. Tier 2 (1000+ kWh): 150 fils.` },

  // ── JEPCO Procedures ──
  { source: "jepco_faq.md", section: "إجراءات جيبكو", content: `إجراءات شائعة في جيبكو:
اشتراك جديد: هوية + ملكية/إيجار + رسم 5 دنانير. المدة: 3-7 أيام عمل.
فحص العداد: طلب من أي مركز. المدة: 7 أيام عمل. مجاناً لو العداد خطأ، 5 دنانير لو سليم.
نقل ملكية: هوية المالك الجديد + عقد بيع/إيجار + تسوية الرصيد السابق.
إعادة التوصيل (بعد الفصل): تسديد المبالغ المستحقة + رسم 5 دنانير.
الاعتراض على الفاتورة: تقديم اعتراض خطي في مركز الخدمة أو من خلال الموقع.` },

  { source: "jepco_faq.md", section: "JEPCO Procedures", content: `Common JEPCO procedures:
New connection: ID + proof of ownership/lease + 5 JD fee. Timeline: 3-7 business days.
Meter inspection: Request at any service center. Timeline: 7 business days. Free if meter is faulty, 5 JD if accurate.
Ownership transfer: New owner ID + sale/lease contract + settle previous balance.
Reconnection (after disconnection): Pay outstanding amount + 5 JD fee.
Bill dispute: Submit written objection at service center or via website.
EMRC escalation: If unresolved by JEPCO, file with EMRC at emrc.gov.jo.` },

  // ── EMRC Consumer Rights ──
  { source: "emrc.md", section: "حقوق المستهلك", content: `حقوق مستهلك الكهرباء في الأردن (هيئة تنظيم الطاقة EMRC):
الحق في فاتورة واضحة ومفصلة.
الحق في فحص العداد عند الشك بدقته.
الحق في الاعتراض على الفاتورة خلال 60 يوماً.
الحق في إعادة التوصيل خلال 24 ساعة من تسوية المستحقات.
الحق في التعويض عن انقطاع مطول (أكثر من 24 ساعة).
للتصعيد: هيئة تنظيم قطاع الطاقة والمعادن — emrc.gov.jo — هاتف: +962-6-5803060.` },

  // ── Sector Overview ──
  { source: "sector_overview.md", section: "قطاع الكهرباء الأردني", content: `قطاع الكهرباء في الأردن:
التوليد: شركة توليد الكهرباء المركزية (CEGCO)، شركات مستقلة (IPPs)، طاقة متجددة.
النقل: شركة الكهرباء الوطنية (NEPCO).
التوزيع: جيبكو (عمان، الزرقاء)، شركة كهرباء إربد (IDECO)، شركة توزيع الكهرباء (EDCO - الجنوب).
مزيج الطاقة: 65% غاز طبيعي، 26% طاقة متجددة (20% شمسي، 6% رياح)، 5% وقود ثقيل، 3% ديزل.
القدرة الإجمالية: حوالي 5,600 ميغاواط. الحمل الأقصى: حوالي 3,800 ميغاواط.` },

  // ── Water Heater Tips ──
  { source: "savings_tips.md", section: "نصائح سخان المياه", content: `سخان المياه الكهربائي يستهلك 100-150 كيلوواط شهرياً:
تركيب سخان شمسي يوفر 60-90% من تكلفة تسخين المياه. الاسترداد خلال 2-3 سنوات.
اضبط الحرارة على 55 درجة مئوية — أعلى من ذلك هدر للطاقة.
استخدم مؤقت (تايمر) لتشغيله ساعة قبل الاستحمام فقط.
اعزل أنابيب المياه الساخنة لتقليل فقدان الحرارة.` },

  { source: "savings_tips.md", section: "Water Heater Tips", content: `Electric water heater uses 100-150 kWh/month:
Solar water heater saves 60-90% on water heating. Payback: 2-3 years.
Set temperature to 55C — higher wastes energy.
Use a timer to run only 1 hour before bathing.
Insulate hot water pipes to reduce heat loss.` },

  // ── Subsidy Registration ──
  { source: "jepco_faq.md", section: "تسجيل الدعم", content: `منصة تسجيل دعم الكهرباء (kahraba.gov.jo):
التسجيل مطلوب للحصول على التعرفة المدعومة (50/100/200 فلس).
بدون تسجيل: تطبق التعرفة غير المدعومة (120/150 فلس) وهي أعلى بكثير.
المطلوب: الرقم الوطني أو جواز السفر.
التسجيل مجاني ومتاح أونلاين.` },
];

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const db = createServiceClient();

  // Check if already seeded
  const { count } = await db.from("knowledge_docs").select("*", { count: "exact", head: true });
  if ((count || 0) > 0) {
    return new Response(
      JSON.stringify({ message: `Already seeded (${count} docs). Delete first to re-seed.` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const results = [];
  for (const chunk of CHUNKS) {
    try {
      const embedding = await getEmbedding(chunk.content);
      const { error } = await db.from("knowledge_docs").insert({
        source_file: chunk.source,
        section_title: chunk.section,
        content: chunk.content,
        embedding,
      });
      results.push({ section: chunk.section, status: error ? "error" : "ok", error: error?.message });
    } catch (err) {
      results.push({ section: chunk.section, status: "error", error: String(err) });
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  return new Response(
    JSON.stringify({ message: `Seeded ${ok}/${CHUNKS.length} knowledge docs`, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
