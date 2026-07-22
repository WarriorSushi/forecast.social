import { rm } from "node:fs/promises";
import { resolve, sep } from "node:path";

const projectRoot = process.cwd();
const generatedDevTypes = resolve(projectRoot, ".next", "dev", "types");

if (!generatedDevTypes.startsWith(`${resolve(projectRoot, ".next")}${sep}`)) {
  throw new Error("Refusing to clean generated types outside .next.");
}

await rm(generatedDevTypes, { recursive: true, force: true });
