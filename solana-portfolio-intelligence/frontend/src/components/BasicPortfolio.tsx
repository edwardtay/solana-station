import React from 'react';
import type { BasicPortfolioData, TokenHolding } from '@solana-portfolio-intelligence/shared';

interface BasicPortfolioProps {
  portfolio: BasicPortfolioData;
  onRequestPremiumReport: (reportType: 'RISK' | 'REWARDS' | 'IL' | 'YIELD') => void;
}

const getCategoryStyle = (category: TokenHolding['category']): string => {
  const styles: Record<string, string> = {
    native: 'bg-purple-100 text-purple-700',
    stablecoin: 'bg-green-100 text-green-700',
    lst: 'bg-blue-100 text-blue-700',
    defi: 'bg-indigo-100 text-indigo-700',
    'defi-lp': 'bg-cyan-100 text-cyan-700',
    meme: 'bg-orange-100 text-orange-700',
    bridged: 'bg-slate-100 text-slate-700',
    gaming: 'bg-pink-100 text-pink-700',
    infrastructure: 'bg-amber-100 text-amber-700',
  };
  return styles[category || ''] || 'bg-slate-100 text-slate-600';
};

const getCategoryLabel = (category: TokenHolding['category']): string => {
  const labels: Record<string, string> = {
    native: 'Native',
    stablecoin: 'Stable',
    lst: 'LST',
    defi: 'DeFi',
    'defi-lp': 'LP',
    meme: 'Meme',
    bridged: 'Bridge',
    gaming: 'Gaming',
    infrastructure: 'Infra',
  };
  return labels[category || ''] || category || '';
};

export const BasicPortfolio: React.FC<BasicPortfolioProps> = ({ portfolio, onRequestPremiumReport }) => {
  const formatUSD = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatAmount = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 4 });
  const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  const reports = [
    { type: 'RISK' as const, title: 'Risk', desc: 'Protocol exposure & concentration', price: '0.001', icon: '⚠️' },
    { type: 'REWARDS' as const, title: 'Rewards', desc: 'Unclaimed staking & LP rewards', price: '0.0005', icon: '🎁' },
    { type: 'IL' as const, title: 'IL Sim', desc: 'Impermanent loss scenarios', price: '0.002', icon: '📊' },
    { type: 'YIELD' as const, title: 'Yield', desc: 'Net yield vs gas analysis', price: '0.0015', icon: '💰' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-slate-500 font-mono">{shortAddr(portfolio.walletAddress)}</div>
            <div className="text-2xl font-bold text-slate-900">{formatUSD(portfolio.totalValue)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">{portfolio.tokenCount} tokens</div>
            <div className="text-xs text-slate-400">{new Date(portfolio.lastUpdated).toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Holdings */}
        <div className="max-h-96 overflow-y-auto space-y-1">
          {portfolio.holdings.map((h) => (
            <div key={h.mint} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2">
                {h.logoUri ? (
                  <img src={h.logoUri} alt="" className="w-7 h-7 rounded-full" onError={(e) => e.currentTarget.style.display = 'none'} />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                    {h.symbol.slice(0, 2)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm text-slate-900">{h.symbol}</span>
                    {h.category && h.category !== 'unknown' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getCategoryStyle(h.category)}`}>
                        {getCategoryLabel(h.category)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{h.name.length > 20 ? h.name.slice(0, 20) + '...' : h.name}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{formatUSD(h.usdValue)}</div>
                <div className="text-xs text-slate-400">{formatAmount(h.amount)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Premium Reports */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="text-xs font-medium text-slate-500 uppercase mb-3">Premium Analytics (x402)</div>
        <div className="grid grid-cols-2 gap-2">
          {reports.map((r) => (
            <button
              key={r.type}
              onClick={() => onRequestPremiumReport(r.type)}
              className="p-3 border border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-50/50 transition-all text-left group"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{r.icon}</span>
                <span className="font-medium text-sm text-slate-900">{r.title}</span>
              </div>
              <div className="text-xs text-slate-500 mb-2">{r.desc}</div>
              <div className="text-xs font-mono text-purple-600">{r.price} SOL</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
