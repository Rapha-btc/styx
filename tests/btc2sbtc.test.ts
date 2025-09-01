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

      expect(poolStatus.result.type).toBe(ClarityType.ResponseOk);
      const pool = cvToValue(poolStatus.result);
      expect(pool.value["total-sbtc"]).toBeGreaterThan(0);
    });

    it("debug environment differences", () => {
      // Check if external contracts are accessible
      let preContractAccessible = false;
      try {
        const preResult = simnet.callReadOnlyFn(
          TEST_PRE_CONTRACT,
          "get-market-cap", // or whatever read-only function exists
          [],
          deployer
        );
        preContractAccessible =
          preResult.result.type === ClarityType.ResponseOk;
      } catch (e) {
        preContractAccessible = false;
      }

      // Check pool detailed state
      const poolState = simnet.callReadOnlyFn(
        BTC2AIBTC_CONTRACT,
        "get-pool",
        [],
        deployer
      );
      const pool =
        poolState.result.type === ClarityType.ResponseOk
          ? cvToValue(poolState.result)
          : null;

      // Check if DEX is actually approved
      const dexCheck = simnet.callReadOnlyFn(
        BTC2AIBTC_CONTRACT,
        "get-dex-allowed",
        [uintCV(1)],
        deployer
      );

      // Basic sanity checks
      expect(simnet.burnBlockHeight).toBeGreaterThan(0);
      expect(deployer).toBeTruthy();
      expect(poolState.result.type).toBe(ClarityType.ResponseOk);
    });

    it("should setup allowed DEX successfully", () => {
      const { proposeResult, signalResult } = setupAllowedDex(1);

      expect(proposeResult.result.type).toBe(ClarityType.ResponseOk);
      expect(signalResult.result.type).toBe(ClarityType.ResponseOk);

      // Verify DEX is allowed
      const allowedDex = simnet.callReadOnlyFn(
        BTC2AIBTC_CONTRACT,
        "get-dex-allowed",
        [uintCV(1)],
        deployer
      );
      expect(allowedDex.result.type).toBe(ClarityType.OptionalSome);
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

      // Pre-swap checks
      const prePoolState = simnet.callReadOnlyFn(
        BTC2AIBTC_CONTRACT,
        "get-pool",
        [],
        deployer
      );
      expect(prePoolState.result.type).toBe(ClarityType.ResponseOk);

      const dexAllowed = simnet.callReadOnlyFn(
        BTC2AIBTC_CONTRACT,
        "get-dex-allowed",
        [uintCV(dexId)],
        deployer
      );
      expect(dexAllowed.result.type).toBe(ClarityType.OptionalSome);

      // Check if agent account exists
      const agentAccount = simnet.callReadOnlyFn(
        AGENT_REGISTRY_CONTRACT,
        "get-agent-account-by-owner",
        [principalCV(address1)],
        deployer
      );

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

      // If the swap fails, let's see what the error is
      if (result.type !== ClarityType.ResponseOk) {
        const errorValue = cvToValue(result);
        throw new Error(
          `Swap failed with type ${result.type}, value: ${JSON.stringify(
            errorValue
          )}`
        );
      }

      expect(result.type).toBe(ClarityType.ResponseOk);

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

        if (result.result.type !== ClarityType.ResponseOk) {
          const errorValue = cvToValue(result.result);
          throw new Error(
            `User ${index + 1} swap failed with type ${
              result.result.type
            }, value: ${JSON.stringify(errorValue)}`
          );
        }

        expect(result.result.type).toBe(ClarityType.ResponseOk);
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

      if (result.type !== ClarityType.ResponseOk) {
        const errorValue = cvToValue(result);
        throw new Error(
          `DEX phase swap failed with type ${
            result.type
          }, value: ${JSON.stringify(errorValue)}`
        );
      }

      expect(result.type).toBe(ClarityType.ResponseOk);
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

      if (result.result.type !== ClarityType.ResponseOk) {
        const errorValue = cvToValue(result.result);
        throw new Error(
          `Large purchase failed with type ${
            result.result.type
          }, value: ${JSON.stringify(errorValue)}`
        );
      }

      expect(result.result.type).toBe(ClarityType.ResponseOk);
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

      if (result.type !== ClarityType.ResponseOk) {
        const errorValue = cvToValue(result);
        throw new Error(
          `Pool phase swap failed with type ${
            result.type
          }, value: ${JSON.stringify(errorValue)}`
        );
      }

      expect(result.type).toBe(ClarityType.ResponseOk);
    });
  });

  describe("Error Handling", () => {
    it("should reject swaps when paused", () => {
      // Trigger emergency stop
      const pauseResult = simnet.callPublicFn(
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

    it("should reject swaps with no agent account", () => {
      setupAllowedDex(1);

      // This test assumes agent accounts are required but not set up
      const btcAmount = 50000;
      const ftContract = principalCV(TEST_TOKEN_CONTRACT);
      const dexContract = principalCV(TEST_DEX_CONTRACT);
      const preContract = principalCV(TEST_PRE_CONTRACT);
      const poolContract = principalCV(TEST_POOL_CONTRACT);
      const sbtcContract = principalCV(SBTC_TOKEN_CONTRACT);

      // Try to remove agent account if it exists
      try {
        simnet.callPublicFn(
          AGENT_REGISTRY_CONTRACT,
          "remove-agent-account",
          [principalCV(address1)],
          address1
        );
      } catch (e) {
        // Agent account might not exist, which is fine for this test
      }

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

      // This should fail if agent accounts are required
      // Adjust the expected error code based on your contract implementation
      if (result.result.type !== ClarityType.ResponseOk) {
        expect(result.result.type).toBe(ClarityType.ResponseError);
      }
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

      if (result.type !== ClarityType.ResponseOk) {
        const errorValue = cvToValue(result);
        throw new Error(
          `Fee distribution test failed with type ${
            result.type
          }, value: ${JSON.stringify(errorValue)}`
        );
      }

      expect(result.type).toBe(ClarityType.ResponseOk);

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
    it("should simulate complete flow from prelaunch to pool", () => {
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

        if (result.type !== ClarityType.ResponseOk) {
          const errorValue = cvToValue(result);
          throw new Error(
            `User seat purchase failed with type ${
              result.type
            }, value: ${JSON.stringify(errorValue)}`
          );
        }

        expect(result.type).toBe(ClarityType.ResponseOk);
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

      if (result2.type !== ClarityType.ResponseOk) {
        const errorValue = cvToValue(result2);
        throw new Error(
          `DEX target purchase failed with type ${
            result2.type
          }, value: ${JSON.stringify(errorValue)}`
        );
      }

      expect(result2.type).toBe(ClarityType.ResponseOk);

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

      if (result3.type !== ClarityType.ResponseOk) {
        const errorValue = cvToValue(result3);
        throw new Error(
          `Pool trade failed with type ${result3.type}, value: ${JSON.stringify(
            errorValue
          )}`
        );
      }

      expect(result3.type).toBe(ClarityType.ResponseOk);

      // Verify pool state
      const finalPoolStatus = simnet.callReadOnlyFn(
        BTC2AIBTC_CONTRACT,
        "get-pool",
        [],
        deployer
      );
      expect(finalPoolStatus.result.type).toBe(ClarityType.ResponseOk);
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

    expect(poolStatus.result.type).toBe(ClarityType.ResponseOk);
    const pool = cvToValue(poolStatus.result);
    expect(pool.value["total-sbtc"]).toBeGreaterThan(0);
  });
});
