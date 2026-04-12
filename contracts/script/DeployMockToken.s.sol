// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";

/// @notice Deploy a MockERC20 for testnet smoke testing (Phase 11 rollout).
/// NOT for mainnet — MockERC20 has permissionless mint/burn.
/// Usage:
///   forge script script/DeployMockToken.s.sol --rpc-url moderato --broadcast
contract DeployMockToken is Script {
    function run() external {
        vm.startBroadcast();

        MockERC20 token = new MockERC20("Forja Smoke", "SMOKE", 18);

        // Mint 1,000,000 tokens to deployer for smoke testing
        token.mint(msg.sender, 1_000_000 ether);

        vm.stopBroadcast();

        console.log("MockERC20 (SMOKE):", address(token));
        console.log("Minted:", uint256(1_000_000 ether));
        console.log("Recipient:", msg.sender);
    }
}
