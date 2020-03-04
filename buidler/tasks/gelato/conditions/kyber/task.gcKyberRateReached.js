import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "g-ckyberrate-reached",
  `Calls <trigername>.reached(<conditionPayload>) on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      // Handle condition payloadsWithSelector
      // Params
      const { DAI: src, KNC: dest } = await run("bre-config", {
        addressbookcategory: "erc20"
      });
      const srcamt = utils.parseUnits("10", 18);
      const [expectedRate] = await run("gc-kyber-getexpectedrate", {
        src,
        dest,
        srcamt
      });
      const refRate = utils
        .bigNumberify(expectedRate)
        .add(utils.parseUnits("1", 17));
      const greaterElseSmaller = false;

      // ConditionRead Instance
      const conditionContract = await run("instantiateContract", {
        contractname: "ConditionKyberRate",
        read: true
      });
      // mintExecutionClaim TX (payable)
      const reached = await conditionContract.reached(
        src,
        srcamt,
        dest,
        refRate,
        greaterElseSmaller
      );

      if (log)
        console.log(
          `\nCondition: ConditionKyberRate\
           \nReached?: ${reached}\n`
        );
      return reached;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
