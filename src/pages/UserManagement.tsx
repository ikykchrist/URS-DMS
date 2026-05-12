import { useState } from "react"
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

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
  status: "Active" | "Inactive"
  lastLogin: string
  dateCreated: string
  initials: string
}

interface UserManagementProps {
  sidebarCollapsed?: boolean
}

const users: User[] = [
  {
    id: "USR-001",
    name: "Dr. Maria Santos",
    email: "maria.santos@university.edu",
    role: "System Administrator",
    department: "College of Info Sciences",
    status: "Active",
    lastLogin: "2024-01-15 09:30 AM",
    dateCreated: "2023-08-15",
    initials: "MS",
  },
  {
    id: "USR-002",
    name: "Prof. John Doe",
    email: "john.doe@university.edu",
    role: "Document Manager",
    department: "College of Engineering",
    status: "Active",
    lastLogin: "2024-01-15 08:45 AM",
    dateCreated: "2023-07-22",
    initials: "JD",
  },
  {
    id: "USR-003",
    name: "Engr. Sarah Cruz",
    email: "sarah.cruz@university.edu",
    role: "Reviewer",
    department: "Facilities Management",
    status: "Active",
    lastLogin: "2024-01-14 04:20 PM",
    dateCreated: "2023-09-10",
    initials: "SC",
  },
  {
    id: "USR-004",
    name: "Dr. Peter Lim",
    email: "peter.lim@university.edu",
    role: "Editor",
    department: "College of Info Sciences",
    status: "Active",
    lastLogin: "2024-01-14 02:15 PM",
    dateCreated: "2023-06-05",
    initials: "PL",
  },
  {
    id: "USR-005",
    name: "Ms. Ana Reyes",
    email: "ana.reyes@university.edu",
    role: "Viewer",
    department: "College of Engineering",
    status: "Active",
    lastLogin: "2024-01-13 11:00 AM",
    dateCreated: "2023-10-18",
    initials: "AR",
  },
  {
    id: "USR-006",
    name: "Mr. James Wilson",
    email: "james.wilson@university.edu",
    role: "Department User",
    department: "Dean Office",
    status: "Inactive",
    lastLogin: "2024-01-10 09:00 AM",
    dateCreated: "2023-05-25",
    initials: "JW",
  },
  {
    id: "USR-007",
    name: "Ms. Lisa Chen",
    email: "lisa.chen@university.edu",
    role: "Reviewer",
    department: "Student Affairs",
    status: "Active",
    lastLogin: "2024-01-15 10:30 AM",
    dateCreated: "2023-08-30",
    initials: "LC",
  },
  {
    id: "USR-008",
    name: "Dr. Robert Garcia",
    email: "robert.garcia@university.edu",
    role: "Editor",
    department: "College of Arts & Sciences",
    status: "Active",
    lastLogin: "2024-01-14 03:45 PM",
    dateCreated: "2023-07-12",
    initials: "RG",
  },
]

const roleBadgeVariant: Record<string, "default" | "secondary" | "success" | "warning" | "danger"> = {
  "System Administrator": "default",
  "Document Manager": "success",
  "Reviewer": "warning",
  "Editor": "secondary",
  "Viewer": "secondary",
  "Department User": "secondary",
}

export default function UserManagement({ sidebarCollapsed = false }: UserManagementProps) {
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false)
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setIsUserDetailsModalOpen(true)
  }

  const handleResetPassword = () => {
    setIsUserDetailsModalOpen(false)
    setTimeout(() => setIsResetPasswordModalOpen(true), 150)
  }

  const handleDeleteUser = () => {
    console.log("User deleted")
  }

  return (
    <>
      <main
        className="pt-16 pb-8 transition-all duration-200"
        style={{
          marginLeft: sidebarCollapsed ? "72px" : "260px",
        }}
      >
        <div className="p-8">
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
              value="156"
              icon={<Users className="w-5 h-5" />}
            />
            <StatCard
              title="Active Users"
              value="142"
              icon={<UserCheck className="w-5 h-5" />}
              trend={{ value: 8, positive: true }}
            />
            <StatCard
              title="Inactive Users"
              value="14"
              icon={<UserX className="w-5 h-5" />}
              trend={{ value: 2, positive: false }}
            />
            <StatCard
              title="User Roles"
              value="6"
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
                      className="pl-10 h-10 bg-gray-50/50 border-0 hover:bg-gray-100 focus:bg-white focus:ring-1.5 focus:ring-gray-200"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[160px] h-9">
                      <Filter className="w-3.5 h-3.5 mr-2" />
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">System Administrator</SelectItem>
                      <SelectItem value="manager">Document Manager</SelectItem>
                      <SelectItem value="reviewer">Reviewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="dept_user">Department User</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="cosi">College of Info Sciences</SelectItem>
                      <SelectItem value="coe">College of Engineering</SelectItem>
                      <SelectItem value="cas">College of Arts & Sciences</SelectItem>
                      <SelectItem value="cba">College of Business Admin</SelectItem>
                      <SelectItem value="con">College of Nursing</SelectItem>
                      <SelectItem value="dean">Dean Office</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[130px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-9">
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
                  {users.map((user) => (
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
                          {user.role}
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
                            onClick={() => handleViewUser(user)}
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
                              <DropdownMenuItem onClick={() => handleViewUser(user)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Shield className="w-4 h-4 mr-2" />
                                Change Role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 focus:text-red-600">
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
                  Showing 8 of 156 users
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
      </main>

      <AddUserModal
        open={isAddUserModalOpen}
        onOpenChange={setIsAddUserModalOpen}
      />

      <UserDetailsModal
        open={isUserDetailsModalOpen}
        onOpenChange={setIsUserDetailsModalOpen}
        user={selectedUser}
        onResetPassword={handleResetPassword}
        onDelete={handleDeleteUser}
      />

      <ResetPasswordModal
        open={isResetPasswordModalOpen}
        onOpenChange={setIsResetPasswordModalOpen}
        userEmail={selectedUser?.email}
      />
    </>
  )
}
