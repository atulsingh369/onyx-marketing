/**
 * onyx-marketing / src/server.ts
 *
 * Onyx Marketing Command Center — Unified Agency-Agents Orchestrator & UI
 * Serves marketing.onyxiq.in on port 4300
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { fileURLToPath } from 'url';
import pg from 'pg';
import 'dotenv/config';

// Fast TCP connectivity check (sub-millisecond)
function checkPort(port: number, host = '127.0.0.1', timeout = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4300;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const publicDir = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : path.join(__dirname, '../src/public');

app.use(express.static(publicDir));

// ─── Environment & Secrets ──────────────────────────────────────────────────
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL || '';
const BIFROST_URL = process.env.BIFROST_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '';
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'AIzaSyDbcoPX-wDuW_hrCg99WwLnPSEL5-Jkcrk';

// ─── 1. Marketing Agency Team Roster ─────────────────────────────────────────
export interface MarketingAgent {
  id: string;
  name: string;
  category: 'Strategist & Analyst' | 'Copywriter & Creator' | 'Publishing & Operations';
  role: string;
  emoji: string;
  color: string;
  model: string;
  status: 'ACTIVE' | 'STANDBY';
  summary: string;
  guidelines: string[];
}

export const MARKETING_ROSTER: MarketingAgent[] = [
  {
    id: 'saas-analyst',
    name: 'SaaS Product Analyst & Offer Architect',
    category: 'Strategist & Analyst',
    role: 'Deconstructs any SaaS product into ICP, Friday headache, breakthrough mechanism, and Hormozi Grand Slam Offer.',
    emoji: '🧠',
    color: '#F59E0B',
    model: 'groq/llama-3.3-70b-versatile',
    status: 'ACTIVE',
    summary: 'Analyzes any SaaS via pitch, URL, or feature brief to synthesize the Alex Hormozi Value Equation and 4 content pillars.',
    guidelines: [
      'Define the exact decision-maker ICP (never say "businesses").',
      'Pinpoint their Friday-afternoon operational nightmare & inaction cost.',
      'Construct a Grand Slam Offer prospects feel stupid saying no to.',
      'Extract 4 strategic content pillars & free lead magnet ideas.',
    ],
  },
  {
    id: 'outbound-strategist',
    name: 'Outbound & Lead Gen Strategist',
    category: 'Strategist & Analyst',
    role: 'Top-of-funnel architect who designs 3-tier signal routing and multi-touch cadences.',
    emoji: '🧲',
    color: '#EC4899',
    model: 'groq/llama-3.3-70b-versatile',
    status: 'ACTIVE',
    summary: 'Designs lead magnets that deliver real value before a buyer ever hears a pitch; manages signal-based selling.',
    guidelines: [
      'Classify signals into Tier 1 (Active Intent), Tier 2 (Organizational), and Tier 3 (Technographic).',
      'Design high-converting risk-reversal guarantees.',
      'Sequence multi-touch outreach across LinkedIn, Email, and WhatsApp.',
    ],
  },
  {
    id: 'linkedin-creator',
    name: 'LinkedIn Content Creator',
    category: 'Copywriter & Creator',
    role: 'Authority copywriter crafting scroll-stopping LinkedIn posts with 3-Hook Variants and Golden Hour velocity.',
    emoji: '💼',
    color: '#0A66C2',
    model: 'groq/llama-3.3-70b-versatile',
    status: 'ACTIVE',
    summary: 'Master of LinkedIn feed culture: 3-hook selection, line 1 hook, line 2 blank, no links in body, 3-5 specific hashtags.',
    guidelines: [
      'Every post includes 3 hook options: Curiosity Gap, Contrarian Claim, and Specific Metric.',
      'Line 1 strictly < 10 words, Line 2 blank, Line 3 delivery stat.',
      'No links in post body (strictly "Link in 1st comment below").',
      'Golden Hour CTA inviting genuine peer debate (purges "thoughts?").',
    ],
  },
  {
    id: 'carousel-engine',
    name: 'Carousel Growth Engine',
    category: 'Copywriter & Creator',
    role: 'Visual storyteller generating 6-Slide Narrative Arc carousels for LinkedIn PDF & Instagram.',
    emoji: '🎠',
    color: '#10B981',
    model: 'groq/llama-3.3-70b-versatile',
    status: 'ACTIVE',
    summary: 'Structures viral carousels: Hook → Bottleneck → Agitation → Breakthrough → 3 Levers → CTA/Save Prompt.',
    guidelines: [
      '6-Slide Narrative Arc strictly enforced.',
      'Slide copy ultra-lean (< 25 words per slide for slides 2-5).',
      'High-contrast visual DNA (Deep Obsidian with Neon accents).',
      'Safe-zone margin rules: zero text in bottom 20% area.',
    ],
  },
  {
    id: 'twitter-engager',
    name: 'Twitter/X Viral Engager',
    category: 'Copywriter & Creator',
    role: 'Fast-paced thread architect turning complex insights into 5-tweet viral breakdowns.',
    emoji: '🐦',
    color: '#1DA1F2',
    model: 'groq/llama-3.3-70b-versatile',
    status: 'ACTIVE',
    summary: 'Drafts value-dense Twitter threads with each individual tweet strictly under 270 characters.',
    guidelines: [
      'Tweet 1 hook under 260 characters with tension signpost.',
      'Tweets 2-4: 1 insight per tweet, under 270 characters with unicode bullets.',
      'Tweet 5: Core takeaway + retweet request + organic question.',
    ],
  },
  {
    id: 'omni-repurposer',
    name: 'Omni-Channel Repurposer',
    category: 'Copywriter & Creator',
    role: 'Takes 1 single topic or case study and produces a synchronized 4-asset marketing package.',
    emoji: '📡',
    color: '#8B5CF6',
    model: 'groq/llama-3.3-70b-versatile',
    status: 'ACTIVE',
    summary: 'One brief → LinkedIn authority post + Twitter thread + 6-Slide carousel + executive newsletter.',
    guidelines: [
      'Format each asset natively for its target platform.',
      'Synchronize message DNA while avoiding repetitive phrasing.',
      'Bundle deliverables into a clean 1-click export package.',
    ],
  },
  {
    id: 'master-polisher',
    name: 'Agency Master Polisher',
    category: 'Publishing & Operations',
    role: 'Anti-AI fluff purifier, line break validator, and unicode bullet formatter.',
    emoji: '💎',
    color: '#6366F1',
    model: 'groq/llama-3.3-70b-versatile',
    status: 'ACTIVE',
    summary: 'Purges corporate filler ("delve", "tapestry", "in today’s era"), converts asterisks to unicode bullets (•), and validates hooks.',
    guidelines: [
      'Purge all AI buzzwords and corporate jargon.',
      'Enforce clean unicode bullets (•) and whitespace spacing.',
      'Preserve all factual numbers, percentages, and metrics without hallucination.',
    ],
  },
  {
    id: 'buffer-dispatcher',
    name: 'Buffer Social Dispatcher (Post Agent)',
    category: 'Publishing & Operations',
    role: 'Validates boss approval, formats text for Buffer GraphQL API, and dispatches to social queues.',
    emoji: '🚀',
    color: '#14B8A6',
    model: 'groq/llama-3.3-70b-versatile',
    status: 'ACTIVE',
    summary: 'Manages social publishing to LinkedIn and Twitter channels across OnyxIQ and personal accounts.',
    guidelines: [
      'Strict Boss Approval verification before publishing (fails if FALSE).',
      'Routes dynamically to OnyxIQ or personal Buffer profiles.',
      'Enforces character limits per channel.',
    ],
  },
];

// ─── 2. Universal SaaS Product Profiles ──────────────────────────────────────
export interface SaaSProductProfile {
  name: string;
  category: string;
  tagline: string;
  targetAudience: {
    title: string;
    frustration: string;
    costOfInaction: string;
  };
  coreProblem: string;
  statusQuoFailure: string;
  breakthroughSolution: string;
  keyFeatures: string[];
  proofPoints: string[];
  grandSlamOffer: {
    dreamOutcome: string;
    perceivedLikelihood: string;
    timeDelay: string;
    effortAndSacrifice: string;
    guarantee: string;
    cta: string;
  };
  contentPillars: {
    contrarianTake: string;
    bottleneckTeardown: string;
    framework3Levers: string[];
    leadMagnetIdea: string;
  };
}

export const SEED_PROFILES: Record<string, SaaSProductProfile> = {
  medisuite: {
    name: 'MediSuite AI',
    category: 'Healthcare Clinical Operations SaaS',
    tagline: 'The AI Clinical Operating System & WhatsApp Patient Bridge',
    targetAudience: {
      title: 'Private Clinic Owners, Independent Doctors, and Polyclinic OPD Managers',
      frustration: 'Spending 2.5 hours every evening manually typing EHR notes and managing patient follow-ups across personal WhatsApp numbers.',
      costOfInaction: 'Losing 20% to 35% of booked clinic slots to no-shows, resulting in up to ₹1.5L/month in unrecoverable empty chair time.',
    },
    coreProblem: 'Sluggish EHR typing and fragmented patient communication drain clinical hours.',
    statusQuoFailure: 'Traditional desktop EHRs turn doctors into typists, while personal WhatsApp chats create patient privacy chaos and missed follow-ups.',
    breakthroughSolution: 'Ambient voice-to-prescription in 30 seconds combined with an autonomous WhatsApp clinic assistant that automates bookings and reminders with zero app downloads.',
    keyFeatures: [
      '30-Second Ambient Voice Rx: Dictate naturally in Hindi or English to generate a clean digital prescription instantly.',
      'Autonomous WhatsApp Clinic Assistant: Handles appointment scheduling, cancellations, and sends 24h & 2h reminders.',
      'Unified Patient Timeline: 1-click access to vitals, past diagnoses, and lab histories.',
      'Zero-App Experience: Patients receive digital prescriptions and diet instructions directly on WhatsApp.',
    ],
    proofPoints: [
      'Drops patient no-show rates from 28% to under 6% within 14 days.',
      'Saves over 2 hours of daily screen time per practitioner.',
      'Over 98% patient satisfaction due to instant WhatsApp PDF prescription delivery.',
    ],
    grandSlamOffer: {
      dreamOutcome: 'Reclaim 2.5 hours of daily typing time and recover up to ₹1.5L/mo in lost clinic revenue from empty chairs.',
      perceivedLikelihood: '15-minute plug-and-play clinic onboarding with zero staff learning curve and no new hardware required.',
      timeDelay: 'Generate your first digital voice prescription within 15 minutes of signup.',
      effortAndSacrifice: 'Runs on doctor’s existing smartphone or laptop; works seamlessly over official WhatsApp API.',
      guarantee: '14-Day Zero-Risk Clinical Pilot. If your no-shows don’t drop by at least 50%, pay nothing.',
      cta: 'Book a 15-minute live clinical demo or reply "CLINIC" for our 14-day zero-risk trial.',
    },
    contentPillars: {
      contrarianTake: 'Typing prescriptions during consultations doesn’t make you compliant; it destroys patient trust and costs clinics ₹1.5L every month.',
      bottleneckTeardown: 'Why the conventional "patient portal app" is dead: 90% of patients refuse to install another app, but 100% check WhatsApp within 5 minutes.',
      framework3Levers: [
        'Lever 1: Shift from screen typing to ambient voice capture.',
        'Lever 2: Automate 2-hour and 24-hour bilingual WhatsApp confirmation nudges.',
        'Lever 3: Unify patient communication into a compliant clinic channel.',
      ],
      leadMagnetIdea: 'The Clinic No-Show Calculator & 5-Step WhatsApp Recall Script for Private Clinics.',
    },
  },
  flowinvoice: {
    name: 'FlowInvoice',
    category: 'FinTech / Cash Flow Automation',
    tagline: 'Automated Invoice Collection & WhatsApp Payment Reminders',
    targetAudience: {
      title: 'Digital Agency Owners, Consultancies, and High-Ticket Freelancers',
      frustration: 'Spending 15+ hours a month manually following up on overdue invoices and awkward payment reminders.',
      costOfInaction: 'Average agency bleeds ₹2L to ₹5L in late payments, restricting monthly payroll and cash reserves.',
    },
    coreProblem: 'Manual invoice follow-ups are uncomfortable, awkward, and consistently delayed.',
    statusQuoFailure: 'Generic automated accounting emails go straight to the client’s spam or get ignored for weeks.',
    breakthroughSolution: 'Smart WhatsApp-first payment concierge with automated 1-click UPI/card payment links and milestone-triggered payment escrows.',
    keyFeatures: [
      '1-Click WhatsApp Payment Links: Native Razorpay/Stripe checkout links delivered straight to client WhatsApp.',
      'Polite Automated Escalation: 3-tier gentle reminders sent automatically at due date, +3 days, and +7 days.',
      'Real-Time Cash Flow Forecast: Predicts upcoming invoice receipts based on client payment behavior.',
    ],
    proofPoints: [
      'Clients get paid 3.2x faster on average.',
      'Reduces outstanding accounts receivable by 74% within 30 days.',
    ],
    grandSlamOffer: {
      dreamOutcome: 'Get 100% of your invoices paid on time without sending a single awkward follow-up text.',
      perceivedLikelihood: 'Integrates with QuickBooks, Zoho, or Tally in 5 minutes.',
      timeDelay: 'Collect on your first overdue invoice within 48 hours of connecting.',
      effortAndSacrifice: 'Completely hands-off automation; runs in background.',
      guarantee: '14-Day Free Pilot: Collect on at least 1 overdue invoice within 7 days, or pay nothing.',
      cta: 'Start your 14-day zero-risk trial or reply "INVOICE" for our cash flow audit.',
    },
    contentPillars: {
      contrarianTake: 'Chasing clients for payment over email isn’t professional; it’s the #1 reason agencies suffer cash flow crunches.',
      bottleneckTeardown: 'Why Net-30 payment terms are killing early-stage service agencies in India.',
      framework3Levers: [
        'Lever 1: Deliver invoices where clients actually chat: WhatsApp.',
        'Lever 2: Remove friction with instant 1-tap UPI payment buttons.',
        'Lever 3: Automate escalation before invoices become overdue.',
      ],
      leadMagnetIdea: 'The Agency Accounts Receivable Recovery Calculator & 3 Polite Payment Scripts.',
    },
  },
  talentradar: {
    name: 'TalentRadar AI',
    category: 'Developer Tools & Hiring Intelligence',
    tagline: 'Technical Candidate Screening on Real GitHub Code',
    targetAudience: {
      title: 'VPs of Engineering, CTOs, and Technical Talent Leads at Scaling Startups',
      frustration: 'Wasting 40+ engineering hours per hire interviewing candidates who memorized LeetCode but cannot write clean production code.',
      costOfInaction: 'Spending ₹3L+ in wasted engineering interviewer time and risking a disastrous bad engineering hire.',
    },
    coreProblem: 'LeetCode quizzes and resume buzzwords fail to test real production software skills.',
    statusQuoFailure: 'Standard coding platforms test inverted binary trees instead of reading git diffs, debugging race conditions, or designing clean APIs.',
    breakthroughSolution: 'AI evaluation engine that analyzes candidates’ actual GitHub commits, PRs, and sandbox architecture design challenges in real time.',
    keyFeatures: [
      'Real-World PR Challenge: Candidates review and debug a simulated production pull request.',
      'AI Code Quality Radar: Rates candidates on modularity, testing, security, and edge-case handling.',
      'Automated Technical Dossier: Delivers a 1-page executive technical audit to the hiring manager in 5 minutes.',
    ],
    proofPoints: [
      'Cuts engineering interview screening hours by 70%.',
      'Zero false-positive offers across 500+ engineering hires.',
    ],
    grandSlamOffer: {
      dreamOutcome: 'Hire top 5% production engineers in half the time without taking engineers away from shipping.',
      perceivedLikelihood: 'Standardized benchmarks validated by senior staff engineers.',
      timeDelay: 'Review your first candidate report within 24 hours of posting.',
      effortAndSacrifice: 'Candidate assessment link sent automatically upon application.',
      guarantee: 'If you don’t find an accepted hire in your first 3 candidate reviews, our pilot is completely free.',
      cta: 'Request a 10-minute technical demo or reply "RADAR" for our candidate benchmark report.',
    },
    contentPillars: {
      contrarianTake: 'Testing candidates on LeetCode trivia filters for test-takers, not the engineers who will scale your production backend.',
      bottleneckTeardown: 'The hidden $20,000 cost of pulling senior engineers into 5 rounds of basic screening.',
      framework3Levers: [
        'Lever 1: Replace live coding with async PR reviews.',
        'Lever 2: Test debugging ability over algorithmic recall.',
        'Lever 3: Standardize scoring on maintainability and test coverage.',
      ],
      leadMagnetIdea: 'The Production Engineering Hiring Rubric & 5 PR Interview Scenarios.',
    },
  },
};

/**
 * Universal Heuristic Synthesizer for ANY arbitrary SaaS
 */
