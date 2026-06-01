import { expect, test } from "@playwright/test";

const interactiveSelector = [
  "button",
  "a[href]",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "[role='button']"
].join(",");

test("visible controls keep text inside their boxes and do not overlap", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const issues = await page.evaluate((selector) => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      });

    const textOverflow = elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const hasHorizontalOverflow = element.scrollWidth > Math.ceil(element.clientWidth) + 1;
      const hasVerticalOverflow = element.scrollHeight > Math.ceil(element.clientHeight) + 1;
      if (!hasHorizontalOverflow && !hasVerticalOverflow) return [];
      return [`Text overflow in ${labelFor(element)} (${Math.round(rect.width)}x${Math.round(rect.height)})`];
    });

    const overlaps: string[] = [];
    for (let leftIndex = 0; leftIndex < elements.length; leftIndex += 1) {
      const left = elements[leftIndex];
      const leftRect = left.getBoundingClientRect();
      for (let rightIndex = leftIndex + 1; rightIndex < elements.length; rightIndex += 1) {
        const right = elements[rightIndex];
        if (left.contains(right) || right.contains(left)) continue;
        const rightRect = right.getBoundingClientRect();
        const xOverlap = Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left);
        const yOverlap = Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top);
        if (xOverlap > 2 && yOverlap > 2) overlaps.push(`Overlap: ${labelFor(left)} with ${labelFor(right)}`);
      }
    }

    return [...textOverflow, ...overlaps];

    function labelFor(element: HTMLElement) {
      const text = element.innerText || element.getAttribute("aria-label") || element.getAttribute("placeholder") || element.tagName;
      return text.trim().replace(/\s+/g, " ").slice(0, 80);
    }
  }, interactiveSelector);

  expect(issues).toEqual([]);
});
