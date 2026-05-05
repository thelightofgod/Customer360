import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] text-xs font-semibold transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[var(--bg4)] border border-[var(--brd2)] text-[var(--t2)] hover:bg-[var(--bg5)] hover:border-[var(--brd3)] hover:text-[var(--t1)]',
        primary: 'text-white border border-transparent hover:brightness-110 active:scale-[0.97]',
        ghost: 'text-[var(--t3)] hover:bg-[var(--bg3)] hover:text-[var(--t1)]',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    const primaryStyle = variant === 'primary' ? {
      background: 'linear-gradient(135deg, var(--blue), #3a7ff5)',
      boxShadow: '0 4px 16px rgba(91, 158, 255, 0.30), inset 0 1px 0 rgba(255,255,255,0.15)',
      ...style,
    } : style

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        style={primaryStyle}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
