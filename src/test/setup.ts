import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

configure({ asyncUtilTimeout: 5_000 });

// jsdom has no layout engine. Radix observes sizes while keyboard tests exercise
// semantics and focus; browser verification covers real layout measurements.
if (typeof window !== "undefined" && !window.ResizeObserver) {
  class ResizeObserverShim implements ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverShim;
}
