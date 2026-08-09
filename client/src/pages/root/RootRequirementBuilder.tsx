import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileCheck2,
  FileText,
  FolderTree,
  GripVertical,
  History,
  Layers3,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { toast } from "@/lib/toast";
import {
  archiveRequirementNode,
  archiveRequirementTemplate,
  archiveRequirementValidation,
  assignRequirementTemplate,
  createAccreditationCycle,
  createRequirementNode,
  createRequirementTemplate,
  createRequirementValidation,
  getRequirementTemplate,
  listRequirementAssignments,
  listRequirementHistory,
  listRequirementNodes,
  listRequirementTargetOptions,
  listRequirementTemplates,
  listRequirementVersions,
  moveRequirementNode,
  restoreRequirementNode,
  restoreRequirementTemplate,
  rollbackRequirementTemplate,
  unassignRequirementTemplate,
  updateRequirementNode,
  updateRequirementTemplate,
  updateRequirementValidation,
  type RequirementAssignment,
  type RequirementAssignmentTargetType,
  type RequirementChangeType,
  type RequirementHistoryEntry,
  type RequirementNodeType,
  type RequirementTargetOption,
  type RequirementTemplate,
  type RequirementTemplateDetail,
  type RequirementTemplateStatus,
  type RequirementTreeNode,
  type RequirementValidation,
  type RequirementValidationInput,
  type RequirementValidationSeverity,
  type RequirementValidationType,
  type RequirementVersion,
} from "@/services/root";

const PAGE_SIZE = 10;
const HISTORY_PAGE_SIZE = 20;
const ALL = "ALL";
const NO_TARGET = "__NO_TARGET__";

type MainTab = "builder" | "assignments" | "history";
type TemplateDialog =
  | { mode: "create" }
  | { mode: "edit"; template: RequirementTemplate };
type NodeDialog =
  | { mode: "create"; parentId: string | null; parentName: string | null }
  | { mode: "edit"; node: RequirementTreeNode };

interface TemplateForm {
  name: string;
  code: string;
  description: string;
  category: string;
  status: RequirementTemplateStatus;
}

interface NodeForm {
  code: string;
  name: string;
  description: string;
  helpText: string;
  type: RequirementNodeType;
  status: "ACTIVE" | "INACTIVE";
  isRequired: boolean;
  allowMultiple: boolean;
}

interface RuleForm {
  type: RequirementValidationType;
  severity: RequirementValidationSeverity;
  message: string;
  enabled: boolean;
  valueOne: string;
  valueTwo: string;
}

const EMPTY_TEMPLATE: TemplateForm = {
  name: "",
  code: "",
  description: "",
  category: "AACCUP",
  status: "ACTIVE",
};

const EMPTY_NODE: NodeForm = {
  code: "",
  name: "",
  description: "",
  helpText: "",
  type: "REQUIREMENT",
  status: "ACTIVE",
  isRequired: true,
  allowMultiple: false,
};

const EMPTY_RULE: RuleForm = {
  type: "FILE_TYPE",
  severity: "ERROR",
  message: "",
  enabled: true,
  valueOne: "application/pdf",
  valueTwo: ".pdf",
};

const TARGET_TYPES: Array<{
  value: RequirementAssignmentTargetType;
  label: string;
}> = [
  { value: "UNIVERSITY", label: "University" },
  { value: "COLLEGE", label: "College" },
  { value: "DEPARTMENT", label: "Department" },
  { value: "PROGRAM", label: "Program" },
  { value: "OFFICE", label: "Office" },
  { value: "AACCUP_AREA", label: "AACCUP Area" },
  { value: "ACCREDITATION_CYCLE", label: "Accreditation Cycle" },
];

const NODE_TYPES: Array<{ value: RequirementNodeType; label: string }> = [
  { value: "SECTION", label: "Section" },
  { value: "REQUIREMENT", label: "Requirement" },
  { value: "SUB_REQUIREMENT", label: "Sub-requirement" },
  { value: "SUPPORTING_DOCUMENT", label: "Supporting document" },
];

const RULE_TYPES: Array<{ value: RequirementValidationType; label: string }> = [
  { value: "FILE_TYPE", label: "File type" },
  { value: "FILE_SIZE", label: "File size" },
  { value: "PAGE_COUNT", label: "Page count" },
  { value: "EXPIRATION_DATE", label: "Expiration date" },
  { value: "NAMING_CONVENTION", label: "Naming convention" },
  { value: "METADATA", label: "Required metadata" },
];

const HISTORY_ACTIONS: RequirementChangeType[] = [
  "CREATED",
  "UPDATED",
  "ASSIGNED",
  "ARCHIVED",
  "RESTORED",
  "ROLLED_BACK",
];

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function flatten(nodes: RequirementTreeNode[]): RequirementTreeNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

function nodeTypeLabel(type: RequirementNodeType): string {
  return NODE_TYPES.find((item) => item.value === type)?.label ?? type;
}

function targetLabel(type: RequirementAssignmentTargetType): string {
  return TARGET_TYPES.find((item) => item.value === type)?.label ?? type;
}

function ruleLabel(type: RequirementValidationType): string {
  return RULE_TYPES.find((item) => item.value === type)?.label ?? type;
}

function nodeIcon(type: RequirementNodeType) {
  switch (type) {
    case "SECTION":
      return Layers3;
    case "SUPPORTING_DOCUMENT":
      return FileText;
    case "SUB_REQUIREMENT":
      return ListChecks;
    default:
      return FileCheck2;
  }
}

