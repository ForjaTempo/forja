// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PoolKey} from "./IUniswapV4.sol";

/// @notice Extended Uniswap v4 interfaces required for swap routing.
/// Kept separate from IUniswapV4.sol so the launchpad-graduation surface
/// stays minimal and audited as-is.

struct SwapParams {
    bool zeroForOne;
    int256 amountSpecified; // negative = exactIn, positive = exactOut
    uint160 sqrtPriceLimitX96;
}

/// @notice 32-byte packed delta returned from `PoolManager.swap`.
/// Upper 128 bits = amount0 (signed), lower 128 bits = amount1 (signed).
type BalanceDelta is int256;

interface IPoolManagerSwap {
    function unlock(bytes calldata data) external returns (bytes memory);

    function swap(
        PoolKey memory key,
        SwapParams memory params,
        bytes calldata hookData
    ) external returns (BalanceDelta);

    /// @notice Take `amount` of `currency` from the PoolManager balance into `to`.
    function take(address currency, address to, uint256 amount) external;

    /// @notice Sync internal accounting for `currency` before a settle.
    function sync(address currency) external;

    /// @notice Settle the difference between PoolManager's currency balance and
    /// the last sync. Returns the amount paid.
    function settle() external payable returns (uint256 paid);
}

interface IUnlockCallback {
    /// @notice Called by PoolManager during `unlock`. Must net deltas to zero
    /// before returning.
    function unlockCallback(bytes calldata data) external returns (bytes memory);
}
