/**
 * API layer — thin wrapper over Supabase.
 *
 * Keeps the same function signatures as the old NestJS API so screens
 * need zero import changes. Under the hood, everything goes through
 * Supabase Auth, DB, and Edge Functions.
 */

import { supabase, callEdgeFunction } from './supabase';

// ─── Cached auth helper (avoids network call on every API request) ──
let _cachedUserId: string | null = null;
let _cachedUserIdExpiry = 0;

async function getCachedUserId(): Promise<string> {
  const now = Date.now();
  if (_cachedUserId && now < _cachedUserIdExpiry) return _cachedUserId;

  // Try session first (local, no network call)
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) {
    _cachedUserId = session.user.id;
    _cachedUserIdExpiry = now + 5 * 60 * 1000; // cache 5 min
    return _cachedUserId;
  }

  throw new ApiError('Not authenticated', 401);
}

// Clear cache on sign out
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    _cachedUserId = null;
    _cachedUserIdExpiry = 0;
  }
});

// ─── Error class (kept for backward compat) ──────────────
export class ApiError extends Error {
  status: number;
  errors?: string[];
  constructor(message: string, status: number, errors?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

// ─── Auth API (now delegates to Supabase Auth) ───────────
// Note: login/register/logout are handled by AuthContext directly.
// These are kept as no-ops for any legacy imports.
export const authApi = {
  login: async (_data: { email: string; password: string }) => {
    throw new Error('Use useAuth().login() instead');
  },
  register: async (_data: { name: string; email: string; password: string }) => {
    throw new Error('Use useAuth().register() instead');
  },
  google: async (_idToken: string) => {
    throw new Error('Google auth not yet implemented');
  },
  logout: async () => {
    await supabase.auth.signOut();
  },
};

// ─── User API ────────────────────────────────────────────
export const userApi = {
  getMe: async () => {
    const userId = await getCachedUserId();
    const user = { id: userId };
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw new ApiError(error.message, 500);
    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      phone: profile.phone || '',
      avatarUrl: profile.avatar_url,
      language: profile.language,
      isVerified: profile.is_verified,
      createdAt: profile.created_at,
    };
  },
  updateMe: async (data: { name?: string; phone?: string; language?: 'AR' | 'EN' }) => {
    const userId = await getCachedUserId();
    const user = { id: userId };
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id);
    if (error) throw new ApiError(error.message, 500);
  },
};

