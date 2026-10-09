import { makeSignature } from "better-auth/crypto";
import { expect, test } from "./fixtures";
import { E2E_ADMIN_SESSION_TOKEN, E2E_AUTH_SECRET } from "./e2e-test-data";
import { addE2ESessionCookie } from "./session-cookie";

test("career colors support keyboard selection and visible control boundaries", async ({ context, page }) => {
  await addE2ESessionCookie(context,
    `${E2E_ADMIN_SESSION_TOKEN}.${await makeSignature(E2E_ADMIN_SESSION_TOKEN, E2E_AUTH_SECRET)}`);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/settings");
    const section = page.locator('section[aria-labelledby="career-settings-title"]');
    await section.getByRole("button", { name: /^Editar carrera/ }).filter({ visible: true }).click();
    const group = section.getByRole("radiogroup", { name: "Color en Horarios" });
    await expect(group.getByRole("radio")).toHaveCount(8);
    const blue = group.getByRole("radio", { name: "Azul" });
    const emerald = group.getByRole("radio", { name: "Esmeralda" });
    await blue.focus();
    // Radix selects on the deferred focus event while the arrow key is held.
    await page.keyboard.down("ArrowRight");
    await expect(emerald).toBeFocused();
    await expect(emerald).toBeChecked();
    await page.keyboard.up("ArrowRight");
    const contrast = await blue.evaluate((element) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const drawing = canvas.getContext("2d")!;
      const styles = getComputedStyle(element);
      function luminance(color: string) {
        drawing.clearRect(0, 0, 1, 1);
        drawing.fillStyle = styles.getPropertyValue("--card").trim();
        drawing.fillRect(0, 0, 1, 1);
        drawing.fillStyle = color;
        drawing.fillRect(0, 0, 1, 1);
        const channels = [...drawing.getImageData(0, 0, 1, 1).data].slice(0, 3)
          .map((channel) => channel / 255)
          .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      }
      const values = [luminance(styles.borderTopColor), luminance(styles.backgroundColor)].sort((a, b) => b - a);
      return (values[0] + 0.05) / (values[1] + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(3);
    expect(await group.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    if (width === 390) {
      const targets = await group.locator('label:has([role="radio"])').evaluateAll((labels) =>
        labels.map((label) => ({ width: label.getBoundingClientRect().width, height: label.getBoundingClientRect().height })));
      for (const target of targets) {
        expect(target.width).toBeGreaterThanOrEqual(44);
        expect(target.height).toBeGreaterThanOrEqual(44);
      }
    }
  }
});

test("text inputs render the input boundary and the invalid border over base styles", async ({ context, page }) => {
  await addE2ESessionCookie(context,
    `${E2E_ADMIN_SESSION_TOKEN}.${await makeSignature(E2E_ADMIN_SESSION_TOKEN, E2E_AUTH_SECRET)}`);
  await page.goto("/admin/settings");
  const section = page.locator('section[aria-labelledby="career-settings-title"]');
  const name = section.getByRole("textbox", { name: "Nombre de la carrera" });
  const borderAgainstToken = (token: string) => name.evaluate((element, property) => {
    const probe = document.createElement("span");
    probe.hidden = true;
    probe.style.color = getComputedStyle(element).getPropertyValue(property).trim();
    document.body.append(probe);
    try {
      return { actual: getComputedStyle(element).borderTopColor, expected: getComputedStyle(probe).color };
    } finally {
      probe.remove();
    }
  }, token);

  const boundary = await borderAgainstToken("--input");
  expect(boundary.actual).toBe(boundary.expected);
  await name.evaluate((element) => element.setAttribute("aria-invalid", "true"));
  const invalid = await borderAgainstToken("--destructive");
  expect(invalid.actual).toBe(invalid.expected);
});
