import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./Button"

const Pagination = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-0.5 sm:gap-1", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

interface PaginationLinkProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  isActive?: boolean
}

const PaginationLink = ({
  className,
  isActive,
  asChild,
  ...props
}: PaginationLinkProps) => {
  return (
    <Button
      variant={isActive ? "outline" : "ghost"}
      className={cn("h-8 w-8 sm:h-10 sm:w-10 p-0 text-[12px] sm:text-[14px]", className)}
      asChild={asChild}
      {...props}
    />
  )
}
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <PaginationLink
    aria-label="Go to previous page"
    className={cn("gap-1 pl-1.5 sm:pl-2.5 w-auto sm:w-10", className)}
    {...props}
  >
    <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
    <span className="hidden md:inline text-[12px]">Previous</span>
  </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <PaginationLink
    aria-label="Go to next page"
    className={cn("gap-1 pr-1.5 sm:pr-2.5 w-auto sm:w-10", className)}
    {...props}
  >
    <span className="hidden md:inline text-[12px]">Next</span>
    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
  </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    aria-hidden
    className={cn("flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}