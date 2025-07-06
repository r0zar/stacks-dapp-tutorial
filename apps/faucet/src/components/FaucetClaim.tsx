import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Clock, TrendingUp, Users, Zap } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import FaucetSuccessModal from './FaucetSuccessModal';
import { useTokenContract } from '../contexts/TokenContractContext';
import { formatLargeTokenAmount, formatCountdown, formatDepletionEstimate, formatAddress } from '../utils/formatting';
import {
  tbbFaucetContract,
  tbbFaucetContractTestnet,
  type FaucetClaimInfo,
  type FaucetGlobalStats,
  type RewardTier
} from 'contracts';

// Removed mock data - now using contract wrapper

const FaucetClaim: React.FC = () => {
  const { wallet, tokenInfo, connect, isConnecting, getExplorerUrl } = useTokenContract();

  // Contract instance
  const faucetContract = wallet.network === 'mainnet' ? tbbFaucetContract : tbbFaucetContractTestnet;

  // State from contract
  const [claimInfo, setClaimInfo] = useState<FaucetClaimInfo | null>(null);
  const [globalStats, setGlobalStats] = useState<FaucetGlobalStats | null>(null);
  const [rewardTiers, setRewardTiers] = useState<RewardTier[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // UI state
  const [isClaiming, setIsClaiming] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastClaimedAmount, setLastClaimedAmount] = useState(0);
  const [lastTxId, setLastTxId] = useState<string>();
  const [claimError, setClaimError] = useState<string>('');

  // Load data from contract
  const loadFaucetData = async () => {
    if (!wallet.address) return;

    setIsLoadingData(true);
    try {
      const [userClaimInfo, stats, tiers] = await Promise.all([
        faucetContract.getClaimInfo(wallet.address),
        faucetContract.getGlobalStats(),
        faucetContract.getRewardTiers()
      ]);

      setClaimInfo(userClaimInfo);
      setGlobalStats(stats);
      setRewardTiers(tiers);
    } catch (error) {
      console.error('Failed to load faucet data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Load data when wallet connects or network changes
  useEffect(() => {
    if (wallet.connected && wallet.address) {
      loadFaucetData();
    }
  }, [wallet.connected, wallet.address, wallet.network]);

  // Derived values
  const currentReward = claimInfo ? faucetContract.getCurrentReward(claimInfo.streakCount) : 0;
  const nextReward = claimInfo ? faucetContract.getNextRewardAmount(claimInfo.streakCount) : 0;
  const remaining = globalStats ? globalStats.remaining : 0;
  const percentageRemaining = globalStats ? globalStats.percentageRemaining : 0;

  // Countdown timer for next claim
  useEffect(() => {
    if (claimInfo && !claimInfo.canClaimNow && claimInfo.timeUntilNextClaim > 0) {
      const timer = setInterval(() => {
        setClaimInfo(prev => {
          if (!prev) return prev;
          const newTimeUntilNext = Math.max(0, prev.timeUntilNextClaim - 1);
          return {
            ...prev,
            timeUntilNextClaim: newTimeUntilNext,
            canClaimNow: newTimeUntilNext === 0
          };
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [claimInfo?.canClaimNow, claimInfo?.timeUntilNextClaim]);

  const handleClaim = async () => {
    if (!wallet.connected) {
      connect();
      return;
    }

    if (!wallet.address || !claimInfo) {
      return;
    }

    setIsClaiming(true);
    setClaimError('');

    try {
      const result = await faucetContract.claimTokens(wallet.address);

      if (result.success) {
        setLastClaimedAmount(currentReward);
        setLastTxId(result.txId);
        setShowSuccessModal(true);

        // Reload faucet data to reflect new state
        await loadFaucetData();
      } else {
        setClaimError(result.error || 'Claim failed');
      }
    } catch (error) {
      setClaimError(`Claim failed: ${error}`);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleViewOnExplorer = () => {
    const explorerUrl = getExplorerUrl();
    window.open(explorerUrl, '_blank');
  };

  const getCurrentTierIndex = (): number => {
    if (!claimInfo) return 0;
    return faucetContract.getTierIndex(claimInfo.streakCount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 transition-colors duration-200">
      <div className="relative z-10 px-6 py-12">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Droplets className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Token Faucet
              </h1>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
              Claim massive daily rewards • Build streaks for bigger bonuses
            </p>

            {/* Urgency Banner */}
            {globalStats && (
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full text-sm font-medium">
                <Zap className="w-4 h-4" />
                <span>Faucet depletes in {formatDepletionEstimate(globalStats.estimatedDaysRemaining)} • Claim now!</span>
              </div>
            )}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Main Claim Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <Card variant="elevated" className="text-center">

                {/* Current Streak Display */}
                {claimInfo && (
                  <div className="mb-8">
                    <div className="flex items-center justify-center space-x-2 mb-3">
                      <div className="text-2xl">🔥</div>
                      <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                        Day {claimInfo.streakCount} Streak!
                      </span>
                    </div>
                  </div>
                )}

                {/* Massive Reward Display */}
                <div className="mb-8">
                  <div className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    {formatLargeTokenAmount(currentReward)}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Next claim reward
                  </p>
                </div>

                {/* Countdown or Claim Button */}
                {claimInfo && !claimInfo.canClaimNow ? (
                  <div className="mb-8">
                    <div className="text-3xl font-mono font-bold text-orange-600 dark:text-orange-400 mb-2">
                      {formatCountdown(claimInfo.timeUntilNextClaim)}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 flex items-center justify-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>Next claim available in</span>
                    </p>
                  </div>
                ) : (
                  <div className="mb-8">
                    {!wallet.connected ? (
                      <Button
                        size="xl"
                        onClick={connect}
                        loading={isConnecting}
                        className="text-lg px-12 py-4"
                      >
                        Connect Wallet to Claim
                      </Button>
                    ) : (
                      <Button
                        size="xl"
                        onClick={handleClaim}
                        loading={isClaiming}
                        className="text-lg px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        {isClaiming ? 'Claiming...' : `Claim ${formatLargeTokenAmount(currentReward)}`}
                      </Button>
                    )}
                  </div>
                )}

                {/* Reward Progression */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Reward Progression
                  </h3>
                  {rewardTiers.map((tier, index) => {
                    const isCurrentTier = index === getCurrentTierIndex();
                    const isCompleted = index < getCurrentTierIndex();

                    return (
                      <div
                        key={tier.days}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${isCurrentTier
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : isCompleted
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                          }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${isCurrentTier ? 'bg-blue-500' :
                            isCompleted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`} />
                          <span className="font-medium text-gray-900 dark:text-white">
                            Day {tier.days}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {formatLargeTokenAmount(tier.amount)}
                          </span>
                          {isCurrentTier && <span className="text-sm text-blue-600 dark:text-blue-400">← You are here</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>

            {/* Stats Sidebar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >

              {/* Personal Stats */}
              <Card variant="elevated">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Your Stats</span>
                </h3>
                <div className="space-y-4">
                  {claimInfo ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Claimed</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatLargeTokenAmount(claimInfo.totalClaimed)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Current Streak</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {claimInfo.streakCount} days
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Claims</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {claimInfo.totalClaims}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Next Tier In</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {claimInfo.streakCount >= 15 ? 'Max tier!' :
                            `${Math.max(0, (claimInfo.streakCount >= 8 ? 15 : claimInfo.streakCount >= 4 ? 8 : 4) - claimInfo.streakCount)} days`}
                        </span>
                      </div>
                    </>
                  ) : isLoadingData ? (
                    <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400">Connect wallet to view stats</div>
                  )}

                  {wallet.connected && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Connected as</div>
                      <div className="font-mono text-sm text-gray-900 dark:text-white">
                        {formatAddress(wallet.address!)}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Global Faucet Stats */}
              <Card variant="elevated">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Faucet Status</span>
                </h3>
                <div className="space-y-4">
                  {globalStats ? (
                    <>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-600 dark:text-gray-400">Remaining</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatLargeTokenAmount(remaining)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentageRemaining}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {percentageRemaining.toFixed(1)}% remaining
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Daily Target</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatLargeTokenAmount(globalStats.dailyTarget)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Est. Depletion</span>
                        <span className="font-semibold text-orange-600 dark:text-orange-400">
                          {formatDepletionEstimate(globalStats.estimatedDaysRemaining)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400">Loading faucet stats...</div>
                  )}
                </div>
              </Card>

              {/* Achievement Badge */}
              {claimInfo && claimInfo.streakCount > 0 && (
                <Card variant="elevated" className="text-center bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-700">
                  <div className="text-3xl mb-2">🏆</div>
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                    Hot Streak!
                  </h4>
                  <p className="text-sm text-yellow-600 dark:text-yellow-300">
                    {claimInfo.streakCount} consecutive days
                  </p>
                </Card>
              )}

            </motion.div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <FaucetSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        claimedAmount={lastClaimedAmount}
        currentStreak={claimInfo?.streakCount || 0}
        nextRewardAmount={nextReward}
        timeUntilNextClaim={claimInfo?.timeUntilNextClaim || 0}
        txId={lastTxId}
        onViewExplorer={handleViewOnExplorer}
        tokenImage={tokenInfo?.tokenUri?.image}
        tokenSymbol={tokenInfo?.symbol}
      />

      {/* Error Display */}
      {claimError && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 shadow-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{claimError}</p>
          <button
            onClick={() => setClaimError('')}
            className="mt-2 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default FaucetClaim;