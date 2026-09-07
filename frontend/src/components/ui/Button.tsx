import type { ComponentProps } from 'react'

type ButtonProps = ComponentProps<'button'> & { primary?: boolean }

export function Button({ primary = false, className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`btn ${primary ? 'btn-primary' : ''} ${className}`} {...props} />
}
