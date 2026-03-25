// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MockTIP20} from "./MockTIP20.sol";

contract MockTIP20Factory {
    mapping(address => bool) public isTIP20;

    event TokenCreated(address indexed token, address indexed admin);

    function createToken(
        string memory name,
        string memory symbol,
        string memory, /* currency */
        address, /* quoteToken */
        address admin,
        bytes32 /* salt */
    ) external returns (address) {
        MockTIP20 token = new MockTIP20(name, symbol, admin);
        isTIP20[address(token)] = true;
        emit TokenCreated(address(token), admin);
        return address(token);
    }

    function getTokenAddress(
        address,
        bytes32
    ) external pure returns (address) {
        return address(0);
    }
}