// ─── Subscription API ────────────────────────────────────
export const subscriptionApi = {
  create: async (data: {
    subscriberNumber: string;
    distributionCompany: 'JEPCO' | 'IDECO' | 'EDCO';
    householdSize: number;
  }) => {
    const userId = await getCachedUserId();
    const user = { id: userId };
    const { data: sub, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        file_number: data.subscriberNumber,
        distribution_company: data.distributionCompany,
        household_size: data.householdSize,
      })
      .select()
      .single();
    if (error) throw new ApiError(error.message, 500);
    return {
      id: sub.id,
      subscriberNumber: sub.file_number,
      distributionCompany: sub.distribution_company,
      householdSize: sub.household_size,
      isActive: sub.is_active,
    };
  },
  getMine: async () => {
    const userId = await getCachedUserId();
    const user = { id: userId };
    const { data: sub, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (error || !sub) throw new ApiError('No subscription found', 404);
    return {
      id: sub.id,
      subscriberNumber: sub.file_number,
      distributionCompany: sub.distribution_company,
      householdSize: sub.household_size,
      isActive: sub.is_active,
    };
  },
  updateMine: async (data: Partial<{
    subscriberNumber: string;
    distributionCompany: string;
    householdSize: number;
  }>) => {
    const userId = await getCachedUserId();
    const user = { id: userId };
    const updates: Record<string, unknown> = {};
    if (data.subscriberNumber !== undefined) updates.file_number = data.subscriberNumber;
    if (data.distributionCompany !== undefined) updates.distribution_company = data.distributionCompany;
    if (data.householdSize !== undefined) updates.household_size = data.householdSize;
    const { error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('user_id', user.id);
    if (error) throw new ApiError(error.message, 500);
  },
};

// ─── Bill API ────────────────────────────────────────────
export const billApi = {
  createManual: async (data: {
    totalKwh: number;
    totalAmountFils: number;
    billingPeriodStart?: string;
    billingPeriodEnd?: string;
    previousReading?: number;
    currentReading?: number;
    fuelClauseFils?: number;
  }) => {
    const userId = await getCachedUserId();
    const user = { id: userId };
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!sub) throw new ApiError('No subscription', 404);

    const { data: bill, error } = await supabase
      .from('bills_cache')
      .insert({
        subscription_id: sub.id,
        source: 'manual',
        total_kwh: data.totalKwh,
        total_amount_fils: data.totalAmountFils,
        billing_period_start: data.billingPeriodStart,
        billing_period_end: data.billingPeriodEnd,
        previous_reading: data.previousReading,
        current_reading: data.currentReading,
        fuel_clause_fils: data.fuelClauseFils || 0,
      })
      .select('id')
      .single();
    if (error) throw new ApiError(error.message, 500);
    return { id: bill.id };
  },

  list: async (limit = 12, offset = 0) => {
    const userId = await getCachedUserId();
    const user = { id: userId };

    let sub: { id: string } | null = null;
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!error) sub = data;
    } catch {
      // No subscription found — return empty
    }
    if (!sub) return { bills: [], total: 0 };

    const { data: bills, error, count } = await supabase
      .from('bills_cache')
      .select('*', { count: 'exact' })
      .eq('subscription_id', sub.id)
      .order('billing_period_end', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new ApiError(error.message, 500);
    return {
      bills: (bills || []).map(mapBill),
      total: count || 0,
    };
  },

  getById: async (id: string) => {
    const { data: bill, error } = await supabase
      .from('bills_cache')
      .select('*, bill_line_items(*)')
      .eq('id', id)
      .single();
    if (error) throw new ApiError(error.message, 404);
    return mapBillDetail(bill);
  },

  scanBill: async (imageUri: string) => {
    // Will be implemented when bill-ocr edge function is ready
    throw new ApiError('Bill scanning not yet available', 501);
  },
};

function mapBill(b: any) {
  return {
    id: b.id,
    billingPeriodStart: b.billing_period_start,
    billingPeriodEnd: b.billing_period_end,
    totalAmount: Number(b.total_amount_fils),
    totalKwh: Number(b.total_kwh),
    source: b.source?.toUpperCase(),
    createdAt: b.created_at,
  };
}

function mapBillDetail(b: any) {
  return {
    id: b.id,
    billingPeriodStart: b.billing_period_start,
    billingPeriodEnd: b.billing_period_end,
    totalAmountFils: Number(b.total_amount_fils),
    totalKwh: Number(b.total_kwh),
    source: b.source?.toUpperCase(),
    previousReading: b.previous_reading,
    currentReading: b.current_reading,
    lineItems: (b.bill_line_items || []).map((li: any) => ({
      id: li.id,
      category: li.category,
      label: li.label,
      labelAr: li.label_ar,
      amountFils: Number(li.amount_fils),
      kwh: li.kwh ? Number(li.kwh) : undefined,
      ratePerKwh: li.rate_per_kwh ? Number(li.rate_per_kwh) : undefined,
    })),
    createdAt: b.created_at,
  };
}

// ─── Notification API ────────────────────────────────────
export const notificationApi = {
  list: async (limit = 20) => {
    let userId: string;
    try { userId = await getCachedUserId(); } catch { return []; }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  },

  getUnreadCount: async () => {
    let userId: string;
    try { userId = await getCachedUserId(); } catch { return { count: 0 }; }
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq('is_read', false);
    return { count: count || 0 };
  },

  markRead: async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  },

  markAllRead: async () => {
    let userId: string;
    try { userId = await getCachedUserId(); } catch { return; }
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  },
};

