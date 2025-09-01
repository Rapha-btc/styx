import { SimulationBuilder } from "stxer";
import { contractPrincipalCV, uintCV } from "@stacks/transactions";

async function simulateBBuy() {
  const DEPLOYER = "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22";
  const BUYER = "SP24MM95FEZJY3XWSBGZ5CT8DV04J6NVM5QA4WDXZ";

  const simulation = SimulationBuilder.new()
    .withSender(BUYER)

    // Buy to trigger B token graduation (need ~3.1M sats to reach 21M target)
    .addContractCall({
      contract_id: `${DEPLOYER}.b-faktory-dex`,
      function_name: "buy",
      function_args: [
        contractPrincipalCV(DEPLOYER, "b-faktory"),
        uintCV(3500000), // 3.5M sats - smaller amount to avoid slippage limit
      ],
      sender: BUYER,
    })

    // Buy on Charisma pool after graduation
    .addContractCall({
      contract_id: `${DEPLOYER}.b-faktory-pool`,
      function_name: "swap-a-to-b",
      function_args: [
        uintCV(1000000), // 1M sats to swap for B tokens
        uintCV(1), // min tokens out
      ],
      sender: BUYER,
    });

  const simulationId = await simulation.run();
  console.log(`https://stxer.xyz/simulations/mainnet/${simulationId}`);
}

simulateBBuy().catch(console.error);
