import type { Locator, Page } from "@playwright/test";

type KeyboardSelectTarget = string | { label: string };

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
