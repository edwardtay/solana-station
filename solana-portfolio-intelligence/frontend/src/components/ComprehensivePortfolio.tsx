import React, { useState } from 'react';
import type { ComprehensivePortfolio, TokenHolding, ProtocolSummary } from '@solana-portfolio-intelligence/shared';

interface Props {
  portfolio: ComprehensivePortfolio;
  onRequestPremiumReport: (reportType: 'RISK' | 'REWARDS' | 'IL' | 'YIELD') => void;
}

type TabType = 'positions' | 'activity';

export const ComprehensivePortfolioView: React.FC<Props> = ({ portfolio, onRequestPremiumReport }) => {
  const [activeTab, setActiveTab] = useState<TabType>('positions');
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>('Holdings');

  const formatUSD = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatAmount = (v: number, decimals = 4) => v.toLocaleString('en-US', { maximumFractionDigits: decimals });
  const shortAddr = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`;

  // Combine holdings and defi into protocol summaries
  const allProtocols: ProtocolSummary[] = [
    {
      protocol: 'Holdings',
      logo: undefined,
      totalValue: portfolio.holdings.totalValue,
      positions: [],
    },
    ...portfolio.defiPositions,
  ];

  const reports = [
    { type: 'RISK' as const, title: 'Risk', price: '0.001', icon: '⚠️' },
    { type: 'REWARDS' as const, title: 'Rewards', price: '0.0005', icon: '🎁' },
    { type: 'IL' as const, title: 'IL Sim', price: '0.002', icon: '📊' },
    { type: 'YIELD' as const, title: 'Yield', price: '0.0015', icon: '💰' },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Header Card */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
                {portfolio.walletAddress.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-slate-400 font-mono text-sm">{shortAddr(portfolio.walletAddress)}</span>
            </div>
            <div className="text-sm text-slate-500">Net Worth</div>
            <div className="text-4xl font-bold">{formatUSD(portfolio.netWorth)}</div>
            <div className="text-slate-400 text-sm">{formatAmount(portfolio.solBalance, 2)} SOL</div>
          </div>
          
          {/* Yield Estimate Card */}
          {portfolio.yieldEstimate.yearlyAPR > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
              <div className="text-xs text-emerald-400 mb-1">Yield Estimate</div>
              <div className="text-2xl font-bold text-emerald-400">
                {formatUSD(portfolio.yieldEstimate.yearlyAPR > 0 ? portfolio.yieldEstimate.monthlyYield * 12 : 0)}
              </div>
              <div className="text-emerald-500 text-sm">
                +{portfolio.yieldEstimate.yearlyAPR.toFixed(2)}% APR
              </div>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-700">
          {portfolio.holdings.totalValue > 0 && (
            <div className="text-center">
              <div className="text-slate-400 text-xs mb-1">Holdings</div>
              <div className="font-semibold">{formatUSD(portfolio.holdings.totalValue)}</div>
            </div>
          )}
          {portfolio.totalStaked > 0 && (
            <div className="text-center">
              <div className="text-slate-400 text-xs mb-1">Staked</div>
              <div className="font-semibold">{formatUSD(portfolio.totalStaked)}</div>
            </div>
          )}
          {portfolio.totalLending > 0 && (
            <div className="text-center">
              <div className="text-slate-400 text-xs mb-1">Lending</div>
              <div className="font-semibold">{formatUSD(portfolio.totalLending)}</div>
            </div>
          )}
          {portfolio.totalLP > 0 && (
            <div className="text-center">
              <div className="text-slate-400 text-xs mb-1">LP</div>
              <div className="font-semibold">{formatUSD(portfolio.totalLP)}</div>
            </div>
          )}
          {portfolio.claimableRewards.totalValue > 0 && (
            <div className="text-center">
              <div className="text-slate-400 text-xs mb-1">Claimable</div>
              <div className="font-semibold text-emerald-400">{formatUSD(portfolio.claimableRewards.totalValue)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('positions')}
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'positions' 
              ? 'border-purple-600 text-purple-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📊 Positions
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'activity' 
              ? 'border-purple-600 text-purple-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📈 Activity
        </button>
      </div>

      {activeTab === 'positions' && (
        <div className="space-y-3">
          {/* Protocol Summary Pills */}
          <div className="flex flex-wrap gap-2">
            {allProtocols.filter(p => p.totalValue > 0).map((p) => (
              <button
                key={p.protocol}
                onClick={() => setExpandedProtocol(expandedProtocol === p.protocol ? null : p.protocol)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  expandedProtocol === p.protocol
                    ? 'bg-purple-50 border-purple-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {p.logo && <img src={p.logo} alt="" className="w-5 h-5 rounded-full" />}
                <span className="text-sm font-medium">{p.protocol}</span>
                <span className="text-sm text-slate-500">{formatUSD(p.totalValue)}</span>
              </button>
            ))}
          </div>

          {/* Holdings Section */}
          {expandedProtocol === 'Holdings' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💰</span>
                  <span className="font-semibold">Wallet</span>
                </div>
                <span className="font-semibold">{formatUSD(portfolio.holdings.totalValue)}</span>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="grid grid-cols-4 gap-4 px-4 py-2 text-xs text-slate-500 font-medium">
                  <div>Asset</div>
                  <div className="text-right">Balance</div>
                  <div className="text-right">Price/24h</div>
                  <div className="text-right">Value</div>
                </div>
                {portfolio.holdings.tokens.slice(0, 15).map((token) => (
                  <TokenRow key={token.mint} token={token} />
                ))}
                {portfolio.holdings.tokens.length > 15 && (
                  <div className="px-4 py-3 text-center text-sm text-slate-500">
                    +{portfolio.holdings.tokens.length - 15} more tokens
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DeFi Protocol Sections */}
          {portfolio.defiPositions.map((protocol) => (
            expandedProtocol === protocol.protocol && (
              <div key={protocol.protocol} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {protocol.logo && <img src={protocol.logo} alt="" className="w-6 h-6 rounded-full" />}
                    <span className="font-semibold">{protocol.protocol}</span>
                  </div>
                  <span className="font-semibold">{formatUSD(protocol.totalValue)}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {protocol.positions.map((pos, i) => (
                    <div key={i} className="grid grid-cols-4 gap-4 px-4 py-3 items-center">
                      <div className="flex items-center gap-2">
                        {pos.assetLogo && <img src={pos.assetLogo} alt="" className="w-6 h-6 rounded-full" />}
                        <div>
                          <div className="font-medium text-sm">{pos.assetSymbol}</div>
                          <div className="text-xs text-slate-500 capitalize">{pos.type}</div>
                        </div>
                      </div>
                      <div className="text-right text-sm">{formatAmount(pos.amount)}</div>
                      <div className="text-right">
                        {pos.apy && (
                          <span className="text-emerald-600 text-sm">{pos.apy.toFixed(2)}% APY</span>
                        )}
                      </div>
                      <div className="text-right font-medium">{formatUSD(pos.usdValue)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-slate-500">
          <div className="text-4xl mb-2">📈</div>
          <div>Activity tracking coming soon</div>
          <div className="text-sm text-slate-400">Transaction history and portfolio changes</div>
        </div>
      )}

      {/* Premium Reports */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="text-xs font-medium text-slate-500 uppercase mb-3">Premium Analytics (x402)</div>
        <div className="grid grid-cols-4 gap-2">
          {reports.map((r) => (
            <button
              key={r.type}
              onClick={() => onRequestPremiumReport(r.type)}
              className="p-3 border border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-50/50 transition-all text-center"
            >
              <span className="text-xl">{r.icon}</span>
              <div className="font-medium text-sm mt-1">{r.title}</div>
              <div className="text-xs font-mono text-purple-600">{r.price} SOL</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

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

const TokenRow: React.FC<{ token: TokenHolding }> = ({ token }) => {
  const formatUSD = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatAmount = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 4 });
  const formatPrice = (v: number) => v < 0.01 ? `$${v.toFixed(6)}` : `$${v.toFixed(2)}`;

  return (
    <div className="grid grid-cols-4 gap-4 px-4 py-3 items-center hover:bg-slate-50">
      <div className="flex items-center gap-2">
        {token.logoUri ? (
          <img src={token.logoUri} alt="" className="w-7 h-7 rounded-full" onError={(e) => e.currentTarget.style.display = 'none'} />
        ) : (
          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">
            {token.symbol.slice(0, 2)}
          </div>
        )}
        <div>
          <div className="font-medium text-sm flex items-center gap-1.5">
            {token.symbol}
            {token.isVerified && <span className="text-emerald-500">✓</span>}
            {token.category && token.category !== 'unknown' && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getCategoryStyle(token.category)}`}>
                {getCategoryLabel(token.category)}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400">{token.name.length > 20 ? token.name.slice(0, 20) + '...' : token.name}</div>
        </div>
      </div>
      <div className="text-right text-sm">{formatAmount(token.amount)}</div>
      <div className="text-right">
        <div className="text-sm">{token.price ? formatPrice(token.price) : '-'}</div>
        {token.priceChange24h !== undefined && token.priceChange24h !== 0 && (
          <div className={`text-xs ${token.priceChange24h >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
          </div>
        )}
      </div>
      <div className="text-right font-medium">{formatUSD(token.usdValue)}</div>
    </div>
  );
};
