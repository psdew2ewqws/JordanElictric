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
