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

async function simulateFullBridgeDeployment() {
  // Use existing deployed contracts
  const BRIDGE_CONTRACT =
    "STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2.btc2aibtc-sim";
  const AGENT_REGISTRY =
    "ST29D6YMDNAKN1P045T6Z817RTE1AC0JAAAG2EQZZ.agent-account-registry";

  // Agent deployer (needs to deploy new agent contracts)
  const AGENT_DEPLOYER = "ST1Q9YZ2NY4KVBB08E005HAK3FSM8S3RX2WARP9Q1";

  // Other addresses
  const OPERATOR = "STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2";
  const FUNDED_WALLET = "ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H";

  // Test addresses
  const POOL_BUYER = "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC";
  const DEX_BUYER = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";

  // Contract references (already deployed on mainnet)
  const SBTC_TOKEN = "STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2.sbtc-token";
  const TEST_TOKEN = "ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.lemar1-faktory";
  const TEST_DEX =
    "ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.lemar1-faktory-dex";
  const TEST_PRE =
    "ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.lemar1-pre-faktory";
  const TEST_POOL =
    "ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.xyk-pool-sbtc-lemar1-v-1-1";

  const simulation = SimulationBuilder.new()
    .withSender(AGENT_DEPLOYER)

    // 1. Deploy new agent contracts from the correct deployer
    .addContractDeploy({
      contract_name: "an-agent-11",
      source_code: fs.readFileSync("contracts/an-agent-11.clar", "utf8"), // Reuse existing agent code
      sender: AGENT_DEPLOYER,
      clarity_version: ClarityVersion.Clarity3,
    })

    .addContractDeploy({
      contract_name: "an-agent-12",
      source_code: fs.readFileSync("contracts/an-agent-12.clar", "utf8"),
      sender: AGENT_DEPLOYER,
      clarity_version: ClarityVersion.Clarity3,
    })

    .addContractDeploy({
      contract_name: "an-agent-13",
      source_code: fs.readFileSync("contracts/an-agent-13.clar", "utf8"),
      sender: AGENT_DEPLOYER,
      clarity_version: ClarityVersion.Clarity3,
    })

    // 2. Setup allowed DEX (using existing bridge contract)
    .addContractCall({
      contract_id: BRIDGE_CONTRACT,
      function_name: "propose-allowlist-dexes",
      function_args: [
        principalCV(TEST_TOKEN),
        principalCV(TEST_PRE),
        principalCV(TEST_DEX),
        principalCV(TEST_POOL),
      ],
      sender: OPERATOR,
    })

    // 3. Signal approval for DEX (need second approver)
    .addContractCall({
      contract_id: BRIDGE_CONTRACT,
      function_name: "signal-allowlist-approval",
      function_args: [uintCV(1)], // proposal ID
      sender: "ST1G655MB1JVQ5FBE2JJ3E01HEA6KBM4H394VWAD6", // Second approver
    })

    // 4. TEST: Small pool buy (should fallback to bridge - 4 events)
    .addContractCall({
      contract_id: BRIDGE_CONTRACT,
      function_name: "swap-btc-to-aibtc",
      function_args: [
        uintCV(200000), // 200k sats
        uintCV(0), // min-amount-out
        uintCV(1), // dex-id
        principalCV(TEST_TOKEN),
        principalCV(TEST_DEX),
        principalCV(TEST_PRE),
        principalCV(TEST_POOL),
        principalCV(SBTC_TOKEN),
      ],
      sender: POOL_BUYER,
    })

    // 5. TEST: Large DEX buy (should route through DEX - 12 events)
    .addContractCall({
      contract_id: BRIDGE_CONTRACT,
      function_name: "swap-btc-to-aibtc",
      function_args: [
        uintCV(4796000), // 4.796M sats (just under graduation threshold)
        uintCV(0),
        uintCV(1),
        principalCV(TEST_TOKEN),
        principalCV(TEST_DEX),
        principalCV(TEST_PRE),
        principalCV(TEST_POOL),
        principalCV(SBTC_TOKEN),
      ],
      sender: DEX_BUYER,
    })

    // 6. Check bridge balance after transactions
    .addContractCall({
      contract_id: SBTC_TOKEN,
      function_name: "get-balance",
      function_args: [principalCV(BRIDGE_CONTRACT)],
      sender: POOL_BUYER,
    })

    // 7. Check DEX contract balance
    .addContractCall({
      contract_id: SBTC_TOKEN,
      function_name: "get-balance",
      function_args: [principalCV(TEST_DEX)],
      sender: POOL_BUYER,
    })

    // 8. Check market status
    .addContractCall({
      contract_id: TEST_PRE,
      function_name: "is-market-open",
      function_args: [],
      sender: POOL_BUYER,
    });

  try {
    const simulationId = await simulation.run();
    console.log(
      `Bridge Test with Deployed Contracts: https://stxer.xyz/simulations/mainnet/${simulationId}`
    );
    return simulationId;
  } catch (error) {
    console.error("Simulation failed:", error);
    throw error;
  }
}

// Run the simulation
simulateFullBridgeDeployment().catch(console.error);
