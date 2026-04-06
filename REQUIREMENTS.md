# Diaa (ضياء) — Backend Requirements Specification

## 1. Overview

**App**: Diaa (ضياء) — Jordan electricity bill management app
**Frontend**: Expo/React Native (existing)
**Backend**: Supabase Cloud (free tier) — replacing NestJS
**Admin Portal**: Next.js web dashboard
**AI Providers**: OpenAI + Claude (user has API credits for both)
**Maps**: OpenStreetMap (free, no API key)
**Data Mode**: Hybrid — `LIVE` (real JEPCO APIs) or `DEMO` (generated fake data), ENV-level switch

---

## 2. Authentication

| Requirement | Detail |
|-------------|--------|
| Methods | Email/password + Google OAuth |
| Provider | Supabase Auth (built-in) |
| Tokens | Managed by Supabase (JWT) |
| Profile fields | name, email, phone, avatar_url, language (AR/EN) |

---

## 3. Subscription Management

- User links **one** JEPCO 13-digit file number (the `FileNumber` in JEPCO's system)
- Validated via JEPCO `CheckFileNumberinSAP` (LIVE) or accepted as-is (DEMO)
- Can change file number **once per month** — enforced via `file_number_changed_at` timestamp
- Fields: file_number, distribution_company (JEPCO/EDCO/IDECO), household_size

---

## 4. JEPCO Data Integration (Hybrid LIVE/DEMO)

### 4.1 Mode Switch

- Environment variable: `DATA_MODE=live` or `DATA_MODE=demo`
- Set as Supabase Edge Function secret
- DEMO generates realistic fake data matching JEPCO response shapes
- App cannot tell the difference — same response format

### 4.2 JEPCO API Proxy (LIVE mode)

Auth: `POST LoginController/Login` with app-level credentials → JWT (9-hour validity, cached + auto-refreshed)

| Edge Function | JEPCO Endpoint | Purpose |
|---------------|---------------|---------|
| `jepco-validate` | `CheckFileNumberinSAP` | Validate 13-digit file number |
| `jepco-smart-meter` | `Dashboard/SmartMeterDashboard` | Daily consumption / smart meter data |
| `jepco-bills` | `MobileBills/GetBills` | Historical bill list |
| `jepco-bill-header` | `CalculateBills/GetHeaderBills` | Bill summary/header |
| `jepco-statement` | `MobileBills/AccountStatement` | Payment history |
| `jepco-comparison` | `Dashboard/ComparazinConsumption` | Month-over-month comparison |
| `jepco-simulate` | `SimulateConsumptionCalculation/GetSimulateConsumptionCalculationByFileNumber` | What-if consumption calculator |

### 4.3 JEPCO Credentials

- Stored as Edge Function secrets — never exposed to client
- App-level auth (not per-user JEPCO accounts)
- JEPCO JWT cached, refreshed before 9-hour expiry

---

## 5. Bill Scanning (Camera OCR)

- Camera captures bill image
- Image sent to Edge Function → **OpenAI Vision or Claude Vision** extracts 13-digit file number
- Not full bill parsing — just digit extraction from the physical bill
- Extracted file number auto-populates subscription linking flow
- Fallback: user manually types the 13 digits

---

## 6. Analytics & Insights

All computed in Edge Functions from JEPCO data (LIVE) or generated (DEMO).

| Endpoint | Returns |
|----------|---------|
| Current usage | kWh consumed, cost in JD, tier progress, billing period |
| Usage trends | Monthly/quarterly/yearly trend with kWh + cost per period |
| Tier breakdown | kWh per tariff tier, rate per kWh, cost per tier, colors |
| Comparison | Current vs previous month: consumption, cost, avg cost/kWh |
| Insights | Cost/kWh, projected next bill, comparison to average |
| Appliance estimates | Estimated kWh per appliance (AC, heater, fridge, etc.) |
| Environmental impact | CO2 kg, trees needed, water liters, change from last month |

---

## 7. Complaints

- **Stored locally** in Supabase — NOT submitted to JEPCO
- User creates: type (OUTAGE, BILLING, METER, VOLTAGE, OTHER), description
- Status tracking: PENDING → IN_REVIEW → RESOLVED → CLOSED
- Admins manage status from admin portal
- User views their complaint history

---

## 8. Energy Friend (Report Bad Behavior)

- Report bad electrical behavior (illegal connections, tampering, etc.)
- Fields: category, description, **location** (auto-detected GPS)
- Map display using **OpenStreetMap** (Leaflet or react-native-maps with OSM tiles)
- Stored in Supabase for admin review

---

## 9. Outage Reporting

- Report power outage
- **Auto-detected location** via device GPS
- Map showing outage location (OpenStreetMap)
- Stored in Supabase, visible in admin portal

---

## 10. Notifications

| Type | Trigger | Detail |
|------|---------|--------|
| Automated | Usage thresholds | "You've used 80% of Tier 1", "Approaching Tier 3" |
| Manual | Admin portal | Employee sends to all users or filtered segments |

- Stored in `notifications` table
- Delivered via Supabase Realtime (live push to app)
- Unread count endpoint
- Mark as read / mark all as read

---

## 11. Chatbot — "Diaa Bot"

Adapted from Nawwar's AI engine (`/home/admin1/Nawwar/apps/ai_engine/`).

### 11.1 Capabilities

| Intent | Behavior |
|--------|----------|
| **Bill Q&A** | Answer questions about user's bill amount, due date, consumption, tiers |
| **Complaint creation** | Conversational flow → creates complaint on behalf of user |
| **Customer support** | Tariff info, savings tips, general electricity questions |
| **Greeting/general** | Friendly bilingual responses |

### 11.2 Technical

- **AI providers**: OpenAI (Vision, embeddings) + Claude (conversational, RAG)
- **Streaming responses** in Edge Functions to stay within timeout limits
- **Intent classification**: billing, complaint, tariff, savings, general
- **Bilingual**: Arabic + English (detect from user's language setting)
- **Conversation history**: stored per user in Supabase (session-based)
- **User context**: bot has access to user's JEPCO data for personalized answers

### 11.3 What to port from Nawwar

| Nawwar Component | Diaa Equivalent |
|-----------------|-----------------|
| `ai_engine/prompts/rag_prompts.py` | System prompts adapted for Diaa persona |
| `ai_engine/services/llm_service.py` | Edge Function with OpenAI/Claude clients |
| `ai_engine/services/rag_service.py` | Simplified RAG (no ChromaDB — use Supabase pgvector if needed) |
| `ai_engine/services/vision_service.py` | Bill OCR Edge Function |
| Intent classification logic | Keyword scoring adapted for Diaa |
| CrewAI multi-agent | **Not ported** — too heavy for Edge Functions |

---

## 12. Admin Portal (Next.js)

### 12.1 Design

- **Professional design** — clean, modern, not vibe-coded
- Separate web app from the Expo mobile app
- Deployed independently (Vercel or similar)

### 12.2 Features

| Feature | Detail |
|---------|--------|
| **Dashboard** | Total users, active subscriptions, complaints stats, outage count |
| **Notifications** | Compose + send to all users or filtered segments |
| **Complaints** | View list, filter by status/type, update status |
| **Outage reports** | View on OpenStreetMap map, details |
| **Energy friend reports** | View on map, details, status |
| **User management** | View users, their subscriptions, basic info |

### 12.3 Auth

- Separate admin login
- Supabase RLS with `role = 'admin'` check
- Admin users flagged in `profiles.role` column

---

## 13. Database Schema (Supabase Postgres)

### Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | Extends auth.users — name, phone, avatar, language, role | User sees own, admin sees all |
| `subscriptions` | JEPCO file number link | User sees own |
| `bills_cache` | Cached JEPCO bill data | User sees own |
| `complaints` | User complaints | User sees own, admin sees all |
| `energy_reports` | Energy friend bad behavior reports | User sees own, admin sees all |
| `outage_reports` | Outage reports with location | User sees own, admin sees all |
| `notifications` | Push notifications | User sees own, admin manages |
| `chat_sessions` | Chatbot conversation sessions | User sees own |
| `chat_messages` | Individual chat messages | User sees own |
| `app_settings` | User preferences | User sees own |

### Key Columns

**profiles**: id (FK auth.users), name, email, phone, avatar_url, language, role (user/admin), created_at

**subscriptions**: id, user_id, file_number (13 digits), distribution_company, household_size, is_active, file_number_changed_at, created_at

**complaints**: id, user_id, type (enum), description, status (enum), admin_notes, location_lat, location_lng, created_at, updated_at

**energy_reports**: id, user_id, category, description, location_lat, location_lng, address, status, created_at

**outage_reports**: id, user_id, description, location_lat, location_lng, address, status, created_at

**notifications**: id, user_id (nullable for broadcast), title, title_ar, body, body_ar, type (threshold/manual), is_read, created_at

**chat_sessions**: id, user_id, language, is_active, created_at

**chat_messages**: id, session_id, role (user/assistant), content, intent, created_at

---

## 14. Edge Functions Summary

| Function | Purpose | AI |
|----------|---------|-----|
| `jepco-auth` | Get/refresh JEPCO JWT | No |
| `jepco-validate` | Validate file number | No |
| `jepco-data` | Proxy all JEPCO data endpoints | No |
| `demo-data` | Generate fake JEPCO-shaped data | No |
| `analytics` | Compute insights from JEPCO data | No |
| `bill-ocr` | Extract 13 digits from bill photo | OpenAI Vision or Claude Vision |
| `chat` | Chatbot with streaming responses | OpenAI + Claude |
| `notify-threshold` | Check usage thresholds, create notifications | No |
| `admin-notify` | Send manual notifications from admin | No |

---

## 15. Non-Functional Requirements

| Requirement | Detail |
|-------------|--------|
| **Supabase free tier limits** | 500MB DB, 1GB storage, 50k auth users, 500k Edge Function invocations/month |
| **RLS on every table** | Users see only their own data, admins see all |
| **Bilingual** | All user-facing content in AR + EN |
| **DEMO parity** | DEMO mode responses identical in shape to LIVE |
| **Secrets management** | JEPCO creds + AI API keys as Edge Function secrets |
| **Streaming** | Chatbot uses streaming responses to stay within Edge Function timeouts |
| **Maps** | OpenStreetMap — no API key, completely free |

---

## 16. What to Set Up in Supabase

Before development begins, create a Supabase project and configure:

1. **Auth providers**: Email/password + Google OAuth
2. **Database**: Run migration SQL to create tables + RLS policies
3. **Edge Functions**: Deploy Deno functions
4. **Secrets**: `DATA_MODE`, `JEPCO_USERNAME`, `JEPCO_PASSWORD`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
5. **Realtime**: Enable on `notifications` table

---

## 17. Next Steps

1. `/sc:design` — Architecture design (Supabase schema, Edge Functions, admin portal structure)
2. `/sc:workflow` — Implementation plan with build sequence
3. Build database schema + RLS policies
4. Build Edge Functions (JEPCO proxy → analytics → chatbot)
5. Update Expo app to use Supabase client instead of NestJS API
6. Build Next.js admin portal
7. Adapt Nawwar chatbot prompts/logic for Diaa
