import { useState } from 'react';
import { WalletInput } from './components/WalletInput';
import { ComprehensivePortfolioView } from './components/ComprehensivePortfolio';
import { PaymentModal } from './components/PaymentModal';
import { ReportDisplay } from './components/ReportDisplay';
import type { ComprehensivePortfolio } from '@solana-portfolio-intelligence/shared';

// x402 Payment Required Response Structure
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

function App() {
  const [portfolio, setPortfolio] = useState<ComprehensivePortfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<X402Response | null>(null);
  const [currentReportType, setCurrentReportType] = useState<'RISK' | 'REWARDS' | 'IL' | 'YIELD' | null>(null);
  
  // Report display state
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // API URLs - Backend for free content, Facilitator for paid content
  // In production, set VITE_FACILITATOR_URL to https://x402-api.lever-labs.com
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3004/api';
  const FACILITATOR_URL = import.meta.env.VITE_FACILITATOR_URL 
    ? `${import.meta.env.VITE_FACILITATOR_URL}/x402/proxy/api`
    : 'http://localhost:3005/x402/proxy/api';

  const handleWalletSubmit = async (address: string) => {
    setLoading(true);
    setError('');
    setPortfolio(null);

    try {
      // Try comprehensive portfolio first, fallback to basic
      let response = await fetch(`${BACKEND_URL}/portfolio/${address}/comprehensive`);
      let data = await response.json();

      if (data.success) {
        setPortfolio(data.data);
      } else {
        // Fallback to basic portfolio
        response = await fetch(`${BACKEND_URL}/portfolio/${address}`);
        data = await response.json();
        if (data.success) {
          // Convert basic to comprehensive format
          setPortfolio({
            walletAddress: data.data.walletAddress,
            netWorth: data.data.totalValue,
            solBalance: 0,
            holdings: { totalValue: data.data.totalValue, tokens: data.data.holdings },
            defiPositions: [],
            totalStaked: 0,
            totalLending: 0,
            totalLP: 0,
            totalBorrowed: 0,
            claimableRewards: { totalValue: 0, rewards: [] },
            yieldEstimate: { dailyYield: 0, weeklyYield: 0, monthlyYield: 0, yearlyAPR: 0 },
            lastUpdated: data.data.lastUpdated,
          });
        } else {
          setError(data.error || 'Failed to fetch portfolio data');
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePremiumReportRequest = async (reportType: 'RISK' | 'REWARDS' | 'IL' | 'YIELD') => {
    if (!portfolio) return;

    setShowReport(false);
    setReportData(null);
    setError('');

    try {
      // PAID content goes through FACILITATOR
      const response = await fetch(`${FACILITATOR_URL}/reports/${reportType.toLowerCase()}/${portfolio.walletAddress}`);
      
      if (response.status === 402) {
        const x402Response: X402Response = await response.json();
        setPaymentDetails(x402Response);
        setCurrentReportType(reportType);
        setShowPaymentModal(true);
        return;
      }
      
      const data = await response.json();
      if (response.ok && data.success && data.data?.paymentVerified) {
        setReportData(data.data);
        setCurrentReportType(reportType);
        setShowReport(true);
      } else {
        setError(data.error || 'Failed to generate report');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handlePaymentComplete = async (paymentSignature: string) => {
    if (!portfolio || !currentReportType) return;

    try {
      const response = await fetch(`${FACILITATOR_URL}/reports/${currentReportType.toLowerCase()}/${portfolio.walletAddress}`, {
        headers: {
          'X-Payment': paymentSignature,
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success && data.data?.paymentVerified) {
        setReportData(data.data);
        setShowPaymentModal(false);
        setShowReport(true);
      } else if (response.status === 402) {
        setError(data.error || 'Payment verification failed. Please try again.');
      } else {
        setError(data.error || 'Payment verification failed');
      }
    } catch (err) {
      setError('Payment verification failed. Please try again.');
    }
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentDetails(null);
    setCurrentReportType(null);
  };

  const handleCloseReport = () => {
    setShowReport(false);
    setReportData(null);
    setCurrentReportType(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">🚉 Solana Station</h1>
          <p className="text-sm text-slate-500">Your Solana portfolio dashboard</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <span className="text-sm text-red-700">{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">×</button>
          </div>
        )}

        {/* Main */}
        {!portfolio ? (
          <WalletInput onWalletSubmit={handleWalletSubmit} loading={loading} />
        ) : (
          <div className="space-y-4">
            <ComprehensivePortfolioView portfolio={portfolio} onRequestPremiumReport={handlePremiumReportRequest} />
            <div className="text-center">
              <button
                onClick={() => { setPortfolio(null); setError(''); }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                ← Analyze another wallet
              </button>
            </div>
          </div>
        )}

        {/* Modals */}
        {showPaymentModal && paymentDetails && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={handleClosePaymentModal}
            paymentDetails={paymentDetails}
            reportType={currentReportType || ''}
            onPaymentComplete={handlePaymentComplete}
          />
        )}

        {showReport && reportData && currentReportType && (
          <ReportDisplay
            reportType={currentReportType}
            reportData={reportData}
            walletAddress={portfolio?.walletAddress || ''}
            onClose={handleCloseReport}
          />
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-xs text-slate-400">
          Solana Station • Premium reports via x402
        </div>
      </div>
    </div>
  );
}

export default App;
