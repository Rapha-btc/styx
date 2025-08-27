import fs from "node:fs";
import { ClarityVersion } from "@stacks/transactions";
import { SimulationBuilder } from "stxer";

// Define testnet deployer address
const DEPLOYER = "STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2";

SimulationBuilder.new()
  .withSender(DEPLOYER)

  // Deploy the btc2sbtc-simul-testnet contract
  .addContractDeploy({
    contract_name: "btc2sbtc-simul-testnet",
    source_code: fs.readFileSync(
      "./contracts/btc2aibtc/btc2sbtc-simul-testnet.clar",
      "utf8"
    ),
    clarity_version: ClarityVersion.Clarity3,
  })

  .run()
  .catch(console.error);
