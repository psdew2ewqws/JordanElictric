# Jordan Electricity Billing System & Tariff Research

> Research compiled March 2026 for building a consumer-facing electricity bill explainer app.
> Data reflects the tariff structure as of April 2025 (latest major revision).

---

## 1. Sector Structure Overview

Jordan's electricity sector is unbundled into three stages:

### Generation
- Central Electricity Generating Company (CEGCO)
- AES Jordan
- Various Independent Power Producers (IPPs)
- Renewable energy projects (solar, wind)

### Transmission
- **NEPCO** (National Electric Power Company) -- operates the national grid and acts as the single buyer of electricity from generators. NEPCO sells bulk power to distribution companies.

### Distribution (Three Regional Companies)

| Company | Abbreviation | Service Area | Share of Consumers |
|---------|-------------|--------------|-------------------|
| Jordan Electric Power Company | **JEPCO** | Amman, Zarqa, Madaba, Balqa (central region) | ~64% |
| Irbid District Electricity Company | **IDECO** | Irbid, Jerash, Ajloun, Mafraq, parts of Balqa (northern region) | ~23% |
| Electricity Distribution Company | **EDCO** | Karak, Tafilah, Ma'an, Aqaba, Jordan Valley, eastern region to Iraqi border (southern/eastern) | ~13% |

All three companies purchase bulk electricity from NEPCO and distribute to end consumers. EDCO covers ~55% of Jordan's geographic area despite serving the fewest customers.

### Regulator
- **EMRC** (Energy and Minerals Regulatory Commission) -- sets tariffs, issues licenses, and regulates the sector. Successor to the Electricity Regulatory Commission.

---

## 2. Residential Tariff Structure (Progressive/Step-Up Tiers)

Jordan uses a progressive (increasing block) tariff for residential consumers. The more you use, the higher the marginal rate.

### 2A. Subsidized Residential Tariff (التعرفة المدعومة)

Applies to eligible Jordanian households registered on kahraba.gov.jo.

| Tier | Consumption Range (kWh/month) | Rate (fils/kWh) | Rate (JOD/kWh) | Rate (USD/kWh approx.) |
|------|------------------------------|-----------------|-----------------|----------------------|
| 1 | 1 -- 300 | 50 | 0.050 | ~0.070 |
| 2 | 301 -- 600 | 100 | 0.100 | ~0.141 |
| 3 | Over 600 | 200 | 0.200 | ~0.282 |

**Note:** 1 JOD = 1,000 fils. 50 fils = 5 piasters (qirsh). The terms "piasters" and "qirsh" are used interchangeably (1 piaster = 10 fils).

#### Fixed Subsidy Deductions (applied directly to the bill):
| Consumption Range | Monthly Deduction |
|-------------------|-------------------|
| 1 -- 50 kWh | No deduction (very low bill already) |
| 51 -- 200 kWh | JD 2.50 |
| 201 -- 600 kWh | JD 2.00 |
| Over 600 kWh | No fixed deduction |

#### Calculation Example (Subsidized, 450 kWh/month):
```
Tier 1: 300 kWh x 0.050 JOD = 15.000 JOD
Tier 2: 150 kWh x 0.100 JOD = 15.000 JOD
Subtotal energy charge:        30.000 JOD
Fixed subsidy deduction:       -2.000 JOD  (201-600 kWh bracket)
                               ──────────
Net before other charges:      28.000 JOD
+ Fuel clause adjustment (variable, see Section 5)
+ Other fees/taxes (see Section 5)
= Final bill amount
```

### 2B. Non-Subsidized Residential Tariff (التعرفة غير المدعومة)

Applies to: additional meters beyond the first household meter, non-Jordanian residents, and subscribers who have not registered on kahraba.gov.jo.

| Tier | Consumption Range (kWh/month) | Rate (fils/kWh) | Rate (JOD/kWh) |
|------|------------------------------|-----------------|-----------------|
| 1 | 1 -- 1,000 | 120 | 0.120 |
| 2 | Over 1,000 | 150 | 0.150 |

No fixed subsidy deduction applies.

