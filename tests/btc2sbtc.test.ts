import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  cvToJSON,
  cvToValue,
  ListCV,
  noneCV,
  principalCV,
  responseErrorCV,
  responseOkCV,
  someCV,
  trueCV,
  uintCV,
  falseCV,
  bufferCV,
  ClarityType,
} from "@stacks/transactions";

// Account setup
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;
const address3 = accounts.get("wallet_3")!;
const address4 = accounts.get("wallet_4")!;
const address5 = accounts.get("wallet_5")!;
const address6 = accounts.get("wallet_6")!;
const address7 = accounts.get("wallet_7")!;
const address8 = accounts.get("wallet_8")!;
const address9 = accounts.get("wallet_9")!;
const address10 = accounts.get("wallet_10")!;

// Contract references
const BTC2AIBTC_CONTRACT = "btc2aibtc-simul";
const SBTC_TOKEN_CONTRACT =
  "STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2.sbtc-token";
const AGENT_REGISTRY_CONTRACT = "agent-account-registry";
const AN_AGENT_CONTRACT = `${deployer}.an-agent`;

// Test token contracts
const TEST_TOKEN_CONTRACT =
  "ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.lemar1-faktory";
const TEST_PRE_CONTRACT =
  "ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.lemar1-pre-faktory";
const TEST_DEX_CONTRACT =
  "ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.lemar1-faktory-dex";
const TEST_POOL_CONTRACT =
  "ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.xyk-pool-sbtc-lemar1-v-1-1";

beforeAll(() => {
  try {
    const registry = simnet.callReadOnlyFn(
      AGENT_REGISTRY_CONTRACT,
      "get-agent-account-by-owner",
      [principalCV(address1)],
      deployer
    );
  } catch (error) {}
});

const fundBridgePool = (amount: number = 690000000) => {
  const fundedWallet = "ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H";
  const operator = "STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2";

  const transferResult = simnet.callPublicFn(
    SBTC_TOKEN_CONTRACT,
    "transfer",
    [
      uintCV(amount),
      principalCV(fundedWallet),
      principalCV(operator),
      noneCV(),
    ],
    fundedWallet
  );

  const initResult = simnet.callPublicFn(
    BTC2AIBTC_CONTRACT,
    "initialize-pool",
    [uintCV(amount), bufferCV(new Uint8Array(40).fill(0))],
    operator
  );

  simnet.mineEmptyBlocks(7);
  return initResult;
};

const setupAllowedDex = (dexId: number) => {
  const ftContract = principalCV(TEST_TOKEN_CONTRACT);
  const preContract = principalCV(TEST_PRE_CONTRACT);
  const dexContract = principalCV(TEST_DEX_CONTRACT);
  const poolContract = principalCV(TEST_POOL_CONTRACT);

  const approver1 = "STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2";
  const approver2 = "ST1G655MB1JVQ5FBE2JJ3E01HEA6KBM4H394VWAD6";

  const proposeResult = simnet.callPublicFn(
    BTC2AIBTC_CONTRACT,
    "propose-allowlist-dexes",
    [ftContract, preContract, dexContract, poolContract],
    approver1
  );

  const signalResult = simnet.callPublicFn(
    BTC2AIBTC_CONTRACT,
    "signal-allowlist-approval",
    [uintCV(1)],
    approver2
  );

  return { proposeResult, signalResult };
};

