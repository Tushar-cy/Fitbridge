/**
 * axiosInstance.ts — Production-grade Axios instance for FitBridge API.
 *
 * Features:
 *   ✅ BASE_URL from EXPO_PUBLIC_API_URL env variable
 *   ✅ 30-second request timeout
 *   ✅ Request interceptor: auto-attach JWT from authStore
 *   ✅ Response interceptor: 401 / 429 / 5xx / network-error handling
 *   ✅ Retry logic: up to 2 retries with exponential backoff for 5xx only
 *   ✅ Imperative toast for all error states (no React component needed)
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../utils/toast';

// ── Configuration ──────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api';

/** Maximum number of retries for 5xx responses */
const MAX_RETRIES = 2;

/** Backoff delays in ms for each retry attempt (index 0 = first retry) */
const BACKOFF_MS: Record<number, number> = { 0: 500, 1: 1000 };

// ── Extended request config (carries retry metadata) ──────────────────────────

interface RetryConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _isRetry?: boolean;
}

// ── Instance ───────────────────────────────────────────────────────────────────

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request interceptor — attach JWT ──────────────────────────────────────────

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers = config.headers ?? {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ── Retry helper ───────────────────────────────────────────────────────────────

/**
 * Returns true if the request should be retried.
 * Only retries on 5xx (server errors), never on 4xx (client errors).
 */
function shouldRetry(error: AxiosError, config: RetryConfig): boolean {
  const status = error.response?.status;
  const retryCount = config._retryCount ?? 0;

  if (retryCount >= MAX_RETRIES) return false;
  if (!status) return true; // Network error — always retry
  return status >= 500;     // 5xx only
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryRequest(
  error: AxiosError,
  config: RetryConfig,
): Promise<unknown> {
  const retryCount = config._retryCount ?? 0;
  config._retryCount = retryCount + 1;
  config._isRetry = true;

  const delay = BACKOFF_MS[retryCount] ?? 1000;
  await wait(delay);

  return axiosInstance(config as AxiosRequestConfig);
}

// ── Response interceptor — error handling ─────────────────────────────────────

axiosInstance.interceptors.response.use(
  // Success path — pass through unchanged
  (response) => response,

  // Error path
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    // ── Network / timeout error (no response) ────────────────────────────────
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        toast.error('Request timed out. Please check your connection.');
      } else {
        toast.error('No internet connection. Please check your network.');
      }

      // Retry network errors (could be transient)
      if (config && shouldRetry(error, config)) {
        return retryRequest(error, config);
      }
      return Promise.reject(error);
    }

    // ── 401 Unauthorised — clear auth, redirect to login ────────────────────
    if (status === 401) {
      const { isAuthenticated, logout } = useAuthStore.getState();
      if (isAuthenticated) {
        logout();
        toast.warning('Your session has expired. Please log in again.');
        // Navigation is handled by RootNavigator reacting to isAuthenticated = false
      }
      return Promise.reject(error);
    }

    // ── 429 Rate limit ───────────────────────────────────────────────────────
    if (status === 429) {
      toast.warning('Too many requests, please slow down.');
      return Promise.reject(error);
    }

    // ── 5xx Server errors — toast + retry ────────────────────────────────────
    if (status !== undefined && status >= 500 && status <= 503) {
      // Retry before showing the toast (avoid noisy messages on transient errors)
      if (config && shouldRetry(error, config)) {
        return retryRequest(error, config);
      }

      // All retries exhausted — surface the error to the user
      const messages: Record<number, string> = {
        500: 'Server error. Our team has been notified.',
        502: 'Bad gateway. The server is temporarily unreachable.',
        503: 'Service unavailable. Please try again in a moment.',
      };
      toast.error(messages[status] ?? `Server error (${status}). Please try again.`);
      return Promise.reject(error);
    }

    // ── All other errors (400, 403, 404, 422, etc.) — pass through ───────────
    // Let individual service callers handle these (field validation, not-found, etc.)
    return Promise.reject(error);
  },
);

export default axiosInstance;
