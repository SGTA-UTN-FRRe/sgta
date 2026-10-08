import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getServerNow } from "./clock";

describe("server clock", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("uses the validated E2E instant when configured", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SGTA_E2E_NOW", "2026-12-01T15:00:00.000Z");

    expect(getServerNow()).toEqual(new Date("2026-12-01T15:00:00.000Z"));
  });

  it("uses the wall clock when no E2E instant is configured", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SGTA_E2E_NOW", "");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-21T12:34:56.000Z"));

    expect(getServerNow()).toEqual(new Date("2026-09-21T12:34:56.000Z"));
  });
});
