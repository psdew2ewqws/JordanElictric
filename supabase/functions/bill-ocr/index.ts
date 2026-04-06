import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getUserId } from "../_shared/supabase.ts";

interface OcrRequestBody {
  image_base64: string;
  mime_type?: string;
}

interface ExtractedData {
  file_number: string | null;
  consumption_kwh: number | null;
  total_amount: number | null;
  billing_period: string | null;
  meter_number: string | null;
  customer_name: string | null;
}

interface OcrResponse {
  file_number: string | null;
  extracted_data: ExtractedData;
  validated: boolean;
}

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const EXTRACTION_PROMPT = `You are a JEPCO (Jordan Electric Power Company) bill reader. Analyze this electricity bill image and extract the following fields.

CRITICAL — File Number (رقم الملف / رقم المرجع):
- This is a 13-digit number in the format: 01/XXXXX/XXXXXX (where X is a digit)
- It always starts with "01" (the distribution company code for JEPCO)
- Strip ALL slashes and return only the 13 digits (e.g., "01/12345/678901" becomes "0112345678901")
- Look for labels like: رقم الملف, رقم المرجع, File No, Reference No, Subscription No
- The number may appear with or without slashes on the bill

Also extract if visible:
- consumption_kwh: Total electricity consumption in kWh (الاستهلاك بالكيلوواط)
- total_amount: Total bill amount in JOD (المبلغ الإجمالي) — return as a number, e.g. 45.80
- billing_period: The billing period dates if shown (e.g. "01/01/2025 - 31/01/2025")
- meter_number: The meter/counter number (رقم العداد)
- customer_name: Customer name (اسم المشترك)

Return a JSON object with these exact keys. Use null for any field you cannot find.`;

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    // Authenticate the user
    await getUserId(req);

    // Parse request body
    const body: OcrRequestBody = await req.json();
    const { image_base64, mime_type = "image/jpeg" } = body;

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: "image_base64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate mime type
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedMimes.includes(mime_type)) {
      return new Response(
        JSON.stringify({ error: `Unsupported mime type: ${mime_type}. Use one of: ${allowedMimes.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get OpenAI API key
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the data URI for the image
    const imageUrl = `data:${mime_type};base64,${image_base64}`;

    // Call OpenAI Vision API (GPT-4o) with JSON response format
    const openaiRes = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content: EXTRACTION_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high",
                },
              },
              {
                type: "text",
                text: "Extract the file number and all visible fields from this JEPCO electricity bill. Return JSON.",
              },
            ],
          },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text();
      console.error("OpenAI API error:", openaiRes.status, errBody);
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${openaiRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiRes.json();
    const rawContent = openaiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      return new Response(
        JSON.stringify({ error: "No response from OpenAI Vision" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response from GPT-4o
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse OpenAI response:", rawContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse OCR result" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize the file number: strip slashes, validate 13 digits starting with 01
    let fileNumber: string | null = null;
    const rawFileNumber = parsed.file_number as string | null;
    if (rawFileNumber) {
      const cleaned = rawFileNumber.replace(/[\/\-\s]/g, "");
      if (/^01\d{11}$/.test(cleaned)) {
        fileNumber = cleaned;
      }
    }

    // Build extracted data
    const extractedData: ExtractedData = {
      file_number: fileNumber,
      consumption_kwh: typeof parsed.consumption_kwh === "number" ? parsed.consumption_kwh : null,
      total_amount: typeof parsed.total_amount === "number" ? parsed.total_amount : null,
      billing_period: typeof parsed.billing_period === "string" ? parsed.billing_period : null,
      meter_number: typeof parsed.meter_number === "string" ? parsed.meter_number : null,
      customer_name: typeof parsed.customer_name === "string" ? parsed.customer_name : null,
    };

    // Validated = file number found and matches expected format
    const validated = fileNumber !== null;

    const response: OcrResponse = {
      file_number: fileNumber,
      extracted_data: extractedData,
      validated,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    const status = msg === "Unauthorized" ? 401 : 500;
    console.error("bill-ocr error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
