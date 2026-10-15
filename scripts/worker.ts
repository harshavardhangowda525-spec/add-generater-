/**
 * Background worker: keeps running searches moving even when no browser tab is
 * open. Run alongside the web app on any always-on host:  npm run worker
 */
import "dotenv/config";

async function main() {
  const { runJobStep, runnableJobIds } = await import("../src/lib/jobs");
  console.log("Infinity Lead Finder worker started.");
  let stopping = false;
  process.on("SIGINT", () => (stopping = true));
  process.on("SIGTERM", () => (stopping = true));
  while (!stopping) {
    const ids = await runnableJobIds().catch((e) => {
      console.error("worker: db error", e);
      return [] as string[];
    });
    for (const id of ids) {
      const job = await runJobStep(id).catch((e) => console.error(`worker: job ${id} failed`, e));
      if (job) console.log(`job ${id}: ${job.status} ${job.foundCount}/${job.target}`);
    }
    if (ids.length === 0) await new Promise((r) => setTimeout(r, 3000));
  }
  process.exit(0);
}

main();
