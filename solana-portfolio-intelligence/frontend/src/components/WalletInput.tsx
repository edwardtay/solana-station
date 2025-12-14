import React, { useState } from 'react';

interface WalletInputProps {
  onWalletSubmit: (address: string) => void;
  loading: boolean;
}

// Sample wallet for quick testing (real mainnet wallet with diverse holdings)
const SAMPLE_WALLET = 'Ar1AiVfZ5XzpsVWwQ5HfJFkvydZjFgJxPLxupcX4BwQ8';

export const WalletInput: React.FC<WalletInputProps> = ({ onWalletSubmit, loading }) => {
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) onWalletSubmit(address.trim());
  };

  const handleSampleWallet = () => {
    setAddress(SAMPLE_WALLET);
    onWalletSubmit(SAMPLE_WALLET);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Analyze Wallet</h2>
        <p className="text-sm text-slate-500 mb-4">Enter a Solana address to view portfolio</p>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Solana wallet address"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !address.trim()}
            className="w-full py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading...' : 'Analyze'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={handleSampleWallet}
            disabled={loading}
            className="w-full py-2 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
          >
            Try Sample Wallet →
          </button>
        </div>
      </div>
    </div>
  );
};