### 2C. Residential Services Meter (عداد الخدمات المنزلي)

For common-area meters in residential buildings (hallways, elevators, etc.):

| Tier | Consumption Range | Rate (fils/kWh) |
|------|------------------|-----------------|
| 1 | 1 -- 300 | 50 |
| 2 | 301 -- 600 | 100 |
| 3 | Over 600 | 200 |

(Same tiers as subsidized residential.)

### Eligibility for Subsidized Tariff

To receive the subsidized tariff, subscribers must register at **kahraba.gov.jo**. Eligible categories:
- Jordanian citizens with a national number who are heads of household (hold a family book)
- Jordanian women holding a family book in their name
- Heads of families holding temporary Jordanian passports
- Gaza Strip residents in Jordan
- Beneficiaries regardless of marital status (married, widowed, divorced, single head of household)
- National Aid Fund beneficiaries

**Important:** The meter does NOT need to be in the beneficiary's name. Registration does not require a property or lease contract. However, registration cannot be done on a disconnected meter.

As of the last reported figures, approximately 997,000 meters were registered for the subsidized tariff.

---

## 3. Non-Residential Tariff Categories

### 3A. Commercial (تجاري)

| Tier | Consumption Range (kWh/month) | Rate (fils/kWh) |
|------|------------------------------|-----------------|
| 1 | 1 -- 2,000 | 120 |
| 2 | Over 2,000 | 152 |

Also applies to Commercial Services Meters (عداد الخدمات التجاري).

### 3B. Small Industrial (صناعي صغير)

| Tier | Consumption Range (kWh/month) | Rate (fils/kWh) |
|------|------------------------------|-----------------|
| 1 | 1 -- 10,000 | 60 |
| 2 | Over 10,000 | 68 |

### 3C. Medium Industrial (صناعي متوسط) -- Time-of-Use

| Period | Hours | Rate (fils/kWh) |
|--------|-------|-----------------|
| Peak | 17:00 -- 23:00 | 79 |
| Partial Peak | 14:00 -- 17:00 and 23:00 -- 05:00 | 69 |
| Off-Peak | 05:00 -- 14:00 | 59 |

### 3D. Large Industrial (صناعي كبير) -- Time-of-Use

| Period | Hours | Rate (fils/kWh) |
|--------|-------|-----------------|
| Peak | 17:00 -- 23:00 | 130 |
| Partial Peak | 14:00 -- 17:00 and 23:00 -- 05:00 | 120 |
| Off-Peak | 05:00 -- 14:00 | 110 |

### 3E. Extractive Industries (صناعات استخراجية) -- Time-of-Use

| Period | Hours | Rate (fils/kWh) |
|--------|-------|-----------------|
| Peak | 17:00 -- 23:00 | 226 |
| Partial Peak | 14:00 -- 17:00 and 23:00 -- 05:00 | 216 |
| Off-Peak | 05:00 -- 14:00 | 206 |

### 3F. Agriculture (زراعة)

| Meter Type | Rate (fils/kWh) |
|-----------|-----------------|
| Daytime supply | 55 |
| Nighttime supply | 49 |
| Flat rate (no time distinction) | 55 |

No demand charge (maximum load: 0 JOD/kW/month).

### 3G. Hotels (فنادق)

| Option | Rate (fils/kWh) |
|--------|-----------------|
| Flat rate | 82 |
| Time-of-Use (day) | 82 |
| Time-of-Use (night) | 82 |

No demand charge. (Phase 2 ToU implementation began January 2025; hotels were included but the ToU rates appear symmetric.)

### 3H. Water Pumping (ضخ مياه) -- Optional Time-of-Use

| Period | Hours | Rate (fils/kWh) |
|--------|-------|-----------------|
| Peak | 17:00 -- 23:00 | 106 |
| Partial Peak | 14:00 -- 17:00 and 23:00 -- 05:00 | 96 |
| Off-Peak | 05:00 -- 14:00 | 86 |

Flat rate (non-ToU): 96 fils/kWh.

### 3I. Other Specific Sectors (Flat Rates)

