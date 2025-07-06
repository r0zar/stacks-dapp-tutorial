import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ExternalLink, Zap, TrendingUp } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { formatLargeTokenAmount, formatCountdown } from '../utils/formatting';

interface FaucetSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimedAmount: number;
  currentStreak: number;
  nextRewardAmount: number;
  timeUntilNextClaim: number;
  txId?: string;
  onViewExplorer?: () => void;
  tokenImage?: string;
  tokenSymbol?: string;
}

const FaucetSuccessModal: React.FC<FaucetSuccessModalProps> = ({
  isOpen,
  onClose,
  claimedAmount,
  currentStreak,
  nextRewardAmount,
  timeUntilNextClaim,
  txId,
  onViewExplorer,
  tokenImage,
  tokenSymbol = 'TKN'
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="text-center py-8">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="relative mb-6"
        >
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          
          {/* Token rain animation */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ y: -20, opacity: 0, scale: 0 }}
                animate={{ 
                  y: 60, 
                  opacity: [0, 1, 1, 0], 
                  scale: [0, 1, 1, 0],
                  x: (Math.random() - 0.5) * 120
                }}
                transition={{ 
                  duration: 2, 
                  delay: i * 0.1,
                  ease: "easeOut"
                }}
                className="absolute left-1/2 top-1/2 w-8 h-8"
              >
                {tokenImage ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg">
                    <img
                      src={tokenImage}
                      alt={`${tokenSymbol} token`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to text if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-white text-xs font-bold">${tokenSymbol?.[0] || 'T'}</span>`;
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                    {tokenSymbol?.[0] || 'T'}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Tokens Claimed!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Successfully claimed from the faucet
          </p>
        </motion.div>

        {/* Claimed Amount Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <div className="inline-flex items-center space-x-3 px-6 py-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-2xl border border-green-200 dark:border-green-700">
            <div className="text-4xl">💰</div>
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                {formatLargeTokenAmount(claimedAmount)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Added to your balance
              </div>
            </div>
          </div>
        </motion.div>

        {/* Streak & Next Reward Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
        >
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-700">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Zap className="w-5 h-5 text-orange-600" />
              <span className="font-semibold text-orange-800 dark:text-orange-200">Current Streak</span>
            </div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              🔥 {currentStreak} days
            </div>
            {currentStreak === 1 && (
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Streak started!
              </div>
            )}
            {currentStreak > 1 && (
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Keep it going!
              </div>
            )}
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-purple-800 dark:text-purple-200">Next Reward</span>
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatLargeTokenAmount(nextRewardAmount)}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Available in {formatCountdown(timeUntilNextClaim)}
            </div>
          </div>
        </motion.div>

        {/* Transaction Info */}
        {txId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-6"
          >
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">Transaction ID</span>
                {onViewExplorer && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={ExternalLink}
                    onClick={onViewExplorer}
                    className="text-xs"
                  >
                    Explorer
                  </Button>
                )}
              </div>
              <p className="font-mono text-xs text-gray-900 dark:text-white break-all">
                {txId}
              </p>
            </div>
          </motion.div>
        )}

        {/* Milestone Messages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-6"
        >
          {currentStreak === 4 && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="text-lg">🎉</div>
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Tier 2 Unlocked! Next claims worth {formatLargeTokenAmount(75_000_000)}
              </div>
            </div>
          )}
          
          {currentStreak === 8 && (
            <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
              <div className="text-lg">🚀</div>
              <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Tier 3 Unlocked! Next claims worth {formatLargeTokenAmount(100_000_000)}
              </div>
            </div>
          )}
          
          {currentStreak === 15 && (
            <div className="p-3 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg border border-red-200 dark:border-red-700">
              <div className="text-lg">👑</div>
              <div className="text-sm font-medium text-red-800 dark:text-red-200">
                Maximum Tier Reached! {formatLargeTokenAmount(125_000_000)} per claim
              </div>
            </div>
          )}
        </motion.div>

        {/* Close Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Button onClick={onClose} size="lg" fullWidth>
            Continue
          </Button>
        </motion.div>
      </div>
    </Modal>
  );
};

export default FaucetSuccessModal;