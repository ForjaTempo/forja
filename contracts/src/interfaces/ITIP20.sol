// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ITIP20 is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external pure returns (uint8);

    function mint(
        address to,
        uint256 amount
    ) external;
    function burn(
        uint256 amount
    ) external;

    function pause() external;
    function unpause() external;

    function grantRole(
        bytes32 role,
        address account
    ) external;
    function revokeRole(
        bytes32 role,
        address account
    ) external;
    function renounceRole(
        bytes32 role,
        address callerConfirmation
    ) external;
    function hasRole(
        bytes32 role,
        address account
    ) external view returns (bool);

    function ISSUER_ROLE() external view returns (bytes32);
    function PAUSE_ROLE() external view returns (bytes32);
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);
}
