// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Tempo-compatible TIP-20 mock. Uses a public mapping for hasRole
///      which generates a Solidity auto-getter with signature hasRole(address,bytes32),
///      matching the real Tempo precompile ABI (not OZ AccessControl).
contract MockTIP20 is ERC20 {
    mapping(address => mapping(bytes32 => bool)) public hasRole;
    mapping(bytes32 => bytes32) public roleAdmin;

    bytes32 internal constant DEFAULT_ADMIN_ROLE = 0;
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant PAUSE_ROLE = keccak256("PAUSE_ROLE");

    string private _currency;
    address private _quoteToken;

    error Unauthorized();

    constructor(
        string memory name_,
        string memory symbol_,
        string memory currency_,
        address quoteToken_,
        address admin
    ) ERC20(name_, symbol_) {
        _currency = currency_;
        _quoteToken = quoteToken_;
        hasRole[admin][DEFAULT_ADMIN_ROLE] = true;
        hasRole[admin][ISSUER_ROLE] = true;
        hasRole[admin][PAUSE_ROLE] = true;
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function currency() external view returns (string memory) {
        return _currency;
    }

    function quoteToken() external view returns (address) {
        return _quoteToken;
    }

    function grantRole(bytes32 role, address account) external {
        if (!hasRole[msg.sender][roleAdmin[role]]) revert Unauthorized();
        hasRole[account][role] = true;
    }

    function renounceRole(bytes32 role) external {
        if (!hasRole[msg.sender][role]) revert Unauthorized();
        hasRole[msg.sender][role] = false;
    }

    function revokeRole(bytes32 role, address account) external {
        if (!hasRole[msg.sender][roleAdmin[role]]) revert Unauthorized();
        hasRole[account][role] = false;
    }

    function mint(address to, uint256 amount) external {
        if (!hasRole[msg.sender][ISSUER_ROLE]) revert Unauthorized();
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
