import { SimulationBuilder } from "stxer";
import {
  contractPrincipalCV,
  uintCV,
  principalCV,
  bufferCV,
  noneCV,
} from "@stacks/transactions";
import * as fs from "fs";

async function simulateFullBridgeDeployment() {
  // Use a mainnet address that actually has STX balance
  const DEPLOYER = "SP000000000000000000002Q6VF78"; // Genesis/system address
  const OPERATOR = "STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2";
  const FUNDED_WALLET = "ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H";

  // Test addresses
  const AGENT_OWNER_1 = "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5";
  const DEX_BUYER = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";
  const POOL_BUYER = "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC";

  // Contract references from your requirements (already deployed on mainnet)
  const SBTC_TOKEN = "STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2.sbtc-token";
  const TEST_TOKEN = "ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.lemar1-faktory";
  const TEST_DEX =
    "ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.lemar1-faktory-dex";
  const TEST_PRE =
    "ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.lemar1-pre-faktory";
  const TEST_POOL =
    "ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.xyk-pool-sbtc-lemar1-v-1-1";

  const simulation = SimulationBuilder.new()
    .withSender(DEPLOYER)

    // 1. Deploy agent registry first
    .addContractDeploy({
      contract_name: "agent-account-registry",
      source_code: fs.readFileSync(
        "contracts/btc2aibtc/btc2aibtc-prelaunch/agent-account-registry.clar",
        "utf8"
      ),
      sender: DEPLOYER,
    })

    // 2. Deploy an-agent template
    .addContractDeploy({
      contract_name: "an-agent",
      source_code: fs.readFileSync(
        "contracts/btc2aibtc/btc2aibtc-prelaunch/an-agent.clar",
        "utf8"
      ),
      sender: DEPLOYER,
    })

    // 3. Deploy additional agent instances
    .addContractDeploy({
      contract_name: "an-agent-2",
      source_code: fs.readFileSync("contracts/an-agent-2.clar", "utf8"),
      sender: DEPLOYER,
    })

    .addContractDeploy({
      contract_name: "an-agent-3",
      source_code: fs.readFileSync("contracts/an-agent-3.clar", "utf8"),
      sender: DEPLOYER,
    })

    // 4. Deploy the main bridge contract
    .addContractDeploy({
      contract_name: "btc2aibtc-simul",
      source_code: fs.readFileSync(
        "contracts/btc2aibtc/btc2aibtc-prelaunch/btc2sbtc-simul-testnet.clar",
        "utf8"
      ),
      sender: DEPLOYER,
    })

    // 5. Fund the bridge with sBTC (transfer from funded wallet to operator)
    .addContractCall({
      contract_id: SBTC_TOKEN,
      function_name: "transfer",
      function_args: [
        uintCV(690000000), // 690M sats
        principalCV(FUNDED_WALLET),
        principalCV(OPERATOR),
        noneCV(),
      ],
      sender: FUNDED_WALLET,
    })

    // 6. Initialize the bridge pool
    .addContractCall({
      contract_id: `${DEPLOYER}.btc2aibtc-simul`,
      function_name: "initialize-pool",
      function_args: [
        uintCV(690000000),
        bufferCV(Buffer.alloc(40)), // Empty buffer for BTC receiver
      ],
      sender: OPERATOR,
    })

    // 7. Setup allowed DEX
    .addContractCall({
      contract_id: `${DEPLOYER}.btc2aibtc-simul`,
      function_name: "propose-allowlist-dexes",
      function_args: [
        principalCV(TEST_TOKEN),
        principalCV(TEST_PRE),
        principalCV(TEST_DEX),
        principalCV(TEST_POOL),
      ],
      sender: OPERATOR,
    })

    // 8. Signal approval for DEX (need second approver)
    .addContractCall({
      contract_id: `${DEPLOYER}.btc2aibtc-simul`,
      function_name: "signal-allowlist-approval",
      function_args: [uintCV(1)], // proposal ID
      sender: "ST1G655MB1JVQ5FBE2JJ3E01HEA6KBM4H394VWAD6", // Second approver
    })

    // 9. TEST: Small pool buy (should fallback to bridge - 4 events)
    .addContractCall({
      contract_id: `${DEPLOYER}.btc2aibtc-simul`,
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

    // 10. TEST: Large DEX buy (should route through DEX - 12 events)
    .addContractCall({
      contract_id: `${DEPLOYER}.btc2aibtc-simul`,
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

    // 11. Check bridge balance after transactions
    .addContractCall({
      contract_id: SBTC_TOKEN,
      function_name: "get-balance",
      function_args: [principalCV(`${DEPLOYER}.btc2aibtc-simul`)],
      sender: POOL_BUYER,
    })

    // 12. Check DEX contract balance
    .addContractCall({
      contract_id: SBTC_TOKEN,
      function_name: "get-balance",
      function_args: [principalCV(TEST_DEX)],
      sender: POOL_BUYER,
    })

    // 13. Check market status
    .addContractCall({
      contract_id: TEST_PRE,
      function_name: "is-market-open",
      function_args: [],
      sender: POOL_BUYER,
    });

  try {
    const simulationId = await simulation.run();
    console.log(
      `🚀 Full Bridge Deployment: https://stxer.xyz/simulations/mainnet/${simulationId}`
    );
    return simulationId;
  } catch (error) {
    console.error("Simulation failed:", error);
    throw error;
  }
}

// Run the simulation
simulateFullBridgeDeployment().catch(console.error);
