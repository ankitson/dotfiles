import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Makes the agent aware that it runs inside the `devbox` container, including
// which host directories are shared and which ports are reachable from the
// host. These dotfiles are also deployed to the host machine, so the context
// is only injected when we actually detect the devbox container.
export default function (pi: ExtensionAPI) {
  const os = require("node:os");
  const fs = require("node:fs");

  function insideDevbox(): boolean {
    try {
      if (fs.existsSync("/mnt/host/home/ankit")) return true; // devbox-specific bind mount
    } catch {}
    try {
      if (os.hostname() === "devbox") return true;
    } catch {}
    return false;
  }

  const ENV_INFO = [
    "## Runtime environment",
    "You are running INSIDE a Docker container named `devbox` (image `ankit/devbox`, built from the `devdocker` repo) on Ankit's homeserver. This is a full dev sandbox — not the host machine — so you can install packages and run servers freely.",
    "",
    "Filesystem shared with the host:",
    "- `/projects` is bind-mounted from the host at the SAME path. Anything you write under `/projects` is immediately visible on the host — use it to share files and to serve web apps / HTML pages.",
    "- The host home directory is mounted read-write at `/mnt/host/home/ankit`.",
    "- `/media/ankit` is shared with the host.",
    "- The host Docker daemon is reachable via `/var/run/docker.sock`.",
    "",
    "Ports published to the host:",
    "- Container ports `3000-3100` are published 1:1 to the host. Bind any HTTP server or preview to `0.0.0.0:<port>` in the 3000-3100 range and it is reachable from the host browser at the same port (e.g. serve on `0.0.0.0:3000` → open `http://localhost:3000` on the host). Use this to show HTML pages and web servers.",
    "- SSH is exposed on host port 2201.",
    "",
    "Hardware/display: an NVIDIA GPU is available (nvidia runtime). `DISPLAY=172.22.0.1:1` is set for GUI/X apps forwarded to the host.",
  ].join("\n");

  if (insideDevbox()) {
    pi.on("before_agent_start", async (event: any) => {
      return { systemPrompt: `${event.systemPrompt}\n\n${ENV_INFO}` };
    });
  }

  // /env — print the runtime environment on demand (works on host too).
  pi.registerCommand("env", {
    description: "Show the container/runtime environment pi is running in",
    handler: async (_args: string, ctx: any) => {
      const msg = insideDevbox()
        ? ENV_INFO
        : "Running on the host (not inside the devbox container).";
      if (ctx && ctx.ui && typeof ctx.ui.notify === "function") {
        ctx.ui.notify(msg);
      } else {
        console.log(msg);
      }
    },
  });
}
