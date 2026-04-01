import { Injectable, Logger } from '@nestjs/common';

const BASE_URL = 'https://mobile.jepco.com.jo:443/JepcoBackendSystemPRD';

const LOGIN_BODY = {
  username: 'JepcoMobileApp',
  password: 'Mobile@jepco@123',
};

const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Origin: 'https://services.jepco.com.jo',
  Referer: 'https://services.jepco.com.jo/',
};

// Token lifetime: refresh 30 min before 9h expiry
const TOKEN_TTL_MS = (8 * 3600 + 30 * 60) * 1000; // 8h30m

@Injectable()
export class JepcoClient {
  private readonly logger = new Logger(JepcoClient.name);
  private token: string | null = null;
  private tokenExpiresAt = 0;

  /**
   * Get a valid JWT token, using cache if still fresh.
   */
  async getToken(): Promise<string | null> {
    const now = Date.now();
    if (this.token && now < this.tokenExpiresAt) {
      return this.token;
    }

    try {
      const res = await fetch(`${BASE_URL}/LoginController/Login`, {
        method: 'POST',
        headers: COMMON_HEADERS,
        body: JSON.stringify(LOGIN_BODY),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        this.logger.error(`JEPCO login failed: ${res.status}`);
        return null;
      }

      const data = await res.json();
      // JEPCO returns: { statusCode: "Success", body: { token: "..." } }
      const token = data?.body?.token || data?.body?.Token || data?.token || data?.Token || null;

      if (token) {
        this.token = token;
        this.tokenExpiresAt = now + TOKEN_TTL_MS;
        this.logger.log('JEPCO JWT obtained (expires in ~8.5h)');
        return token;
      }

      this.logger.error(`JEPCO login: no token found. Keys: ${JSON.stringify(Object.keys(data || {}))}`);
      return null;
    } catch (err) {
      this.logger.error(`JEPCO login error: ${err}`);
      return null;
    }
  }

  /**
   * Make an authenticated POST call to a JEPCO endpoint.
   */
  private async authedPost(
    endpoint: string,
    body: Record<string, unknown>,
    timeout = 20000,
    isRetry = false,
  ): Promise<any | null> {
    const token = await this.getToken();
    if (!token) return null;

    const url = `${BASE_URL}/${endpoint}`;
    const headers: Record<string, string> = {
      ...COMMON_HEADERS,
      Authorization: `Bearer ${token}`,
      Cookie: `AuthToken=${token}`,
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout),
      });

      // On 401, invalidate cached token and retry once
      if (res.status === 401 && !isRetry) {
        this.logger.warn(`JEPCO ${endpoint} got 401 — refreshing token`);
        this.token = null;
        this.tokenExpiresAt = 0;
        return this.authedPost(endpoint, body, timeout, true);
      }

      if (!res.ok) {
        this.logger.warn(`JEPCO ${endpoint} HTTP ${res.status}`);
        return null;
      }

      const data = await res.json();

      if (data?.statusCode === 'Success') {
        return data.body;
      }

      this.logger.warn(`JEPCO ${endpoint} non-success: ${data?.message ?? 'unknown'}`);
      return null;
    } catch (err) {
      this.logger.warn(`JEPCO ${endpoint} failed: ${err}`);
      return null;
    }
  }

  // ─── Public API ───────────────────────────────────────────

  /**
   * Fetch real-time smart meter dashboard data (daily consumption, projections).
   */
  async fetchSmartMeter(fileNumber: string) {
    return this.authedPost('Dashboard/SmartMeterDashboard', {
      FileNumber: fileNumber,
      LanguageId: 'AR',
    });
  }

  /**
   * Fetch billing history with full bill details and meter readings.
   */
  async fetchBills(fileNumber: string) {
    return this.authedPost('MobileBills/GetBills', {
      FileNumber: fileNumber,
      LanguageId: 'AR',
      MobileNumber: '',
    });
  }

  /**
   * Validate file number in SAP — returns subscriber name, meter, tariff, office.
   */
  async fetchSapInfo(fileNumber: string) {
    const data = await this.authedPost(
      'CustomerInformationDetails/CheckFileNumberinSAP',
      { FileNumber: fileNumber, LanguageId: 'AR', MobileNumber: '' },
    );
    // Returns a list — take first entry
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }
    return data;
  }

  /**
   * Compare current month vs last month vs same month last year.
   */
  async fetchComparison(fileNumber: string) {
    return this.authedPost('Dashboard/ComparazinConsumption', {
      FileNumber: fileNumber,
      LanguageId: 'AR',
    });
  }

  /**
   * Fetch bill header info (subscription, meter, readings, next read date).
   */
  async fetchBillHeader(fileNumber: string) {
    const data = await this.authedPost('CalculateBills/GetHeaderBills', {
      FileNumber: fileNumber,
      LanguageId: 'AR',
    });
    if (typeof data === 'object' && data?.billsHeader) {
      return data.billsHeader;
    }
    return data;
  }

  /**
   * Fetch account statement with payment history.
   */
  async fetchAccountStatement(fileNumber: string) {
    return this.authedPost('MobileBills/AccountStatement', {
      FileNumber: fileNumber,
      LanguageId: 'AR',
      MobileNumber: '',
    });
  }

  /**
   * Fetch ALL available data for a file number in parallel.
   */
  async fetchAllData(fileNumber: string) {
    // Ensure token is ready before parallel calls
    await this.getToken();

    const [smartMeter, sapInfo, bills, accountStatement, comparison, billHeader] =
      await Promise.allSettled([
        this.fetchSmartMeter(fileNumber),
        this.fetchSapInfo(fileNumber),
        this.fetchBills(fileNumber),
        this.fetchAccountStatement(fileNumber),
        this.fetchComparison(fileNumber),
        this.fetchBillHeader(fileNumber),
      ]);

    const extract = (r: PromiseSettledResult<any>) =>
      r.status === 'fulfilled' ? r.value : null;

    const result = {
      smartMeter: extract(smartMeter),
      sapInfo: extract(sapInfo),
      bills: extract(bills),
      accountStatement: extract(accountStatement),
      comparison: extract(comparison),
      billHeader: extract(billHeader),
    };

    const succeeded = Object.values(result).filter(Boolean).length;
    this.logger.log(
      `JEPCO fetchAllData for ${fileNumber}: ${succeeded}/${Object.keys(result).length} succeeded`,
    );

    return result;
  }
}
