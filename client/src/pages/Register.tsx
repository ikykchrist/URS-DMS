import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { AlertCircle, Loader2 } from "lucide-react"
import { AuthLayout } from "@/components/auth"
import { AuthCard, AuthCardDescription, AuthCardHeader, AuthCardTitle } from "@/components/auth/AuthCard"
import { PasswordInput } from "@/components/auth/PasswordInput"
import { PasswordStrength } from "@/components/auth/PasswordStrength"
import { passwordMeetsRequirements } from "@/components/auth/passwordRules"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { apiGet, apiPost } from "@/lib/http"

interface RegistrationOptions {
  colleges: Array<{ id: string; name: string; code: string }>
  departments: Array<{ id: string; name: string; code: string; collegeId: string }>
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [email, setEmail] = useState("")
  const [options, setOptions] = useState<RegistrationOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [requestEmail, setRequestEmail] = useState("")
  const [form, setForm] = useState({ firstName: "", middleName: "", lastName: "", suffix: "", employeeId: "", collegeId: "", departmentId: "", password: "", confirmPassword: "" })

  useEffect(() => {
    document.title = "Register | URS-DMS"
    if (!token) {
      setLoading(false)
      return
    }
    Promise.all([
      apiPost<{ email: string }>("/auth/registration/validate", { token }),
      apiGet<RegistrationOptions>("/auth/registration-options"),
    ]).then(([invite, registrationOptions]) => {
      setEmail(invite.email)
      setOptions(registrationOptions)
    }).catch((err) => {
      setError(err instanceof Error ? err.message : "This registration link is invalid or expired.")
    }).finally(() => setLoading(false))
  }, [token])

  const departments = useMemo(
    () => options?.departments.filter((department) => department.collegeId === form.collegeId) ?? [],
    [form.collegeId, options],
  )

  const formIsComplete = Boolean(
    email.trim()
      && form.firstName.trim()
      && form.lastName.trim()
      && form.employeeId.trim()
      && form.collegeId
      && form.departmentId
       && passwordMeetsRequirements(form.password)
      && form.confirmPassword
      && form.password === form.confirmPassword,
  )

  const passwordValid = passwordMeetsRequirements(form.password)

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value, ...(field === "collegeId" ? { departmentId: "" } : {}) }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    if (!formIsComplete) {
      setError("Please complete all required fields before creating your account.")
      return
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    setSubmitting(true)
    try {
      await apiPost("/auth/registration", {
        token,
        email,
        ...form,
        middleName: form.middleName.trim() || undefined,
        suffix: form.suffix.trim() || undefined,
      })
      setSuccess(true)
      window.setTimeout(() => navigate("/login"), 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestInvitation = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      await apiPost("/auth/registration/request", { email: requestEmail })
      setRequestSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request an invitation.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <AuthCard className="w-full max-w-2xl">
        <AuthCardHeader>
          <AuthCardTitle>Create your account</AuthCardTitle>
          <AuthCardDescription>Complete your profile to activate your URS-DMS account.</AuthCardDescription>
        </AuthCardHeader>
        {error && <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}
        {success ? (
          <div className="rounded-xl bg-emerald-50 p-5 text-center text-sm text-emerald-700">Account created successfully. Redirecting you to sign in...</div>
        ) : loading ? (
          <div className="py-10 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />Validating invitation...</div>
        ) : !token ? (
          requestSent ? (
            <div className="rounded-xl bg-emerald-50 p-5 text-center text-sm text-emerald-700">If the email is eligible, a registration link will arrive shortly. Check your inbox and spam folder.</div>
          ) : (
            <form onSubmit={handleRequestInvitation} className="space-y-5">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">Enter your email address and we will send you a secure registration link.</div>
              <div className="space-y-2"><Label htmlFor="request-email">Email address</Label><Input id="request-email" type="email" autoFocus value={requestEmail} onChange={(event) => setRequestEmail(event.target.value)} placeholder="you@urs.edu.ph" className="h-11" required /></div>
              <Button type="submit" disabled={submitting} className="h-11 w-full">{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending link...</> : "Send registration link"}</Button>
            </form>
          )
        ) : options && !error ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2"><Label>Email address</Label><Input value={email} readOnly className="h-11 bg-slate-50" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["firstName", "middleName", "lastName", "suffix"] as const).map((field) => (
                <div key={field} className="space-y-2"><Label htmlFor={field}>{field === "middleName" ? "Middle name (optional)" : field === "suffix" ? "Suffix (optional)" : field.replace(/([A-Z])/g, " $1")}</Label><Input id={field} value={form[field]} onChange={(event) => update(field, event.target.value)} className="h-11" required={field === "firstName" || field === "lastName"} /></div>
              ))}
            </div>
            <div className="space-y-2"><Label htmlFor="employeeId">Employee/Student ID</Label><Input id="employeeId" value={form.employeeId} onChange={(event) => update("employeeId", event.target.value)} className="h-11" required /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="collegeId">Campus</Label><select id="collegeId" value={form.collegeId} onChange={(event) => update("collegeId", event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" required><option value="">Select campus</option>{options.colleges.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor="departmentId">Department</Label><select id="departmentId" value={form.departmentId} onChange={(event) => update("departmentId", event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" required disabled={!form.collegeId}><option value="">Select department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="registration-password">Password</Label><PasswordInput id="registration-password" value={form.password} onChange={(event) => update("password", event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="registration-confirm-password">Confirm password</Label><PasswordInput id="registration-confirm-password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} error={form.confirmPassword && form.password !== form.confirmPassword ? "Passwords do not match" : undefined} /></div>
            </div>
            {form.password && <PasswordStrength password={form.password} className="rounded-lg bg-slate-50 p-3" />}
            {form.password && !passwordValid && <p className="text-xs font-medium text-red-600">Your password cannot be used yet. Complete all requirements before creating your account.</p>}
            <Button type="submit" disabled={submitting || !formIsComplete} className="h-11 w-full">{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</> : "Create account"}</Button>
          </form>
        ) : null}
        <p className="mt-6 text-center text-sm text-slate-500"><Link to="/login" className="font-medium text-blue-600 hover:underline">Back to sign in</Link></p>
      </AuthCard>
    </AuthLayout>
  )
}
