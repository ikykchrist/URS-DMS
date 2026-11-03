import { describe, expect, it } from "vitest";
import { assertRequirementActivation } from "./root.requirement.activation";

const group = { id: "group", parentId: null, type: "SECTION", status: "ACTIVE" };
const document = { id: "document", parentId: "group", type: "REQUIREMENT", status: "ACTIVE" };

describe("requirement activation", () => {
  it("rejects empty and group-only templates", () => {
    expect(() => assertRequirementActivation([])).toThrow("active document");
    expect(() => assertRequirementActivation([group])).toThrow("active document");
  });
  it("accepts active root and nested documents", () => {
    expect(() => assertRequirementActivation([group, document])).not.toThrow();
    expect(() => assertRequirementActivation([{ ...document, parentId: null }])).not.toThrow();
  });
  it("rejects inactive, orphaned and cyclic requirement branches", () => {
    for (const nodes of [[group, { ...document, status: "INACTIVE" }], [{ ...group, status: "INACTIVE" }, document], [document], [{ ...group, parentId: "document" }, document]]) {
      expect(() => assertRequirementActivation(nodes)).toThrow("active document");
    }
  });
});
