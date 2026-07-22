import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const { recomputeAllActiveUsers } = await import(
    "../src/lib/scoring/recompute"
  );
  const count = await recomputeAllActiveUsers();
  console.log(`✓ recomputed ${count} active forecaster${count === 1 ? "" : "s"}`);
}

main().catch((error) => {
  console.error("✗ score recompute failed");
  console.error(error);
  process.exit(1);
});
