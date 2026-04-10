// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ForjaClaimer} from "../src/ForjaClaimer.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ForjaClaimerTest is Test {
    ForjaClaimer public claimer;
    MockERC20 public usdc;
    MockERC20 public token;

    address public owner = address(this);
    address public treasury = makeAddr("treasury");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public carol = makeAddr("carol");
    address public dave = makeAddr("dave");
    address public eve = makeAddr("eve");

    uint256 public constant CLAIM_FEE = 1e6; // 1 USDC
    uint256 public constant BOB_AMT = 100e6;
    uint256 public constant CAROL_AMT = 200e6;
    uint256 public constant DAVE_AMT = 300e6;
    uint256 public constant EVE_AMT = 400e6;
    uint256 public constant TOTAL_DEPOSIT = BOB_AMT + CAROL_AMT + DAVE_AMT + EVE_AMT;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        token = new MockERC20("Test Token", "TEST", 6);
        claimer = new ForjaClaimer(address(usdc), treasury, CLAIM_FEE);

        usdc.mint(alice, 1_000e6);
        token.mint(alice, 1_000_000e6);

        vm.startPrank(alice);
        usdc.approve(address(claimer), type(uint256).max);
        token.approve(address(claimer), type(uint256).max);
        vm.stopPrank();
    }

    // ===================== HELPERS =====================

    function _leaf(address recipient, uint256 amount) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(recipient, amount))));
    }

    /// @dev Sorted-pair hash (matches OZ MerkleProof.verify pair-hashing)
    function _hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    /// @dev Build a 4-leaf merkle tree and return root + per-leaf proofs.
    /// Layout (after sorting leaves):
    ///         root
    ///        /    \
    ///       n0    n1
    ///      / \   / \
    ///     l0 l1 l2 l3
    function _buildTree4(
        address[4] memory addrs,
        uint256[4] memory amts
    )
        internal
        pure
        returns (
            bytes32 root,
            bytes32[][] memory proofs,
            bytes32[4] memory leaves
        )
    {
        // Compute raw leaves
        for (uint256 i = 0; i < 4; i++) {
            leaves[i] = _leaf(addrs[i], amts[i]);
        }

        // Sort leaves ascending so the layout is deterministic regardless of input order
        for (uint256 i = 0; i < 4; i++) {
            for (uint256 j = i + 1; j < 4; j++) {
                if (leaves[j] < leaves[i]) {
                    (leaves[i], leaves[j]) = (leaves[j], leaves[i]);
                }
            }
        }

        bytes32 n0 = _hashPair(leaves[0], leaves[1]);
        bytes32 n1 = _hashPair(leaves[2], leaves[3]);
        root = _hashPair(n0, n1);

        proofs = new bytes32[][](4);
        // leaf 0 → sibling l1, then n1
        proofs[0] = new bytes32[](2);
        proofs[0][0] = leaves[1];
        proofs[0][1] = n1;
        // leaf 1 → sibling l0, then n1
        proofs[1] = new bytes32[](2);
        proofs[1][0] = leaves[0];
        proofs[1][1] = n1;
        // leaf 2 → sibling l3, then n0
        proofs[2] = new bytes32[](2);
        proofs[2][0] = leaves[3];
        proofs[2][1] = n0;
        // leaf 3 → sibling l2, then n0
        proofs[3] = new bytes32[](2);
        proofs[3][0] = leaves[2];
        proofs[3][1] = n0;
    }

    /// @dev Look up the proof for a specific (addr, amount) leaf in the tree built above.
    function _findProof(
        address[4] memory addrs,
        uint256[4] memory amts,
        address target,
        uint256 targetAmt
    ) internal pure returns (bytes32[] memory) {
        (, bytes32[][] memory proofs, bytes32[4] memory sortedLeaves) = _buildTree4(addrs, amts);
        bytes32 want = _leaf(target, targetAmt);
        for (uint256 i = 0; i < 4; i++) {
            if (sortedLeaves[i] == want) return proofs[i];
        }
        revert("leaf not found");
    }

    function _defaultAddrs() internal view returns (address[4] memory) {
        return [bob, carol, dave, eve];
    }

    function _defaultAmts() internal pure returns (uint256[4] memory) {
        return [BOB_AMT, CAROL_AMT, DAVE_AMT, EVE_AMT];
    }

    function _defaultRoot() internal view returns (bytes32 root) {
        (root, , ) = _buildTree4(_defaultAddrs(), _defaultAmts());
    }

    function _createDefaultCampaign() internal returns (uint256) {
        bytes32 root = _defaultRoot();
        vm.prank(alice);
        return claimer.createCampaign(
            address(token),
            root,
            TOTAL_DEPOSIT,
            0, // start = now
            uint64(block.timestamp + 30 days),
            true // sweepEnabled
        );
    }

    // ===================== CONSTRUCTOR =====================

    function test_constructor_setsValues() public view {
        assertEq(address(claimer.usdc()), address(usdc));
        assertEq(claimer.treasury(), treasury);
        assertEq(claimer.claimFee(), CLAIM_FEE);
        assertEq(claimer.nextCampaignId(), 1);
        assertEq(claimer.MAX_BATCH_CLAIMS(), 50);
    }

    function test_constructor_revertsZeroUsdc() public {
        vm.expectRevert(ForjaClaimer.ZeroAddress.selector);
        new ForjaClaimer(address(0), treasury, CLAIM_FEE);
    }

    function test_constructor_revertsZeroTreasury() public {
        vm.expectRevert(ForjaClaimer.ZeroAddress.selector);
        new ForjaClaimer(address(usdc), address(0), CLAIM_FEE);
    }

    // ===================== CREATE CAMPAIGN =====================

    function test_createCampaign_success() public {
        uint256 id = _createDefaultCampaign();
        assertEq(id, 1);
        assertEq(claimer.nextCampaignId(), 2);
        assertEq(token.balanceOf(address(claimer)), TOTAL_DEPOSIT);
    }

    function test_createCampaign_emitsEvent() public {
        bytes32 root = _defaultRoot();
        uint64 expectedEnd = uint64(block.timestamp + 30 days);

        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit ForjaClaimer.CampaignCreated(
            1,
            alice,
            address(token),
            root,
            TOTAL_DEPOSIT,
            uint64(block.timestamp),
            expectedEnd,
            true
        );
        claimer.createCampaign(address(token), root, TOTAL_DEPOSIT, 0, expectedEnd, true);
    }

    function test_createCampaign_transfersFee() public {
        uint256 before = usdc.balanceOf(treasury);
        _createDefaultCampaign();
        assertEq(usdc.balanceOf(treasury), before + CLAIM_FEE);
    }

    function test_createCampaign_transfersTokens() public {
        uint256 before = token.balanceOf(alice);
        _createDefaultCampaign();
        assertEq(token.balanceOf(alice), before - TOTAL_DEPOSIT);
        assertEq(token.balanceOf(address(claimer)), TOTAL_DEPOSIT);
    }

    function test_createCampaign_storesCorrectFields() public {
        uint256 id = _createDefaultCampaign();
        ForjaClaimer.Campaign memory c = claimer.getCampaign(id);

        assertEq(c.creator, alice);
        assertEq(c.token, address(token));
        assertEq(c.merkleRoot, _defaultRoot());
        assertEq(c.totalDeposited, TOTAL_DEPOSIT);
        assertEq(c.totalClaimed, 0);
        assertEq(c.startTime, uint64(block.timestamp));
        assertEq(c.endTime, uint64(block.timestamp + 30 days));
        assertTrue(c.sweepEnabled);
        assertFalse(c.swept);
    }

    function test_createCampaign_zeroToken_reverts() public {
        bytes32 root = _defaultRoot();
        vm.prank(alice);
        vm.expectRevert(ForjaClaimer.ZeroAddress.selector);
        claimer.createCampaign(address(0), root, TOTAL_DEPOSIT, 0, 0, false);
    }

    function test_createCampaign_zeroRoot_reverts() public {
        vm.prank(alice);
        vm.expectRevert(ForjaClaimer.ZeroRoot.selector);
        claimer.createCampaign(address(token), bytes32(0), TOTAL_DEPOSIT, 0, 0, false);
    }

    function test_createCampaign_zeroDeposit_reverts() public {
        bytes32 root = _defaultRoot();
        vm.prank(alice);
        vm.expectRevert(ForjaClaimer.ZeroAmount.selector);
        claimer.createCampaign(address(token), root, 0, 0, 0, false);
    }

    function test_createCampaign_endBeforeStart_reverts() public {
        bytes32 root = _defaultRoot();
        uint64 start = uint64(block.timestamp + 100);
        uint64 end = uint64(block.timestamp + 50);
        vm.prank(alice);
        vm.expectRevert(ForjaClaimer.InvalidTimeRange.selector);
        claimer.createCampaign(address(token), root, TOTAL_DEPOSIT, start, end, false);
    }

    function test_createCampaign_endEqualsStart_reverts() public {
        bytes32 root = _defaultRoot();
        uint64 ts = uint64(block.timestamp + 100);
        vm.prank(alice);
        vm.expectRevert(ForjaClaimer.InvalidTimeRange.selector);
        claimer.createCampaign(address(token), root, TOTAL_DEPOSIT, ts, ts, false);
    }

    function test_createCampaign_sweepWithoutEnd_reverts() public {
        bytes32 root = _defaultRoot();
        vm.prank(alice);
        vm.expectRevert(ForjaClaimer.InvalidTimeRange.selector);
        claimer.createCampaign(address(token), root, TOTAL_DEPOSIT, 0, 0, true);
    }

    function test_createCampaign_zeroStartTime_usesBlockTimestamp() public {
        uint256 id = _createDefaultCampaign();
        ForjaClaimer.Campaign memory c = claimer.getCampaign(id);
        assertEq(c.startTime, uint64(block.timestamp));
    }

    function test_createCampaign_noExpiry_allowed() public {
        bytes32 root = _defaultRoot();
        vm.prank(alice);
        uint256 id = claimer.createCampaign(address(token), root, TOTAL_DEPOSIT, 0, 0, false);
        ForjaClaimer.Campaign memory c = claimer.getCampaign(id);
        assertEq(c.endTime, 0);
        assertFalse(c.sweepEnabled);
    }

    function test_createCampaign_multipleByCreator_storedInList() public {
        _createDefaultCampaign();
        _createDefaultCampaign();
        _createDefaultCampaign();
        uint256[] memory ids = claimer.getCampaignsByCreator(alice);
        assertEq(ids.length, 3);
        assertEq(ids[0], 1);
        assertEq(ids[1], 2);
        assertEq(ids[2], 3);
    }

    function test_createCampaign_freeFee_skipsTransfer() public {
        // Owner sets fee to zero
        claimer.setClaimFee(0);
        uint256 before = usdc.balanceOf(treasury);
        _createDefaultCampaign();
        assertEq(usdc.balanceOf(treasury), before);
    }

    // ===================== CLAIM =====================

    function test_claim_validProof_success() public {
        uint256 id = _createDefaultCampaign();
        bytes32[] memory proof = _findProof(_defaultAddrs(), _defaultAmts(), bob, BOB_AMT);

        uint256 before = token.balanceOf(bob);
        vm.prank(bob);
        claimer.claim(id, BOB_AMT, proof);
        assertEq(token.balanceOf(bob), before + BOB_AMT);
    }

    function test_claim_emitsEvent() public {
        uint256 id = _createDefaultCampaign();
        bytes32[] memory proof = _findProof(_defaultAddrs(), _defaultAmts(), bob, BOB_AMT);

        bytes32 leaf = _leaf(bob, BOB_AMT);
        vm.prank(bob);
        vm.expectEmit(true, true, false, true);
        emit ForjaClaimer.Claimed(id, bob, BOB_AMT, leaf);
        claimer.claim(id, BOB_AMT, proof);
    }

    function test_claim_updatesTotalClaimed() public {
        uint256 id = _createDefaultCampaign();
        bytes32[] memory proof = _findProof(_defaultAddrs(), _defaultAmts(), bob, BOB_AMT);

        vm.prank(bob);
        claimer.claim(id, BOB_AMT, proof);

        ForjaClaimer.Campaign memory c = claimer.getCampaign(id);
        assertEq(c.totalClaimed, BOB_AMT);
    }

    function test_claim_marksLeafClaimed() public {
        uint256 id = _createDefaultCampaign();
        bytes32[] memory proof = _findProof(_defaultAddrs(), _defaultAmts(), bob, BOB_AMT);

        assertFalse(claimer.isClaimed(id, bob, BOB_AMT));
        vm.prank(bob);
        claimer.claim(id, BOB_AMT, proof);
        assertTrue(claimer.isClaimed(id, bob, BOB_AMT));
    }

    function test_claim_invalidProof_reverts() public {
        uint256 id = _createDefaultCampaign();
        bytes32[] memory proof = _findProof(_defaultAddrs(), _defaultAmts(), bob, BOB_AMT);

        // Wrong sender — bob's proof but carol claiming
        vm.prank(carol);
        vm.expectRevert(ForjaClaimer.InvalidProof.selector);
        claimer.claim(id, BOB_AMT, proof);
    }

    function test_claim_alreadyClaimed_reverts() public {
        uint256 id = _createDefaultCampaign();
        bytes32[] memory proof = _findProof(_defaultAddrs(), _defaultAmts(), bob, BOB_AMT);

        vm.prank(bob);
        claimer.claim(id, BOB_AMT, proof);

        vm.prank(bob);
        vm.expectRevert(ForjaClaimer.AlreadyClaimed.selector);
        claimer.claim(id, BOB_AMT, proof);
    }

    function test_claim_notStarted_reverts() public {
        bytes32 root = _defaultRoot();
        uint64 start = uint64(block.timestamp + 1 days);
        uint64 end = uint64(block.timestamp + 30 days);
        vm.prank(alice);
        uint256 id = claimer.createCampaign(address(token), root, TOTAL_DEPOSIT, start, end, true);

        bytes32[] memory proof = _findProof(_defaultAddrs(), _defaultAmts(), bob, BOB_AMT);
        vm.prank(bob);
        vm.expectRevert(ForjaClaimer.CampaignNotStarted.selector);
        claimer.claim(id, BOB_AMT, proof);
    }

    function test_claim_ended_reverts() public {
        uint256 id = _createDefaultCampaign();
        bytes32[] memory proof = _findProof(_defaultAddrs(), _defaultAmts(), bob, BOB_AMT);

        vm.warp(block.timestamp + 31 days);
        vm.prank(bob);
        vm.expectRevert(ForjaClaimer.CampaignEnded.selector);
        claimer.claim(id, BOB_AMT, proof);
    }

    function test_claim_wrongAmount_reverts() public {
        uint256 id = _createDefaultCampaign();
        bytes32[] memory proof = _findProof(_defaultAddrs(), _defaultAmts(), bob, BOB_AMT);

        vm.prank(bob);
        vm.expectRevert(ForjaClaimer.InvalidProof.selector);
        claimer.claim(id, BOB_AMT + 1, proof);
    }

    function test_claim_nonexistentCampaign_reverts() public {
        bytes32[] memory proof = new bytes32[](0);
        vm.prank(bob);
        vm.expectRevert(ForjaClaimer.InvalidProof.selector);
        claimer.claim(999, BOB_AMT, proof);
    }

    // ===================== CLAIM MULTIPLE =====================

    function test_claimMultiple_success() public {
        uint256 id1 = _createDefaultCampaign();
        uint256 id2 = _createDefaultCampaign();

        bytes32[] memory proof = _findProof(_defaultAddrs(), _defaultAmts(), bob, BOB_AMT);

        uint256[] memory ids = new uint256[](2);
        ids[0] = id1;
        ids[1] = id2;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = BOB_AMT;
        amounts[1] = BOB_AMT;
        bytes32[][] memory proofs = new bytes32[][](2);
        proofs[0] = proof;
        proofs[1] = proof;

        uint256 before = token.balanceOf(bob);
        vm.prank(bob);
        claimer.claimMultiple(ids, amounts, proofs);
        assertEq(token.balanceOf(bob), before + 2 * BOB_AMT);
    }

    function test_claimMultiple_empty_reverts() public {
        uint256[] memory ids = new uint256[](0);
        uint256[] memory amounts = new uint256[](0);
        bytes32[][] memory proofs = new bytes32[][](0);

        vm.prank(bob);
        vm.expectRevert(ForjaClaimer.BatchEmpty.selector);
        claimer.claimMultiple(ids, amounts, proofs);
    }

    function test_claimMultiple_exceedsMax_reverts() public {
        uint256[] memory ids = new uint256[](51);
        uint256[] memory amounts = new uint256[](51);
        bytes32[][] memory proofs = new bytes32[][](51);

        vm.prank(bob);
        vm.expectRevert(ForjaClaimer.BatchTooLarge.selector);
        claimer.claimMultiple(ids, amounts, proofs);
    }

    function test_claimMultiple_lengthMismatchAmounts_reverts() public {
        uint256[] memory ids = new uint256[](2);
        uint256[] memory amounts = new uint256[](1);
        bytes32[][] memory proofs = new bytes32[][](2);

        vm.prank(bob);
        vm.expectRevert(ForjaClaimer.LengthMismatch.selector);
        claimer.claimMultiple(ids, amounts, proofs);
    }

    function test_claimMultiple_lengthMismatchProofs_reverts() public {
        uint256[] memory ids = new uint256[](2);
        uint256[] memory amounts = new uint256[](2);
        bytes32[][] memory proofs = new bytes32[][](1);

        vm.prank(bob);
        vm.expectRevert(ForjaClaimer.LengthMismatch.selector);
        claimer.claimMultiple(ids, amounts, proofs);
    }

    function test_claimMultiple_oneInvalid_revertsAll() public {
        uint256 id1 = _createDefaultCampaign();
        uint256 id2 = _createDefaultCampaign();

        bytes32[] memory bobProof = _findProof(_defaultAddrs(), _defaultAmts(), bob, BOB_AMT);

        uint256[] memory ids = new uint256[](2);
        ids[0] = id1;
        ids[1] = id2;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = BOB_AMT;
        amounts[1] = BOB_AMT + 999; // wrong amount → invalid proof
        bytes32[][] memory proofs = new bytes32[][](2);
        proofs[0] = bobProof;
        proofs[1] = bobProof;

        uint256 before = token.balanceOf(bob);
        vm.prank(bob);
        vm.expectRevert(ForjaClaimer.InvalidProof.selector);
        claimer.claimMultiple(ids, amounts, proofs);
        // Whole batch reverted — bob received nothing
        assertEq(token.balanceOf(bob), before);
    }

    // ===================== SWEEP =====================

    function test_sweep_afterEnd_success() public {
        uint256 id = _createDefaultCampaign();
        vm.warp(block.timestamp + 31 days);

        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        claimer.sweep(id);
        assertEq(token.balanceOf(alice), before + TOTAL_DEPOSIT);
    }

    function test_sweep_emitsEvent() public {
        uint256 id = _createDefaultCampaign();
        vm.warp(block.timestamp + 31 days);

        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit ForjaClaimer.CampaignSwept(id, alice, TOTAL_DEPOSIT);
        claimer.sweep(id);
    }

    function test_sweep_partialClaim_returnsRemainder() public {
        uint256 id = _createDefaultCampaign();
        bytes32[] memory proof = _findProof(_defaultAddrs(), _defaultAmts(), bob, BOB_AMT);

        vm.prank(bob);
        claimer.claim(id, BOB_AMT, proof);

        vm.warp(block.timestamp + 31 days);
        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        claimer.sweep(id);
        assertEq(token.balanceOf(alice), before + (TOTAL_DEPOSIT - BOB_AMT));
    }

    function test_sweep_marksSwept() public {
        uint256 id = _createDefaultCampaign();
        vm.warp(block.timestamp + 31 days);
        vm.prank(alice);
        claimer.sweep(id);

        ForjaClaimer.Campaign memory c = claimer.getCampaign(id);
        assertTrue(c.swept);
    }

    function test_sweep_beforeEnd_reverts() public {
        uint256 id = _createDefaultCampaign();
        vm.prank(alice);
        vm.expectRevert(ForjaClaimer.CampaignNotEnded.selector);
        claimer.sweep(id);
    }

    function test_sweep_atExactEnd_reverts() public {
        uint256 id = _createDefaultCampaign();
        vm.warp(block.timestamp + 30 days); // exactly endTime
        vm.prank(alice);
        vm.expectRevert(ForjaClaimer.CampaignNotEnded.selector);
        claimer.sweep(id);
    }

    function test_sweep_notCreator_reverts() public {
        uint256 id = _createDefaultCampaign();
        vm.warp(block.timestamp + 31 days);
        vm.prank(bob);
        vm.expectRevert(ForjaClaimer.NotCreator.selector);
        claimer.sweep(id);
    }

    function test_sweep_disabled_reverts() public {
        bytes32 root = _defaultRoot();
        vm.prank(alice);
        uint256 id = claimer.createCampaign(
            address(token),
            root,
            TOTAL_DEPOSIT,
            0,
            uint64(block.timestamp + 30 days),
            false // sweepEnabled = false
        );
        vm.warp(block.timestamp + 31 days);
        vm.prank(alice);
        vm.expectRevert(ForjaClaimer.SweepDisabled.selector);
        claimer.sweep(id);
    }

    function test_sweep_alreadySwept_reverts() public {
        uint256 id = _createDefaultCampaign();
        vm.warp(block.timestamp + 31 days);
        vm.prank(alice);
        claimer.sweep(id);

        vm.prank(alice);
        vm.expectRevert(ForjaClaimer.AlreadySwept.selector);
        claimer.sweep(id);
    }

    function test_sweep_nothingRemaining_reverts() public {
        uint256 id = _createDefaultCampaign();
        // All recipients claim everything
        bytes32[] memory pBob = _findProof(_defaultAddrs(), _defaultAmts(), bob, BOB_AMT);
        bytes32[] memory pCarol = _findProof(_defaultAddrs(), _defaultAmts(), carol, CAROL_AMT);
        bytes32[] memory pDave = _findProof(_defaultAddrs(), _defaultAmts(), dave, DAVE_AMT);
        bytes32[] memory pEve = _findProof(_defaultAddrs(), _defaultAmts(), eve, EVE_AMT);

        vm.prank(bob);
        claimer.claim(id, BOB_AMT, pBob);
        vm.prank(carol);
        claimer.claim(id, CAROL_AMT, pCarol);
        vm.prank(dave);
        claimer.claim(id, DAVE_AMT, pDave);
        vm.prank(eve);
        claimer.claim(id, EVE_AMT, pEve);

        vm.warp(block.timestamp + 31 days);
        vm.prank(alice);
        vm.expectRevert(ForjaClaimer.NothingToSweep.selector);
        claimer.sweep(id);
    }

    // ===================== ADMIN =====================

    function test_setTreasury_onlyOwner() public {
        address newTreasury = makeAddr("new-treasury");
        claimer.setTreasury(newTreasury);
        assertEq(claimer.treasury(), newTreasury);
    }

    function test_setTreasury_emitsEvent() public {
        address newTreasury = makeAddr("new-treasury");
        vm.expectEmit(true, true, false, false);
        emit ForjaClaimer.TreasuryUpdated(treasury, newTreasury);
        claimer.setTreasury(newTreasury);
    }

    function test_setTreasury_zeroAddress_reverts() public {
        vm.expectRevert(ForjaClaimer.ZeroAddress.selector);
        claimer.setTreasury(address(0));
    }

    function test_setTreasury_notOwner_reverts() public {
        vm.prank(bob);
        vm.expectRevert();
        claimer.setTreasury(bob);
    }

    function test_setClaimFee_onlyOwner() public {
        claimer.setClaimFee(5e6);
        assertEq(claimer.claimFee(), 5e6);
    }

    function test_setClaimFee_emitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit ForjaClaimer.ClaimFeeUpdated(CLAIM_FEE, 5e6);
        claimer.setClaimFee(5e6);
    }

    function test_setClaimFee_notOwner_reverts() public {
        vm.prank(bob);
        vm.expectRevert();
        claimer.setClaimFee(5e6);
    }

    // ===================== VIEWS =====================

    function test_isClaimed_view() public {
        uint256 id = _createDefaultCampaign();
        assertFalse(claimer.isClaimed(id, bob, BOB_AMT));

        bytes32[] memory proof = _findProof(_defaultAddrs(), _defaultAmts(), bob, BOB_AMT);
        vm.prank(bob);
        claimer.claim(id, BOB_AMT, proof);

        assertTrue(claimer.isClaimed(id, bob, BOB_AMT));
        // Different amount → different leaf → not claimed
        assertFalse(claimer.isClaimed(id, bob, BOB_AMT + 1));
    }

    function test_getCampaign_view() public {
        uint256 id = _createDefaultCampaign();
        ForjaClaimer.Campaign memory c = claimer.getCampaign(id);
        assertEq(c.creator, alice);
        assertEq(c.token, address(token));
    }

    function test_getCampaignsByCreator_emptyForUnknown() public {
        address nobody = makeAddr("nobody");
        uint256[] memory ids = claimer.getCampaignsByCreator(nobody);
        assertEq(ids.length, 0);
    }

    // ===================== FUZZ =====================

    function testFuzz_setClaimFee(uint256 fee) public {
        claimer.setClaimFee(fee);
        assertEq(claimer.claimFee(), fee);
    }

    function testFuzz_claim_arbitraryAmount(uint128 raw) public {
        uint256 amount = uint256(raw);
        vm.assume(amount > 0 && amount < 1_000_000e6);

        // Build a fresh tree with bob at this amount + 3 dummies
        address[4] memory addrs = [bob, carol, dave, eve];
        uint256[4] memory amts = [amount, CAROL_AMT, DAVE_AMT, EVE_AMT];
        (bytes32 root, , ) = _buildTree4(addrs, amts);

        uint256 totalDeposit = amount + CAROL_AMT + DAVE_AMT + EVE_AMT;

        vm.prank(alice);
        uint256 id = claimer.createCampaign(
            address(token),
            root,
            totalDeposit,
            0,
            uint64(block.timestamp + 30 days),
            true
        );

        bytes32[] memory proof = _findProof(addrs, amts, bob, amount);
        uint256 before = token.balanceOf(bob);
        vm.prank(bob);
        claimer.claim(id, amount, proof);
        assertEq(token.balanceOf(bob), before + amount);
    }

    function testFuzz_claim_invariantTotalClaimedNeverExceedsDeposit(uint8 claimMask) public {
        uint256 id = _createDefaultCampaign();
        ForjaClaimer.Campaign memory c0 = claimer.getCampaign(id);

        if ((claimMask & 1) != 0) {
            vm.prank(bob);
            claimer.claim(id, BOB_AMT, _findProof(_defaultAddrs(), _defaultAmts(), bob, BOB_AMT));
        }
        if ((claimMask & 2) != 0) {
            vm.prank(carol);
            claimer.claim(
                id,
                CAROL_AMT,
                _findProof(_defaultAddrs(), _defaultAmts(), carol, CAROL_AMT)
            );
        }
        if ((claimMask & 4) != 0) {
            vm.prank(dave);
            claimer.claim(id, DAVE_AMT, _findProof(_defaultAddrs(), _defaultAmts(), dave, DAVE_AMT));
        }
        if ((claimMask & 8) != 0) {
            vm.prank(eve);
            claimer.claim(id, EVE_AMT, _findProof(_defaultAddrs(), _defaultAmts(), eve, EVE_AMT));
        }

        ForjaClaimer.Campaign memory c1 = claimer.getCampaign(id);
        assertLe(c1.totalClaimed, c0.totalDeposited);
    }
}
