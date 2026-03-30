# JordanElectricity — Design Specification

**Date:** 2026-03-30
**Status:** Approved
**Initiative:** CPA Jordan Consumer Electricity Intelligence App
**Reference:** Saudi Energy (SE) app as UI inspiration

---

## 1. Problem Statement

Jordanian electricity consumers receive paper bills from JEPCO, EDCO, or IDECO that are difficult to understand. The progressive tariff system (3 tiers at 50, 100, and 200 fils/kWh for subsidized residential), fuel clause adjustments, rural electrification fees, and various taxes make bills opaque. Consumers don't know why their bill is what it is, how they compare to similar households, or how to reduce costs.

**Goal:** Build a mobile app under CPA Jordan that turns electricity bills into clear, actionable consumer intelligence — making every Jordanian understand their bill like a fitness tracker understands their steps.

---

## 2. Target User

- Jordanian residential electricity consumers (all ages, tech levels)
- Subscribers across JEPCO (64%, central/Amman), IDECO (23%, north/Irbid), EDCO (13%, south/Aqaba)
- Both subsidized and non-subsidized households
- Arabic and English speakers

**Key constraint:** Everyday users, not tech-savvy. UI must be simple, visual, and self-explanatory.

---

## 3. Architecture

### 3.1 Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | Expo SDK 54 + React Native + TypeScript |
| Navigation | expo-router (file-based routing) |
| Backend | NestJS (TypeScript monolith) |
| Database | PostgreSQL |
| OCR | OpenAI GPT-4o Vision API |
| Auth | JWT (access + refresh tokens) |
| Cache | Redis (optional, for tariff lookups + rate limiting) |

### 3.2 Backend Modules (NestJS)

1. **Auth** — Email/password registration, JWT tokens, subscriber number linking
2. **Bills** — Bill CRUD, line item storage, history, source tracking (scan vs manual)
3. **OCR** — Photo upload, GPT-4o Vision extraction, structured field parsing, validation
4. **Analytics** — KPI computation, trends, projections, comparisons, appliance estimates
5. **Tariffs** — EMRC tariff tables (subsidized/non-subsidized residential, commercial, industrial), fuel clause rates, Time-of-Use periods
6. **Optimizer** — ToU shifting recommendations, tier optimization, savings calculations, solar ROI
7. **Notifications** — Bill due reminders, usage spike alerts, monthly savings reports

### 3.3 Data Flow

**Scan path:** User takes photo → OCR Module (GPT-4o Vision) → Extract structured fields → Tariffs Module validates tiers → Bills Module stores → Analytics computes KPIs → Optimizer finds savings → User sees full breakdown

**Manual path:** User enters kWh + amount → Bills Module stores → Analytics computes KPIs → Optimizer finds savings → User sees full breakdown

Both paths produce identical output. The scan path adds AI extraction; the manual path skips it.

---

## 4. Data Model

### 4.1 User
- id, email, passwordHash, name
- subscriberNumber (one per user)
- distributionCompany: JEPCO | EDCO | IDECO
- householdSize
- language: ar | en
- createdAt, updatedAt

### 4.2 Bill
- id, userId, subscriberNumber
- billingPeriodStart, billingPeriodEnd, dueDate
- totalAmount (JD), totalKwh
- source: scan | manual
- lineItems[] (embedded or related)
- createdAt

### 4.3 BillLineItem
- id, billId
- category: energy_tier1 | energy_tier2 | energy_tier3 | fuel_clause | rural_fee | subsidy_deduction | tax | other
- label (en), labelAr
- amount (JD)
- kwh (optional), ratePerKwh (optional, fils)

### 4.4 TariffTier
- tier, minKwh, maxKwh, ratePerKwh (fils)
- type: subsidized | non_subsidized
- sector: residential | commercial | industrial
- effectiveDate

### 4.5 TariffPeriod (Time-of-Use)
- name: peak | partial_peak | off_peak
- startHour, endHour
- rate, sector

---

## 5. App Screens

### 5.1 Tab Navigation (4 tabs)

| Tab | Icon | Purpose |
|-----|------|---------|
| Home | house | Welcome, subscriber card, current bill, quick actions, mini KPIs |
| Usage | bar-chart | Consumption charts, tier breakdown, cost trends, month comparison |
| Insights | lightbulb | KPI dashboard, appliance estimates, environmental impact, savings |
| Profile | person | Account settings, subscriber info, language, notifications |

### 5.2 Home Screen
- Welcome header with user name
- Subscriber card (gradient blue): subscriber number, company, current bill amount, billing period, due date
- Quick action buttons: Scan Bill / Enter Manually
- Mini KPI row: kWh used, fils/kWh avg, % change vs last month
- Bill breakdown preview (top 3 line items, tap for full detail)
- Environmental impact mini (CO₂, trees, water)

### 5.3 Usage Screen
- Period toggle: Monthly / Quarterly / Yearly
- Consumption bar chart (kWh) with average line
- Tier breakdown: visual progress bars showing kWh in each EMRC tier with cost per tier
- Cost trend chart (JD over time)
- Month-over-month comparison: consumption, cost, avg cost with percentage changes

