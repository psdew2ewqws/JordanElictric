const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Tab, TabStopPosition, TabStopType, ShadingType } = require('docx');
const fs = require('fs');

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Calibri', size: 24 },
      },
    },
  },
  sections: [
    {
      properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
      children: [
        // Title
        new Paragraph({ spacing: { after: 100 }, alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: 'Diaa (ضياء)', bold: true, size: 56, color: '1B4965', font: 'Calibri' }),
        ]}),
        new Paragraph({ spacing: { after: 100 }, alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: 'Understand Your Electricity', size: 32, color: '62B6CB', italics: true }),
        ]}),
        new Paragraph({ spacing: { after: 400 }, alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: 'A CPA Jordan Consumer Empowerment App', size: 26, color: '5A6F82' }),
        ]}),

        // Divider
        new Paragraph({ spacing: { after: 400 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1B4965' } }, children: [] }),

        // The Problem
        new Paragraph({ spacing: { before: 200, after: 200 }, children: [
          new TextRun({ text: 'The Problem', bold: true, size: 36, color: '1B4965' }),
        ]}),
        ...['4.5 million electricity consumers in Jordan receive complex bills they don\'t understand',
          'Consumers can\'t track their real-time consumption or predict their next bill',
          'No easy way to report outages, file complaints, or get energy-saving advice',
          'The average Jordanian household spends 5-8% of income on electricity',
          'Most consumers don\'t know which tariff tier they\'re in or how to reduce costs',
        ].map(t => new Paragraph({ spacing: { after: 80 }, bullet: { level: 0 }, children: [
          new TextRun({ text: t, size: 24 }),
        ]})),

        // Our Solution
        new Paragraph({ spacing: { before: 400, after: 200 }, children: [
          new TextRun({ text: 'Our Solution: Diaa (ضياء)', bold: true, size: 36, color: '1B4965' }),
        ]}),
        new Paragraph({ spacing: { after: 100 }, children: [
          new TextRun({ text: 'A mobile app that puts electricity intelligence in every consumer\'s hands.', size: 24 }),
        ]}),
        new Paragraph({ spacing: { after: 100 }, children: [
          new TextRun({ text: 'Diaa', bold: true, size: 24 }),
          new TextRun({ text: ' means "light" in Arabic — we bring light to electricity bills, consumption, and savings.', size: 24 }),
        ]}),
        new Paragraph({ spacing: { after: 200 }, children: [
          new TextRun({ text: 'Built for CPA Jordan (Consumer Protection Association) to empower Jordanian electricity consumers with transparency, real-time data, and actionable insights.', size: 24 }),
        ]}),

        // Divider
        new Paragraph({ spacing: { after: 400 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1B4965' } }, children: [] }),

        // Key Features
        new Paragraph({ spacing: { before: 200, after: 300 }, children: [
          new TextRun({ text: 'Key Features', bold: true, size: 36, color: '1B4965' }),
        ]}),

        // Feature 1
        new Paragraph({ spacing: { before: 200, after: 100 }, children: [
          new TextRun({ text: '1. Real-Time Smart Meter Integration', bold: true, size: 28, color: '1B4965' }),
        ]}),
        ...['Connects directly to JEPCO\'s smart meter system',
          'Shows daily consumption in kWh',
          'Predicts end-of-month bill based on current usage pattern',
          'Alerts users when they\'re approaching the next tariff tier',
        ].map(t => new Paragraph({ spacing: { after: 60 }, bullet: { level: 0 }, children: [
          new TextRun({ text: t, size: 22 }),
        ]})),

        // Feature 2
        new Paragraph({ spacing: { before: 200, after: 100 }, children: [
          new TextRun({ text: '2. Bill Analysis & Breakdown', bold: true, size: 28, color: '1B4965' }),
        ]}),
        ...['Scan any electricity bill with your camera (AI-powered OCR)',
          'Or enter bill details manually',
          'Full breakdown: energy tiers, fuel clause, rural fee, subsidies, taxes',
          'Clear explanation of every charge in Arabic and English',
        ].map(t => new Paragraph({ spacing: { after: 60 }, bullet: { level: 0 }, children: [
          new TextRun({ text: t, size: 22 }),
        ]})),

        // Feature 3
        new Paragraph({ spacing: { before: 200, after: 100 }, children: [
          new TextRun({ text: '3. Tariff Calculator (EMRC Rates)', bold: true, size: 28, color: '1B4965' }),
        ]}),
        ...['Built-in EMRC tariff engine with July 2024 rates',
          'Tier 1: 1-300 kWh @ 50 fils/kWh',
          'Tier 2: 301-600 kWh @ 100 fils/kWh',
          'Tier 3: 600+ kWh @ 200 fils/kWh',
          'Calculates subsidies, taxes, and fixed charges automatically',
        ].map(t => new Paragraph({ spacing: { after: 60 }, bullet: { level: 0 }, children: [
          new TextRun({ text: t, size: 22 }),
        ]})),

        // Feature 4
        new Paragraph({ spacing: { before: 200, after: 100 }, children: [
          new TextRun({ text: '4. Usage Analytics & Insights', bold: true, size: 28, color: '1B4965' }),
        ]}),
        ...['Monthly, quarterly, and yearly consumption trends',
          'Month-over-month comparison with percentage changes',
          'Cost per kWh tracking',
          'Projected next bill amount',
          'Comparison vs similar Jordanian homes',
          'Estimated appliance usage breakdown (AC, water heater, refrigerator, etc.)',
        ].map(t => new Paragraph({ spacing: { after: 60 }, bullet: { level: 0 }, children: [
          new TextRun({ text: t, size: 22 }),
        ]})),

        // Feature 5
        new Paragraph({ spacing: { before: 200, after: 100 }, children: [
          new TextRun({ text: '5. Environmental Impact Dashboard', bold: true, size: 28, color: '1B4965' }),
        ]}),
        ...['CO\u2082 emissions from electricity usage (kg)',
          'Trees needed to offset carbon footprint',
          'Water used in power generation (liters)',
          'Month-over-month environmental comparison',
        ].map(t => new Paragraph({ spacing: { after: 60 }, bullet: { level: 0 }, children: [
          new TextRun({ text: t, size: 22 }),
        ]})),

        // Feature 6
        new Paragraph({ spacing: { before: 200, after: 100 }, children: [
          new TextRun({ text: '6. Consumer Services', bold: true, size: 28, color: '1B4965' }),
        ]}),
        ...['Live Chat — 24/7 inquiries and complaints',
          'Outage Reporting — report power outages with location and affected area',
          'Complaint Tracking — file and track complaints with real-time status updates',
          'Energy Friend — report electrical hazards with photo and location for community safety',
        ].map(t => new Paragraph({ spacing: { after: 60 }, bullet: { level: 0 }, children: [
          new TextRun({ text: t, size: 22 }),
        ]})),

        // Feature 7
        new Paragraph({ spacing: { before: 200, after: 100 }, children: [
          new TextRun({ text: '7. Full Bilingual Support (Arabic & English)', bold: true, size: 28, color: '1B4965' }),
        ]}),
        ...['Complete Arabic and English interface with 250+ translated strings',
          'One-tap language switching',
          'Native Arabic fonts (Noto Sans Arabic)',
          'All content, labels, and explanations in both languages',
        ].map(t => new Paragraph({ spacing: { after: 60 }, bullet: { level: 0 }, children: [
          new TextRun({ text: t, size: 22 }),
        ]})),

        // Divider
        new Paragraph({ spacing: { after: 400 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1B4965' } }, children: [] }),

        // How It Works
        new Paragraph({ spacing: { before: 200, after: 200 }, children: [
          new TextRun({ text: 'How It Works', bold: true, size: 36, color: '1B4965' }),
        ]}),
        ...['Register — Create account and enter your subscriber number',
          'Connect — App automatically fetches your smart meter data from JEPCO',
          'Track — See your daily consumption, current tier, and projected bill',
          'Understand — Scan or enter bills for full breakdown and analysis',
          'Save — Get personalized tips to reduce consumption and costs',
          'Report — File outages, complaints, or safety hazards in seconds',
        ].map((t, i) => new Paragraph({ spacing: { after: 80 }, children: [
          new TextRun({ text: `${i + 1}. `, bold: true, size: 24, color: '1B4965' }),
          new TextRun({ text: t, size: 24 }),
        ]})),

        // Divider
        new Paragraph({ spacing: { after: 400 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1B4965' } }, children: [] }),

        // Technical Architecture
        new Paragraph({ spacing: { before: 200, after: 200 }, children: [
          new TextRun({ text: 'Technical Architecture', bold: true, size: 36, color: '1B4965' }),
        ]}),

        new Paragraph({ spacing: { after: 100 }, children: [
          new TextRun({ text: 'Mobile App: ', bold: true, size: 24 }),
          new TextRun({ text: 'React Native + Expo SDK 54, TypeScript, Expo Router', size: 24 }),
        ]}),
        new Paragraph({ spacing: { after: 100 }, children: [
          new TextRun({ text: 'Backend API: ', bold: true, size: 24 }),
          new TextRun({ text: 'NestJS (TypeScript), PostgreSQL, Redis, Prisma ORM, JWT Auth', size: 24 }),
        ]}),
        new Paragraph({ spacing: { after: 100 }, children: [
          new TextRun({ text: 'AI Integration: ', bold: true, size: 24 }),
          new TextRun({ text: 'GPT-4o Vision for bill OCR scanning, EMRC tariff calculation engine', size: 24 }),
        ]}),
        new Paragraph({ spacing: { after: 100 }, children: [
          new TextRun({ text: 'External Integration: ', bold: true, size: 24 }),
          new TextRun({ text: 'JEPCO smart meter API for real-time consumption data', size: 24 }),
        ]}),
        new Paragraph({ spacing: { after: 100 }, children: [
          new TextRun({ text: 'Database: ', bold: true, size: 24 }),
          new TextRun({ text: '13 tables — users, subscriptions, bills, tariffs, complaints, notifications, AI logs', size: 24 }),
        ]}),
        new Paragraph({ spacing: { after: 100 }, children: [
          new TextRun({ text: 'Platform: ', bold: true, size: 24 }),
          new TextRun({ text: 'iOS & Android (via Expo)', size: 24 }),
        ]}),

        // Divider
        new Paragraph({ spacing: { after: 400 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1B4965' } }, children: [] }),

        // Impact
        new Paragraph({ spacing: { before: 200, after: 200 }, children: [
          new TextRun({ text: 'Impact & Value', bold: true, size: 36, color: '1B4965' }),
        ]}),

        new Paragraph({ spacing: { before: 100, after: 100 }, children: [
          new TextRun({ text: 'For Consumers:', bold: true, size: 26, color: '059669' }),
        ]}),
        ...['Understand every fils on their electricity bill',
          'Track consumption in real-time, not just monthly',
          'Predict and control their bills before they arrive',
          'Report issues quickly and track resolution',
        ].map(t => new Paragraph({ spacing: { after: 60 }, bullet: { level: 0 }, children: [
          new TextRun({ text: t, size: 22 }),
        ]})),

        new Paragraph({ spacing: { before: 200, after: 100 }, children: [
          new TextRun({ text: 'For CPA Jordan:', bold: true, size: 26, color: '059669' }),
        ]}),
        ...['Demonstrates consumer protection through technology',
          'Educates millions of consumers about their electricity rights',
          'Provides data on common consumer complaints and patterns',
          'Aligns with Jordan\'s national digital transformation goals',
        ].map(t => new Paragraph({ spacing: { after: 60 }, bullet: { level: 0 }, children: [
          new TextRun({ text: t, size: 22 }),
        ]})),

        new Paragraph({ spacing: { before: 200, after: 100 }, children: [
          new TextRun({ text: 'Strategic Alignment:', bold: true, size: 26, color: '059669' }),
        ]}),
        ...['Jordan Energy Strategy 2020-2030',
          'National AI Strategy',
          'Economic Modernization Vision',
          'Consumer Protection Law',
        ].map(t => new Paragraph({ spacing: { after: 60 }, bullet: { level: 0 }, children: [
          new TextRun({ text: t, size: 22 }),
        ]})),

        // Divider
        new Paragraph({ spacing: { after: 400 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1B4965' } }, children: [] }),

        // Footer
        new Paragraph({ spacing: { before: 300 }, alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: 'Diaa v1.0.0', bold: true, size: 28, color: '1B4965' }),
        ]}),
        new Paragraph({ spacing: { after: 100 }, alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: 'Built for CPA Jordan — Consumer Protection Association', size: 22, color: '5A6F82' }),
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: 'ضياء — افهم كهربائك', size: 28, color: '1B4965', bold: true }),
        ]}),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('/home/rizeq/cpa/JordanElictric/docs/Diaa-Pitch-Presentation.docx', buffer);
  console.log('Word document created: docs/Diaa-Pitch-Presentation.docx');
});