export function synthesizeSaaS(input: {
  name?: string;
  category?: string;
  description?: string;
  url?: string;
  targetAudience?: string;
  keyFeatures?: string[];
  guarantee?: string;
}): SaaSProductProfile {
  const lowerName = (input.name || '').toLowerCase();
  if (lowerName.includes('medisuite') || lowerName.includes('clinic')) return SEED_PROFILES['medisuite']!;
  if (lowerName.includes('flowinvoice') || lowerName.includes('invoice')) return SEED_PROFILES['flowinvoice']!;
  if (lowerName.includes('talentradar') || lowerName.includes('hiring') || lowerName.includes('radar')) return SEED_PROFILES['talentradar']!;

  const name = input.name || 'SaaS Platform';
  const category = input.category || 'B2B Software as a Service';
  const targetAudience = input.targetAudience || 'Founders, Executives, and Operations Leaders';
  const description = input.description || `${name} automates critical business operations to save teams time and eliminate manual errors.`;

  const features = input.keyFeatures && input.keyFeatures.length > 0
    ? input.keyFeatures
    : [
        'Autonomous Workflow Automation: Eliminates repetitive manual data entry and human error.',
        'Real-Time Operational Visibility: Centralized dashboard for instant tracking and alerts.',
        'Instant Integration: Connects with existing communication and data tools without heavy migration.',
      ];

  return {
    name,
    category,
    tagline: `Automating critical workflows so ${targetAudience} can focus on high-impact growth.`,
    targetAudience: {
      title: targetAudience,
      frustration: `Losing hours every week to manual busywork, context switching, and clunky legacy software.`,
      costOfInaction: `Wasting valuable budget on redundant administrative tasks while competitors ship 3x faster.`,
    },
    coreProblem: `Manual operational bottlenecks and fragmented legacy workflows eating up hours of high-value team time.`,
    statusQuoFailure: `Existing legacy tools are bloated, require months of onboarding, and force teams to work around the software instead of with it.`,
    breakthroughSolution: `An automated intelligence system that replaces tedious manual tasks with a single, streamlined, real-time workflow.`,
    keyFeatures: features,
    proofPoints: [
      'Cuts operational task time by over 60% within the first 30 days.',
      'Zero migration downtime with day-one onboarding.',
      'High team adoption rate due to intuitive, consumer-grade UX.',
    ],
    grandSlamOffer: {
      dreamOutcome: `Eliminate operational busywork and reclaim 10+ hours per week per team member.`,
      perceivedLikelihood: `Turnkey onboarding with dedicated guided setup and immediate time-to-value.`,
      timeDelay: `First automated result live in under 30 minutes of setup.`,
      effortAndSacrifice: `Zero complex scripting or staff retraining required.`,
      guarantee: input.guarantee || `14-Day Zero-Risk Trial. If it doesn’t save you at least 5 hours in week one, pay nothing.`,
      cta: `Start your 14-day zero-risk trial or request a 15-minute product walk-through.`,
    },
    contentPillars: {
      contrarianTake: `Most teams don't have a productivity problem; they have an offer and tool fragmentation problem.`,
      bottleneckTeardown: `Why adding more manual steps to broken software makes teams slower, not safer.`,
      framework3Levers: [
        'Lever 1: Identify and eliminate the single largest manual data entry task.',
        'Lever 2: Connect real-time alerts directly into team communication channels.',
        'Lever 3: Enforce a strict single-pane-of-glass operating baseline.',
      ],
      leadMagnetIdea: `The 10-Minute Operational Friction Audit & Benchmark Sheet for ${targetAudience}.`,
    },
  };
}

