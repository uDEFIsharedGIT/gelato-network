// ======= Default Payloads ========
// === Conditions ===
// ConditionBalance
import "./default_payloads/conditions/sTask.defaultpayload.ConditionBalance";
// ConditionTimestampPassed
import "./default_payloads/conditions/sTask.defaultpayload.ConditionTimestampPassed";
// == Kyber ==
import "./default_payloads/conditions/sTask.defaultpayload.ConditionKyberRateKovan";
import "./default_payloads/conditions/sTask.defaultpayload.ConditionKyberRateRopsten";

// === Actions ==
// ActionBzxPtokenMintWithToken
import "./default_payloads/actions/sTask.defaultpayload.ActionBzxPtokenBurnToToken";
// ActionBzxPtokenMintWithToken
import "./default_payloads/actions/sTask.defaultpayload.ActionBzxPtokenMintWithToken";
// ActionERC20Transfer
import "./default_payloads/actions/sTask.defaultpayload.ActionERC20Transfer";
// ActionERC20TransferFrom
import "./default_payloads/actions/sTask.defaultpayload.ActionERC20TransferFrom";
// == ActionKyberTrade
// mainnet
import "./default_payloads/actions/sTask.defaultpayload.ActionKyberTrade";
// Kovan
import "./default_payloads/actions/sTask.defaultpayload.ActionKyberTradeKovan";
// ActionMultiMintForConditionTimestampPassed
import "./default_payloads/actions/sTask.defaultpayload.ActionMultiMintForConditionTimestampPassed";