| Sector | Rate (fils/kWh) |
|--------|-----------------|
| Banking (بنوك) | 285 |
| Telecommunications (اتصالات) | 152 |
| Broadcasting/Television (اذاعة وتلفزيون) | 152 |
| Private Hospitals (مستشفيات خاصة) | 140 |
| Street Lighting (انارة شوارع) | 114 |
| Armed Forces (قوات مسلحة) | 146 |
| Ports Authority (مؤسسة الموانئ) | 159 |
| Mixed Commercial/Agricultural (تعرفة مختلطة) | 101 |

### 3J. Electric Vehicle Charging (شحن مركبات كهربائية) -- Time-of-Use

**Home Charging:**

| Period | Rate (fils/kWh) |
|--------|-----------------|
| Peak (17:00 -- 23:00) | 160 |
| Partial Peak | 118 |
| Off-Peak (05:00 -- 14:00) | 108 |

**Public Charging Stations (without operator commission):**

| Period | Rate (fils/kWh) |
|--------|-----------------|
| Peak (17:00 -- 23:00) | 133 |
| Partial Peak | 113 |
| Off-Peak (05:00 -- 14:00) | 103 |

---

## 4. Time-of-Use (ToU) Dynamic Tariff System

### Overview
Jordan began implementing Time-of-Use tariffs on July 1, 2024 (Phase 1) and expanded in January 2025 (Phase 2). The system is expected to cover all sectors by end of 2025.

### Time Periods

| Period | Hours | Rationale |
|--------|-------|-----------|
| **Off-Peak** | 05:00 -- 14:00 (some sectors: 05:00 -- 17:00) | Lowest rates; aligns with peak solar PV generation |
| **Partial Peak** | 14:00 -- 17:00 and 23:00 -- 05:00 | Moderate rates; transitional periods |
| **Peak** | 17:00 -- 23:00 | Highest rates; evening demand peak, thermal generation |

### Phase 1 Sectors (July 2024):
- Electric vehicle charging (home and public)
- Telecommunications
- Medium and large industries
- Extractive industries
- Water pumping (optional)

### Phase 2 Sectors (January 2025):
- Banking sector
- Private hospitals
- Water pumping (mandatory)
- Hotels

### Projected Savings (if 25% load shifts to off-peak):
- Total: Over JD 5.3 million annually
- Water pumping & medium industries: Over JD 2 million each
- Large industrial & hotels: JD 350,000 each
- Military subscriptions: JD 260,000
- Extractive industries & telecommunications: Over JD 100,000 each
- Private hospitals: JD 86,000
- Banking & EV charging: ~JD 50,000 each

---

## 5. Bill Components

A typical Jordan electricity bill contains the following line items:

### 5A. Energy Charge (ثمن الطاقة)
The core consumption charge calculated by multiplying kWh consumed in each tier by the applicable rate (as per the tariff tables above). This is the largest component.

### 5B. Fuel Clause Adjustment (بند الوقود)
- Introduced in the bill format from January 1, 2017
- Adjusted monthly based on a **3-month moving average** of fuel costs (natural gas, diesel used in generation)
- Can be positive (surcharge) or negative (credit) depending on fuel price movements
- Acts as a pass-through of NEPCO's fuel cost fluctuations to consumers
- The EMRC discloses updates on system costs for transparency
- Appears as a separate line item on the bill
- Currently set at variable amounts (has been as low as zero in some periods)

### 5C. Rural Electrification Fee (رسم الكهربة الريفية)
- 1 fil per kWh consumed
- Collected by distribution companies on behalf of the Jordanian Rural Electrification Project

### 5D. Minimum Monthly Charge (أدنى مقطوعية)
- Standard residential consumers: **JD 1.75/month**
- Other consumers: **JD 2.00/month**
- If the calculated energy charge is below this threshold, the minimum charge applies instead

### 5E. Government Taxes and Fees
- Electricity is **exempt from general sales tax (GST)** for basic residential consumption
- Stamp duty may apply at 0.3% to 0.6% on certain bill amounts
- Municipality-related fees may vary by location

### 5F. Late Payment Fee
- Applied if the bill is not paid by the due date
- Exact percentage/amount set by the distribution company

