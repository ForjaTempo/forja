// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract MockTIP20 is ERC20, AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant PAUSE_ROLE = keccak256("PAUSE_ROLE");

    string private _currency;
    address private _quoteToken;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory currency_,
        address quoteToken_,
        address admin
    ) ERC20(name_, symbol_) {
        _currency = currency_;
        _quoteToken = quoteToken_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
        _grantRole(PAUSE_ROLE, admin);
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

    function mint(
        address to,
        uint256 amount
    ) external onlyRole(ISSUER_ROLE) {
        _mint(to, amount);
    }

    function burn(
        uint256 amount
    ) external {
        _burn(msg.sender, amount);
    }
}
