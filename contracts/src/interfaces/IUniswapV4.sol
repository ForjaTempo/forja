// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Minimal Uniswap v4 interfaces for ForjaLaunchpad graduation.

struct PoolKey {
    address currency0;
    address currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

interface IPoolManager {
    function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24 tick);
}

struct PositionConfig {
    PoolKey poolKey;
    int24 tickLower;
    int24 tickUpper;
}

interface IPositionManager {
    function mint(
        PositionConfig calldata config,
        uint256 liquidity,
        uint128 amount0Max,
        uint128 amount1Max,
        address owner,
        uint256 deadline,
        bytes calldata hookData
    ) external payable returns (uint256 tokenId, uint128 liquidityMinted);

    function approve(address spender, uint256 tokenId) external;
}
