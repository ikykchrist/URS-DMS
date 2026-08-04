export interface ValidationRule<T = unknown> {
  validate: (value: T) => boolean
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export function required(_value: unknown, fieldName = "This field"): ValidationRule {
  return {
    validate: (v) => {
      if (v === null || v === undefined) return false
      if (typeof v === "string") return v.trim().length > 0
      if (Array.isArray(v)) return v.length > 0
      return true
    },
    message: `${fieldName} is required`,
  }
}

export function minLength(min: number, fieldName = "Field"): ValidationRule<string> {
  return {
    validate: (v) => typeof v === "string" && v.trim().length >= min,
    message: `${fieldName} must be at least ${min} characters`,
  }
}

export function maxLength(max: number, fieldName = "Field"): ValidationRule<string> {
  return {
    validate: (v) => typeof v === "string" && v.trim().length <= max,
    message: `${fieldName} must be at most ${max} characters`,
  }
}

export const emailRule: ValidationRule<string> = {
  validate: (v) => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  message: "Enter a valid email address",
}

export const urlRule: ValidationRule<string> = {
  validate: (v) => {
    if (!v) return true
    try {
      new URL(v)
      return true
    } catch {
      return false
    }
  },
  message: "Enter a valid URL",
}

export function matches(other: string, fieldName = "Field"): ValidationRule<string> {
  return {
    validate: (v) => typeof v === "string" && v === other,
    message: `${fieldName} must match`,
  }
}

export function phoneRule(): ValidationRule<string> {
  return {
    validate: (v) =>
      typeof v === "string" && /^\+?[\d\s\-()]{7,}$/.test(v.trim()),
    message: "Enter a valid phone number",
  }
}

export function passwordStrength(): ValidationRule<string> {
  return {
    validate: (v) => {
      if (typeof v !== "string" || v.length < 8) return false
      const hasUpper = /[A-Z]/.test(v)
      const hasLower = /[a-z]/.test(v)
      const hasDigit = /\d/.test(v)
      return hasUpper && hasLower && hasDigit
    },
    message: "Password must be 8+ chars, include upper, lower, and a number",
  }
}

export function runValidation<T extends Record<string, unknown>>(
  values: T,
  schema: Partial<Record<keyof T, ValidationRule[]>>
): ValidationResult {
  const errors: Record<string, string> = {}
  let valid = true

  for (const key of Object.keys(schema) as (keyof T)[]) {
    const rules = schema[key]
    if (!rules) continue
    const value = values[key]
    for (const rule of rules) {
      if (!rule.validate(value)) {
        errors[key as string] = rule.message
        valid = false
        break
      }
    }
  }

  return { valid, errors }
}

export function hashPassword(password: string): string {
  let hash = 5381
  for (let i = 0; i < password.length; i++) {
    hash = (hash * 33) ^ password.charCodeAt(i)
  }
  return `phc_${(hash >>> 0).toString(36)}_${password.length}`
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}
