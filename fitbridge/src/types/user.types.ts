// ─────────────────────────────────────────────────────────────────────────────
// FitBridge User Types (v3)
// Roles: trainee | trainer | org | brand | admin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All user roles in the FitBridge ecosystem.
 *   trainee  — end-user discovering / booking fitness sessions
 *   trainer  — certified professional offering sessions
 *   org      — gym/studio managing multiple trainers + group bookings
 *   brand    — brand partner / sponsor with access to the Brand Portal
 *   admin    — platform administrator (web-only admin panel)
 */
export type UserRole = 'trainee' | 'trainer' | 'org' | 'brand' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;                  // for OTP auth (Phase 2)
  avatar?: string;
  role: UserRole;
  subscriptionTier?: 'free' | 'premium'; // user subscription level
  isEmailVerified?: boolean;       // email verification flag
  isVerified?: boolean;            // @deprecated — use isEmailVerified
  lastActiveAt?: string;           // ISO timestamp of last app activity
  deviceSessions?: DeviceSession[]; // active device sessions (Phase 2)
  createdAt: string;
  updatedAt?: string;
}

/** Represents an active login session on a specific device */
export interface DeviceSession {
  sessionId: string;
  deviceName: string;            // e.g. "iPhone 14 Pro"
  deviceOs: string;              // e.g. "iOS 17.4"
  lastActive: string;            // ISO timestamp
  isCurrent: boolean;
}

export interface Trainer {
  id: string;
  userId: string;
  name: string;
  specialisation: string[];
  rating: number;
  reviewCount: number;
  pricePerSession: number;
  photo: string;
  verified: boolean;
  bio: string;
  tags: string[];
  availability: string[];
  totalClients: number;
  experience: number;            // years
  location: string;
  certifications?: string[];     // e.g. ['ACE', 'NSCA', 'NASM']
  languages?: string[];          // e.g. ['English', 'Hindi']
}

export interface Organisation {
  id: string;
  userId: string;                // linked User.id with role 'org'
  name: string;
  logo?: string;
  plan: 'starter' | 'pro' | 'enterprise';
  trainerIds?: string[];         // managed trainer IDs
  totalMembers?: number;
  address?: string;
}

/**
 * Brand Partner — sponsor/advertiser with access to the Brand Portal.
 * Linked to a User account with role 'brand'.
 */
export interface BrandPartner {
  id: string;
  userId: string;                  // linked User.id with role 'brand'
  companyName: string;
  logo?: string;
  industry: 'supplements' | 'apparel' | 'equipment' | 'other';
  website?: string;
  contactPerson: string;           // primary contact name
  verified: boolean;               // platform-verified partner
  activeCampaigns: number;         // count of currently active campaigns
  totalBudgetSpent: number;        // cumulative spend in INR
  createdAt: string;
}

/**
 * Campaign — a brand advertising/collaboration campaign.
 * Brands create campaigns; trainers can join as collaborators.
 */
export interface Campaign {
  id: string;
  brandId: string;                 // BrandPartner.id
  brandName: string;
  title: string;
  description: string;

  /** Targeting criteria for the campaign audience */
  targetAudience: {
    goals?: string[];              // e.g. ['weight_loss', 'muscle_gain']
    ageRange?: [number, number];   // e.g. [18, 35]
    cities?: string[];             // e.g. ['Mumbai', 'Bangalore']
  };

  budget: number;                  // total campaign budget in INR
  spentBudget: number;             // INR spent so far
  startDate: string;               // ISO date string
  endDate: string;                 // ISO date string

  status:
    | 'draft'
    | 'pending_approval'
    | 'active'
    | 'paused'
    | 'completed'
    | 'rejected';

  trainerCollaborators: string[];  // trainer User IDs joined to campaign

  /** Real-time performance metrics */
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;                   // click-through rate (0–1)
  };
}
