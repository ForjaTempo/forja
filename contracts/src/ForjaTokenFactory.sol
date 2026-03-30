// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ITIP20Factory} from "./interfaces/ITIP20Factory.sol";
import {ITIP20} from "./interfaces/ITIP20.sol";

contract ForjaTokenFactory is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 private constant DEFAULT_ADMIN_ROLE = 0;

    ITIP20Factory public immutable tipFactory;
    IERC20 public immutable usdc;
    address public immutable pathUsd;
    address public treasury;
    uint256 public createFee;
    mapping(address => uint256) public userNonce;

    event TokenCreated(
        address indexed creator, address indexed token, string name, string symbol, uint256 initialSupply
    );
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    error ZeroAddress();
    error RoleTransferFailed();

    constructor(
        address _tipFactory,
        address _usdc,
        address _pathUsd,
        address _treasury,
        uint256 _createFee
    ) Ownable(msg.sender) {
        if (_tipFactory == address(0) || _usdc == address(0) || _pathUsd == address(0) || _treasury == address(0)) {
            revert ZeroAddress();
        }
        tipFactory = ITIP20Factory(_tipFactory);
        usdc = IERC20(_usdc);
        pathUsd = _pathUsd;
        treasury = _treasury;
        createFee = _createFee;
    }

    function createToken(
        string calldata name,
        string calldata symbol,
        uint256 initialSupply
    ) external nonReentrant returns (address) {
        if (createFee > 0) usdc.safeTransferFrom(msg.sender, treasury, createFee);

        uint256 nonce = userNonce[msg.sender]++;
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, block.timestamp, nonce));

        address token = tipFactory.createToken(name, symbol, "USD", pathUsd, address(this), salt);

        bytes32 issuerRole = ITIP20(token).ISSUER_ROLE();

        // Factory only receives DEFAULT_ADMIN_ROLE from TIP-20 Factory.
        // Must self-grant ISSUER_ROLE before minting.
        ITIP20(token).grantRole(issuerRole, address(this));

        if (initialSupply > 0) {
            ITIP20(token).mint(msg.sender, initialSupply);
        }

        ITIP20(token).grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        ITIP20(token).renounceRole(issuerRole);
        ITIP20(token).renounceRole(DEFAULT_ADMIN_ROLE);

        if (ITIP20(token).hasRole(address(this), issuerRole)) revert RoleTransferFailed();
        if (ITIP20(token).hasRole(address(this), DEFAULT_ADMIN_ROLE)) revert RoleTransferFailed();

        emit TokenCreated(msg.sender, token, name, symbol, initialSupply);

        return token;
    }

    function setCreateFee(
        uint256 _fee
    ) external onlyOwner {
        uint256 oldFee = createFee;
        createFee = _fee;
        emit FeeUpdated(oldFee, _fee);
    }

    function setTreasury(
        address _treasury
    ) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }
}
