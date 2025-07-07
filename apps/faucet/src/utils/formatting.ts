// Formatting utilities for numbers, addresses, and dates

export const formatNumber = (
  value: number,
  options: {
    decimals?: number;
    compact?: boolean;
    currency?: boolean;
    percentage?: boolean;
  } = {}
): string => {
  const { decimals = 0, compact = false, currency = false, percentage = false } = options;

  if (percentage) {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  if (compact) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: decimals,
      ...(currency && { style: 'currency', currency: 'USD' })
    }).format(value);
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    ...(currency && { style: 'currency', currency: 'USD' })
  }).format(value);
};

export const formatTokenAmount = (
  amount: number,
  symbol: string = 'TKN',
  options: { compact?: boolean; decimals?: number } = {}
): string => {
  const { compact = false, decimals = 0 } = options;
  const formatted = formatNumber(amount, { decimals, compact });
  return `${formatted} ${symbol}`;
};

// Enhanced formatting for very large token amounts (faucet-specific)
export const formatLargeTokenAmount = (
  amount: number,
  symbol: string = 'TKN',
): string => {
  if (amount >= 1_000_000_000) {
    const billions = (amount / 1_000_000_000).toFixed(1);
    return `${billions}B ${symbol}`;
  } else if (amount >= 1_000_000) {
    const millions = (amount / 1_000_000).toFixed(1);
    return `${millions}M ${symbol}`;
  } else if (amount >= 1_000) {
    const thousands = (amount / 1_000).toFixed(1);
    return `${thousands}K ${symbol}`;
  }

  return `${amount.toLocaleString()} ${symbol}`;
};

// Format countdown timer
export const formatCountdown = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return "00:00:00";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Format faucet depletion estimate
export const formatDepletionEstimate = (daysRemaining: number): string => {
  if (daysRemaining < 1) {
    const hoursRemaining = Math.ceil(daysRemaining * 24);
    return `${hoursRemaining} hours`;
  } else if (daysRemaining < 30) {
    return `${Math.ceil(daysRemaining)} days`;
  } else {
    const monthsRemaining = (daysRemaining / 30).toFixed(1);
    return `${monthsRemaining} months`;
  }
};

export const formatAddress = (
  address: string | null | undefined,
  options: { start?: number; end?: number } = {}
): string => {
  if (!address) {
    return '';
  }

  const { start = 6, end = 4 } = options;

  if (address.length <= start + end) {
    return address;
  }

  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

export const formatDate = (
  date: Date,
  options: { relative?: boolean; includeTime?: boolean } = {}
): string => {
  const { relative = false, includeTime = false } = options;

  if (relative) {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months}mo ago`;
    }
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includeTime && { hour: '2-digit', minute: '2-digit' })
  };

  return new Intl.DateTimeFormat('en-US', formatOptions).format(date);
};

export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatDollarAmount = (amount: number, compact: boolean = false): string => {
  if (compact) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2
    }).format(amount);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatTransactionHash = (hash: string): string => {
  return formatAddress(hash, { start: 8, end: 6 });
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
};

export const isValidStacksAddress = (address: string): boolean => {
  // Stacks address validation - supports both mainnet (SP) and testnet (ST)
  // Addresses are typically 40-41 characters long and use base58check encoding
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Check length (typically 40-41 characters, but allow some flexibility)
  if (address.length < 38 || address.length > 42) {
    return false;
  }

  // Check prefix
  if (!address.startsWith('SP') && !address.startsWith('ST')) {
    return false;
  }

  // Stacks addresses actually use a modified base58 that includes 0-9, A-Z, a-z
  // but excludes O, I, l to avoid confusion (but includes 0)
  const stacksAddressRegex = /^[0-9A-HJ-NP-Za-kmp-z]+$/;
  const addressWithoutPrefix = address.slice(2);

  // Additional check: ensure the address is not too short after prefix removal
  if (addressWithoutPrefix.length < 36) {
    return false;
  }

  return stacksAddressRegex.test(addressWithoutPrefix);
};

export const formatTransactionStatus = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'Pending';
    case 'confirmed':
      return 'Confirmed';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
};

export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'text-yellow-600 bg-yellow-50';
    case 'confirmed':
      return 'text-green-600 bg-green-50';
    case 'failed':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

export const formatFeeAmount = (fee: number): string => {
  return `${fee.toFixed(6)} STX`;
};