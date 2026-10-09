import type { Locator, Page } from "@playwright/test";
import { expect } from "./fixtures";

type KeyboardSelectTarget = string | { label: string };

export async function expectFocusOutline(locator: Locator) {
  await expect(locator).toBeFocused();
  // Controls show either the base outline (2px solid --ring, offset 2px) or the
  // primitive ring (a box-shadow in the --ring color). Resolve the ring color in
  // the browser: custom properties retain their authored syntax while computed
  // colors serialize differently. Poll also observes completion of the control's
  // outline-color and box-shadow transitions.
  await expect.poll(() => locator.evaluate((element) => {
    const styles = getComputedStyle(element);
    const ring = styles.getPropertyValue("--ring").trim();
    const probe = document.createElement("span");
    probe.hidden = true;
    probe.style.color = ring;
    document.body.append(probe);
    try {
      const expected = getComputedStyle(probe).color;
      const outline = styles.outlineStyle === "solid"
        && styles.outlineWidth === "2px"
        && styles.outlineOffset === "2px"
        && styles.outlineColor === expected;
      const primitiveRing = styles.boxShadow.includes(expected);
      return {
        valid: CSS.supports("color", ring),
        outline: `${styles.outlineStyle} ${styles.outlineWidth} ${styles.outlineOffset} ${styles.outlineColor}`,
        boxShadow: styles.boxShadow,
        expected,
        matches: outline || primitiveRing,
      };
    } finally {
      probe.remove();
    }
  })).toMatchObject({ valid: true, matches: true });
}

export async function focusWithKeyboard(page: Page, locator: Locator) {
  await locator.waitFor({ state: "visible" });

  for (let attempt = 0; attempt < 160; attempt += 1) {
    if (await locator.evaluate((element) => element === document.activeElement)) {
      const visibleFocus = await locator.evaluate((element) => {
        const styles = getComputedStyle(element);
        return styles.boxShadow !== "none" || styles.outlineStyle !== "none";
      });
      if (!visibleFocus) {
        throw new Error("The focused control does not show a visible keyboard focus indicator.");
      }
      return;
    }

    await page.keyboard.press("Tab");
  }

  throw new Error("The requested control was not reachable by pressing Tab.");
}

export async function activateWithKeyboard(page: Page, locator: Locator) {
  await focusWithKeyboard(page, locator);
  await page.keyboard.press("Enter");
}

export async function setCheckboxWithKeyboard(
  page: Page,
  locator: Locator,
  checked: boolean,
) {
  await focusWithKeyboard(page, locator);
  if ((await locator.isChecked()) !== checked) {
    await page.keyboard.press("Space");
  }
}

export async function selectWithKeyboard(
  page: Page,
  locator: Locator,
  target: KeyboardSelectTarget,
) {
  await focusWithKeyboard(page, locator);
  const optionIndex = await locator.evaluate((element, selection) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).findIndex((option) =>
      typeof selection === "string"
        ? option.value === selection
        : option.label === selection.label,
    );
  }, target);

  if (optionIndex < 0) {
    throw new Error("The requested option was not found in the select control.");
  }

  await page.keyboard.press("Home");
  for (let index = 0; index < optionIndex; index += 1) {
    await page.keyboard.press("ArrowDown");
  }
  await page.keyboard.press("Enter");
}

export async function expectReducedMotion(locator: Locator) {
  const durations = await locator.evaluate((root) => {
    const elements = [root, ...root.querySelectorAll("*")];
    return elements.flatMap((element) => {
      const styles = getComputedStyle(element);
      return [styles.transitionDuration, styles.animationDuration]
        .flatMap((duration) => duration.split(","))
        .map((duration) => {
          const value = Number.parseFloat(duration);
          return duration.trim().endsWith("ms") ? value / 1000 : value;
        })
        .filter(Number.isFinite);
    });
  });

  if (durations.some((duration) => duration > 0.001)) {
    throw new Error("The selected interface still animates when reduced motion is enabled.");
  }
}