// ─── 3. Content Generator (Agency-Agents Spec) ──────────────────────────────
export async function generateContentForSaaS(
  profile: SaaSProductProfile,
  platform: 'linkedin' | 'carousel' | 'twitter' | 'repurpose',
  customAngle?: string
): Promise<string> {
  const angle = customAngle || profile.contentPillars.contrarianTake;

  if (platform === 'linkedin') {
    return `
3 HOOK VARIANTS:
• Hook 1 (Curiosity Gap): Why ${profile.targetAudience.title} are quietly throwing out their old tools.
• Hook 2 (Contrarian Claim): ${profile.contentPillars.contrarianTake}
• Hook 3 (Specific Metric): Reclaim 10+ hours every week without adding a single extra tool.

Why ${profile.targetAudience.title} are quietly throwing out their old tools.

${profile.targetAudience.frustration}
${profile.targetAudience.costOfInaction}

Most teams try to solve this by piling on more complex software.
The result? More notifications, more friction, and zero real relief.

${profile.name} approached this from the opposite direction:
${profile.breakthroughSolution}

Here is what changes on Day 1:
• ${profile.keyFeatures[0]}
• ${profile.keyFeatures[1]}
• ${profile.keyFeatures[2]}

${profile.grandSlamOffer.guarantee}

How is your team tackling operational bottlenecks this quarter?

Link in 1st comment below 👇

#${profile.name.toLowerCase().replace(/[^a-z0-9]/g, '')} #b2bsaas #productivity #automation
    `.trim();
  }

  if (platform === 'carousel') {
    return `
### Slide 1: The Hidden Bottleneck
**Visual Direction:** High-contrast Dark Obsidian (#0A0A0A) background with Electric Indigo accents.
**Slide Copy:** Why 80% of ${profile.targetAudience.title} lose hours to broken workflows.
Swipe to see the breakdown ➡️
---
### Slide 2: The Root Problem
**Visual Direction:** Minimalist split screen showing manual friction vs clean automated workflow.
**Slide Copy:** ${profile.targetAudience.frustration}
---
### Slide 3: The Cost of Inaction
**Visual Direction:** Warning badge with red accent indicator.
**Slide Copy:** ${profile.targetAudience.costOfInaction}
Here is what changed...
---
### Slide 4: The Breakthrough
**Visual Direction:** Glowing emerald badge highlighting the new paradigm.
**Slide Copy:** ${profile.breakthroughSolution}
---
### Slide 5: The 3 Levers
**Visual Direction:** 3 numbered modern card blocks.
**Slide Copy:** 
1. ${profile.contentPillars.framework3Levers[0]}
2. ${profile.contentPillars.framework3Levers[1]}
3. ${profile.contentPillars.framework3Levers[2]}
---
### Slide 6: Action & Save
**Visual Direction:** Save badge with clean CTA button.
**Slide Copy:** 
📌 Save this slide for your team workflow audit.
${profile.grandSlamOffer.guarantee}
${profile.grandSlamOffer.cta}
    `.trim();
  }

  if (platform === 'twitter') {
    return `
1/5
${profile.contentPillars.contrarianTake}

Here is why ${profile.targetAudience.title} are changing how they work: 🧵

2/5
The hidden problem:
${profile.targetAudience.frustration}

The real cost?
${profile.targetAudience.costOfInaction}

3/5
Why standard tools fail:
${profile.statusQuoFailure}

Instead of working harder, the solution is structural:
${profile.breakthroughSolution}

4/5
The 3 actionable levers:
• ${profile.contentPillars.framework3Levers[0]}
• ${profile.contentPillars.framework3Levers[1]}
• ${profile.contentPillars.framework3Levers[2]}

5/5
Bottom line:
${profile.grandSlamOffer.dreamOutcome}

${profile.grandSlamOffer.guarantee}

${profile.grandSlamOffer.cta}
Retweet 1/5 if this gave you value! 🔁
    `.trim();
  }

  // repurpose
  return `
=============================================================================
# 💼 ASSET 1: LINKEDIN AUTHORITY POST
=============================================================================

3 HOOK VARIANTS:
• Hook 1 (Curiosity Gap): Why ${profile.targetAudience.title} are quietly throwing out their old tools.
• Hook 2 (Contrarian Claim): ${profile.contentPillars.contrarianTake}
• Hook 3 (Specific Metric): Reclaim 10+ hours every week without adding a single extra tool.

Why ${profile.targetAudience.title} are quietly throwing out their old tools.

${profile.targetAudience.frustration}
${profile.targetAudience.costOfInaction}

${profile.name} fixes this with a clean new paradigm:
${profile.breakthroughSolution}

Key capabilities:
• ${profile.keyFeatures[0]}
• ${profile.keyFeatures[1]}
• ${profile.keyFeatures[2]}

${profile.grandSlamOffer.guarantee}

How is your team tackling operational bottlenecks this quarter?

Link in 1st comment below 👇

#${profile.name.toLowerCase().replace(/[^a-z0-9]/g, '')} #b2bsaas #automation

=============================================================================
# 🐦 ASSET 2: TWITTER / X 5-TWEET THREAD
=============================================================================

1/5
${profile.contentPillars.contrarianTake}
A breakdown for ${profile.targetAudience.title}: 🧵

2/5
The hidden friction:
${profile.targetAudience.frustration}

3/5
The turning point:
${profile.breakthroughSolution}

4/5
3 Levers to implement:
• ${profile.contentPillars.framework3Levers[0]}
• ${profile.contentPillars.framework3Levers[1]}
• ${profile.contentPillars.framework3Levers[2]}

5/5
${profile.grandSlamOffer.dreamOutcome}
${profile.grandSlamOffer.cta}

=============================================================================
# 🎠 ASSET 3: 6-SLIDE CAROUSEL BLUEPRINT
=============================================================================

[Slide 1 - Hook]: Why 80% of ${profile.targetAudience.title} are bleeding hours to manual tasks.
[Slide 2 - Problem]: ${profile.targetAudience.frustration}
[Slide 3 - Inaction Cost]: ${profile.targetAudience.costOfInaction}
[Slide 4 - Breakthrough]: ${profile.breakthroughSolution}
[Slide 5 - 3 Levers]: 1. ${profile.contentPillars.framework3Levers[0]} | 2. ${profile.contentPillars.framework3Levers[1]} | 3. ${profile.contentPillars.framework3Levers[2]}
[Slide 6 - CTA]: 📌 Save this guide. ${profile.grandSlamOffer.cta}

=============================================================================
# 📧 ASSET 4: EXECUTIVE NEWSLETTER TEASER
=============================================================================

Subject: The hidden friction costing ${profile.targetAudience.title} 10+ hours a week

Most teams accept administrative busywork as an inevitable cost of doing business.
It isn't.

${profile.name} was built to solve this exact problem: ${profile.breakthroughSolution}
Result: ${profile.grandSlamOffer.dreamOutcome}

Ready to see how it works?
Check out our 14-day zero-risk trial: ${profile.grandSlamOffer.cta}
  `.trim();
}

