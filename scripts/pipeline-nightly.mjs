/**
 * Nightly pipeline: run each step, continue on failure, log timing + errors only.
 *
 *   npm run pipeline:nightly
 *
 * Exit code 0 = every step finished (symbol-level errors ok).
 * Exit code 1 = one or more steps did not finish.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

/** @type {{ name: string, file: string }[]} */
const STEPS = [
  { name: "get-daily-price-data", file: "get-daily-price-data.mjs" },
  { name: "analyze-symbols", file: "analyze-symbols.mjs" },
  { name: "analyze-ma-crossover", file: "analyze-ma-crossover.mjs" },
  { name: "analyze-triple-ma", file: "analyze-triple-ma.mjs" },
  { name: "analyze-macd", file: "analyze-macd.mjs" },
  { name: "analyze-rsi", file: "analyze-rsi.mjs" },
  { name: "analyze-donchian", file: "analyze-donchian.mjs" },
  { name: "analyze-keltner", file: "analyze-keltner.mjs" },
  { name: "analyze-bollinger", file: "analyze-bollinger.mjs" },
  { name: "analyze-darvas", file: "analyze-darvas.mjs" },
  { name: "analyze-fibonacci", file: "analyze-fibonacci.mjs" },
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTime(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function formatMinutes(ms) {
  return (ms / 60000).toFixed(1);
}

function pipeLines(stream, write) {
  let buf = "";
  stream.on("data", (chunk) => {
    buf += chunk.toString();
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).replace(/\r$/, "");
      buf = buf.slice(i + 1);
      if (line.length) write(line);
    }
  });
  stream.on("end", () => {
    const line = buf.replace(/\r$/, "");
    if (line.length) write(line);
  });
}

/**
 * Child exit codes:
 *   0 = finished clean
 *   1 = finished with symbol-level / soft errors
 *   2+ or signal = did not finish
 */
function stepFinished(code, signal) {
  if (signal) return false;
  if (code == null) return false;
  return code === 0 || code === 1;
}

function runStep(step) {
  return new Promise((resolve) => {
    const start = new Date();
    console.log(`${formatDate(start)} - ${step.name}`);
    console.log(`Start: ${formatTime(start)}`);

    const child = spawn(process.execPath, [path.join(__dirname, step.file)], {
      cwd: ROOT,
      env: {
        ...process.env,
        PIPELINE_QUIET: "1",
        NPM_CONFIG_UPDATE_NOTIFIER: "false",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    pipeLines(child.stdout, (line) => console.log(line));
    pipeLines(child.stderr, (line) => console.log(line));

    child.on("error", (err) => {
      console.log(`ERROR: failed to start: ${err.message || err}`);
      const end = new Date();
      console.log(`End: ${formatTime(end)} / ${formatMinutes(end - start)} min`);
      console.log("");
      resolve({ name: step.name, finished: false });
    });

    child.on("close", (code, signal) => {
      const finished = stepFinished(code, signal);
      if (!finished) {
        if (signal) {
          console.log(`ERROR: killed by signal ${signal}`);
        } else if (code == null) {
          console.log(`ERROR: exited with no status`);
        } else if (code >= 2) {
          // Fatal message usually already printed by the child.
        } else {
          console.log(`ERROR: exited with code ${code}`);
        }
      }
      const end = new Date();
      console.log(`End: ${formatTime(end)} / ${formatMinutes(end - start)} min`);
      console.log("");
      resolve({ name: step.name, finished });
    });
  });
}

async function main() {
  const t0 = Date.now();
  const unfinished = [];

  for (const step of STEPS) {
    const r = await runStep(step);
    if (!r.finished) unfinished.push(r.name);
  }

  const totalMin = formatMinutes(Date.now() - t0);
  if (unfinished.length === 0) {
    console.log(`All scripts ran and finished — ${totalMin} min`);
  } else {
    console.log(
      `Scripts that did not finish: ${unfinished.join(", ")} — ${totalMin} min`
    );
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
