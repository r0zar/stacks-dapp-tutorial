/**
 * Validation utilities for addresses and other inputs
 */

export const isValidStacksAddress = (address: string): boolean => {
  // Stacks address validation - supports both mainnet (SP) and testnet (ST) and multisig (SM)
  // Addresses are typically 40-41 characters long and use base58check encoding
  if (!address || typeof address !== 'string') {
    console.log('Address is not a string', address);
    return false;
  }

  // Check length (typically 40-41 characters, but allow some flexibility)
  if (address.length < 38 || address.length > 42) {
    return false;
  }

  // Check prefix
  if (!address.startsWith('SP') && !address.startsWith('ST') && !address.startsWith('SM')) {
    return false;
  }

  // Stacks addresses actually use a modified base58 that includes 0-9, A-Z, a-z
  // but excludes O, I, l to avoid confusion (but includes 0)
  const stacksAddressRegex = /^[0-9A-HJ-NP-Za-kmp-z]+$/;
  const addressWithoutPrefix = address.slice(2);

  // Additional check: ensure the address is not too short after prefix removal
  if (addressWithoutPrefix.length < 36) {
    console.log('Address is too short after prefix removal', addressWithoutPrefix);
    return false;
  }

  return stacksAddressRegex.test(addressWithoutPrefix);
};