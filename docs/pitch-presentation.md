# Diaa (ضياء) — Understand Your Electricity
### A CPA Jordan Consumer Empowerment App

---

## The Problem

- 4.5 million electricity consumers in Jordan receive complex bills they don't understand
- Consumers can't track their real-time consumption or predict their next bill
- No easy way to report outages, file complaints, or get energy-saving advice
- The average Jordanian household spends 5-8% of income on electricity
- Most consumers don't know which tariff tier they're in or how to reduce costs

---

## Our Solution: Diaa (ضياء)

A mobile app that puts electricity intelligence in every consumer's hands.

**Diaa** means "light" in Arabic — we bring light to electricity bills, consumption, and savings.

Built for CPA Jordan (Consumer Protection Association) to empower Jordanian electricity consumers with transparency, real-time data, and actionable insights.

---

## Key Features

### 1. Real-Time Smart Meter Integration
- Connects directly to JEPCO's smart meter system
- Shows daily consumption in kWh
- Predicts end-of-month bill based on current usage pattern
- Alerts users when they're approaching the next tariff tier

### 2. Bill Analysis & Breakdown
- Scan any electricity bill with your camera (AI-powered OCR)
- Or enter bill details manually
- Full breakdown: energy tiers, fuel clause, rural fee, subsidies, taxes
- Clear explanation of every charge in Arabic and English

### 3. Tariff Calculator
- Built-in EMRC tariff engine (July 2024 rates)
- Shows exactly how consumption is distributed across tiers:
  - Tier 1: 1-300 kWh @ 50 fils
  - Tier 2: 301-600 kWh @ 100 fils
  - Tier 3: 600+ kWh @ 200 fils
- Calculates subsidies, taxes, and fixed charges automatically

### 4. Usage Analytics & Insights
- Monthly, quarterly, and yearly consumption trends
- Month-over-month comparison
- Cost per kWh tracking
- Projected next bill amount
- Comparison vs similar Jordanian homes
- Peak vs off-peak usage split

### 5. Environmental Impact
- CO2 emissions from your electricity usage
- Trees needed to offset your carbon footprint
- Water used in power generation
- Month-over-month environmental comparison

### 6. Estimated Appliance Usage
- Breakdown of which appliances consume the most
- Air conditioning, water heater, refrigerator, lighting estimates
- Based on actual consumption and typical Jordanian household patterns

### 7. Savings Recommendations
- Personalized tips to reduce bills
- Tier optimization advice (e.g., "reduce 20 kWh to stay in Tier 1")
- Load-shifting suggestions for off-peak savings

### 8. Consumer Services
- **Live Chat**: 24/7 inquiries and complaints
- **Outage Reporting**: Report power outages with location and affected area
- **Complaint Tracking**: File and track complaints with status updates
- **Energy Friend**: Report electrical hazards with photo and location for community safety

### 9. Full Bilingual Support
- Complete Arabic and English interface
- One-tap language switching
- Arabic fonts (Noto Sans Arabic) for native reading experience
- All content, labels, and explanations in both languages

---

## Technical Architecture

### Mobile App (Frontend)
- React Native with Expo SDK 54
- TypeScript for type safety
- Expo Router for file-based navigation
- Custom design system with consistent UI/UX

### Backend API
- NestJS (TypeScript) with PostgreSQL database
- JWT authentication with token refresh
- Redis caching for performance
- Prisma ORM with 13 database tables
- Swagger API documentation
- Rate limiting and input validation

### AI Integration
- GPT-4o Vision for bill OCR scanning
- Claude AI for consumer Q&A (planned)
- EMRC tariff calculation engine

### External Integration
- JEPCO smart meter API for real-time consumption data
- Supports all three distribution companies: JEPCO, IDECO, EDCO

---

## How It Works

1. **Register** — Create account and enter your subscriber number
2. **Connect** — App automatically fetches your smart meter data from JEPCO
3. **Track** — See your daily consumption, current tier, and projected bill
4. **Understand** — Scan or enter bills for full breakdown and analysis
5. **Save** — Get personalized tips to reduce consumption and costs
6. **Report** — File outages, complaints, or safety hazards in seconds

---

## Impact & Value

### For Consumers
- Understand every fils on their electricity bill
- Track consumption in real-time, not just monthly
- Predict and control their bills before they arrive
- Report issues quickly and track resolution

### For CPA Jordan
- Demonstrates consumer protection through technology
- Educates millions of consumers about their rights
- Provides data on common consumer complaints
- Aligns with Jordan's national digital transformation goals

### Strategic Alignment
- Jordan Energy Strategy 2020-2030
- National AI Strategy
- Economic Modernization Vision
- Consumer Protection Law

---

## Live Demo Highlights

1. Login with real user account
2. Home screen showing real-time JEPCO smart meter data
3. Enter a bill manually — watch the tariff engine calculate the full breakdown
4. Switch to Arabic — entire app translates instantly
5. View usage trends and insights with real data
6. Report an outage — demonstrate the complaint system
7. Browse bill history with past bills

---

## Team

Built by CPA Jordan's technology team as part of the Consumer Empowerment Initiative.

**App Name:** Diaa (ضياء)
**Version:** 1.0.0
**Platform:** iOS & Android (via Expo)
**Status:** Functional prototype with real JEPCO integration
