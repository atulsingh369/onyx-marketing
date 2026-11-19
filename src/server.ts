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
import { fileURLToPath } from 'url';
import pg from 'pg';
import 'dotenv/config';

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

// Inbound Content Generation
app.post('/api/generate-content', async (req: Request, res: Response) => {
  try {
    const { profile, platform, customAngle } = req.body;
    if (!profile || !profile.name) {
      return res.status(400).json({ success: false, error: 'Valid SaaS profile is required.' });
    }

    const content = await generateContentForSaaS(
      profile,
      platform || 'linkedin',
      customAngle
    );

    res.json({
      success: true,
      platform: platform || 'linkedin',
      content,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Content generation failed.' });
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

// SPA Fallback Route
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[onyx-marketing] Command Center online at http://localhost:${PORT}`);
  console.log(`[onyx-marketing] Public FQDN: https://marketing.onyxiq.in`);
});
