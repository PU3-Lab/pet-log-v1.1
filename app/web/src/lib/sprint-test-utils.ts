import { join } from "node:path";

export function workspaceFile(path: string) {
  return join(process.cwd(), "..", "..", path);
}

export function restoreEnvValue(key: string, previousValue: string | undefined) {
  if (previousValue === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = previousValue;
}
