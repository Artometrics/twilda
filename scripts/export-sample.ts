import { exportPublishedSample } from "../packages/core/src/export-sample";
import fs from "node:fs";
import path from "node:path";

const content = path.resolve("examples/studio/content");
exportPublishedSample(content);
fs.mkdirSync(path.resolve("examples/studio/public/data"), { recursive: true });
fs.copyFileSync(
  path.join(content, "data/franchise-revenue-mix.csv"),
  path.resolve("examples/studio/public/data/franchise-revenue-mix.csv"),
);
console.log("Exported published sample to examples/studio/content");
