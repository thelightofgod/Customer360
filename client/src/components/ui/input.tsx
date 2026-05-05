import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      className={cn(
        'flex h-9 w-full rounded-[10px] border bg-[var(--bg4)] px-3 py-2 text-sm text-[var(--t1)] placeholder:text-[var(--t4)] focus:outline-none transition-all duration-200',
        className
      )}
      style={{
        borderColor: 'var(--brd2)',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,158,255,0.12)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--brd2)'; e.currentTarget.style.boxShadow = 'none' }}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
