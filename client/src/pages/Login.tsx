import { useEffect } from "react"
import { LoginForm } from "@/components/auth"
import { AuthLayout } from "@/components/auth"

export default function LoginPage() {
  useEffect(() => {
    document.title = "Sign In · URS-DMS"
  }, [])

  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  )
}