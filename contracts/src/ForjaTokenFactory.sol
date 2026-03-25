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

    ITIP20Factory public immutable tipFactory;
    IERC20 public immutable usdc;
    address public treasury;
    uint256 public createFee;
    mapping(address => uint256) public userNonce;

    event TokenCreated(
        address indexed creator, address indexed token, string name, string symbol, uint256 initialSupply
    );
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    error ZeroAddress();
    error ZeroFee();

    constructor(
        address _tipFactory,
        address _usdc,
        address _treasury,
        uint256 _createFee
    ) Ownable(msg.sender) {
        if (_tipFactory == address(0) || _usdc == address(0) || _treasury == address(0)) revert ZeroAddress();
        tipFactory = ITIP20Factory(_tipFactory);
        usdc = IERC20(_usdc);
        treasury = _treasury;
        createFee = _createFee;
    }

    function createToken(
        string calldata name,
        string calldata symbol,
        uint256 initialSupply
    ) external nonReentrant returns (address) {
        usdc.safeTransferFrom(msg.sender, treasury, createFee);

        uint256 nonce = userNonce[msg.sender]++;
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, block.timestamp, nonce));

        address token = tipFactory.createToken(name, symbol, "", address(0), address(this), salt);

        if (initialSupply > 0) {
            ITIP20(token).mint(msg.sender, initialSupply);
        }

        bytes32 defaultAdminRole = ITIP20(token).DEFAULT_ADMIN_ROLE();
        bytes32 issuerRole = ITIP20(token).ISSUER_ROLE();

        ITIP20(token).grantRole(defaultAdminRole, msg.sender);
        ITIP20(token).renounceRole(issuerRole, address(this));
        ITIP20(token).renounceRole(defaultAdminRole, address(this));

        emit TokenCreated(msg.sender, token, name, symbol, initialSupply);

        return token;
    }

    function setCreateFee(
        uint256 _fee
    ) external onlyOwner {
        emit FeeUpdated(createFee, _fee);
        createFee = _fee;
    }

    function setTreasury(
        address _treasury
    ) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }
}
