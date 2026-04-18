// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Minimal surface of Tempo's native stablecoin DEX precompile
///         at `0xdec0000000000000000000000000000000000000`. Pulls tokenIn via
///         `transferFrom` and pushes tokenOut — so callers must hold the input
///         balance AND approve the DEX beforehand.
///
/// Reference: github.com/tempoxyz/tempo/tree/main/tips/ref-impls/src/interfaces/IStablecoinDEX.sol
interface IStablecoinDEX {
    error InsufficientOutput();
    error InsufficientLiquidity();
    error PairDoesNotExist();

    /// @notice Execute a stablecoin↔stablecoin swap with exact input.
    /// @param tokenIn  Token pulled from caller via `transferFrom`.
    /// @param tokenOut Token delivered to caller.
    /// @param amountIn Exact input amount (up to 2^128 - 1).
    /// @param minAmountOut Revert if the filled output falls below this.
    /// @return amountOut Actual amount delivered.
    function swapExactAmountIn(
        address tokenIn,
        address tokenOut,
        uint128 amountIn,
        uint128 minAmountOut
    ) external returns (uint128 amountOut);

    /// @notice View-only quote for the exact-in side — walks the orderbook without
    ///         settling. Used by the off-chain quoter to show the expected output.
    function quoteSwapExactAmountIn(
        address tokenIn,
        address tokenOut,
        uint128 amountIn
    ) external view returns (uint128 amountOut);
}
