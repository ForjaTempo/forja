// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title ForjaClaimer
/// @notice Multi-campaign merkle-proof airdrop claimer for the FORJA toolkit on Tempo.
/// @dev Each campaign stores only a merkle root on-chain; recipients self-claim with off-chain proofs.
contract ForjaClaimer is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Campaign {
        address creator;
        address token;
        bytes32 merkleRoot;
        uint256 totalDeposited;
        uint256 totalClaimed;
        uint64 startTime;
        uint64 endTime; // 0 = no expiry
        bool sweepEnabled;
        bool swept;
    }

    IERC20 public immutable usdc;
    address public treasury;
    uint256 public claimFee;
    uint256 public nextCampaignId = 1;

    uint256 public constant MAX_BATCH_CLAIMS = 50;

    mapping(uint256 => Campaign) public campaigns;
    /// @dev claimedLeaves[campaignId][leafHash] => has been claimed
    mapping(uint256 => mapping(bytes32 => bool)) public claimedLeaves;
    mapping(address => uint256[]) private _campaignsByCreator;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        address indexed token,
        bytes32 merkleRoot,
        uint256 totalDeposited,
        uint64 startTime,
        uint64 endTime,
        bool sweepEnabled
    );
    event Claimed(
        uint256 indexed campaignId,
        address indexed recipient,
        uint256 amount,
        bytes32 leaf
    );
    event CampaignSwept(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 amount
    );
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event ClaimFeeUpdated(uint256 previousFee, uint256 newFee);

    error ZeroAddress();
    error ZeroAmount();
    error ZeroRoot();
    error InvalidTimeRange();
    error CampaignNotStarted();
    error CampaignEnded();
    error CampaignNotEnded();
    error AlreadyClaimed();
    error InvalidProof();
    error NotCreator();
    error BatchEmpty();
    error BatchTooLarge();
    error LengthMismatch();
    error SweepDisabled();
    error AlreadySwept();
    error NothingToSweep();

    constructor(
        address _usdc,
        address _treasury,
        uint256 _claimFee
    ) Ownable(msg.sender) {
        if (_usdc == address(0) || _treasury == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        treasury = _treasury;
        claimFee = _claimFee;
    }

    /// @notice Create a merkle-proof claim campaign and deposit the airdrop tokens.
    /// @param token        ERC20 token to airdrop
    /// @param merkleRoot   Root of the OZ StandardMerkleTree built from (address, uint256) leaves
    /// @param totalDeposit Total token amount to escrow in this contract
    /// @param startTime    When claims open. 0 = block.timestamp
    /// @param endTime      When claims close. 0 = no expiry. Required when sweepEnabled.
    /// @param sweepEnabled If true, creator may sweep unclaimed remainder after endTime
    function createCampaign(
        address token,
        bytes32 merkleRoot,
        uint256 totalDeposit,
        uint64 startTime,
        uint64 endTime,
        bool sweepEnabled
    ) external nonReentrant returns (uint256 campaignId) {
        if (token == address(0)) revert ZeroAddress();
        if (merkleRoot == bytes32(0)) revert ZeroRoot();
        if (totalDeposit == 0) revert ZeroAmount();
        if (sweepEnabled && endTime == 0) revert InvalidTimeRange();

        uint64 effectiveStart = startTime == 0 ? uint64(block.timestamp) : startTime;
        if (endTime != 0 && endTime <= effectiveStart) revert InvalidTimeRange();

        campaignId = nextCampaignId++;

        // Effects — write all state before external calls (CEI)
        campaigns[campaignId] = Campaign({
            creator: msg.sender,
            token: token,
            merkleRoot: merkleRoot,
            totalDeposited: totalDeposit,
            totalClaimed: 0,
            startTime: effectiveStart,
            endTime: endTime,
            sweepEnabled: sweepEnabled,
            swept: false
        });
        _campaignsByCreator[msg.sender].push(campaignId);

        // Interactions
        if (claimFee > 0) usdc.safeTransferFrom(msg.sender, treasury, claimFee);
        IERC20(token).safeTransferFrom(msg.sender, address(this), totalDeposit);

        emit CampaignCreated(
            campaignId,
            msg.sender,
            token,
            merkleRoot,
            totalDeposit,
            effectiveStart,
            endTime,
            sweepEnabled
        );
    }

    /// @notice Claim from a single campaign.
    function claim(
        uint256 campaignId,
        uint256 amount,
        bytes32[] calldata proof
    ) external nonReentrant {
        _processClaim(campaignId, msg.sender, amount, proof);
    }

    /// @notice Claim from multiple campaigns in one transaction. Whole batch reverts on any failure.
    function claimMultiple(
        uint256[] calldata campaignIds,
        uint256[] calldata amounts,
        bytes32[][] calldata proofs
    ) external nonReentrant {
        uint256 len = campaignIds.length;
        if (len == 0) revert BatchEmpty();
        if (len > MAX_BATCH_CLAIMS) revert BatchTooLarge();
        if (len != amounts.length || len != proofs.length) revert LengthMismatch();

        for (uint256 i = 0; i < len;) {
            _processClaim(campaignIds[i], msg.sender, amounts[i], proofs[i]);
            unchecked { ++i; }
        }
    }

    /// @notice Sweep unclaimed tokens back to the creator after the campaign ends.
    function sweep(uint256 campaignId) external nonReentrant {
        Campaign storage c = campaigns[campaignId];
        if (c.creator != msg.sender) revert NotCreator();
        if (!c.sweepEnabled) revert SweepDisabled();
        if (c.swept) revert AlreadySwept();
        if (c.endTime == 0 || block.timestamp <= c.endTime) revert CampaignNotEnded();

        uint256 remaining = c.totalDeposited - c.totalClaimed;
        if (remaining == 0) revert NothingToSweep();

        // Effects — mark swept and lock totals before transferring
        c.swept = true;
        c.totalDeposited = c.totalClaimed;

        // Interactions
        IERC20(c.token).safeTransfer(c.creator, remaining);

        emit CampaignSwept(campaignId, c.creator, remaining);
    }

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        address old = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(old, _treasury);
    }

    function setClaimFee(uint256 _fee) external onlyOwner {
        uint256 old = claimFee;
        claimFee = _fee;
        emit ClaimFeeUpdated(old, _fee);
    }

    // ===================== VIEWS =====================

    function getCampaign(uint256 campaignId) external view returns (Campaign memory) {
        return campaigns[campaignId];
    }

    function getCampaignsByCreator(address creator) external view returns (uint256[] memory) {
        return _campaignsByCreator[creator];
    }

    function isClaimed(
        uint256 campaignId,
        address recipient,
        uint256 amount
    ) external view returns (bool) {
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(recipient, amount))));
        return claimedLeaves[campaignId][leaf];
    }

    // ===================== INTERNAL =====================

    function _processClaim(
        uint256 campaignId,
        address recipient,
        uint256 amount,
        bytes32[] calldata proof
    ) internal {
        Campaign storage c = campaigns[campaignId];
        if (c.merkleRoot == bytes32(0)) revert InvalidProof();
        if (block.timestamp < c.startTime) revert CampaignNotStarted();
        if (c.endTime != 0 && block.timestamp > c.endTime) revert CampaignEnded();

        // Double-hash matches OZ StandardMerkleTree leaf encoding for (address, uint256)
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(recipient, amount))));
        if (claimedLeaves[campaignId][leaf]) revert AlreadyClaimed();
        if (!MerkleProof.verify(proof, c.merkleRoot, leaf)) revert InvalidProof();

        // Effects
        claimedLeaves[campaignId][leaf] = true;
        c.totalClaimed += amount;

        // Interactions
        IERC20(c.token).safeTransfer(recipient, amount);

        emit Claimed(campaignId, recipient, amount, leaf);
    }
}
