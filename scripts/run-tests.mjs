/**
 * Vitest on Windows can hang fetching workers when the project path contains
 * `)` (e.g. `Projects\2) Cloud Engineering\...`). Run via a short junction.
 */
import { spawnSync, execSync } from "node:child_process";
import { existsSync, lstatSync, readlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const needsShortPath = process.platform === "win32" && /[()]/.test(root);
let cwd = root;

if (needsShortPath) {
  const short = join(homedir(), "cl");
  let ok = false;
  if (existsSync(short)) {
    try {
      const st = lstatSync(short);
      if (st.isSymbolicLink() || st.isDirectory()) {
        // Junctions often report as directories; prefer recreating if target differs.
        try {
          const target = readlinkSync(short);
          ok = target.replace(/\\/g, "/").toLowerCase() === root.replace(/\\/g, "/").toLowerCase();
        } catch {
          ok = true; // existing junction/dir — still usable for vitest
        }
      }
    } catch {
      ok = false;
    }
  }
  if (!ok) {
    try {
      execSync(`cmd /c if exist "${short}" rmdir "${short}"`, { stdio: "ignore" });
    } catch {
      /* ignore */
    }
    execSync(`cmd /c mklink /J "${short}" "${root}"`, { stdio: "inherit" });
  }
  cwd = short;
  console.log(`[run-tests] Using short path junction: ${cwd}`);
}

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", ...process.argv.slice(2)],
  { cwd, stdio: "inherit", env: process.env, shell: process.platform === "win32" },
);

process.exit(result.status ?? 1);
