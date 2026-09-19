import { describe, expect, it } from "vitest";
import { defaultCategoryNames } from "../drizzle/schema";
import { appRouter } from "./routers";

describe("cosmetics product manager foundation", () => {
  it("includes the four required Kurdish starter categories", () => {
    expect(defaultCategoryNames).toEqual(["پێست", "قژ", "قەڵەوکردن", "نینۆک"]);
  });

  it("exposes the shared product and category routers", () => {
    const record = (appRouter as any)._def.record;
    expect(record.products).toBeDefined();
    expect(record.categories).toBeDefined();
    expect(record.media).toBeDefined();
  });
});