### 5.4 Insights Screen (Differentiator)
- 4 KPI cards: cost per kWh, projected next bill, vs similar households, peak/off-peak split
- Appliance usage estimates: percentage bar + list (AC, water heater, fridge, lighting, other)
- Environmental impact card (dark theme):
  - CO₂ emitted (kg) — Jordan grid factor ~0.6 kg CO₂/kWh
  - Trees needed to offset — 1 tree ≈ 21 kg CO₂/year
  - Water used in generation — ~2 L/kWh (critical for water-scarce Jordan)
  - Month-over-month environmental comparison
  - "If you save X kWh" projection
- Savings potential card with dual benefit (JD + CO₂)
- Saving tips list with specific, actionable recommendations

### 5.5 Profile Screen
- User avatar, name, email
- Account section: subscriber number, distribution company, household size
- Settings: language (AR/EN), notifications, appearance
- Data: bill history, export
- About: CPA Jordan, terms, help

### 5.6 Additional Screens
- **Auth flow:** Login, Register (2-step: account → subscriber info)
- **Bill Scan:** Camera/gallery → preview → AI processing animation → results
- **Manual Entry:** Form with required (kWh, amount) and optional (fuel clause, meter readings) fields
- **Bill Detail:** Full line-item breakdown with explanations, tier visualization, share/export

---

## 6. Design System

### 6.1 Color Palette
- Primary: #1B4965 (deep blue — trustworthy, professional)
- Accent: #62B6CB (light blue — energy, electricity)
- Success: #059669 (green — savings, positive)
- Warning: #D97706 (amber — alerts, moderate)
- Danger: #DC2626 (red — high usage, expensive tiers)
- Background: #F8FAFB (off-white — clean, airy)
- Surface: #FFFFFF (white cards)

### 6.2 Aesthetic
- Light mode primary (trustworthy, like banking apps)
- Soft shadows, rounded corners (16px radius)
- Generous whitespace between sections
- Color-coded tiers: green (cheap), yellow (moderate), red (expensive)
- Dark cards for environmental impact section (contrast/emphasis)
- Gradient blue for subscriber/bill summary cards

### 6.3 Bilingual Support
- Full Arabic (RTL) and English (LTR) support
- User-selectable language toggle
- All labels, explanations, and tips in both languages
- Arabic hints on form fields to help users find bill values

---

## 7. Jordan Electricity Tariff Reference

### 7.1 Residential Subsidized (Registered at kahraba.gov.jo)
| Tier | Range | Rate (fils/kWh) | Fixed Deduction |
|------|-------|-----------------|-----------------|
| 1 | 1–300 kWh | 50 | -2.50 JD |
| 2 | 301–600 kWh | 100 | -2.00 JD |
| 3 | 600+ kWh | 200 | — |

### 7.2 Residential Non-Subsidized
| Tier | Range | Rate (fils/kWh) |
|------|-------|-----------------|
| 1 | 1–1,000 kWh | 120 |
| 2 | 1,000+ kWh | 150 |

### 7.3 Additional Charges
- Fuel clause adjustment: Monthly, based on 3-month moving average
- Rural electrification fee: 1 fil/kWh
- Minimum monthly charge: 1.75 JD (residential)

### 7.4 Time-of-Use (rolled out 2024-2025)
- Off-peak: 05:00–14:00 (cheapest, coincides with solar)
- Partial peak: 14:00–17:00 and 23:00–05:00
- Peak: 17:00–23:00 (most expensive)

---

## 8. Environmental Impact Calculations

| Metric | Formula | Source |
|--------|---------|--------|
| CO₂ | kWh × 0.6 kg | Jordan grid emission factor (natural gas dominant) |
| Trees | CO₂ / 21 kg/year | Average tree CO₂ absorption per year |
| Water | kWh × 2 L | Thermal plant cooling water consumption |

---

## 9. Key Decisions

1. **Monolith over microservices** — simpler to build, deploy, and debug for a consumer app with one developer/small team. NestJS modules provide logical separation.
2. **One subscriber per user** — simplifies the data model. Multi-subscriber support can be added later.
3. **Photo scan as wow-factor, manual as fallback** — both produce identical output so neither path is second-class.
4. **Environmental impact as differentiator** — water metric is especially powerful for Jordan. Not seen in comparable apps (Saudi Energy, etc.).
5. **CPA Jordan branding, not utility company** — this is a consumer advocacy tool, not a utility app. No payment processing, no service requests.
6. **Light mode primary** — trustworthy, clean, accessible for all ages and literacy levels.

---

## 10. Inspiration

Saudi Energy (SE) app — clean, card-based design with bottom tab navigation (Home, Usage, Services, Account). We adopt the clean card structure and tab pattern, but go much deeper on intelligence (tier visualization, KPIs, appliance estimates, environmental impact, savings optimizer). SE is a utility company app; ours is a consumer empowerment tool.
