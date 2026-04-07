// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ForjaTokenFactory} from "../src/ForjaTokenFactory.sol";
import {ForjaMultisend} from "../src/ForjaMultisend.sol";
import {ForjaLocker} from "../src/ForjaLocker.sol";
import {ForjaLockerV2} from "../src/ForjaLockerV2.sol";

contract Deploy is Script {
    // Tempo protocol addresses (same on mainnet and Moderato)
    address constant TIP20_FACTORY = 0x20Fc000000000000000000000000000000000000;
    address constant PATHUSDC = 0x20C0000000000000000000000000000000000000;

    function run() external {
        address treasury = vm.envAddress("TREASURY");
        uint256 createFee = vm.envOr("CREATE_FEE", uint256(20e6));
        uint256 multisendFee = vm.envOr("MULTISEND_FEE", uint256(3e6));
        uint256 lockFee = vm.envOr("LOCK_FEE", uint256(10e6));

        vm.startBroadcast();
        _deploy(TIP20_FACTORY, PATHUSDC, PATHUSDC, treasury, createFee, multisendFee, lockFee);
        vm.stopBroadcast();
    }

    function _deploy(
        address tipFactory,
        address usdc,
        address pathUsd,
        address treasury,
        uint256 createFee,
        uint256 multisendFee,
        uint256 lockFee
    ) internal {
        ForjaTokenFactory tokenFactory = new ForjaTokenFactory(tipFactory, usdc, pathUsd, treasury, createFee);
        console.log("ForjaTokenFactory:", address(tokenFactory));

        ForjaMultisend multisend = new ForjaMultisend(usdc, treasury, multisendFee);
        console.log("ForjaMultisend:", address(multisend));

        ForjaLocker locker = new ForjaLocker(usdc, treasury, lockFee);
        console.log("ForjaLocker:", address(locker));

        ForjaLockerV2 lockerV2 = new ForjaLockerV2(usdc, treasury, lockFee);
        console.log("ForjaLockerV2:", address(lockerV2));
    }
}
