// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ITIP20Factory {
    function createToken(
        string memory name,
        string memory symbol,
        string memory currency,
        address quoteToken,
        address admin,
        bytes32 salt
    ) external returns (address);

    function isTIP20(
        address token
    ) external view returns (bool);

    function getTokenAddress(
        address sender,
        bytes32 salt
    ) external pure returns (address);
}
