/**
 * x402 Protocol Types - EXACT match to Coinbase x402 spec
 * https://github.com/coinbase/x402
 */

export interface PaymentRequirements {
  scheme: 'exact';
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: Record<string, unknown>;
}

export interface X402Response {
  x402Version: 1;
  error?: string;
  accepts?: PaymentRequirements[];
  payer?: string;
}

export interface ExactSvmPayload {
  transaction?: string;
  serializedTransaction?: string;
}

export interface PaymentPayload {
  x402Version: 1;
  scheme: 'exact';
  network: string;
  payload: ExactSvmPayload;
}

export interface SettleResponse {
  success: boolean;
  errorReason?: string;
  payer?: string;
  transaction: string;
  network: string;
}

// Protected resource configuration
export interface ProtectedResource {
  pattern: RegExp;
  price: number; // lamports
  description: string;
}
