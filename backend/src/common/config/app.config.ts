export const appConfig = () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: process.env.JWT_SECRET || 'change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '24h',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    dailyBudgetUsd: parseFloat(process.env.AI_DAILY_BUDGET_USD || '5.0'),
    monthlyBudgetUsd: parseFloat(process.env.AI_MONTHLY_BUDGET_USD || '100.0'),
  },
});
