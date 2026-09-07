import type { ReactNode } from 'react'

export function ErrorMessage({ children }: { children: ReactNode }) {
  return <div className="notice notice-error" role="alert">{children}</div>
}
