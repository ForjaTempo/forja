// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ForjaTokenFactory} from "../src/ForjaTokenFactory.sol";
import {ForjaMultisend} from "../src/ForjaMultisend.sol";
import {ForjaLocker} from "../src/ForjaLocker.sol";

contract Deploy is Script {
    function run() external {
        address treasury = vm.envAddress("TREASURY");
        address tipFactory = vm.envAddress("TIP20_FACTORY");
        address usdc = vm.envAddress("USDC");

        uint256 createFee = vm.envOr("CREATE_FEE", uint256(20e6));
        uint256 multisendFee = vm.envOr("MULTISEND_FEE", uint256(3e6));
        uint256 lockFee = vm.envOr("LOCK_FEE", uint256(10e6));

        vm.startBroadcast();

        ForjaTokenFactory tokenFactory = new ForjaTokenFactory(tipFactory, usdc, treasury, createFee);
        console.log("ForjaTokenFactory deployed at:", address(tokenFactory));

        ForjaMultisend multisend = new ForjaMultisend(usdc, treasury, multisendFee);
        console.log("ForjaMultisend deployed at:", address(multisend));

        ForjaLocker locker = new ForjaLocker(usdc, treasury, lockFee);
        console.log("ForjaLocker deployed at:", address(locker));

        vm.stopBroadcast();
    }
}
