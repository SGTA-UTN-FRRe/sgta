import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BalanceStatus } from "./balance-status";

describe("BalanceStatus", () => {
  it.each([
    [-75, "owes", "1 h 15 min", "Debe horas"],
    [75, "current", "1 h 15 min", "Al día"],
    [0, "current", "0 min", "Al día"],
  ] as const)("explains %i minutes without a sign", (signedBalanceMinutes, state, duration, label) => {
    render(<BalanceStatus balance={{ signedBalanceMinutes, state }} />);
    expect(screen.getByText(duration)).toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
    if (signedBalanceMinutes === 0) {
      expect(screen.getByText(label).closest('[data-slot="status-badge"]')).toHaveAttribute("data-variant", "neutral");
    }
  });
});
