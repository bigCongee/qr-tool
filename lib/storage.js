import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "qr-codes.json");

function logInfo(message, extra = {}) {
  console.info(`[storage] ${message}`, {
    file: dataFile,
    ...extra,
  });
}

function logError(message, error, extra = {}) {
  console.error(`[storage] ${message}`, {
    file: dataFile,
    ...extra,
    error: error?.message,
    stack: error?.stack,
  });
}

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    logInfo("Created data directory");
  }
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, "[]", "utf-8");
    logInfo("Initialized data file with empty array");
  }
}

export async function readAllQrs() {
  ensureDataFile();
  let raw = "";
  try {
    raw = await fs.promises.readFile(dataFile, "utf-8");
  } catch (err) {
    logError("Read failed", err);
    throw err;
  }
  try {
    const parsed = JSON.parse(raw || "[]");
    logInfo("Read success", { count: Array.isArray(parsed) ? parsed.length : "n/a" });
    return parsed;
  } catch (err) {
    logError("JSON parse failed, resetting file", err);
    await fs.promises.writeFile(dataFile, "[]", "utf-8");
    return [];
  }
}

export async function saveAllQrs(list) {
  ensureDataFile();
  try {
    await fs.promises.writeFile(dataFile, JSON.stringify(list, null, 2), "utf-8");
    logInfo("Write success", { count: Array.isArray(list) ? list.length : "n/a" });
  } catch (err) {
    logError("Write failed", err, { count: Array.isArray(list) ? list.length : "n/a" });
    throw err;
  }
}
