import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://pehberdmrsnaeqtlopbq.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_4scYTjZPs8EVA8hE7TUXBA_Zfk9vMie";

// Custom storage adapter for React Native (SecureStore on native, localStorage on web)
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // not needed for React Native
  },
});

// ─── Edge Function caller ──────────────────────────────────

export async function callEdgeFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) {
    throw new Error(error.message || `Edge function ${functionName} failed`);
  }

  return data as T;
}

// ─── Typed API wrappers ────────────────────────────────────

export const jepcoProxy = {
  smartMeter: () =>
    callEdgeFunction<{ fileNumber: string; data: unknown; source: string }>(
      "jepco-proxy",
      { action: "smart_meter" }
    ),
  bills: () =>
    callEdgeFunction<{ fileNumber: string; data: unknown; source: string }>(
      "jepco-proxy",
      { action: "bills" }
    ),
  comparison: () =>
    callEdgeFunction<{ fileNumber: string; data: unknown; source: string }>(
      "jepco-proxy",
      { action: "comparison" }
    ),
  billHeader: () =>
    callEdgeFunction<{ fileNumber: string; data: unknown; source: string }>(
      "jepco-proxy",
      { action: "bill_header" }
    ),
  statement: () =>
    callEdgeFunction<{ fileNumber: string; data: unknown; source: string }>(
      "jepco-proxy",
      { action: "statement" }
    ),
  validate: () =>
    callEdgeFunction<{ fileNumber: string; data: unknown; source: string }>(
      "jepco-proxy",
      { action: "sap_info" }
    ),
  simulate: () =>
    callEdgeFunction<{ fileNumber: string; data: unknown; source: string }>(
      "jepco-proxy",
      { action: "simulate" }
    ),
  refresh: (endpoint: string) =>
    callEdgeFunction<{ fileNumber: string; data: unknown; source: string }>(
      "jepco-proxy",
      { action: endpoint, force_refresh: true }
    ),
};

export const analyticsEngine = {
  currentUsage: () =>
    callEdgeFunction("analytics-engine", { action: "current_usage" }),
  trends: () =>
    callEdgeFunction("analytics-engine", { action: "trends" }),
  tierBreakdown: () =>
    callEdgeFunction("analytics-engine", { action: "tier_breakdown" }),
  comparison: () =>
    callEdgeFunction("analytics-engine", { action: "comparison" }),
  footprint: () =>
    callEdgeFunction("analytics-engine", { action: "footprint" }),
  billBreakdown: (kwh: number) =>
    callEdgeFunction("analytics-engine", { action: "bill_breakdown", kwh }),
  refresh: () =>
    callEdgeFunction("analytics-engine", { action: "refresh" }),
};
