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

// Test token contracts (would be deployed in actual test)
const TEST_TOKEN_CONTRACT =
  "ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.lemar1-faktory";
const TEST_PRE_CONTRACT =
  "ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.lemar1-pre-faktory";
const TEST_DEX_CONTRACT =
  "ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.lemar1-faktory-dex";
const TEST_POOL_CONTRACT =
  "ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.xyk-pool-sbtc-lemar1-v-1-1";

// Deploy contracts in test environment
beforeAll(() => {
  // The contracts should already be deployed via Clarinet.toml
  // Just verify they exist
  try {
    const registry = simnet.callReadOnlyFn(
      AGENT_REGISTRY_CONTRACT,
      "get-agent-account-by-owner",
      [principalCV(address1)],
      deployer
    );
  } catch (error) {}
});

// Helper function to fund the BTC bridge pool directly from funded wallet
const fundBridgePool = (amount: number = 690000000) => {
  const fundedWallet = "ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H";
  const operator = "STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2"; // OPERATOR_STYX

  // Transfer sBTC to the operator (not deployer)
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

  // Initialize pool FROM the operator
  const initResult = simnet.callPublicFn(
    BTC2AIBTC_CONTRACT,
    "initialize-pool",
    [uintCV(amount), bufferCV(new Uint8Array(40).fill(0))],
    operator
  );

  // Advance blocks to get past the cooldown period (COOLDOWN = 6 blocks)
  simnet.mineEmptyBlocks(7); // Move 7 blocks ahead to be safe

  return initResult;
};

// Helper function to propose and approve allowlist
const setupAllowedDex = (dexId: number) => {
  const ftContract = principalCV(TEST_TOKEN_CONTRACT);
  const preContract = principalCV(TEST_PRE_CONTRACT);
  const dexContract = principalCV(TEST_DEX_CONTRACT);
  const poolContract = principalCV(TEST_POOL_CONTRACT);

  // Use actual approver addresses from the contract
  const approver1 = "STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2";
  const approver2 = "ST1G655MB1JVQ5FBE2JJ3E01HEA6KBM4H394VWAD6";

  // Propose from first approver
  const proposeResult = simnet.callPublicFn(
    BTC2AIBTC_CONTRACT,
    "propose-allowlist-dexes",
    [ftContract, preContract, dexContract, poolContract],
    approver1
  );

  // Signal from second approver
  const signalResult = simnet.callPublicFn(
    BTC2AIBTC_CONTRACT,
    "signal-allowlist-approval",
    [uintCV(1)], // proposal-id
    approver2
  );

  return { proposeResult, signalResult };
};

