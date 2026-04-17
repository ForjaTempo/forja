// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {PoolKey} from "./interfaces/IUniswapV4.sol";
import {
    IPoolManagerSwap,
    IUnlockCallback,
    SwapParams,
    BalanceDelta
} from "./interfaces/IUniswapV4Swap.sol";
import {IPermit2} from "./interfaces/IPermit2.sol";

/// @title ForjaSwapRouter
/// @notice Thin router on top of Uniswap v4's PoolManager that takes a
///         protocol fee on every swap, then forwards the remainder through
///         the standard `unlock` → `swap` → `take`/`settle` flow.
///
///         Single-pool swaps only (no multihop) — the v1 surface is intentionally
///         narrow so the audit footprint stays small. Hopping is offered
///         off-chain via repeated single-pool calls when needed.
///
///         Permit2 is used for token-in approvals so users sign once instead of
///         doing a separate ERC-20 approve.
///
/// @dev    Fee is taken from the input token *before* the PoolManager call.
///         All output is delivered to the user net of fee. The fee accrues to
///         `feeRecipient` immediately on each swap (push, no pull pattern).
contract ForjaSwapRouter is Ownable, Pausable, ReentrancyGuard, IUnlockCallback {
    using SafeERC20 for IERC20;

    // ─── Constants ─────────────────────────────────────────────────────────
    /// @notice Hard cap on protocol fee — 1% (100 bps). Owner can never raise above this.
    uint256 public constant MAX_FEE_BPS = 100;

    // ─── Immutable wiring ──────────────────────────────────────────────────
    IPoolManagerSwap public immutable poolManager;
    IPermit2 public immutable permit2;

    // ─── Mutable owner-controlled config ───────────────────────────────────
    /// @notice Protocol fee in basis points (10000 = 100%). Default 25 = 0.25%.
    uint256 public feeBps;
    address public feeRecipient;

    // ─── Events ────────────────────────────────────────────────────────────
    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 feeAmount
    );
    event FeeBpsUpdated(uint256 oldBps, uint256 newBps);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);

    // ─── Errors ────────────────────────────────────────────────────────────
    error ZeroAddress();
    error FeeTooHigh();
    error NotPoolManager();
    error DeadlineExpired();
    error InvalidPool();
    error SlippageExceeded(uint256 amountOut, uint256 minAmountOut);

    // ─── Types ─────────────────────────────────────────────────────────────
    /// @notice Single-pool swap request signed by the user via Permit2.
    struct ExactInputSingle {
        PoolKey poolKey;
        bool zeroForOne;          // true: swap currency0 → currency1
        uint256 amountIn;         // BEFORE fee deduction
        uint256 minAmountOut;
        uint160 sqrtPriceLimitX96;
        uint256 deadline;
        bytes hookData;
    }

    /// @notice Encoded payload passed through `unlock` → `unlockCallback`.
    struct CallbackData {
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountInAfterFee;
        uint256 minAmountOut;
        PoolKey poolKey;
        bool zeroForOne;
        uint160 sqrtPriceLimitX96;
        bytes hookData;
    }

    constructor(
        address _poolManager,
        address _permit2,
        address _feeRecipient,
        uint256 _feeBps
    ) Ownable(msg.sender) {
        if (_poolManager == address(0) || _permit2 == address(0) || _feeRecipient == address(0)) {
            revert ZeroAddress();
        }
        if (_feeBps > MAX_FEE_BPS) revert FeeTooHigh();

        poolManager = IPoolManagerSwap(_poolManager);
        permit2 = IPermit2(_permit2);
        feeRecipient = _feeRecipient;
        feeBps = _feeBps;
    }

    // ───────────────────────────────────────────────────────────────────────
    //                            Swap entry point
    // ───────────────────────────────────────────────────────────────────────

    /// @notice Execute an exact-input swap on a single Uniswap v4 pool, taking
    ///         a protocol fee on the input side. The caller must have signed a
    ///         Permit2 transfer authorising this contract to pull `amountIn`
    ///         of the input token.
    ///
    /// @return amountOut The amount of output token delivered to the caller
    ///         (already net of the fee — no further deduction).
    function swapExactInputSingle(
        ExactInputSingle calldata params,
        IPermit2.PermitTransferFrom calldata permit,
        bytes calldata signature
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        if (block.timestamp > params.deadline) revert DeadlineExpired();
        if (params.poolKey.currency0 == params.poolKey.currency1) revert InvalidPool();

        address tokenIn = params.zeroForOne ? params.poolKey.currency0 : params.poolKey.currency1;
        address tokenOut = params.zeroForOne ? params.poolKey.currency1 : params.poolKey.currency0;

        // 1. Pull the full amountIn from user via Permit2 to this contract.
        permit2.permitTransferFrom(
            permit,
            IPermit2.SignatureTransferDetails({to: address(this), requestedAmount: params.amountIn}),
            msg.sender,
            signature
        );

        // 2. Skim protocol fee from the input.
        uint256 feeAmount = (params.amountIn * feeBps) / 10_000;
        if (feeAmount > 0) {
            IERC20(tokenIn).safeTransfer(feeRecipient, feeAmount);
        }
        uint256 amountInAfterFee = params.amountIn - feeAmount;

        // 3. Hand off to PoolManager via unlock/callback.
        bytes memory result = poolManager.unlock(
            abi.encode(
                CallbackData({
                    user: msg.sender,
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    amountInAfterFee: amountInAfterFee,
                    minAmountOut: params.minAmountOut,
                    poolKey: params.poolKey,
                    zeroForOne: params.zeroForOne,
                    sqrtPriceLimitX96: params.sqrtPriceLimitX96,
                    hookData: params.hookData
                })
            )
        );
        amountOut = abi.decode(result, (uint256));

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, params.amountIn, amountOut, feeAmount);
    }

    // ───────────────────────────────────────────────────────────────────────
    //                       PoolManager unlock callback
    // ───────────────────────────────────────────────────────────────────────

    /// @inheritdoc IUnlockCallback
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        CallbackData memory cb = abi.decode(data, (CallbackData));

        // Execute the swap. amountSpecified is negative for exactIn.
        BalanceDelta delta = poolManager.swap(
            cb.poolKey,
            SwapParams({
                zeroForOne: cb.zeroForOne,
                amountSpecified: -int256(cb.amountInAfterFee),
                sqrtPriceLimitX96: cb.sqrtPriceLimitX96
            }),
            cb.hookData
        );

        // Pull the two halves of the delta. The router ALWAYS owes the input
        // currency and is owed the output currency for an exact-input swap.
        int256 raw = BalanceDelta.unwrap(delta);
        int128 amount0 = int128(raw >> 128);
        int128 amount1 = int128(raw); // truncates to lower 128 bits

        int256 deltaIn = cb.zeroForOne ? int256(amount0) : int256(amount1);   // negative
        int256 deltaOut = cb.zeroForOne ? int256(amount1) : int256(amount0);  // positive

        // Settle the input side: send tokens we owe to the PoolManager.
        uint256 owed = uint256(-deltaIn);
        poolManager.sync(cb.tokenIn);
        IERC20(cb.tokenIn).safeTransfer(address(poolManager), owed);
        poolManager.settle();

        // Take the output side: pull tokens straight to the user.
        uint256 received = uint256(deltaOut);
        if (received < cb.minAmountOut) revert SlippageExceeded(received, cb.minAmountOut);
        poolManager.take(cb.tokenOut, cb.user, received);

        return abi.encode(received);
    }

    // ───────────────────────────────────────────────────────────────────────
    //                              Owner ops
    // ───────────────────────────────────────────────────────────────────────

    function setFeeBps(uint256 newBps) external onlyOwner {
        if (newBps > MAX_FEE_BPS) revert FeeTooHigh();
        emit FeeBpsUpdated(feeBps, newBps);
        feeBps = newBps;
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        emit FeeRecipientUpdated(feeRecipient, newRecipient);
        feeRecipient = newRecipient;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Sweep tokens accidentally left in the contract. The router never
    ///         holds funds in normal operation — both fee and swap proceeds are
    ///         pushed during the same tx — so this is a recovery mechanism only.
    function rescueToken(address token, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }
}
