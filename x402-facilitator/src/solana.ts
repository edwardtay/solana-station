/**
 * Solana Transaction Verification
 * Core payment verification logic for x402 facilitator
 */

import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

export interface VerifyResult {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
  amount?: number;
}

export class SolanaVerifier {
  private connection: Connection;
  private recipient: PublicKey;

  constructor(rpcUrl: string, recipientAddress: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.recipient = new PublicKey(recipientAddress);
  }

  /**
   * Verify transaction instructions match expected payment
   */
  verifyTransaction(transaction: Transaction, expectedAmountLamports: number): VerifyResult {
    try {
      let validTransfer = false;
      let transferAmount = 0;

      for (const instruction of transaction.instructions) {
        if (instruction.programId.equals(SystemProgram.programId)) {
          const instructionType = instruction.data.readUInt32LE(0);

          if (instructionType === 2) { // Transfer
            const amount = Number(instruction.data.readBigUInt64LE(4));
            const toKey = instruction.keys[1];
            if (!toKey) continue;

            const toAccount = toKey.pubkey;

            if (toAccount.equals(this.recipient)) {
              if (amount >= expectedAmountLamports) {
                validTransfer = true;
                transferAmount = amount;
                break;
              } else {
                return {
                  isValid: false,
                  invalidReason: 'amount_insufficient',
                  amount,
                };
              }
            }
          }
        }
      }

      if (!validTransfer) {
        return {
          isValid: false,
          invalidReason: 'no_valid_transfer_to_recipient',
        };
      }

      return {
        isValid: true,
        payer: transaction.signatures[0]?.publicKey?.toString(),
        amount: transferAmount,
      };
    } catch (error) {
      return {
        isValid: false,
        invalidReason: `verification_error: ${error instanceof Error ? error.message : 'unknown'}`,
      };
    }
  }

  /**
   * Simulate transaction before settlement
   */
  async simulateTransaction(transaction: Transaction): Promise<{ success: boolean; error?: string }> {
    const simulation = await this.connection.simulateTransaction(transaction);
    if (simulation.value.err) {
      return { success: false, error: JSON.stringify(simulation.value.err) };
    }
    return { success: true };
  }

  /**
   * Submit and confirm transaction (settlement)
   */
  async settleTransaction(txBuffer: Buffer): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      const signature = await this.connection.sendRawTransaction(txBuffer, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      if (confirmation.value.err) {
        return { success: false, error: `confirmation_failed: ${JSON.stringify(confirmation.value.err)}` };
      }

      return { success: true, signature };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'settle_error' };
    }
  }

  getRecipient(): string {
    return this.recipient.toString();
  }
}
