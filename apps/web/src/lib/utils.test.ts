import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges conditional classnames", () => {
    expect(cn("p-2", undefined, "text-sm")).toBe("p-2 text-sm");
  });

  it("resolves tailwind conflicts with the latest value", () => {
    expect(cn("p-2", "p-4", "text-white", "text-black")).toBe("p-4 text-black");
  });
});
