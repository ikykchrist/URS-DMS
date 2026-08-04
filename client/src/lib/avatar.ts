import { useCallback, useState } from "react"

function avatarKey(userId: string): string {
  return `urs_dms_avatar_${userId}`
}

export function getAvatarUrl(userId: string | undefined | null): string | null {
  if (!userId) return null
  try {
    return localStorage.getItem(avatarKey(userId))
  } catch {
    return null
  }
}

export function setAvatarUrl(userId: string, dataUrl: string): void {
  try {
    localStorage.setItem(avatarKey(userId), dataUrl)
  } catch {}
}

export function removeAvatarUrl(userId: string): void {
  try {
    localStorage.removeItem(avatarKey(userId))
  } catch {}
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function useAvatar(userId: string | undefined | null): {
  url: string | null
  set: (dataUrl: string) => void
  remove: () => void
} {
  const [url, setUrl] = useState<string | null>(() => getAvatarUrl(userId))

  const set = useCallback(
    (dataUrl: string) => {
      if (!userId) return
      setAvatarUrl(userId, dataUrl)
      setUrl(dataUrl)
    },
    [userId],
  )

  const remove = useCallback(() => {
    if (!userId) return
    removeAvatarUrl(userId)
    setUrl(null)
  }, [userId])

  return { url, set, remove }
}
