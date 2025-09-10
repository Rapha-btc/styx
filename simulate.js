// 8 Individual addresses (will buy directly from pre-launch)
const INDIVIDUAL_BUYERS = [
  "SM2SE3ZT7D2T1B9VVMRBA7RBRJYPB1ZP6DEW3YHVR",
  "SP24MM95FEZJY3XWSBGZ5CT8DV04J6NVM5QA4WDXZ",
  "SP2QGMXH21KFDX99PWNB7Z7WNQ92TWFAECEEK10GE",
  "SPE2NS75PVGFTZXA76ZBHGVGPADW4PK2NYHVRZVB",
  "SP3RKM375AZAJR4WYCCEVMDB4DZEZMFF06C0XHB5P",
  "SP2P5A2F3VN7G7CSF3W68AHYZ6ZM6BJSZV69MG03J",
  "SP4Q7BMWF4B5M3C43QCXH4HWPS1550TD63FJ2QSF",
  "SPQRZQWAZ78SE0Y9R571AGTK9V4GT9CWAFAQRNDK",
];
import { SimulationBuilder } from "stxer";
import {
  contractPrincipalCV,
  uintCV,
  principalCV,
  bufferCV,
  noneCV,
  ClarityVersion,
} from "@stacks/transactions";
import * as fs from "fs";

