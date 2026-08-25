interface PasswordRequirement {
  test: (password: string) => boolean
  label: string
}

export const passwordRequirements: PasswordRequirement[] = [
  { test: (password) => password.length >= 8, label: "At least 8 characters" },
  { test: (password) => /[A-Z]/.test(password), label: "One uppercase letter" },
  { test: (password) => /[a-z]/.test(password), label: "One lowercase letter" },
  { test: (password) => /[0-9]/.test(password), label: "One number" },
  { test: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password), label: "One special character" },
]

export function passwordMeetsRequirements(password: string): boolean {
  return passwordRequirements.every((requirement) => requirement.test(password))
}
