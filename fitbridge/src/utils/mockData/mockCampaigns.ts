import { Campaign } from '../../types/user.types';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Campaign Data — 3 campaigns covering all key statuses
// Brand IDs reference BrandPartner stubs (no backend required)
// ─────────────────────────────────────────────────────────────────────────────

export const mockCampaigns: Campaign[] = [
  // ── 1. Active campaign — Supplements brand targeting weight-loss trainees ──
  {
    id: 'cmp_001',
    brandId: 'brand_001',
    brandName: 'MuscleX Nutrition',
    title: 'Summer Shred 2026',
    description:
      'Promote our new Whey Isolate Pro line to fitness enthusiasts focused on fat loss and lean muscle. Trainer shoutouts + in-app banner placements.',
    targetAudience: {
      goals: ['weight_loss', 'lean_muscle'],
      ageRange: [18, 35],
      cities: ['Mumbai', 'Bangalore', 'Pune', 'Hyderabad'],
    },
    budget: 250000,
    spentBudget: 138500,
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    status: 'active',
    trainerCollaborators: ['u1', 'u3', 'u7'], // Arjun, Rohan, Amit
    metrics: {
      impressions: 142800,
      clicks: 8412,
      conversions: 634,
      ctr: 0.0589,
    },
  },

  // ── 2. Pending approval — Apparel brand targeting yoga / mobility audience ─
  {
    id: 'cmp_002',
    brandId: 'brand_002',
    brandName: 'FlexWear India',
    title: 'Move in Style — Monsoon Collection',
    description:
      'Showcase our new breathable activewear range through trainer-led reels on FitFeed. Targeting yoga, pilates, and calisthenics communities.',
    targetAudience: {
      goals: ['flexibility', 'mindfulness', 'general_fitness'],
      ageRange: [20, 45],
      cities: ['Delhi', 'Chennai', 'Kolkata', 'Kochi'],
    },
    budget: 180000,
    spentBudget: 0,
    startDate: '2026-06-01',
    endDate: '2026-08-31',
    status: 'pending_approval',
    trainerCollaborators: ['u2', 'u8'], // Priya, Sanya
    metrics: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
    },
  },

  // ── 3. Completed campaign — Equipment brand for marathon runners ───────────
  {
    id: 'cmp_003',
    brandId: 'brand_003',
    brandName: 'StrideTech Equipment',
    title: 'Run to the Top — Q1 2026',
    description:
      'Drive awareness for our GPS-enabled smart running shoes. Campaign ran alongside the Mumbai Marathon season with sponsored trainer content.',
    targetAudience: {
      goals: ['endurance', 'marathon_prep', 'cardio'],
      ageRange: [22, 50],
      cities: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Jaipur'],
    },
    budget: 320000,
    spentBudget: 318200,
    startDate: '2026-01-05',
    endDate: '2026-03-31',
    status: 'completed',
    trainerCollaborators: ['u6', 'u10'], // Kavya, Meera
    metrics: {
      impressions: 389400,
      clicks: 21060,
      conversions: 1843,
      ctr: 0.0541,
    },
  },
];
