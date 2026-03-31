import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_BASE = __DEV__
  ? Platform.OS === 'web'
    ? 'http://localhost:3002'
    : 'https://mighty-robin-7.loca.lt' // Tunneled backend for phone access
  : 'https://your-production-api.com';

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function storeTokens(access: string, refresh: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, access);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  }
}

async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(REFRESH_KEY);
  }
  return SecureStore.getItemAsync(REFRESH_KEY);
}

async function clearTokens(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  }
}

class ApiError extends Error {
  status: number;
  errors?: string[];

  constructor(message: string, status: number, errors?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (file uploads)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Try refresh
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = await getStoredToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      const retryResponse = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });
      if (!retryResponse.ok) {
        const err = await retryResponse.json().catch(() => ({}));
        throw new ApiError(err.message || 'Request failed', retryResponse.status, err.errors);
      }
      return retryResponse.json();
    }
    // Refresh failed — clear tokens
    await clearTokens();
    throw new ApiError('Session expired', 401);
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.message || 'Request failed', response.status, err.errors);
  }

  // Handle empty responses (204, etc.)
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    await storeTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// ─── Auth API ─────────────────────────────────────────────

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    request<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string; name: string; language: string; isVerified: boolean };
    }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string; name: string; language: string; isVerified: boolean };
    }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  google: (idToken: string) =>
    request<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string; name: string; language: string; isVerified: boolean };
    }>('/api/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),

  logout: async () => {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      await request('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    await clearTokens();
  },
};

// ─── User API ─────────────────────────────────────────────

export const userApi = {
  getMe: () =>
    request<{
      id: string;
      email: string;
      name: string;
      phone: string;
      avatarUrl: string | null;
      language: string;
      isVerified: boolean;
      createdAt: string;
    }>('/api/users/me'),

  updateMe: (data: { name?: string; phone?: string; language?: 'AR' | 'EN' }) =>
    request('/api/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Subscription API ─────────────────────────────────────

export const subscriptionApi = {
  create: (data: {
    subscriberNumber: string;
    distributionCompany: 'JEPCO' | 'IDECO' | 'EDCO';
    householdSize: number;
  }) =>
    request('/api/subscriptions', { method: 'POST', body: JSON.stringify(data) }),

  getMine: () => request<{
    id: string;
    subscriberNumber: string;
    distributionCompany: string;
    householdSize: number;
    isActive: boolean;
  }>('/api/subscriptions/me'),

  updateMine: (data: Partial<{
    subscriberNumber: string;
    distributionCompany: string;
    householdSize: number;
  }>) =>
    request('/api/subscriptions/me', { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Bill API ─────────────────────────────────────────────

export const billApi = {
  createManual: (data: {
    totalKwh: number;
    totalAmountFils: number;
    billingPeriodStart?: string;
    billingPeriodEnd?: string;
    previousReading?: number;
    currentReading?: number;
    fuelClauseFils?: number;
  }) =>
    request('/api/bills/manual', { method: 'POST', body: JSON.stringify(data) }),

  list: (limit = 12, offset = 0) =>
    request<{ bills: any[]; total: number }>(`/api/bills?limit=${limit}&offset=${offset}`),

  getById: (id: string) => request<any>(`/api/bills/${id}`),

  scanBill: async (imageUri: string) => {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'bill.jpg';
    formData.append('image', {
      uri: imageUri,
      name: filename,
      type: 'image/jpeg',
    } as any);

    return request<{ scanResult: any; bill: any }>('/api/ai/scan-bill', {
      method: 'POST',
      body: formData,
    });
  },
};

// ─── Tariff API ───────────────────────────────────────────

export const tariffApi = {
  getTiers: (sector?: string) =>
    request<any[]>(`/api/tariffs/tiers${sector ? `?sector=${sector}` : ''}`),

  calculate: (kwh: number, sector?: string) =>
    request<any>(`/api/tariffs/calculate?kwh=${kwh}${sector ? `&sector=${sector}` : ''}`),
};

// ─── Analytics API ────────────────────────────────────────

export const analyticsApi = {
  getCurrentUsage: () => request<{
    currentKwh: number;
    currentAmountJd: number;
    tierProgress: { tier: number; percentage: number; label: string };
    billingPeriod: { start: string; end: string; dueDate: string } | null;
  }>('/api/analytics/current-usage'),

  getUsageTrends: (period: 'monthly' | 'quarterly' | 'yearly' = 'monthly') =>
    request<{ trend: { date: string; kwh: number; costJd: number }[]; average: number }>(
      `/api/analytics/usage?period=${period}`,
    ),

  getTierBreakdown: () => request<{
    totalKwh: number;
    tiers: { category: string; label: string; kwh: number; ratePerKwh: number; amountFils: number; costJd: number; color: string }[];
    totalEnergyChargeFils: number;
  }>('/api/analytics/tier-breakdown'),

  getComparison: () => request<{
    consumption: { current: number; previous: number; diff: number; percentChange: number };
    cost: { currentJd: number; previousJd: number; diffJd: number; percentChange: number };
    avgCost: { currentFils: number; previousFils: number };
  } | null>('/api/analytics/comparison'),

  getInsights: () => request<{
    costPerKwh: number;
    projectedNextBillJd: number;
    comparisonToAverage: number;
    peakOffPeakSplit: { peak: number; offPeak: number };
    applianceEstimates: { name: string; nameAr: string; icon: string; estimatedKwh: number; percentage: number }[];
    environmentalImpact: { co2Kg: number; treesNeeded: number; waterLiters: number; co2ChangeFromLastMonth: number };
  }>('/api/analytics/insights'),
};

// ─── Notification API ─────────────────────────────────────

export const notificationApi = {
  list: (limit = 20) => request<any[]>(`/api/notifications?limit=${limit}`),
  getUnreadCount: () => request<{ count: number }>('/api/notifications/unread-count'),
  markRead: (id: string) => request(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request('/api/notifications/read-all', { method: 'PATCH' }),
};

// ─── Exports ──────────────────────────────────────────────

export { storeTokens, clearTokens, getStoredToken, ApiError, API_BASE };
