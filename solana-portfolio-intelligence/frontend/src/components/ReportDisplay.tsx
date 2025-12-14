import React from 'react';
import type { RiskAnalysis, RewardsReport, ILSimulation, YieldAnalysis } from '@solana-portfolio-intelligence/shared';

interface ReportDisplayProps {
  reportType: 'RISK' | 'REWARDS' | 'IL' | 'YIELD';
  reportData: any;
  walletAddress: string;
  onClose: () => void;
}

export const ReportDisplay: React.FC<ReportDisplayProps> = ({
  reportType,
  reportData,
  walletAddress,
  onClose,
}) => {
  const formatUSD = (v: number) => `$${v.toFixed(2)}`;
  const formatPct = (v: number) => `${v.toFixed(1)}%`;
  const shortAddr = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  const riskColor = (level: 'LOW' | 'MEDIUM' | 'HIGH') => {
    const colors = { LOW: 'text-emerald-600', MEDIUM: 'text-amber-600', HIGH: 'text-red-600' };
    return colors[level];
  };

  const renderRisk = (data: RiskAnalysis) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <div>
          <div className="text-2xl font-bold">{data.overallRiskScore}/100</div>
          <div className="text-xs text-slate-500">Risk Score</div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-semibold ${data.overallRiskScore < 30 ? 'text-emerald-600' : data.overallRiskScore < 60 ? 'text-amber-600' : 'text-red-600'}`}>
            {data.overallRiskScore < 30 ? 'Low' : data.overallRiskScore < 60 ? 'Medium' : 'High'} Risk
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 bg-slate-50 rounded">
          <div className="text-lg font-semibold">{formatPct(data.concentrationRisk.topTokenPercentage)}</div>
          <div className="text-xs text-slate-500">Top Position</div>
        </div>
        <div className="p-3 bg-slate-50 rounded">
          <div className="text-lg font-semibold">{formatPct(data.concentrationRisk.topThreeTokensPercentage)}</div>
          <div className="text-xs text-slate-500">Top 3</div>
        </div>
        <div className="p-3 bg-slate-50 rounded">
          <div className="text-lg font-semibold">{data.concentrationRisk.diversificationScore}/100</div>
          <div className="text-xs text-slate-500">Diversity</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-slate-500 uppercase">Protocol Exposure</div>
        {data.protocolExposure.slice(0, 4).map((p, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{p.protocol}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${riskColor(p.riskLevel)} bg-opacity-10`}>{p.riskLevel}</span>
            </div>
            <span className="text-sm font-mono">{formatPct(p.exposure)}</span>
          </div>
        ))}
      </div>

      {data.recommendations.length > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-xs font-medium text-blue-800 mb-1">Recommendation</div>
          <div className="text-sm text-blue-700">{data.recommendations[0]}</div>
        </div>
      )}
    </div>
  );

  const renderRewards = (data: RewardsReport) => (
    <div className="space-y-4">
      <div className="text-center p-4 bg-emerald-50 rounded-lg">
        <div className="text-3xl font-bold text-emerald-600">{formatUSD(data.totalUnclaimedValue)}</div>
        <div className="text-xs text-emerald-700">Total Unclaimed</div>
      </div>

      {data.rewards.length > 0 ? (
        <div className="space-y-2">
          {data.rewards.map((r, i) => (
            <div key={i} className="p-3 border border-slate-200 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium text-sm">{r.protocol}</div>
                  <div className="text-xs text-slate-500">{r.tokenSymbol}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-emerald-600">{formatUSD(r.usdValue)}</div>
                  <div className="text-xs text-slate-500 font-mono">{r.amount.toFixed(4)} {r.tokenSymbol}</div>
                </div>
              </div>
              <div className="text-xs text-slate-600">{r.claimInstructions}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-500 text-sm">No unclaimed rewards found</div>
      )}
    </div>
  );

  const renderIL = (data: ILSimulation) => (
    <div className="space-y-4">
      <div className="text-center p-4 bg-orange-50 rounded-lg">
        <div className="text-3xl font-bold text-orange-600">{formatPct(data.currentIL)}</div>
        <div className="text-xs text-orange-700">Current IL</div>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium text-slate-500 uppercase">Scenarios</div>
        <div className="grid grid-cols-4 gap-1 text-xs text-slate-500 font-medium py-1">
          <div>Change</div>
          <div>Time</div>
          <div className="text-right">IL</div>
          <div className="text-right">Break-even</div>
        </div>
        {data.scenarios.slice(0, 6).map((s, i) => (
          <div key={i} className="grid grid-cols-4 gap-1 text-sm py-1.5 border-b border-slate-100">
            <div className={s.priceChange >= 0 ? 'text-emerald-600' : 'text-red-600'}>
              {s.priceChange >= 0 ? '+' : ''}{s.priceChange}%
            </div>
            <div className="text-slate-600">{s.timeHorizon}</div>
            <div className="text-right font-mono">{formatPct(s.projectedIL)}</div>
            <div className="text-right font-mono">{formatPct(s.breakEvenPoint)}</div>
          </div>
        ))}
      </div>

      {data.recommendations.length > 0 && (
        <div className="p-3 bg-orange-50 rounded-lg">
          <div className="text-xs font-medium text-orange-800 mb-1">Tip</div>
          <div className="text-sm text-orange-700">{data.recommendations[0]}</div>
        </div>
      )}
    </div>
  );

  const renderYield = (data: YieldAnalysis) => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-xl font-bold text-blue-600">{formatPct(data.totalAPY)}</div>
          <div className="text-xs text-blue-700">APY</div>
        </div>
        <div className="p-3 bg-emerald-50 rounded-lg">
          <div className="text-xl font-bold text-emerald-600">{formatPct(data.netReturn)}</div>
          <div className="text-xs text-emerald-700">Net Return</div>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="text-xl font-bold text-slate-600">{formatPct(data.gasCostRatio)}</div>
          <div className="text-xs text-slate-500">Gas Ratio</div>
        </div>
      </div>

      {data.positions.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-500 uppercase">Positions</div>
          {data.positions.map((p, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
              <div>
                <div className="font-medium text-sm">{p.protocol}</div>
                <div className="text-xs text-slate-500">{p.type}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-blue-600">{formatPct(p.apy)} APY</div>
                <div className="text-xs text-slate-500">{formatUSD(p.tvl)} TVL</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-500 text-sm">No yield positions found</div>
      )}

      {data.optimizationSuggestions.length > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-xs font-medium text-blue-800 mb-1">Optimization</div>
          <div className="text-sm text-blue-700">{data.optimizationSuggestions[0]}</div>
        </div>
      )}
    </div>
  );

  const titles: Record<string, string> = {
    RISK: 'Risk Analysis',
    REWARDS: 'Unclaimed Rewards',
    IL: 'Impermanent Loss',
    YIELD: 'Yield Analysis',
  };

  const renderContent = () => {
    switch (reportType) {
      case 'RISK': return renderRisk(reportData.analysis);
      case 'REWARDS': return renderRewards(reportData.report);
      case 'IL': return renderIL(reportData.simulation);
      case 'YIELD': return renderYield(reportData.analysis);
    }
  };

  const renderPaymentReceipt = () => {
    if (!reportData.paymentVerified || !reportData.paymentDetails) return null;
    
    const { signature, explorerUrl, payer } = reportData.paymentDetails;
    
    return (
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg mb-4">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium text-emerald-700">Payment Verified</span>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Transaction</span>
            <a 
              href={explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-emerald-600 hover:text-emerald-700 font-mono flex items-center gap-1"
            >
              {signature ? shortAddr(signature) : 'View'}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          {payer && (
            <div className="flex justify-between">
              <span className="text-slate-500">Payer</span>
              <span className="font-mono text-slate-600">{shortAddr(payer)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 className="font-semibold text-slate-900">{titles[reportType]}</h2>
            <p className="text-xs text-slate-500 font-mono">{shortAddr(walletAddress)}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-60px)]">
          {renderPaymentReceipt()}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
