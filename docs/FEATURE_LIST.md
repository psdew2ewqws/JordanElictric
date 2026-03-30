# JordanElectricity — Feature List
### A CPA Jordan Initiative for Consumer Electricity Intelligence

**Platform:** iOS & Android (Expo / React Native)
**Languages:** Arabic & English (Bilingual, RTL-ready)
**Backend:** NestJS + PostgreSQL
**AI:** GPT-4o Vision (Bill OCR)

---

## Core Features

### 1. Smart Bill Scanner (AI-Powered)
- Take a photo of any JEPCO, EDCO, or IDECO paper bill
- AI automatically extracts all fields: consumption, amount, billing period, meter readings
- Validates extracted data against tariff rules
- Works with all Jordanian electricity bill formats

### 2. Manual Bill Entry
- Enter bill values by hand as an alternative to scanning
- Required fields: total kWh, total amount
- Optional fields: fuel clause, meter readings, billing dates
- Helpful hints in Arabic showing where to find each value on the bill

### 3. Complete Bill Breakdown
- Every bill line item explained in plain Arabic and English
- Energy charges broken down by EMRC tariff tier with color coding
- Fuel clause adjustment explained
- Rural electrification fee explained
- Subsidy deductions shown
- Taxes and municipal fees itemized
- "Why am I paying this?" explanations for every charge

### 4. Usage Tracking & Trends
- Monthly, quarterly, and yearly consumption charts
- Cost trend visualization (JD over time)
- Month-over-month comparison with percentage changes
- Average consumption line for quick context
- Historical bill storage and retrieval

### 5. Tariff Tier Visualization
- Visual breakdown of how consumption falls across EMRC tiers
- Color-coded progress bars: green (Tier 1, subsidized), yellow (Tier 2), red (Tier 3)
- Clear display of rate per kWh at each tier
- Shows exactly how close the user is to the next (more expensive) tier

### 6. KPI Dashboard
- **Cost per kWh** — actual average cost vs national average
- **Projected next bill** — forecast based on usage patterns
- **Comparison to similar households** — percentage above/below average for same household size
- **Peak vs off-peak split** — percentage of usage during expensive vs cheap hours

### 7. Appliance Usage Estimates
- Estimated percentage of bill per appliance category
- Based on Jordanian household consumption profiles
- Categories: AC, water heater, refrigerator, lighting, other
- kWh estimates per appliance

### 8. Environmental Impact Tracker
- CO₂ emissions calculated from electricity consumption (based on Jordan's grid emission factor)
- Number of trees needed to offset emissions
- Water used in electricity generation (critical metric for water-scarce Jordan)
- Month-over-month environmental comparison
- Shows environmental benefit of reducing consumption

### 9. Savings Optimizer
- Personalized recommendations to reduce electricity bills
- **Time-of-Use shifting** — move consumption to off-peak hours (05:00–14:00)
- **Tier optimization** — reduce kWh to stay in cheaper tariff tiers
- Each tip shows potential savings in JD and kWh
- Dual benefit display: financial savings + CO₂ reduction

### 10. User Profile & Settings
- Email/password authentication with JWT
- Subscriber number linking (one per user)
- Distribution company selection (JEPCO / EDCO / IDECO)
- Household size for accurate comparisons
- Bilingual toggle (Arabic / English)
- Push notification preferences
- Bill history export

### 11. Notifications & Alerts
- Bill due date reminders
- Usage spike alerts (when new bill is significantly higher)
- Monthly savings summary push notifications
- Tier threshold warnings

---

## Technical Highlights

| Feature | Technology |
|---------|-----------|
| Bill OCR | GPT-4o Vision API |
| Mobile App | Expo SDK 54 + React Native |
| Navigation | Expo Router (file-based) |
| Backend | NestJS with TypeScript |
| Database | PostgreSQL |
| Auth | JWT (access + refresh tokens) |
| Tariff Data | EMRC official rates (2025) |
| Charts | Custom React Native components |
| i18n | Arabic + English, RTL support |

---

## Data Sources

- **EMRC** — Official tariff tiers and Time-of-Use schedules
- **Jordan grid emission factor** — ~0.6 kg CO₂/kWh (natural gas dominant)
- **Household consumption profiles** — Based on Jordanian averages from MEMR reports
- **Water usage** — ~2 liters/kWh for thermal generation

---

## Target Users

- Jordanian residential electricity consumers
- Households across all three distribution companies (JEPCO, EDCO, IDECO)
- Both subsidized and non-subsidized subscribers
- Arabic and English-speaking users

---

## About

Built as part of the **Consumer Protection Association (CPA) Jordan** initiative to empower Jordanian consumers with transparent, understandable electricity billing information and actionable insights to reduce costs and environmental impact.

**Contact:** CPA Jordan — https://cpa.jo
