import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { goldenScreenFixtures } from "@/features/golden-screens/fixtures";

import { LoginScreen } from "./login-screen";

const fixture = goldenScreenFixtures.login;

describe("LoginScreen", () => {
  it("renders the restricted access default with one clear heading", () => {
    render(<LoginScreen fixture={fixture} />);

    expect(screen.getAllByRole("heading")).toHaveLength(2);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      fixture.title,
    );
    expect(
      screen.getByRole("button", { name: fixture.ctaLabel }),
    ).toBeEnabled();
    expect(screen.getByText(/no hay registro público/i)).toBeInTheDocument();
  });

  it("exposes loading as a disabled, presentational state", () => {
    render(<LoginScreen fixture={fixture} state="loading" />);

    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      fixture.states.loadingLabel,
    );
  });

  it("keeps technical errors distinct and supports retry", () => {
    const onRetry = vi.fn();

    render(
      <LoginScreen fixture={fixture} onRetry={onRetry} state="error" />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      fixture.states.errorTitle,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      fixture.states.errorDescription,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText(fixture.states.permissionDeniedTitle),
    ).not.toBeInTheDocument();
  });

  it("renders permission denial with distinct recovery guidance", () => {
    render(<LoginScreen fixture={fixture} state="permission-denied" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      fixture.states.permissionDeniedTitle,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      fixture.states.permissionDeniedDescription,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
