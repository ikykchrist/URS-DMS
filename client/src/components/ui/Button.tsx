import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-[13px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-primary/40 dark:focus-visible:ring-offset-gray-900 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary-700 shadow-soft shadow-primary/20 dark:bg-blue-600 dark:text-white dark:hover:bg-primary-500",
        destructive: "bg-red-600 text-white hover:bg-red-700 shadow-soft dark:bg-red-700 dark:hover:bg-red-600",
        outline: "border border-border bg-white text-gray-700 hover:border-primary-200 hover:bg-primary-50/50 hover:text-primary-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-700",
        secondary: "bg-navy-50 text-navy-900 hover:bg-navy-100 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
        ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
        link: "text-primary underline-offset-4 hover:underline dark:text-blue-400",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-3.5 text-[12px]",
        lg: "h-11 rounded-xl px-7 text-[14px]",
        xl: "h-12 rounded-xl px-8 text-[15px]",
        icon: "h-10 w-10",
        "icon-sm": "h-9 w-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
