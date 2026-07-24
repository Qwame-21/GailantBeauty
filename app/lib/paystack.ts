"use client";

/**
 * Paystack inline payment integration for Gailant Beauty.
 *
 * Key convention: NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY (see .env.example)
 * The Paystack JS script is loaded lazily on first use — no script tag in HTML required.
 *
 * Usage:
 *   import { openPaystackPayment } from "./lib/paystack";
 *   await openPaystackPayment({ email, amountGHS: 10, onSuccess, onClose });
 */

declare global {
  interface Window {
    PaystackPop: {
      setup(config: PaystackSetupConfig): { openIframe(): void };
    };
  }
}

type PaystackSetupConfig = {
  key: string;
  email: string;
  /** Amount in pesewas (GHS × 100). */
  amount: number;
  currency: string;
  ref: string;
  metadata?: Record<string, unknown>;
  callback(response: { reference: string; status: string }): void;
  onClose(): void;
};

export type PaystackPaymentConfig = {
  email: string;
  /** Amount in Ghana Cedis. Converted to pesewas internally. */
  amountGHS: number;
  /** Optional reference string. Auto-generated if not provided. */
  ref?: string;
  metadata?: Record<string, unknown>;
  onSuccess(reference: string): void;
  onClose(): void;
};

const PAYSTACK_SCRIPT_SRC = "https://js.paystack.co/v1/inline.js";
type ScriptState = "idle" | "loading" | "ready" | "error";

let scriptState: ScriptState = "idle";
const pendingResolvers: Array<(ok: boolean) => void> = [];

function loadPaystackScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (scriptState === "ready") { resolve(true); return; }
    if (scriptState === "error") { resolve(false); return; }

    pendingResolvers.push(resolve);

    if (scriptState === "loading") return; // already in flight

    scriptState = "loading";
    const script = document.createElement("script");
    script.src = PAYSTACK_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      scriptState = "ready";
      pendingResolvers.splice(0).forEach(r => r(true));
    };
    script.onerror = () => {
      scriptState = "error";
      pendingResolvers.splice(0).forEach(r => r(false));
    };
    document.head.appendChild(script);
  });
}

export function getPaystackKey(): string {
  return process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";
}

/**
 * Open the Paystack inline payment popup.
 *
 * - Lazily loads the Paystack JS SDK on first call.
 * - Reads the public key from NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.
 * - Throws if the key is missing or the SDK fails to load.
 * - Payment outcomes are delivered via onSuccess / onClose callbacks.
 */
export async function openPaystackPayment(config: PaystackPaymentConfig): Promise<void> {
  const loaded = await loadPaystackScript();

  if (!loaded || typeof window.PaystackPop === "undefined") {
    throw new Error(
      "Paystack could not be loaded. Check your internet connection and try again."
    );
  }

  const key = getPaystackKey();
  if (!key) {
    throw new Error(
      "Paystack is not configured. Add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to your .env.local file."
    );
  }

  const ref =
    config.ref ??
    `GB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  window.PaystackPop.setup({
    key,
    email: config.email,
    // GHS → pesewas: multiply by 100 and round to avoid floating-point drift
    amount: Math.round(config.amountGHS * 100),
    currency: "GHS",
    ref,
    metadata: config.metadata,
    callback(response) {
      config.onSuccess(response.reference);
    },
    onClose() {
      config.onClose();
    },
  }).openIframe();
}
