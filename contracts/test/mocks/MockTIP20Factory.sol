// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MockTIP20} from "./MockTIP20.sol";

contract MockTIP20Factory {
    mapping(address => bool) public isTIP20;

    error InvalidQuoteToken();
    error InvalidCurrency();

    event TokenCreated(address indexed token, address indexed admin);

    function createToken(
        string memory name,
        string memory symbol,
        string memory currency,
        address quoteToken,
        address admin,
        bytes32 /* salt */
    ) external returns (address) {
        if (quoteToken == address(0)) revert InvalidQuoteToken();
        if (quoteToken.code.length == 0) revert InvalidQuoteToken();
        if (bytes(currency).length == 0) revert InvalidCurrency();

        MockTIP20 token = new MockTIP20(name, symbol, currency, quoteToken, admin);
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
