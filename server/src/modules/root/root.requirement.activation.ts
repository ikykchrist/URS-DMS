import { BadRequestError } from "@/utils/errors";

interface ActivationNode { id: string; parentId: string | null; type: string; status: string }

export function assertRequirementActivation(nodes: ActivationNode[]): void {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const hasDocument = nodes.some((node) => {
    if (node.type === "SECTION" || node.status !== "ACTIVE") return false;
    const seen = new Set([node.id]);
    let parentId = node.parentId;
    while (parentId) {
      if (seen.has(parentId)) return false;
      seen.add(parentId);
      const parent = byId.get(parentId);
      if (!parent || parent.status !== "ACTIVE") return false;
      parentId = parent.parentId;
    }
    return true;
  });
  if (!hasDocument) throw new BadRequestError("Add at least one active document requirement before activating this template.");
}
