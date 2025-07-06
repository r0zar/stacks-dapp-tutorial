# Tropical Blue Bonobo Token Faucet

A comprehensive SIP-10 token faucet application built with React, TypeScript, and Vite. This application demonstrates Stacks blockchain integration with token transfers, batch operations, and faucet mechanics.

## Features

- **Token Information**: View token metadata, supply, and balance
- **Faucet Claims**: Daily token claims with streak-based rewards
- **Single Transfers**: Send tokens to individual recipients
- **Batch Transfers**: Send tokens to multiple recipients in one transaction
- **Balance Checking**: Check any address's token balance
- **Network Support**: Works on both Stacks mainnet and testnet
- **Dark Mode**: Complete dark/light theme support
- **Persistent Cache**: localStorage-based caching for better performance

## Quick Start

### Prerequisites
- Node.js >=18
- pnpm (required for workspace management)
- Stacks wallet (Hiro Wallet, Xverse, etc.)

### Installation
```bash
# From the project root
pnpm install

# Start the development server
pnpm dev
```

### Development Commands
```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint

# Preview production build
pnpm preview
```

## Testing Instructions

### Manual Testing Guide

#### 1. **Wallet Connection Testing**
- [ ] **Connect Wallet**: Click "Connect Wallet" and verify wallet connection
- [ ] **Network Switching**: Toggle between Mainnet/Testnet in navigation
- [ ] **Wallet Disconnect**: Verify disconnect functionality works
- [ ] **Balance Display**: Confirm balance shows correctly after connection

#### 2. **Navigation Testing** 
- [ ] **Home Page**: Verify token info, stats, and quick actions load
- [ ] **Balance Checker**: Test balance lookup for various addresses
- [ ] **Transfer Page**: Verify single transfer form functionality
- [ ] **Faucet Page**: Test faucet claim interface
- [ ] **Batch Transfer**: Test multi-recipient transfer form
- [ ] **URL Navigation**: Test direct URL access to each page
- [ ] **Mobile Menu**: Test responsive navigation on mobile devices

#### 3. **Faucet Functionality Testing**
- [ ] **Claim Tokens**: Test successful faucet claim
- [ ] **Cooldown Timer**: Verify cooldown period after claim
- [ ] **Streak Display**: Check streak counter updates
- [ ] **Reward Progression**: Verify different reward tiers
- [ ] **Global Stats**: Check faucet remaining/distributed stats
- [ ] **Success Modal**: Test claim success modal and transaction link

#### 4. **Transfer Testing**
- [ ] **Single Transfer**: Send tokens to valid address
- [ ] **Address Validation**: Test invalid address handling
- [ ] **Amount Validation**: Test insufficient balance scenarios
- [ ] **Transaction Success**: Verify transaction completion
- [ ] **Balance Updates**: Check sender/recipient balance updates
- [ ] **Explorer Links**: Verify transaction explorer links work

#### 5. **Batch Transfer Testing**
- [ ] **Add Recipients**: Test adding multiple recipients
- [ ] **Remove Recipients**: Test removing recipients from list
- [ ] **CSV Upload**: Test CSV file upload functionality
- [ ] **CSV Template**: Download and test CSV template
- [ ] **Validation**: Test address and amount validation
- [ ] **Review Screen**: Verify batch review before execution
- [ ] **Execution**: Test successful batch transfer
- [ ] **Error Handling**: Test batch transfer error scenarios

#### 6. **UI/UX Testing**
- [ ] **Dark Mode**: Toggle dark/light theme
- [ ] **Responsive Design**: Test on mobile, tablet, desktop
- [ ] **Loading States**: Verify loading indicators work
- [ ] **Error States**: Test error message display
- [ ] **Success States**: Test success message display
- [ ] **Form Validation**: Test all form validation rules

#### 7. **Performance Testing**
- [ ] **Cache Performance**: Test localStorage cache persistence
- [ ] **Page Load Speed**: Verify fast initial load times
- [ ] **Data Refresh**: Test cache invalidation after transactions
- [ ] **Network Switching**: Test cache isolation between networks
- [ ] **Memory Usage**: Monitor for memory leaks during extended use

#### 8. **Browser Compatibility**
- [ ] **Chrome**: Test all functionality in Chrome
- [ ] **Firefox**: Test all functionality in Firefox
- [ ] **Safari**: Test all functionality in Safari (if on Mac)
- [ ] **Edge**: Test all functionality in Edge
- [ ] **Mobile Browsers**: Test on mobile Chrome/Safari

### Automated Testing

#### Running Contract Tests
```bash
# From packages/contracts directory
cd packages/contracts
pnpm test          # Run all tests
pnpm test:watch    # Run tests in watch mode
pnpm test:report   # Run with coverage and cost analysis
```

#### Test Coverage Areas
- **Token Contract**: Transfer, balance, metadata functions
- **Faucet Contract**: Claim logic, cooldown, reward tiers
- **Batch Transfer**: Multi-recipient transfers, error handling
- **Validation**: Address validation, amount validation
- **Cache**: localStorage serialization/deserialization

### Environment Testing

#### Network Testing
- **Testnet**: Primary testing environment
  - Use testnet STX for transactions
  - Test all faucet functionality
  - Verify contract interactions
  
- **Mainnet**: Production testing (use small amounts)
  - Verify contract addresses are correct
  - Test read-only functions
  - Confirm UI displays real data

#### Wallet Testing
- **Hiro Wallet**: Primary wallet for testing
- **Xverse**: Secondary wallet testing
- **Different Accounts**: Test with multiple wallet accounts
- **Fresh Wallets**: Test with wallets that have no transaction history

### Common Issues & Troubleshooting

#### Wallet Connection Issues
- Clear browser cache and localStorage
- Disable browser extensions that might interfere
- Ensure wallet is unlocked and on correct network

#### Transaction Failures
- Check wallet has sufficient STX for gas fees
- Verify contract is deployed on selected network
- Confirm address format is valid (ST/SP prefix)

#### Cache Issues
- Clear localStorage: Developer Tools > Application > Storage
- Check cache keys: Look for `tbb-token-cache:` and `tbb-faucet-cache:` prefixes
- Verify cache TTL settings are appropriate

#### Performance Issues
- Monitor Network tab for slow API calls
- Check localStorage size (should not exceed 5-10MB)
- Verify no memory leaks in long-running sessions

### Test Data

#### Sample Addresses (Testnet)
```
ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5
ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR
ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0
```

#### Sample CSV for Batch Transfer
```csv
address,amount
ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5,1000000
ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR,2000000
ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0,3000000
```