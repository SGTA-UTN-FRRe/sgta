// @vitest-environment node

import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

it("loads the default import package from preserved local material", async () => {
  const fixture = path.resolve("tests/fixtures/initial-data-import");
  const root = await mkdtemp(path.join(os.tmpdir(), "sgta-import-default-"));

  try {
    await cp(fixture, path.join(root, "local-docs/keep/data/build/m1"), {
      recursive: true,
    });
    vi.resetModules();
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(root);
    const { loadInitialDataPackage } = await import("./import-initial-data");
    cwd.mockRestore();

    const result = await loadInitialDataPackage();

    expect(result.errors).toEqual([]);
    expect(result.data).not.toBeNull();
  } finally {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  }
});