### 5G. Reconnection Fee
- Charged if service was disconnected for non-payment and is being restored

### 5H. Fixed Subsidy Deduction (for subsidized residential only)
- JD 2.50 for consumption 51-200 kWh
- JD 2.00 for consumption 201-600 kWh
- Appears as a credit/deduction on the bill

---

## 6. Billing Cycle and Meter Reading

### Billing Period
- **Monthly billing cycle** for all distribution companies
- Bill is generated after each meter reading

### Meter Reading Process
- Historically done by company employees visiting each meter
- **JEPCO Self-Reading App:** Customers can photograph their meter via the JEPCO mobile app within a 3-day window (1 day before to 1 day after the scheduled reading date)
- The app notifies customers of their upcoming reading date
- Customers can view the last 3 months of meter reading images
- If self-reading is not done, a company reader visits or an estimated bill may be issued

### Meter Types
- **Main household meter** (العداد الرئيسي) -- one per household, eligible for subsidized tariff
- **Services meter** (عداد الخدمات) -- for common areas in buildings
- **Additional meters** -- second/third meters on same property, charged at non-subsidized rates
- **Smart meters** -- being deployed progressively for ToU tariff implementation

### Bill Delivery and Payment

**Payment Channels:**
- **eFAWATEERcom** (efawateercom.jo) -- Jordan's official electronic bill payment system, supervised by the Central Bank of Jordan
- Bank internet/mobile banking (via eFAWATEERcom integration)
- ATM networks
- JEPCO / EDCO / IDECO customer service apps and offices
- PayPal (via eFAWATEERcom)
- Authorized payment centers and agents
- Credit/debit cards

**Bill Viewing:**
- Distribution company mobile apps (JEPCO Customer Services, etc.)
- Distribution company websites
- eFAWATEERcom portal

---

## 7. Subsidy Registration Platform (kahraba.gov.jo)

The government launched **kahraba.gov.jo** as an electronic platform for Jordanians to register their meters for the subsidized tariff.

### Registration Requirements:
- Jordanian national number (or temporary passport number for eligible categories)
- An electricity bill for the meter to be registered
- Meter must be active (not disconnected)
- No property/lease contract required
- Meter does not need to be in the applicant's name

### Coverage:
- As of the latest data, ~997,000 meters registered
- Government statement: 90% of Jordanians will not face bill stress under the current tariff structure
- Consumers with monthly bills of JD 50 or less (~600 kWh consumption) experience no impact from recent tariff changes

---

## 8. Solar/Renewable Energy Net Billing

For consumers with rooftop solar PV systems:

### Export Rates (excess energy sold back to the grid):
| Customer Type | Export Rate |
|---------------|------------|
| Residential | ~50 fils/kWh (0.050 JOD / ~0.0705 USD) |
| All other sectors | ~40 fils/kWh (0.040 JOD / ~0.0564 USD) |

### Special Note:
- National Aid Fund beneficiaries with small PV systems (below 3.6 kW) still receive the fixed subsidy deductions
- Net billing (not net metering) is the current mechanism -- exports are credited at fixed rates rather than offsetting consumption 1:1

---

## 9. Key Numbers for App Development

### Currency Reference:
- 1 JOD (Jordanian Dinar) = 1,000 fils = 100 piasters (qirsh)
- 1 piaster = 10 fils
- 1 JOD ~ 1.41 USD (fixed peg)

### Critical Thresholds for Residential Users:
- **300 kWh/month** -- Tier 1/Tier 2 boundary (subsidized)
- **600 kWh/month** -- Tier 2/Tier 3 boundary (subsidized); also the ~JD 50 bill threshold
- **1,000 kWh/month** -- Tier 1/Tier 2 boundary (non-subsidized)
- **JD 50/month** -- Government-stated threshold below which bills are unaffected by tariff changes
- **JD 1.75** -- Minimum monthly charge (residential)

### Average Consumption Reference:
- Regular customers: ~297 kWh/month (per academic study)
- National average residential price: ~60 fils/kWh (JD 0.060) as of June 2025

---

## 10. Data Gaps and Caveats

