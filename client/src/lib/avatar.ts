import { useCallback, useEffect, useState } from "react"
import { apiGet, apiPost } from "@/lib/http"

export async function uploadAvatar(file: File): Promise<string> {
  const presign = await apiPost<{ url: string; objectKey: string; headers: Record<string, string> }>("/users/me/profile-photo/presign", {
    mimeType: file.type,
    sizeBytes: file.size,
  })
  const upload = await fetch(presign.url, { method: "PUT", headers: presign.headers, body: file })
  if (!upload.ok) throw new Error("Profile picture upload failed")
  const result = await apiPost<{ photoUrl: string }>("/users/me/profile-photo/finalize", { objectKey: presign.objectKey })
  return result.photoUrl
}

export function useAvatar(userId: string | undefined | null): {
  url: string | null
  set: (dataUrl: string) => void
  remove: () => void
} {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setUrl(null)
      return
    }
    let active = true
    void apiGet<{ photoUrl: string } | null>("/users/me/profile-photo")
      .then((result) => { if (active) setUrl(result?.photoUrl ?? null) })
      .catch(() => undefined)
    return () => { active = false }
  }, [userId])

  const set = useCallback(
    (dataUrl: string) => {
      if (!userId) return
      setUrl(dataUrl)
    },
    [userId],
  )

  const remove = useCallback(() => {
    if (!userId) return
    setUrl(null)
  }, [userId])

  return { url, set, remove }
}
