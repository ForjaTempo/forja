// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";

contract DeployMockToken6 is Script {
    function run() external {
        vm.startBroadcast();
        MockERC20 token = new MockERC20("Forja Smoke6", "SMOKE6", 6);
        token.mint(msg.sender, 1_000_000 * 1e6);
        vm.stopBroadcast();
        console.log("MockERC20 (SMOKE6):", address(token));
    }
}
