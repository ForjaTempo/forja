// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ForjaClaimer} from "../src/ForjaClaimer.sol";

/// @notice Standalone deploy script for ForjaClaimer (Phase 12A merkle airdrop campaigns).
/// Usage:
///   forge script script/DeployForjaClaimer.s.sol --rpc-url <rpc> --broadcast
/// Required env:
///   TREASURY    — treasury address that collects campaign creation fees
///   CLAIM_FEE   — fee in USDC base units (6 decimals). Defaults to 1e6 (1 USDC).
contract DeployForjaClaimer is Script {
    // Tempo protocol addresses (same on mainnet and Moderato)
    address constant PATHUSDC = 0x20C0000000000000000000000000000000000000;

    function run() external {
        address treasury = vm.envAddress("TREASURY");
        uint256 claimFee = vm.envOr("CLAIM_FEE", uint256(1e6));

        vm.startBroadcast();
        ForjaClaimer claimer = new ForjaClaimer(PATHUSDC, treasury, claimFee);
        vm.stopBroadcast();

        console.log("ForjaClaimer:", address(claimer));
        console.log("Treasury:", treasury);
        console.log("ClaimFee:", claimFee);
    }
}
