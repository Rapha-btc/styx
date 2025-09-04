// https://stxer.xyz/simulations/mainnet/dc43ad164e472253ae8d77d611347b5e

import { SimulationBuilder } from "stxer";
import { contractPrincipalCV, uintCV } from "@stacks/transactions";

async function simulateFakeBuy() {
  const DEPLOYER = "SP2Z94F6QX847PMXTPJJ2ZCCN79JZDW3PJ4E6ZABY";
  const BUYER = "SP24MM95FEZJY3XWSBGZ5CT8DV04J6NVM5QA4WDXZ";

  const simulation = SimulationBuilder.new()
    .withSender(BUYER)

    // Buy to trigger graduation
    .addContractCall({
      contract_id: `${DEPLOYER}.fake-faktory-dex`,
      function_name: "buy",
      function_args: [
        contractPrincipalCV(DEPLOYER, "fake-faktory"),
        uintCV(5000000), // 5M sats - should definitely trigger graduation
      ],
      sender: BUYER,
    })

    // Buy on Bitflow XYK pool after graduation
    .addContractCall({
      contract_id: "SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.xyk-core-v-1-2",
      function_name: "swap-x-for-y",
      function_args: [
        contractPrincipalCV(DEPLOYER, "xyk-pool-sbtc-fake-v-1-1"),
        contractPrincipalCV(
          "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4",
          "sbtc-token"
        ),
        contractPrincipalCV(DEPLOYER, "fake-faktory"),
        uintCV(1000000), // 1M sats to swap for FAKE
        uintCV(1), // min tokens out
      ],
      sender: BUYER,
    });

  const simulationId = await simulation.run();
  console.log(`https://stxer.xyz/simulations/mainnet/${simulationId}`);
}

simulateFakeBuy().catch(console.error);
