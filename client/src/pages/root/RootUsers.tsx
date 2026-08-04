import { useEffect, useState, useCallback } from "react"
import { Search, RefreshCw, Users } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/Pagination"
import { listSystemUsers, type RootSystemUser } from "@/services/root"

const PAGE_SIZE = 15

function statusBadge(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "ACTIVE") return "success"
  if (status === "SUSPENDED") return "danger"
  if (status === "PENDING") return "warning"
  return "default"
}

export default function RootUsers() {
  const [users, setUsers] = useState<RootSystemUser[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listSystemUsers({
        page,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
        status: status === "all" ? undefined : status,
      })
      setUsers(result.items)
      setTotal(result.meta.total)
      setTotalPages(Math.max(1, result.meta.totalPages))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="System Users"
        description="All platform accounts (read-only view for the system administrator)"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} className="shadow-sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      <Card className="border-gray-200/60 shadow-sm mb-4">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              className="h-10 pl-9"
              placeholder="Search by name, email or employee ID…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-10 w-full sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-gray-200/60 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="min-h-[280px] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-[13px] text-gray-500">{error}</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-gray-500">
              <Users className="w-6 h-6 mx-auto mb-2 text-gray-300" />
              No users found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="text-[13px] font-medium text-gray-900">
                        {user.firstName} {user.middleName ?? ""} {user.lastName} {user.suffix ?? ""}
                      </div>
                      <div className="text-[12px] text-gray-500">{user.email}</div>
                    </TableCell>
                    <TableCell className="text-[13px] text-gray-600">{user.employeeId}</TableCell>
                    <TableCell>
                      <Badge variant={user.roleName === "ROOT" ? "danger" : "secondary"}>
                        {user.roleName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadge(user.status)}>{user.status}</Badge>
                    </TableCell>
                    <TableCell className="text-[12px] text-gray-500">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-[12px] text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[12px] text-gray-500">{total} users</span>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink isActive>{page}</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <span className="text-[12px] text-gray-500">
            page {page} of {totalPages}
          </span>
        </div>
      </Card>
    </div>
  )
}
