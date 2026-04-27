import path from "node:path";
import os from "node:os";
import { appendFile, mkdir } from "node:fs/promises";
import { createScratchHttpServer } from "./http.js";
import { ScratchBridge } from "./service.js";
import { assertSafeBindHost, DEFAULT_HOST, DEFAULT_PORT } from "./index.js";

const host = process.env.SCRATCH_WEB_HOST ?? DEFAULT_HOST;
const port = Number(process.env.SCRATCH_WEB_PORT ?? DEFAULT_PORT);
const notesRoot = process.env.SCRATCH_WEB_NOTES_ROOT;
const home = process.env.SCRATCH_WEB_HOME ?? path.join(os.homedir(), ".scratch-web");
const webRoot = process.env.SCRATCH_WEB_WEB_ROOT ?? path.resolve(new URL(".", import.meta.url).pathname, "../../web/dist");
const logPath = path.join(home, "logs", "service.log");

if (!notesRoot) {
  throw new Error("SCRATCH_WEB_NOTES_ROOT is required.");
}

assertSafeBindHost(host);

const bridge = new ScratchBridge({
  notesRoot,
  backupsRoot: path.join(home, "backups")
});
await bridge.initialize();

const server = createScratchHttpServer({ bridge, host, port, webRoot });
server.listen(port, host, () => {
  void log(`Scratch Web listening on http://${host}:${port}`);
});

async function log(message: string): Promise<void> {
  await mkdir(path.dirname(logPath), { recursive: true, mode: 0o700 });
  await appendFile(logPath, `${new Date().toISOString()} ${message}\n`, { mode: 0o600 });
}
