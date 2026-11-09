import type { OnlineRequirementValidation } from "@/services/aaccup"

export function requirementUploadHints(rules: OnlineRequirementValidation[]) {
  const formats = rules.filter((rule) => rule.type === "FILE_TYPE" && rule.severity === "ERROR").flatMap((rule) => {
    const extensions = Array.isArray(rule.config.allowedExtensions) ? rule.config.allowedExtensions : []
    const mimeTypes = Array.isArray(rule.config.allowedMimeTypes) ? rule.config.allowedMimeTypes : []
    return [...extensions.filter((value): value is string => typeof value === "string").map((value) => value.startsWith(".") ? value : `.${value}`), ...mimeTypes.filter((value): value is string => typeof value === "string")]
  })
  const guidance = rules.map((rule) => {
    const prefix = rule.severity === "WARNING" ? "Advisory: " : ""
    if (rule.message) return prefix + rule.message
    const config = rule.config
    switch (rule.type) {
      case "FILE_TYPE": return `${prefix}Allowed formats: ${[...(Array.isArray(config.allowedExtensions) ? config.allowedExtensions : []), ...(Array.isArray(config.allowedMimeTypes) ? config.allowedMimeTypes : [])].join(", ")}`
      case "FILE_SIZE": return `${prefix}File size: ${typeof config.minBytes === "number" ? `at least ${(config.minBytes / 1024 / 1024).toFixed(2)} MB; ` : ""}${typeof config.maxBytes === "number" ? `up to ${(config.maxBytes / 1024 / 1024).toFixed(2)} MB` : "no rule maximum"}`
      case "PAGE_COUNT": return `${prefix}Pages: ${config.minPages ?? "any minimum"}–${config.maxPages ?? "any maximum"}`
      case "EXPIRATION_DATE": return `${prefix}Provide the document expiration date.`
      case "NAMING_CONVENTION": return `${prefix}Filename pattern: ${config.pattern ?? ""}`
      case "METADATA": return `${prefix}Required details: ${Array.isArray(config.requiredKeys) ? config.requiredKeys.join(", ") : ""}`
    }
  })
  return { accept: formats.length ? [...new Set(formats)].join(",") : undefined, helperText: guidance.length ? guidance.join(" • ") : "Choose your evidence file. The system upload policy applies." }
}
