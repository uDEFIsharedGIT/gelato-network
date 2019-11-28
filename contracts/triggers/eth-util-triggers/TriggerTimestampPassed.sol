pragma solidity ^0.5.10;

import "../GelatoTriggersStandard.sol";

contract TriggerTimestampPassed is GelatoTriggersStandard {
    constructor() public { triggerSelector = this.fired.selector; }

    function fired(uint256 _timestamp)
        external
        view
        returns(bool)
    {
        return _timestamp <= block.timestamp;
    }

    function getLatestTimestamp()
        external
        view
        returns(uint256)
    {
        return block.timestamp;
    }
}