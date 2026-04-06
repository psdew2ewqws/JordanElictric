import { Controller, Post, Body, Logger } from '@nestjs/common';

const JEPCO_BASE = 'https://mobile.jepco.com.jo:443/JepcoBackendSystemPRD';

const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Origin: 'https://services.jepco.com.jo',
  Referer: 'https://services.jepco.com.jo/',
};

@Controller()
export class JepcoProxyController {
  private readonly logger = new Logger(JepcoProxyController.name);

  @Post('jepco-login')
  async login(@Body() body: { username: string; password: string }) {
    try {
      const res = await fetch(`${JEPCO_BASE}/LoginController/Login`, {
        method: 'POST',
        headers: COMMON_HEADERS,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        return { error: `JEPCO login failed: ${res.status}` };
      }

      return res.json();
    } catch (err) {
      this.logger.error(`JEPCO login proxy error: ${err}`);
      return { error: String(err) };
    }
  }

  @Post('jepco-forward')
  async forward(@Body() body: { endpoint: string; body: Record<string, unknown>; token: string }) {
    try {
      const res = await fetch(`${JEPCO_BASE}/${body.endpoint}`, {
        method: 'POST',
        headers: {
          ...COMMON_HEADERS,
          Authorization: `Bearer ${body.token}`,
          Cookie: `AuthToken=${body.token}`,
        },
        body: JSON.stringify(body.body),
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        const text = await res.text();
        return { error: `JEPCO ${body.endpoint} failed: ${res.status}`, details: text };
      }

      return res.json();
    } catch (err) {
      this.logger.error(`JEPCO forward proxy error: ${err}`);
      return { error: String(err) };
    }
  }
}
