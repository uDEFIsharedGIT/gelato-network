import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "gsp:scripts:defaultpayload:ScriptEnterStableSwap",
  `Returns a hardcoded payload for EnterStableSwap`
)
  .addOptionalPositionalParam(
    "sellToken",
    "Token to sell on BatchExchange -default USDC",
    "0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b"
  )
  .addOptionalPositionalParam(
    "buyToken",
    "Token to buy on BatchExchange -default DAI",
    "0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea",
  )
  .addOptionalPositionalParam(
    "sellAmount",
    "Amount to sell -default 1 (1000000 USDC) (1)",
    "1000000",

  )
  .addOptionalPositionalParam(
    "buyAmount",
    "Amount to buy -default 1 (500000000000000000 DAI (0.5))",
    "500000000000000000",

  )
  .addOptionalParam(
    "orderExpirationBatchId",
    "will be +2 batches from current batch"
  )
  .addOptionalParam(
    "gelatoprovider",
    "handleGelatoProvider default"
  )
  .addOptionalParam(
    "gelatoexecutor",
    "handleGelatoExecutor default"
  )
  .addOptionalVariadicPositionalParam("inputs")
  .addFlag("log")
  .setAction(async taskArgs => {
    try {

      // @DEV Check EOA approval for Gnosis Safe
      taskArgs.log = true

      // const proxyAddress = await run("gc-determineCpkProxyAddress")

      const signers = await ethers.signers()
      const signer = signers[0]
      const useraddress = signer._address

      if (!taskArgs.orderExpirationBatchId) {
        const currentBatchId  = await run("invokeviewfunction", {
          contractname: "BatchExchange",
          functionname: "getCurrentBatchId",
          to: "0xC576eA7bd102F7E476368a5E98FA455d1Ea34dE2"
        })
        const currentBatchIdBN = ethers.utils.bigNumberify(currentBatchId)
        console.log(`Current Batch Id: ${currentBatchIdBN}`)

        // Withdraw in 1 batches
        taskArgs.orderExpirationBatchId = currentBatchIdBN.add(ethers.utils.bigNumberify("1"))
        console.log(`Action will withdraw in Batch Id: ${taskArgs.orderExpirationBatchId}`)

      }


      taskArgs.gelatoprovider = await run("handleGelatoProvider", {
        gelatoprovider: taskArgs.gelatoprovider
      })

      taskArgs.gelatoexecutor = await run("handleGelatoExecutor", {
        gelatoexecutor: taskArgs.gelatoexecutor
      });

      const providerAndExecutor = [
        taskArgs.gelatoprovider,
        taskArgs.gelatoexecutor
      ]

      const conditionAddress = await run("bre-config", {
        deployments: true,
        contractname: 'ConditionBatchExchangeFundsWithdrawable'
      });

      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: 'ActionWithdrawBatchExchangeRinkeby'
      });

      const conditionAndAction = [
        conditionAddress,
        actionAddress
      ]

      /*
      address _user,
      address _sellToken,
      address _buyToken,
      uint128 _sellAmount,
      uint128 _buyAmount,
      uint32 _orderExpirationBatchId,
      // ChainedMintingParams
      address[2] memory _selectedProviderAndExecutor,
      address[2] memory _conditionAndAction
      */

      if (!taskArgs.sellAmount) taskArgs.sellAmount = "1000000"
      if (!taskArgs.buyAmount) taskArgs.buyAmount = "500000000000000000"
      if (!taskArgs.sellToken) taskArgs.sellToken = "0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b"
      if (!taskArgs.buyToken) taskArgs.buyToken = "0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea"

      const inputs = [
        useraddress,
        taskArgs.sellToken,
        taskArgs.buyToken,
        ethers.utils.bigNumberify(taskArgs.sellAmount),
        ethers.utils.bigNumberify(taskArgs.buyAmount),
        taskArgs.orderExpirationBatchId,
        providerAndExecutor,
        conditionAndAction
      ];

      console.log(`User: ${signer._address}`)

      if (taskArgs.log)
        console.log(
          "\nEnterStableSwap Inputs:\n",
          taskArgs
        );

      const payload = await run("abi-encode-withselector", {
        contractname: "ScriptEnterStableSwap",
        functionname: "enterStableSwap",
        inputs
      });

      if (taskArgs.log)
        console.log(
          "\nEnterStableSwap Payload:\n",
          payload
        );

      return payload;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
