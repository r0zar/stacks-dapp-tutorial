import { Cl } from '@stacks/transactions';
import { describe, it, expect } from 'vitest';

const errors = {
  cooldownActive: Cl.uint(101),
  insufficientFaucetBalance: Cl.uint(102),
  invalidUser: Cl.uint(103),
  transferFailed: Cl.uint(104),
  invalidDeposit: Cl.uint(105),
}


describe('Token Faucet Contract Tests', () => {
  it('should fail with cooldown error when claiming too early', () => {
    const result = simnet.callPublicFn('token-faucet', 'claim-tokens', [], simnet.deployer);
    expect(result.result).toBeErr(errors.cooldownActive);
  });

  it('should not allow claiming tokens when faucet is empty', () => {
    // Advance chain to meet cooldown requirement (17280 blocks)
    simnet.mineEmptyBlocks(17280);

    const result = simnet.callPublicFn('token-faucet', 'claim-tokens', [], simnet.deployer);
    expect(result.result).toBeErr(errors.insufficientFaucetBalance);
  });

  it('should allow depositing tokens to faucet', () => {
    // Mine blocks for happy path tests
    simnet.mineEmptyBlocks(17280);

    const depositAmount = 1000000000; // 1B tokens
    const result = simnet.callPublicFn('token-faucet', 'deposit-tokens', [Cl.uint(depositAmount)], simnet.deployer);
    expect(result.result).toBeOk(Cl.uint(depositAmount));
  });

  it('should allow claiming tokens after deposit', () => {
    // Mine blocks for happy path tests
    simnet.mineEmptyBlocks(17280);

    // First deposit tokens to faucet
    const depositAmount = 1000000000; // 1B tokens
    simnet.callPublicFn('token-faucet', 'deposit-tokens', [Cl.uint(depositAmount)], simnet.deployer);

    // Then claim tokens with a different user
    const claimResult = simnet.callPublicFn('token-faucet', 'claim-tokens', [], simnet.getAccounts().get('wallet_1')!);
    expect(claimResult.result).toBeOk(Cl.uint(50000000)); // Tier 1 reward: 50M tokens
  });

  it('should return correct faucet balance', () => {
    // Mine blocks for happy path tests
    simnet.mineEmptyBlocks(17280);

    const depositAmount = 500000000; // 500M tokens
    simnet.callPublicFn('token-faucet', 'deposit-tokens', [Cl.uint(depositAmount)], simnet.deployer);

    const balanceResult = simnet.callReadOnlyFn('token-faucet', 'get-faucet-balance', [], simnet.deployer);
    expect(balanceResult.result).toBeUint(depositAmount);
  });

  it('should return correct reward for streak', () => {
    const tier1Result = simnet.callReadOnlyFn('token-faucet', 'get-reward-for-streak', [Cl.uint(1)], simnet.deployer);
    expect(tier1Result.result).toBeUint(50000000); // 50M tokens

    const tier4Result = simnet.callReadOnlyFn('token-faucet', 'get-reward-for-streak', [Cl.uint(15)], simnet.deployer);
    expect(tier4Result.result).toBeUint(125000000); // 125M tokens
  });

  // Streak System Tests
  it('should start with streak 1 on first claim', () => {
    // Mine blocks and deposit tokens
    simnet.mineEmptyBlocks(17280);
    simnet.callPublicFn('token-faucet', 'deposit-tokens', [Cl.uint(1000000000)], simnet.deployer);

    // First claim should give tier 1 reward (50M tokens)
    const claimResult = simnet.callPublicFn('token-faucet', 'claim-tokens', [], simnet.getAccounts().get('wallet_1')!);
    expect(claimResult.result).toBeOk(Cl.uint(50000000));

    // Check user data shows streak 1
    const userData = simnet.callReadOnlyFn('token-faucet', 'get-claim-data', [Cl.principal(simnet.getAccounts().get('wallet_1')!)], simnet.deployer);
    expect(userData.result).toMatchObject(
      Cl.tuple({
        'streak-count': Cl.uint(1),
        'total-claims': Cl.uint(1),
        'total-claimed': Cl.uint(50000000),
        'can-claim-now': Cl.bool(false)
      })
    );
  });

  it('should increment streak on consecutive claims', () => {
    // Setup: mine blocks and deposit tokens
    simnet.mineEmptyBlocks(17280);
    simnet.callPublicFn('token-faucet', 'deposit-tokens', [Cl.uint(2000000000)], simnet.deployer);

    const user = simnet.getAccounts().get('wallet_1')!;

    // First claim (streak 1)
    simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);

    // Wait cooldown period and claim again
    simnet.mineEmptyBlocks(17280);
    const secondClaim = simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);
    expect(secondClaim.result).toBeOk(Cl.uint(50000000)); // Still tier 1 (streak 2)

    // Check streak incremented
    const userData = simnet.callReadOnlyFn('token-faucet', 'get-claim-data', [Cl.principal(user)], simnet.deployer);
    expect(userData.result).toMatchObject(
      Cl.tuple({
        'streak-count': Cl.uint(2),
        'total-claims': Cl.uint(2)
      })
    );
  });

  it('should reach tier 2 rewards at streak 4', () => {
    // Setup
    simnet.mineEmptyBlocks(17280);
    simnet.callPublicFn('token-faucet', 'deposit-tokens', [Cl.uint(5000000000)], simnet.deployer);

    const user = simnet.getAccounts().get('wallet_1')!;

    // Make 3 claims to reach streak 4 on next claim
    for (let i = 0; i < 3; i++) {
      simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);
      simnet.mineEmptyBlocks(17280);
    }

    // 4th claim should give tier 2 reward (75M tokens)
    const fourthClaim = simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);
    expect(fourthClaim.result).toBeOk(Cl.uint(75000000));

    // Check streak is 4
    const userData = simnet.callReadOnlyFn('token-faucet', 'get-claim-data', [Cl.principal(user)], simnet.deployer);
    expect(userData.result).toMatchObject(
      Cl.tuple({
        'streak-count': Cl.uint(4),
        'total-claims': Cl.uint(4)
      })
    );
  });

  it('should reach tier 3 rewards at streak 8', () => {
    // Setup
    simnet.mineEmptyBlocks(17280);
    simnet.callPublicFn('token-faucet', 'deposit-tokens', [Cl.uint(10000000000)], simnet.deployer);

    const user = simnet.getAccounts().get('wallet_1')!;

    // Make 7 claims to reach streak 8 on next claim
    for (let i = 0; i < 7; i++) {
      simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);
      simnet.mineEmptyBlocks(17280);
    }

    // 8th claim should give tier 3 reward (100M tokens)
    const eighthClaim = simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);
    expect(eighthClaim.result).toBeOk(Cl.uint(100000000));

    // Check streak is 8
    const userData = simnet.callReadOnlyFn('token-faucet', 'get-claim-data', [Cl.principal(user)], simnet.deployer);
    expect(userData.result).toMatchObject(
      Cl.tuple({
        'streak-count': Cl.uint(8),
        'total-claims': Cl.uint(8)
      })
    );
  });

  it('should reach tier 4 rewards at streak 15', () => {
    // Setup
    simnet.mineEmptyBlocks(17280);
    simnet.callPublicFn('token-faucet', 'deposit-tokens', [Cl.uint(9000000000)], simnet.deployer);

    const user = simnet.getAccounts().get('wallet_1')!;

    // Make 14 claims to reach streak 15 on next claim
    for (let i = 0; i < 14; i++) {
      simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);
      simnet.mineEmptyBlocks(17280);
    }

    // 15th claim should give tier 4 reward (125M tokens)
    const fifteenthClaim = simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);
    expect(fifteenthClaim.result).toBeOk(Cl.uint(125000000));

    // Check streak is 15
    const userData = simnet.callReadOnlyFn('token-faucet', 'get-claim-data', [Cl.principal(user)], simnet.deployer);
    expect(userData.result).toMatchObject(
      Cl.tuple({
        'streak-count': Cl.uint(15),
        'total-claims': Cl.uint(15)
      })
    );
  });

  it('should reset streak when claim window expires', () => {
    // Setup
    simnet.mineEmptyBlocks(17280);
    simnet.callPublicFn('token-faucet', 'deposit-tokens', [Cl.uint(2000000000)], simnet.deployer);

    const user = simnet.getAccounts().get('wallet_1')!;

    // First claim (streak 1)
    simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);

    // Wait longer than streak window (34560 blocks + cooldown)
    simnet.mineEmptyBlocks(34560 + 17280);

    // Next claim should reset streak to 1 and give tier 1 reward
    const resetClaim = simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);
    expect(resetClaim.result).toBeOk(Cl.uint(50000000)); // Tier 1 reward

    // Check streak reset to 1
    const userData = simnet.callReadOnlyFn('token-faucet', 'get-claim-data', [Cl.principal(user)], simnet.deployer);
    expect(userData.result).toMatchObject(
      Cl.tuple({
        'streak-count': Cl.uint(1),
        'total-claims': Cl.uint(2) // Total claims should still be 2
      })
    );
  });

  it('should maintain streak when claiming within window', () => {
    // Setup
    simnet.mineEmptyBlocks(17280);
    simnet.callPublicFn('token-faucet', 'deposit-tokens', [Cl.uint(2000000000)], simnet.deployer);

    const user = simnet.getAccounts().get('wallet_1')!;

    // First claim (streak 1)
    simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);

    // Wait exactly the streak window (34560 blocks - 1 to stay within window)
    simnet.mineEmptyBlocks(34559);

    // Next claim should maintain streak and increment to 2
    const maintainClaim = simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);
    expect(maintainClaim.result).toBeOk(Cl.uint(50000000)); // Still tier 1 at streak 2

    // Check streak incremented to 2
    const userData = simnet.callReadOnlyFn('token-faucet', 'get-claim-data', [Cl.principal(user)], simnet.deployer);
    expect(userData.result).toMatchObject(
      Cl.tuple({
        'streak-count': Cl.uint(2),
        'total-claims': Cl.uint(2)
      })
    );
  });

  it('should correctly calculate total claimed across streaks', () => {
    // Setup
    simnet.mineEmptyBlocks(17280);
    simnet.callPublicFn('token-faucet', 'deposit-tokens', [Cl.uint(5000000000)], simnet.deployer);

    const user = simnet.getAccounts().get('wallet_1')!;

    // Make several claims with different streak rewards
    // Claims 1-3: 50M each = 150M total
    for (let i = 0; i < 3; i++) {
      simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);
      simnet.mineEmptyBlocks(17280);
    }

    // Claim 4: 75M (tier 2)
    simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);

    // Check total claimed = 150M + 75M = 225M
    const userData = simnet.callReadOnlyFn('token-faucet', 'get-claim-data', [Cl.principal(user)], simnet.deployer);
    expect(userData.result).toMatchObject(
      Cl.tuple({
        'total-claimed': Cl.uint(225000000),
        'streak-count': Cl.uint(4),
        'total-claims': Cl.uint(4)
      })
    );
  });

  // Cooldown Period Rate Limiting Tests
  it('should enforce exact cooldown period (17280 blocks)', () => {
    // Setup
    simnet.mineEmptyBlocks(17280);
    simnet.callPublicFn('token-faucet', 'deposit-tokens', [Cl.uint(2000000000)], simnet.deployer);

    const user = simnet.getAccounts().get('wallet_1')!;

    // First successful claim
    const firstClaim = simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);
    expect(firstClaim.result).toBeOk(Cl.uint(50000000));

    // Immediate second claim should fail (0 blocks waited)
    const immediateClaim = simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);
    expect(immediateClaim.result).toBeErr(errors.cooldownActive);

    // Wait until 1 block before cooldown expires (time diff = 17279 < 17280)
    simnet.mineEmptyBlocks(17277);
    const notReadyClaim = simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);
    expect(notReadyClaim.result).toBeErr(errors.cooldownActive);

    // Wait 1 more block (time diff >= 17280, cooldown should be satisfied)
    simnet.mineEmptyBlocks(1);
    const readyClaim = simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);
    expect(readyClaim.result).toBeOk(Cl.uint(50000000));
  });

  it('should allow claim after cooldown period expires', () => {
    // Setup
    simnet.mineEmptyBlocks(17280);
    simnet.callPublicFn('token-faucet', 'deposit-tokens', [Cl.uint(9000000000)], simnet.deployer);

    const user = simnet.getAccounts().get('wallet_1')!;

    // First claim
    simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);

    // Wait more than cooldown period
    simnet.mineEmptyBlocks(17281);

    // Should be able to claim again
    const secondClaim = simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);
    expect(secondClaim.result).toBeOk(Cl.uint(50000000));
  });

  it('should return correct can-claim-now status', () => {
    // Setup
    simnet.mineEmptyBlocks(17280);
    simnet.callPublicFn('token-faucet', 'deposit-tokens', [Cl.uint(9000000000)], simnet.deployer);

    const user = simnet.getAccounts().get('wallet_1')!;

    // Before first claim - should be able to claim
    const initialStatus = simnet.callReadOnlyFn('token-faucet', 'can-claim-now', [Cl.principal(user)], simnet.deployer);
    expect(initialStatus.result).toBeBool(true);

    // Make first claim
    simnet.callPublicFn('token-faucet', 'claim-tokens', [], user);

    // Immediately after claim - should not be able to claim
    const afterClaimStatus = simnet.callReadOnlyFn('token-faucet', 'can-claim-now', [Cl.principal(user)], simnet.deployer);
    expect(afterClaimStatus.result).toBeBool(false);

    // Wait cooldown period
    simnet.mineEmptyBlocks(17280);

    // After cooldown - should be able to claim again
    const afterCooldownStatus = simnet.callReadOnlyFn('token-faucet', 'can-claim-now', [Cl.principal(user)], simnet.deployer);
    expect(afterCooldownStatus.result).toBeBool(true);
  });

  it('should handle multiple users with independent cooldowns', () => {
    // Setup
    simnet.mineEmptyBlocks(17280);
    simnet.callPublicFn('token-faucet', 'deposit-tokens', [Cl.uint(9000000000)], simnet.deployer);

    const user1 = simnet.getAccounts().get('wallet_1')!;
    const user2 = simnet.getAccounts().get('wallet_2')!;

    // User1 claims first
    simnet.callPublicFn('token-faucet', 'claim-tokens', [], user1);

    // User2 should still be able to claim (different cooldown)
    const user2FirstClaim = simnet.callPublicFn('token-faucet', 'claim-tokens', [], user2);
    expect(user2FirstClaim.result).toBeOk(Cl.uint(50000000));

    // User1 should not be able to claim yet
    const user1EarlyClaim = simnet.callPublicFn('token-faucet', 'claim-tokens', [], user1);
    expect(user1EarlyClaim.result).toBeErr(errors.cooldownActive);

    // User2 should also not be able to claim yet
    const user2EarlyClaim = simnet.callPublicFn('token-faucet', 'claim-tokens', [], user2);
    expect(user2EarlyClaim.result).toBeErr(errors.cooldownActive);

    // Wait cooldown period
    simnet.mineEmptyBlocks(17280);

    // Both users should be able to claim again
    const user1SecondClaim = simnet.callPublicFn('token-faucet', 'claim-tokens', [], user1);
    expect(user1SecondClaim.result).toBeOk(Cl.uint(50000000));

    const user2SecondClaim = simnet.callPublicFn('token-faucet', 'claim-tokens', [], user2);
    expect(user2SecondClaim.result).toBeOk(Cl.uint(50000000));
  });

  it('should handle edge case of user with no previous claims', () => {
    // Setup
    simnet.mineEmptyBlocks(17280);
    simnet.callPublicFn('token-faucet', 'deposit-tokens', [Cl.uint(9000000000)], simnet.deployer);

    const newUser = simnet.getAccounts().get('wallet_3')!;

    // Check can-claim-now for user with no history
    const canClaim = simnet.callReadOnlyFn('token-faucet', 'can-claim-now', [Cl.principal(newUser)], simnet.deployer);
    expect(canClaim.result).toBeBool(true);

    // Check claim data for user with no history
    const claimData = simnet.callReadOnlyFn('token-faucet', 'get-claim-data', [Cl.principal(newUser)], simnet.deployer);
    expect(claimData.result).toMatchObject(
      Cl.tuple({
        'last-claim-block': Cl.uint(0),
        'streak-count': Cl.uint(0),
        'total-claims': Cl.uint(0),
        'total-claimed': Cl.uint(0),
        'can-claim-now': Cl.bool(true),
        'time-until-next-claim': Cl.uint(0)
      })
    );

    // Should be able to make first claim
    const firstClaim = simnet.callPublicFn('token-faucet', 'claim-tokens', [], newUser);
    expect(firstClaim.result).toBeOk(Cl.uint(50000000));
  });
});