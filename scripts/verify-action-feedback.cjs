// Run with node scripts/verify-action-feedback.cjs. No browser or database writes.
const assert = require("node:assert/strict")
const fs = require("node:fs")
const vm = require("node:vm")
const ts = require("typescript")

function load(file, imports, globals = {}) {
  const source = fs.readFileSync(file, "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const exports = {}
  vm.runInNewContext(compiled, {
    exports, require: (name) => imports[name] ?? {}, ...globals,
  }, { filename: file })
  return exports
}

async function main() {
  const timers = []
  const { toastStore } = load("client/src/lib/toast.tsx", {}, {
    setTimeout: (callback, delay) => timers.push({ callback, delay }),
  })
  let visible = []
  toastStore.subscribe((items) => { visible = items })
  toastStore.success("Saved")
  assert.equal(visible[0].type, "success")
  assert.equal(timers[0].delay, 4000, "success must remain readable")
  timers[0].callback()
  assert.equal(visible.length, 0)
  toastStore.error("Failed")
  assert.equal(timers[1].delay, 4000, "undefined duration must use default")
  const id = toastStore.success("Keep visible", 0)
  assert.equal(timers.length, 2, "explicit persistent duration must be respected")
  toastStore.dismiss(id)
  assert.equal(visible.length, 1)

  const { ToastContainer } = load("client/src/lib/toast.tsx", {
    "react/jsx-runtime": require("react/jsx-runtime"),
    "lucide-react": { CheckCircle: "svg", AlertTriangle: "svg", Info: "svg", X: "svg" },
    react: {
      useState: () => [[{ id: "success", type: "success", message: "Saved" }], () => {}],
      useEffect: () => {}, useCallback: (callback) => callback,
    },
    "@/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
    "@/context/AuthContext": { useAuth: () => ({ user: null }) },
    "@/lib/permissions": { isAdminRole: () => false },
  })
  const notification = ToastContainer().props.children[0]
  assert.equal(notification.props.role, "status")
  assert.equal(notification.props["aria-live"], "polite")
  assert.equal(notification.props.children[2].props["aria-label"], "Dismiss notification")

  const messages = []
  const toast = Object.fromEntries(["success", "error", "info"].map((type) => [type, (message) => messages.push({ type, message })]))
  const { runBulkAction } = load("client/src/lib/actionFeedback.ts", { "@/lib/toast": { toast } })
  await runBulkAction(["ok", "failed", "skipped"], async (id) => {
    if (id === "failed") throw new Error("Denied")
    return id === "ok"
  }, "items saved")
  assert.deepEqual(messages.map((item) => item.type), ["success", "error", "info"])
  assert.equal(messages[0].message, "1 items saved")
  messages.length = 0
  await runBulkAction(["failed"], async () => { throw new Error("Denied") }, "items saved")
  assert.deepEqual(messages.map((item) => item.type), ["error"], "failed batches must never announce success")
  messages.length = 0
  await runBulkAction([], async () => true, "items saved")
  assert.equal(messages.length, 0, "empty batches must not invent a completed operation")
  let finish
  const pending = runBulkAction(["pending"], () => new Promise((resolve) => { finish = resolve }), "items saved")
  assert.equal(messages.length, 0, "no success before server completion")
  finish(true)
  await pending
  assert.equal(messages[0].type, "success")
  console.log("Action feedback checks passed: toast lifetime/dismissal, mixed outcomes, failures, empty batches, and pending operations.")
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
