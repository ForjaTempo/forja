// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ForjaLaunchpad} from "../src/ForjaLaunchpad.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockTIP20} from "./mocks/MockTIP20.sol";
import {MockTIP20Factory} from "./mocks/MockTIP20Factory.sol";
import {MockPoolManager} from "./mocks/MockPoolManager.sol";
import {MockPositionManager} from "./mocks/MockPositionManager.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ForjaLaunchpadTest is Test {
    ForjaLaunchpad public launchpad;
    MockERC20 public usdc;
    MockTIP20Factory public tipFactory;
    MockPoolManager public poolManager;
    MockPositionManager public positionManager;

    address public owner = address(this);
    address public treasury = makeAddr("treasury");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");

    uint256 public constant CREATE_FEE = 2e6;
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000e6;
    uint256 public constant CURVE_SUPPLY = 800_000_000e6;
    uint256 public constant GRADUATION_THRESHOLD = 69_000e6;
    uint256 public constant MIN_TRADE = 1e6;
    uint256 public constant MAX_SINGLE_BUY = 5_000e6;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        tipFactory = new MockTIP20Factory();
        poolManager = new MockPoolManager();
        positionManager = new MockPositionManager();

        launchpad = new ForjaLaunchpad(
            address(tipFactory),
            address(usdc),
            address(usdc),
            treasury,
            address(poolManager),
            address(positionManager),
            CREATE_FEE
        );

        usdc.mint(alice, 1_000_000e6);
        usdc.mint(bob, 1_000_000e6);
        usdc.mint(charlie, 1_000_000e6);

        vm.prank(alice);
        usdc.approve(address(launchpad), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(launchpad), type(uint256).max);
        vm.prank(charlie);
        usdc.approve(address(launchpad), type(uint256).max);
    }

    function _createDefaultLaunch() internal returns (uint256) {
        vm.prank(alice);
        return launchpad.createLaunch("Test Token", "TEST", "A test token", "");
    }

    // ═══════════════════════════════════════════
    // ║  CONSTRUCTOR
    // ═══════════════════════════════════════════

    function test_constructor_setsValues() public view {
        assertEq(address(launchpad.usdc()), address(usdc));
        assertEq(launchpad.treasury(), treasury);
        assertEq(launchpad.createFee(), CREATE_FEE);
    }

    function test_constructor_rejectsZeroTipFactory() public {
        vm.expectRevert(ForjaLaunchpad.ZeroAddress.selector);
        new ForjaLaunchpad(address(0), address(usdc), address(usdc), treasury, address(poolManager), address(positionManager), CREATE_FEE);
    }

    function test_constructor_rejectsZeroUsdc() public {
        vm.expectRevert(ForjaLaunchpad.ZeroAddress.selector);
        new ForjaLaunchpad(address(tipFactory), address(0), address(usdc), treasury, address(poolManager), address(positionManager), CREATE_FEE);
    }

    function test_constructor_rejectsZeroTreasury() public {
        vm.expectRevert(ForjaLaunchpad.ZeroAddress.selector);
        new ForjaLaunchpad(address(tipFactory), address(usdc), address(usdc), address(0), address(poolManager), address(positionManager), CREATE_FEE);
    }

    function test_constructor_rejectsZeroPoolManager() public {
        vm.expectRevert(ForjaLaunchpad.ZeroAddress.selector);
        new ForjaLaunchpad(address(tipFactory), address(usdc), address(usdc), treasury, address(0), address(positionManager), CREATE_FEE);
    }

    function test_constructor_rejectsZeroPositionManager() public {
        vm.expectRevert(ForjaLaunchpad.ZeroAddress.selector);
        new ForjaLaunchpad(address(tipFactory), address(usdc), address(usdc), treasury, address(poolManager), address(0), CREATE_FEE);
    }

    // ═══════════════════════════════════════════
    // ║  CREATE LAUNCH
    // ═══════════════════════════════════════════

    function test_createLaunch_success() public {
        vm.prank(alice);
        uint256 launchId = launchpad.createLaunch("Test Token", "TEST", "A test token", "https://img.com/1.png");

        assertEq(launchId, 0);
        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(0);
        assertTrue(l.token != address(0));
        assertEq(l.creator, alice);
        assertEq(l.realTokensSold, 0);
        assertFalse(l.graduated);
    }

    function test_createLaunch_storesMeta() public {
        vm.prank(alice);
        launchpad.createLaunch("MyToken", "MTK", "My desc", "https://img.com/1.png");

        ForjaLaunchpad.LaunchMeta memory m = launchpad.getLaunchMeta(0);
        assertEq(keccak256(bytes(m.name)), keccak256(bytes("MyToken")));
        assertEq(keccak256(bytes(m.symbol)), keccak256(bytes("MTK")));
        assertEq(keccak256(bytes(m.description)), keccak256(bytes("My desc")));
        assertEq(keccak256(bytes(m.imageUri)), keccak256(bytes("https://img.com/1.png")));
    }

    function test_createLaunch_emitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, false);
        emit ForjaLaunchpad.LaunchCreated(0, alice, address(0), "", "", "", "");
        launchpad.createLaunch("Test Token", "TEST", "desc", "img");
    }

    function test_createLaunch_collectsFee() public {
        uint256 treasuryBefore = usdc.balanceOf(treasury);
        vm.prank(alice);
        launchpad.createLaunch("Test", "TST", "", "");
        assertEq(usdc.balanceOf(treasury), treasuryBefore + CREATE_FEE);
    }

    function test_createLaunch_mintsTokensToContract() public {
        vm.prank(alice);
        launchpad.createLaunch("Test", "TST", "", "");
        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(0);
        assertEq(IERC20(l.token).balanceOf(address(launchpad)), TOTAL_SUPPLY);
    }

    function test_createLaunch_incrementsId() public {
        vm.prank(alice);
        uint256 id1 = launchpad.createLaunch("T1", "T1", "", "");
        vm.prank(alice);
        uint256 id2 = launchpad.createLaunch("T2", "T2", "", "");
        assertEq(id1, 0);
        assertEq(id2, 1);
    }

    function test_createLaunch_revertsWhenPaused() public {
        launchpad.pause();
        vm.prank(alice);
        vm.expectRevert();
        launchpad.createLaunch("Test", "TST", "", "");
    }

    function test_createLaunch_allowlistBlocks() public {
        launchpad.setAllowlistEnabled(true);
        vm.prank(alice);
        vm.expectRevert(ForjaLaunchpad.NotAllowlisted.selector);
        launchpad.createLaunch("Test", "TST", "", "");
    }

    function test_createLaunch_allowlistAllows() public {
        launchpad.setAllowlistEnabled(true);
        launchpad.setAllowlisted(alice, true);
        vm.prank(alice);
        uint256 id = launchpad.createLaunch("Test", "TST", "", "");
        assertEq(id, 0);
    }

    function test_createLaunch_revertsInsufficientUsdc() public {
        address broke = makeAddr("broke");
        vm.startPrank(broke);
        usdc.approve(address(launchpad), type(uint256).max);
        vm.expectRevert();
        launchpad.createLaunch("Test", "TST", "", "");
        vm.stopPrank();
    }

    function test_createLaunch_zeroFeeWorks() public {
        launchpad.setCreateFee(0);
        address user = makeAddr("user");
        vm.startPrank(user);
        usdc.approve(address(launchpad), type(uint256).max);
        uint256 id = launchpad.createLaunch("Free", "FREE", "", "");
        vm.stopPrank();
        assertEq(id, 0);
    }

    // ═══════════════════════════════════════════
    // ║  BUY
    // ═══════════════════════════════════════════

    function test_buy_success() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 100e6, 0);
        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        assertTrue(l.realTokensSold > 0);
        assertTrue(l.realUsdcRaised > 0);
    }

    function test_buy_transfersTokensToBuyer() public {
        uint256 launchId = _createDefaultLaunch();
        ForjaLaunchpad.Launch memory before_ = launchpad.getLaunchInfo(launchId);
        vm.prank(bob);
        launchpad.buy(launchId, 100e6, 0);
        assertTrue(IERC20(before_.token).balanceOf(bob) > 0);
    }

    function test_buy_emitsEvent() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        vm.expectEmit(true, true, false, false);
        emit ForjaLaunchpad.TokenBought(launchId, bob, 0, 0, 0);
        launchpad.buy(launchId, 100e6, 0);
    }

    function test_buy_collectsTradingFee() public {
        uint256 launchId = _createDefaultLaunch();
        uint256 treasuryBefore = usdc.balanceOf(treasury);
        vm.prank(bob);
        launchpad.buy(launchId, 100e6, 0);
        assertTrue(usdc.balanceOf(treasury) > treasuryBefore);
    }

    function test_buy_accruatesCreatorFee() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 100e6, 0);
        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        assertTrue(l.creatorFeeAccrued > 0);
    }

    function test_buy_revertsBelowMinTrade() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        vm.expectRevert(ForjaLaunchpad.BelowMinTrade.selector);
        launchpad.buy(launchId, 0.5e6, 0);
    }

    function test_buy_revertsAboveMaxBuy() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        vm.expectRevert(ForjaLaunchpad.AboveMaxBuy.selector);
        launchpad.buy(launchId, 5_001e6, 0);
    }

    function test_buy_revertsSlippageExceeded() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        vm.expectRevert(ForjaLaunchpad.SlippageExceeded.selector);
        launchpad.buy(launchId, 1e6, type(uint256).max);
    }

    function test_buy_revertsWhenPaused() public {
        uint256 launchId = _createDefaultLaunch();
        launchpad.pause();
        vm.prank(bob);
        vm.expectRevert();
        launchpad.buy(launchId, 100e6, 0);
    }

    function test_buy_revertsKilledLaunch() public {
        uint256 launchId = _createDefaultLaunch();
        launchpad.killLaunch(launchId);
        vm.prank(bob);
        vm.expectRevert(ForjaLaunchpad.LaunchKilledError.selector);
        launchpad.buy(launchId, 100e6, 0);
    }

    function test_buy_revertsNonExistent() public {
        vm.prank(bob);
        vm.expectRevert(ForjaLaunchpad.LaunchNotActive.selector);
        launchpad.buy(999, 100e6, 0);
    }

    function test_buy_perBlockLimitEnforced() public {
        uint256 launchId = _createDefaultLaunch();
        // Max per block = 69000 * 1000 / 10000 = 6900 USDC
        // Two max buys (5000 each) = 10000 > 6900
        vm.prank(bob);
        launchpad.buy(launchId, 5_000e6, 0);
        vm.prank(charlie);
        vm.expectRevert(ForjaLaunchpad.BlockLimitExceeded.selector);
        launchpad.buy(launchId, 2_000e6, 0);
    }

    function test_buy_perBlockLimitResetsNextBlock() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 5_000e6, 0);
        vm.roll(block.number + 1);
        vm.prank(charlie);
        launchpad.buy(launchId, 100e6, 0);
    }

    function test_buy_priceIncreasesMonotonically() public {
        uint256 launchId = _createDefaultLaunch();
        uint256 price1 = launchpad.getCurrentPrice(launchId);

        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);
        uint256 price2 = launchpad.getCurrentPrice(launchId);

        vm.roll(block.number + 1);
        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);
        uint256 price3 = launchpad.getCurrentPrice(launchId);

        assertTrue(price2 > price1, "Price should increase after buy");
        assertTrue(price3 > price2, "Price should continue increasing");
    }

    function test_buy_creatorCanBuyOwnToken() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(alice);
        launchpad.buy(launchId, 100e6, 0);
        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        assertTrue(l.realTokensSold > 0);
    }

    function test_buy_exactMaxBuyAllowed() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, MAX_SINGLE_BUY, 0);
    }

    function test_buy_exactMinTradeAllowed() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, MIN_TRADE, 0);
    }

    // ═══════════════════════════════════════════
    // ║  SELL
    // ═══════════════════════════════════════════

    function test_sell_success() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);

        ForjaLaunchpad.Launch memory afterBuy = launchpad.getLaunchInfo(launchId);
        uint256 tokensBought = IERC20(afterBuy.token).balanceOf(bob);
        uint256 sellAmount = tokensBought / 2;

        vm.startPrank(bob);
        IERC20(afterBuy.token).approve(address(launchpad), sellAmount);
        launchpad.sell(launchId, sellAmount, 0);
        vm.stopPrank();

        ForjaLaunchpad.Launch memory afterSell = launchpad.getLaunchInfo(launchId);
        assertEq(afterSell.realTokensSold, afterBuy.realTokensSold - sellAmount);
    }

    function test_sell_emitsEvent() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 tokens = IERC20(l.token).balanceOf(bob);

        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), tokens);
        vm.expectEmit(true, true, false, false);
        emit ForjaLaunchpad.TokenSold(launchId, bob, 0, 0, 0, 0);
        launchpad.sell(launchId, tokens / 2, 0);
        vm.stopPrank();
    }

    function test_sell_priceDecreases() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);
        uint256 priceAfterBuy = launchpad.getCurrentPrice(launchId);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 tokens = IERC20(l.token).balanceOf(bob);

        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), tokens);
        launchpad.sell(launchId, tokens / 2, 0);
        vm.stopPrank();

        assertTrue(launchpad.getCurrentPrice(launchId) < priceAfterBuy);
    }

    function test_sell_revertsZeroAmount() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        vm.expectRevert(ForjaLaunchpad.BelowMinTrade.selector);
        launchpad.sell(launchId, 0, 0);
    }

    function test_sell_revertsSlippage() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 tokens = IERC20(l.token).balanceOf(bob);

        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), tokens);
        vm.expectRevert(ForjaLaunchpad.SlippageExceeded.selector);
        launchpad.sell(launchId, tokens / 2, type(uint256).max);
        vm.stopPrank();
    }

    function test_sell_revertsAfterGraduation() public {
        uint256 launchId = _createDefaultLaunch();
        _graduateLaunch(launchId);
        vm.prank(bob);
        vm.expectRevert(ForjaLaunchpad.LaunchAlreadyGraduated.selector);
        launchpad.sell(launchId, 1e6, 0);
    }

    function test_sell_succeedsAfterKill() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 100e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 tokensBought = IERC20(l.token).balanceOf(bob);
        launchpad.killLaunch(launchId);

        // Bob can sell back on killed launch (exit position)
        uint256 bobUsdcBefore = usdc.balanceOf(bob);
        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), tokensBought);
        launchpad.sell(launchId, tokensBought, 0);
        vm.stopPrank();

        assertTrue(usdc.balanceOf(bob) > bobUsdcBefore, "Bob should receive USDC from sell");
        assertEq(IERC20(l.token).balanceOf(bob), 0, "Bob should have no tokens left");
    }

    function test_sell_succeedsAfterFailed() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 100e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 tokensBought = IERC20(l.token).balanceOf(bob);

        vm.warp(block.timestamp + 30 days + 1);
        launchpad.markLaunchAsFailed(launchId);

        // Bob can sell back on failed launch
        uint256 bobUsdcBefore = usdc.balanceOf(bob);
        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), tokensBought);
        launchpad.sell(launchId, tokensBought, 0);
        vm.stopPrank();

        assertTrue(usdc.balanceOf(bob) > bobUsdcBefore, "Bob should receive USDC from sell");
    }

    function test_sell_preventedSecondaryMarketExploit() public {
        // Verifies the fix: secondary market holders can only sell at curve price,
        // not claim a flat refund that would be disproportionate.
        uint256 launchId = _createDefaultLaunch();

        // Bob buys at low price
        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);

        // Charlie buys at higher price (price goes up after Bob's buy)
        vm.roll(block.number + 1);
        vm.prank(charlie);
        launchpad.buy(launchId, 1_000e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 bobTokens = IERC20(l.token).balanceOf(bob);
        uint256 charlieTokens = IERC20(l.token).balanceOf(charlie);

        // Bob transfers tokens to Charlie (secondary market transfer)
        vm.prank(bob);
        IERC20(l.token).transfer(charlie, bobTokens);

        // Launch gets killed
        launchpad.killLaunch(launchId);

        // Charlie sells all tokens (his + bob's) — gets curve price, not proportional refund
        uint256 allTokens = bobTokens + charlieTokens;
        uint256 charlieBefore = usdc.balanceOf(charlie);
        vm.startPrank(charlie);
        IERC20(l.token).approve(address(launchpad), allTokens);
        launchpad.sell(launchId, allTokens, 0);
        vm.stopPrank();

        uint256 charlieGot = usdc.balanceOf(charlie) - charlieBefore;

        // Charlie should NOT get more than what was raised (fee-adjusted)
        assertTrue(charlieGot <= l.realUsdcRaised, "Should not extract more than pool balance");
    }

    function test_sell_buyThenSellNeverProfits() public {
        uint256 launchId = _createDefaultLaunch();
        uint256 usdcBefore = usdc.balanceOf(bob);

        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 tokens = IERC20(l.token).balanceOf(bob);

        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), tokens);
        launchpad.sell(launchId, tokens, 0);
        vm.stopPrank();

        assertTrue(usdc.balanceOf(bob) <= usdcBefore);
    }

    // ═══════════════════════════════════════════
    // ║  CREATOR FEE
    // ═══════════════════════════════════════════

    function test_claimCreatorFee_success() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 fee = l.creatorFeeAccrued;
        assertTrue(fee > 0);

        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        launchpad.claimCreatorFee(launchId);
        assertEq(usdc.balanceOf(alice), aliceBefore + fee);
    }

    function test_claimCreatorFee_revertsNotCreator() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 100e6, 0);
        vm.prank(bob);
        vm.expectRevert(ForjaLaunchpad.NotCreator.selector);
        launchpad.claimCreatorFee(launchId);
    }

    function test_claimCreatorFee_revertsNothingToClaim() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(alice);
        vm.expectRevert(ForjaLaunchpad.NothingToClaim.selector);
        launchpad.claimCreatorFee(launchId);
    }

    function test_claimCreatorFee_resetsAfterClaim() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 100e6, 0);
        vm.prank(alice);
        launchpad.claimCreatorFee(launchId);
        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        assertEq(l.creatorFeeAccrued, 0);
    }

    // ═══════════════════════════════════════════
    // ║  GRADUATION
    // ═══════════════════════════════════════════

    function _graduateLaunch(uint256 launchId) internal {
        uint256 totalBought;
        while (totalBought < GRADUATION_THRESHOLD) {
            uint256 buyAmt = MAX_SINGLE_BUY;
            vm.roll(block.number + 1);
            usdc.mint(bob, buyAmt);
            vm.prank(bob);
            launchpad.buy(launchId, buyAmt, 0);
            ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
            totalBought = l.realUsdcRaised;
            if (l.graduated) break;
        }
    }

    function test_graduation_triggersOnThreshold() public {
        uint256 launchId = _createDefaultLaunch();
        _graduateLaunch(launchId);
        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        assertTrue(l.graduated);
    }

    function test_graduation_createsUniswapPool() public {
        uint256 launchId = _createDefaultLaunch();
        _graduateLaunch(launchId);
        assertEq(poolManager.initializeCallCount(), 1);
    }

    function test_graduation_mintsLPToDeadAddress() public {
        uint256 launchId = _createDefaultLaunch();
        _graduateLaunch(launchId);
        assertEq(positionManager.lastOwner(), launchpad.BURN_ADDRESS());
    }

    function test_graduation_cannotBuyAfter() public {
        uint256 launchId = _createDefaultLaunch();
        _graduateLaunch(launchId);
        vm.roll(block.number + 1);
        vm.prank(bob);
        vm.expectRevert(ForjaLaunchpad.LaunchAlreadyGraduated.selector);
        launchpad.buy(launchId, 100e6, 0);
    }

    function test_graduation_failedPoolInit() public {
        uint256 launchId = _createDefaultLaunch();
        poolManager.setShouldRevert(true);

        uint256 totalBought;
        while (totalBought < GRADUATION_THRESHOLD) {
            vm.roll(block.number + 1);
            usdc.mint(bob, MAX_SINGLE_BUY);
            vm.prank(bob);
            launchpad.buy(launchId, MAX_SINGLE_BUY, 0);
            ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
            totalBought = l.realUsdcRaised;
            if (l.failed || l.graduated) break;
        }

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        assertTrue(l.failed);
        assertFalse(l.graduated);
    }

    function test_graduation_failedMint() public {
        uint256 launchId = _createDefaultLaunch();
        positionManager.setShouldRevert(true);

        uint256 totalBought;
        while (totalBought < GRADUATION_THRESHOLD) {
            vm.roll(block.number + 1);
            usdc.mint(bob, MAX_SINGLE_BUY);
            vm.prank(bob);
            launchpad.buy(launchId, MAX_SINGLE_BUY, 0);
            ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
            totalBought = l.realUsdcRaised;
            if (l.failed || l.graduated) break;
        }

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        assertTrue(l.failed);
    }

    // ═══════════════════════════════════════════
    // ║  VIEW FUNCTIONS
    // ═══════════════════════════════════════════

    function test_getCurrentPrice_initialPrice() public {
        uint256 launchId = _createDefaultLaunch();
        uint256 price = launchpad.getCurrentPrice(launchId);
        assertTrue(price > 0);
        assertTrue(price < 100);
    }

    function test_calculateBuyReturn_matchesBuy() public {
        uint256 launchId = _createDefaultLaunch();
        uint256 expected = launchpad.calculateBuyReturn(launchId, 100e6);
        ForjaLaunchpad.Launch memory before_ = launchpad.getLaunchInfo(launchId);

        vm.prank(bob);
        launchpad.buy(launchId, 100e6, 0);

        assertEq(IERC20(before_.token).balanceOf(bob), expected);
    }

    function test_calculateSellReturn_matchesSell() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 tokens = IERC20(l.token).balanceOf(bob);
        uint256 sellAmt = tokens / 2;
        uint256 expected = launchpad.calculateSellReturn(launchId, sellAmt);

        uint256 bobBefore = usdc.balanceOf(bob);
        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), sellAmt);
        launchpad.sell(launchId, sellAmt, 0);
        vm.stopPrank();

        assertEq(usdc.balanceOf(bob) - bobBefore, expected);
    }

    // ═══════════════════════════════════════════
    // ║  ADMIN
    // ═══════════════════════════════════════════

    function test_pause_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        launchpad.pause();
    }

    function test_unpause_onlyOwner() public {
        launchpad.pause();
        vm.prank(alice);
        vm.expectRevert();
        launchpad.unpause();
    }

    function test_unpause_resumesOperations() public {
        uint256 launchId = _createDefaultLaunch();
        launchpad.pause();
        launchpad.unpause();
        vm.prank(bob);
        launchpad.buy(launchId, 100e6, 0);
    }

    function test_killLaunch_onlyOwner() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(alice);
        vm.expectRevert();
        launchpad.killLaunch(launchId);
    }

    function test_killLaunch_setsFlag() public {
        uint256 launchId = _createDefaultLaunch();
        launchpad.killLaunch(launchId);
        assertTrue(launchpad.getLaunchInfo(launchId).killed);
    }

    function test_killLaunch_emitsEvent() public {
        uint256 launchId = _createDefaultLaunch();
        vm.expectEmit(true, false, false, false);
        emit ForjaLaunchpad.LaunchKilled(launchId);
        launchpad.killLaunch(launchId);
    }

    function test_killLaunch_revertsNonExistent() public {
        vm.expectRevert(ForjaLaunchpad.LaunchNotActive.selector);
        launchpad.killLaunch(999);
    }

    function test_killLaunch_revertsGraduated() public {
        uint256 launchId = _createDefaultLaunch();
        _graduateLaunch(launchId);
        vm.expectRevert(ForjaLaunchpad.LaunchAlreadyGraduated.selector);
        launchpad.killLaunch(launchId);
    }

    function test_setCreateFee_updatesValue() public {
        launchpad.setCreateFee(5e6);
        assertEq(launchpad.createFee(), 5e6);
    }

    function test_setCreateFee_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        launchpad.setCreateFee(5e6);
    }

    function test_setCreateFee_emitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit ForjaLaunchpad.FeeUpdated(CREATE_FEE, 5e6);
        launchpad.setCreateFee(5e6);
    }

    function test_setTreasury_updatesValue() public {
        launchpad.setTreasury(bob);
        assertEq(launchpad.treasury(), bob);
    }

    function test_setTreasury_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        launchpad.setTreasury(bob);
    }

    function test_setTreasury_rejectsZeroAddress() public {
        vm.expectRevert(ForjaLaunchpad.ZeroAddress.selector);
        launchpad.setTreasury(address(0));
    }

    function test_setTreasury_emitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit ForjaLaunchpad.TreasuryUpdated(treasury, bob);
        launchpad.setTreasury(bob);
    }

    function test_setAllowlistEnabled_toggles() public {
        assertFalse(launchpad.allowlistEnabled());
        launchpad.setAllowlistEnabled(true);
        assertTrue(launchpad.allowlistEnabled());
        launchpad.setAllowlistEnabled(false);
        assertFalse(launchpad.allowlistEnabled());
    }

    function test_setAllowlisted_rejectsZero() public {
        vm.expectRevert(ForjaLaunchpad.ZeroAddress.selector);
        launchpad.setAllowlisted(address(0), true);
    }

    // ═══════════════════════════════════════════
    // ║  SAFETY / TIMEOUT / REFUND
    // ═══════════════════════════════════════════

    function test_markLaunchAsFailed_afterTimeout() public {
        uint256 launchId = _createDefaultLaunch();
        vm.warp(block.timestamp + 30 days + 1);
        launchpad.markLaunchAsFailed(launchId);
        assertTrue(launchpad.getLaunchInfo(launchId).failed);
    }

    function test_markLaunchAsFailed_revertsBeforeTimeout() public {
        uint256 launchId = _createDefaultLaunch();
        vm.warp(block.timestamp + 29 days);
        vm.expectRevert(ForjaLaunchpad.LaunchNotTimedOut.selector);
        launchpad.markLaunchAsFailed(launchId);
    }

    function test_markLaunchAsFailed_emitsEvent() public {
        uint256 launchId = _createDefaultLaunch();
        vm.warp(block.timestamp + 30 days + 1);
        vm.expectEmit(true, false, false, false);
        emit ForjaLaunchpad.LaunchFailed(launchId);
        launchpad.markLaunchAsFailed(launchId);
    }

    function test_markLaunchAsFailed_revertsGraduated() public {
        uint256 launchId = _createDefaultLaunch();
        _graduateLaunch(launchId);
        vm.warp(block.timestamp + 30 days + 1);
        vm.expectRevert(ForjaLaunchpad.LaunchAlreadyGraduated.selector);
        launchpad.markLaunchAsFailed(launchId);
    }

    function test_sell_afterKill_returnsUsdc() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 tokens = IERC20(l.token).balanceOf(bob);
        launchpad.killLaunch(launchId);

        uint256 bobBefore = usdc.balanceOf(bob);
        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), tokens);
        launchpad.sell(launchId, tokens, 0);
        vm.stopPrank();

        assertTrue(usdc.balanceOf(bob) > bobBefore);
    }

    function test_sell_afterTimeout_returnsUsdc() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 tokens = IERC20(l.token).balanceOf(bob);

        vm.warp(block.timestamp + 30 days + 1);
        launchpad.markLaunchAsFailed(launchId);

        uint256 bobBefore = usdc.balanceOf(bob);
        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), tokens);
        launchpad.sell(launchId, tokens, 0);
        vm.stopPrank();

        assertTrue(usdc.balanceOf(bob) > bobBefore);
    }

    function test_buy_revertsAfterKill() public {
        uint256 launchId = _createDefaultLaunch();
        launchpad.killLaunch(launchId);
        vm.prank(bob);
        vm.expectRevert(ForjaLaunchpad.LaunchKilledError.selector);
        launchpad.buy(launchId, 100e6, 0);
    }

    function test_sell_afterKill_proportional() public {
        uint256 launchId = _createDefaultLaunch();

        // Small buys so sequential sells don't exhaust the pool
        vm.prank(bob);
        launchpad.buy(launchId, 100e6, 0);
        vm.roll(block.number + 1);
        vm.prank(charlie);
        launchpad.buy(launchId, 50e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 bobTokens = IERC20(l.token).balanceOf(bob);
        uint256 charlieTokens = IERC20(l.token).balanceOf(charlie);
        assertTrue(bobTokens > charlieTokens, "bob should have more tokens");

        launchpad.killLaunch(launchId);

        // Both users sell back via curve — order matters (first seller gets better price)
        uint256 bobBefore = usdc.balanceOf(bob);
        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), bobTokens);
        launchpad.sell(launchId, bobTokens, 0);
        vm.stopPrank();
        uint256 bobReturn = usdc.balanceOf(bob) - bobBefore;

        uint256 charlieBefore = usdc.balanceOf(charlie);
        vm.startPrank(charlie);
        IERC20(l.token).approve(address(launchpad), charlieTokens);
        launchpad.sell(launchId, charlieTokens, 0);
        vm.stopPrank();
        uint256 charlieReturn = usdc.balanceOf(charlie) - charlieBefore;

        // Both got non-zero USDC back
        assertTrue(bobReturn > 0, "bob should get USDC");
        assertTrue(charlieReturn > 0, "charlie should get USDC");
        // Bob has more tokens → gets more from curve
        assertTrue(bobReturn > charlieReturn, "bob should get more than charlie");
    }

    // ═══════════════════════════════════════════
    // ║  CURVE MATH
    // ═══════════════════════════════════════════

    function test_math_firstBuyReturnsTokens() public {
        uint256 launchId = _createDefaultLaunch();
        uint256 expected = launchpad.calculateBuyReturn(launchId, 100e6);
        assertTrue(expected > 0);
    }

    function test_math_buyReturn_monotonicallyDecreasing() public {
        uint256 launchId = _createDefaultLaunch();
        uint256 return1 = launchpad.calculateBuyReturn(launchId, 100e6);
        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);
        uint256 return2 = launchpad.calculateBuyReturn(launchId, 100e6);
        assertTrue(return2 < return1);
    }

    function test_feeSplit_50_50() public {
        uint256 launchId = _createDefaultLaunch();
        uint256 treasuryBefore = usdc.balanceOf(treasury);
        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);

        uint256 treasuryGain = usdc.balanceOf(treasury) - treasuryBefore;
        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 totalFee = treasuryGain + l.creatorFeeAccrued;

        assertTrue(totalFee >= 9e6 && totalFee <= 11e6);
        assertTrue(l.creatorFeeAccrued >= treasuryGain - 1 && l.creatorFeeAccrued <= treasuryGain + 1);
    }

    function test_constants_supplyAddsUp() public pure {
        assertEq(CURVE_SUPPLY + 200_000_000e6, TOTAL_SUPPLY);
    }

    function test_constants_maxPerBlock() public pure {
        // 10% of 69000 = 6900
        assertEq((GRADUATION_THRESHOLD * 1_000) / 10_000, 6_900e6);
    }

    // ═══════════════════════════════════════════
    // ║  FUZZ
    // ═══════════════════════════════════════════

    function testFuzz_buy_validAmounts(uint256 amount) public {
        amount = bound(amount, MIN_TRADE, MAX_SINGLE_BUY);
        uint256 launchId = _createDefaultLaunch();
        usdc.mint(bob, amount);
        vm.roll(block.number + 1);
        vm.prank(bob);
        launchpad.buy(launchId, amount, 0);
        assertTrue(launchpad.getLaunchInfo(launchId).realTokensSold > 0);
    }

    function testFuzz_buy_contractUsdcSufficient(uint256 amount) public {
        amount = bound(amount, MIN_TRADE, MAX_SINGLE_BUY);
        uint256 launchId = _createDefaultLaunch();
        usdc.mint(bob, amount);
        vm.roll(block.number + 1);
        vm.prank(bob);
        launchpad.buy(launchId, amount, 0);
        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        assertTrue(usdc.balanceOf(address(launchpad)) >= l.realUsdcRaised + l.creatorFeeAccrued);
    }

    function testFuzz_sell_afterBuy(uint256 buyAmt, uint256 sellPct) public {
        buyAmt = bound(buyAmt, 100e6, MAX_SINGLE_BUY);
        sellPct = bound(sellPct, 10, 100);

        uint256 launchId = _createDefaultLaunch();
        usdc.mint(bob, buyAmt);
        vm.roll(block.number + 1);
        vm.prank(bob);
        launchpad.buy(launchId, buyAmt, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 tokens = IERC20(l.token).balanceOf(bob);
        uint256 sellAmount = (tokens * sellPct) / 100;
        if (sellAmount == 0) return;

        uint256 sellReturn = launchpad.calculateSellReturn(launchId, sellAmount);
        if (sellReturn < MIN_TRADE) return;

        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), sellAmount);
        launchpad.sell(launchId, sellAmount, 0);
        vm.stopPrank();
    }

    function testFuzz_buyThenSellNeverProfits(uint256 buyAmt) public {
        buyAmt = bound(buyAmt, 100e6, MAX_SINGLE_BUY);
        uint256 launchId = _createDefaultLaunch();
        usdc.mint(bob, buyAmt);
        uint256 usdcBefore = usdc.balanceOf(bob);

        vm.roll(block.number + 1);
        vm.prank(bob);
        launchpad.buy(launchId, buyAmt, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 tokens = IERC20(l.token).balanceOf(bob);
        uint256 sellReturn = launchpad.calculateSellReturn(launchId, tokens);
        if (sellReturn < MIN_TRADE) return;

        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), tokens);
        launchpad.sell(launchId, tokens, 0);
        vm.stopPrank();

        assertTrue(usdc.balanceOf(bob) <= usdcBefore);
    }

    function testFuzz_multipleBuySell(uint256 seed) public {
        seed = bound(seed, 1, 1000);
        uint256 launchId = _createDefaultLaunch();

        for (uint256 i = 0; i < 5; i++) {
            uint256 buyAmt = bound(uint256(keccak256(abi.encode(seed, i))), MIN_TRADE, 2_000e6);
            vm.roll(block.number + 1);
            usdc.mint(bob, buyAmt);
            vm.prank(bob);
            launchpad.buy(launchId, buyAmt, 0);
            if (launchpad.getLaunchInfo(launchId).graduated) break;
        }

        ForjaLaunchpad.Launch memory final_ = launchpad.getLaunchInfo(launchId);
        if (!final_.graduated) {
            uint256 contractBal = usdc.balanceOf(address(launchpad));
            assertTrue(contractBal >= final_.realUsdcRaised + final_.creatorFeeAccrued);
        }
    }

    function testFuzz_createFee(uint256 fee) public {
        fee = bound(fee, 0, 100e6);
        launchpad.setCreateFee(fee);
        usdc.mint(charlie, fee);
        vm.startPrank(charlie);
        usdc.approve(address(launchpad), type(uint256).max);
        launchpad.createLaunch("Fuzz", "FZZ", "", "");
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════
    // ║  DAILY CREATION CAP
    // ═══════════════════════════════════════════

    function test_dailyCap_allowsFiveCreations() public {
        vm.startPrank(alice);
        for (uint256 i = 0; i < 5; i++) {
            launchpad.createLaunch("T", "T", "", "");
        }
        vm.stopPrank();
        assertEq(launchpad.nextLaunchId(), 5);
    }

    function test_dailyCap_revertsSixthCreation() public {
        vm.startPrank(alice);
        for (uint256 i = 0; i < 5; i++) {
            launchpad.createLaunch("T", "T", "", "");
        }
        vm.expectRevert(ForjaLaunchpad.DailyLimitReached.selector);
        launchpad.createLaunch("T", "T", "", "");
        vm.stopPrank();
    }

    function test_dailyCap_resetsNextDay() public {
        vm.startPrank(alice);
        for (uint256 i = 0; i < 5; i++) {
            launchpad.createLaunch("T", "T", "", "");
        }
        vm.stopPrank();

        // Advance to next day
        vm.warp(block.timestamp + 1 days);
        vm.prank(alice);
        uint256 id = launchpad.createLaunch("Next Day", "ND", "", "");
        assertEq(id, 5);
    }

    // ═══════════════════════════════════════════
    // ║  EMERGENCY WITHDRAW (Token-balance pro-rata)
    // ═══════════════════════════════════════════

    function test_emergencyWithdraw_revertsWhenNotPaused() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 100e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), type(uint256).max);
        vm.expectRevert(ForjaLaunchpad.NotPaused.selector);
        launchpad.emergencyWithdraw(launchId);
        vm.stopPrank();
    }

    function test_emergencyWithdraw_revertsGraduated() public {
        uint256 launchId = _createDefaultLaunch();
        _graduateLaunch(launchId);

        launchpad.pause();
        vm.prank(bob);
        vm.expectRevert(ForjaLaunchpad.LaunchAlreadyGraduated.selector);
        launchpad.emergencyWithdraw(launchId);
    }

    function test_emergencyWithdraw_revertsNoTokens() public {
        uint256 launchId = _createDefaultLaunch();
        launchpad.pause();

        // Charlie never bought — has no tokens
        vm.prank(charlie);
        vm.expectRevert(ForjaLaunchpad.NothingToWithdraw.selector);
        launchpad.emergencyWithdraw(launchId);
    }

    function test_emergencyWithdraw_proRataRefund() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 100e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 bobTokens = IERC20(l.token).balanceOf(bob);
        assertTrue(bobTokens > 0);

        // Bob is the only buyer → owns all realTokensSold → gets all realUsdcRaised
        launchpad.pause();
        uint256 bobBefore = usdc.balanceOf(bob);

        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), bobTokens);
        launchpad.emergencyWithdraw(launchId);
        vm.stopPrank();

        uint256 bobRefund = usdc.balanceOf(bob) - bobBefore;
        assertEq(bobRefund, l.realUsdcRaised, "Single holder should get all raised USDC");
        assertEq(IERC20(l.token).balanceOf(bob), 0, "Tokens should be returned");
    }

    function test_emergencyWithdraw_twoUsersProportional() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);
        vm.roll(block.number + 1);
        vm.prank(charlie);
        launchpad.buy(launchId, 500e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 bobTokens = IERC20(l.token).balanceOf(bob);
        uint256 charlieTokens = IERC20(l.token).balanceOf(charlie);
        assertTrue(bobTokens > charlieTokens, "Bob has more tokens");

        launchpad.pause();

        // Bob withdraws first
        uint256 bobBefore = usdc.balanceOf(bob);
        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), bobTokens);
        launchpad.emergencyWithdraw(launchId);
        vm.stopPrank();
        uint256 bobRefund = usdc.balanceOf(bob) - bobBefore;

        // Charlie withdraws second — gets fair share
        uint256 charlieBefore = usdc.balanceOf(charlie);
        vm.startPrank(charlie);
        IERC20(l.token).approve(address(launchpad), charlieTokens);
        launchpad.emergencyWithdraw(launchId);
        vm.stopPrank();
        uint256 charlieRefund = usdc.balanceOf(charlie) - charlieBefore;

        assertTrue(bobRefund > 0, "Bob got refund");
        assertTrue(charlieRefund > 0, "Charlie got refund");
        assertTrue(bobRefund > charlieRefund, "Bob gets more (more tokens)");
    }

    function test_emergencyWithdraw_doubleWithdrawReverts() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 100e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        launchpad.pause();

        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), type(uint256).max);
        launchpad.emergencyWithdraw(launchId);
        // Second call: bob has 0 tokens now
        vm.expectRevert(ForjaLaunchpad.NothingToWithdraw.selector);
        launchpad.emergencyWithdraw(launchId);
        vm.stopPrank();
    }

    function test_emergencyWithdraw_emitsEvent() public {
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 100e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 bobTokens = IERC20(l.token).balanceOf(bob);
        // Bob is only holder → gets all realUsdcRaised
        uint256 expectedRefund = l.realUsdcRaised;

        launchpad.pause();

        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), bobTokens);
        vm.expectEmit(true, true, false, true);
        emit ForjaLaunchpad.EmergencyWithdraw(launchId, bob, expectedRefund);
        launchpad.emergencyWithdraw(launchId);
        vm.stopPrank();
    }

    function test_emergencyWithdraw_handlesTokenTransfer() public {
        // Core scenario: buyer transfers tokens to someone else
        // The token HOLDER (not the original buyer) gets the refund
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 bobTokens = IERC20(l.token).balanceOf(bob);

        // Bob transfers all tokens to Charlie
        vm.prank(bob);
        IERC20(l.token).transfer(charlie, bobTokens);
        assertEq(IERC20(l.token).balanceOf(bob), 0);
        assertEq(IERC20(l.token).balanceOf(charlie), bobTokens);

        launchpad.pause();

        // Bob cannot withdraw (has no tokens)
        vm.prank(bob);
        vm.expectRevert(ForjaLaunchpad.NothingToWithdraw.selector);
        launchpad.emergencyWithdraw(launchId);

        // Charlie (token holder) CAN withdraw
        uint256 charlieBefore = usdc.balanceOf(charlie);
        vm.startPrank(charlie);
        IERC20(l.token).approve(address(launchpad), bobTokens);
        launchpad.emergencyWithdraw(launchId);
        vm.stopPrank();

        assertTrue(usdc.balanceOf(charlie) > charlieBefore, "Charlie should get refund");
    }

    function test_emergencyWithdraw_noDoubleClaimAfterTransfer() public {
        // Ensures the old deposit-based exploit is impossible:
        // Buy → transfer tokens → new holder sells → original buyer tries to withdraw
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 bobTokens = IERC20(l.token).balanceOf(bob);

        // Bob transfers tokens to Charlie
        vm.prank(bob);
        IERC20(l.token).transfer(charlie, bobTokens);

        // Charlie sells on the curve (before pause)
        vm.startPrank(charlie);
        IERC20(l.token).approve(address(launchpad), bobTokens);
        launchpad.sell(launchId, bobTokens, 0);
        vm.stopPrank();

        launchpad.pause();

        // Bob has no tokens → cannot emergency withdraw
        vm.prank(bob);
        vm.expectRevert(ForjaLaunchpad.NothingToWithdraw.selector);
        launchpad.emergencyWithdraw(launchId);
    }

    function test_emergencyWithdraw_poolStateDrainsCorrectly() public {
        // All holders withdraw → realTokensSold and realUsdcRaised both reach 0
        uint256 launchId = _createDefaultLaunch();
        vm.prank(bob);
        launchpad.buy(launchId, 1_000e6, 0);
        vm.roll(block.number + 1);
        vm.prank(charlie);
        launchpad.buy(launchId, 500e6, 0);

        ForjaLaunchpad.Launch memory l = launchpad.getLaunchInfo(launchId);
        uint256 bobTokens = IERC20(l.token).balanceOf(bob);
        uint256 charlieTokens = IERC20(l.token).balanceOf(charlie);

        launchpad.pause();

        vm.startPrank(bob);
        IERC20(l.token).approve(address(launchpad), bobTokens);
        launchpad.emergencyWithdraw(launchId);
        vm.stopPrank();

        vm.startPrank(charlie);
        IERC20(l.token).approve(address(launchpad), charlieTokens);
        launchpad.emergencyWithdraw(launchId);
        vm.stopPrank();

        ForjaLaunchpad.Launch memory after_ = launchpad.getLaunchInfo(launchId);
        assertEq(after_.realTokensSold, 0, "All tokens returned");
        assertEq(after_.realUsdcRaised, 0, "All USDC refunded");
    }
}
