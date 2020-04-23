import { task } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";
import IceCream from "../../../src/classes/gelato/IceCream";

const GAS_PRICE = utils.parseUnits("9", "gwei");

export default task("setupgelato-gnosissafeproxy")
  .addOptionalParam("condition")
  .addOptionalVariadicPositionalParam("actions")
  .addOptionalParam("mastercopy", "gnosis safe mastercopy")
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log")
  .setAction(async (taskArgs) => {
    try {
      taskArgs.log = true;

      if (taskArgs.log) console.log("\n setupgelato TaskArgs:\n", taskArgs);

      // === Deployments ===
      // GelatoCore
      const gelatoCore = await run("deploy", {
        contractname: "GelatoCore",
        log: taskArgs.log,
      });

      // GelatoGasPriceOracle
      const gelatoGasPriceOracle = await run("deploy", {
        contractname: "GelatoGasPriceOracle",
        constructorargs: [gelatoCore.address, GAS_PRICE.toString()],
        events: taskArgs.events,
        log: taskArgs.log,
      });

      // Condition
      if (taskArgs.condition) {
        const conditionInstance = await run("deploy", {
          contractname: taskArgs.condition,
          log: taskArgs.log,
        });
        taskArgs.condition = conditionInstance.address;
      } else {
        taskArgs.condition = constants.AddressZero;
      }

      // === GelatoCore setup ===
      const { 1: gelatoExecutor, 2: gelatoProvider } = await ethers.signers();
      const gelatoExecutorAddress = await gelatoExecutor.getAddress();
      const gelatoProviderAddress = await gelatoProvider.getAddress();

      // Action
      let actionAddresses = [];
      let tempArray = [];
      for (const action of taskArgs.actions) {
        if (!tempArray.includes(action)) {
          let actionconstructorargs;
          if (action === "ActionWithdrawBatchExchangeWithMaker") {
            const batchExchange = await run("bre-config", {
              addressbookcategory: "gnosisProtocol",
              addressbookentry: "batchExchange",
            });

            const medianizer2 = await run("bre-config", {
              addressbookcategory: "maker",
              addressbookentry: "medianizer2",
            });

            const { WETH: weth } = await run("bre-config", {
              addressbookcategory: "erc20",
            });

            // address _batchExchange, address _weth, address _gelatoProvider
            actionconstructorargs = [
              batchExchange,
              weth,
              gelatoProviderAddress,
              medianizer2,
            ];
          }
          const deployedAction = await run("deploy", {
            contractname: action,
            log: taskArgs.log,
            constructorargs: actionconstructorargs,
          });

          tempArray.push(action);
          actionAddresses.push(deployedAction.address);
        } else {
          let i = 0;
          for (const tempAction of taskArgs.actions) {
            if (tempAction === action) {
              actionAddresses.push(actionAddresses[i]);
              tempArray.push(action);
              break;
            }
            i = i + 1;
          }
        }
      }

      // inst, data, operation, value, termsOkCheck
      const actionArray = [];
      for (const actionAddress of actionAddresses) {
        const action = new Action({
          inst: actionAddress,
          data: constants.HashZero,
          operation: Operation.Delegatecall,
          termsOkCheck: true,
        });
        actionArray.push(action);
      }

      // ProviderModule Gnosis Safe
      // 1. Get extcodehash of Gnosis Safe
      const safeAddress = await run("gc-determineCpkProxyAddress");
      let providerToRead = ethers.provider;
      const extcode = await providerToRead.getCode(safeAddress);
      const extcodehash = utils.solidityKeccak256(["bytes"], [extcode]);

      // 1. Get Mastercopy
      if (!taskArgs.mastercopy) {
        taskArgs.mastercopy = await run("bre-config", {
          addressbookcategory: "gnosisSafe",
          addressbookentry: "mastercopy",
        });
      }

      const providerModuleGnosisSafeProxy = await run("deploy", {
        contractname: "ProviderModuleGnosisSafeProxy",
        constructorargs: [
          [extcodehash],
          [taskArgs.mastercopy],
          gelatoCore.address,
        ],
        events: taskArgs.events,
        log: taskArgs.log,
      });

      // Whitelist gelatoCore as module
      await run("gsp-exectransaction", {
        gnosissafeproxyaddress: safeAddress,
        contractname: "ScriptGnosisSafeEnableGelatoCore",
        inputs: [gelatoCore.address],
        functionname: "enableGelatoCoreModule",
        operation: 1,
      });

      // GelatoSysAdmin
      await run("gc-setgelatogaspriceoracle", {
        gelatocoreaddress: gelatoCore.address,
        oracle: gelatoGasPriceOracle.address,
        events: taskArgs.events,
        log: taskArgs.log,
      });

      // Executor
      await run("gc-stakeexecutor", {
        gelatocoreaddress: gelatoCore.address,
        executorindex: 1,
        events: taskArgs.events,
        log: taskArgs.log,
      });

      // Provider
      // Create IceCream condition, actions, gasPriceCeil
      const iceCream = new IceCream({
        condition: taskArgs.condition,
        actions: actionArray,
        gasPriceCeil: utils.parseUnits("20", "gwei"),
      });

      await run("gc-batchprovide", {
        gelatocoreaddress: gelatoCore.address,
        providerindex: 2,
        funds: "1",
        gelatoexecutor: gelatoExecutorAddress,
        iceCreams: [iceCream],
        modules: [providerModuleGnosisSafeProxy.address],
        // events: taskArgs.events,  < = BUIDLER EVM events bug for structs
        log: taskArgs.log,
      });

      if (taskArgs.log) {
        console.log(`
            GelatoCore: ${gelatoCore.address}\n
            GelatoGasPriceOracle: ${gelatoGasPriceOracle.address}\n
            Condition: ${taskArgs.condition}\n
            ProviderModuleGnosisSafeProxy: ${providerModuleGnosisSafeProxy.address}\n
            extcodehash: ${extcodehash}\n
            Safe Address: ${safeAddress}\n
            mastercopy: ${taskArgs.mastercopy}\n
        `);
        actionAddresses.forEach((action) => {
          console.log(`Action: ${action}`);
        });
        console.log(``);
      }
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
