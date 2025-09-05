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
    "SP29D6YMDNAKN1P045T6Z817RTE1AC0JAA99WAX2B.btc2sbtc-simul"; // "SP12HZDARME0G89TYPA6Q5KPP5N7W04F65VPXS988.btc2aibtc";
  const AGENT_REGISTRY =
    "SP29D6YMDNAKN1P045T6Z817RTE1AC0JAA99WAX2B.agent-account-registry";

  // Agent deployer (needs to deploy new agent contracts)
  const AGENT_DEPLOYER = "SP2Z94F6QX847PMXTPJJ2ZCCN79JZDW3PJ4E6ZABY";

  // Other addresses
  const OPERATOR = "SP12HZDARME0G89TYPA6Q5KPP5N7W04F65VPXS988"; // OPERATOR STYX of the bridge

  const APPROVER1 = "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22"; // APPROVER 1 of the bridge for indexing

  // Test addresses
  const POOL_BUYER = "SP2P5A2F3VN7G7CSF3W68AHYZ6ZM6BJSZV69MG03J";
  const DEX_BUYER = "SPE2NS75PVGFTZXA76ZBHGVGPADW4PK2NYHVRZVB";

  // Contract references (already deployed on mainnet)
  const SBTC_TOKEN = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token";
  const TEST_TOKEN = "SP2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5E4R0JRM.fake2-faktory";
  const TEST_DEX =
    "SP2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5E4R0JRM.fake2-faktory-dex";
  const TEST_PRE =
    "SP2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5E4R0JRM.fake2-pre-faktory";
  const TEST_POOL =
    "SP2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5E4R0JRM.xyk-pool-sbtc-fake2-v-1-1";

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
      sender: APPROVER1,
    })

    // 3. Signal approval for DEX (need second approver)
    .addContractCall({
      contract_id: BRIDGE_CONTRACT,
      function_name: "signal-allowlist-approval",
      function_args: [uintCV(1)], // proposal ID
      sender: "SP2BK886SQQPSQHJGJ8T1B3NQXG9V9F5EDTR7F7X4", // Second approver
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

    // we need to complete the prelaunch contract first with 10 owners who have 10 registered agents

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
