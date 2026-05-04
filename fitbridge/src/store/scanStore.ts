/**
 * scanStore.ts — Lightweight Zustand store for AI body scan results.
 * Shared between AIScanScreen → DashboardScreen for instant real-time updates.
 */
import { create } from 'zustand';
import type { ScanAnalysisResult } from '../services/api/groqService';

interface ScanState {
  /** The most recent AI scan result — null if no scan done this session */
  latestScan:    ScanAnalysisResult | null;
  /** Timestamp of the most recent scan (ISO string) */
  lastScanAt:    string | null;
  /** Total scans done this session (approximate — real count comes from DB) */
  sessionScans:  number;

  setLatestScan: (result: ScanAnalysisResult) => void;
  clearScan:     () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  latestScan:   null,
  lastScanAt:   null,
  sessionScans: 0,

  setLatestScan: (result) =>
    set((s) => ({
      latestScan:   result,
      lastScanAt:   new Date().toISOString(),
      sessionScans: s.sessionScans + 1,
    })),

  clearScan: () =>
    set({ latestScan: null, lastScanAt: null }),
}));
