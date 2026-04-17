// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ForjaSwapRouter} from "../src/ForjaSwapRouter.sol";

/// @notice Deploys ForjaSwapRouter wired to Tempo's Uniswap v4 PoolManager
///         and the standard Permit2 deployment.
///
/// Usage:
///   forge script script/DeployForjaSwapRouter.s.sol --rpc-url <rpc> --broadcast
///
/// Required env:
///   TREASURY        — receives the protocol fee on every swap
///   POOL_MANAGER    — Tempo Uniswap v4 PoolManager (0x33620f62…7029 on mainnet)
///   PERMIT2         — defaults to the canonical 0x000000000022D473030F116dDEE9F6B43aC78BA3
///   SWAP_FEE_BPS    — defaults to 25 (0.25%); cap is 100 (1%)
contract DeployForjaSwapRouter is Script {
    address constant DEFAULT_PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    uint256 constant DEFAULT_FEE_BPS = 25;

    function run() external {
        address treasury = vm.envAddress("TREASURY");
        address poolManager = vm.envAddress("POOL_MANAGER");
        address permit2 = vm.envOr("PERMIT2", DEFAULT_PERMIT2);
        uint256 feeBps = vm.envOr("SWAP_FEE_BPS", DEFAULT_FEE_BPS);

        vm.startBroadcast();
        ForjaSwapRouter router = new ForjaSwapRouter(poolManager, permit2, treasury, feeBps);
        vm.stopBroadcast();

        console.log("ForjaSwapRouter:", address(router));
        console.log("PoolManager:    ", poolManager);
        console.log("Permit2:        ", permit2);
        console.log("Treasury:       ", treasury);
        console.log("FeeBps:         ", feeBps);
    }
}
