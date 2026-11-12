// Records the RemitHome 60-second demo video against the live testnet app.
// Uses the full Chromium (`channel: "chromium"`), NOT the headless shell:
// the shell build cannot record video (page.video() is null), and in this
// Playwright version the context option is `recordVideo`, not `video`.
// Run with the dev server up:  PORT=3108 npm run dev
//   node scripts/record/record-demo.mjs
// Output: scripts/record/videos/remithome-demo-<timestamp>.webm (1280x720).
// The video is silent — Jack narrates live over it at the showcase.
//
// Flow (matches docs/DEMO_SCRIPT.md): happy path on a fresh remittance,
// then attack 1 (wrong code), attack 2 (double release), attack 3 (refund
// of a genuinely expired remittance, created + expired BEFORE recording).
import { chromium } from "playwright";
import { execSync } from "child_process";

const BASE = "http://localhost:3108";
const OUT_DIR = new URL("./videos", import.meta.url).pathname;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const stamp = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;

async function api(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path}: ${data.error ?? res.status}`);
  return data;
}

async function main() {
  // Pre-flight: each take funds two fresh remittances (prep + shot 1) at
  // $200 each, so the demo sender needs >= 400 USDC. Take 4 died on this —
  // the sender was down to 150 USDC and the fund transfer trapped with
  // contract error #10. Top up with: scripts/topup-testnet-usdc.py 800
  const SENDER = "GACOLSK76W2D6UMNYJHBEKWEX2PJDREZEXFEJHOPKAEPBXDAE2JD3PTS";
  const acct = await fetch(`https://horizon-testnet.stellar.org/accounts/${SENDER}`).then((r) => r.json());
  const usdc = Number((acct.balances ?? []).find((b) => b.asset_code === "USDC")?.balance ?? 0);
  console.log(`[${stamp()}] pre-flight: sender USDC ${usdc}`);
  if (usdc < 400) throw new Error(`sender USDC ${usdc} < 400 needed for one take — run: /tmp/stellar-deploy-venv/bin/python scripts/topup-testnet-usdc.py 800`);

  // --- Prep (before the recorder starts): expired remittance for attack 3.
  console.log(`[${stamp()}] prep: creating short-expiry remittance for the refund shot…`);
  const expired = await api("/api/remittance", {
    rent: 100, school: 60, food: 40, expiryLedgers: 6,
  });
  console.log(`[${stamp()}] prep: remittance #${expired.remittanceId} created, waiting ~45s for expiry…`);
  await sleep(45000);
  console.log(`[${stamp()}] prep: expired. Starting the recorder.`);

  const browser = await chromium.launch({
    channel: "chromium",
    // Route browser traffic through the same egress proxy curl uses, so
    // external pages (e.g. stellar.expert) can load. Without this the
    // browser fails with ERR_TUNNEL_CONNECTION_FAILED. Bypass the proxy
    // for localhost, or the dev server itself becomes unreachable
    // (ERR_EMPTY_RESPONSE — take 8 died on this).
    proxy: process.env.https_proxy ? { server: process.env.https_proxy, bypass: "localhost,127.0.0.1" } : undefined,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  const rec0 = Date.now();
  const vstamp = () => `${((Date.now() - rec0) / 1000).toFixed(1)}s`;
  console.log(`[${vstamp()}] REC`);

  // The Soroban RPC occasionally hiccups on a simulation (one 500 in the
  // first take). A failed click is retried once after a short wait; the
  // context is always closed so partial footage is still saved.
  const errorBox = () => page.locator('p[style*="color: red"], p[style*="red"]').first();
  // Wait for EITHER the success text OR the red error paragraph, polling
  // every 500ms. Returns "ok" | "error:<text>" | "timeout". Waiting only for
  // success wastes 30s when the failure is instant (e.g. a validation error).
  // NOTE: textContent() without a timeout waits the full 30s for a missing
  // element — take 6 died on this: the release had succeeded on screen in
  // ~4s, but the first poll burned the whole 30s waiting for an error box
  // that never appeared, so "Released." was never seen.
  async function waitForOutcome(successText, timeoutMs = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await page.getByText(successText).first().isVisible().catch(() => false)) return "ok";
      const err = await errorBox().textContent({ timeout: 500 }).catch(() => "");
      if (err) return `error:${err}`;
      await sleep(500);
    }
    return "timeout";
  }
  async function clickWithRetry(button, successText, label) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await button.click({ timeout: 10000 });
      } catch (e) {
        // The button may be gone because the action already succeeded (the
        // done card replaced the form). Check once before giving up.
        if (await page.getByText(successText).first().isVisible().catch(() => false)) return;
        throw new Error(`${label}: could not click (${String(e.message).slice(0, 80)})`);
      }
      const outcome = await waitForOutcome(successText);
      if (outcome === "ok") return;
      const err = outcome.replace(/^error:/, "");
      console.log(`[${vstamp()}] ${label}: attempt ${attempt} failed (${String(err).slice(0, 80)})`);
      // Validation errors are script bugs, not transient failures — retrying
      // the same click cannot fix them, so fail fast instead of burning 30s.
      if (/float|code/i.test(err)) throw new Error(`${label} failed (validation): ${err}`);
      if (attempt === 2) throw new Error(`${label} failed twice: ${err}`);
      await sleep(3000);
    }
  }
  // React hydration race: `goto` with domcontentloaded returns before React
  // hydrates, and a fill/check/click done before hydration is wiped when
  // React takes over the controlled inputs (take 3 died on the float
  // checkbox; take 5 died on the code field — the fill verified fine, then
  // hydration wiped it). Wait for hydration explicitly: once React has
  // hydrated, DOM nodes carry __reactFiber$ keys. Call after every goto,
  // before any interaction — even button clicks do nothing pre-hydration.
  async function waitForHydration() {
    await page.waitForFunction(() => {
      const els = document.querySelectorAll("input, button, a");
      return [...els].some((el) => Object.keys(el).some((k) => k.startsWith("__react")));
    }, { timeout: 20000 }).catch(() => {});
    await sleep(500);
  }
  // Fill/check, wait, and verify the value actually stuck; retry until it
  // does. (Second layer under waitForHydration — belt and braces.)
  async function fillAndVerify(locator, value, label) {
    for (let i = 1; i <= 5; i++) {
      await locator.fill(value);
      await sleep(1500);
      const got = await locator.inputValue().catch(() => "");
      if (got === value) return;
      console.log(`[${vstamp()}] ${label}: fill attempt ${i} did not stick (got "${got}"), retrying…`);
    }
    throw new Error(`${label}: could not fill after 5 attempts`);
  }
  async function checkAndVerify(locator, label) {
    for (let i = 1; i <= 5; i++) {
      await locator.check();
      await sleep(600);
      if (await locator.isChecked().catch(() => false)) return;
      console.log(`[${vstamp()}] ${label}: check attempt ${i} did not stick, retrying…`);
    }
    throw new Error(`${label}: could not check after 5 attempts`);
  }

  try {
  // --- Shot 1: sender view, lock $200 in escrow.
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await waitForHydration();
  await sleep(2500);
  console.log(`[${vstamp()}] shot 1: sender view, clicking Lock…`);
  await page.getByRole("button", { name: /Lock \$200 in escrow/ }).click();
  await page.getByText("Locked on Stellar Testnet").waitFor({ timeout: 60000 });
  const state = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("remithome-testnet-v1") ?? "null")
  );
  const id = state.remittanceId;
  const code = state.code;
  console.log(`[${vstamp()}] shot 1: remittance #${id} locked, code ${code}`);

  // --- Shot 2: tracking, three envelopes locked.
  await sleep(1500);
  await page.getByRole("link", { name: /Track the envelopes/ }).click();
  await page.getByText("Live on Stellar Testnet").waitFor({ timeout: 30000 });
  await sleep(2000);
  console.log(`[${vstamp()}] shot 2: tracking, 3 envelopes locked`);

  // --- Shot 3: agent pickup (food) with the real code.
  await page.goto(`${BASE}/agent`, { waitUntil: "domcontentloaded" });
  await waitForHydration();
  await fillAndVerify(page.getByLabel(/Pickup code/), code, "shot 3 code");
  await checkAndVerify(page.getByLabel(/I hold ₦62,000 in float/), "shot 3 float");
  await sleep(1200);
  console.log(`[${vstamp()}] shot 3: agent confirms pickup…`);
  await clickWithRetry(
    page.getByRole("button", { name: /Confirm pickup/ }),
    "Released.",
    "agent pickup"
  );
  await sleep(1500);
  console.log(`[${vstamp()}] shot 3: food envelope released`);

  // --- Shot 4: tracking, release school + rent, open an Explorer receipt.
  await page.goto(`${BASE}/track?id=${id}`, { waitUntil: "domcontentloaded" });
  await waitForHydration();
  await page.getByText("Live on Stellar Testnet").waitFor({ timeout: 30000 });
  console.log(`[${vstamp()}] shot 4: releasing school…`);
  await page.getByRole("button", { name: /Release to Enugu Primary School/ }).click();
  await page.getByRole("button", { name: /Release to Enugu Primary School/ }).waitFor({ state: "detached", timeout: 60000 });
  await sleep(1200);
  console.log(`[${vstamp()}] shot 4: releasing rent…`);
  await page.getByRole("button", { name: /Release to Landlord, Enugu/ }).click();
  await page.getByRole("button", { name: /Release to Landlord, Enugu/ }).waitFor({ state: "detached", timeout: 60000 });
  await sleep(1500);
  const receiptHref = await page
    .locator('a[href*="stellar.expert/explorer/testnet/tx"]')
    .first()
    .getAttribute("href");
  console.log(`[${vstamp()}] shot 4: opening Explorer receipt ${receiptHref}`);
  try {
    await page.goto(receiptHref, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(3000);
  } catch (e) {
    console.log(`[${vstamp()}] shot 4: Explorer was slow (${e.message.slice(0, 80)}), moving on`);
  }
  // Back to the track page. A failed external navigation can leave the page
  // on chrome-error:// and interrupt the next goto (take 7 died here), so
  // retry once after a short wait.
  for (let i = 0; i < 2; i++) {
    try {
      await page.goto(`${BASE}/track?id=${id}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      break;
    } catch (e) {
      console.log(`[${vstamp()}] back-to-track attempt ${i + 1} failed (${String(e.message).slice(0, 60)}), retrying…`);
      await sleep(2000);
      if (i === 1) throw e;
    }
  }
  await waitForHydration();
  await sleep(1200);

  // --- Attack 1: wrong pickup code at the agent.
  await page.goto(`${BASE}/agent`, { waitUntil: "domcontentloaded" });
  await waitForHydration();
  await fillAndVerify(page.getByLabel(/Pickup code/), "000000", "attack 1 code");
  await checkAndVerify(page.getByLabel(/I hold ₦62,000 in float/), "attack 1 float");
  console.log(`[${vstamp()}] attack 1: wrong code…`);
  await page.getByRole("button", { name: /Confirm pickup/ }).click();
  await page.locator('p[style*="color: red"], p[style*="red"]').first().waitFor({ timeout: 60000 });
  await sleep(2000);
  console.log(`[${vstamp()}] attack 1: rejected`);

  // --- Attack 2: double release on the track page (school is 2nd card).
  await page.goto(`${BASE}/track?id=${id}`, { waitUntil: "domcontentloaded" });
  await waitForHydration();
  await page.getByText("Live on Stellar Testnet").waitFor({ timeout: 30000 });
  console.log(`[${vstamp()}] attack 2: releasing school again…`);
  await page.getByRole("button", { name: /Release again/ }).nth(1).click();
  await page.locator('p[style*="color: red"], p[style*="red"]').first().waitFor({ timeout: 60000 });
  await sleep(2000);
  console.log(`[${vstamp()}] attack 2: rejected`);

  // --- Attack 3: refund the genuinely expired remittance.
  await page.goto(`${BASE}/track?id=${expired.remittanceId}`, { waitUntil: "domcontentloaded" });
  await waitForHydration();
  await page.getByText("Live on Stellar Testnet").waitFor({ timeout: 30000 });
  console.log(`[${vstamp()}] attack 3: refunding expired rent envelope…`);
  await page.getByRole("button", { name: /Refund to sender/ }).first().click();
  await page.getByText("refunded").first().waitFor({ timeout: 60000 });
  await sleep(2500);
  console.log(`[${vstamp()}] attack 3: refunded to sender`);

  const videoPath = await page.video().path();
  console.log(`[${vstamp()}] DONE video: ${videoPath}`);
  } finally {
    // Always close the context: that is what finalizes (and saves) the video,
    // even if a shot failed midway.
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((e) => {
  console.error("RECORD FAILED:", e);
  process.exit(1);
});