describe("BTC to AI BTC Bridge - Debug Session", () => {
  beforeEach(() => {
    fundBridgePool(690000000);
  });

  describe("Pool Setup and Allowlist", () => {
    it("should initialize pool successfully", () => {
      const poolStatus = simnet.callReadOnlyFn(
        BTC2AIBTC_CONTRACT,
        "get-pool",
        [],
        deployer
      );

      expect(poolStatus.result.type).toBe(ClarityType.ResponseOk);
      const pool = cvToValue(poolStatus.result);
      expect(Number(pool.value["total-sbtc"].value)).toBeGreaterThan(0);
    });

    it("debug environment differences", () => {
      const poolState = simnet.callReadOnlyFn(
        BTC2AIBTC_CONTRACT,
        "get-pool",
        [],
        deployer
      );

      expect(simnet.burnBlockHeight).toBeGreaterThan(0);
      expect(deployer).toBeTruthy();
      expect(poolState.result.type).toBe(ClarityType.ResponseOk);
    });

    it("should setup allowed DEX successfully", () => {
      const { proposeResult, signalResult } = setupAllowedDex(1);

      expect(proposeResult.result.type).toBe(ClarityType.ResponseOk);
      expect(signalResult.result.type).toBe(ClarityType.ResponseOk);

      const allowedDex = simnet.callReadOnlyFn(
        BTC2AIBTC_CONTRACT,
        "get-dex-allowed",
        [uintCV(1)],
        deployer
      );
      expect(allowedDex.result.type).toBe(ClarityType.OptionalSome);
    });
  });

  describe("Debug Swap Function", () => {
    beforeEach(() => {
      setupAllowedDex(1);
    });

    it("DEBUG: Check swap response format", () => {
      const btcAmount = 50000;
      const minAmountOut = 0;
      const dexId = 1;

      const ftContract = principalCV(TEST_TOKEN_CONTRACT);
      const dexContract = principalCV(TEST_DEX_CONTRACT);
      const preContract = principalCV(TEST_PRE_CONTRACT);
      const poolContract = principalCV(TEST_POOL_CONTRACT);
      const sbtcContract = principalCV(SBTC_TOKEN_CONTRACT);

      const { result, events } = simnet.callPublicFn(
        BTC2AIBTC_CONTRACT,
        "swap-btc-to-aibtc",
        [
          uintCV(btcAmount),
          uintCV(minAmountOut),
          uintCV(dexId),
          ftContract,
          dexContract,
          preContract,
          poolContract,
          sbtcContract,
        ],
        address1
      );

      // Use expect.fail to show debug info
      expect.fail(`=== SWAP DEBUG INFO ===
Result type: ${result.type}
Result JSON: ${JSON.stringify(cvToJSON(result), null, 2)}
Result value: ${
        result.type === ClarityType.ResponseOk
          ? JSON.stringify(cvToValue(result), null, 2)
          : "N/A"
      }
Number of events: ${events.length}
Event types: ${JSON.stringify(
        events.map((e) => e.event),
        null,
        2
      )}
Print events: ${JSON.stringify(
        events
          .filter((e) => e.event === "print_event")
          .map((e) => ({
            event: e.event,
            data: e.data && e.data.value ? cvToJSON(e.data.value as any) : null,
          })),
        null,
        2
      )}
Transfer events: ${JSON.stringify(
        events.filter((e) => e.event === "ft_transfer_event").length
      )}
=== END DEBUG ===`);
    });
  });

  describe("Debug Error Handling", () => {
    it("DEBUG: Emergency stop response", () => {
      const operator = "STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2";

      const pauseResult = simnet.callPublicFn(
        BTC2AIBTC_CONTRACT,
        "emergency-stop-swaps",
        [],
        operator
      );

      setupAllowedDex(1);

      const btcAmount = 50000;
      const ftContract = principalCV(TEST_TOKEN_CONTRACT);
      const dexContract = principalCV(TEST_DEX_CONTRACT);
      const preContract = principalCV(TEST_PRE_CONTRACT);
      const poolContract = principalCV(TEST_POOL_CONTRACT);
      const sbtcContract = principalCV(SBTC_TOKEN_CONTRACT);

      const result = simnet.callPublicFn(
        BTC2AIBTC_CONTRACT,
        "swap-btc-to-aibtc",
        [
          uintCV(btcAmount),
          uintCV(0),
          uintCV(1),
          ftContract,
          dexContract,
          preContract,
          poolContract,
          sbtcContract,
        ],
        address1
      );

      expect.fail(`=== EMERGENCY STOP DEBUG ===
Pause result: ${JSON.stringify(cvToJSON(pauseResult.result), null, 2)}
Swap after pause result type: ${result.result.type}
Swap after pause result: ${JSON.stringify(cvToJSON(result.result), null, 2)}
Expected ERR_FORBIDDEN (u114): ${JSON.stringify(
        cvToJSON(responseErrorCV(uintCV(114))),
        null,
        2
      )}
=== END DEBUG ===`);
    });

    it("DEBUG: Invalid DEX response", () => {
      const btcAmount = 50000;
      const invalidDexId = 999;

      const ftContract = principalCV(TEST_TOKEN_CONTRACT);
      const dexContract = principalCV(TEST_DEX_CONTRACT);
      const preContract = principalCV(TEST_PRE_CONTRACT);
      const poolContract = principalCV(TEST_POOL_CONTRACT);
      const sbtcContract = principalCV(SBTC_TOKEN_CONTRACT);

      const result = simnet.callPublicFn(
        BTC2AIBTC_CONTRACT,
        "swap-btc-to-aibtc",
        [
          uintCV(btcAmount),
          uintCV(0),
          uintCV(invalidDexId),
          ftContract,
          dexContract,
          preContract,
          poolContract,
          sbtcContract,
        ],
        address1
      );

      expect.fail(`=== INVALID DEX DEBUG ===
Result type: ${result.result.type}
Result: ${JSON.stringify(cvToJSON(result.result), null, 2)}
Expected ERR-DEX-NOT-ALLOWED (u149): ${JSON.stringify(
        cvToJSON(responseErrorCV(uintCV(149))),
        null,
        2
      )}
=== END DEBUG ===`);
    });

    it("DEBUG: Pool balance exceeded response", () => {
      setupAllowedDex(1);

      const btcAmount = 700000000;
      const ftContract = principalCV(TEST_TOKEN_CONTRACT);
      const dexContract = principalCV(TEST_DEX_CONTRACT);
      const preContract = principalCV(TEST_PRE_CONTRACT);
      const poolContract = principalCV(TEST_POOL_CONTRACT);
      const sbtcContract = principalCV(SBTC_TOKEN_CONTRACT);

      const result = simnet.callPublicFn(
        BTC2AIBTC_CONTRACT,
        "swap-btc-to-aibtc",
        [
          uintCV(btcAmount),
          uintCV(0),
          uintCV(1),
          ftContract,
          dexContract,
          preContract,
          poolContract,
          sbtcContract,
        ],
        address1
      );

      expect.fail(`=== POOL BALANCE EXCEEDED DEBUG ===
Result type: ${result.result.type}
Result: ${JSON.stringify(cvToJSON(result.result), null, 2)}
Expected ERR_INSUFFICIENT_POOL_BALANCE (u132): ${JSON.stringify(
        cvToJSON(responseErrorCV(uintCV(132))),
        null,
        2
      )}
=== END DEBUG ===`);
    });
  });

  describe("Debug Pool State", () => {
    it("DEBUG: Pool state after funding", () => {
      const poolStatus = simnet.callReadOnlyFn(
        BTC2AIBTC_CONTRACT,
        "get-pool",
        [],
        deployer
      );

      const pool = cvToValue(poolStatus.result);

      expect.fail(`=== POOL STATE DEBUG ===
Pool status type: ${poolStatus.result.type}
Pool data: ${JSON.stringify(pool, null, 2)}
Total sBTC value: ${pool.value["total-sbtc"]?.value || "undefined"}
Available sBTC value: ${pool.value["available-sbtc"]?.value || "undefined"}
=== END DEBUG ===`);
    });
  });
});
