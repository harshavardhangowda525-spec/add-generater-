/**
 * End-to-end acceptance run: real Next.js production server + real Postgres +
 * headless Chromium. Provider HTTP endpoints point at a local TEST-ONLY mock
 * that speaks the Overpass/Nominatim protocol (this sandbox cannot reach them).
 *
 *   npm run build && npm run test:e2e
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium, type Page } from "playwright-core";
import postgres from "postgres";
import { BENGALURU, osmTileElements } from "../helpers";

const DB = process.env.TEST_DATABASE_URL ?? "postgres://ilf:ilf@localhost:5432/ilf_test";
const PORT = 3123;
const MOCK_PORT = 4010;
const BASE = `http://localhost:${PORT}`;
const OUT = path.resolve("test-results");
const FAKE_KEY = "TEST-SECRET-GEOAPIFY-KEY-should-never-reach-browser";
const results: [string, boolean, string][] = [];

function check(name: string, ok: boolean, detail = "") {
  results.push([name, ok, detail]);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function startMock() {
  const tiles = new Map<string, number>();
  let overpassMode: "ok" | "429" = "ok";
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      if (req.url?.startsWith("/search")) {
        res.end(JSON.stringify([{ boundingbox: [BENGALURU.south, BENGALURU.north, BENGALURU.west, BENGALURU.east].map(String), display_name: "Bengaluru" }]));
      } else if (req.url?.startsWith("/api/interpreter")) {
        if (overpassMode === "429") {
          res.statusCode = 429;
          res.end("rate_limited");
          return;
        }
        const bbox = decodeURIComponent(body.replace(/\+/g, " ")).match(/\(([\d.,-]+)\);/)?.[1] ?? "";
        if (!tiles.has(bbox)) tiles.set(bbox, tiles.size);
        res.end(JSON.stringify({ elements: osmTileElements(tiles.get(bbox)!) }));
      } else {
        res.statusCode = 404;
        res.end("{}");
      }
    });
  });
  server.listen(MOCK_PORT);
  return { server, setMode: (m: "ok" | "429") => (overpassMode = m) };
}

async function startApp(): Promise<ChildProcess> {
  const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
    env: {
      ...process.env,
      DATABASE_URL: DB,
      OSM_ENABLED: "true",
      OVERPASS_URL: `http://localhost:${MOCK_PORT}/api/interpreter`,
      NOMINATIM_URL: `http://localhost:${MOCK_PORT}`,
      // A configured-but-unreachable provider key, to prove keys stay server-side.
      // Its requests fail, which the job must report honestly, then continue with OSM.
      GEOAPIFY_API_KEY: FAKE_KEY,
      HTTP_DELAY_SCALE: "0.01",
      SEARCH_GRID_SIZE: "4",
      INSECURE_COOKIES: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  app.stderr?.on("data", (d) => process.env.E2E_VERBOSE && process.stderr.write(d));
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`${BASE}/login`);
      return app;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("app did not start");
}

/** Wait until the n-th search job has finished in the DB, then for the UI to show it. */
async function waitForJob(page: Page, sql: postgres.Sql, n: number, statuses: RegExp, timeout = 120000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    // One statement → one snapshot; two queries could pair job n-1's status with count n.
    const [latest] = await sql`select count(*)::int c, (array_agg(status order by created_at desc))[1] s from search_jobs`;
    if (latest.c === n && latest.s !== "running") break;
    await new Promise((r) => setTimeout(r, 500));
  }
  await page.locator("[aria-live=polite]").getByText(statuses).first().waitFor({ timeout: 15000 });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const sql = postgres(DB, { max: 1, onnotice: () => {} });
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  await sql`truncate users, sessions, search_jobs, leads, lead_sources cascade`;

  const mock = startMock();
  const app = await startApp();
  // Geoapify isn't reachable in this sandbox; route it to the mock's 404 → honest error.
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });

  try {
    const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    // ── Sign up ────────────────────────────────────────────────
    await page.goto(BASE);
    check("unauthenticated users are sent to login", page.url().endsWith("/login"));
    await page.getByText("New here? Create an account").click();
    await page.fill("#email", "owner@infinitywebapps.test");
    await page.fill("#password", "correct-horse-battery");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(`${BASE}/`);

    // ── Defaults ───────────────────────────────────────────────
    check("defaults: India / Karnataka / Bengaluru", (await page.inputValue("#country")) === "India" && (await page.inputValue("#state")) === "Karnataka" && (await page.inputValue("#city")) === "Bengaluru");

    // ── 1. Search for 100 leads ────────────────────────────────
    await page.fill("#target", "100");
    await page.getByRole("button", { name: "Find Leads" }).click();
    await waitForJob(page, sql, 1, /Target reached|No more results|Provider limit|Failed/);
    const progressText = await page.locator("[aria-live=polite]").innerText();
    check("1. search for 100 collects 100 eligible leads", /Target reached/.test(progressText) && /100\s+of 100 requested/.test(progressText), progressText.split("\n").slice(0, 3).join(" | "));
    check("9. provider failures shown honestly in the activity log", /Geoapify/.test(progressText), "Geoapify (unreachable here) error appears in log");
    await page.screenshot({ path: `${OUT}/01-find-leads-desktop.png`, fullPage: true });

    // ── 2/3/4. DB contents ─────────────────────────────────────
    const rows = await sql`select phone_e164, website_status, source, website_evidence from leads`;
    check("2. every lead traces to a provider record", rows.every((r) => r.source === "osm") && (await sql`select count(*)::int c from lead_sources`)[0].c >= 100);
    check("3. every primary lead has a phone number", rows.every((r) => /^\+91\d{10}$/.test(r.phone_e164)));
    check("4. default filter excluded listed websites", rows.every((r) => r.website_status === "no_website"));

    // ── 5. Repeat search → no duplicates ───────────────────────
    await page.fill("#target", "100");
    await page.getByRole("button", { name: "Find Leads" }).click();
    await waitForJob(page, sql, 2, /Target reached|No more results|Provider limit|Failed/);
    const second = await page.locator("[aria-live=polite]").innerText();
    const totalLeads = (await sql`select count(*)::int c from leads`)[0].c;
    const uniquePhones = (await sql`select count(distinct phone_e164)::int c from leads`)[0].c;
    check("5. repeated search creates no duplicate records", totalLeads === uniquePhones && totalLeads === 144, `${totalLeads} leads, ${uniquePhones} unique phones`);
    check("10. fewer-than-requested is reported", /Only 44 of 100 matching leads found/.test(second), second.match(/Only[^\n]+/)?.[0]);
    check("6. pagination across search areas", /16\/16 areas|all\/16 areas/.test(second));

    // ── Leads CRM ──────────────────────────────────────────────
    await page.goto(`${BASE}/leads`);
    await page.getByText(/144 leads match/).waitFor();
    check("dashboard lists all 144 primary leads", true);
    await page.screenshot({ path: `${OUT}/02-leads-desktop.png` });

    // ── 7. Refresh / re-login persistence ──────────────────────
    await page.reload();
    await page.getByText(/144 leads match/).waitFor();
    check("7a. leads survive a page refresh", true);

    // CRM update persists
    const firstRow = page.locator("tbody tr").first();
    await firstRow.getByLabel("Lead status").selectOption("interested");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Log out" }).click();
    await page.waitForURL(/login/);
    await page.fill("#email", "owner@infinitywebapps.test");
    await page.fill("#password", "correct-horse-battery");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(`${BASE}/`);
    await page.goto(`${BASE}/leads?status=interested`);
    await page.getByText(/1 leads match/).waitFor();
    check("7b. leads + CRM status survive logout/login", true);

    // ── 8. Filtered CSV export ─────────────────────────────────
    await page.goto(`${BASE}/leads?instagram=has`);
    await page.getByText(/leads match/).waitFor();
    const igCount = Number((await page.getByText(/leads match/).innerText()).match(/([\d,]+) leads match/)![1].replace(/,/g, ""));
    await page.getByRole("button", { name: /Export CSV/ }).click();
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: /Filtered view/ }).click()]);
    const csv = fs.readFileSync((await dl.path())!, "utf8");
    const lines = csv.trim().split("\n").slice(1);
    check("8. CSV export contains exactly the filtered rows", lines.length === igCount && igCount === 16 && lines.every((l) => l.includes("instagram.com")), `${lines.length} rows exported, ${igCount} on screen`);
    fs.writeFileSync(`${OUT}/export-instagram.csv`, csv);

    // Import with duplicate checking
    const importCsv = "Business Name,Phone,Website,City\nTest Fitness 0-0,+91 98450 00000,,Bengaluru\nBrand New Studio,98860 99999,,Bengaluru\n";
    await page.goto(`${BASE}/leads`);
    await page.getByRole("button", { name: "Import CSV" }).click();
    await page.setInputFiles('input[type=file]', { name: "import.csv", mimeType: "text/csv", buffer: Buffer.from(importCsv) });
    await page.getByRole("button", { name: "Import", exact: true }).click();
    await page.getByText(/imported ·/).waitFor();
    const importText = await page.getByText(/imported ·/).innerText();
    check("CSV import skips duplicates", /1 imported · 1 duplicates skipped/.test(importText), importText);
    await page.getByRole("button", { name: "Close" }).last().click();

    // ── 11. API keys stay on the server ────────────────────────
    const staticDir = ".next/static";
    const leaked = fs.readdirSync(staticDir, { recursive: true }).some((f) => {
      const p = path.join(staticDir, String(f));
      return fs.statSync(p).isFile() && fs.readFileSync(p, "utf8").includes(FAKE_KEY);
    });
    const metaJson = await page.evaluate(() => fetch("/api/meta").then((r) => r.text()));
    const html = await page.content();
    check("11. API keys never reach the browser", !leaked && !metaJson.includes(FAKE_KEY) && !html.includes(FAKE_KEY));

    // ── 9b. Rate limit displayed ───────────────────────────────
    mock.setMode("429");
    await page.goto(BASE);
    await page.selectOption("#niche", "cafe");
    await page.fill("#target", "20");
    await page.getByRole("button", { name: "Find Leads" }).click();
    await waitForJob(page, sql, 3, /Provider limit|No more results|Failed/);
    const limitText = await page.locator("[aria-live=polite]").innerText();
    check("9. rate limits shown honestly with resume option", /Provider limit/.test(limitText) && /HTTP 429/.test(limitText) && /Resume/.test(limitText), limitText.match(/Stopped[^\n]+/)?.[0]);
    await page.screenshot({ path: `${OUT}/03-rate-limit.png`, fullPage: true });
    mock.setMode("ok");

    // ── 12. Mobile layout ─────────────────────────────────────
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
    const m = await mobile.newPage();
    await m.goto(`${BASE}/leads`);
    await m.getByText(/leads match/).waitFor();
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const callLinks = await m.locator('a[href^="tel:+91"]:visible').count();
    check("12. mobile: no horizontal scroll, click-to-call cards", overflow <= 0 && callLinks > 0, `overflow ${overflow}px, ${callLinks} call buttons`);
    await m.screenshot({ path: `${OUT}/04-leads-mobile.png` });
    await m.goto(BASE);
    await m.screenshot({ path: `${OUT}/05-find-mobile.png`, fullPage: true });
    const overflow2 = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check("12. mobile: search page fits the screen", overflow2 <= 0);

    // Detail drawer
    await page.goto(`${BASE}/leads`);
    await page.locator("tbody tr").first().getByRole("button").first().click();
    await page.getByText("Website evidence").waitFor();
    await page.screenshot({ path: `${OUT}/06-lead-details.png` });
    check("lead detail drawer shows website evidence", (await page.getByText(/No website listed in (OpenStreetMap|imported CSV) data/).count()) > 0);
  } finally {
    await browser.close();
    app.kill();
    mock.server.close();
    await sql.end();
  }

  const failed = results.filter((r) => !r[1]);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
