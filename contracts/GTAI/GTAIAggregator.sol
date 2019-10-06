pragma solidity ^0.5.10;

import './GTAI_standards/IcedOut/IcedOutOwnable.sol';
import './GTAI_standards/GTA_registry/ownable_registry/GelatoTriggerRegistryOwnable.sol';
import './GTAI_standards/GTA_registry/ownable_registry/GelatoActionRegistryOwnable.sol';

contract GTAIAggregator is IcedOutOwnable,
                           GelatoTriggerRegistryOwnable,
                           GelatoActionRegistryOwnable
{

    constructor(address payable _gelatoCore,
                uint256 _gtaiGasPrice,
                uint256 _automaticTopUpAmount
    )
        IcedOutOwnable(_gelatoCore,
                       _gtaiGasPrice,
                       _automaticTopUpAmount
        )
        public
    {}


    // _______________ API FOR DAPP TRIGGER ACTION MINTING____________________
    event LogActivation(uint256 executionClaimId,
                        address indexed executionClaimOwner,
                        address indexed trigger,
                        address indexed action
    );

    function activateTA(address _trigger,
                        bytes calldata _specificTriggerParams,
                        address _action,
                        bytes calldata _specificActionParams
    )
        onlyRegisteredTriggers(_trigger)
        onlyRegisteredActions(_action)
        external
        payable
        returns(bool)
    {
        /// @dev Calculations for charging the msg.sender/user
        uint256 prepaidExecutionFee = _getExecutionClaimPrice(_action);
        require(msg.value == prepaidExecutionFee,
            "GTAIAggregator.dutchXTimedSellAndWithdraw: prepaidExecutionFee failed"
        );

        // _________________Minting_____________________________________________
        // Trigger-Action Payloads
        bytes memory triggerPayload
            = abi.encodeWithSelector(_getTriggerSelector(_trigger),
                                     _specificTriggerParams
        );
        bytes memory actionPayload
            = abi.encodeWithSelector(_getActionSelector(_action),
                                     address(0),  // default: action will fetch ecOwner
                                     _specificActionParams
        );
        // Standard action conditions check before minting
        require(_actionConditionsFulfilled(_action, actionPayload),
            "GTAIAggregator.activateTA._actionConditionsFulfilled: failed"
        );
        _mintExecutionClaim(msg.sender,  // executionClaimOwner
                            _trigger,
                            triggerPayload,
                            _action,
                            actionPayload,
                            12 weeks  // expiration time
        );
        emit LogActivation(_getCurrentExecutionClaimId(),
                           msg.sender,
                           _trigger,
                           _action
        );

        return true;
        // =========================
    }

    //___________________ Chained Execution Claim Minting _____________________
    event LogChainedActivation(uint256 executionClaimId,
                               address indexed executionClaimOwner,
                               address trigger,
                               address indexed action,
                               address indexed minter
    );

    function activateChainedTA(address _executionClaimOwner,
                               address _chainedTrigger,
                               bytes calldata _chainedTriggerPayload,
                               address _chainedAction,
                               bytes calldata _chainedActionPayload
    )
        msgSenderIsRegisteredAction()
        onlyRegisteredTriggers(_chainedTrigger)
        onlyRegisteredActions(_chainedAction)
        actionConditionsFulfilled(_chainedAction, _chainedActionPayload)
        external
        returns(bool)
    {
        _mintExecutionClaim(_executionClaimOwner,
                            _chainedTrigger,
                            _chainedTriggerPayload,
                            _chainedAction,
                            _chainedActionPayload,
                            12 weeks  // expiration time
        );
        emit LogChainedActivation(_getCurrentExecutionClaimId(),
                                  _executionClaimOwner,
                                  _chainedTrigger,
                                  _chainedAction,
                                  msg.sender  // minterAction
        );
        return true;
    }
    // ================
}

