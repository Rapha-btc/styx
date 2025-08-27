import fs from "node:fs";
import { ClarityVersion } from "@stacks/transactions";
import { SimulationBuilder } from "stxer";

// Define mainnet addresses
const DEPLOYER = "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22";

SimulationBuilder.new()
  .withSender(DEPLOYER)

  // Deploy the btc2aibtc contract
  .addContractDeploy({
    contract_name: "btc2aibtc",
    source_code: fs.readFileSync(
      "./contracts/btc2aibtc/btc2aibtc.clar",
      "utf8"
    ),
    clarity_version: ClarityVersion.Clarity3,
  })

  .run()
  .catch(console.error);
