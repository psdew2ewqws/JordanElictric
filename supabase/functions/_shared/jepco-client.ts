/**
 * JEPCO API client — handles auth and endpoint calls.
 *
 * If JEPCO_PROXY_URL is set, routes all calls through a proxy server
 * (needed because Supabase edge functions can't reach JEPCO directly).
 * Otherwise calls JEPCO API directly.
 */

const JEPCO_BASE = Deno.env.get("JEPCO_API_BASE") || "";
const JEPCO_USER = Deno.env.get("JEPCO_USERNAME") || "";
const JEPCO_PASS = Deno.env.get("JEPCO_PASSWORD") || "";
const JEPCO_PROXY = Deno.env.get("JEPCO_PROXY_URL") || "";

// In-memory token cache (survives within warm edge function instance)
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 3600_000) {
    return cachedToken;
  }

  const loginUrl = JEPCO_PROXY
    ? `${JEPCO_PROXY}/jepco-login`
    : `${JEPCO_BASE}/LoginController/Login`;

  const res = await fetch(loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: JEPCO_USER, password: JEPCO_PASS }),
  });

  if (!res.ok) {
    throw new Error(`JEPCO auth failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.token || data.Token || data.access_token ||
    data.body?.token || data.body?.Token;
  if (!cachedToken) throw new Error("No token in JEPCO response");

  tokenExpiresAt = Date.now() + 9 * 3600_000;
  return cachedToken;
}

async function jepcoPost(endpoint: string, body: Record<string, unknown>) {
  const token = await getToken();

  const url = JEPCO_PROXY
    ? `${JEPCO_PROXY}/jepco-forward`
    : `${JEPCO_BASE}/${endpoint}`;

  const reqBody = JEPCO_PROXY
    ? { endpoint, body, token }
    : body;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!JEPCO_PROXY) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["Cookie"] = `AuthToken=${token}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(reqBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`JEPCO ${endpoint} failed: ${res.status} ${text}`);
  }

  return res.json();
}

// ─── Endpoint wrappers ─────────────────────────────────────

export async function fetchSmartMeter(fileNumber: string) {
  return jepcoPost("Dashboard/SmartMeterDashboard", {
    FileNumber: fileNumber,
    LanguageId: "AR",
  });
}

export async function fetchSapInfo(fileNumber: string) {
  return jepcoPost("CustomerInformationDetails/CheckFileNumberinSAP", {
    FileNumber: fileNumber,
    LanguageId: "AR",
    MobileNumber: "",
  });
}

export async function fetchBills(fileNumber: string) {
  return jepcoPost("MobileBills/GetBills", {
    FileNumber: fileNumber,
    LanguageId: "AR",
    MobileNumber: "",
  });
}

export async function fetchComparison(fileNumber: string) {
  return jepcoPost("Dashboard/ComparazinConsumption", {
    FileNumber: fileNumber,
    LanguageId: "AR",
  });
}

export async function fetchBillHeader(fileNumber: string) {
  return jepcoPost("CalculateBills/GetHeaderBills", {
    FileNumber: fileNumber,
    LanguageId: "AR",
  });
}

export async function fetchAccountStatement(fileNumber: string) {
  return jepcoPost("MobileBills/AccountStatement", {
    FileNumber: fileNumber,
    LanguageId: "AR",
    MobileNumber: "",
  });
}

export async function fetchSimulation(fileNumber: string) {
  return jepcoPost(
    "SimulateConsumptionCalculation/GetSimulateConsumptionCalculationByFileNumber",
    { FileNumber: fileNumber, LanguageId: "AR" }
  );
}

export async function validateFileNumber(fileNumber: string) {
  return fetchSapInfo(fileNumber);
}

// ─── Router ────────────────────────────────────────────────

export async function fetchJepcoData(
  endpoint: string,
  fileNumber: string
): Promise<unknown> {
  switch (endpoint) {
    case "smart_meter":
      return fetchSmartMeter(fileNumber);
    case "sap_info":
      return fetchSapInfo(fileNumber);
    case "bills":
      return fetchBills(fileNumber);
    case "comparison":
      return fetchComparison(fileNumber);
    case "bill_header":
      return fetchBillHeader(fileNumber);
    case "statement":
      return fetchAccountStatement(fileNumber);
    case "simulate":
      return fetchSimulation(fileNumber);
    default:
      throw new Error(`Unknown endpoint: ${endpoint}`);
  }
}
