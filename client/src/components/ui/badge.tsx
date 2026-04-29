import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        green: 'bg-[var(--green-bg)] text-[var(--green)]',
        amber: 'bg-[var(--amber-bg)] text-[var(--amber)]',
        red: 'bg-[var(--red-bg)] text-[var(--red)]',
        blue: 'bg-[var(--blue-bg)] text-[var(--blue)]',
        purple: 'bg-[var(--purple-bg)] text-[var(--purple)]',
        cyan: 'bg-[var(--cyan-bg)] text-[var(--cyan)]',
        muted: 'bg-white/5 text-[var(--t4)]',
      },
    },
    defaultVariants: { variant: 'blue' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="w-[5px] h-[5px] rounded-full bg-current flex-shrink-0" />}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
