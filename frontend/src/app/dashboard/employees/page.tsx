"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, Edit, Trash2, Eye, Users, X } from "lucide-react";

const departments = ['Engineering', 'HR', 'Marketing', 'Sales', 'Finance', 'Operations', 'Design', 'Product', 'Support', 'Legal'];

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState("");
    const [totalCount, setTotalCount] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [formData, setFormData] = useState({
        firstName: "", lastName: "", email: "", phone: "",
        department: "Engineering", designation: "", password: "password123",
        gender: "Male", skills: "",
    });

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (search) params.search = search;
            if (deptFilter) params.department = deptFilter;
            const res = await api.get('/employees', { params });
            setEmployees(res.data.data);
            setTotalCount(res.data.total);
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, [search, deptFilter]);

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/employees', {
                ...formData,
                skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
            });
            setShowAddModal(false);
            setFormData({ firstName: "", lastName: "", email: "", phone: "", department: "Engineering", designation: "", password: "password123", gender: "Male", skills: "" });
            fetchEmployees();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Error adding employee');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this employee?')) return;
        try {
            await api.delete(`/employees/${id}`);
            fetchEmployees();
        } catch (err) {
            console.error(err);
        }
    };

    const statusColors: Record<string, string> = {
        active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        inactive: "bg-gray-500/20 text-gray-400 border-gray-500/30",
        on_leave: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        terminated: "bg-red-500/20 text-red-400 border-red-500/30",
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Users className="w-6 h-6 text-violet-400" />
                        Employee Management
                    </h1>
                    <p className="text-muted-foreground mt-1">{totalCount} total employees</p>
                </div>
                <Button
                    onClick={() => setShowAddModal(true)}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white"
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Employee
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email, or ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <select
                    value={deptFilter}
                    onChange={e => setDeptFilter(e.target.value)}
                    className="h-9 px-3 rounded-lg bg-muted/50 border border-border text-sm min-w-[180px]"
                >
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>

            {/* Table */}
            <Card className="border-border/50">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Employee ID</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Designation</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Skills</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i}>
                                        {[...Array(7)].map((_, j) => (
                                            <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : employees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No employees found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                employees.map((emp) => (
                                    <TableRow key={emp._id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-8 h-8">
                                                    <AvatarFallback className="bg-gradient-to-br from-violet-500/20 to-blue-500/20 text-xs">
                                                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                                                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell><span className="text-sm font-mono">{emp.employeeId}</span></TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="text-xs">{emp.department}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{emp.designation}</TableCell>
                                        <TableCell>
                                            <Badge className={`text-xs ${statusColors[emp.status] || statusColors.active}`}>
                                                {emp.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1 flex-wrap max-w-[200px]">
                                                {emp.skills?.slice(0, 3).map((skill: string, i: number) => (
                                                    <Badge key={i} variant="outline" className="text-[10px] px-1.5">{skill}</Badge>
                                                ))}
                                                {emp.skills?.length > 3 && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5">+{emp.skills.length - 3}</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                                                    onClick={() => { setSelectedEmployee(emp); setShowViewModal(true); }}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors" onClick={() => handleDelete(emp._id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Add Employee Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
                    <div className="relative z-50 w-full max-w-lg mx-4 bg-popover rounded-xl p-6 shadow-xl border border-border max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Add New Employee</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-muted rounded-md"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleAddEmployee} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>First Name</Label>
                                    <Input value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} required />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Last Name</Label>
                                    <Input value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} required />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Email</Label>
                                <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Phone</Label>
                                    <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Gender</Label>
                                    <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-muted/50 border border-border text-sm">
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Department</Label>
                                    <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-muted/50 border border-border text-sm">
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Designation</Label>
                                    <Input value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} required />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Skills (comma-separated)</Label>
                                <Input value={formData.skills} onChange={e => setFormData({ ...formData, skills: e.target.value })} placeholder="React, Node.js, Python" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Initial Password</Label>
                                <Input value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                            <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white">
                                Add Employee
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            {/* View Employee Modal */}
            {showViewModal && selectedEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setShowViewModal(false)} />
                    <div className="relative z-50 w-full max-w-lg mx-4 bg-popover rounded-xl p-6 shadow-xl border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Employee Details</h2>
                            <button onClick={() => setShowViewModal(false)} className="p-1 hover:bg-muted rounded-md"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                                <Avatar className="w-14 h-14">
                                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-blue-500 text-white text-lg">
                                        {selectedEmployee.firstName?.[0]}{selectedEmployee.lastName?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-lg font-semibold">{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
                                    <p className="text-sm text-muted-foreground">{selectedEmployee.designation}</p>
                                    <Badge variant="secondary" className="mt-1 text-xs">{selectedEmployee.employeeId}</Badge>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-muted-foreground">Email:</span> <span className="ml-1">{selectedEmployee.email}</span></div>
                                <div><span className="text-muted-foreground">Phone:</span> <span className="ml-1">{selectedEmployee.phone || 'N/A'}</span></div>
                                <div><span className="text-muted-foreground">Department:</span> <span className="ml-1">{selectedEmployee.department}</span></div>
                                <div><span className="text-muted-foreground">Gender:</span> <span className="ml-1">{selectedEmployee.gender || 'N/A'}</span></div>
                                <div><span className="text-muted-foreground">Joined:</span> <span className="ml-1">{new Date(selectedEmployee.dateOfJoining).toLocaleDateString()}</span></div>
                                <div><span className="text-muted-foreground">Status:</span> <Badge className={`text-xs ml-1 ${statusColors[selectedEmployee.status]}`}>{selectedEmployee.status}</Badge></div>
                            </div>
                            {selectedEmployee.skills?.length > 0 && (
                                <div>
                                    <p className="text-sm text-muted-foreground mb-2">Skills</p>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {selectedEmployee.skills.map((skill: string, i: number) => (
                                            <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
