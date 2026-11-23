import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const workspace = root => path.join(root, "generated-artifacts/catalog-capture");

async function exists(filename, io) {
  try {
    await io.stat(filename);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

// Persist bytes before a rename makes them authoritative. No live file is ever
// opened for writing, including during rollback.
async function write(filename, bytes, io) {
  const handle = await io.open(filename, "w");
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function retire(directory, io) {
  const discarded = `${directory}-discard-${randomUUID()}`;
  await io.rename(directory, discarded);
  await io.rm(discarded, { recursive: true, force: true });
}

function lockFailure(error, operation, filename, directory) {
  const remedies = {
    EACCES: "Fix filesystem permissions",
    EIO: "Resolve the filesystem I/O error",
    ENOSPC: "Free disk space",
  };
  if (!remedies[error.code]) return error;
  return Object.assign(new Error(
    `Cannot ${operation} at ${filename} (${error.code}). ${remedies[error.code]}, then run node scripts/capture-stellar-proteins.mjs --recover. ` +
    `If the lock at ${directory} is empty, confirm no capture or recovery is running, then remove only this empty directory with rmdir before retrying. ` +
    "Do not remove a registered owner's lock; a dead owner can be reclaimed by the retry. Keep pending and its backups intact",
    { cause: error },
  ), { code: error.code });
}

async function lock(root, io) {
  const base = workspace(root);
  const directory = path.join(base, "lock");
  await io.mkdir(base, { recursive: true });
  try {
    await io.mkdir(directory);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const owners = await io.readdir(directory);
    // An empty lock can also belong to a live process between mkdir and owner
    // registration. Never reclaim it automatically, even after a known crash.
    if (owners.length === 0) {
      throw new Error(`Incomplete capture lock at ${directory}; confirm no capture or recovery is running, then remove only this empty directory with rmdir and run node scripts/capture-stellar-proteins.mjs --recover. Keep pending and its backups intact`);
    }
    if (owners.length !== 1 || !/^\d+$/.test(owners[0])) {
      throw new Error(`Incomplete capture lock at ${directory}; confirm no capture is running before removing this lock directory`);
    }
    const pid = Number(owners[0]);
    try {
      process.kill(pid, 0);
      throw new Error(`A catalog capture is already running (PID ${pid})`);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
    // Removing the specific stale owner is the arbitration point: only one
    // contender can succeed. Never recursively remove a potentially new lock.
    for (const [method, filename, operation] of [
      ["rmdir", path.join(directory, owners[0]), "remove stale capture owner"],
      ["rmdir", directory, "remove stale capture lock"],
      ["mkdir", directory, "create replacement capture lock"],
    ]) {
      try {
        await io[method](filename);
      } catch (error) {
        throw lockFailure(error, operation, filename, directory);
      }
    }
  }
  const owner = path.join(directory, String(process.pid));
  try {
    await io.mkdir(owner);
  } catch (error) {
    const registrationError = lockFailure(error, "register capture owner", owner, directory);
    try {
      await io.rmdir(directory);
    } catch (cleanupError) {
      throw new AggregateError([
        registrationError,
        lockFailure(cleanupError, "remove unregistered capture lock", directory, directory),
      ], `Capture owner registration and lock cleanup failed. ${registrationError.message}. Cleanup: ${cleanupError.message}. ` +
        `After fixing the filesystem issue, confirm no capture or recovery is running, then remove only this empty directory with rmdir: ${directory}. ` +
        "Run node scripts/capture-stellar-proteins.mjs --recover. Keep pending and its backups intact");
    }
    throw registrationError;
  }
  return async () => {
    await io.rmdir(path.join(directory, String(process.pid)));
    await io.rmdir(directory);
  };
}

async function recover(root, io) {
  const pending = path.join(workspace(root), "pending");
  if (!await exists(pending, io)) return false;
  const journalFile = path.join(pending, "journal.json");
  if (!await exists(journalFile, io)) {
    // Preparation was interrupted before the durable journal; live files have
    // not been touched yet.
    await retire(pending, io);
    return true;
  }
  const journal = JSON.parse(await io.readFile(journalFile, "utf8"));
  if (!await exists(path.join(pending, "committed"), io)) {
    for (const [index, entry] of journal.entries()) {
      const destination = path.join(root, entry.relative);
      if (entry.existed) {
        // Keep backups intact so another interruption can repeat recovery.
        const restore = path.join(pending, `restore-${index}`);
        await io.copyFile(path.join(pending, `backup-${index}`), restore);
        await io.rename(restore, destination);
      } else {
        await io.rm(destination, { force: true });
      }
    }
  }
  // Atomically remove the transaction from recovery's view before cleanup.
  // An interruption during recursive cleanup must not expose half a backup.
  await retire(pending, io);
  return true;
}

export async function withCaptureTransaction(root, action, io = fs) {
  const unlock = await lock(root, io);
  try {
    await recover(root, io);
    return await action(async entries => {
      const pending = path.join(workspace(root), "pending");
      await io.mkdir(pending);
      try {
        const journal = [];
        for (const [index, [relative, bytes]] of entries.entries()) {
          const destination = path.join(root, relative);
          await io.mkdir(path.dirname(destination), { recursive: true });
          await write(path.join(pending, `next-${index}`), bytes, io);
          const existed = await exists(destination, io);
          if (existed) {
            await write(path.join(pending, `backup-${index}`), await io.readFile(destination), io);
          }
          journal.push({ relative, existed });
        }
        // A partial journal is never read as authoritative.
        await write(path.join(pending, "journal.tmp"), JSON.stringify(journal), io);
        await io.rename(path.join(pending, "journal.tmp"), path.join(pending, "journal.json"));
        for (const [index, entry] of journal.entries()) {
          await io.rename(path.join(pending, `next-${index}`), path.join(root, entry.relative));
        }
        await write(path.join(pending, "committed.tmp"), "", io);
        await io.rename(path.join(pending, "committed.tmp"), path.join(pending, "committed"));
      } catch (error) {
        try {
          await recover(root, io);
        } catch (rollbackError) {
          throw new AggregateError([error, rollbackError],
            "Capture failed and rollback could not finish; backups are retained. Fix the disk issue, then run capture --recover");
        }
        throw error;
      }
      await retire(pending, io);
    });
  } finally {
    await unlock();
  }
}

export async function recoverCapture({ root, transactionFs = fs }) {
  return withCaptureTransaction(root, async () => {}, transactionFs);
}