1. **Fuel clause amount:** The exact current fuel clause surcharge/credit varies monthly and is not published in a single easily accessible location. The app should ideally fetch this dynamically or allow manual entry.

2. **ToU tariffs for Phase 2 sectors (banking, hospitals, hotels):** While flat rates are known from JEPCO's tariff page, the specific ToU peak/off-peak/partial-peak breakdown for these Phase 2 sectors is less clearly documented publicly. The JEPCO page shows hotels at a flat 82 fils for both day and night.

3. **Stamp duty / municipality fees on electricity bills:** The exact line items and rates for these vary and are not comprehensively documented in a single source. They may differ by governorate.

4. **EDCO and IDECO specific differences:** All three distribution companies apply the same EMRC-mandated tariff schedule. However, billing formats, payment channels, and apps may differ slightly.

5. **Billing frequency:** While the system is monthly, some reports suggest that billing may occasionally be bimonthly in certain rural areas served by EDCO. This needs verification.

6. **Tariff effective date:** The current residential tariff structure has been in effect since April 1, 2022 (subsidized/unsubsidized split) with the ToU additions from July 2024 and January 2025. A new subsidized tariff revision took effect April 1, 2025 extending coverage to new beneficiary categories.

---

## Sources

- [JEPCO Tariff Categories and Tiers](https://www.jepco.com.jo/ar/Home/%D9%81%D8%A6%D8%A7%D8%AA-%D9%88%D8%B4%D8%B1%D8%A7%D8%A6%D8%AD-%D8%AA%D8%B9%D8%B1%D9%81%D8%A9-%D8%A7%D9%84%D9%83%D9%87%D8%B1%D8%A8%D8%A7%D8%A1) -- Primary source for current rate tables
- [How to Calculate the Electricity Bill in Jordan (Amaken)](https://www.amaken.jo/en/blog-details/28/how-to-calculate-the-electricity-bill-in-jordan-and-check-your-monthly-usage)
- [Understanding How Residential Electricity Bills Are Calculated (Roya News)](https://en.royanews.tv/news/52672)
- [New Electricity Tariff to Take Effect (Jordan Times)](https://jordantimes.com/news/local/new-electricity-tariff-take-effect-april-1-%E2%80%94-emrc)
- [New Electricity Tariff to Go Into Effect (Zawya)](https://www.zawya.com/en/business/energy/new-electricity-tariff-to-go-into-effect-friday-jordan-wwaagsu0)
- [Time-Based Electricity Tariffs Implemented (Jordan News)](https://www.jordannews.jo/Section-109/News/Time-Based-Electricity-Tariffs-Implemented-36287)
- [MEMR and EMRC Off-Peak Tariff for Productive Sectors](https://www.memr.gov.jo/En/NewsDetails/MEMR_and_EMRC_Grant_an_Incentivizing_OffPeak_Electricity_Tariff_to_Several_Vital_Productive_Sectors)
- [Jordan's Solar Surge (EcoMENA)](https://www.ecomena.org/jordans-solar-surge-policy-shifts-and-tech-innovations-fuel-distributed-pv-growth/)
- [Jordan Electricity Prices (GlobalPetrolPrices)](https://www.globalpetrolprices.com/Jordan/electricity_prices/)
- [NEPCO Tariff Document (PDF)](https://www.nepco.com.jo/assets/doc/tariff.pdf)
- [Energy in Jordan (Wikipedia)](https://en.wikipedia.org/wiki/Energy_in_Jordan)
- [Jordan Energy Situation (Energypedia)](https://energypedia.info/wiki/Jordan_Energy_Situation)
- [EMRC About the Sector](http://emrc.gov.jo/index.php/en/about-sector)
- [Jordan: Selected Issues (IMF)](https://www.elibrary.imf.org/view/journals/002/2017/232/article-A005-en.xml) -- Fuel clause mechanism details
- [Eligible Households Urged to Register (Jordan Times)](https://jordantimes.com/news/local/eligible-households-urged-register-e-platform-electricity-subsidy)
- [eFAWATEERcom](https://efawateercom.jo/) -- Official bill payment system
