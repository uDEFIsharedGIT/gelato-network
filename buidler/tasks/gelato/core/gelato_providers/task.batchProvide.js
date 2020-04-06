import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gc-batchprovide",
  `Sends tx and --funds to GelatoCore.batchProvide() on [--network] (default: ${defaultNetwork})`
)
  .addOptionalParam("funds", "The amount of ETH funds to provide")
  .addOptionalParam("gelatoexecutor", "The provider's assigned gelatoExecutor")
  .addOptionalParam("conditions", "Only one via CLI.")
  .addOptionalParam(
    "actionswithgaspriceceil",
    "Cannot be passed via CLI as it is an Array of ActionWithGasPriceCeil objs"
  )
  .addOptionalParam(
    "action",
    "Only one via CLI. CAUTION to provide gasPriceCeil too, if needed."
  )
  .addOptionalParam("actiongaspriceceil", "Combine with --action")
  .addOptionalParam("modules", "Gelato Provider Modules. Only 1 via CLI.")
  .addOptionalParam(
    "providerindex",
    "index of user account generated by mnemonic to fetch provider address",
    2,
    types.int
  )
  .addOptionalParam("gelatocoreaddress", "Provide this if not in bre-config")
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      // TaskArgs Sanitzation
      // Gelato Provider is the 3rd signer account
      const {
        [taskArgs.providerindex]: gelatoProvider,
      } = await ethers.getSigners();

      if (!gelatoProvider)
        throw new Error("\n gelatoProvider not instantiated \n");

      if (!taskArgs.gelatoexecutor)
        taskArgs.gelatoexecutor = constants.AddressZero;

      if (!taskArgs.conditions) taskArgs.conditions = [];
      else
        taskArgs.conditions = Array.isArray(taskArgs.conditions)
          ? taskArgs.conditions
          : [taskArgs.conditions];

      if (!taskArgs.actionswithgaspriceceil)
        taskArgs.actionswithgaspriceceil = [];
      else
        taskArgs.actionswithgaspriceceil = Array.isArray(
          taskArgs.actionswithgaspriceceil
        )
          ? taskArgs.actionswithgaspriceceil
          : [taskArgs.actionswithgaspriceceil];

      if (taskArgs.action) {
        const actionAddress = await run("bre-config", {
          deployments: true,
          contractname: taskArgs.action,
        });
        const actionWithGasPriceCeil = new ActionWithGasPriceCeil(
          actionAddress,
          taskArgs.actiongaspriceceil
        );
        taskArgs.actionswithgaspriceceil.push(actionWithGasPriceCeil);
      }

      if (!taskArgs.modules) taskArgs.modules = [];
      else
        taskArgs.modules = Array.isArray(taskArgs.modules)
          ? taskArgs.modules
          : [taskArgs.modules];

      if (taskArgs.log) console.log("\n gc-batchprovide TaskArgs:\n", taskArgs);

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        contractaddress: taskArgs.gelatocoreaddress,
        signer: gelatoProvider,
        write: true,
      });

      // GelatoCore contract call from provider account
      const tx = await gelatoCore.batchProvide(
        taskArgs.gelatoexecutor,
        taskArgs.conditions,
        taskArgs.actionswithgaspriceceil,
        taskArgs.modules,
        {
          value: utils.parseEther(taskArgs.funds),
        }
      );

      if (taskArgs.log) console.log(`\n\ntxHash batchProvide: ${tx.hash}`);
      const { blockHash: blockhash } = await tx.wait();

      if (taskArgs.events) {
        await run("event-getparsedlogsallevents", {
          contractname: "GelatoCore",
          contractaddress: gelatoCore.address,
          blockhash,
          txhash: tx.hash,
          log: true,
        });
      }

      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
