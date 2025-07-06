import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, ArrowRight, CheckCircle, AlertCircle, Wallet } from 'lucide-react';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { useMockWallet } from '../hooks/useMockWallet';
import { simulateApiDelay } from '../utils/mockData';
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
  const { wallet, connect, isConnecting } = useMockWallet();
  const [formData, setFormData] = useState<TransferData>({
    recipient: '',
    amount: 0,
    memo: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [transferStatus, setTransferStatus] = useState<TransferStatus>({ status: 'idle' });
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const estimatedFee = 0.002; // STX
  const maxAmount = wallet.balance;

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
      newErrors.amount = 'Insufficient balance';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setShowConfirmModal(true);
  };

  const handleConfirmTransfer = async () => {
    setShowConfirmModal(false);
    setTransferStatus({ status: 'confirming' });

    try {
      await simulateApiDelay(1000);
      setTransferStatus({ status: 'pending' });
      
      await simulateApiDelay(2000);
      
      const txId = `0x${Math.random().toString(16).substring(2, 66)}`;
      setTransferStatus({ status: 'success', txId });
      
      // Reset form
      setFormData({ recipient: '', amount: 0, memo: '' });
      
    } catch (error) {
      setTransferStatus({ 
        status: 'error', 
        error: 'Transfer failed. Please try again.' 
      });
    }
  };

  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, amount: numValue }));
  };

  const setMaxAmount = () => {
    setFormData(prev => ({ ...prev, amount: maxAmount }));
  };

  const resetTransfer = () => {
    setTransferStatus({ status: 'idle' });
  };

  if (!wallet.connected) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Card variant="elevated" className="text-center">
          <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Connect Your Wallet</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please connect your wallet to transfer tokens
          </p>
          <Button 
            variant="primary" 
            onClick={connect}
            loading={isConnecting}
            icon={Wallet}
          >
            Connect Wallet
          </Button>
        </Card>
      </div>
    );
  }

  if (transferStatus.status === 'success') {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card variant="elevated" className="text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Transfer Successful!</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your tokens have been sent successfully
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Transaction ID</p>
              <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                {transferStatus.txId}
              </p>
            </div>
            
            <Button onClick={resetTransfer} variant="primary">
              Send Another Transfer
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Transfer Tokens</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Send TKN tokens to any Stacks address quickly and securely
        </p>
      </motion.div>

      <Card variant="elevated">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Wallet Info */}
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Your Balance</p>
                <p className="text-lg font-semibold text-primary-600">
                  {formatTokenAmount(wallet.balance, 'TKN', { compact: true })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Address</p>
                <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                  {formatAddress(wallet.address!)}
                </p>
              </div>
            </div>
          </div>

          {/* Recipient */}
          <Input
            label="Recipient Address"
            placeholder="Enter Stacks address (SP... or ST...)"
            value={formData.recipient}
            onChange={(e) => setFormData(prev => ({ ...prev, recipient: e.target.value }))}
            error={errors.recipient}
            required
          />

          {/* Amount */}
          <div className="space-y-2">
            <Input
              label="Amount"
              type="number"
              placeholder="0.00"
              value={formData.amount === 0 ? '' : formData.amount.toString()}
              onChange={(e) => handleAmountChange(e.target.value)}
              error={errors.amount}
              required
              min="0"
              max={maxAmount}
              step="1"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Available: {formatTokenAmount(maxAmount, 'TKN', { compact: true })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={setMaxAmount}
              >
                Max
              </Button>
            </div>
          </div>

          {/* Memo */}
          <Input
            label="Memo (Optional)"
            placeholder="Add a note for this transfer"
            value={formData.memo}
            onChange={(e) => setFormData(prev => ({ ...prev, memo: e.target.value }))}
            helperText="Optional message to include with the transfer"
          />

          {/* Transaction Summary */}
          {formData.amount > 0 && formData.recipient && !errors.recipient && !errors.amount && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3"
            >
              <h4 className="font-semibold text-gray-900 dark:text-white">Transaction Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Amount</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatTokenAmount(formData.amount, 'TKN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Network Fee</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatFeeAmount(estimatedFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">To</span>
                  <span className="font-medium font-mono text-gray-900 dark:text-white">{formatAddress(formData.recipient)}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            fullWidth
            variant="primary"
            size="lg"
            icon={Send}
            disabled={transferStatus.status === 'confirming' || transferStatus.status === 'pending'}
            loading={transferStatus.status === 'confirming' || transferStatus.status === 'pending'}
          >
            {transferStatus.status === 'confirming' && 'Confirming Transfer...'}
            {transferStatus.status === 'pending' && 'Transfer Pending...'}
            {transferStatus.status === 'idle' && 'Send Transfer'}
          </Button>

          {transferStatus.status === 'error' && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-sm text-red-700">{transferStatus.error}</p>
            </div>
          )}
        </form>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Transfer"
      >
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowRight className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirm Token Transfer
            </h3>
            <p className="text-gray-600">
              Please review the details before confirming
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Amount</span>
              <span className="font-semibold">{formatTokenAmount(formData.amount, 'TKN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">To</span>
              <span className="font-mono text-sm">{formatAddress(formData.recipient)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Network Fee</span>
              <span className="font-semibold">{formatFeeAmount(estimatedFee)}</span>
            </div>
            {formData.memo && (
              <div className="flex justify-between">
                <span className="text-gray-600">Memo</span>
                <span className="font-medium">{formData.memo}</span>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleConfirmTransfer}
            >
              Confirm Transfer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TransferForm;