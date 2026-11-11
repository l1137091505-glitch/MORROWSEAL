// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MorrowSeal
/// @notice Records commitments and optional owner confirmations. Plaintext and salts never enter this contract.
contract MorrowSeal {
    struct Receipt {
        address author;
        bytes32 commitment;
        uint64 sealedAt;
        uint64 confirmedAt;
    }

    Receipt[] private _receipts;

    event ResultSealed(uint256 indexed receiptId, address indexed author, bytes32 indexed commitment, uint64 sealedAt);
    event OpeningConfirmed(uint256 indexed receiptId, address indexed author, uint64 confirmedAt);

    error EmptyCommitment();
    error ReceiptMissing();
    error NotAuthor();
    error AlreadyConfirmed();

    function seal(bytes32 commitment) external returns (uint256 receiptId) {
        if (commitment == bytes32(0)) revert EmptyCommitment();
        receiptId = _receipts.length;
        uint64 nowTime = uint64(block.timestamp);
        _receipts.push(Receipt(msg.sender, commitment, nowTime, 0));
        emit ResultSealed(receiptId, msg.sender, commitment, nowTime);
    }

    /// @dev The frontend enables this only after a local preimage check. It records confirmation, not plaintext.
    function confirmOpening(uint256 receiptId) external {
        if (receiptId >= _receipts.length) revert ReceiptMissing();
        Receipt storage item = _receipts[receiptId];
        if (item.author != msg.sender) revert NotAuthor();
        if (item.confirmedAt != 0) revert AlreadyConfirmed();
        item.confirmedAt = uint64(block.timestamp);
        emit OpeningConfirmed(receiptId, msg.sender, item.confirmedAt);
    }

    function receiptCount() external view returns (uint256) {
        return _receipts.length;
    }

    function receipt(uint256 receiptId) external view returns (Receipt memory) {
        if (receiptId >= _receipts.length) revert ReceiptMissing();
        return _receipts[receiptId];
    }
}
