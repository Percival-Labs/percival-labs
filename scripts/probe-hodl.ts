/**
 * probe-hodl.ts - Test whether Alby Hub NWC backend supports HODL invoices
 *
 * Usage: bun run scripts/probe-hodl.ts
 * Requires: NWC_URL environment variable
 */

import { randomBytes, createHash } from "crypto";

async function main() {
  const NWC_URL = process.env.NWC_URL;
  if (!NWC_URL) {
    console.error("ERROR: NWC_URL environment variable is not set.");
    console.error("Export your Alby Hub NWC connection string and retry.");
    process.exit(1);
  }

  const { nwc } = await import("@getalby/sdk");
  const client = new nwc.NWCClient({ nostrWalletConnectUrl: NWC_URL });

  // Generate a random preimage and derive the payment hash (SHA-256)
  const preimage = randomBytes(32);
  const paymentHash = createHash("sha256").update(preimage).digest("hex");

  const amountMsats = 1_000; // 1 sat = 1000 msats

  console.log("Probing HODL invoice support on Alby Hub NWC backend...");
  console.log(`  payment_hash: ${paymentHash}`);
  console.log(`  amount: ${amountMsats} msats (1 sat)\n`);

  let invoiceCreated = false;

  try {
    const response = await (client as any).makeHoldInvoice({
      amount: amountMsats,
      payment_hash: paymentHash,
      description: "HODL probe - safe to ignore",
    });

    invoiceCreated = true;
    console.log("HODL SUPPORTED (Path A)");
    console.log(`  invoice: ${response.invoice?.slice(0, 40)}...`);

    // Clean up: cancel the hold invoice so it does not linger
    try {
      await (client as any).cancelHoldInvoice({ payment_hash: paymentHash });
      console.log("  cleanup: hold invoice cancelled");
    } catch (cancelErr: any) {
      console.warn(`  cleanup warning: could not cancel hold invoice - ${cancelErr.message}`);
    }
  } catch (err: any) {
    console.log("HODL NOT SUPPORTED (Path B)");
    console.log(`  reason: ${err.message || err}`);
  } finally {
    client.close();
    console.log("\nNWC client closed.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