function ruleFormFromValidation(rule: RequirementValidation): RuleForm {
  const config = rule.config;
  switch (rule.type) {
    case "FILE_TYPE":
      return {
        type: rule.type,
        severity: rule.severity,
        message: rule.message ?? "",
        enabled: rule.enabled,
        valueOne: Array.isArray(config.allowedMimeTypes)
          ? config.allowedMimeTypes.join(", ")
          : "",
        valueTwo: Array.isArray(config.allowedExtensions)
          ? config.allowedExtensions.join(", ")
          : "",
      };
    case "FILE_SIZE":
      return {
        type: rule.type,
        severity: rule.severity,
        message: rule.message ?? "",
        enabled: rule.enabled,
        valueOne: config.minBytes == null ? "" : String(config.minBytes),
        valueTwo: config.maxBytes == null ? "" : String(config.maxBytes),
      };
    case "PAGE_COUNT":
      return {
        type: rule.type,
        severity: rule.severity,
        message: rule.message ?? "",
        enabled: rule.enabled,
        valueOne: config.minPages == null ? "" : String(config.minPages),
        valueTwo: config.maxPages == null ? "" : String(config.maxPages),
      };
    case "EXPIRATION_DATE":
      return {
        type: rule.type,
        severity: rule.severity,
        message: rule.message ?? "",
        enabled: rule.enabled,
        valueOne:
          config.minDaysFromNow == null ? "" : String(config.minDaysFromNow),
        valueTwo:
          config.maxDaysFromNow == null ? "" : String(config.maxDaysFromNow),
      };
    case "NAMING_CONVENTION":
      return {
        type: rule.type,
        severity: rule.severity,
        message: rule.message ?? "",
        enabled: rule.enabled,
        valueOne: typeof config.pattern === "string" ? config.pattern : "",
        valueTwo: typeof config.example === "string" ? config.example : "",
      };
    case "METADATA":
      return {
        type: rule.type,
        severity: rule.severity,
        message: rule.message ?? "",
        enabled: rule.enabled,
        valueOne: Array.isArray(config.requiredKeys)
          ? config.requiredKeys.join(", ")
          : "",
        valueTwo: "",
      };
  }
}

