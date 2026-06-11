/**
 * @deprecated Use: node scripts/generate-test-case-excel.mjs TCC003
 */
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const result = spawnSync(process.execPath, [join(scriptDir, "generate-test-case-excel.mjs"), "TCC003"], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
