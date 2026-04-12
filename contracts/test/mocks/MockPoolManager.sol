// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IPoolManager, PoolKey} from "../../src/interfaces/IUniswapV4.sol";

contract MockPoolManager is IPoolManager {
    bool public shouldRevert;
    uint256 public initializeCallCount;

    PoolKey public lastPoolKey;
    uint160 public lastSqrtPriceX96;

    function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24) {
        if (shouldRevert) revert("MockPoolManager: forced revert");
        lastPoolKey = key;
        lastSqrtPriceX96 = sqrtPriceX96;
        initializeCallCount++;
        return 0;
    }

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }
}
