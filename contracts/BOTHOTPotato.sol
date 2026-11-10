// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title BOTHOTPotato
 * @notice On-chain multiplayer hot potato game on BOT Chain Testnet.
 * @dev Strictly gas-only: no platform fees, no payable functions, no token transfers.
 */
contract BOTHOTPotato {
    uint256 public constant MIN_DURATION = 60;
    uint256 public constant MAX_DURATION = 3600;

    address public owner;
    address public currentHolder;
    uint256 public roundStartTimestamp;
    uint256 public roundDeadline;
    uint256 public roundDuration;
    uint256 public roundId;
    bool public roundActive;
    address public lastLosingHolder;

    struct RoundInfo {
        uint256 roundId;
        address currentHolder;
        uint256 roundStartTimestamp;
        uint256 roundDeadline;
        uint256 roundDuration;
        bool roundActive;
        address lastLosingHolder;
    }

    event RoundStarted(
        uint256 indexed roundId,
        address indexed initialHolder,
        uint256 startTimestamp,
        uint256 deadline,
        uint256 duration
    );

    event PotatoPassed(
        uint256 indexed roundId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    event RoundEnded(
        uint256 indexed roundId,
        address indexed losingHolder,
        uint256 endTimestamp
    );

    error NotOwner();
    error RoundAlreadyActive();
    error RoundNotActive();
    error InvalidInitialHolder();
    error InvalidDuration(uint256 duration);
    error NotCurrentHolder();
    error InvalidRecipient();
    error CannotPassToSelf();
    error RoundExpired();
    error RoundNotExpired();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Starts a new hot potato round.
     * @param initialHolder Wallet address that receives the potato first.
     * @param duration Round duration in seconds (between 60 and 3600).
     */
    function startRound(address initialHolder, uint256 duration) external onlyOwner {
        if (roundActive) revert RoundAlreadyActive();
        if (initialHolder == address(0)) revert InvalidInitialHolder();
        if (duration < MIN_DURATION || duration > MAX_DURATION) {
            revert InvalidDuration(duration);
        }

        roundId += 1;
        currentHolder = initialHolder;
        roundStartTimestamp = block.timestamp;
        roundDuration = duration;
        roundDeadline = block.timestamp + duration;
        roundActive = true;

        emit RoundStarted(
            roundId,
            initialHolder,
            roundStartTimestamp,
            roundDeadline,
            duration
        );
    }

    /**
     * @notice Passes the hot potato from the current holder to another wallet before the deadline.
     * @param recipient Wallet address of the next potato holder.
     */
    function passPotato(address recipient) external {
        if (!roundActive) revert RoundNotActive();
        if (msg.sender != currentHolder) revert NotCurrentHolder();
        if (recipient == address(0)) revert InvalidRecipient();
        if (recipient == msg.sender) revert CannotPassToSelf();
        if (block.timestamp >= roundDeadline) revert RoundExpired();

        address previousHolder = currentHolder;
        currentHolder = recipient;

        emit PotatoPassed(roundId, previousHolder, recipient, block.timestamp);
    }

    /**
     * @notice Finalizes an expired round and records the final holder as the losing holder.
     */
    function endRound() external {
        if (!roundActive) revert RoundNotActive();
        if (block.timestamp < roundDeadline) revert RoundNotExpired();

        roundActive = false;
        lastLosingHolder = currentHolder;

        emit RoundEnded(roundId, currentHolder, block.timestamp);
    }

    /**
     * @notice Returns full details for the current or most recent round.
     */
    function getRoundInfo() external view returns (RoundInfo memory) {
        return
            RoundInfo({
                roundId: roundId,
                currentHolder: currentHolder,
                roundStartTimestamp: roundStartTimestamp,
                roundDeadline: roundDeadline,
                roundDuration: roundDuration,
                roundActive: roundActive,
                lastLosingHolder: lastLosingHolder
            });
    }

    /**
     * @notice Returns the current potato holder address.
     */
    function getCurrentHolder() external view returns (address) {
        return currentHolder;
    }
}

