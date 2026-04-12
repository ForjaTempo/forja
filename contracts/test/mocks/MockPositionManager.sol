// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IPositionManager, PositionConfig} from "../../src/interfaces/IUniswapV4.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockPositionManager is IPositionManager {
    bool public shouldRevert;
    uint256 public mintCallCount;
    uint256 public nextTokenId = 1;

    PositionConfig public lastConfig;
    address public lastOwner;

    function mint(
        PositionConfig calldata config,
        uint256, /* liquidity */
        uint128 amount0Max,
        uint128 amount1Max,
        address owner,
        uint256, /* deadline */
        bytes calldata /* hookData */
    ) external payable returns (uint256 tokenId, uint128 liquidityMinted) {
        if (shouldRevert) revert("MockPositionManager: forced revert");

        lastConfig = config;
        lastOwner = owner;
        mintCallCount++;

        // Pull tokens from the caller to simulate real behavior
        IERC20(config.poolKey.currency0).transferFrom(msg.sender, address(this), amount0Max);
        IERC20(config.poolKey.currency1).transferFrom(msg.sender, address(this), amount1Max);

        tokenId = nextTokenId++;
        liquidityMinted = uint128(amount0Max);
    }

    function approve(address, uint256) external {
        // no-op for mock
    }

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }
}
