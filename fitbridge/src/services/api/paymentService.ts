/**
 * paymentService.ts — Razorpay Payment Integration Scaffold
 *
 * ⚠️  SDK INSTALLATION NOTE:
 *   `react-native-razorpay` requires native modules and therefore needs either:
 *     • Expo Bare Workflow  →  npx expo install react-native-razorpay && npx expo prebuild
 *     • EAS Build          →  add the package then trigger `eas build`
 *   It CANNOT be used inside Expo Go. Add the package when switching to a bare/EAS workflow:
 *     npx expo install react-native-razorpay
 *
 *   Until then, all functions below use MOCK implementations that simulate
 *   the Razorpay flow with a 1.5 s delay and return success responses.
 *
 *   To swap in real Razorpay calls:
 *     1. Uncomment the RazorpayCheckout import below.
 *     2. Replace the mock bodies with the commented real implementations.
 *     3. Set EXPO_PUBLIC_RAZORPAY_KEY_ID in .env (Razorpay test key).
 */

// import RazorpayCheckout from 'react-native-razorpay'; // ← uncomment after EAS Build

import { API_BASE_URL } from '../../utils/constants';

// ── Constants ─────────────────────────────────────────────────────────────────

const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? 'rzp_test_PLACEHOLDER';

/** Simulate network latency for mock responses */
const mockDelay = (ms = 1500) => new Promise<void>((r) => setTimeout(r, ms));

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RazorpayOrder {
  id: string;          // Razorpay order ID  e.g. "order_XXXXXXXXXXXXX"
  amount: number;      // Amount in paise (1 INR = 100 paise)
  currency: string;    // "INR"
  receipt: string;     // Your internal session/booking ID
}

export interface PaymentResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyResult {
  verified: boolean;
  bookingId: string;
  message: string;
}

export interface RefundResult {
  refundId: string;
  status: 'processed' | 'pending' | 'failed';
  amount: number;
  message: string;
}

// ── Refund Policy ─────────────────────────────────────────────────────────────

export const REFUND_POLICY = [
  {
    window: 'Cancellation 24h+ before session',
    refundPct: 100,
    label: 'Full refund',
    color: '#22C55E', // green
  },
  {
    window: 'Cancellation 1–24h before session',
    refundPct: 50,
    label: '50% refund',
    color: '#F59E0B', // amber
  },
  {
    window: 'Same-day cancellation',
    refundPct: 0,
    label: 'No refund',
    color: '#EF4444', // red
  },
] as const;

// ── Step 1: Create Razorpay Order (via your backend) ─────────────────────────

/**
 * Creates a Razorpay order on the backend.
 * Backend should call Razorpay Orders API and return the order object.
 *
 * @param amount     Amount in INR (NOT paise — service converts internally)
 * @param currency   e.g. "INR"
 * @param sessionId  Your internal session/booking reference ID
 */
export async function createOrder(
  amount: number,
  currency: string = 'INR',
  sessionId: string,
): Promise<RazorpayOrder> {
  /* ── REAL implementation (uncomment when backend is ready) ──────────────────
  const res = await fetch(`${API_BASE_URL}/payments/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amount * 100, currency, receipt: sessionId }),
  });
  if (!res.ok) throw new Error(`Order creation failed: ${res.status}`);
  return res.json() as Promise<RazorpayOrder>;
  ─────────────────────────────────────────────────────────────────────────── */

  // MOCK
  await mockDelay();
  return {
    id: `order_MOCK_${Date.now()}`,
    amount: amount * 100,
    currency,
    receipt: sessionId,
  };
}

// ── Step 2: Open Razorpay Checkout ────────────────────────────────────────────

/**
 * Opens the Razorpay payment sheet and resolves with payment IDs on success.
 * Rejects if the user dismisses or payment fails.
 *
 * @param orderId  Razorpay order ID from createOrder()
 * @param amount   Amount in INR (display only)
 * @param name     Merchant / App name shown on checkout sheet
 * @param email    Pre-filled email
 * @param phone    Pre-filled phone (10 digits)
 */
export async function initiatePayment(
  orderId: string,
  amount: number,
  name: string = 'FitBridge',
  email: string = '',
  phone: string = '',
): Promise<PaymentResult> {
  /* ── REAL implementation (uncomment after EAS Build + SDK install) ──────────
  const options = {
    description: 'FitBridge Session Booking',
    image: 'https://fitbridge.app/logo.png',
    currency: 'INR',
    key: RAZORPAY_KEY_ID,
    amount: String(amount * 100),
    name,
    order_id: orderId,
    prefill: { email, contact: phone },
    theme: { color: '#4F46E5' },
  };
  return new Promise((resolve, reject) => {
    RazorpayCheckout.open(options)
      .then((data: PaymentResult) => resolve(data))
      .catch((err: { code: number; description: string }) => reject(new Error(err.description)));
  });
  ─────────────────────────────────────────────────────────────────────────── */

  // MOCK
  await mockDelay();
  return {
    razorpay_order_id: orderId,
    razorpay_payment_id: `pay_MOCK_${Date.now()}`,
    razorpay_signature: `sig_MOCK_${Math.random().toString(36).slice(2)}`,
  };
}

// ── Step 3: Verify Payment Signature (via your backend) ──────────────────────

/**
 * Sends Razorpay IDs to backend for HMAC-SHA256 signature verification.
 * Backend should verify using the Razorpay webhook secret and create the booking.
 */
export async function verifyPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): Promise<VerifyResult> {
  /* ── REAL implementation ────────────────────────────────────────────────────
  const res = await fetch(`${API_BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ razorpayOrderId, razorpayPaymentId, razorpaySignature }),
  });
  if (!res.ok) throw new Error(`Verification failed: ${res.status}`);
  return res.json() as Promise<VerifyResult>;
  ─────────────────────────────────────────────────────────────────────────── */

  // MOCK
  await mockDelay(600);
  return {
    verified: true,
    bookingId: `BKG_${Date.now().toString(36).toUpperCase()}`,
    message: 'Payment verified. Booking confirmed.',
  };
}

// ── Step 4: Request Refund ────────────────────────────────────────────────────

/**
 * Initiates a refund for a previously successful payment.
 * Backend calls Razorpay Refunds API.
 *
 * @param paymentId  Razorpay payment_id
 * @param amount     Refund amount in INR (partial or full)
 * @param reason     User-facing reason string
 */
export async function requestRefund(
  paymentId: string,
  amount: number,
  reason: string = 'Customer requested cancellation',
): Promise<RefundResult> {
  /* ── REAL implementation ────────────────────────────────────────────────────
  const res = await fetch(`${API_BASE_URL}/payments/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId, amount: amount * 100, reason }),
  });
  if (!res.ok) throw new Error(`Refund request failed: ${res.status}`);
  return res.json() as Promise<RefundResult>;
  ─────────────────────────────────────────────────────────────────────────── */

  // MOCK
  await mockDelay();
  return {
    refundId: `rfnd_MOCK_${Date.now()}`,
    status: 'processed',
    amount,
    message: `Refund of ₹${amount} initiated. Will reflect in 5–7 business days.`,
  };
}