function numberOrUndefined(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function csv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function validationInput(form: RuleForm): RequirementValidationInput {
  let config: Record<string, unknown>;
  switch (form.type) {
    case "FILE_TYPE":
      config = {
        allowedMimeTypes: csv(form.valueOne),
        allowedExtensions: csv(form.valueTwo),
      };
      break;
    case "FILE_SIZE":
      config = {
        minBytes: numberOrUndefined(form.valueOne),
        maxBytes: numberOrUndefined(form.valueTwo),
      };
      break;
    case "PAGE_COUNT":
      config = {
        minPages: numberOrUndefined(form.valueOne),
        maxPages: numberOrUndefined(form.valueTwo),
      };
      break;
    case "EXPIRATION_DATE":
      config = {
        required: true,
        minDaysFromNow: numberOrUndefined(form.valueOne),
        maxDaysFromNow: numberOrUndefined(form.valueTwo),
      };
      break;
    case "NAMING_CONVENTION":
      config = {
        pattern: form.valueOne,
        caseInsensitive: false,
        example: form.valueTwo || undefined,
      };
      break;
    case "METADATA":
      config = { requiredKeys: csv(form.valueOne) };
      break;
  }
  return {
    type: form.type,
    config,
    message: form.message || null,
    severity: form.severity,
    enabled: form.enabled,
    sortOrder: 0,
  };
}

function InlineError({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
      <CircleAlert className="h-5 w-5 text-red-500" />
      <p className="max-w-lg text-[13px] text-gray-600">{message}</p>
      <Button size="sm" variant="outline" onClick={retry}>
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}

function RequirementBranch({
  node,
  depth,
  expanded,
  busy,
  onToggle,
  onAction,
  onDropNode,
}: {
  node: RequirementTreeNode;
  depth: number;
  expanded: ReadonlySet<string>;
  busy: boolean;
  onToggle: (id: string) => void;
  onAction: (
    action: "add" | "edit" | "rules" | "up" | "down" | "archive",
    node: RequirementTreeNode,
  ) => void;
  onDropNode: (sourceId: string, target: RequirementTreeNode) => void;
}) {
  const open = expanded.has(node.id);
  const Icon = nodeIcon(node.type);
  return (
    <li>
      <div
        className="group flex min-h-14 items-center gap-2 border-b border-slate-100 px-2 py-2 transition-colors hover:bg-slate-50"
        style={{ paddingLeft: depth * 20 + 8 }}
        draggable={!busy}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/requirement-node", node.id);
        }}
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("text/requirement-node"))
            event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const sourceId = event.dataTransfer.getData("text/requirement-node");
          if (sourceId && sourceId !== node.id) onDropNode(sourceId, node);
        }}
      >
        <GripVertical className="hidden h-4 w-4 shrink-0 cursor-grab text-slate-300 sm:block" />
        {node.children.length > 0 ? (
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
            onClick={() => onToggle(node.id)}
            aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
          >
            {open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="h-7 w-7" />
        )}
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${node.type === "SECTION" ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-slate-900">
              {node.name}
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {node.code}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{nodeTypeLabel(node.type)}</Badge>
            {node.isRequired && node.type !== "SECTION" && (
              <Badge variant="warning">Required</Badge>
            )}
            {node.validations.length > 0 && (
              <Badge variant="success">
                <ShieldCheck className="mr-1 h-3 w-3" />
                {node.validations.length} rules
              </Badge>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={busy}
              aria-label={`Actions for ${node.name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={() => onAction("add", node)}>
              <Plus className="mr-2 h-4 w-4" />
              Add child
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAction("edit", node)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit node
            </DropdownMenuItem>
            {node.type !== "SECTION" && (
              <DropdownMenuItem onSelect={() => onAction("rules", node)}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Validation rules
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onAction("up", node)}>
              <ArrowUp className="mr-2 h-4 w-4" />
              Move up
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAction("down", node)}>
              <ArrowDown className="mr-2 h-4 w-4" />
              Move down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onSelect={() => onAction("archive", node)}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive subtree
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {open && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <RequirementBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              busy={busy}
              onToggle={onToggle}
              onAction={onAction}
              onDropNode={onDropNode}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function RootRequirementBuilder() {
  const [mainTab, setMainTab] = useState<MainTab>("builder");
  const [templates, setTemplates] = useState<RequirementTemplate[]>([]);
  const [templatePage, setTemplatePage] = useState(1);
  const [templatePages, setTemplatePages] = useState(1);
  const [templateTotal, setTemplateTotal] = useState(0);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState<
    RequirementTemplateStatus | typeof ALL
  >(ALL);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const templateRequest = useRef(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RequirementTemplateDetail | null>(null);
  const [allNodes, setAllNodes] = useState<RequirementTreeNode[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const detailRequest = useRef(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const [templateDialog, setTemplateDialog] = useState<TemplateDialog | null>(
    null,
  );
  const [templateForm, setTemplateForm] = useState<TemplateForm>({
    ...EMPTY_TEMPLATE,
  });
  const [nodeDialog, setNodeDialog] = useState<NodeDialog | null>(null);
  const [nodeForm, setNodeForm] = useState<NodeForm>({ ...EMPTY_NODE });
  const [archiveTemplateTarget, setArchiveTemplateTarget] =
    useState<RequirementTemplate | null>(null);
  const [archiveNodeTarget, setArchiveNodeTarget] =
    useState<RequirementTreeNode | null>(null);

  const [ruleNode, setRuleNode] = useState<RequirementTreeNode | null>(null);
  const [editingRule, setEditingRule] = useState<RequirementValidation | null>(
    null,
  );
  const [ruleForm, setRuleForm] = useState<RuleForm>({ ...EMPTY_RULE });

  const [assignments, setAssignments] = useState<RequirementAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentType, setAssignmentType] =
    useState<RequirementAssignmentTargetType>("UNIVERSITY");
  const [assignmentTarget, setAssignmentTarget] = useState(NO_TARGET);
  const [targetOptions, setTargetOptions] = useState<RequirementTargetOption[]>(
    [],
  );
  const [targetsLoading, setTargetsLoading] = useState(false);

  const [cycleOpen, setCycleOpen] = useState(false);
  const [cycleForm, setCycleForm] = useState({
    code: "",
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  const [historyRows, setHistoryRows] = useState<RequirementHistoryEntry[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  const [historyAction, setHistoryAction] = useState<
    RequirementChangeType | typeof ALL
  >(ALL);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [versionTemplate, setVersionTemplate] =
    useState<RequirementTemplate | null>(null);
  const [versions, setVersions] = useState<RequirementVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [rollbackTarget, setRollbackTarget] =
    useState<RequirementVersion | null>(null);
  const [rollbackNote, setRollbackNote] = useState("");

  const loadTemplates = useCallback(async () => {
    const requestId = ++templateRequest.current;
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const result = await listRequirementTemplates({
        page: templatePage,
        pageSize: PAGE_SIZE,
        q: deferredSearch.trim() || undefined,
        status: statusFilter === ALL ? undefined : statusFilter,
        includeArchived: includeArchived || undefined,
      });
      if (requestId !== templateRequest.current) return;
      setTemplates(result.items);
      setTemplatePages(Math.max(1, result.meta.totalPages));
      setTemplateTotal(result.meta.total);
      setSelectedId((current) => {
        if (current && result.items.some((template) => template.id === current))
          return current;
        return result.items[0]?.id ?? null;
      });
    } catch (error) {
      if (requestId === templateRequest.current)
        setTemplatesError(
          errorText(error, "Failed to load requirement templates"),
        );
    } finally {
      if (requestId === templateRequest.current) setTemplatesLoading(false);
    }
  }, [deferredSearch, includeArchived, statusFilter, templatePage]);

  const loadDetail = useCallback(async (id: string, showLoading = true) => {
    const requestId = ++detailRequest.current;
    if (showLoading) setDetailLoading(true);
    setDetailError(null);
    try {
      const [nextDetail, nodesWithArchived] = await Promise.all([
        getRequirementTemplate(id),
        listRequirementNodes(id, { includeArchived: true }),
      ]);
      if (requestId !== detailRequest.current) return;
      setDetail(nextDetail);
      setAllNodes(nodesWithArchived);
      setExpanded((current) =>
        current.size
          ? current
          : new Set(nextDetail.tree.map((node) => node.id)),
      );
    } catch (error) {
      if (requestId === detailRequest.current)
        setDetailError(errorText(error, "Failed to load template detail"));
    } finally {
      if (requestId === detailRequest.current) setDetailLoading(false);
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    setAssignmentsLoading(true);
    setAssignmentsError(null);
    try {
      setAssignments(await listRequirementAssignments());
    } catch (error) {
      setAssignmentsError(errorText(error, "Failed to load assignments"));
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const result = await listRequirementHistory({
        page: historyPage,
        pageSize: HISTORY_PAGE_SIZE,
        action: historyAction === ALL ? undefined : historyAction,
      });
      setHistoryRows(result.items);
      setHistoryPages(Math.max(1, result.meta.totalPages));
    } catch (error) {
      setHistoryError(errorText(error, "Failed to load requirement history"));
    } finally {
      setHistoryLoading(false);
    }
  }, [historyAction, historyPage]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);
  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [loadDetail, selectedId]);
  useEffect(() => {
    if (mainTab === "assignments") void loadAssignments();
  }, [loadAssignments, mainTab]);
  useEffect(() => {
    if (mainTab === "history") void loadHistory();
  }, [loadHistory, mainTab]);

  const refresh = useCallback(async () => {
    await loadTemplates();
    if (selectedId) await loadDetail(selectedId, false);
    if (mainTab === "assignments") await loadAssignments();
    if (mainTab === "history") await loadHistory();
  }, [
    loadAssignments,
    loadDetail,
    loadHistory,
    loadTemplates,
    mainTab,
    selectedId,
  ]);

  const run = async (
    key: string,
    task: () => Promise<unknown>,
    success: string,
  ) => {
    setBusy(key);
    try {
      await task();
      toast.success(success);
      await refresh();
    } catch (error) {
      toast.error(errorText(error, "Operation failed"));
    } finally {
      setBusy(null);
    }
  };

  const openCreateTemplate = () => {
    setTemplateForm({ ...EMPTY_TEMPLATE });
    setTemplateDialog({ mode: "create" });
  };

  const openEditTemplate = (template: RequirementTemplate) => {
    setTemplateForm({
      name: template.name,
      code: template.code,
      description: template.description ?? "",
      category: template.category ?? "",
      status: template.status,
    });
    setTemplateDialog({ mode: "edit", template });
  };

  const saveTemplate = async () => {
    if (
      !templateDialog ||
      !templateForm.name.trim() ||
      !templateForm.code.trim()
    )
      return;
    await run(
      "template",
      async () => {
        if (templateDialog.mode === "create") {
          const created = await createRequirementTemplate({
            ...templateForm,
            description: templateForm.description || null,
            category: templateForm.category || null,
          });
          setSelectedId(created.template.id);
        } else {
          await updateRequirementTemplate(templateDialog.template.id, {
            ...templateForm,
            description: templateForm.description || null,
            category: templateForm.category || null,
          });
        }
        setTemplateDialog(null);
      },
      templateDialog.mode === "create"
        ? "Requirement template created"
        : "Requirement template updated",
    );
  };

  const openNode = (dialog: NodeDialog) => {
    if (dialog.mode === "create") setNodeForm({ ...EMPTY_NODE });
    else {
      setNodeForm({
        code: dialog.node.code,
        name: dialog.node.name,
        description: dialog.node.description ?? "",
        helpText: dialog.node.helpText ?? "",
        type: dialog.node.type,
        status: dialog.node.status,
        isRequired: dialog.node.isRequired,
        allowMultiple: dialog.node.allowMultiple,
      });
    }
    setNodeDialog(dialog);
  };

  const saveNode = async () => {
    if (
      !detail ||
      !nodeDialog ||
      !nodeForm.code.trim() ||
      !nodeForm.name.trim()
    )
      return;
    await run(
      "node",
      async () => {
        const payload = {
          ...nodeForm,
          description: nodeForm.description || null,
          helpText: nodeForm.helpText || null,
        };
        if (nodeDialog.mode === "create") {
          await createRequirementNode(detail.template.id, {
            ...payload,
            parentId: nodeDialog.parentId,
          });
        } else {
          await updateRequirementNode(
            detail.template.id,
            nodeDialog.node.id,
            payload,
          );
        }
        setNodeDialog(null);
      },
      nodeDialog.mode === "create"
        ? "Requirement node created"
        : "Requirement node updated",
    );
  };

  const reorderNode = async (node: RequirementTreeNode, delta: number) => {
    if (!detail) return;
    const siblings = flatten(detail.tree).filter(
      (candidate) => candidate.parentId === node.parentId,
    );
    const currentIndex = siblings.findIndex(
      (candidate) => candidate.id === node.id,
    );
    const nextIndex = currentIndex + delta;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= siblings.length)
      return;
    await run(
      `move-${node.id}`,
      () =>
        moveRequirementNode(
          detail.template.id,
          node.id,
          node.parentId,
          nextIndex,
        ),
      "Node reordered",
    );
  };

  const dropNode = async (sourceId: string, target: RequirementTreeNode) => {
    if (!detail) return;
    const source = flatten(detail.tree).find((node) => node.id === sourceId);
    if (!source) return;
    await run(
      `move-${source.id}`,
      () =>
        moveRequirementNode(
          detail.template.id,
          source.id,
          target.id,
          target.children.length,
        ),
      `Moved ${source.name} under ${target.name}`,
    );
  };

  const handleNodeAction = (
    action: "add" | "edit" | "rules" | "up" | "down" | "archive",
    node: RequirementTreeNode,
  ) => {
    if (action === "add")
      openNode({ mode: "create", parentId: node.id, parentName: node.name });
    if (action === "edit") openNode({ mode: "edit", node });
    if (action === "rules") {
      setRuleNode(node);
      setEditingRule(null);
      setRuleForm({ ...EMPTY_RULE });
    }
    if (action === "up") void reorderNode(node, -1);
    if (action === "down") void reorderNode(node, 1);
    if (action === "archive") setArchiveNodeTarget(node);
  };

  const saveRule = async () => {
    if (!detail || !ruleNode) return;
    const input = validationInput(ruleForm);
    await run(
      "rule",
      async () => {
        if (editingRule) {
          await updateRequirementValidation(
            detail.template.id,
            ruleNode.id,
            editingRule.id,
            input,
          );
        } else {
          await createRequirementValidation(
            detail.template.id,
            ruleNode.id,
            input,
          );
        }
        const next = await getRequirementTemplate(detail.template.id);
        const refreshedNode =
          flatten(next.tree).find((node) => node.id === ruleNode.id) ?? null;
        setDetail(next);
        setRuleNode(refreshedNode);
        setEditingRule(null);
        setRuleForm({ ...EMPTY_RULE });
      },
      editingRule ? "Validation rule updated" : "Validation rule added",
    );
  };

  const archiveRule = async (ruleId: string) => {
    if (!detail || !ruleNode) return;
    const nodeId = ruleNode.id;
    await run(
      `archive-rule-${ruleId}`,
      async () => {
        await archiveRequirementValidation(detail.template.id, nodeId, ruleId);
        const next = await getRequirementTemplate(detail.template.id);
        const refreshedNode =
          flatten(next.tree).find((node) => node.id === nodeId) ?? null;
        setDetail(next);
        setRuleNode(refreshedNode);
      },
      "Validation rule archived",
    );
  };

  const loadTargets = async (type: RequirementAssignmentTargetType) => {
    setAssignmentType(type);
    setAssignmentTarget(NO_TARGET);
    if (type === "UNIVERSITY") {
      setTargetOptions([]);
      return;
    }
    setTargetsLoading(true);
    try {
      setTargetOptions(await listRequirementTargetOptions(type));
    } catch (error) {
      toast.error(errorText(error, "Failed to load assignment targets"));
      setTargetOptions([]);
    } finally {
      setTargetsLoading(false);
    }
  };

  const openAssignment = () => {
    setAssignmentOpen(true);
    void loadTargets("UNIVERSITY");
  };

  const saveAssignment = async () => {
    if (!detail) return;
    if (assignmentType !== "UNIVERSITY" && assignmentTarget === NO_TARGET)
      return;
    await run(
      "assign",
      async () => {
        await assignRequirementTemplate(
          detail.template.id,
          assignmentType,
          assignmentType === "UNIVERSITY" ? null : assignmentTarget,
        );
        setAssignmentOpen(false);
      },
      "Requirement template assigned",
    );
  };

  const openVersions = async (template: RequirementTemplate) => {
    setVersionTemplate(template);
    setVersionsLoading(true);
    try {
      setVersions(await listRequirementVersions(template.id));
    } catch (error) {
      toast.error(errorText(error, "Failed to load versions"));
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  const selectedTemplate = detail?.template ?? null;
  const liveNodes = detail?.tree ?? [];
  const archivedNodes = flatten(allNodes).filter((node) => node.deletedAt);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Requirement Builder"
        description="Author versioned accreditation structures, upload rules, and organization assignments."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void refresh()}
              disabled={Boolean(busy)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={openCreateTemplate}>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>
        }
      />

      <Tabs
        value={mainTab}
        onValueChange={(value) => setMainTab(value as MainTab)}
        className="mt-6"
      >
        <TabsList className="grid w-full max-w-xl grid-cols-3 overflow-x-auto">
          <TabsTrigger value="builder">
            <FolderTree className="mr-2 h-4 w-4" />
            Builder
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <Users className="mr-2 h-4 w-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-5">
          <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
            <Card className="h-fit overflow-hidden border-slate-200/80">
              <CardHeader className="space-y-4 border-b border-slate-100 bg-slate-50/60 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[14px]">
                    Template Library
                  </CardTitle>
                  <Badge variant="secondary">{templateTotal}</Badge>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setTemplatePage(1);
                    }}
                    placeholder="Search templates"
                    className="pl-9"
                  />
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value as typeof statusFilter);
                      setTemplatePage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All statuses</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 text-[11px] text-slate-600">
                    <Switch
                      checked={includeArchived}
                      onCheckedChange={(value) => {
                        setIncludeArchived(value);
                        setTemplatePage(1);
                      }}
                    />
                    Archived
                  </label>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {templatesLoading ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 4 }, (_, index) => (
                      <Skeleton
                        key={index}
                        variant="rectangular"
                        className="h-20"
                      />
                    ))}
                  </div>
                ) : templatesError ? (
                  <InlineError
                    message={templatesError}
                    retry={() => void loadTemplates()}
                  />
                ) : templates.length === 0 ? (
                  <EmptyState
                    variant="documents"
                    title="No requirement templates"
                    description="Create a template to replace hardcoded accreditation requirements."
                    action={{
                      label: "New Template",
                      onClick: openCreateTemplate,
                    }}
                  />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedId(template.id)}
                        className={`w-full px-4 py-3 text-left transition-colors ${selectedId === template.id ? "bg-indigo-50/80 ring-1 ring-inset ring-indigo-100" : "hover:bg-slate-50"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-slate-900">
                              {template.name}
                            </p>
                            <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                              {template.code} / v{template.version}
                            </p>
                          </div>
                          {template.deletedAt ? (
                            <Badge variant="danger">Archived</Badge>
                          ) : (
                            <Badge
                              variant={
                                template.status === "ACTIVE"
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {template.status}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 flex gap-3 text-[11px] text-slate-500">
                          <span>{template.nodeCount} nodes</span>
                          <span>{template.validationCount} rules</span>
                          <span>{template.assignmentCount} scopes</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={templatePage <= 1}
                    onClick={() => setTemplatePage((page) => page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-[11px] text-slate-500">
                    {templatePage} / {templatePages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={templatePage >= templatePages}
                    onClick={() => setTemplatePage((page) => page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>

            {detailLoading ? (
              <Card>
                <CardContent className="space-y-3 p-6">
                  <Skeleton variant="text" className="h-7 w-56" />
                  <Skeleton variant="rectangular" className="h-24" />
                  <Skeleton variant="rectangular" className="h-72" />
                </CardContent>
              </Card>
            ) : detailError ? (
              <Card>
                <InlineError
                  message={detailError}
                  retry={() => selectedId && void loadDetail(selectedId)}
                />
              </Card>
            ) : !selectedTemplate ? (
              <Card>
                <EmptyState
                  variant="tasks"
                  title="Select a template"
                  description="Choose a template from the library to edit its requirement tree."
                />
              </Card>
            ) : (
              <div className="space-y-5">
                <Card className="overflow-hidden border-slate-200/80">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-slate-950">
                            {selectedTemplate.name}
                          </h2>
                          <Badge variant="outline">
                            v{selectedTemplate.version}
                          </Badge>
                          {selectedTemplate.deletedAt && (
                            <Badge variant="danger">Archived</Badge>
                          )}
                        </div>
                        <p className="mt-1 max-w-3xl text-[13px] text-slate-500">
                          {selectedTemplate.description ||
                            "No description provided."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void openVersions(selectedTemplate)}
                        >
                          <Clock3 className="mr-1.5 h-4 w-4" />
                          Versions
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditTemplate(selectedTemplate)}
                          disabled={Boolean(selectedTemplate.deletedAt)}
                        >
                          <Pencil className="mr-1.5 h-4 w-4" />
                          Edit
                        </Button>
                        {selectedTemplate.deletedAt ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              void run(
                                "restore-template",
                                () =>
                                  restoreRequirementTemplate(
                                    selectedTemplate.id,
                                  ),
                                "Template restored",
                              )
                            }
                          >
                            <RotateCcw className="mr-1.5 h-4 w-4" />
                            Restore
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() =>
                              setArchiveTemplateTarget(selectedTemplate)
                            }
                          >
                            <Archive className="mr-1.5 h-4 w-4" />
                            Archive
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        ["Nodes", selectedTemplate.nodeCount],
                        ["Rules", selectedTemplate.validationCount],
                        ["Assignments", selectedTemplate.assignmentCount],
                        ["Category", selectedTemplate.category ?? "None"],
                      ].map(([label, value]) => (
                        <div
                          key={String(label)}
                          className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3"
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {label}
                          </p>
                          <p className="mt-1 truncate text-[14px] font-semibold text-slate-800">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-slate-200/80">
                  <CardHeader className="flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 pb-4">
                    <div>
                      <CardTitle className="text-[14px]">
                        Requirement Tree
                      </CardTitle>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Drag a node onto another node to nest it. Use move
                        controls to reorder siblings.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        openNode({
                          mode: "create",
                          parentId: null,
                          parentName: null,
                        })
                      }
                      disabled={Boolean(selectedTemplate.deletedAt)}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Root Node
                    </Button>
                  </CardHeader>
                  <CardContent
                    className="p-0"
                    onDragOver={(event) => {
                      if (
                        event.dataTransfer.types.includes(
                          "text/requirement-node",
                        )
                      )
                        event.preventDefault();
                    }}
                    onDrop={(event) => {
                      const sourceId = event.dataTransfer.getData(
                        "text/requirement-node",
                      );
                      if (sourceId && detail)
                        void run(
                          `move-${sourceId}`,
                          () =>
                            moveRequirementNode(
                              detail.template.id,
                              sourceId,
                              null,
                              liveNodes.length,
                            ),
                          "Moved node to root",
                        );
                    }}
                  >
                    {liveNodes.length === 0 ? (
                      <EmptyState
                        variant="tasks"
                        title="No requirement nodes"
                        description="Start with a section or requirement, then nest as deeply as needed."
                        action={{
                          label: "Add Root Node",
                          onClick: () =>
                            openNode({
                              mode: "create",
                              parentId: null,
                              parentName: null,
                            }),
                        }}
                      />
                    ) : (
                      <ul>
                        {liveNodes.map((node) => (
                          <RequirementBranch
                            key={node.id}
                            node={node}
                            depth={0}
                            expanded={expanded}
                            busy={Boolean(busy)}
                            onToggle={(id) =>
                              setExpanded((current) => {
                                const next = new Set(current);
                                if (next.has(id)) next.delete(id);
                                else next.add(id);
                                return next;
                              })
                            }
                            onAction={handleNodeAction}
                            onDropNode={(source, target) =>
                              void dropNode(source, target)
                            }
                          />
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {archivedNodes.length > 0 && (
                  <Card className="border-dashed border-slate-300">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-[13px] text-slate-600">
                        Archived Nodes ({archivedNodes.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2 sm:grid-cols-2">
                      {archivedNodes.map((node) => (
                        <div
                          key={node.id}
                          className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-medium text-slate-700">
                              {node.name}
                            </p>
                            <p className="font-mono text-[10px] text-slate-400">
                              {node.code}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              detail &&
                              void run(
                                `restore-${node.id}`,
                                () =>
                                  restoreRequirementNode(
                                    detail.template.id,
                                    node.id,
                                  ),
                                "Node subtree restored",
                              )
                            }
                          >
                            <RotateCcw className="mr-1 h-3.5 w-3.5" />
                            Restore
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="mt-5">
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <CardTitle className="text-[15px]">Assignment Matrix</CardTitle>
                <p className="mt-1 text-[12px] text-slate-500">
                  The most specific active scope wins for each AACCUP area.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCycleOpen(true)}
                >
                  <CalendarRange className="mr-1.5 h-4 w-4" />
                  New Cycle
                </Button>
                <Button size="sm" onClick={openAssignment} disabled={!detail}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Assign Selected
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {assignmentsLoading ? (
                <div className="space-y-2 p-5">
                  <Skeleton variant="rectangular" className="h-12" />
                  <Skeleton variant="rectangular" className="h-12" />
                </div>
              ) : assignmentsError ? (
                <InlineError
                  message={assignmentsError}
                  retry={() => void loadAssignments()}
                />
              ) : assignments.length === 0 ? (
                <EmptyState
                  variant="users"
                  title="No assignments"
                  description="Assign the selected template to a university or organization scope."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Template</TableHead>
                        <TableHead>Scope</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">
                            {assignment.templateName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {targetLabel(assignment.targetType)}
                            </Badge>
                          </TableCell>
                          <TableCell>{assignment.targetName}</TableCell>
                          <TableCell className="text-slate-500">
                            {formatDate(assignment.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() =>
                                void run(
                                  `unassign-${assignment.id}`,
                                  () =>
                                    unassignRequirementTemplate(assignment.id),
                                  "Assignment removed",
                                )
                              }
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-5">
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <CardTitle className="text-[15px]">Change History</CardTitle>
                <p className="mt-1 text-[12px] text-slate-500">
                  Append-only engine history, separate from the platform audit
                  log.
                </p>
              </div>
              <Select
                value={historyAction}
                onValueChange={(value) => {
                  setHistoryAction(value as typeof historyAction);
                  setHistoryPage(1);
                }}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All actions</SelectItem>
                  {HISTORY_ACTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0">
              {historyLoading ? (
                <div className="space-y-2 p-5">
                  <Skeleton variant="rectangular" className="h-12" />
                  <Skeleton variant="rectangular" className="h-12" />
                </div>
              ) : historyError ? (
                <InlineError
                  message={historyError}
                  retry={() => void loadHistory()}
                />
              ) : historyRows.length === 0 ? (
                <EmptyState
                  variant="activity"
                  title="No changes recorded"
                  description="Template mutations will appear here with actor and version details."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Template ID</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Badge
                              variant={
                                row.action === "ROLLED_BACK"
                                  ? "warning"
                                  : row.action === "ARCHIVED"
                                    ? "danger"
                                    : "outline"
                              }
                            >
                              {row.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-48 truncate font-mono text-[11px]">
                            {row.templateId}
                          </TableCell>
                          <TableCell>
                            {row.versionFrom ?? "-"} to {row.versionTo ?? "-"}
                          </TableCell>
                          <TableCell>{row.actorName ?? "System"}</TableCell>
                          <TableCell className="text-slate-500">
                            {formatDate(row.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="flex justify-end gap-2 border-t border-slate-100 p-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((page) => page - 1)}
                >
                  Previous
                </Button>
                <span className="self-center text-[11px] text-slate-500">
                  {historyPage} / {historyPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={historyPage >= historyPages}
                  onClick={() => setHistoryPage((page) => page + 1)}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(templateDialog)}
        onOpenChange={(open) => !open && setTemplateDialog(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {templateDialog?.mode === "create"
                ? "Create Requirement Template"
                : "Edit Requirement Template"}
            </DialogTitle>
            <DialogDescription>
              Templates are versioned automatically after every structural
              change.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={templateForm.name}
                onChange={(event) =>
                  setTemplateForm((form) => ({
                    ...form,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={templateForm.code}
                onChange={(event) =>
                  setTemplateForm((form) => ({
                    ...form,
                    code: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={templateForm.description}
                onChange={(event) =>
                  setTemplateForm((form) => ({
                    ...form,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={templateForm.category}
                onChange={(event) =>
                  setTemplateForm((form) => ({
                    ...form,
                    category: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={templateForm.status}
                onValueChange={(value) =>
                  setTemplateForm((form) => ({
                    ...form,
                    status: value as RequirementTemplateStatus,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveTemplate()}
              disabled={
                busy === "template" ||
                !templateForm.name.trim() ||
                !templateForm.code.trim()
              }
            >
              {busy === "template" ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(nodeDialog)}
        onOpenChange={(open) => !open && setNodeDialog(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {nodeDialog?.mode === "create"
                ? `Add ${nodeDialog.parentName ? `under ${nodeDialog.parentName}` : "root node"}`
                : "Edit Requirement Node"}
            </DialogTitle>
            <DialogDescription>
              Codes stay stable across versions and are used by AACCUP runtime
              projections.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[65vh] gap-4 overflow-y-auto py-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={nodeForm.name}
                onChange={(event) =>
                  setNodeForm((form) => ({ ...form, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={nodeForm.code}
                onChange={(event) =>
                  setNodeForm((form) => ({ ...form, code: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Node Type</Label>
              <Select
                value={nodeForm.type}
                onValueChange={(value) =>
                  setNodeForm((form) => ({
                    ...form,
                    type: value as RequirementNodeType,
                    isRequired: value === "SECTION" ? false : form.isRequired,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NODE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={nodeForm.status}
                onValueChange={(value) =>
                  setNodeForm((form) => ({
                    ...form,
                    status: value as NodeForm["status"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={nodeForm.description}
                onChange={(event) =>
                  setNodeForm((form) => ({
                    ...form,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Help Text</Label>
              <Textarea
                value={nodeForm.helpText}
                onChange={(event) =>
                  setNodeForm((form) => ({
                    ...form,
                    helpText: event.target.value,
                  }))
                }
              />
            </div>
            {nodeForm.type !== "SECTION" && (
              <>
                <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-[13px]">
                  <span>
                    <strong className="block text-slate-800">Required</strong>
                    <span className="text-slate-500">
                      Counts toward compliance.
                    </span>
                  </span>
                  <Switch
                    checked={nodeForm.isRequired}
                    onCheckedChange={(value) =>
                      setNodeForm((form) => ({ ...form, isRequired: value }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-[13px]">
                  <span>
                    <strong className="block text-slate-800">
                      Multiple Files
                    </strong>
                    <span className="text-slate-500">
                      Allow repeat submissions.
                    </span>
                  </span>
                  <Switch
                    checked={nodeForm.allowMultiple}
                    onCheckedChange={(value) =>
                      setNodeForm((form) => ({ ...form, allowMultiple: value }))
                    }
                  />
                </label>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNodeDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveNode()}
              disabled={
                busy === "node" ||
                !nodeForm.name.trim() ||
                !nodeForm.code.trim()
              }
            >
              {busy === "node" ? "Saving..." : "Save Node"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(ruleNode)}
        onOpenChange={(open) => !open && setRuleNode(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Validation Rules: {ruleNode?.name}</DialogTitle>
            <DialogDescription>
              Rules are enforced during upload preflight and again when a
              document is submitted.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[68vh] space-y-5 overflow-y-auto py-2">
            <div className="space-y-2">
              {ruleNode?.validations.length ? (
                ruleNode.validations.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium">
                          {ruleLabel(rule.type)}
                        </span>
                        <Badge
                          variant={
                            rule.severity === "ERROR" ? "danger" : "warning"
                          }
                        >
                          {rule.severity}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {rule.message || JSON.stringify(rule.config)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingRule(rule);
                          setRuleForm(ruleFormFromValidation(rule));
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => void archiveRule(rule.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-lg bg-slate-50 p-4 text-center text-[12px] text-slate-500">
                  No validation rules yet.
                </p>
              )}
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-slate-800">
                  {editingRule ? "Edit Rule" : "Add Rule"}
                </h3>
                {editingRule && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingRule(null);
                      setRuleForm({ ...EMPTY_RULE });
                    }}
                  >
                    Cancel edit
                  </Button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Rule Type</Label>
                  <Select
                    value={ruleForm.type}
                    disabled={Boolean(editingRule)}
                    onValueChange={(value) =>
                      setRuleForm({
                        ...EMPTY_RULE,
                        type: value as RequirementValidationType,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RULE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select
                    value={ruleForm.severity}
                    onValueChange={(value) =>
                      setRuleForm((form) => ({
                        ...form,
                        severity: value as RequirementValidationSeverity,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ERROR">Blocking error</SelectItem>
                      <SelectItem value="WARNING">Warning only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <RuleInputs
                  form={ruleForm}
                  update={(patch) =>
                    setRuleForm((form) => ({ ...form, ...patch }))
                  }
                />
                <div className="space-y-2 sm:col-span-2">
                  <Label>Custom Message</Label>
                  <Input
                    value={ruleForm.message}
                    onChange={(event) =>
                      setRuleForm((form) => ({
                        ...form,
                        message: event.target.value,
                      }))
                    }
                    placeholder="Optional user-facing guidance"
                  />
                </div>
                <label className="flex items-center gap-2 text-[12px] text-slate-600">
                  <Switch
                    checked={ruleForm.enabled}
                    onCheckedChange={(value) =>
                      setRuleForm((form) => ({ ...form, enabled: value }))
                    }
                  />
                  Enabled
                </label>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => void saveRule()}
                  disabled={busy === "rule"}
                >
                  <ShieldCheck className="mr-1.5 h-4 w-4" />
                  {editingRule ? "Update Rule" : "Add Rule"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={assignmentOpen} onOpenChange={setAssignmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Selected Template</DialogTitle>
            <DialogDescription>
              {detail?.template.name ?? "Select a template first"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select
                value={assignmentType}
                onValueChange={(value) =>
                  void loadTargets(value as RequirementAssignmentTargetType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {assignmentType !== "UNIVERSITY" && (
              <div className="space-y-2">
                <Label>Target</Label>
                <Select
                  value={assignmentTarget}
                  onValueChange={setAssignmentTarget}
                  disabled={targetsLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        targetsLoading ? "Loading targets..." : "Select target"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {targetOptions.map((target) => (
                      <SelectItem key={target.id} value={target.id}>
                        {target.name}
                        {target.code ? ` (${target.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="rounded-lg bg-amber-50 p-3 text-[11px] text-amber-800">
              One active template is allowed per target. More specific area and
              cycle assignments override organization-wide defaults.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveAssignment()}
              disabled={
                busy === "assign" ||
                (assignmentType !== "UNIVERSITY" &&
                  assignmentTarget === NO_TARGET)
              }
            >
              Assign Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cycleOpen} onOpenChange={setCycleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Accreditation Cycle</DialogTitle>
            <DialogDescription>
              Cycles can be linked to AACCUP areas and used as requirement
              assignment targets.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={cycleForm.name}
                onChange={(event) =>
                  setCycleForm((form) => ({
                    ...form,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={cycleForm.code}
                onChange={(event) =>
                  setCycleForm((form) => ({
                    ...form,
                    code: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={cycleForm.startDate}
                onChange={(event) =>
                  setCycleForm((form) => ({
                    ...form,
                    startDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={cycleForm.endDate}
                onChange={(event) =>
                  setCycleForm((form) => ({
                    ...form,
                    endDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={cycleForm.description}
                onChange={(event) =>
                  setCycleForm((form) => ({
                    ...form,
                    description: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCycleOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                busy === "cycle" ||
                !cycleForm.name ||
                !cycleForm.code ||
                !cycleForm.startDate ||
                !cycleForm.endDate
              }
              onClick={() =>
                void run(
                  "cycle",
                  async () => {
                    await createAccreditationCycle({
                      ...cycleForm,
                      description: cycleForm.description || null,
                    });
                    setCycleOpen(false);
                    setCycleForm({
                      code: "",
                      name: "",
                      description: "",
                      startDate: "",
                      endDate: "",
                    });
                  },
                  "Accreditation cycle created",
                )
              }
            >
              Create Cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(versionTemplate)}
        onOpenChange={(open) => !open && setVersionTemplate(null)}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Version History: {versionTemplate?.name}</DialogTitle>
            <DialogDescription>
              Snapshots preserve node and validation IDs so AACCUP submission
              references remain stable.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto">
            {versionsLoading ? (
              <div className="space-y-2 p-3">
                <Skeleton variant="rectangular" className="h-16" />
                <Skeleton variant="rectangular" className="h-16" />
              </div>
            ) : (
              versions.map((version) => {
                const nodeDelta =
                  (versionTemplate?.nodeCount ?? 0) - version.data.nodes.length;
                const ruleCount = version.data.nodes.reduce(
                  (sum, node) => sum + node.validations.length,
                  0,
                );
                return (
                  <div
                    key={version.id}
                    className="mb-2 flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          Version {version.version}
                        </span>
                        <Badge
                          variant={
                            version.changeType === "ROLLED_BACK"
                              ? "warning"
                              : "outline"
                          }
                        >
                          {version.changeType}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {version.data.nodes.length} nodes / {ruleCount} rules /{" "}
                        {version.data.assignments.length} assignments /{" "}
                        {formatDate(version.createdAt)}
                      </p>
                      {version.version !== versionTemplate?.version && (
                        <p className="mt-1 text-[11px] text-indigo-600">
                          Current comparison: {nodeDelta > 0 ? "+" : ""}
                          {nodeDelta} nodes
                        </p>
                      )}
                    </div>
                    {versionTemplate &&
                      version.version < versionTemplate.version && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRollbackTarget(version);
                            setRollbackNote("");
                          }}
                        >
                          <RotateCcw className="mr-1.5 h-4 w-4" />
                          Roll Back
                        </Button>
                      )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(rollbackTarget)}
        onOpenChange={(open) => !open && setRollbackTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Roll Back to Version {rollbackTarget?.version}
            </DialogTitle>
            <DialogDescription>
              This creates a new version. Existing node IDs and submission links
              are preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-3">
            <Label>Change Note</Label>
            <Textarea
              value={rollbackNote}
              onChange={(event) => setRollbackNote(event.target.value)}
              placeholder="Why is this rollback needed?"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy === "rollback"}
              onClick={() =>
                rollbackTarget &&
                versionTemplate &&
                void run(
                  "rollback",
                  async () => {
                    await rollbackRequirementTemplate(
                      versionTemplate.id,
                      rollbackTarget.version,
                      rollbackNote || undefined,
                    );
                    setRollbackTarget(null);
                    setVersionTemplate(null);
                  },
                  "Requirement template rolled back",
                )
              }
            >
              Confirm Rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(archiveTemplateTarget)}
        onOpenChange={(open) => !open && setArchiveTemplateTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Template?</DialogTitle>
            <DialogDescription>
              Assigned AACCUP areas will immediately resolve the next applicable
              template or return to their preserved legacy rows.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setArchiveTemplateTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                archiveTemplateTarget &&
                void run(
                  "archive-template",
                  async () => {
                    await archiveRequirementTemplate(archiveTemplateTarget.id);
                    setArchiveTemplateTarget(null);
                  },
                  "Template archived",
                )
              }
            >
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(archiveNodeTarget)}
        onOpenChange={(open) => !open && setArchiveNodeTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive {archiveNodeTarget?.name}?</DialogTitle>
            <DialogDescription>
              The full subtree is archived together. Runtime AACCUP rows are
              retired without deleting prior submissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setArchiveNodeTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                detail &&
                archiveNodeTarget &&
                void run(
                  "archive-node",
                  async () => {
                    await archiveRequirementNode(
                      detail.template.id,
                      archiveNodeTarget.id,
                    );
                    setArchiveNodeTarget(null);
                  },
                  "Requirement subtree archived",
                )
              }
            >
              Archive Subtree
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RuleInputs({
  form,
  update,
}: {
  form: RuleForm;
  update: (patch: Partial<RuleForm>) => void;
}) {
  const labels: Record<RequirementValidationType, [string, string]> = {
    FILE_TYPE: ["Allowed MIME types", "Allowed extensions"],
    FILE_SIZE: ["Minimum bytes", "Maximum bytes"],
    PAGE_COUNT: ["Minimum pages", "Maximum pages"],
    EXPIRATION_DATE: ["Minimum days from now", "Maximum days from now"],
    NAMING_CONVENTION: ["Regular expression", "Example filename"],
    METADATA: ["Required keys", ""],
  };
  const placeholders: Record<RequirementValidationType, [string, string]> = {
    FILE_TYPE: ["application/pdf, image/png", ".pdf, .png"],
    FILE_SIZE: ["0", "10485760"],
    PAGE_COUNT: ["1", "100"],
    EXPIRATION_DATE: ["0", "365"],
    NAMING_CONVENTION: ["^AREA-[0-9]+.*\\.pdf$", "AREA-1-REPORT.pdf"],
    METADATA: ["author, academicYear", ""],
  };
  return (
    <>
      <div className="space-y-2">
        <Label>{labels[form.type][0]}</Label>
        <Input
          type={
            ["FILE_SIZE", "PAGE_COUNT", "EXPIRATION_DATE"].includes(form.type)
              ? "number"
              : "text"
          }
          value={form.valueOne}
          placeholder={placeholders[form.type][0]}
          onChange={(event) => update({ valueOne: event.target.value })}
        />
      </div>
      {labels[form.type][1] && (
        <div className="space-y-2">
          <Label>{labels[form.type][1]}</Label>
          <Input
            type={
              ["FILE_SIZE", "PAGE_COUNT", "EXPIRATION_DATE"].includes(form.type)
                ? "number"
                : "text"
            }
            value={form.valueTwo}
            placeholder={placeholders[form.type][1]}
            onChange={(event) => update({ valueTwo: event.target.value })}
          />
        </div>
      )}
    </>
  );
}
