import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Search,
  Filter,
  Download,
  UserPlus,
  Users,
  UserCheck,
  UserX,
  Shield,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatCard } from "@/components/layout/StatCard"
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
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/Pagination"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import { AddUserModal } from "@/components/modals/AddUserModal"
import { UserDetailsModal } from "@/components/modals/UserDetailsModal"
import { ResetPasswordModal } from "@/components/modals/ResetPasswordModal"
import {
  listSystemUsers,
  listSystemDepartments,
  archiveSystemUser,
  updateUserStatus,
  type SystemUser,
} from "@/services/admin"
import { ROLE_LABELS } from "@/lib/permissions"
import type { User } from "@/types/domain"

interface UserManagementProps {
  sidebarCollapsed?: boolean
}

const roleBadgeVariant: Record<string, "default" | "secondary" | "success" | "warning" | "danger"> = {
  super_admin: "default",
  qa_office: "warning",
  department_head: "success",
  faculty: "secondary",
  staff: "secondary",
  student: "secondary",
}

function roleKey(roleName: string): User["role"] {
  switch (roleName) {
    case "ROOT": return "root"
    case "ADMINISTRATOR": return "super_admin"
    case "QUALITY_ASSURANCE_OFFICER": return "qa_office"
    case "DEPARTMENT_COORDINATOR": return "department_head"
    case "FACULTY": return "faculty"
    case "STAFF": return "staff"
    case "READ_ONLY": return "student"
    default: return "staff"
  }
}

function roleKeyLabel(role: string): string {
  switch (role) {
    case "root": return "Root"
    case "super_admin": return "Administrator"
    case "qa_office": return "Quality Assurance Officer"
    case "department_head": return "Department Coordinator"
    case "faculty": return "Faculty"
    case "staff": return "Staff"
    case "student": return "Read Only"
    default: return role
  }
}

function userStatus(status: string): User["status"] {
  switch (status) {
    case "ACTIVE": return "Active"
    case "INACTIVE": return "Inactive"
    case "SUSPENDED": return "Suspended"
    default: return "Inactive"
  }
}

function toDomainUser(u: SystemUser): User {
  return {
    id: u.id,
    name: [u.firstName, u.middleName, u.lastName].filter(Boolean).join(" ") + (u.suffix ? ` ${u.suffix}` : ""),
    email: u.email,
    role: roleKey(u.roleName),
    department: u.departmentName ?? "Unassigned",
    departmentId: u.departmentId ?? undefined,
    status: userStatus(u.status),
    memberSince: u.createdAt,
    lastLogin: u.lastLogin ?? undefined,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }
}

function toDisplayUser(u: User) {
  return {
    ...u,
    initials: u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
    dateCreated: u.memberSince,
    lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "Never",
  }
}

