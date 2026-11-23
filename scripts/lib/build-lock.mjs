import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

// Separate startup/test processes must not rebuild the same outputs together.
export async function withBuildLock(filename, build, timeoutMs = 120_000) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const owner = `${process.pid}:${randomUUID()}`;
  const deadline = Date.now() + timeoutMs;
  while (true) {
    try {
      const fd = fs.openSync(filename, "wx");
      try { fs.writeFileSync(fd, owner); } finally { fs.closeSync(fd); }
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      try {
        const previous = fs.readFileSync(filename, "utf8");
        const pid = Number(previous.split(":")[0]);
        let abandoned = false;
        if (Number.isInteger(pid) && pid > 0) {
          try { process.kill(pid, 0); } catch (probeError) {
            if (probeError.code === "ESRCH") abandoned = true;
            else if (probeError.code !== "EPERM") throw probeError;
          }
        } else {
          // A process might die between creating its lock and writing its PID.
          abandoned = Date.now() - fs.statSync(filename).mtimeMs > 30_000;
        }
        if (abandoned && fs.readFileSync(filename, "utf8") === previous) {
          fs.unlinkSync(filename);
          continue;
        }
      } catch (readError) {
        if (readError.code === "ENOENT") continue;
        throw readError;
      }
      if (Date.now() >= deadline) throw new Error(`Timed out waiting for asset build: ${filename}`);
      await delay(100);
    }
  }
  try {
    return await build();
  } finally {
    if (fs.existsSync(filename) && fs.readFileSync(filename, "utf8") === owner) fs.unlinkSync(filename);
  }
}
