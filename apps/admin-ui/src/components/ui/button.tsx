import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'muted'
}

export function Button({ tone = 'primary', className, ...props }: ButtonProps) {
  const toneClass = tone === 'primary' ? 'btn-primary' : 'btn-muted'

  return <button className={`${toneClass} ${className ?? ''}`.trim()} {...props} />
}
