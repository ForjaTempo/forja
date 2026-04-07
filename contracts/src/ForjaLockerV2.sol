// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ForjaLockerV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Lock {
        address token;
        address creator;
        address beneficiary;
        uint256 totalAmount;
        uint256 claimedAmount;
        uint64 startTime;
        uint64 endTime;
        uint64 cliffDuration;
        bool vestingEnabled;
        bool revocable;
        bool revoked;
    }

    IERC20 public immutable usdc;
    address public treasury;
    uint256 public lockFee;
    uint256 public nextLockId = 1;

    uint256 public constant MAX_BATCH_SIZE = 50;

    struct BatchLockParams {
        address token;
        uint64 lockDuration;
        uint64 cliffDuration;
        bool vestingEnabled;
        bool revocable;
    }

    mapping(uint256 => Lock) public locks;
    mapping(address => uint256[]) public userLockIds;
    mapping(address => uint256[]) public beneficiaryLockIds;

    event LockCreated(
        uint256 indexed lockId,
        address indexed creator,
        address indexed token,
        address beneficiary,
        uint256 amount,
        uint64 startTime,
        uint64 endTime,
        bool vestingEnabled
    );
    event BatchLockCreated(
        uint256 indexed batchId,
        address indexed creator,
        address indexed token,
        uint256[] lockIds,
        uint256 totalAmount
    );
    event TokensClaimed(uint256 indexed lockId, address indexed beneficiary, uint256 amount);
    event LockRevoked(uint256 indexed lockId, uint256 returnedAmount);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    error ZeroAddress();
    error ZeroAmount();
    error ZeroDuration();
    error CliffExceedsDuration();
    error NotBeneficiary();
    error LockIsRevoked();
    error NothingToClaim();
    error NotCreator();
    error NotRevocable();
    error AlreadyRevoked();
    error EmptyArray();
    error ArrayLengthMismatch();
    error ExceedsMaxBatchSize();

    constructor(
        address _usdc,
        address _treasury,
        uint256 _lockFee
    ) Ownable(msg.sender) {
        if (_usdc == address(0) || _treasury == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        treasury = _treasury;
        lockFee = _lockFee;
    }

    function createLock(
        address token,
        address beneficiary,
        uint256 amount,
        uint64 lockDuration,
        uint64 cliffDuration,
        bool vestingEnabled,
        bool revocable
    ) external nonReentrant returns (uint256) {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (lockDuration == 0) revert ZeroDuration();
        if (cliffDuration > lockDuration) revert CliffExceedsDuration();

        if (lockFee > 0) usdc.safeTransferFrom(msg.sender, treasury, lockFee);
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = startTime + lockDuration;

        uint256 lockId = nextLockId++;
        locks[lockId] = Lock({
            token: token,
            creator: msg.sender,
            beneficiary: beneficiary,
            totalAmount: amount,
            claimedAmount: 0,
            startTime: startTime,
            endTime: endTime,
            cliffDuration: cliffDuration,
            vestingEnabled: vestingEnabled,
            revocable: revocable,
            revoked: false
        });

        userLockIds[msg.sender].push(lockId);
        beneficiaryLockIds[beneficiary].push(lockId);

        emit LockCreated(lockId, msg.sender, token, beneficiary, amount, startTime, endTime, vestingEnabled);

        return lockId;
    }

    function createBatchLock(
        address token,
        address[] calldata beneficiaries,
        uint256[] calldata amounts,
        uint64 lockDuration,
        uint64 cliffDuration,
        bool vestingEnabled,
        bool revocable
    ) external nonReentrant returns (uint256[] memory) {
        uint256 len = beneficiaries.length;
        if (len == 0) revert EmptyArray();
        if (len != amounts.length) revert ArrayLengthMismatch();
        if (len > MAX_BATCH_SIZE) revert ExceedsMaxBatchSize();
        if (token == address(0)) revert ZeroAddress();
        if (lockDuration == 0) revert ZeroDuration();
        if (cliffDuration > lockDuration) revert CliffExceedsDuration();

        // Calculate total amount
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < len;) {
            if (beneficiaries[i] == address(0)) revert ZeroAddress();
            if (amounts[i] == 0) revert ZeroAmount();
            totalAmount += amounts[i];
            unchecked { ++i; }
        }

        // Single fee transfer for entire batch
        if (lockFee > 0) usdc.safeTransferFrom(msg.sender, treasury, lockFee);

        // Single token transfer for total amount
        IERC20(token).safeTransferFrom(msg.sender, address(this), totalAmount);

        BatchLockParams memory p = BatchLockParams({
            token: token,
            lockDuration: lockDuration,
            cliffDuration: cliffDuration,
            vestingEnabled: vestingEnabled,
            revocable: revocable
        });

        uint256[] memory lockIds = _createBatchLocks(p, beneficiaries, amounts);

        emit BatchLockCreated(lockIds[0], msg.sender, token, lockIds, totalAmount);

        return lockIds;
    }

    function _createBatchLocks(
        BatchLockParams memory p,
        address[] calldata beneficiaries,
        uint256[] calldata amounts
    ) internal returns (uint256[] memory) {
        uint256 len = beneficiaries.length;
        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = startTime + p.lockDuration;
        uint256[] memory lockIds = new uint256[](len);

        for (uint256 i = 0; i < len;) {
            lockIds[i] = _createSingleBatchEntry(p, beneficiaries[i], amounts[i], startTime, endTime);
            unchecked { ++i; }
        }

        return lockIds;
    }

    function _createSingleBatchEntry(
        BatchLockParams memory p,
        address beneficiary,
        uint256 amount,
        uint64 startTime,
        uint64 endTime
    ) internal returns (uint256) {
        uint256 lockId = nextLockId++;

        Lock storage newLock = locks[lockId];
        newLock.token = p.token;
        newLock.creator = msg.sender;
        newLock.beneficiary = beneficiary;
        newLock.totalAmount = amount;
        newLock.startTime = startTime;
        newLock.endTime = endTime;
        newLock.cliffDuration = p.cliffDuration;
        newLock.vestingEnabled = p.vestingEnabled;
        newLock.revocable = p.revocable;

        userLockIds[msg.sender].push(lockId);
        beneficiaryLockIds[beneficiary].push(lockId);

        emit LockCreated(lockId, msg.sender, p.token, beneficiary, amount, startTime, endTime, p.vestingEnabled);

        return lockId;
    }

    function claim(
        uint256 lockId
    ) external nonReentrant {
        Lock storage lock = locks[lockId];
        if (msg.sender != lock.beneficiary) revert NotBeneficiary();
        if (lock.revoked) revert LockIsRevoked();

        uint256 claimable = _getClaimableAmount(lock);
        if (claimable == 0) revert NothingToClaim();

        lock.claimedAmount += claimable;
        IERC20(lock.token).safeTransfer(msg.sender, claimable);

        emit TokensClaimed(lockId, msg.sender, claimable);
    }

    function revokeLock(
        uint256 lockId
    ) external nonReentrant {
        Lock storage lock = locks[lockId];
        if (msg.sender != lock.creator) revert NotCreator();
        if (!lock.revocable) revert NotRevocable();
        if (lock.revoked) revert AlreadyRevoked();

        uint256 vested = _getVestedAmount(lock);
        uint256 unclaimedVested = vested - lock.claimedAmount;
        uint256 returnAmount = lock.totalAmount - vested;

        // Effects — update all state before external calls
        lock.claimedAmount += unclaimedVested;
        lock.revoked = true;

        // Interactions — external calls after state updates
        if (unclaimedVested > 0) {
            IERC20(lock.token).safeTransfer(lock.beneficiary, unclaimedVested);
        }
        if (returnAmount > 0) {
            IERC20(lock.token).safeTransfer(lock.creator, returnAmount);
        }

        emit LockRevoked(lockId, returnAmount);
    }

    function getClaimableAmount(
        uint256 lockId
    ) external view returns (uint256) {
        return _getClaimableAmount(locks[lockId]);
    }

    function getLocksByCreator(
        address creator
    ) external view returns (uint256[] memory) {
        return userLockIds[creator];
    }

    function getLocksByBeneficiary(
        address beneficiary
    ) external view returns (uint256[] memory) {
        return beneficiaryLockIds[beneficiary];
    }

    function setLockFee(
        uint256 _fee
    ) external onlyOwner {
        uint256 oldFee = lockFee;
        lockFee = _fee;
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

    function _getClaimableAmount(
        Lock storage lock
    ) internal view returns (uint256) {
        if (lock.revoked) return 0;
        uint256 vested = _getVestedAmount(lock);
        return vested - lock.claimedAmount;
    }

    function _getVestedAmount(
        Lock storage lock
    ) internal view returns (uint256) {
        if (block.timestamp < lock.startTime + lock.cliffDuration) {
            return 0;
        }

        if (!lock.vestingEnabled) {
            if (block.timestamp >= lock.endTime) {
                return lock.totalAmount;
            }
            return 0;
        }

        if (block.timestamp >= lock.endTime) {
            return lock.totalAmount;
        }

        uint256 elapsed = block.timestamp - lock.startTime;
        uint256 duration = lock.endTime - lock.startTime;
        return (lock.totalAmount * elapsed) / duration;
    }
}
