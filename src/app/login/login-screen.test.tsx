import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { loginScreenData } from "@/mocks/login.mock";

import { LoginScreen } from "./login-screen";

const data = loginScreenData;

describe("LoginScreen", () => {
  it("renders the restricted access default with one clear heading", () => {
    render(<LoginScreen data={data} />);

    expect(screen.getAllByRole("heading")).toHaveLength(2);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      data.title,
    );
    expect(
      screen.getByRole("button", { name: data.ctaLabel }),
    ).toBeEnabled();
    expect(screen.getByText(/no hay registro público/i)).toBeInTheDocument();
  });

  it("exposes loading as a disabled, presentational state", () => {
    render(<LoginScreen data={data} state="loading" />);

    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      data.states.loadingLabel,
    );
  });

  it("keeps technical errors distinct and supports retry", () => {
    const onRetry = vi.fn();

    render(
      <LoginScreen data={data} onRetry={onRetry} state="error" />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      data.states.errorTitle,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      data.states.errorDescription,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText(data.states.permissionDeniedTitle),
    ).not.toBeInTheDocument();
  });

  it("renders permission denial with distinct recovery guidance", () => {
    render(<LoginScreen data={data} state="permission-denied" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      data.states.permissionDeniedTitle,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      data.states.permissionDeniedDescription,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
