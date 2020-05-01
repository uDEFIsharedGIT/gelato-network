pragma solidity ^0.6.6;

import { IGelatoSysAdmin } from "./interfaces/IGelatoSysAdmin.sol";
import { Ownable } from "../external/Ownable.sol";
import { IGelatoGasPriceOracle } from "./interfaces/IGelatoGasPriceOracle.sol";
import { Address } from "../external/Address.sol";
import { SafeMath } from "../external/SafeMath.sol";
import { Math } from "../external/Math.sol";

abstract contract GelatoSysAdmin is IGelatoSysAdmin, Ownable {

    using Address for address payable;
    using SafeMath for uint256;

    // Executor compensation for estimated tx costs not accounted for by startGas
    uint256 public constant override EXEC_TX_OVERHEAD = 55000;
    string internal constant OK = "OK";

    IGelatoGasPriceOracle public override gelatoGasPriceOracle;
    uint256 public override gelatoMaxGas;
    uint256 public override internalGasRequirement;
    uint256 public override minExecutorStake;
    uint256 public override executorSuccessShare;
    uint256 public override sysAdminSuccessShare;
    uint256 public override totalSuccessShare;
    uint256 public override sysAdminFunds;

    constructor() public {
        gelatoMaxGas = 7000000;  // 7 mio initial
        internalGasRequirement = 100000;
        minExecutorStake = 100000;  // production: 1 ETH
        executorSuccessShare = 50;  // 50% of successful execution cost
        sysAdminSuccessShare = 20;  // 20% of successful executibon cost
        totalSuccessShare = 70;
    }

    // == The main functions of the Sys Admin (DAO) ==
    // The oracle defines the system-critical gelatoGasPrice
    function setGelatoGasPriceOracle(address _newOracle) external override onlyOwner {
        require(_newOracle != address(0), "GelatoSysAdmin.setGelatoGasPriceOracle: 0");
        emit LogGelatoGasPriceOracleSet(address(gelatoGasPriceOracle), _newOracle);
        gelatoGasPriceOracle = IGelatoGasPriceOracle(_newOracle);
    }

    // exec-tx gasprice: pulled in from the Oracle by the Executor during exec()
    function _getGelatoGasPrice() internal view returns(uint256) {
        try gelatoGasPriceOracle.getGasPrice() returns(uint256 gasPrice) {
            return gasPrice;
        } catch Error(string memory err) {
            revert(string(abi.encodePacked("GelatoSysAdmin.gelatoGasPrice:", err)));
        } catch {
            revert("GelatoSysAdmin.gelatoGasPrice:undefined");
        }
    }

    // exec-tx gas
    function setGelatoMaxGas(uint256 _newMaxGas) external override onlyOwner {
        emit LogGelatoMaxGasSet(gelatoMaxGas, _newMaxGas);
        gelatoMaxGas = _newMaxGas;
    }

    // exec-tx GelatoCore internal gas requirement
    function setInternalGasRequirement(uint256 _newRequirement) external override onlyOwner {
        emit LogInternalGasRequirementSet(internalGasRequirement, _newRequirement);
        internalGasRequirement = _newRequirement;
    }

    // Minimum Executor Stake Per Provider
    function setMinExecutorStake(uint256 _newMin) external override onlyOwner {
        emit LogMinExecutorStakeSet(minExecutorStake, _newMin);
        minExecutorStake = _newMin;
    }

    // Executors' profit share on exec costs
    function setExecutorSuccessShare(uint256 _percentage) external override onlyOwner {
        emit LogExecutorSuccessShareSet(
            executorSuccessShare,
            _percentage,
            _percentage + sysAdminSuccessShare
        );
        executorSuccessShare = _percentage;
        totalSuccessShare = _percentage + sysAdminSuccessShare;
    }

    // Sys Admin (DAO) Business Model
    function setSysAdminSuccessShare(uint256 _percentage) external override onlyOwner {
        emit LogSysAdminSuccessShareSet(
            sysAdminSuccessShare,
            _percentage,
            executorSuccessShare + _percentage
        );
        sysAdminSuccessShare = _percentage;
        totalSuccessShare = executorSuccessShare + _percentage;
    }

    function withdrawSysAdminFunds(uint256 _amount, address payable _to)
        external
        override
        onlyOwner
        returns(uint256 realWithdrawAmount)
    {
        uint256 currentBalance = sysAdminFunds;

        realWithdrawAmount = Math.min(_amount, currentBalance);

        uint256 newSysAdminFunds = currentBalance - realWithdrawAmount;

        // Effects
        sysAdminFunds = newSysAdminFunds;

        _to.sendValue(realWithdrawAmount);
        emit LogSysAdminFundsWithdrawn(currentBalance, newSysAdminFunds);
    }

    // Executors' total fee for a successful exec
    function executorSuccessFee(uint256 _gas, uint256 _gasPrice)
        public
        view
        override
        returns(uint256)
    {
        uint256 estExecCost = _gas.mul(_gasPrice);
        return estExecCost + estExecCost.mul(executorSuccessShare).div(
            100,
            "GelatoSysAdmin.executorSuccessFee: div error"
        );
    }

    function sysAdminSuccessFee(uint256 _gas, uint256 _gasPrice)
        public
        view
        override
        returns(uint256)
    {
        uint256 estExecCost = _gas.mul(_gasPrice);
        return
            estExecCost.mul(sysAdminSuccessShare).div(
            100,
            "GelatoSysAdmin.sysAdminSuccessShare: div error"
        );
    }
}
