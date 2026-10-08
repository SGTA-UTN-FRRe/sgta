import { render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { HydrationMarker } from "./hydration-marker";

afterEach(() => {
  delete document.documentElement.dataset.hydrated;
});

it("marks the document as hydrated after mounting", () => {
  render(<HydrationMarker />);

  expect(document.documentElement).toHaveAttribute("data-hydrated", "true");
});
