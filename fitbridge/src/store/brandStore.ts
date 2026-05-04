import { create } from 'zustand';
import { Campaign } from '../types/user.types';
import { mockCampaigns } from '../utils/mockData/mockCampaigns';

// ─────────────────────────────────────────────────────────────────────────────
// BrandStore — Brand Partner Portal state management
//
// Manages campaigns and aggregated analytics for the Brand Portal screens.
// Seeded with mock data so BrandPortalScreen renders without a backend.
// When the API is ready (Phase 3/4), replace the seed and call setCampaigns()
// with the API response inside a useBrandCampaigns() hook.
// ─────────────────────────────────────────────────────────────────────────────

/** Aggregated analytics rolled up across all campaigns */
export interface BrandAnalytics {
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalSpend: number; // INR
}

interface BrandState {
  // ── State ──────────────────────────────────────────────────────────────────

  /** Full list of campaigns for the logged-in brand partner */
  campaigns: Campaign[];

  /** Campaign open in the detail/edit view */
  selectedCampaign: Campaign | null;

  /** True while fetching campaigns or submitting a campaign draft */
  isLoading: boolean;

  /** Aggregated analytics across all campaigns — null until fetched */
  analytics: BrandAnalytics | null;

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Replace the entire campaign list (e.g. after API fetch).
   * Also recomputes analytics from the new data.
   */
  setCampaigns: (campaigns: Campaign[]) => void;

  /**
   * Append a newly-created campaign (e.g. after POST /campaigns succeeds).
   * Recomputes analytics automatically.
   */
  addCampaign: (campaign: Campaign) => void;

  /**
   * Merge partial updates into an existing campaign by ID.
   * Useful for status changes, budget updates, or metric refreshes.
   * Recomputes analytics automatically.
   */
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;

  /**
   * Set the campaign to show in the detail/edit screen.
   * Pass null to dismiss.
   */
  setSelectedCampaign: (campaign: Campaign | null) => void;

  /** Overwrite analytics with fresh data from the API */
  setAnalytics: (data: BrandAnalytics) => void;

  /** Set the loading flag */
  setLoading: (loading: boolean) => void;
}

// ── Helper: derive analytics from campaigns ───────────────────────────────────

const deriveAnalytics = (campaigns: Campaign[]): BrandAnalytics =>
  campaigns.reduce<BrandAnalytics>(
    (acc, c) => ({
      totalImpressions: acc.totalImpressions + c.metrics.impressions,
      totalClicks:      acc.totalClicks      + c.metrics.clicks,
      totalConversions: acc.totalConversions + c.metrics.conversions,
      totalSpend:       acc.totalSpend       + c.spentBudget,
    }),
    { totalImpressions: 0, totalClicks: 0, totalConversions: 0, totalSpend: 0 },
  );

// ── Store ─────────────────────────────────────────────────────────────────────

export const useBrandStore = create<BrandState>((set) => ({
  // Seeded with mock data — replace with [] when wiring to real API
  campaigns:         mockCampaigns,
  selectedCampaign:  null,
  isLoading:         false,
  analytics:         deriveAnalytics(mockCampaigns),

  // ── setCampaigns ───────────────────────────────────────────────────────────
  setCampaigns: (campaigns) =>
    set({
      campaigns,
      analytics: deriveAnalytics(campaigns),
    }),

  // ── addCampaign ────────────────────────────────────────────────────────────
  addCampaign: (campaign) =>
    set((state) => {
      const campaigns = [...state.campaigns, campaign];
      return { campaigns, analytics: deriveAnalytics(campaigns) };
    }),

  // ── updateCampaign ─────────────────────────────────────────────────────────
  updateCampaign: (id, updates) =>
    set((state) => {
      const campaigns = state.campaigns.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      );
      return {
        campaigns,
        analytics: deriveAnalytics(campaigns),
        // Keep selectedCampaign in sync if it's the one being updated
        selectedCampaign:
          state.selectedCampaign?.id === id
            ? { ...state.selectedCampaign, ...updates }
            : state.selectedCampaign,
      };
    }),

  // ── setSelectedCampaign ────────────────────────────────────────────────────
  setSelectedCampaign: (campaign) => set({ selectedCampaign: campaign }),

  // ── setAnalytics ───────────────────────────────────────────────────────────
  setAnalytics: (data) => set({ analytics: data }),

  // ── setLoading ─────────────────────────────────────────────────────────────
  setLoading: (isLoading) => set({ isLoading }),
}));
