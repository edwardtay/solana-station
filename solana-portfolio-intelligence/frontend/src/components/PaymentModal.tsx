import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface PaymentRequirements {
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

interface X402Response {
  x402Version: 1;
  error?: string;
  accepts?: PaymentRequirements[];
  payer?: string;
}

interface ExactSvmPayload {
  serializedTransaction: string;
}

interface PaymentPayload {
  x402Version: 1;
  scheme: 'exact';
  network: string;
  payload: ExactSvmPayload;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentDetails: X402Response | null;
  reportType: string;
  onPaymentComplete: (paymentSignature: string) => void;
}

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  connect: () => Promise<{ publicKey: PublicKey }>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
}

declare global {
  interface Window { solana?: PhantomProvider; }
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen, onClose, paymentDetails, reportType, onPaymentComplete,
}) => {
  const [processing, setProcessing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const check = async () => {
      const p = window.solana;
      if (p?.isPhantom && p.publicKey) {
        setConnected(true);
        setWalletAddr(p.publicKey.toString());
      }
    };
    check();
  }, [isOpen]);

  if (!isOpen || !paymentDetails) return null;
  const req = paymentDetails.accepts?.[0];
  if (!req) return null;

  const solAmount = (parseInt(req.maxAmountRequired, 10) / LAMPORTS_PER_SOL).toFixed(6);
  const shortAddr = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`;

  const connectWallet = async () => {
    setError('');
    const p = window.solana;
    if (!p?.isPhantom) {
      setError('Phantom not found');
      window.open('https://phantom.app/', '_blank');
      return;
    }
    try {
      const res = await p.connect();
      setConnected(true);
      setWalletAddr(res.publicKey.toString());
    } catch { setError('Connection failed'); }
  };

  const handlePay = async () => {
    const p = window.solana;
    if (!p?.publicKey) return;
    setProcessing(true);
    setError('');
    setStatus('Creating transaction...');

    try {
      const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: p.publicKey,
          toPubkey: new PublicKey(req.payTo),
          lamports: parseInt(req.maxAmountRequired, 10),
        })
      );
      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;
      tx.feePayer = p.publicKey;

      setStatus('Sign in wallet...');
      const signed = await p.signTransaction(tx);
      const serialized = signed.serialize().toString('base64');

      const payload: PaymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: req.network,
        payload: { serializedTransaction: serialized },
      };

      setStatus('Settling payment...');
      onPaymentComplete(btoa(JSON.stringify(payload)));
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Payment failed';
      // Provide user-friendly error messages
      if (errMsg.includes('User rejected')) {
        setError('Transaction cancelled by user');
      } else if (errMsg.includes('insufficient')) {
        setError('Insufficient SOL balance. Get devnet SOL from faucet.');
      } else if (errMsg.includes('blockhash')) {
        setError('Network error. Please try again.');
      } else {
        setError(errMsg);
      }
    } finally {
      setProcessing(false);
      setStatus('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-mono rounded">402</span>
              <span className="font-semibold text-slate-900">{reportType}</span>
            </div>
            <button onClick={onClose} disabled={processing} className="p-1 hover:bg-slate-100 rounded">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-center py-3 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">{solAmount} SOL</div>
            <div className="text-xs text-slate-500">Payment Required</div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Network</span>
              <span className="font-mono text-xs">{req.network}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Recipient</span>
              <span className="font-mono text-xs">{shortAddr(req.payTo)}</span>
            </div>
          </div>

          {connected ? (
            <div className="p-2 bg-emerald-50 rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-xs text-emerald-700 font-mono">{shortAddr(walletAddr || '')}</span>
            </div>
          ) : (
            <button onClick={connectWallet} className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
              Connect Phantom
            </button>
          )}

          {status && <div className="text-xs text-blue-600 text-center">{status}</div>}
          {error && <div className="text-xs text-red-600 text-center">{error}</div>}

          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500 space-y-1">
              <div>1. Sign transaction (not submitted)</div>
              <div>2. Server verifies & settles on-chain</div>
              <div>3. Content unlocked after confirmation</div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-2">
          <button onClick={onClose} disabled={processing} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">
            Cancel
          </button>
          <button onClick={handlePay} disabled={!connected || processing} className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
            {processing ? 'Processing...' : `Pay ${solAmount} SOL`}
          </button>
        </div>
      </div>
    </div>
  );
};
