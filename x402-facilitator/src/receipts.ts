/**
 * Receipt Cache - Prevents replay attacks
 * Short-term storage for verified payment receipts
 */

interface Receipt {
  signature: string;
  payer: string;
  amount: number;
  resource: string;
  timestamp: number;
  expiresAt: number;
}

export class ReceiptCache {
  private receipts: Map<string, Receipt> = new Map();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Store a receipt after successful payment
   */
  store(signature: string, payer: string, amount: number, resource: string): void {
    const now = Date.now();
    this.receipts.set(signature, {
      signature,
      payer,
      amount,
      resource,
      timestamp: now,
      expiresAt: now + this.TTL_MS,
    });

    // Cleanup expired receipts
    this.cleanup();
  }

  /**
   * Check if a signature has already been used (replay protection)
   */
  isUsed(signature: string): boolean {
    const receipt = this.receipts.get(signature);
    if (!receipt) return false;
    
    if (Date.now() > receipt.expiresAt) {
      this.receipts.delete(signature);
      return false;
    }
    
    return true;
  }

  /**
   * Get receipt by signature
   */
  get(signature: string): Receipt | undefined {
    const receipt = this.receipts.get(signature);
    if (receipt && Date.now() > receipt.expiresAt) {
      this.receipts.delete(signature);
      return undefined;
    }
    return receipt;
  }

  /**
   * Remove expired receipts
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [sig, receipt] of this.receipts) {
      if (now > receipt.expiresAt) {
        this.receipts.delete(sig);
      }
    }
  }
}
