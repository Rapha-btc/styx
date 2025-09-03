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

    it("DEBUG: Check swap response format with balance verification", () => {
      const btcAmount = 50000;
      const minAmountOut = 0;
      const dexId = 1;

      const ftContract = principalCV(TEST_TOKEN_CONTRACT);
      const dexContract = principalCV(TEST_DEX_CONTRACT);
      const preContract = principalCV(TEST_PRE_CONTRACT);
      const poolContract = principalCV(TEST_POOL_CONTRACT);
      const sbtcContract = principalCV(SBTC_TOKEN_CONTRACT);

      // Get AI agent account before swap
      const agentAccountBefore = simnet.callReadOnlyFn(
        AGENT_REGISTRY_CONTRACT,
        "get-agent-account-by-owner",
        [principalCV(address1)],
        deployer
      );

      // Get AI agent's sBTC balance BEFORE swap
      const agentAccount = cvToValue(agentAccountBefore.result).value;
      const sbtcBalanceBefore = simnet.callReadOnlyFn(
        SBTC_TOKEN_CONTRACT,
        "get-balance",
        [principalCV(agentAccount)],
        deployer
      );

      // Execute the swap
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

      // Get AI agent's sBTC balance AFTER swap
      const sbtcBalanceAfter = simnet.callReadOnlyFn(
        SBTC_TOKEN_CONTRACT,
        "get-balance",
        [principalCV(agentAccount)],
        deployer
      );

      // Get seat information from prelaunch contract
      const seatInfo = simnet.callReadOnlyFn(
        TEST_PRE_CONTRACT,
        "get-seats-owned",
        [principalCV(agentAccount)],
        deployer
      );

      // Calculate expected values
      const fee = 3000; // 6% of 50000
      const sbtcToUser = btcAmount - fee; // 47000
      const expectedSeats = Math.floor(sbtcToUser / 20000); // 2 seats
      const expectedChange = sbtcToUser - expectedSeats * 20000; // 7000

      const beforeBalance = cvToValue(sbtcBalanceBefore.result);
      const afterBalance = cvToValue(sbtcBalanceAfter.result);
      const actualChange = afterBalance.value - beforeBalance.value;

      // Proper test assertions
      console.log(`=== SWAP SUCCESS - All Validations Pass ===`);
      console.log(
        `BTC Amount: ${btcAmount} → After fees: ${sbtcToUser} → Seats: ${expectedSeats} → Change: ${expectedChange}`
      );
      console.log(
        `AI Agent Balance: ${beforeBalance.value} → ${afterBalance.value} (change: ${actualChange})`
      );
      console.log(
        `Events: ${events.length} total (${
          events.filter((e) => e.event === "print_event").length
        } print, ${
          events.filter((e) => e.event === "ft_transfer_event").length
        } transfer)`
      );

      // Assert the swap succeeded
      expect(result.type).toBe(ClarityType.ResponseOk);

      // Assert correct change amount was transferred to AI agent
      expect(actualChange).toBe(expectedChange);
      expect(actualChange).toBe(7000);

      // Assert correct number of seats were purchased
      const seatData = cvToValue(seatInfo.result);
      expect(seatData.value["seats-owned"].value).toBe("2");

      // Assert correct number of events generated
      expect(events.length).toBe(6);
      expect(events.filter((e) => e.event === "print_event").length).toBe(2);
      expect(events.filter((e) => e.event === "ft_transfer_event").length).toBe(
        4
      );

      // Assert fee transfers happened correctly
      const transferEvents = events.filter(
        (e) => e.event === "ft_transfer_event"
      );
      expect(transferEvents[0].data.amount).toBe("1500"); // Service fee
      expect(transferEvents[1].data.amount).toBe("1500"); // LP fee
      expect(transferEvents[2].data.amount).toBe("40000"); // Seat purchase
      expect(transferEvents[3].data.amount).toBe("7000"); // Change to agent

      console.log(
        `✓ All assertions passed - swap functionality works correctly!`
      );
    });
  });

  describe("Debug Error Handling", () => {
    it("Emergency stop functionality works correctly", () => {
      const operator = "STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2";

      // Execute emergency stop
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

      // Try to swap after emergency stop
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

      // Check that swaps are paused
      const swapsPaused = simnet.callReadOnlyFn(
        BTC2AIBTC_CONTRACT,
        "are-swaps-paused",
        [],
        operator
      );

      console.log(`=== EMERGENCY STOP TEST ===`);
      console.log(
        `Emergency stop succeeded: ${
          pauseResult.result.type === ClarityType.ResponseOk
        }`
      );
      console.log(
        `Swaps paused status: ${cvToValue(swapsPaused.result).value}`
      );
      console.log(
        `Swap after pause failed correctly: ${
          result.result.type === ClarityType.ResponseErr
        }`
      );

      // Assert emergency stop succeeded
      expect(pauseResult.result.type).toBe(ClarityType.ResponseOk);

      // Assert swaps are now paused
      console.log(
        "DEBUG swapsPaused result:",
        JSON.stringify(cvToJSON(swapsPaused.result), null, 2)
      );
      console.log("DEBUG cvToValue:", cvToValue(swapsPaused.result));
      expect(cvToValue(swapsPaused.result)).toBe(true);

      // Assert swap after pause fails with correct error
      expect(result.result.type).toBe(ClarityType.ResponseErr);
      const errorCode = cvToValue(result.result).value;
      expect(errorCode).toBe("114"); // ERR_FORBIDDEN

      console.log(
        `✓ Emergency stop functionality verified - swaps correctly blocked after pause`
      );
    });

    it("Invalid DEX validation works correctly", () => {
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

      console.log(`=== INVALID DEX TEST ===`);
      console.log(`Result type: ${result.result.type}`);
      console.log(
        `Swap with invalid DEX failed correctly: ${
          result.result.type === ClarityType.ResponseErr
        }`
      );

      // Assert swap fails with invalid DEX
      expect(result.result.type).toBe(ClarityType.ResponseErr);

      // Assert correct error code
      const errorCode = cvToValue(result.result);
      expect(errorCode.value).toBe("149"); // ERR-DEX-NOT-ALLOWED

      console.log(
        `✓ Invalid DEX validation verified - correctly rejected DEX ID ${invalidDexId}`
      );
    });

    it("Pool balance validation works correctly", () => {
      setupAllowedDex(1);

      const btcAmount = 700000000; // More than available pool balance
      const ftContract = principalCV(TEST_TOKEN_CONTRACT);
      const dexContract = principalCV(TEST_DEX_CONTRACT);
      const preContract = principalCV(TEST_PRE_CONTRACT);
      const poolContract = principalCV(TEST_POOL_CONTRACT);
      const sbtcContract = principalCV(SBTC_TOKEN_CONTRACT);

      // Check current pool balance
      const poolStatus = simnet.callReadOnlyFn(
        BTC2AIBTC_CONTRACT,
        "get-pool",
        [],
        deployer
      );
      const pool = cvToValue(poolStatus.result);
      const availableBalance = parseInt(pool.value["available-sbtc"].value);

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

      console.log(`=== POOL BALANCE TEST ===`);
      console.log(`Available pool balance: ${availableBalance} sats`);
      console.log(`Attempted swap amount: ${btcAmount} sats`);
      console.log(`Swap exceeds balance: ${btcAmount > availableBalance}`);
      console.log(
        `Swap failed correctly: ${
          result.result.type === ClarityType.ResponseErr
        }`
      );

      // Assert swap fails when exceeding pool balance
      expect(result.result.type).toBe(ClarityType.ResponseErr);

      // Assert correct error code
      const errorCode = cvToValue(result.result);
      expect(errorCode.value).toBe("132"); // ERR_INSUFFICIENT_POOL_BALANCE

      // Assert the swap amount actually exceeds available balance
      expect(btcAmount).toBeGreaterThan(availableBalance);

      console.log(
        `✓ Pool balance validation verified - correctly rejected oversized swap`
      );
    });
  });

  describe("Debug Pool State", () => {
    it("Pool initialization and state verification works correctly", () => {
      const poolStatus = simnet.callReadOnlyFn(
        BTC2AIBTC_CONTRACT,
        "get-pool",
        [],
        deployer
      );

      const pool = cvToValue(poolStatus.result);

      console.log(`=== POOL STATE TEST ===`);
      console.log(
        `Pool initialized successfully: ${
          poolStatus.result.type === ClarityType.ResponseOk
        }`
      );
      console.log(`Total sBTC: ${pool.value["total-sbtc"].value} sats`);
      console.log(`Available sBTC: ${pool.value["available-sbtc"].value} sats`);
      console.log(`Max deposit: ${pool.value["max-deposit"].value} sats`);
      console.log(`Min fee: ${pool.value["min-fee"].value} sats`);

      // Assert pool status is ok
      expect(poolStatus.result.type).toBe(ClarityType.ResponseOk);

      // Assert correct pool initialization values
      expect(pool.value["total-sbtc"].value).toBe("690000000");
      expect(pool.value["available-sbtc"].value).toBe("690000000");
      expect(pool.value["max-deposit"].value).toBe("1000000000");
      expect(pool.value["min-fee"].value).toBe("3000");

      // Assert pool is properly initialized
      expect(parseInt(pool.value["total-sbtc"].value)).toBeGreaterThan(0);
      expect(parseInt(pool.value["available-sbtc"].value)).toBeGreaterThan(0);
      expect(pool.value["last-updated"].value).toBeTruthy();

      // Assert optional fields are properly set to none initially
      expect(pool.value["add-liq-signaled-at"].value).toBeNull();
      expect(pool.value["set-param-signaled-at"].value).toBeNull();
      expect(pool.value["withdrawal-signaled-at"].value).toBeNull();

      console.log(
        `✓ Pool state verification passed - pool properly initialized with correct parameters`
      );
    });
  });
});