// ─── Complaint API ───────────────────────────────────────
export const complaintApi = {
  create: async (data: {
    complaintType: 'OUTAGE' | 'BILLING' | 'METER' | 'VOLTAGE' | 'OTHER';
    description: string;
    descriptionAr?: string;
  }) => {
    const userId = await getCachedUserId();
    const user = { id: userId };
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const { data: complaint, error } = await supabase
      .from('complaints')
      .insert({
        user_id: user.id,
        subscription_id: sub?.id || null,
        complaint_type: data.complaintType,
        description: data.description,
        description_ar: data.descriptionAr,
      })
      .select()
      .single();
    if (error) throw new ApiError(error.message, 500);
    return complaint;
  },

  list: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from('complaints')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    return (data || []).map((c) => ({
      id: c.id,
      referenceNumber: c.reference_number,
      complaintType: c.complaint_type,
      status: c.status,
      description: c.description,
      createdAt: c.created_at,
    }));
  },
};

// ─── JEPCO API (via Edge Functions) ──────────────────────
export const jepcoApi = {
  getSmartMeter: () =>
    callEdgeFunction<{ fileNumber: string; data: any }>('jepco-proxy', { action: 'smart_meter' }),
  getBills: () =>
    callEdgeFunction<{ fileNumber: string; data: any }>('jepco-proxy', { action: 'bills' }),
  getSubscriberInfo: () =>
    callEdgeFunction<{ fileNumber: string; data: any }>('jepco-proxy', { action: 'sap_info' }),
  getComparison: () =>
    callEdgeFunction<{ fileNumber: string; data: any }>('jepco-proxy', { action: 'comparison' }),
  getBillHeader: () =>
    callEdgeFunction<{ fileNumber: string; data: any }>('jepco-proxy', { action: 'bill_header' }),
  getAccountStatement: () =>
    callEdgeFunction<{ fileNumber: string; data: any }>('jepco-proxy', { action: 'statement' }),
  getAccountSummary: async () => {
    // Fetch smart_meter which contains comparison data inline
    const sm = await callEdgeFunction<{ fileNumber: string; data: any }>('jepco-proxy', { action: 'smart_meter' });
    return {
      fileNumber: sm.fileNumber,
      smartMeter: sm.data,
      sapInfo: null,
      bills: null,
      accountStatement: null,
      comparison: sm.data?.comparazinConsumption || null,
      billHeader: null,
    };
  },
};

// ─── Analytics API (via Edge Functions) ──────────────────
export const analyticsApi = {
  getCurrentUsage: () =>
    callEdgeFunction<any>('analytics-engine', { action: 'current_usage' }),
  getUsageTrends: (period: string = 'monthly') =>
    callEdgeFunction<any>('analytics-engine', { action: 'trends' }),
  getTierBreakdown: () =>
    callEdgeFunction<any>('analytics-engine', { action: 'tier_breakdown' }),
  getComparison: () =>
    callEdgeFunction<any>('analytics-engine', { action: 'comparison' }),
  getInsights: () =>
    callEdgeFunction<any>('analytics-engine', { action: 'footprint' }),
  refresh: () =>
    callEdgeFunction<any>('analytics-engine', { action: 'refresh' }),
};

// ─── Tariff API (pure client-side computation) ───────────
export const tariffApi = {
  getTiers: async (_sector?: string) => {
    return [
      { tier: 1, minKwh: 0, maxKwh: 300, ratePerKwh: 50, label: 'Tier 1', labelAr: 'الشريحة الأولى', type: 'subsidized' },
      { tier: 2, minKwh: 301, maxKwh: 600, ratePerKwh: 100, label: 'Tier 2', labelAr: 'الشريحة الثانية', type: 'subsidized' },
      { tier: 3, minKwh: 601, maxKwh: 999999, ratePerKwh: 200, label: 'Tier 3', labelAr: 'الشريحة الثالثة', type: 'non_subsidized' },
    ];
  },
  calculate: async (kwh: number, _sector?: string) => {
    const t1 = Math.min(kwh, 300);
    const t2 = Math.min(Math.max(kwh - 300, 0), 300);
    const t3 = Math.max(kwh - 600, 0);
    return {
      tier1: { kwh: t1, cost: t1 * 50 },
      tier2: { kwh: t2, cost: t2 * 100 },
      tier3: { kwh: t3, cost: t3 * 200 },
      totalFils: t1 * 50 + t2 * 100 + t3 * 200,
    };
  },
};

// ─── Legacy exports (for any remaining imports) ──────────
export const storeTokens = async () => {};
export const clearTokens = async () => {};
export const getStoredToken = async () => null;
export const API_BASE = '';
