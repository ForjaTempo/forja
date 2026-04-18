// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IStablecoinDEX} from "../../src/interfaces/IStablecoinDEX.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Deterministic mock of Tempo's enshrined stablecoin DEX for tests.
///         Applies a configurable input→output ratio (1:1 by default) and a
///         configurable fail mode so tests can simulate pair-not-exist,
///         slippage, and happy-path cases.
contract MockStablecoinDEX is IStablecoinDEX {
    /// Numerator / denominator for the amountOut = amountIn * num / den transform.
    uint128 public outputNumerator = 1;
    uint128 public outputDenominator = 1;
    bool public shouldRevertPairMissing;

    function setOutputRatio(uint128 num, uint128 den) external {
        require(den > 0, "den=0");
        outputNumerator = num;
        outputDenominator = den;
    }

    function setPairMissing(bool v) external {
        shouldRevertPairMissing = v;
    }

    function swapExactAmountIn(
        address tokenIn,
        address tokenOut,
        uint128 amountIn,
        uint128 minAmountOut
    ) external returns (uint128 amountOut) {
        if (shouldRevertPairMissing) revert PairDoesNotExist();
        amountOut = uint128((uint256(amountIn) * outputNumerator) / outputDenominator);
        if (amountOut < minAmountOut) revert InsufficientOutput();

        // Pull input from caller and push output back.
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(msg.sender, amountOut);
    }

    function quoteSwapExactAmountIn(
        address,
        address,
        uint128 amountIn
    ) external view returns (uint128) {
        return uint128((uint256(amountIn) * outputNumerator) / outputDenominator);
    }
}