// ─── 4. API Endpoints ────────────────────────────────────────────────────────

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'onyx-marketing',
    domain: 'marketing.onyxiq.in',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Get Marketing Agency Team Roster
app.get('/api/agents', (req: Request, res: Response) => {
  res.json({
    success: true,
    roster: MARKETING_ROSTER,
    total: MARKETING_ROSTER.length,
  });
});

// Universal SaaS Product Analyzer
app.post('/api/analyze-saas', async (req: Request, res: Response) => {
  try {
    const { name, category, description, url, targetAudience, keyFeatures, guarantee } = req.body;
    const profile = synthesizeSaaS({
      name,
      category,
      description,
      url,
      targetAudience,
      keyFeatures,
      guarantee,
    });

    res.json({
      success: true,
      profile,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'SaaS analysis failed.' });
  }
});

// Master Polish Endpoint
app.post('/api/polish-content', (req: Request, res: Response) => {
  try {
    const { text, platform } = req.body;
    let cleaned = (text || '').trim();

    // Strip AI buzzwords
    const buzzwords = [
      /in today's digital landscape,?/gi,
      /in today's fast-paced world,?/gi,
      /delve into/gi,
      /testament to/gi,
      /tapestry of/gi,
      /game-changer/gi,
      /revolutionizing/gi,
      /look no further/gi,
    ];
    buzzwords.forEach((bw) => {
      cleaned = cleaned.replace(bw, '');
    });

    // Strip raw asterisks from headers or bold markers for LinkedIn
    if (platform === 'linkedin') {
      cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
    }

    // Convert dashes or asterisks to clean unicode bullets
    cleaned = cleaned.replace(/^[\*\-]\s+/gm, '• ');

    res.json({
      success: true,
      polished: cleaned,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Polishing failed.' });
  }
});

// Database Queue: Fetch Posts
app.get('/api/posts', async (req: Request, res: Response) => {
  if (!NEON_DATABASE_URL) {
    return res.json({
      success: true,
      posts: [
        {
          id: 1,
          topic: 'How private clinics eliminate 85% of no-shows with MediSuite',
          channel: 'linkedin',
          boss_approval: true,
          status: 'WAITING',
          created_at: new Date().toISOString(),
          content: '3 HOOK VARIANTS:\n• Hook 1: Indian doctors are reclaiming 2.5 hours every day.\n\nIndian doctors are reclaiming 2.5 hours every single day.\n\nMost private clinics lose up to ₹1.5L per month...',
        },
      ],
    });
  }

  const client = new pg.Client({ connectionString: NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const queryRes = await client.query(
      `SELECT id, topic, content, channel, boss_approval, status, created_at 
       FROM prod_content 
       ORDER BY created_at DESC 
       LIMIT 50`
    );
    res.json({ success: true, posts: queryRes.rows });
  } catch (err: any) {
    console.error('[DB Fetch Error]', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    await client.end().catch(() => {});
  }
});

// Database Queue: Approve Post
app.post('/api/posts/approve', async (req: Request, res: Response) => {
  const { id } = req.body;
  if (!NEON_DATABASE_URL) {
    return res.json({ success: true, message: `Mock approved post ID ${id}` });
  }

  const client = new pg.Client({ connectionString: NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(`UPDATE prod_content SET boss_approval = TRUE WHERE id = $1`, [id]);
    res.json({ success: true, message: `Post ID ${id} approved.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    await client.end().catch(() => {});
  }
});

// Database Queue: Save Draft to prod_content
app.post('/api/posts/save', async (req: Request, res: Response) => {
  const { topic, content, channel } = req.body;
  if (!NEON_DATABASE_URL) {
    return res.json({ success: true, message: 'Saved mock post', id: Date.now() });
  }

  const client = new pg.Client({ connectionString: NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const insertRes = await client.query(
      `INSERT INTO prod_content (topic, content, channel, boss_approval, status)
       VALUES ($1, $2, $3, FALSE, 'WAITING')
       RETURNING id`,
      [topic || 'Marketing Content', content, channel || 'linkedin']
    );
    res.json({ success: true, id: insertRes.rows[0].id, message: 'Post saved to prod_content.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    await client.end().catch(() => {});
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 3: CLOSED-LOOP LEAD CONVERSION & MULTI-CHANNEL OUTREACH ENGINE
// ═════════════════════════════════════════════════════════════════════════════

export interface InboundLead {
  id: string;
  name: string;
  organization: string;
  phone: string;
  email?: string;
  channel: 'linkedin' | 'twitter' | 'whatsapp' | 'outbound';
  triggerSignal: string;
  targetSaas: string;
  status: 'CAPTURED' | 'SCORED' | 'DOSSIER_READY' | 'DISPATCHED' | 'CONVERTED';
  opportunityScore: number;
  tier: 'Tier 1 (High Urgency)' | 'Tier 2 (Nurture)' | 'Tier 3 (Passive)';
  urgencyRouting: string;
  grandSlamOffer: {
    dreamOutcome: string;
    timeDelay: string;
    effortSacrifice: string;
    guarantee: string;
    cta: string;
  };
  cadence: {
    touch1_patternInterrupt: string;
    touch2_proofOfMechanism: string;
    touch3_interactiveDemo: string;
    touch4_softBreakup: string;
  };
  dispatchedAt?: string;
  notes?: string;
  createdAt: string;
}

// In-Memory Sovereign Lead Store
const LEADS_STORE: InboundLead[] = [
  {
    id: 'lead-1',
    name: 'Dr. Rajesh Sharma',
    organization: 'Apex Multi-Specialty Clinic, Lucknow',
    phone: '919876543210',
    email: 'dr.sharma@apexclinic.in',
    channel: 'linkedin',
    triggerSignal: "Commented 'CLINIC' on LinkedIn Post #1 (Doctor Burnout & EHR time)",
    targetSaas: 'MediSuite AI',
    status: 'DOSSIER_READY',
    opportunityScore: 94,
    tier: 'Tier 1 (High Urgency)',
    urgencyRouting: '< 5 Min Immediate SLA — Active Buyer Signal',
    grandSlamOffer: {
      dreamOutcome: 'Eliminate 85% of patient no-shows & recover 2.5 hours/day of doctor charting time',
      timeDelay: 'Live in 15 minutes, zero staff retraining required',
      effortSacrifice: 'Zero new hardware, uses clinic existing WhatsApp number and voice notes',
      guarantee: '14-Day Zero-Risk Trial — if no-shows do not drop by 50%+, pay ₹0',
      cta: 'Reply "CLINIC" or tap the link to activate your private WhatsApp sandbox number.',
    },
    cadence: {
      touch1_patternInterrupt:
        'Dr. Sharma, saw your comment regarding doctor charting burnout. Most clinics in Lucknow lose ~₹1.5L/month to missed patient follow-ups. We built MediSuite so you can speak bilingual prescriptions in 30 seconds and let WhatsApp handle scheduling. Free for a 60-second voice demo?',
      touch2_proofOfMechanism:
        'Dr. Sharma, here is the exact mechanism: Ambient Voice Rx listens to Hindi/English audio notes and auto-generates structured digital EHRs and WhatsApp reminders. No receptionist needed for follow-up calls.',
      touch3_interactiveDemo:
        'Dr. Sharma, test our live AI receptionist right now: Send "HI" to our active WhatsApp bot +91 92780 09883 or tap https://wa.me/919278009883?text=Hi%20Dr%20Sharma%20Demo — experience 30-second automated booking.',
      touch4_softBreakup:
        'Dr. Sharma, closing out your file for this month as I know OPD hours are intense. Whenever you want to automate follow-ups and eliminate no-shows, our 14-day risk-free trial is open.',
    },
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'lead-2',
    name: 'Vikram Malhotra',
    organization: 'Nexus Freight & Logistics, Mumbai',
    phone: '919820012345',
    email: 'vikram@nexusfreight.com',
    channel: 'twitter',
    triggerSignal: "Replied 'INVOICE' to Twitter Thread on Vendor Reconciliation delays",
    targetSaas: 'FlowInvoice AI',
    status: 'SCORED',
    opportunityScore: 88,
    tier: 'Tier 1 (High Urgency)',
    urgencyRouting: '< 15 Min SLA — High Value Financial Bottleneck',
    grandSlamOffer: {
      dreamOutcome: 'Zero manual 3-way invoice matching and instant ledger reconciliation',
      timeDelay: 'Plug into ERP in 10 minutes via REST webhook',
      effortSacrifice: 'No change to existing vendor submission portals',
      guarantee: '100% Extraction Accuracy Guarantee or full month credited',
      cta: 'Reply "INVOICE" to run your messiest multi-page PDF live in our sandbox.',
    },
    cadence: {
      touch1_patternInterrupt:
        'Hey Vikram, saw your reply on vendor reconciliation headaches. Freight teams bleed 18+ hours/week matching bills of lading with purchase orders. FlowInvoice handles 500 multi-page invoices in 60 seconds with 99.8% precision. Want to see a test run on your format?',
      touch2_proofOfMechanism:
        'Vikram, the breakthrough mechanism is Multi-Modal Line Item OCR + Autonomous ERP matching. Even handwritten stamps or tilted PDF scans are parsed without human data entry.',
      touch3_interactiveDemo:
        'Hey Vikram, here is a 1-click test: Forward any sample vendor invoice PDF to demo@flowinvoice.onyxiq.in and watch our AI return clean JSON & reconciliation report in 25 seconds.',
      touch4_softBreakup:
        'Hey Vikram, pausing outreach so your inbox stays clean. If Month-End closing ever takes more than 2 hours, feel free to grab our 30-day sandbox pass.',
    },
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'lead-3',
    name: 'Dr. Priya Nair',
    organization: 'City Dental Studio, Bangalore',
    phone: '919845098765',
    email: 'priya@citydental.in',
    channel: 'whatsapp',
    triggerSignal: 'Incoming WhatsApp DM: "Can your system handle appointment reminders in Kannada and English?"',
    targetSaas: 'MediSuite AI',
    status: 'DISPATCHED',
    opportunityScore: 96,
    tier: 'Tier 1 (High Urgency)',
    urgencyRouting: '< 5 Min Immediate SLA — Inbound WhatsApp Lead',
    grandSlamOffer: {
      dreamOutcome: 'Autonomous multilingual patient reminders reducing no-shows from 28% to 4%',
      timeDelay: 'Immediate deployment on existing clinic WhatsApp number',
      effortSacrifice: 'Zero IT overhead; staff only interacts with patient appointments calendar',
      guarantee: '14-Day Zero-Risk Trial with full multilingual setup included',
      cta: 'Send "READY" to test our Kannada voice appointment agent.',
    },
    cadence: {
      touch1_patternInterrupt:
        'Dr. Priya, absolutely! MediSuite AI natively supports English, Hindi, and Kannada for patient appointment reminders and reschedule requests. Over 85% of patients confirm their slot within 4 minutes on WhatsApp.',
      touch2_proofOfMechanism:
        'Dr. Priya, our Baileys-powered clinic gateway detects the patient preferred language and auto-replies with conversational voice or text prompts, updating your doctor schedule in real time.',
      touch3_interactiveDemo:
        'Dr. Priya, here is a test you can do right now: Text "Book Dental Appointment" to our bot at +91 92780 09883 or tap https://wa.me/919278009883 to see the multilingual receptionist in action.',
      touch4_softBreakup:
        'Dr. Priya, following up once more before letting you attend to patients. If you would like to test our Kannada reminder flow for a 14-day zero-risk trial, let us know!',
    },
    dispatchedAt: new Date(Date.now() - 1800000).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
];

// Helper: Synthesize Lead Dossier & Grand Slam Offer
function scoreAndGenerateLead(input: {
  name: string;
  organization: string;
  phone: string;
  email?: string;
  channel?: 'linkedin' | 'twitter' | 'whatsapp' | 'outbound';
  triggerSignal?: string;
  targetSaas?: string;
}): InboundLead {
  const signal = (input.triggerSignal || '').toLowerCase();
  const saas = input.targetSaas || 'MediSuite AI';

  let score = 75;
  let tier: 'Tier 1 (High Urgency)' | 'Tier 2 (Nurture)' | 'Tier 3 (Passive)' = 'Tier 2 (Nurture)';
  let urgency = '< 2 Hour SLA — Qualified Inbound';

  if (
    signal.includes('clinic') ||
    signal.includes('invoice') ||
    signal.includes('demo') ||
    signal.includes('urgent') ||
    signal.includes('price') ||
    signal.includes('cost') ||
    signal.includes('buy')
  ) {
    score = 92 + Math.floor(Math.random() * 6);
    tier = 'Tier 1 (High Urgency)';
    urgency = '< 5 Min Immediate SLA — Active Intent Signal';
  } else if (signal.includes('info') || signal.includes('more') || signal.includes('interested')) {
    score = 80 + Math.floor(Math.random() * 8);
    tier = 'Tier 2 (Nurture)';
    urgency = '< 1 Hour SLA — Engaged Prospect';
  } else {
    score = 65 + Math.floor(Math.random() * 10);
    tier = 'Tier 3 (Passive)';
    urgency = '< 24 Hour SLA — Value-First Nurture';
  }

  const cleanPhone = input.phone.replace(/[^0-9]/g, '');

  const isMedical = saas.toLowerCase().includes('medisuite') || saas.toLowerCase().includes('health') || saas.toLowerCase().includes('clinic');

  const grandSlamOffer = isMedical
    ? {
        dreamOutcome: 'Eliminate 85% of clinic no-shows & recover 2.5 hours/day of doctor charting time',
        timeDelay: 'Live in 15 minutes, zero staff training required',
        effortSacrifice: 'Zero new hardware, runs directly on clinic WhatsApp and mobile phones',
        guarantee: '14-Day Zero-Risk Trial — if no-shows do not drop by at least 50%, pay ₹0',
        cta: 'Reply "CLINIC" or tap the link to test our live WhatsApp receptionist.',
      }
    : {
        dreamOutcome: `Automate 90% of manual repetitive workflows in ${input.organization || 'your team'}`,
        timeDelay: 'Up and running in 10 minutes with 1-click cloud sync',
        effortSacrifice: 'No change to existing software stack or vendor habits',
        guarantee: '100% Performance Guarantee or full month credited',
        cta: `Reply "DEMO" to activate your private ${saas} sandbox environment.`,
      };

  const cadence = {
    touch1_patternInterrupt: isMedical
      ? `Dr./Mr. ${input.name}, saw your signal regarding clinic operations. Private clinics in India lose ~₹1.5L/month to missed patient appointments. We built MediSuite so doctors can dictate 30-second prescriptions and let AI automate WhatsApp bookings. Free for a quick 60-second voice demo?`
      : `Hey ${input.name}, saw your note regarding ${input.triggerSignal || 'automating workflows'}. Teams like ${input.organization || 'yours'} lose 15+ hours weekly to manual admin. We built ${saas} to eliminate this bottleneck in under 10 minutes. Open to a 60-second screen record?`,
    touch2_proofOfMechanism: isMedical
      ? `${input.name}, the breakthrough mechanism is Ambient Voice Rx + Autonomous WhatsApp Scheduling. Prescriptions are spoken naturally in Hindi/English, and structured digital records are dispatched instantly.`
      : `${input.name}, the secret is our deterministic AI worker engine that integrates directly into your existing channels without complex onboarding or API coding.`,
    touch3_interactiveDemo: isMedical
      ? `Dr. ${input.name}, test our live clinic AI receptionist right now: Message "HI" to our active WhatsApp bot +91 92780 09883 or tap https://wa.me/919278009883?text=Hi%20Demo — experience automated patient scheduling in 30 seconds.`
      : `Hey ${input.name}, here is a sandbox pass to test ${saas} live without entering a credit card: https://${saas.toLowerCase().replace(/[^a-z0-9]/g, '')}.onyxiq.in/demo.`,
    touch4_softBreakup:
      `Hey ${input.name}, closing your file for this month as I know you're super busy. Whenever you're ready to fix this bottleneck and reclaim 10+ hours a week, our 14-day zero-risk trial is always ready.`,
  };

  return {
    id: `lead-${Date.now()}`,
    name: input.name,
    organization: input.organization || 'Independent Practice',
    phone: cleanPhone,
    email: input.email || '',
    channel: input.channel || 'linkedin',
    triggerSignal: input.triggerSignal || 'Social Inbound Engagement',
    targetSaas: saas,
    status: 'DOSSIER_READY',
    opportunityScore: score,
    tier,
    urgencyRouting: urgency,
    grandSlamOffer,
    cadence,
    createdAt: new Date().toISOString(),
  };
}

// ─── Phase 3 API Routes ───────────────────────────────────────────────────────

// 1. Fetch All Leads in Pipeline
app.get('/api/leads', (req: Request, res: Response) => {
  res.json({
    success: true,
    total: LEADS_STORE.length,
    leads: LEADS_STORE,
  });
});

// 2. Ingest New Inbound Comment / Lead
app.post('/api/leads/capture', (req: Request, res: Response) => {
  try {
    const { name, organization, phone, email, channel, triggerSignal, targetSaas } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Name and Phone/WhatsApp are required.' });
    }

    const newLead = scoreAndGenerateLead({
      name,
      organization,
      phone,
      email,
      channel,
      triggerSignal,
      targetSaas,
    });

    LEADS_STORE.unshift(newLead);

    res.json({
      success: true,
      lead: newLead,
      message: `Lead "${newLead.name}" ingested and classified as ${newLead.tier} (${newLead.opportunityScore}/100)!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to ingest lead.' });
  }
});

// 2b. Outbound Prospecting & Google Places Live Discovery
app.post('/api/leads/prospect', async (req: Request, res: Response) => {
  try {
    const { niche, location, limit, lang, targetSaas } = req.body;
    const query = `${niche || 'Dental Clinics'} in ${location || 'Lucknow, India'}`;
    const maxCount = Math.min(Math.max(Number(limit) || 5, 1), 20);
    const saas = targetSaas || 'MediSuite AI';

    const placesRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri',
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: maxCount,
      }),
    });

    if (!placesRes.ok) {
      const errData = await placesRes.text();
      throw new Error(`Google Places API error: ${errData}`);
    }

    const placesData: any = await placesRes.json();
    const places = placesData.places || [];

    const isMedical =
      saas.toLowerCase().includes('medisuite') ||
      saas.toLowerCase().includes('clinic') ||
      saas.toLowerCase().includes('health');

    const results = places.map((p: any) => {
      const hasWebsite = !!p.websiteUri;
      const rating = p.rating || 0;
      const reviews = p.userRatingCount || 0;
      const lowRatingHighVol = rating > 0 && rating < 4.2 && reviews > 50;

      let score = 0;
      const breakdown = {
        noWebsite: 0,
        lowRatingHighVolume: 0,
        missingBooking: 0,
        noSSL: 0,
        legacyStack: 0,
        noAIChat: 0,
      };

      if (!hasWebsite) {
        breakdown.noWebsite = 40;
        breakdown.missingBooking = 20;
        breakdown.noAIChat = 10;
        score += 70;
      } else {
        if (lowRatingHighVol) {
          breakdown.lowRatingHighVolume = 25;
          score += 25;
        }
        const isBuilderOrOld =
          p.websiteUri.includes('zoca.com') ||
          p.websiteUri.includes('wix') ||
          p.websiteUri.includes('wordpress') ||
          p.websiteUri.includes('site123');
        if (isBuilderOrOld) {
          breakdown.missingBooking = 20;
          breakdown.noAIChat = 10;
          breakdown.legacyStack = 15;
          score += 45;
        } else {
          breakdown.missingBooking = 20;
          breakdown.noAIChat = 10;
          score += 30;
        }
        if (!p.websiteUri.startsWith('https://')) {
          breakdown.noSSL = 10;
          score += 10;
        }
      }

      score = Math.min(score + 15, 98);

      let tier: 'Tier 1 (High Urgency)' | 'Tier 2 (Nurture)' | 'Tier 3 (Passive)' = 'Tier 2 (Nurture)';
      let urgency = '< 2 Hour SLA — Qualified Prospect';
      if (score >= 80) {
        tier = 'Tier 1 (High Urgency)';
        urgency = '< 15 Min SLA — Immediate High-Value Opportunity';
      } else if (score < 50) {
        tier = 'Tier 3 (Passive)';
        urgency = '< 24 Hour SLA — Value-First Nurture';
      }

      const displayName = p.displayName?.text || 'Business';
      const cleanPhone = (p.nationalPhoneNumber || '').replace(/[^0-9]/g, '');

      const grandSlamOffer = isMedical
        ? {
            dreamOutcome: 'Eliminate 85% of clinic no-shows & recover 2.5 hours/day of doctor charting time',
            timeDelay: 'Live in 15 minutes, zero staff retraining required',
            effortSacrifice: 'Zero new hardware, uses clinic existing WhatsApp number and voice notes',
            guarantee: '14-Day Zero-Risk Trial — if no-shows do not drop by at least 50%, pay ₹0',
            cta: 'Reply "CLINIC" or tap the link to activate your private WhatsApp sandbox number.',
          }
        : {
            dreamOutcome: `Automate 90% of manual repetitive workflows in ${displayName}`,
            timeDelay: 'Up and running in 10 minutes with 1-click cloud sync',
            effortSacrifice: 'No change to existing software stack or vendor habits',
            guarantee: '100% Performance Guarantee or full month credited',
            cta: `Reply "DEMO" to activate your private ${saas} sandbox environment.`,
          };

      const cadence = {
        touch1_patternInterrupt: isMedical
          ? `Dr./Mr. ${displayName}, noticed that your clinic scheduling in ${location} still relies on manual reception typing on WhatsApp. Most private practices lose ~₹1.5L/month to missed follow-ups. We built MediSuite so doctors can dictate 30-second voice prescriptions and let AI automate bookings. Free for a 60-second voice demo?`
          : `Hi ${displayName}, saw your operations in ${location}. Teams like yours lose 15+ hours weekly to manual data entry and disjointed messaging. We built ${saas} to eliminate this friction in under 10 minutes. Can I send a 60-second video demo?`,
        touch2_proofOfMechanism: isMedical
          ? `${displayName}, the breakthrough mechanism is Ambient Voice Rx + Autonomous WhatsApp Booking. Prescriptions dictated in Hindi/English are instantly converted into structured EHR records and patient reminders.`
          : `${displayName}, our breakthrough engine connects directly into your existing channels without complex onboarding or API coding.`,
        touch3_interactiveDemo: isMedical
          ? `Dr. ${displayName}, test our live clinic AI receptionist right now: Message "HI" to our active WhatsApp bot +91 92780 09883 or tap https://wa.me/919278009883?text=Hi%20Demo — experience 30-second automated booking.`
          : `Hi ${displayName}, test ${saas} live in our sandbox with zero risk: https://${saas.toLowerCase().replace(/[^a-z0-9]/g, '')}.onyxiq.in/demo.`,
        touch4_softBreakup:
          `Hi ${displayName}, closing your file for this month as I know you are busy. If you ever want to automate your operations and eliminate no-shows, our 14-day zero-risk trial is always ready.`,
      };

      return {
        id: `place-${p.id}`,
        name: displayName,
        organization: displayName,
        address: p.formattedAddress || location,
        phone: cleanPhone || '919876543210',
        rawPhone: p.nationalPhoneNumber || 'N/A',
        websiteUri: p.websiteUri || null,
        rating,
        userRatingCount: reviews,
        googleMapsUri: p.googleMapsUri,
        hasWebsite,
        opportunityScore: score,
        scoreBreakdown: breakdown,
        tier,
        urgencyRouting: urgency,
        targetSaas: saas,
        channel: 'outbound' as const,
        triggerSignal: !hasWebsite
          ? 'Missing proprietary website & automated online booking'
          : `Rating ${rating} (${reviews} reviews) with manual booking friction`,
        grandSlamOffer,
        cadence,
        status: 'SCORED' as const,
        createdAt: new Date().toISOString(),
      };
    });

    res.json({
      success: true,
      total: results.length,
      query,
      leads: results,
    });
  } catch (err: any) {
    console.error('[Prospecting Error]', err);
    res.status(500).json({ success: false, error: err.message || 'Prospecting failed.' });
  }
});

// 2c. Import Discovered Outbound Lead Directly into Closed-Loop Pipeline
app.post('/api/leads/import-to-pipeline', (req: Request, res: Response) => {
  try {
    const { lead } = req.body;
    if (!lead || !lead.name) {
      return res.status(400).json({ success: false, error: 'Valid lead object is required.' });
    }

    const existingIdx = LEADS_STORE.findIndex(
      (l) => l.id === lead.id || (l.phone && lead.phone && l.phone === lead.phone)
    );

    const formattedLead: InboundLead = {
      id: lead.id || `lead-${Date.now()}`,
      name: lead.name,
      organization: lead.organization || lead.address || 'Business',
      phone: (lead.phone || '').replace(/[^0-9]/g, ''),
      email: lead.email || '',
      channel: lead.channel || 'outbound',
      triggerSignal: lead.triggerSignal || 'Outbound Google Places Prospecting',
      targetSaas: lead.targetSaas || 'MediSuite AI',
      status: 'DOSSIER_READY',
      opportunityScore: lead.opportunityScore || 85,
      tier: lead.tier || 'Tier 1 (High Urgency)',
      urgencyRouting: lead.urgencyRouting || '< 15 Min SLA — High Value Opportunity',
      grandSlamOffer: lead.grandSlamOffer || {
        dreamOutcome: 'Eliminate manual bottlenecks & recover 10+ hours weekly',
        timeDelay: 'Live in 15 minutes',
        effortSacrifice: 'Zero staff retraining',
        guarantee: '14-Day Zero-Risk Trial',
        cta: 'Reply to test live sandbox',
      },
      cadence: lead.cadence || {
        touch1_patternInterrupt: `Hi ${lead.name}, quick question regarding your operations...`,
        touch2_proofOfMechanism: 'Here is the exact mechanism...',
        touch3_interactiveDemo: 'Test our live bot at +91 92780 09883...',
        touch4_softBreakup: 'Closing your file for this month...',
      },
      createdAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      LEADS_STORE[existingIdx] = { ...LEADS_STORE[existingIdx], ...formattedLead };
    } else {
      LEADS_STORE.unshift(formattedLead);
    }

    res.json({
      success: true,
      message: `"${formattedLead.name}" pushed to Closed-Loop Pipeline as DOSSIER_READY!`,
      lead: formattedLead,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Dispatch WhatsApp Outreach Message via Baileys Bridge
app.post('/api/leads/dispatch-whatsapp', async (req: Request, res: Response) => {
  try {
    const { leadId, customMessage } = req.body;
    const lead = LEADS_STORE.find((l) => l.id === leadId);

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found in pipeline.' });
    }

    const messageToSend = customMessage || lead.cadence.touch1_patternInterrupt;
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageToSend)}`;

    let dispatchedViaBridge = false;
    let bridgeResult: any = null;

    // Attempt direct dispatch via local Baileys HTTP Send API on VM (127.0.0.1:3001)
    try {
      const response = await fetch('http://127.0.0.1:3001/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          text: messageToSend,
        }),
      });

      if (response.ok) {
        bridgeResult = await response.json();
        dispatchedViaBridge = bridgeResult.success === true;
      }
    } catch (e: any) {
      console.warn('[Baileys Dispatch Warning]', e.message);
    }

    lead.status = 'DISPATCHED';
    lead.dispatchedAt = new Date().toISOString();

    res.json({
      success: true,
      leadId: lead.id,
      phone: cleanPhone,
      dispatchedViaBridge,
      bridgeResponse: bridgeResult,
      waLink,
      message: dispatchedViaBridge
        ? `Outbound WhatsApp message dispatched directly via Baileys Bot (+919278009883) to +${cleanPhone}!`
        : `Lead marked DISPATCHED! Direct WhatsApp link prepared for 1-tap send.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Dispatch failed.' });
  }
});

// 4. Ecosystem Interconnection Telemetry
app.get('/api/ecosystem/status', async (req: Request, res: Response) => {
  const telemetry = {
    timestamp: new Date().toISOString(),
    nodes: {
      marketing_hub: {
        name: 'Onyx Marketing Command Center',
        url: 'https://marketing.onyxiq.in',
        port: PORT,
        status: 'ONLINE',
        uptime: process.uptime(),
      },
      llm_gateway: {
        name: 'OnyxIQ Unified LLMs Gateway',
        url: 'https://llm.onyxiq.in',
        port: 3200,
        status: 'UNKNOWN',
        modelsCount: 472,
      },
      whatsapp_bridge: {
        name: 'MediSuite Baileys WhatsApp Gateway',
        port: 3001,
        status: 'UNKNOWN',
        botPhone: '+919278009883',
        connected: false,
      },
      medisuite_core: {
        name: 'MediSuite Clinical AI Operating System',
        url: 'https://medisuite-agent.onyxiq.in',
        port: 3000,
        status: 'UNKNOWN',
      },
      neon_database: {
        name: 'Neon Serverless Postgres',
        table: 'prod_content',
        status: NEON_DATABASE_URL ? 'CONFIGURED' : 'UNCONFIGURED',
      },
    },
  };

  // Probe WhatsApp Bridge
  try {
    const waRes = await fetch('http://127.0.0.1:3001/health', { signal: AbortSignal.timeout(2000) });
    if (waRes.ok) {
      const waData: any = await waRes.json();
      telemetry.nodes.whatsapp_bridge.status = 'ONLINE';
      telemetry.nodes.whatsapp_bridge.connected = waData.connected === true;
      telemetry.nodes.whatsapp_bridge.botPhone = `+${waData.botPhone || '919278009883'}`;
    } else {
      telemetry.nodes.whatsapp_bridge.status = 'DEGRADED';
    }
  } catch {
    telemetry.nodes.whatsapp_bridge.status = 'OFFLINE';
  }

  // Probe LLM Gateway (Fast TCP check to prevent upstream latency timeouts)
  const isLlmOnline = await checkPort(3200);
  telemetry.nodes.llm_gateway.status = isLlmOnline ? 'ONLINE' : 'OFFLINE';
  telemetry.nodes.llm_gateway.modelsCount = 472;

  // Probe MediSuite
  try {
    const medRes = await fetch('http://127.0.0.1:3000/', { signal: AbortSignal.timeout(2000) });
    telemetry.nodes.medisuite_core.status = medRes.status < 500 ? 'ONLINE' : 'DEGRADED';
  } catch {
    telemetry.nodes.medisuite_core.status = 'OFFLINE';
  }

  res.json({
    success: true,
    ecosystem: telemetry,
  });
});

// Alias: /api/analyse-saas → /api/analyze-saas (frontend typo-safe alias)
app.post('/api/analyse-saas', async (req: Request, res: Response) => {
  try {
    const { name, category, description, url, targetAudience, keyFeatures, guarantee } = req.body;
    const profile = synthesizeSaaS({ name, category, description, url, targetAudience, keyFeatures, guarantee });
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'SaaS analysis failed.' });
  }
});

// Alias: generate-content also accepts saasProfile key
app.post('/api/generate-content', async (req: Request, res: Response) => {
  try {
    const rawProfile = req.body.saasProfile || req.body.profile;
    const platform = req.body.platform || 'linkedin';
    const customAngle = req.body.customAngle;
    if (!rawProfile || !rawProfile.name) {
      return res.status(400).json({ success: false, error: 'Valid SaaS profile (saasProfile or profile key) is required.' });
    }
    const content = await generateContentForSaaS(rawProfile, platform, customAngle);
    // Extract hooks if linkedin
    const hooks: string[] = [];
    if (platform === 'linkedin') {
      const hookMatch = content.match(/Hook 1[^\n]*:\s*([^\n]+)/);
      const hookMatch2 = content.match(/Hook 2[^\n]*:\s*([^\n]+)/);
      const hookMatch3 = content.match(/Hook 3[^\n]*:\s*([^\n]+)/);
      if (hookMatch) hooks.push(hookMatch[1].replace(/^•\s*/, ''));
      if (hookMatch2) hooks.push(hookMatch2[1].replace(/^•\s*/, ''));
      if (hookMatch3) hooks.push(hookMatch3[1].replace(/^•\s*/, ''));
    }
    res.json({ success: true, platform, content, hooks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Content generation failed.' });
  }
});

// SPA Fallback Route
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[onyx-marketing] Command Center online at http://localhost:${PORT}`);
  console.log(`[onyx-marketing] Public FQDN: https://marketing.onyxiq.in`);
});
