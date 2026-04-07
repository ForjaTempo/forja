// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ForjaLockerV2} from "../src/ForjaLockerV2.sol";

/// @notice Standalone deploy script for ForjaLockerV2 — does NOT redeploy V1 contracts.
/// Usage:
///   forge script script/DeployLockerV2.s.sol --rpc-url <rpc> --broadcast
/// Required env:
///   TREASURY    — treasury address that collects fees
///   LOCK_FEE    — fee in USDC base units (6 decimals). Defaults to 1e6 (1 USDC).
contract DeployLockerV2 is Script {
    // Tempo protocol addresses (same on mainnet and Moderato)
    address constant PATHUSDC = 0x20C0000000000000000000000000000000000000;

    function run() external {
        address treasury = vm.envAddress("TREASURY");
        uint256 lockFee = vm.envOr("LOCK_FEE", uint256(1e6));

        vm.startBroadcast();
        ForjaLockerV2 lockerV2 = new ForjaLockerV2(PATHUSDC, treasury, lockFee);
        vm.stopBroadcast();

        console.log("ForjaLockerV2:", address(lockerV2));
        console.log("Treasury:", treasury);
        console.log("LockFee:", lockFee);
    }
}