async function simulatePrelaunchCompletionAndDexTesting() {
  // Existing deployed contracts on mainnet
  const BRIDGE_CONTRACT =
    "SP29D6YMDNAKN1P045T6Z817RTE1AC0JAA99WAX2B.btc2sbtc-simul";
  const AGENT_REGISTRY =
    "SP29D6YMDNAKN1P045T6Z817RTE1AC0JAA99WAX2B.agent-account-registry";

  // Key addresses
  const OPERATOR = "SP12HZDARME0G89TYPA6Q5KPP5N7W04F65VPXS988"; // Bridge operator
  const APPROVER1 = "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22"; // Bridge approver 1
  const APPROVER2 = "SP2BK886SQQPSQHJGJ8T1B3NQXG9V9F5EDTR7F7X4"; // Bridge approver 2

  // Test contracts (already deployed on mainnet)
  const SBTC_TOKEN = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token";
  const TEST_TOKEN = "SP2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5E4R0JRM.fake2-faktory";
  const TEST_DEX =
    "SP2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5E4R0JRM.fake2-faktory-dex";
  const TEST_PRE =
    "SP2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5E4R0JRM.fake2-pre-faktory";
  const TEST_POOL =
    "SP2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5E4R0JRM.xyk-pool-sbtc-fake2-v-1-1";

  // 2 Registered agent owners (can use bridge)
  const AGENT_OWNER_1 = "SP213FCK4QPHW1PMRXCVWYJX2KXW79WF6847XZVBZ";
  const AGENT_OWNER_2 = "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22";

  // 8 Individual addresses (will buy directly from pre-launch)
  const INDIVIDUAL_BUYERS = [
    "SP24MM95FEZJY3XWSBGZ5CT8DV04J6NVM5QA4WDXZ",
    "SP2QGMXH21KFDX99PWNB7Z7WNQ92TWFAECEEK10GE",
    "SPE2NS75PVGFTZXA76ZBHGVGPADW4PK2NYHVRZVB",
    "SP3RKM375AZAJR4WYCCEVMDB4DZEZMFF06C0XHB5P",
    "SP2P5A2F3VN7G7CSF3W68AHYZ6ZM6BJSZV69MG03J",
    "SP4Q7BMWF4B5M3C43QCXH4HWPS1550TD63FJ2QSF",
    "SPQRZQWAZ78SE0Y9R571AGTK9V4GT9CWAFAQRNDK",
    "SP3EAB6NKWV1QQ449W9N2CPQEPZVPS13N6VAWKP6T",
  ];

  // Well-funded user for initial sBTC distribution
  const FUNDED_USER = "SP24MM95FEZJY3XWSBGZ5CT8DV04J6NVM5QA4WDXZ"; // user3 with 302.49 BTC

  const simulation = SimulationBuilder.new()
    .withSender(OPERATOR)

    // ===== INITIAL FUNDING - Transfer sBTC to registered owners =====

    // 1. Fund Agent Owner 1 with sBTC for large purchases (6M sats)
    .addContractCall({
      contract_id: SBTC_TOKEN,
      function_name: "transfer",
      function_args: [
        uintCV(6000000), // 6M sats
        principalCV(FUNDED_USER),
        principalCV(AGENT_OWNER_1),
        noneCV(),
      ],
      sender: FUNDED_USER,
    })

    // 2. Fund Agent Owner 2 with sBTC for purchases (1M sats)
    .addContractCall({
      contract_id: SBTC_TOKEN,
      function_name: "transfer",
      function_args: [
        uintCV(1000000), // 1M sats
        principalCV(FUNDED_USER),
        principalCV(AGENT_OWNER_2),
        noneCV(),
      ],
      sender: FUNDED_USER,
    })

    // 3. Setup allowed DEX
    .addContractCall({
      contract_id: BRIDGE_CONTRACT,
      function_name: "propose-allowlist-dexes",
      function_args: [
        principalCV(TEST_TOKEN),
        principalCV(TEST_PRE),
        principalCV(TEST_DEX),
        principalCV(TEST_POOL),
      ],
      sender: APPROVER1,
    })

    // Signal approval for DEX allowlisting
    .addContractCall({
      contract_id: BRIDGE_CONTRACT,
      function_name: "signal-allowlist-approval",
      function_args: [uintCV(1)], // proposal ID
      sender: APPROVER2,
    })

    // ===== PHASE 1: PRELAUNCH COMPLETION (20 seats total) =====

    // Agent Owner 1 buys 2 seats via bridge (50k sats)
    .addContractCall({
      contract_id: BRIDGE_CONTRACT,
      function_name: "swap-btc-to-aibtc",
      function_args: [
        uintCV(50000), // 50k sats for 2 seats
        uintCV(0), // min-amount-out
        uintCV(1), // dex-id
        principalCV(TEST_TOKEN),
        principalCV(TEST_DEX),
        principalCV(TEST_PRE),
        principalCV(TEST_POOL),
        principalCV(SBTC_TOKEN),
      ],
      sender: AGENT_OWNER_1,
    })

    // Agent Owner 2 buys 2 seats via bridge (50k sats)
    .addContractCall({
      contract_id: BRIDGE_CONTRACT,
      function_name: "swap-btc-to-aibtc",
      function_args: [
        uintCV(50000), // 50k sats for 2 seats
        uintCV(0), // min-amount-out
        uintCV(1), // dex-id
        principalCV(TEST_TOKEN),
        principalCV(TEST_DEX),
        principalCV(TEST_PRE),
        principalCV(TEST_POOL),
        principalCV(SBTC_TOKEN),
      ],
      sender: AGENT_OWNER_2,
    })

    // Individual buyers purchase 2 seats each directly from prelaunch
    .addContractCall({
      contract_id: TEST_PRE,
      function_name: "buy-up-to",
      function_args: [uintCV(2)], // 2 seats
      sender: INDIVIDUAL_BUYERS[0],
    })
    .addContractCall({
      contract_id: TEST_PRE,
      function_name: "buy-up-to",
      function_args: [uintCV(2)], // 2 seats
      sender: INDIVIDUAL_BUYERS[1],
    })
    .addContractCall({
      contract_id: TEST_PRE,
      function_name: "buy-up-to",
      function_args: [uintCV(2)], // 2 seats
      sender: INDIVIDUAL_BUYERS[2],
    })
    .addContractCall({
      contract_id: TEST_PRE,
      function_name: "buy-up-to",
      function_args: [uintCV(2)], // 2 seats
      sender: INDIVIDUAL_BUYERS[3],
    })
    .addContractCall({
      contract_id: TEST_PRE,
      function_name: "buy-up-to",
      function_args: [uintCV(2)], // 2 seats
      sender: INDIVIDUAL_BUYERS[4],
    })
    .addContractCall({
      contract_id: TEST_PRE,
      function_name: "buy-up-to",
      function_args: [uintCV(2)], // 2 seats
      sender: INDIVIDUAL_BUYERS[5],
    })
    .addContractCall({
      contract_id: TEST_PRE,
      function_name: "buy-up-to",
      function_args: [uintCV(2)], // 2 seats
      sender: INDIVIDUAL_BUYERS[6],
    })
    .addContractCall({
      contract_id: TEST_PRE,
      function_name: "buy-up-to",
      function_args: [uintCV(2)], // 2 seats
      sender: INDIVIDUAL_BUYERS[7],
    })

    // Check if market is now open (should be true after 20 seats)
    .addContractCall({
      contract_id: TEST_PRE,
      function_name: "is-market-open",
      function_args: [],
      sender: AGENT_OWNER_1,
    })

    // ===== PHASE 2: DEX COMPLETION (5M sats target + fees) =====

    // Large DEX buy to reach 5M target (5.1M sats + 2% fees ≈ 5.2M)
    .addContractCall({
      contract_id: BRIDGE_CONTRACT,
      function_name: "swap-btc-to-aibtc",
      function_args: [
        uintCV(5200000), // 5.2M sats (5M + fees)
        uintCV(0), // min-amount-out
        uintCV(1), // dex-id
        principalCV(TEST_TOKEN),
        principalCV(TEST_DEX),
        principalCV(TEST_PRE),
        principalCV(TEST_POOL),
        principalCV(SBTC_TOKEN),
      ],
      sender: AGENT_OWNER_1, // Use registered agent owner
    })

    // ===== PHASE 3: POOL BUY TEST =====

    // Smaller buy that should fallback to bridge pool
    .addContractCall({
      contract_id: BRIDGE_CONTRACT,
      function_name: "swap-btc-to-aibtc",
      function_args: [
        uintCV(300000), // 300k sats - should use pool
        uintCV(0), // min-amount-out
        uintCV(1), // dex-id
        principalCV(TEST_TOKEN),
        principalCV(TEST_DEX),
        principalCV(TEST_PRE),
        principalCV(TEST_POOL),
        principalCV(SBTC_TOKEN),
      ],
      sender: AGENT_OWNER_2, // Use other registered agent owner
    })

    // ===== VERIFICATION CALLS =====

    // Check final market status
    .addContractCall({
      contract_id: TEST_PRE,
      function_name: "is-market-open",
      function_args: [],
      sender: AGENT_OWNER_1,
    })

    // Check bridge pool balance after all transactions
    .addContractCall({
      contract_id: SBTC_TOKEN,
      function_name: "get-balance",
      function_args: [principalCV(BRIDGE_CONTRACT)],
      sender: AGENT_OWNER_1,
    })

    // Check DEX contract balance
    .addContractCall({
      contract_id: SBTC_TOKEN,
      function_name: "get-balance",
      function_args: [principalCV(TEST_DEX)],
      sender: AGENT_OWNER_1,
    })

    // Check XYK Pool balance
    .addContractCall({
      contract_id: SBTC_TOKEN,
      function_name: "get-balance",
      function_args: [principalCV(TEST_POOL)],
      sender: AGENT_OWNER_1,
    })

    // Check remaining balances of funded owners
    .addContractCall({
      contract_id: SBTC_TOKEN,
      function_name: "get-balance",
      function_args: [principalCV(AGENT_OWNER_1)],
      sender: AGENT_OWNER_1,
    })
    .addContractCall({
      contract_id: SBTC_TOKEN,
      function_name: "get-balance",
      function_args: [principalCV(AGENT_OWNER_2)],
      sender: AGENT_OWNER_2,
    });

  try {
    const simulationId = await simulation.run();
    console.log(`
===== BRIDGE PRELAUNCH COMPLETION & DEX TESTING SIMULATION =====
Simulation URL: https://stxer.xyz/simulations/mainnet/${simulationId}

Expected Results:
- Phase 1: 20 seats purchased (2 via bridge + 8 via prelaunch)
- Phase 2: Market opens, large DEX buy processes via DEX routing  
- Phase 3: Small buy falls back to bridge pool
- Verification: Final balances show proper routing

This tests the complete bridge functionality with real mainnet contracts.
    `);
    return simulationId;
  } catch (error) {
    console.error("Simulation failed:", error);
    throw error;
  }
}

// Run the simulation
simulatePrelaunchCompletionAndDexTesting().catch(console.error);
