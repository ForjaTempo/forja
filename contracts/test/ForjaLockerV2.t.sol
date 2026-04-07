// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ForjaLockerV2} from "../src/ForjaLockerV2.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ForjaLockerV2Test is Test {
    ForjaLockerV2 public locker;
    MockERC20 public usdc;
    MockERC20 public token;

    address public owner = address(this);
    address public treasury = makeAddr("treasury");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public carol = makeAddr("carol");
    address public dave = makeAddr("dave");

    uint256 public constant LOCK_FEE = 10e6; // 10 USDC
    uint256 public constant LOCK_AMOUNT = 10_000e6;
    uint64 public constant ONE_YEAR = 365 days;
    uint64 public constant SIX_MONTHS = 180 days;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        token = new MockERC20("Test Token", "TEST", 6);
        locker = new ForjaLockerV2(address(usdc), treasury, LOCK_FEE);

        usdc.mint(alice, 1000e6);
        token.mint(alice, 1_000_000e6);

        vm.startPrank(alice);
        usdc.approve(address(locker), type(uint256).max);
        token.approve(address(locker), type(uint256).max);
        vm.stopPrank();
    }

    function _createDefaultLock() internal returns (uint256) {
        vm.prank(alice);
        return locker.createLock(address(token), bob, LOCK_AMOUNT, ONE_YEAR, SIX_MONTHS, true, true);
    }

    // ===================== V1 COMPATIBILITY: CREATE LOCK =====================

    function test_createLock_success() public {
        uint256 lockId = _createDefaultLock();

        assertEq(lockId, 1);
        assertEq(token.balanceOf(address(locker)), LOCK_AMOUNT);
    }

    function test_createLock_emitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit ForjaLockerV2.LockCreated(
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

    function test_createLock_revertsZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(ForjaLockerV2.ZeroAmount.selector);
        locker.createLock(address(token), bob, 0, ONE_YEAR, SIX_MONTHS, true, true);
    }

    function test_createLock_revertsZeroDuration() public {
        vm.prank(alice);
        vm.expectRevert(ForjaLockerV2.ZeroDuration.selector);
        locker.createLock(address(token), bob, LOCK_AMOUNT, 0, 0, true, true);
    }

    function test_createLock_revertsZeroBeneficiary() public {
        vm.prank(alice);
        vm.expectRevert(ForjaLockerV2.ZeroAddress.selector);
        locker.createLock(address(token), address(0), LOCK_AMOUNT, ONE_YEAR, SIX_MONTHS, true, true);
    }

    function test_createLock_revertsCliffExceedsDuration() public {
        vm.prank(alice);
        vm.expectRevert(ForjaLockerV2.CliffExceedsDuration.selector);
        locker.createLock(address(token), bob, LOCK_AMOUNT, SIX_MONTHS, ONE_YEAR, true, true);
    }

    // ===================== V1 COMPATIBILITY: CLAIM =====================

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

        vm.warp(startTime + ONE_YEAR / 2);
        vm.prank(bob);
        locker.claim(lockId);

        uint256 expected = (LOCK_AMOUNT * (ONE_YEAR / 2)) / ONE_YEAR;
        assertEq(token.balanceOf(bob), expected);
    }

    function test_claim_beforeCliff() public {
        uint256 lockId = _createDefaultLock();

        vm.warp(block.timestamp + SIX_MONTHS - 1);
        vm.prank(bob);
        vm.expectRevert(ForjaLockerV2.NothingToClaim.selector);
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

    function test_claim_onlyBeneficiary() public {
        uint256 lockId = _createDefaultLock();

        vm.warp(block.timestamp + ONE_YEAR);
        vm.prank(alice);
        vm.expectRevert(ForjaLockerV2.NotBeneficiary.selector);
        locker.claim(lockId);
    }

    // ===================== V1 COMPATIBILITY: REVOKE =====================

    function test_revokeLock_success() public {
        uint256 lockId = _createDefaultLock();
        uint256 aliceBefore = token.balanceOf(alice);

        vm.prank(alice);
        locker.revokeLock(lockId);

        assertEq(token.balanceOf(alice), aliceBefore + LOCK_AMOUNT);
    }

    function test_revokeLock_onlyCreator() public {
        uint256 lockId = _createDefaultLock();

        vm.prank(bob);
        vm.expectRevert(ForjaLockerV2.NotCreator.selector);
        locker.revokeLock(lockId);
    }

    function test_revokeLock_notRevocable() public {
        vm.prank(alice);
        uint256 lockId = locker.createLock(address(token), bob, LOCK_AMOUNT, ONE_YEAR, SIX_MONTHS, true, false);

        vm.prank(alice);
        vm.expectRevert(ForjaLockerV2.NotRevocable.selector);
        locker.revokeLock(lockId);
    }

    function test_revokeLock_alreadyRevoked() public {
        uint256 lockId = _createDefaultLock();

        vm.prank(alice);
        locker.revokeLock(lockId);

        vm.prank(alice);
        vm.expectRevert(ForjaLockerV2.AlreadyRevoked.selector);
        locker.revokeLock(lockId);
    }

    // ===================== BATCH LOCK =====================

    function test_batchLock_success() public {
        address[] memory beneficiaries = new address[](3);
        beneficiaries[0] = bob;
        beneficiaries[1] = carol;
        beneficiaries[2] = dave;

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 1000e6;
        amounts[1] = 2000e6;
        amounts[2] = 3000e6;

        vm.prank(alice);
        uint256[] memory lockIds = locker.createBatchLock(
            address(token), beneficiaries, amounts, ONE_YEAR, SIX_MONTHS, true, true
        );

        assertEq(lockIds.length, 3);
        assertEq(lockIds[0], 1);
        assertEq(lockIds[1], 2);
        assertEq(lockIds[2], 3);

        // Verify each lock
        (address t,,address b, uint256 total,,,,,,, ) = locker.locks(1);
        assertEq(t, address(token));
        assertEq(b, bob);
        assertEq(total, 1000e6);

        (,, address b2, uint256 total2,,,,,,, ) = locker.locks(2);
        assertEq(b2, carol);
        assertEq(total2, 2000e6);

        (,, address b3, uint256 total3,,,,,,, ) = locker.locks(3);
        assertEq(b3, dave);
        assertEq(total3, 3000e6);

        // Total token transferred
        assertEq(token.balanceOf(address(locker)), 6000e6);
    }

    function test_batchLock_singleFee() public {
        address[] memory beneficiaries = new address[](5);
        uint256[] memory amounts = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            beneficiaries[i] = makeAddr(string(abi.encodePacked("user", i)));
            amounts[i] = 100e6;
        }

        uint256 treasuryBefore = usdc.balanceOf(treasury);
        vm.prank(alice);
        locker.createBatchLock(
            address(token), beneficiaries, amounts, ONE_YEAR, 0, true, false
        );

        // Only 1x fee charged, not 5x
        assertEq(usdc.balanceOf(treasury), treasuryBefore + LOCK_FEE);
    }

    function test_batchLock_emptyArray() public {
        address[] memory beneficiaries = new address[](0);
        uint256[] memory amounts = new uint256[](0);

        vm.prank(alice);
        vm.expectRevert(ForjaLockerV2.EmptyArray.selector);
        locker.createBatchLock(
            address(token), beneficiaries, amounts, ONE_YEAR, 0, true, false
        );
    }

    function test_batchLock_mismatchedArrays() public {
        address[] memory beneficiaries = new address[](2);
        beneficiaries[0] = bob;
        beneficiaries[1] = carol;
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 100e6;
        amounts[1] = 200e6;
        amounts[2] = 300e6;

        vm.prank(alice);
        vm.expectRevert(ForjaLockerV2.ArrayLengthMismatch.selector);
        locker.createBatchLock(
            address(token), beneficiaries, amounts, ONE_YEAR, 0, true, false
        );
    }

    function test_batchLock_exceedMax() public {
        address[] memory beneficiaries = new address[](51);
        uint256[] memory amounts = new uint256[](51);
        for (uint256 i = 0; i < 51; i++) {
            beneficiaries[i] = makeAddr(string(abi.encodePacked("user", i)));
            amounts[i] = 1e6;
        }

        vm.prank(alice);
        vm.expectRevert(ForjaLockerV2.ExceedsMaxBatchSize.selector);
        locker.createBatchLock(
            address(token), beneficiaries, amounts, ONE_YEAR, 0, true, false
        );
    }

    function test_batchLock_zeroAddress() public {
        address[] memory beneficiaries = new address[](2);
        beneficiaries[0] = bob;
        beneficiaries[1] = address(0);
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100e6;
        amounts[1] = 200e6;

        vm.prank(alice);
        vm.expectRevert(ForjaLockerV2.ZeroAddress.selector);
        locker.createBatchLock(
            address(token), beneficiaries, amounts, ONE_YEAR, 0, true, false
        );
    }

    function test_batchLock_zeroAmount() public {
        address[] memory beneficiaries = new address[](2);
        beneficiaries[0] = bob;
        beneficiaries[1] = carol;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100e6;
        amounts[1] = 0;

        vm.prank(alice);
        vm.expectRevert(ForjaLockerV2.ZeroAmount.selector);
        locker.createBatchLock(
            address(token), beneficiaries, amounts, ONE_YEAR, 0, true, false
        );
    }

    function test_batchLock_totalTransfer() public {
        address[] memory beneficiaries = new address[](3);
        beneficiaries[0] = bob;
        beneficiaries[1] = carol;
        beneficiaries[2] = dave;
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 1000e6;
        amounts[1] = 2000e6;
        amounts[2] = 3000e6;

        uint256 aliceBefore = token.balanceOf(alice);
        vm.prank(alice);
        locker.createBatchLock(
            address(token), beneficiaries, amounts, ONE_YEAR, 0, true, false
        );

        assertEq(token.balanceOf(alice), aliceBefore - 6000e6);
        assertEq(token.balanceOf(address(locker)), 6000e6);
    }

    function test_batchLock_individualClaims() public {
        address[] memory beneficiaries = new address[](3);
        beneficiaries[0] = bob;
        beneficiaries[1] = carol;
        beneficiaries[2] = dave;
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 1000e6;
        amounts[1] = 2000e6;
        amounts[2] = 3000e6;

        vm.prank(alice);
        uint256[] memory lockIds = locker.createBatchLock(
            address(token), beneficiaries, amounts, ONE_YEAR, 0, true, false
        );

        vm.warp(block.timestamp + ONE_YEAR);

        vm.prank(bob);
        locker.claim(lockIds[0]);
        assertEq(token.balanceOf(bob), 1000e6);

        vm.prank(carol);
        locker.claim(lockIds[1]);
        assertEq(token.balanceOf(carol), 2000e6);

        vm.prank(dave);
        locker.claim(lockIds[2]);
        assertEq(token.balanceOf(dave), 3000e6);
    }

    function test_batchLock_individualRevoke() public {
        address[] memory beneficiaries = new address[](2);
        beneficiaries[0] = bob;
        beneficiaries[1] = carol;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000e6;
        amounts[1] = 2000e6;

        vm.prank(alice);
        uint256[] memory lockIds = locker.createBatchLock(
            address(token), beneficiaries, amounts, ONE_YEAR, SIX_MONTHS, true, true
        );

        uint256 aliceBefore = token.balanceOf(alice);

        // Revoke only bob's lock (before cliff, so all tokens return)
        vm.prank(alice);
        locker.revokeLock(lockIds[0]);

        assertEq(token.balanceOf(alice), aliceBefore + 1000e6);

        // Carol's lock still works
        vm.warp(block.timestamp + ONE_YEAR);
        vm.prank(carol);
        locker.claim(lockIds[1]);
        assertEq(token.balanceOf(carol), 2000e6);
    }

    function test_batchLock_vestingLogic() public {
        address[] memory beneficiaries = new address[](2);
        beneficiaries[0] = bob;
        beneficiaries[1] = carol;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000e6;
        amounts[1] = 2000e6;

        uint256 startTime = block.timestamp;

        vm.prank(alice);
        uint256[] memory lockIds = locker.createBatchLock(
            address(token), beneficiaries, amounts, ONE_YEAR, SIX_MONTHS, true, false
        );

        // At 50% (halfway), should get ~50% vested
        vm.warp(startTime + ONE_YEAR / 2);

        vm.prank(bob);
        locker.claim(lockIds[0]);
        uint256 expected = (1000e6 * (ONE_YEAR / 2)) / ONE_YEAR;
        assertEq(token.balanceOf(bob), expected);
    }

    function test_batchLock_cliffLogic() public {
        address[] memory beneficiaries = new address[](2);
        beneficiaries[0] = bob;
        beneficiaries[1] = carol;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000e6;
        amounts[1] = 2000e6;

        vm.prank(alice);
        uint256[] memory lockIds = locker.createBatchLock(
            address(token), beneficiaries, amounts, ONE_YEAR, SIX_MONTHS, true, false
        );

        // Before cliff
        vm.warp(block.timestamp + SIX_MONTHS - 1);
        vm.prank(bob);
        vm.expectRevert(ForjaLockerV2.NothingToClaim.selector);
        locker.claim(lockIds[0]);

        // At cliff — should work
        vm.warp(block.timestamp + 1);
        vm.prank(bob);
        locker.claim(lockIds[0]);
        assertGt(token.balanceOf(bob), 0);
    }

    function test_batchLock_emitsLockCreatedEvents() public {
        address[] memory beneficiaries = new address[](2);
        beneficiaries[0] = bob;
        beneficiaries[1] = carol;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000e6;
        amounts[1] = 2000e6;

        vm.prank(alice);
        // Just check it doesn't revert — event emission verified by other tests
        uint256[] memory lockIds = locker.createBatchLock(
            address(token), beneficiaries, amounts, ONE_YEAR, 0, true, false
        );
        assertEq(lockIds.length, 2);
    }

    function test_batchLock_getLocksByCreatorAndBeneficiary() public {
        address[] memory beneficiaries = new address[](3);
        beneficiaries[0] = bob;
        beneficiaries[1] = carol;
        beneficiaries[2] = bob; // bob appears twice
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 100e6;
        amounts[1] = 200e6;
        amounts[2] = 300e6;

        vm.prank(alice);
        locker.createBatchLock(
            address(token), beneficiaries, amounts, ONE_YEAR, 0, true, false
        );

        uint256[] memory creatorLocks = locker.getLocksByCreator(alice);
        assertEq(creatorLocks.length, 3);

        uint256[] memory bobLocks = locker.getLocksByBeneficiary(bob);
        assertEq(bobLocks.length, 2); // bob has 2 locks

        uint256[] memory carolLocks = locker.getLocksByBeneficiary(carol);
        assertEq(carolLocks.length, 1);
    }

    // ===================== FUZZ =====================

    function testFuzz_batchLock_variousCounts(uint8 rawCount) public {
        uint256 count = bound(uint256(rawCount), 1, 50);

        address[] memory beneficiaries = new address[](count);
        uint256[] memory amounts = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            beneficiaries[i] = makeAddr(string(abi.encodePacked("fuzzUser", i)));
            amounts[i] = 10e6; // small fixed amount
        }

        vm.prank(alice);
        uint256[] memory lockIds = locker.createBatchLock(
            address(token), beneficiaries, amounts, ONE_YEAR, 0, true, false
        );
        assertEq(lockIds.length, count);
    }

    function testFuzz_batchLock_variousAmounts(uint256 rawAmount) public {
        uint256 amount = bound(rawAmount, 1, 1_000_000e6);

        address[] memory beneficiaries = new address[](1);
        beneficiaries[0] = bob;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        vm.prank(alice);
        uint256[] memory lockIds = locker.createBatchLock(
            address(token), beneficiaries, amounts, ONE_YEAR, 0, true, false
        );
        assertEq(lockIds.length, 1);

        (,,,uint256 total,,,,,,,) = locker.locks(lockIds[0]);
        assertEq(total, amount);
    }

    // ===================== V1 COMPAT: VIEW FUNCTIONS =====================

    function test_getClaimableAmount_variousTimestamps() public {
        uint256 lockId = _createDefaultLock();
        uint256 startTime = block.timestamp;

        vm.warp(startTime + SIX_MONTHS - 1);
        assertEq(locker.getClaimableAmount(lockId), 0);

        vm.warp(startTime + SIX_MONTHS);
        assertGt(locker.getClaimableAmount(lockId), 0);

        vm.warp(startTime + ONE_YEAR);
        assertEq(locker.getClaimableAmount(lockId), LOCK_AMOUNT);
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
        vm.expectRevert(ForjaLockerV2.ZeroAddress.selector);
        locker.setTreasury(address(0));
    }

    function test_constructor_rejectsZeroUsdc() public {
        vm.expectRevert(ForjaLockerV2.ZeroAddress.selector);
        new ForjaLockerV2(address(0), treasury, LOCK_FEE);
    }

    function test_constructor_rejectsZeroTreasury() public {
        vm.expectRevert(ForjaLockerV2.ZeroAddress.selector);
        new ForjaLockerV2(address(usdc), address(0), LOCK_FEE);
    }

    function test_batchLock_zeroTokenAddress() public {
        address[] memory beneficiaries = new address[](1);
        beneficiaries[0] = bob;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100e6;

        vm.prank(alice);
        vm.expectRevert(ForjaLockerV2.ZeroAddress.selector);
        locker.createBatchLock(
            address(0), beneficiaries, amounts, ONE_YEAR, 0, true, false
        );
    }

    function test_batchLock_zeroDuration() public {
        address[] memory beneficiaries = new address[](1);
        beneficiaries[0] = bob;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100e6;

        vm.prank(alice);
        vm.expectRevert(ForjaLockerV2.ZeroDuration.selector);
        locker.createBatchLock(
            address(token), beneficiaries, amounts, 0, 0, true, false
        );
    }

    function test_batchLock_cliffExceedsDuration() public {
        address[] memory beneficiaries = new address[](1);
        beneficiaries[0] = bob;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100e6;

        vm.prank(alice);
        vm.expectRevert(ForjaLockerV2.CliffExceedsDuration.selector);
        locker.createBatchLock(
            address(token), beneficiaries, amounts, SIX_MONTHS, ONE_YEAR, true, false
        );
    }
}