export default function UserManagement({ sidebarCollapsed: _sidebarCollapsed = false }: UserManagementProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(() => searchParams.get("modal") === "add-user")
  const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false)
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [deptFilter, setDeptFilter] = useState("all")
  const [systemDepartments, setSystemDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    listSystemUsers({ pageSize: 100 }).then((page) => setUsers(page.items.map(toDomainUser)))
    listSystemDepartments({ pageSize: 100 })
      .then((page) => setSystemDepartments(page.items.map((d) => ({ id: d.id, name: d.name }))))
      .catch(() => setSystemDepartments([]))
  }, [])

  const refresh = () => listSystemUsers({ pageSize: 100 }).then((page) => setUsers(page.items.map(toDomainUser)))

  const handleCloseAddUserModal = (open: boolean) => {
    setIsAddUserModalOpen(open)
    if (!open) {
      searchParams.delete("modal")
      setSearchParams(searchParams)
    }
  }

  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setIsUserDetailsModalOpen(true)
  }

  const handleResetPassword = () => {
    setIsUserDetailsModalOpen(false)
    setTimeout(() => setIsResetPasswordModalOpen(true), 150)
  }

  const handleDeleteUser = async (id?: string) => {
    if (!id) return
    await archiveSystemUser(id)
    refresh()
  }

  const displayUsers = users
    .filter((u) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
      }
      if (roleFilter !== "all" && u.role !== roleFilter) return false
      if (deptFilter !== "all" && u.department !== deptFilter) return false
      if (statusFilter !== "all" && (statusFilter === "active" ? u.status !== "Active" : u.status !== "Inactive")) return false
      return true
    })
    .map(toDisplayUser)

  const activeCount = users.filter((u) => u.status === "Active").length
  const inactiveCount = users.filter((u) => u.status !== "Active").length
  const uniqueRoles = new Set(users.map((u) => u.role)).size

  return (
    <div>
      <div className="p-4 sm:p-6 lg:p-8">
          <PageHeader
            title="User Management"
            description="Manage user accounts, roles, and access permissions."
            actions={
              <Button
                className="shadow-sm"
                onClick={() => setIsAddUserModalOpen(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Total Users"
              value={String(users.length)}
              icon={<Users className="w-5 h-5" />}
            />
            <StatCard
              title="Active Users"
              value={String(activeCount)}
              icon={<UserCheck className="w-5 h-5" />}
              trend={{
                value: users.length > 0 ? Math.round((activeCount / users.length) * 100) : 0,
                positive: activeCount > 0,
              }}
            />
            <StatCard
              title="Inactive Users"
              value={String(inactiveCount)}
              icon={<UserX className="w-5 h-5" />}
              trend={{
                value: users.length > 0 ? Math.round((inactiveCount / users.length) * 100) : 0,
                positive: false,
              }}
            />
            <StatCard
              title="User Roles"
              value={String(uniqueRoles)}
              icon={<Shield className="w-5 h-5" />}
            />
          </div>

          <Card className="border-gray-200/60 shadow-sm mb-6">
            <CardContent className="p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 bg-gray-50/50 border-0 hover:bg-gray-100 focus:bg-white focus:ring-1.5 focus:ring-gray-200"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[180px] h-9">
                      <Filter className="w-3.5 h-3.5 mr-2" />
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {[...new Set(users.map((u) => u.role))].map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleKeyLabel(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger className="w-[220px] h-9">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {systemDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-9" onClick={async () => {
                    const csv = "Name,Email,Role,Department,Status,Last Login\n" +
                      displayUsers.map(u => `"${u.name}","${u.email}","${u.role}","${u.department}","${u.status}","${u.lastLogin}"`).join("\n")
                    const blob = new Blob([csv], { type: "text/csv" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `users-export-${new Date().toISOString().slice(0,10)}.csv`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                  }}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200/60 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500 text-[14px]">
                        No users found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : displayUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-[12px] bg-gray-100 text-gray-700 font-medium">
                              {user.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-[14px] font-medium text-gray-900">
                              {user.name}
                            </p>
                            <p className="text-[12px] text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant[user.role] || "secondary"}>
                          {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-[13px] text-gray-600">{user.department}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.status === "Active" ? "success" : "danger"}
                          className="font-medium"
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-[13px] text-gray-500">{user.lastLogin}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[13px] text-gray-500">{user.dateCreated}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-gray-900"
                            onClick={() => handleViewUser(user as User)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 hover:text-gray-900"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px]">
                              <DropdownMenuItem onClick={() => handleViewUser(user as User)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewUser(user as User)}>
                                <Shield className="w-4 h-4 mr-2" />
                                Change Role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={async () => {
                                  if (window.confirm(`Delete user "${user.name}"? This can be undone.`)) {
                                    await handleDeleteUser(user.id)
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 px-5 pb-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[13px] text-gray-500">
                  Showing {displayUsers.length} of {users.length} users
                </p>
                <Pagination>
                  <PaginationPrevious className="h-8" />
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationLink className="h-8 w-8">1</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink isActive className="h-8 w-8">
                        2
                      </PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink className="h-8 w-8">3</PaginationLink>
                    </PaginationItem>
                    <PaginationEllipsis className="h-8 w-8" />
                    <PaginationItem>
                      <PaginationLink className="h-8 w-8">20</PaginationLink>
                    </PaginationItem>
                  </PaginationContent>
                  <PaginationNext className="h-8" />
                </Pagination>
              </div>
            </CardContent>
          </Card>
</div>

      <AddUserModal
        open={isAddUserModalOpen}
        onOpenChange={handleCloseAddUserModal}
        onSuccess={async () => {
          refresh()
        }}
      />

      <UserDetailsModal
        open={isUserDetailsModalOpen}
        onOpenChange={setIsUserDetailsModalOpen}
        user={selectedUser}
        onResetPassword={handleResetPassword}
        onDelete={selectedUser ? () => handleDeleteUser(selectedUser.id) : undefined}
        onSave={async (id, data) => {
          if (!id) return
          await updateUserStatus(
            id,
            data.status === "Active" ? "ACTIVE" : data.status === "Suspended" ? "SUSPENDED" : "INACTIVE",
          )
          refresh()
        }}
      />

      <ResetPasswordModal
        open={isResetPasswordModalOpen}
        onOpenChange={setIsResetPasswordModalOpen}
        userEmail={selectedUser?.email}
      />
    </div>
  )
}