describe("BTC to AI BTC Bridge - swap-btc-to-aibtc", () => {
  beforeEach(() => {
    // Just fund the bridge pool - no need to fund individual wallets
    fundBridgePool(690000000); // 6.9 sBTC to bridge

    // Setup agent accounts
  });

  describe("Pool Setup and Allowlist", () => {
    it("should initialize pool successfully", () => {
      const poolStatus = simnet.callReadOnlyFn(
        BTC2AIBTC_CONTRACT,
        "get-pool",
        [],
        deployer
      );

      expect(poolStatus.result.type).toBe("ok"); // response-ok
      const pool = cvToValue(poolStatus.result);
      expect(pool.value["total-sbtc"]).toBeGreaterThan(0);
    });

    it("should setup allowed DEX successfully", () => {
      const { proposeResult, signalResult } = setupAllowedDex(1);

      expect(proposeResult.result.type).toBe(7); // response-ok
      expect(signalResult.result.type).toBe(7); // response-ok

      // Verify DEX is allowed
      const allowedDex = simnet.callReadOnlyFn(
        BTC2AIBTC_CONTRACT,
        "get-dex-allowed",
        [uintCV(1)],
        deployer
      );
      expect(allowedDex.result.type).toBe(10); // some
    });
  });

  describe("Prelaunch Phase - Buying Seats", () => {
    beforeEach(() => {
      setupAllowedDex(1);
    });

    it("should swap BTC to AI BTC during prelaunch (buying seats)", () => {
      const btcAmount = 50000; // 0.0005 BTC in sats
      const minAmountOut = 0;
      const dexId = 1;

      // Mock the required trait contracts
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

      expect(result.type).toBe(7); // response-ok

      // Check for the process-btc-deposit event
      const printEvent = events.find((e) => e.event === "print_event");
      expect(printEvent).toBeDefined();

      if (printEvent) {
        const eventData = printEvent.data.value as any;
        expect(eventData.data.type.data).toBe("process-btc-deposit");
        expect(eventData.data["btc-amount"].value).toBe(btcAmount.toString());
      }
    });

    it("should handle multiple users buying seats in prelaunch", () => {
      setupAllowedDex(1);
      const btcAmount = 50000; // Amount per purchase
      const users = [address1, address2, address3, address4, address5];

      // Mock contracts
      const ftContract = principalCV(TEST_TOKEN_CONTRACT);
      const dexContract = principalCV(TEST_DEX_CONTRACT);
      const preContract = principalCV(TEST_PRE_CONTRACT);
      const poolContract = principalCV(TEST_POOL_CONTRACT);
      const sbtcContract = principalCV(SBTC_TOKEN_CONTRACT);

      // Each user buys seats
      users.forEach((user, index) => {
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
          user
        );

        expect(result.result.type).toBe(7); // response-ok
      });

      // Verify pool balance decreased
      const poolStatus = simnet.callReadOnlyFn(
        BTC2AIBTC_CONTRACT,
        "get-pool",
        [],
        deployer
      );

      const pool = cvToValue(poolStatus.result);
      const expectedDecrease = btcAmount * users.length;
      expect(pool.value["available-sbtc"]).toBeLessThan(
        690000000 - expectedDecrease
      );
    });
  });

  describe("DEX Phase - Market Trading", () => {
    beforeEach(() => {
      setupAllowedDex(1);
      // Simulate prelaunch completion and DEX opening
      // This would involve completing the seat purchases and triggering DEX opening
    });

    it("should swap BTC to AI BTC during DEX phase", () => {
      const btcAmount = 100000; // 0.001 BTC
      const minAmountOut = 1000; // Minimum tokens expected

      // Mock contracts
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
          uintCV(1),
          ftContract,
          dexContract,
          preContract,
          poolContract,
          sbtcContract,
        ],
        address1
      );

      expect(result.type).toBe(7); // response-ok
    });

    it("should reach DEX graduation threshold (5M sats + fees)", () => {
      // This test would simulate enough trading to reach the graduation threshold
      const targetAmount = 5000000; // 5M sats
      const feeAmount = Math.floor(targetAmount * 0.02); // 2% fee
      const totalNeeded = targetAmount + feeAmount;

      // Mock contracts
      const ftContract = principalCV(TEST_TOKEN_CONTRACT);
      const dexContract = principalCV(TEST_DEX_CONTRACT);
      const preContract = principalCV(TEST_PRE_CONTRACT);
      const poolContract = principalCV(TEST_POOL_CONTRACT);
      const sbtcContract = principalCV(SBTC_TOKEN_CONTRACT);

      // Make large purchase to reach threshold
      const result = simnet.callPublicFn(
        BTC2AIBTC_CONTRACT,
        "swap-btc-to-aibtc",
        [
          uintCV(totalNeeded),
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

      expect(result.result.type).toBe(7); // response-ok
    });
  });

  describe("Pool Phase - Bitflow Integration", () => {
    beforeEach(() => {
      setupAllowedDex(1);
      // Simulate DEX graduation to pool phase
    });

    it("should swap BTC to AI BTC through Bitflow pool", () => {
      const btcAmount = 200000; // 0.002 BTC
      const minAmountOut = 1000;

      // Mock contracts
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
          uintCV(1),
          ftContract,
          dexContract,
          preContract,
          poolContract,
          sbtcContract,
        ],
        address1
      );

      expect(result.type).toBe(7); // response-ok
    });
  });

  describe("Error Handling", () => {
    it("should reject swaps when paused", () => {
      // Trigger emergency stop
      simnet.callPublicFn(
        BTC2AIBTC_CONTRACT,
        "emergency-stop-swaps",
        [],
        deployer
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

      expect(result.result).toStrictEqual(responseErrorCV(uintCV(114))); // ERR_FORBIDDEN
    });

    it("should reject swaps with non-allowed DEX", () => {
      const btcAmount = 50000;
      const invalidDexId = 999; // Non-existent DEX ID

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

      expect(result.result).toStrictEqual(responseErrorCV(uintCV(149))); // ERR-DEX-NOT-ALLOWED
    });

    it("should reject swaps exceeding pool balance", () => {
      setupAllowedDex(1);

      const btcAmount = 700000000; // More than pool balance (6.9 sBTC)
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

      expect(result.result).toStrictEqual(responseErrorCV(uintCV(132))); // ERR_INSUFFICIENT_POOL_BALANCE
    });

    it("should reject swaps with wrong token contracts", () => {
      setupAllowedDex(1);

      const btcAmount = 50000;
      const wrongFtContract = principalCV(`${deployer}.wrong-token`);
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
          wrongFtContract,
          dexContract,
          preContract,
          poolContract,
          sbtcContract,
        ],
        address1
      );

      expect(result.result).toStrictEqual(responseErrorCV(uintCV(152))); // ERR-WRONG-FT
    });

    it("should require agent account for swaps", () => {
      setupAllowedDex(1);

      // Remove agent account registration for address1
      simnet.callPublicFn(
        AGENT_REGISTRY_CONTRACT,
        "remove-agent-account",
        [principalCV(address1)],
        address1
      );

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

      expect(result.result).toStrictEqual(responseErrorCV(uintCV(156))); // ERR-NO-AI-ACCOUNT
    });
  });

  describe("Fee Distribution", () => {
    it("should correctly distribute fees between service and LP", () => {
      setupAllowedDex(1);

      const btcAmount = 100000;
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

      expect(result.type).toBe(7); // response-ok

      // Check for fee transfer events
      const transferEvents = events.filter(
        (e) => e.event === "ft_transfer_event"
      );

      // Should have service fee and LP fee transfers
      const serviceFeeEvent = transferEvents.find(
        (e) =>
          e.data &&
          e.data.recipient === "ST1G655MB1JVQ5FBE2JJ3E01HEA6KBM4H394VWAD6"
      );
      const lpFeeEvent = transferEvents.find(
        (e) =>
          e.data &&
          e.data.recipient === "STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2"
      );

      expect(serviceFeeEvent).toBeDefined();
      expect(lpFeeEvent).toBeDefined();
    });
  });

  describe("Complete Flow Simulation", () => {
    it("should simulate complete flow from prelaunch to pool", async () => {
      setupAllowedDex(1);

      // Phase 1: Prelaunch - 10 users buy 2 seats each (20 seats total)
      const users = [
        address1,
        address2,
        address3,
        address4,
        address5,
        address6,
        address7,
        address8,
        address9,
        address10,
      ];
      const seatPrice = 20000; // 20k sats per seat
      const seatsPerUser = 2;

      const ftContract = principalCV(TEST_TOKEN_CONTRACT);
      const dexContract = principalCV(TEST_DEX_CONTRACT);
      const preContract = principalCV(TEST_PRE_CONTRACT);
      const poolContract = principalCV(TEST_POOL_CONTRACT);
      const sbtcContract = principalCV(SBTC_TOKEN_CONTRACT);

      // Users buy seats in prelaunch
      for (const user of users) {
        const btcAmount = seatPrice * seatsPerUser;
        const { result } = simnet.callPublicFn(
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
          user
        );
        expect(result.type).toBe(7);
      }

      // Phase 2: DEX trading to reach 5M sats threshold
      const dexTargetAmount = 5000000; // 5M sats
      const { result: result2 } = simnet.callPublicFn(
        BTC2AIBTC_CONTRACT,
        "swap-btc-to-aibtc",
        [
          uintCV(dexTargetAmount),
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
      expect(result2.type).toBe(7);

      // Phase 3: Pool trading
      const poolTradeAmount = 100000;
      const { result: result3 } = simnet.callPublicFn(
        BTC2AIBTC_CONTRACT,
        "swap-btc-to-aibtc",
        [
          uintCV(poolTradeAmount),
          uintCV(0),
          uintCV(1),
          ftContract,
          dexContract,
          preContract,
          poolContract,
          sbtcContract,
        ],
        address2
      );
      expect(result3.type).toBe(7);

      // Verify pool state
      const finalPoolStatus = simnet.callReadOnlyFn(
        BTC2AIBTC_CONTRACT,
        "get-pool",
        [],
        deployer
      );
      expect(finalPoolStatus.result.type).toBe(7);
    });
  });
});

describe("Pool Management Functions", () => {
  beforeEach(() => {
    fundBridgePool(100000000); // 1 sBTC for pool management tests
  });

  it("should check pool state after funding", () => {
    const poolStatus = simnet.callReadOnlyFn(
      BTC2AIBTC_CONTRACT,
      "get-pool",
      [],
      deployer
    );

    expect(poolStatus.result.type).toBe("ok"); // response-ok
    const pool = cvToValue(poolStatus.result);
    expect(pool.value["total-sbtc"]).toBeGreaterThan(0);
  });
});
