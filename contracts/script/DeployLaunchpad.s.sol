// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ForjaLaunchpad} from "../src/ForjaLaunchpad.sol";

/// @notice Deploy script for ForjaLaunchpad (Phase 14 bonding curve launchpad).
/// Usage:
///   forge script script/DeployLaunchpad.s.sol --rpc-url <rpc> --broadcast
/// Required env:
///   TREASURY          — treasury address
///   POOL_MANAGER      — Uniswap v4 PoolManager address
///   POSITION_MANAGER  — Uniswap v4 PositionManager address
/// Optional env:
///   CREATE_FEE        — creation fee in USDC base units (defaults to 2e6 = 2 USDC)
contract DeployLaunchpad is Script {
    address constant TIP20_FACTORY = 0x20Fc000000000000000000000000000000000000;
    address constant PATHUSDC = 0x20C0000000000000000000000000000000000000;

    function run() external {
        address treasury = vm.envAddress("TREASURY");
        address poolMgr = vm.envAddress("POOL_MANAGER");
        address posMgr = vm.envAddress("POSITION_MANAGER");
        uint256 fee = vm.envOr("CREATE_FEE", uint256(2e6));

        vm.startBroadcast();
        ForjaLaunchpad launchpad =
            new ForjaLaunchpad(TIP20_FACTORY, PATHUSDC, PATHUSDC, treasury, poolMgr, posMgr, fee);
        vm.stopBroadcast();

        console.log("ForjaLaunchpad:", address(launchpad));
        console.log("Treasury:", treasury);
        console.log("PoolManager:", poolMgr);
        console.log("PositionManager:", posMgr);
        console.log("CreateFee:", fee);
    }
}
