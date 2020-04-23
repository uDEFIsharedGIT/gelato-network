pragma solidity ^0.6.3;
pragma experimental ABIEncoderV2;

import { ScriptGnosisSafeEnableGelatoCore } from "../../user_proxies/gnosis_safe_proxy/scripts/ScriptGnosisSafeEnableGelatoCore.sol";
import { IGelatoCore } from "../../gelato_core/interfaces/IGelatoCore.sol";
import { ActionWithdrawBatchExchange } from "./ActionWithdrawBatchExchange.sol";
import { ActionPlaceOrderBatchExchange } from "./ActionPlaceOrderBatchExchange.sol";
import { IBatchExchange } from "../../dapp_interfaces/gnosis/IBatchExchange.sol";
import { Task, IGelatoCore } from "../../gelato_core/interfaces/IGelatoCore.sol";


/// @title ScriptEnterStableSwap
/// @author Luis Schliesske & Hilmar Orth
/// @notice Script that 1) whitelists gelato core as gnosis safe module, 2) places order on batch exchange and creates two withdraw requests and 3) mints execution claim on gelato for a withdraw action
contract ScriptEnterStableSwap is ActionPlaceOrderBatchExchange, ScriptGnosisSafeEnableGelatoCore {

    constructor(address _batchExchange) ActionPlaceOrderBatchExchange(_batchExchange) public {
    }

    /// @notice Place order on Batch Exchange and request future withdraw for buy and sell token
    /// @dev Only delegate call into this script
    /// @param _user Users EOA address
    /// @param _sellToken Token to sell on Batch Exchange
    /// @param _buyToken Token to buy on Batch Exchange
    /// @param _sellAmount Amount to sell
    /// @param _buyAmount Amount to receive (at least)
    /// @param _orderExpirationBatchId Expiration batch id of order and id used to request withdrawals for
    /// @param _gelatoCore Address of gelatoCore
    /// @param _task Task which will be created on gelato (ActionWithdrawFromBatchExchangeWithMaker)
    function enterStableSwap(
        address _user,
        address _sellToken,
        address _buyToken,
        uint128 _sellAmount,
        uint128 _buyAmount,
        uint32 _orderExpirationBatchId,
        address _gelatoCore,
        // ChainedMintingParams
        Task memory _task
    )
        public
    {
        // 1. Enable Gelato Core
        enableGelatoCoreModule(_gelatoCore);

        // 2. Execute Trade on BatchExchange
        action(
            _user,
            address(this),
            _sellToken,
            _buyToken,
            _sellAmount,
            _buyAmount,
            _orderExpirationBatchId
        );

        // 3. Mint execution claim
        try IGelatoCore(_gelatoCore).mintExecClaim(_task) {
        } catch {
            revert("Minting chainedClaim unsuccessful");
        }

    }


}