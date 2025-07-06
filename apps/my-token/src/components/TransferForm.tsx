import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, ArrowRight, CheckCircle, AlertCircle, Wallet, ExternalLink } from 'lucide-react';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { useTokenContract } from '../contexts/TokenContractContext';
import { formatTokenAmount, formatAddress, isValidStacksAddress, formatFeeAmount } from '../utils/formatting';

interface TransferData {
  recipient: string;
  amount: number;
  memo: string;
}

interface TransferStatus {
  status: 'idle' | 'confirming' | 'pending' | 'success' | 'error';
  txId?: string;
  error?: string;
}

const TransferForm: React.FC = () => {
  const { wallet, transfer, connect, isConnecting, getExplorerUrl } = useTokenContract();
  const [formData, setFormData] = useState<TransferData>({
    recipient: '',
    amount: 0,
    memo: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [transferStatus, setTransferStatus] = useState<TransferStatus>({ status: 'idle' });
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const estimatedFee = 0.0003; // STX
  const maxAmount = Number(wallet.balance);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.recipient.trim()) {
      newErrors.recipient = 'Recipient address is required';
    } else if (!isValidStacksAddress(formData.recipient)) {
      newErrors.recipient = 'Invalid Stacks address format';
    } else if (formData.recipient === wallet.address) {
      newErrors.recipient = 'Cannot send to yourself';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (formData.amount > maxAmount) {
      newErrors.amount = `Amount exceeds balance (${formatTokenAmount(maxAmount, 'TKN')})`;
    }

    if (formData.memo.length > 34) {
      newErrors.memo = 'Memo must be 34 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof TransferData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet.connected) {
      connect();
      return;
    }

    if (!validateForm()) return;

    setShowConfirmModal(true);
  };

  const executeTransfer = async () => {
    setShowConfirmModal(false);
    setTransferStatus({ status: 'confirming' });

    try {
      const result = await transfer({
        amount: formData.amount,
        recipient: formData.recipient,
        memo: formData.memo || undefined,
      });

      if (result.success) {
        setTransferStatus({
          status: 'success',
          txId: result.txId,
        });
        // Reset form
        setFormData({ recipient: '', amount: 0, memo: '' });
      } else {
        setTransferStatus({
          status: 'error',
          error: result.error || 'Transfer failed',
        });
      }
    } catch (error) {
      setTransferStatus({
        status: 'error',
        error: `Transfer failed: ${error}`,
      });
    }
  };

  const resetTransferStatus = () => {
    setTransferStatus({ status: 'idle' });
  };

  const handleViewOnExplorer = () => {
    const explorerUrl = getExplorerUrl();
    window.open(explorerUrl, '_blank');
  };

  const handleMaxClick = () => {
    handleInputChange('amount', maxAmount);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Transfer Tokens</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Send tokens to any Stacks address instantly and securely.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card variant="elevated">
          {!wallet.connected ? (
            <div className="text-center py-12">
              <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Connect your Stacks wallet to start transferring tokens.
              </p>
              <Button onClick={connect} loading={isConnecting} size="lg">
                Connect Wallet
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Wallet Info */}
              <div className="p-4 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-lg border border-primary-200 dark:border-primary-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Your Balance</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatTokenAmount(maxAmount, 'TKN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Connected as</p>
                    <p className="text-sm font-mono text-gray-900 dark:text-white">
                      {formatAddress(wallet.address!)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recipient */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Recipient Address
                </label>
                <Input
                  placeholder="SP... or ST..."
                  value={formData.recipient}
                  onChange={(e) => handleInputChange('recipient', e.target.value)}
                  error={errors.recipient}
                  disabled={transferStatus.status !== 'idle'}
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (TKN)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.amount || ''}
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                    error={errors.amount}
                    disabled={transferStatus.status !== 'idle'}
                    min="0"
                    step="0.000001"
                  />
                  <button
                    type="button"
                    onClick={handleMaxClick}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-600 hover:text-primary-700 text-sm font-medium disabled:opacity-50"
                    disabled={transferStatus.status !== 'idle'}
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Memo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Memo (optional)
                </label>
                <Input
                  placeholder="Optional transaction memo"
                  value={formData.memo}
                  onChange={(e) => handleInputChange('memo', e.target.value)}
                  error={errors.memo}
                  disabled={transferStatus.status !== 'idle'}
                  maxLength={34}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formData.memo.length}/34 characters
                </p>
              </div>

              {/* Fee Estimation */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Estimated Fee</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatFeeAmount(estimatedFee)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                size="lg"
                disabled={transferStatus.status !== 'idle'}
                loading={transferStatus.status === 'confirming'}
              >
                {transferStatus.status === 'confirming' ? 'Confirming...' : 'Send Tokens'}
              </Button>
            </form>
          )}
        </Card>
      </motion.div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Transfer"
      >
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">To</span>
              <span className="font-mono text-sm text-gray-900 dark:text-white">{formatAddress(formData.recipient)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Amount</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatTokenAmount(formData.amount, 'TKN')}</span>
            </div>
            {formData.memo && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Memo</span>
                <span className="text-sm text-gray-900 dark:text-white">{formData.memo}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-3">
              <span className="text-gray-600 dark:text-gray-400">Network Fee</span>
              <span className="text-sm text-gray-900 dark:text-white">{formatFeeAmount(estimatedFee)}</span>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={executeTransfer}
              fullWidth
            >
              Confirm Transfer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Status Modal */}
      {transferStatus.status !== 'idle' && (
        <Modal
          isOpen={true}
          onClose={resetTransferStatus}
          title={
            transferStatus.status === 'success' ? 'Transfer Successful' :
              transferStatus.status === 'error' ? 'Transfer Failed' :
                'Processing Transfer'
          }
        >
          <div className="text-center py-6">
            {transferStatus.status === 'success' && (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Your transfer has been submitted successfully!
                </p>
                {transferStatus.txId && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Transaction ID</p>
                      <button
                        onClick={handleViewOnExplorer}
                        className="flex items-center space-x-1 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                        title="View Contract on Explorer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="text-xs">Contract</span>
                      </button>
                    </div>
                    <p className="font-mono text-xs break-all text-gray-900 dark:text-white">{transferStatus.txId}</p>
                  </div>
                )}
              </>
            )}

            {transferStatus.status === 'error' && (
              <>
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {transferStatus.error}
                </p>
              </>
            )}

            {transferStatus.status === 'confirming' && (
              <>
                <div className="w-16 h-16 mx-auto mb-4">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  Please confirm the transaction in your wallet...
                </p>
              </>
            )}
          </div>

          <Button onClick={resetTransferStatus} fullWidth>
            Close
          </Button>
        </Modal>
      )}
    </div>
  );
};

export default TransferForm;