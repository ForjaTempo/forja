// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PoolKey} from "../../src/interfaces/IUniswapV4.sol";
import {
    IPoolManagerSwap,
    IUnlockCallback,
    SwapParams,
    BalanceDelta
} from "../../src/interfaces/IUniswapV4Swap.sol";

/// @notice Test-only PoolManager mock that simulates a 1:1 swap with a
///         configurable price ratio so we can exercise the router's
///         unlock/callback flow without spinning up real v4 pools.
///
/// @dev    Behaviour:
///         - `swap()` returns a BalanceDelta consistent with `outputRatio`:
///             amountOut = amountIn * outputRatio / 1e18
///         - The mock holds reserves of the output token; tests must seed it.
///         - `unlock()` invokes `IUnlockCallback.unlockCallback` on the caller.
///         - `take()` transfers the output token from the mock to the recipient.
///         - `sync()` + `settle()` are accounting no-ops (mock trusts caller).
contract MockSwapPoolManager is IPoolManagerSwap {
    uint256 public outputRatio = 1e18; // 1:1 by default
    bool public revertOnSwap;

    address public lastSettleCurrency;
    uint256 public unlockCallCount;
    int128 public lastDelta0;
    int128 public lastDelta1;

    function setOutputRatio(uint256 ratio) external {
        outputRatio = ratio;
    }

    function setRevertOnSwap(bool v) external {
        revertOnSwap = v;
    }

    function unlock(bytes calldata data) external returns (bytes memory) {
        unlockCallCount++;
        return IUnlockCallback(msg.sender).unlockCallback(data);
    }

    function swap(
        PoolKey memory key,
        SwapParams memory params,
        bytes calldata /* hookData */
    ) external returns (BalanceDelta delta) {
        if (revertOnSwap) revert("MockSwapPoolManager: forced revert");
        // amountSpecified is negative for exactIn — we turn it into a positive amountIn
        require(params.amountSpecified < 0, "mock supports exactIn only");
        uint256 amountIn = uint256(-params.amountSpecified);
        uint256 amountOut = (amountIn * outputRatio) / 1e18;

        int128 amount0;
        int128 amount1;
        if (params.zeroForOne) {
            amount0 = -int128(uint128(amountIn));
            amount1 = int128(uint128(amountOut));
        } else {
            amount0 = int128(uint128(amountOut));
            amount1 = -int128(uint128(amountIn));
        }
        lastDelta0 = amount0;
        lastDelta1 = amount1;
        // Pack into BalanceDelta: upper 128 bits = amount0, lower 128 bits = amount1.
        int256 packed = (int256(amount0) << 128) | int256(uint256(uint128(amount1)));
        delta = BalanceDelta.wrap(packed);

        // Suppress unused-variable warning for `key` without disabling Slither lints.
        key;
    }

    function sync(address currency) external {
        lastSettleCurrency = currency;
    }

    function settle() external payable returns (uint256) {
        // No-op in tests — we trust the caller transferred the right amount.
        return 0;
    }

    function take(address currency, address to, uint256 amount) external {
        IERC20(currency).transfer(to, amount);
    }
}
