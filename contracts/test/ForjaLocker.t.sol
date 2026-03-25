// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ForjaLocker} from "../src/ForjaLocker.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ForjaLockerTest is Test {
    ForjaLocker public locker;
    MockERC20 public usdc;
    MockERC20 public token;

    address public owner = address(this);
    address public treasury = makeAddr("treasury");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 public constant LOCK_FEE = 10e6; // 10 USDC
    uint256 public constant LOCK_AMOUNT = 10_000e6;
    uint64 public constant ONE_YEAR = 365 days;
    uint64 public constant SIX_MONTHS = 180 days;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        token = new MockERC20("Test Token", "TEST", 6);
        locker = new ForjaLocker(address(usdc), treasury, LOCK_FEE);

        usdc.mint(alice, 1000e6);
        token.mint(alice, 100_000e6);

        vm.startPrank(alice);
        usdc.approve(address(locker), type(uint256).max);
        token.approve(address(locker), type(uint256).max);
        vm.stopPrank();
    }

    function _createDefaultLock() internal returns (uint256) {
        vm.prank(alice);
        return locker.createLock(address(token), bob, LOCK_AMOUNT, ONE_YEAR, SIX_MONTHS, true, true);
    }

    // ===================== CREATE LOCK =====================

    function test_createLock_success() public {
        uint256 lockId = _createDefaultLock();

        assertEq(lockId, 1);
        assertEq(token.balanceOf(address(locker)), LOCK_AMOUNT);
    }

    function test_createLock_emitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit ForjaLocker.LockCreated(
            1,
            alice,
            address(token),
            bob,
            LOCK_AMOUNT,
            uint64(block.timestamp),
            uint64(block.timestamp) + ONE_YEAR,
            true
        );
        locker.createLock(address(token), bob, LOCK_AMOUNT, ONE_YEAR, SIX_MONTHS, true, true);
    }

    function test_createLock_transfersFee() public {
        uint256 treasuryBefore = usdc.balanceOf(treasury);
        _createDefaultLock();
        assertEq(usdc.balanceOf(treasury), treasuryBefore + LOCK_FEE);
    }

    function test_createLock_transfersTokensToContract() public {
        uint256 aliceBefore = token.balanceOf(alice);
        _createDefaultLock();
        assertEq(token.balanceOf(alice), aliceBefore - LOCK_AMOUNT);
        assertEq(token.balanceOf(address(locker)), LOCK_AMOUNT);
    }

    function test_createLock_revertsZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(ForjaLocker.ZeroAmount.selector);
        locker.createLock(address(token), bob, 0, ONE_YEAR, SIX_MONTHS, true, true);
    }

    function test_createLock_revertsZeroDuration() public {
        vm.prank(alice);
        vm.expectRevert(ForjaLocker.ZeroDuration.selector);
        locker.createLock(address(token), bob, LOCK_AMOUNT, 0, 0, true, true);
    }

    function test_createLock_revertsZeroBeneficiary() public {
        vm.prank(alice);
        vm.expectRevert(ForjaLocker.ZeroAddress.selector);
        locker.createLock(address(token), address(0), LOCK_AMOUNT, ONE_YEAR, SIX_MONTHS, true, true);
    }

    function test_createLock_revertsCliffExceedsDuration() public {
        vm.prank(alice);
        vm.expectRevert(ForjaLocker.CliffExceedsDuration.selector);
        locker.createLock(address(token), bob, LOCK_AMOUNT, SIX_MONTHS, ONE_YEAR, true, true);
    }

    // ===================== CLAIM =====================

    function test_claim_afterFullVesting() public {
        uint256 lockId = _createDefaultLock();

        vm.warp(block.timestamp + ONE_YEAR);
        vm.prank(bob);
        locker.claim(lockId);

        assertEq(token.balanceOf(bob), LOCK_AMOUNT);
    }

    function test_claim_partialVesting() public {
        uint256 lockId = _createDefaultLock();
        uint256 startTime = block.timestamp;

        // Warp to 50% (halfway through the year)
        vm.warp(startTime + ONE_YEAR / 2);
        vm.prank(bob);
        locker.claim(lockId);

        // Should be approximately 50% of total (linear vesting)
        uint256 expected = (LOCK_AMOUNT * (ONE_YEAR / 2)) / ONE_YEAR;
        assertEq(token.balanceOf(bob), expected);
    }

    function test_claim_beforeCliff() public {
        uint256 lockId = _createDefaultLock();

        // Before cliff (6 months)
        vm.warp(block.timestamp + SIX_MONTHS - 1);
        vm.prank(bob);
        vm.expectRevert(ForjaLocker.NothingToClaim.selector);
        locker.claim(lockId);
    }

    function test_claim_afterCliffBeforeEnd() public {
        uint256 lockId = _createDefaultLock();
        uint256 startTime = block.timestamp;

        // Exactly at cliff
        vm.warp(startTime + SIX_MONTHS);
        vm.prank(bob);
        locker.claim(lockId);

        uint256 expected = (LOCK_AMOUNT * SIX_MONTHS) / ONE_YEAR;
        assertEq(token.balanceOf(bob), expected);
    }

    function test_claim_noVesting_beforeEnd() public {
        // Create lock without vesting
        vm.prank(alice);
        uint256 lockId = locker.createLock(address(token), bob, LOCK_AMOUNT, ONE_YEAR, 0, false, false);

        vm.warp(block.timestamp + ONE_YEAR - 1);
        vm.prank(bob);
        vm.expectRevert(ForjaLocker.NothingToClaim.selector);
        locker.claim(lockId);
    }

    function test_claim_noVesting_afterEnd() public {
        vm.prank(alice);
        uint256 lockId = locker.createLock(address(token), bob, LOCK_AMOUNT, ONE_YEAR, 0, false, false);

        vm.warp(block.timestamp + ONE_YEAR);
        vm.prank(bob);
        locker.claim(lockId);

        assertEq(token.balanceOf(bob), LOCK_AMOUNT);
    }

    function test_claim_multipleClaims() public {
        uint256 lockId = _createDefaultLock();
        uint256 startTime = block.timestamp;

        // First claim at cliff
        vm.warp(startTime + SIX_MONTHS);
        vm.prank(bob);
        locker.claim(lockId);
        uint256 firstClaim = token.balanceOf(bob);

        // Second claim at 75%
        vm.warp(startTime + (ONE_YEAR * 3) / 4);
        vm.prank(bob);
        locker.claim(lockId);
        uint256 secondTotal = token.balanceOf(bob);
        assertGt(secondTotal, firstClaim);

        // Final claim after end
        vm.warp(startTime + ONE_YEAR);
        vm.prank(bob);
        locker.claim(lockId);
        assertEq(token.balanceOf(bob), LOCK_AMOUNT);
    }

    function test_claim_onlyBeneficiary() public {
        uint256 lockId = _createDefaultLock();

        vm.warp(block.timestamp + ONE_YEAR);
        vm.prank(alice);
        vm.expectRevert(ForjaLocker.NotBeneficiary.selector);
        locker.claim(lockId);
    }

    function test_claim_revokedLock() public {
        uint256 lockId = _createDefaultLock();

        vm.prank(alice);
        locker.revokeLock(lockId);

        vm.warp(block.timestamp + ONE_YEAR);
        vm.prank(bob);
        vm.expectRevert(ForjaLocker.LockIsRevoked.selector);
        locker.claim(lockId);
    }

    function test_claim_emitsEvent() public {
        uint256 lockId = _createDefaultLock();

        vm.warp(block.timestamp + ONE_YEAR);
        vm.prank(bob);
        vm.expectEmit(true, true, false, true);
        emit ForjaLocker.TokensClaimed(lockId, bob, LOCK_AMOUNT);
        locker.claim(lockId);
    }

    // ===================== REVOKE =====================

    function test_revokeLock_success() public {
        uint256 lockId = _createDefaultLock();
        uint256 aliceBefore = token.balanceOf(alice);

        vm.prank(alice);
        locker.revokeLock(lockId);

        // All tokens returned to creator (nothing vested before cliff)
        assertEq(token.balanceOf(alice), aliceBefore + LOCK_AMOUNT);
    }

    function test_revokeLock_onlyCreator() public {
        uint256 lockId = _createDefaultLock();

        vm.prank(bob);
        vm.expectRevert(ForjaLocker.NotCreator.selector);
        locker.revokeLock(lockId);
    }

    function test_revokeLock_notRevocable() public {
        vm.prank(alice);
        uint256 lockId = locker.createLock(address(token), bob, LOCK_AMOUNT, ONE_YEAR, SIX_MONTHS, true, false);

        vm.prank(alice);
        vm.expectRevert(ForjaLocker.NotRevocable.selector);
        locker.revokeLock(lockId);
    }

    function test_revokeLock_alreadyRevoked() public {
        uint256 lockId = _createDefaultLock();

        vm.prank(alice);
        locker.revokeLock(lockId);

        vm.prank(alice);
        vm.expectRevert(ForjaLocker.AlreadyRevoked.selector);
        locker.revokeLock(lockId);
    }

    function test_revokeLock_afterPartialClaim() public {
        uint256 lockId = _createDefaultLock();
        uint256 startTime = block.timestamp;

        // Bob claims at cliff
        vm.warp(startTime + SIX_MONTHS);
        vm.prank(bob);
        locker.claim(lockId);
        uint256 bobClaimed = token.balanceOf(bob);

        // Alice revokes — vested but unclaimed goes to bob, unvested goes to alice
        uint256 aliceBefore = token.balanceOf(alice);
        vm.prank(alice);
        locker.revokeLock(lockId);

        // Bob should get nothing extra from revoke (already claimed all vested)
        // Alice gets the unvested portion
        uint256 unvested = LOCK_AMOUNT - (LOCK_AMOUNT * SIX_MONTHS) / ONE_YEAR;
        assertEq(token.balanceOf(alice), aliceBefore + unvested);
        assertEq(token.balanceOf(bob), bobClaimed); // Bob already claimed, no extra
    }

    function test_revokeLock_emitsEvent() public {
        uint256 lockId = _createDefaultLock();

        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit ForjaLocker.LockRevoked(lockId, LOCK_AMOUNT);
        locker.revokeLock(lockId);
    }

    // ===================== VIEW FUNCTIONS =====================

    function test_getClaimableAmount_variousTimestamps() public {
        uint256 lockId = _createDefaultLock();
        uint256 startTime = block.timestamp;

        // Before cliff
        vm.warp(startTime + SIX_MONTHS - 1);
        assertEq(locker.getClaimableAmount(lockId), 0);

        // At cliff
        vm.warp(startTime + SIX_MONTHS);
        uint256 atCliff = locker.getClaimableAmount(lockId);
        assertGt(atCliff, 0);

        // At end
        vm.warp(startTime + ONE_YEAR);
        assertEq(locker.getClaimableAmount(lockId), LOCK_AMOUNT);
    }

    function test_getLocksByCreator() public {
        _createDefaultLock();
        usdc.mint(alice, 100e6);
        token.mint(alice, 100_000e6);
        vm.prank(alice);
        locker.createLock(address(token), bob, LOCK_AMOUNT, ONE_YEAR, 0, true, false);

        uint256[] memory lockIds = locker.getLocksByCreator(alice);
        assertEq(lockIds.length, 2);
        assertEq(lockIds[0], 1);
        assertEq(lockIds[1], 2);
    }

    function test_getLocksByBeneficiary() public {
        _createDefaultLock();
        uint256[] memory lockIds = locker.getLocksByBeneficiary(bob);
        assertEq(lockIds.length, 1);
        assertEq(lockIds[0], 1);
    }

    function test_setLockFee_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        locker.setLockFee(20e6);
    }

    function test_setLockFee_updatesValue() public {
        locker.setLockFee(20e6);
        assertEq(locker.lockFee(), 20e6);
    }

    function test_setTreasury_rejectsZeroAddress() public {
        vm.expectRevert(ForjaLocker.ZeroAddress.selector);
        locker.setTreasury(address(0));
    }

    function test_constructor_rejectsZeroUsdc() public {
        vm.expectRevert(ForjaLocker.ZeroAddress.selector);
        new ForjaLocker(address(0), treasury, LOCK_FEE);
    }

    function test_constructor_rejectsZeroTreasury() public {
        vm.expectRevert(ForjaLocker.ZeroAddress.selector);
        new ForjaLocker(address(usdc), address(0), LOCK_FEE);
    }

    // ===================== FUZZ =====================

    function testFuzz_claim_atVariousTimestamps(
        uint256 timeOffset
    ) public {
        uint256 lockId = _createDefaultLock();
        uint256 startTime = block.timestamp;

        // Bound to after cliff, before/at end
        timeOffset = bound(timeOffset, uint256(SIX_MONTHS), uint256(ONE_YEAR));
        vm.warp(startTime + timeOffset);

        vm.prank(bob);
        locker.claim(lockId);

        uint256 claimed = token.balanceOf(bob);
        assertGt(claimed, 0);
        assertLe(claimed, LOCK_AMOUNT);
    }

    // ===================== ADDITIONAL EDGE CASES =====================

    function test_createLock_cliffEqualsDuration() public {
        vm.prank(alice);
        uint256 lockId = locker.createLock(address(token), bob, LOCK_AMOUNT, ONE_YEAR, ONE_YEAR, true, false);
        assertEq(lockId, 1);

        // Before cliff (= before end), nothing claimable
        vm.warp(block.timestamp + ONE_YEAR - 1);
        assertEq(locker.getClaimableAmount(lockId), 0);

        // At cliff = at end, full amount claimable
        vm.warp(block.timestamp + 1);
        assertEq(locker.getClaimableAmount(lockId), LOCK_AMOUNT);
    }

    function test_createLock_beneficiaryIsCreator() public {
        vm.prank(alice);
        uint256 lockId = locker.createLock(address(token), alice, LOCK_AMOUNT, ONE_YEAR, 0, true, false);
        assertEq(lockId, 1);

        vm.warp(block.timestamp + ONE_YEAR);
        vm.prank(alice);
        locker.claim(lockId);
        assertEq(token.balanceOf(alice), 100_000e6 - LOCK_AMOUNT + LOCK_AMOUNT); // back to original minus fee tokens
    }

    function test_createLock_revertsZeroAddressToken() public {
        vm.prank(alice);
        vm.expectRevert(ForjaLocker.ZeroAddress.selector);
        locker.createLock(address(0), bob, LOCK_AMOUNT, ONE_YEAR, SIX_MONTHS, true, true);
    }

    function test_claim_revertsWhenFullyClaimed() public {
        uint256 lockId = _createDefaultLock();

        vm.warp(block.timestamp + ONE_YEAR);
        vm.prank(bob);
        locker.claim(lockId);

        vm.prank(bob);
        vm.expectRevert(ForjaLocker.NothingToClaim.selector);
        locker.claim(lockId);
    }

    function test_claim_noVesting_cliffZero_afterEnd() public {
        vm.prank(alice);
        uint256 lockId = locker.createLock(address(token), bob, LOCK_AMOUNT, ONE_YEAR, 0, false, false);

        vm.warp(block.timestamp + ONE_YEAR + 1);
        vm.prank(bob);
        locker.claim(lockId);
        assertEq(token.balanceOf(bob), LOCK_AMOUNT);
    }

    function test_getClaimableAmount_revokedLockReturnsZero() public {
        uint256 lockId = _createDefaultLock();

        vm.warp(block.timestamp + SIX_MONTHS);
        vm.prank(alice);
        locker.revokeLock(lockId);

        assertEq(locker.getClaimableAmount(lockId), 0);
    }

    function test_getClaimableAmount_nonExistentLock() public view {
        assertEq(locker.getClaimableAmount(999), 0);
    }

    function test_revokeLock_withUnclaimedVested() public {
        uint256 lockId = _createDefaultLock();

        // Warp past cliff — bob has vested tokens but hasn't claimed
        vm.warp(block.timestamp + SIX_MONTHS);
        uint256 bobBefore = token.balanceOf(bob);
        uint256 aliceBefore = token.balanceOf(alice);

        vm.prank(alice);
        locker.revokeLock(lockId);

        // Bob should receive unclaimed vested portion
        uint256 vestedAmount = (LOCK_AMOUNT * SIX_MONTHS) / ONE_YEAR;
        uint256 unvestedAmount = LOCK_AMOUNT - vestedAmount;
        assertEq(token.balanceOf(bob), bobBefore + vestedAmount);
        assertEq(token.balanceOf(alice), aliceBefore + unvestedAmount);
    }

    function test_setLockFee_emitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit ForjaLocker.FeeUpdated(LOCK_FEE, 20e6);
        locker.setLockFee(20e6);
    }

    function test_setTreasury_emitsEvent() public {
        address newTreasury = makeAddr("newTreasury");
        vm.expectEmit(false, false, false, true);
        emit ForjaLocker.TreasuryUpdated(treasury, newTreasury);
        locker.setTreasury(newTreasury);
    }

    function test_setTreasury_updatesValue() public {
        address newTreasury = makeAddr("newTreasury");
        locker.setTreasury(newTreasury);
        assertEq(locker.treasury(), newTreasury);
    }
}
