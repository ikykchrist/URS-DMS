import { LoginForm } from "@/components/auth"
import { AuthLayout } from "@/components/auth"

export default function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  )
}