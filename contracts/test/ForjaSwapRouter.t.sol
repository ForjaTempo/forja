// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ForjaSwapRouter} from "../src/ForjaSwapRouter.sol";
import {PoolKey} from "../src/interfaces/IUniswapV4.sol";
import {IPermit2} from "../src/interfaces/IPermit2.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockSwapPoolManager} from "./mocks/MockSwapPoolManager.sol";
import {MockPermit2} from "./mocks/MockPermit2.sol";
import {MockStablecoinDEX} from "./mocks/MockStablecoinDEX.sol";

contract ForjaSwapRouterTest is Test {
    ForjaSwapRouter public router;
    MockSwapPoolManager public poolManager;
    MockPermit2 public permit2;
    MockStablecoinDEX public stableDex;
    MockERC20 public usdc;
    MockERC20 public token;
    MockERC20 public usdt;

    address public owner = address(this);
    address public treasury = makeAddr("treasury");
    address public alice = makeAddr("alice");

    uint256 public constant FEE_BPS = 25; // 0.25%
    uint256 public constant SWAP_AMOUNT = 1_000e6; // 1000 USDC

    function setUp() public {
        usdc = new MockERC20("pathUSD", "USDC", 6);
        token = new MockERC20("Test Token", "TEST", 6);
        usdt = new MockERC20("Tempo USDT", "USDT0", 6);
        poolManager = new MockSwapPoolManager();
        permit2 = new MockPermit2();
        stableDex = new MockStablecoinDEX();
        router = new ForjaSwapRouter(
            address(poolManager),
            address(permit2),
            address(stableDex),
            treasury,
            FEE_BPS
        );

        // Seed alice with USDC + USDT, mocks with output liquidity
        usdc.mint(alice, 100_000e6);
        usdt.mint(alice, 100_000e6);
        token.mint(address(poolManager), 100_000e6);
        usdt.mint(address(stableDex), 100_000e6);
        usdc.mint(address(stableDex), 100_000e6);

        // Alice approves Permit2 to pull her tokens (mock skips sig)
        vm.startPrank(alice);
        usdc.approve(address(permit2), type(uint256).max);
        usdt.approve(address(permit2), type(uint256).max);
        vm.stopPrank();
    }

    // ───── Helpers ─────────────────────────────────────────────────────────

    function _key(address t0, address t1) internal pure returns (PoolKey memory) {
        return PoolKey({currency0: t0, currency1: t1, fee: 3000, tickSpacing: 60, hooks: address(0)});
    }

    function _swapParams(
        uint256 amountIn,
        uint256 minOut,
        bool zeroForOne,
        uint256 deadline
    ) internal view returns (ForjaSwapRouter.ExactInputSingle memory) {
        // ensure currency0 < currency1 ordering for v4 PoolKey
        address t0 = address(usdc) < address(token) ? address(usdc) : address(token);
        address t1 = address(usdc) < address(token) ? address(token) : address(usdc);
        // Re-derive zeroForOne from token order
        bool actualZeroForOne = zeroForOne ? (address(usdc) < address(token)) : (address(token) < address(usdc));

        return ForjaSwapRouter.ExactInputSingle({
            poolKey: _key(t0, t1),
            zeroForOne: actualZeroForOne,
            amountIn: amountIn,
            minAmountOut: minOut,
            sqrtPriceLimitX96: 0,
            deadline: deadline,
            hookData: ""
        });
    }

    function _permit(uint256 amount) internal view returns (IPermit2.PermitTransferFrom memory) {
        return IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({token: address(usdc), amount: amount}),
            nonce: 0,
            deadline: block.timestamp + 1 hours
        });
    }

    // ───── Constructor ─────────────────────────────────────────────────────

    function test_constructor_reverts_on_zero_pool() public {
        vm.expectRevert(ForjaSwapRouter.ZeroAddress.selector);
        new ForjaSwapRouter(address(0), address(permit2), address(stableDex), treasury, FEE_BPS);
    }

    function test_constructor_reverts_on_zero_permit2() public {
        vm.expectRevert(ForjaSwapRouter.ZeroAddress.selector);
        new ForjaSwapRouter(address(poolManager), address(0), address(stableDex), treasury, FEE_BPS);
    }

    function test_constructor_reverts_on_zero_stable_dex() public {
        vm.expectRevert(ForjaSwapRouter.ZeroAddress.selector);
        new ForjaSwapRouter(address(poolManager), address(permit2), address(0), treasury, FEE_BPS);
    }

    function test_constructor_reverts_on_zero_recipient() public {
        vm.expectRevert(ForjaSwapRouter.ZeroAddress.selector);
        new ForjaSwapRouter(
            address(poolManager),
            address(permit2),
            address(stableDex),
            address(0),
            FEE_BPS
        );
    }

    function test_constructor_reverts_on_fee_too_high() public {
        vm.expectRevert(ForjaSwapRouter.FeeTooHigh.selector);
        new ForjaSwapRouter(
            address(poolManager),
            address(permit2),
            address(stableDex),
            treasury,
            101
        );
    }

    // ───── Swap happy path ─────────────────────────────────────────────────

    function test_swap_exactInput_skims_fee_and_delivers_output() public {
        uint256 expectedFee = (SWAP_AMOUNT * FEE_BPS) / 10_000;
        uint256 expectedAmountIn = SWAP_AMOUNT - expectedFee;

        ForjaSwapRouter.ExactInputSingle memory params = _swapParams(
            SWAP_AMOUNT,
            0,
            true,
            block.timestamp + 1 hours
        );

        vm.prank(alice);
        uint256 amountOut = router.swapExactInputSingle(params, _permit(SWAP_AMOUNT), "");

        assertEq(amountOut, expectedAmountIn, "1:1 mock should return amountIn after fee");
        assertEq(usdc.balanceOf(treasury), expectedFee, "treasury must collect fee");
        assertEq(token.balanceOf(alice), amountOut, "alice receives output");
        assertEq(usdc.balanceOf(address(router)), 0, "router holds no input");
        assertEq(token.balanceOf(address(router)), 0, "router holds no output");
    }

    function test_swap_emits_event() public {
        ForjaSwapRouter.ExactInputSingle memory params = _swapParams(
            SWAP_AMOUNT,
            0,
            true,
            block.timestamp + 1 hours
        );
        uint256 expectedFee = (SWAP_AMOUNT * FEE_BPS) / 10_000;

        vm.expectEmit(true, true, true, true, address(router));
        emit ForjaSwapRouter.SwapExecuted(
            alice,
            address(usdc),
            address(token),
            SWAP_AMOUNT,
            SWAP_AMOUNT - expectedFee,
            expectedFee
        );

        vm.prank(alice);
        router.swapExactInputSingle(params, _permit(SWAP_AMOUNT), "");
    }

    function test_swap_with_zero_fee() public {
        router.setFeeBps(0);

        ForjaSwapRouter.ExactInputSingle memory params = _swapParams(
            SWAP_AMOUNT,
            0,
            true,
            block.timestamp + 1 hours
        );

        vm.prank(alice);
        uint256 amountOut = router.swapExactInputSingle(params, _permit(SWAP_AMOUNT), "");

        assertEq(amountOut, SWAP_AMOUNT, "no fee = full amountIn flows");
        assertEq(usdc.balanceOf(treasury), 0, "no fee collected");
    }

    // ───── Reverts ─────────────────────────────────────────────────────────

    function test_swap_reverts_when_deadline_passed() public {
        ForjaSwapRouter.ExactInputSingle memory params = _swapParams(SWAP_AMOUNT, 0, true, block.timestamp - 1);
        vm.prank(alice);
        vm.expectRevert(ForjaSwapRouter.DeadlineExpired.selector);
        router.swapExactInputSingle(params, _permit(SWAP_AMOUNT), "");
    }

    function test_swap_reverts_on_invalid_pool_same_currencies() public {
        ForjaSwapRouter.ExactInputSingle memory params = ForjaSwapRouter.ExactInputSingle({
            poolKey: _key(address(usdc), address(usdc)),
            zeroForOne: true,
            amountIn: SWAP_AMOUNT,
            minAmountOut: 0,
            sqrtPriceLimitX96: 0,
            deadline: block.timestamp + 1 hours,
            hookData: ""
        });
        vm.prank(alice);
        vm.expectRevert(ForjaSwapRouter.InvalidPool.selector);
        router.swapExactInputSingle(params, _permit(SWAP_AMOUNT), "");
    }

    function test_swap_reverts_on_slippage() public {
        // Mock returns 1:1; minAmountOut higher than that = revert
        ForjaSwapRouter.ExactInputSingle memory params = _swapParams(
            SWAP_AMOUNT,
            SWAP_AMOUNT, // demand full amount despite fee
            true,
            block.timestamp + 1 hours
        );
        vm.prank(alice);
        vm.expectRevert(); // SlippageExceeded with dynamic args
        router.swapExactInputSingle(params, _permit(SWAP_AMOUNT), "");
    }

    function test_swap_reverts_when_paused() public {
        router.pause();
        ForjaSwapRouter.ExactInputSingle memory params = _swapParams(SWAP_AMOUNT, 0, true, block.timestamp + 1 hours);
        vm.prank(alice);
        vm.expectRevert(); // Pausable: paused
        router.swapExactInputSingle(params, _permit(SWAP_AMOUNT), "");
    }

    // ───── Permit binding (CRITICAL — auth surface) ────────────────────────

    function test_swap_reverts_when_permit_token_does_not_match_pool_input() public {
        // The pool's input token is USDC (we swap zeroForOne with USDC<TOKEN
        // ordering normalised). Build a permit that references TEST instead.
        ForjaSwapRouter.ExactInputSingle memory params = _swapParams(
            SWAP_AMOUNT,
            0,
            true,
            block.timestamp + 1 hours
        );

        // Compute which token the router will derive as tokenIn so the
        // expected error address matches at runtime.
        address derivedTokenIn = params.zeroForOne ? params.poolKey.currency0 : params.poolKey.currency1;

        IPermit2.PermitTransferFrom memory wrongPermit = IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({token: address(token), amount: SWAP_AMOUNT}),
            nonce: 0,
            deadline: block.timestamp + 1 hours
        });

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ForjaSwapRouter.PermitTokenMismatch.selector,
                derivedTokenIn,
                address(token)
            )
        );
        router.swapExactInputSingle(params, wrongPermit, "");
    }

    function test_swap_reverts_when_permit_amount_does_not_match_amountIn() public {
        ForjaSwapRouter.ExactInputSingle memory params = _swapParams(
            SWAP_AMOUNT,
            0,
            true,
            block.timestamp + 1 hours
        );
        IPermit2.PermitTransferFrom memory looseUpperBoundPermit = IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({
                token: address(usdc),
                amount: SWAP_AMOUNT * 10 // user signs an upper bound, NOT the exact swap size
            }),
            nonce: 0,
            deadline: block.timestamp + 1 hours
        });

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ForjaSwapRouter.PermitAmountMismatch.selector,
                SWAP_AMOUNT,
                SWAP_AMOUNT * 10
            )
        );
        router.swapExactInputSingle(params, looseUpperBoundPermit, "");
    }

    /// @notice Audit-driven test: an attacker MUST NOT be able to drain a
    ///         stuck balance of the real tokenIn by signing a Permit2 transfer
    ///         for a different (worthless) token. The router seeds the call
    ///         with the cheap token, then the unlocked callback would use the
    ///         stuck tokenIn balance for settlement and ship the output to
    ///         the attacker. The pre-call permit binding MUST stop this BEFORE
    ///         the swap fires.
    function test_attacker_cannot_drain_stuck_input_via_wrong_permit_token() public {
        // 1. Simulate stuck USDC sitting in the router (e.g. from a botched
        //    rescueToken op or a misrouted transfer).
        usdc.mint(address(router), SWAP_AMOUNT);
        assertEq(usdc.balanceOf(address(router)), SWAP_AMOUNT, "stuck balance set up");

        // 2. Attacker mints worthless TEST tokens and approves Permit2 for them.
        address attacker = makeAddr("attacker");
        token.mint(attacker, SWAP_AMOUNT);
        vm.prank(attacker);
        token.approve(address(permit2), type(uint256).max);

        // 3. Attacker builds a swap that targets the USDC/TEST pool but signs
        //    a Permit2 transfer for the cheap TEST token, hoping the router
        //    will pull TEST, "skim fee" off TEST, and use the stuck USDC for
        //    the swap settlement.
        ForjaSwapRouter.ExactInputSingle memory exploitParams = _swapParams(
            SWAP_AMOUNT,
            0,
            true,
            block.timestamp + 1 hours
        );
        address derivedTokenIn = exploitParams.zeroForOne
            ? exploitParams.poolKey.currency0
            : exploitParams.poolKey.currency1;
        IPermit2.PermitTransferFrom memory cheapPermit = IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({token: address(token), amount: SWAP_AMOUNT}),
            nonce: 0,
            deadline: block.timestamp + 1 hours
        });

        // 4. Router MUST reject before any token movement.
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                ForjaSwapRouter.PermitTokenMismatch.selector,
                derivedTokenIn,
                address(token)
            )
        );
        router.swapExactInputSingle(exploitParams, cheapPermit, "");

        // 5. Stuck balance untouched, attacker holds nothing of value.
        assertEq(usdc.balanceOf(address(router)), SWAP_AMOUNT, "stuck balance preserved");
        assertEq(usdc.balanceOf(attacker), 0, "attacker gained no USDC");
        assertEq(token.balanceOf(attacker), SWAP_AMOUNT, "attacker's TEST untouched");
    }

    function test_unlockCallback_reverts_when_not_pool_manager() public {
        bytes memory dummy = new bytes(0);
        vm.expectRevert(ForjaSwapRouter.NotPoolManager.selector);
        router.unlockCallback(dummy);
    }

    // ───── Owner ops ───────────────────────────────────────────────────────

    function test_setFeeBps_owner_can_lower_or_raise_within_cap() public {
        router.setFeeBps(50);
        assertEq(router.feeBps(), 50);
        router.setFeeBps(0);
        assertEq(router.feeBps(), 0);
    }

    function test_setFeeBps_reverts_on_too_high() public {
        vm.expectRevert(ForjaSwapRouter.FeeTooHigh.selector);
        router.setFeeBps(101);
    }

    function test_setFeeBps_reverts_when_not_owner() public {
        vm.prank(alice);
        vm.expectRevert(); // Ownable: caller is not the owner
        router.setFeeBps(50);
    }

    function test_setFeeRecipient_works() public {
        address newTreasury = makeAddr("newTreasury");
        router.setFeeRecipient(newTreasury);
        assertEq(router.feeRecipient(), newTreasury);
    }

    function test_setFeeRecipient_reverts_on_zero() public {
        vm.expectRevert(ForjaSwapRouter.ZeroAddress.selector);
        router.setFeeRecipient(address(0));
    }

    function test_pause_unpause() public {
        router.pause();
        assertTrue(router.paused());
        router.unpause();
        assertFalse(router.paused());
    }

    function test_rescueToken_works() public {
        usdc.mint(address(router), 100e6);
        router.rescueToken(address(usdc), treasury, 100e6);
        assertEq(usdc.balanceOf(treasury), 100e6);
    }

    // ───── Fuzz ────────────────────────────────────────────────────────────

    function testFuzz_fee_math_consistent(uint256 amountIn, uint256 bps) public {
        amountIn = bound(amountIn, 1, 1_000_000_000e6);
        bps = bound(bps, 0, 100);
        router.setFeeBps(bps);

        usdc.mint(alice, amountIn);
        token.mint(address(poolManager), amountIn);

        vm.prank(alice);
        usdc.approve(address(permit2), type(uint256).max);

        uint256 expectedFee = (amountIn * bps) / 10_000;
        uint256 expectedOut = amountIn - expectedFee; // 1:1 mock

        ForjaSwapRouter.ExactInputSingle memory params = _swapParams(amountIn, 0, true, block.timestamp + 1 hours);
        IPermit2.PermitTransferFrom memory permit = IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({token: address(usdc), amount: amountIn}),
            nonce: 0,
            deadline: block.timestamp + 1 hours
        });

        uint256 treasuryBefore = usdc.balanceOf(treasury);

        vm.prank(alice);
        uint256 out = router.swapExactInputSingle(params, permit, "");

        assertEq(out, expectedOut, "fuzz: output equals amountIn - fee");
        assertEq(usdc.balanceOf(treasury) - treasuryBefore, expectedFee, "fuzz: treasury delta = fee");
    }

    // ───── Stablecoin swap (enshrined DEX path) ────────────────────────────

    function _stablePermit(address tokenIn, uint256 amount)
        internal
        view
        returns (IPermit2.PermitTransferFrom memory)
    {
        return IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({token: tokenIn, amount: amount}),
            nonce: 0,
            deadline: block.timestamp + 1 hours
        });
    }

    function _stableParams(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minOut
    ) internal view returns (ForjaSwapRouter.ExactInputStable memory) {
        return ForjaSwapRouter.ExactInputStable({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minOut,
            deadline: block.timestamp + 1 hours
        });
    }

    function test_stableSwap_skims_fee_and_delivers_output() public {
        // 1:1 peg — expected out = amountIn - fee
        uint256 expectedFee = (SWAP_AMOUNT * FEE_BPS) / 10_000;
        uint256 expectedOut = SWAP_AMOUNT - expectedFee;
        uint256 treasuryBefore = usdc.balanceOf(treasury);
        uint256 aliceUsdtBefore = usdt.balanceOf(alice);

        vm.prank(alice);
        uint256 out = router.swapStablecoinExactInput(
            _stableParams(address(usdc), address(usdt), SWAP_AMOUNT, 0),
            _stablePermit(address(usdc), SWAP_AMOUNT),
            ""
        );

        assertEq(out, expectedOut, "output = input - fee at 1:1 peg");
        assertEq(usdt.balanceOf(alice) - aliceUsdtBefore, expectedOut, "alice receives tokenOut");
        assertEq(usdc.balanceOf(treasury) - treasuryBefore, expectedFee, "treasury gets fee");
    }

    function test_stableSwap_reverts_on_deadline() public {
        uint256 pastDeadline = block.timestamp - 1;
        ForjaSwapRouter.ExactInputStable memory params = ForjaSwapRouter.ExactInputStable({
            tokenIn: address(usdc),
            tokenOut: address(usdt),
            amountIn: SWAP_AMOUNT,
            minAmountOut: 0,
            deadline: pastDeadline
        });
        vm.prank(alice);
        vm.expectRevert(ForjaSwapRouter.DeadlineExpired.selector);
        router.swapStablecoinExactInput(params, _stablePermit(address(usdc), SWAP_AMOUNT), "");
    }

    function test_stableSwap_reverts_on_identical_tokens() public {
        vm.prank(alice);
        vm.expectRevert(ForjaSwapRouter.InvalidPool.selector);
        router.swapStablecoinExactInput(
            _stableParams(address(usdc), address(usdc), SWAP_AMOUNT, 0),
            _stablePermit(address(usdc), SWAP_AMOUNT),
            ""
        );
    }

    function test_stableSwap_reverts_on_permit_token_mismatch() public {
        ForjaSwapRouter.ExactInputStable memory params = _stableParams(
            address(usdc),
            address(usdt),
            SWAP_AMOUNT,
            0
        );
        // Permit is for USDT0 but swap input is USDC — exploit path must revert.
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ForjaSwapRouter.PermitTokenMismatch.selector,
                address(usdc),
                address(usdt)
            )
        );
        router.swapStablecoinExactInput(params, _stablePermit(address(usdt), SWAP_AMOUNT), "");
    }

    function test_stableSwap_reverts_on_permit_amount_mismatch() public {
        ForjaSwapRouter.ExactInputStable memory params = _stableParams(
            address(usdc),
            address(usdt),
            SWAP_AMOUNT,
            0
        );
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ForjaSwapRouter.PermitAmountMismatch.selector,
                SWAP_AMOUNT,
                SWAP_AMOUNT + 1
            )
        );
        router.swapStablecoinExactInput(params, _stablePermit(address(usdc), SWAP_AMOUNT + 1), "");
    }

    function test_stableSwap_reverts_on_slippage() public {
        // Configure the mock to return less than the caller's minAmountOut.
        // The precompile's own `InsufficientOutput` fires first since we pass
        // the user's floor straight through. Either revert is acceptable
        // slippage protection; we just assert execution didn't succeed.
        stableDex.setOutputRatio(95, 100);
        uint256 expectedFee = (SWAP_AMOUNT * FEE_BPS) / 10_000;
        uint256 received = ((SWAP_AMOUNT - expectedFee) * 95) / 100;
        uint256 demanded = received + 1;

        vm.prank(alice);
        vm.expectRevert();
        router.swapStablecoinExactInput(
            _stableParams(address(usdc), address(usdt), SWAP_AMOUNT, demanded),
            _stablePermit(address(usdc), SWAP_AMOUNT),
            ""
        );
    }

    function test_stableSwap_reverts_when_paused() public {
        router.pause();
        vm.prank(alice);
        vm.expectRevert();
        router.swapStablecoinExactInput(
            _stableParams(address(usdc), address(usdt), SWAP_AMOUNT, 0),
            _stablePermit(address(usdc), SWAP_AMOUNT),
            ""
        );
    }

    function test_stableSwap_pair_missing_bubbles_up() public {
        stableDex.setPairMissing(true);
        vm.prank(alice);
        // The DEX's error passes through since we don't catch it.
        vm.expectRevert();
        router.swapStablecoinExactInput(
            _stableParams(address(usdc), address(usdt), SWAP_AMOUNT, 0),
            _stablePermit(address(usdc), SWAP_AMOUNT),
            ""
        );
    }

    function test_stableSwap_emits_event() public {
        uint256 expectedFee = (SWAP_AMOUNT * FEE_BPS) / 10_000;
        uint256 expectedOut = SWAP_AMOUNT - expectedFee;

        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit ForjaSwapRouter.SwapExecuted(
            alice,
            address(usdc),
            address(usdt),
            SWAP_AMOUNT,
            expectedOut,
            expectedFee
        );
        router.swapStablecoinExactInput(
            _stableParams(address(usdc), address(usdt), SWAP_AMOUNT, 0),
            _stablePermit(address(usdc), SWAP_AMOUNT),
            ""
        );
    }
}
