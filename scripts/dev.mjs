import { spawn } from "node:child_process";

const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" };

const children = [
  spawn("npx", ["astro", "dev", "--port", "4321", "--host", "127.0.0.1"], {
    stdio: "inherit",
    env,
  }),
  spawn("npx", ["vite", "--config", "editor/vite.config.ts", "--host", "127.0.0.1"], {
    stdio: "inherit",
    env,
  }),
];

console.log("Twilda desk: http://127.0.0.1:5173");
console.log("Published site dev: http://127.0.0.1:4321");
console.log("The editor is not part of `npm run build`.");

function shutdown() {
  for (const child of children) child.kill("SIGTERM");
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

for (const child of children) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      shutdown();
      process.exit(code);
    }
  });
}
