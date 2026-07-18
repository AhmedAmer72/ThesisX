#!/usr/bin/env node
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const keyName = process.argv[2] ?? "thesisx-api-01";
const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);
const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;

console.log("SoDEX API key pair generated\n");
console.log("SODEX_API_KEY_NAME=", keyName);
console.log("SODEX_API_PRIVATE_KEY=", privateKey);
console.log("Public address (register on SoDEX):", account.address);
console.log("\naddAPIKey payload (master wallet signs this):");
console.log(
  JSON.stringify(
    {
      name: keyName,
      type: "EVM",
      publicKey: account.address,
      expiresAt,
    },
    null,
    2
  )
);
console.log("\nNext steps:");
console.log("1. Register via SoDEX addAPIKey with your master wallet");
console.log("2. GET testnet .../accounts/<wallet>/state for aid");
console.log("3. Set env vars in Vercel");
console.log("Docs: https://sodex.com/documentation/api/api");
