import { useMemo } from "react";
import { useLink, useCustom, useGetIdentity } from "@refinedev/core";
import { useNavigate } from "react-router";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  BookOpen,
  Building2,
  GraduationCap,
  Layers,
  ShieldCheck,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import type { User } from "@/types";

const roleColors = ["#f97316", "#0ea5e9", "#22c55e", "#a855f7"];

const Dashboard = () => {
  const Link = useLink();
  const navigate = useNavigate();
  const { data: currentUser } = useGetIdentity<User>();
  const role = currentUser?.role;

  // Fetch role-specific overview
  const { query: overviewQuery } = useCustom<any>({
    url: "stats/overview",
    method: "get",
  });

  // Fetch role-specific latest activity
  const { query: latestQuery } = useCustom<any>({
    url: "stats/latest",
    method: "get",
  });

  // Fetch charts (Admin & Teacher)
  const { query: chartsQuery } = useCustom<any>({
    url: "stats/charts",
    method: "get",
    queryOptions: {
      enabled: role === "admin" || role === "teacher",
    },
  });

  const overview = overviewQuery.data?.data ?? {};
  const latest = latestQuery.data?.data ?? {};
  const charts = chartsQuery.data?.data ?? {};
  const isOverviewLoading = overviewQuery.isLoading;
  const isLatestLoading = latestQuery.isLoading;

  const kpis = useMemo(() => {
    if (role === "admin") {
      return [
        { label: "Total Users", value: overview.users, icon: Users, accent: "text-blue-600", bg: "bg-blue-50" },
        { label: "Teachers", value: overview.teachers, icon: GraduationCap, accent: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Admins", value: overview.admins, icon: ShieldCheck, accent: "text-amber-600", bg: "bg-amber-50" },
        { label: "Subjects", value: overview.subjects, icon: BookOpen, accent: "text-purple-600", bg: "bg-purple-50" },
        { label: "Departments", value: overview.departments, icon: Building2, accent: "text-cyan-600", bg: "bg-cyan-50" },
        { label: "Classes", value: overview.classes, icon: Layers, accent: "text-rose-600", bg: "bg-rose-50" },
      ];
    }
    if (role === "teacher") {
      return [
        { label: "My Classes", value: overview.myClasses, icon: Layers, accent: "text-rose-600", bg: "bg-rose-50" },
        { label: "Students", value: overview.totalStudents, icon: Users, accent: "text-blue-600", bg: "bg-blue-50" },
        { label: "Departments", value: overview.departments, icon: Building2, accent: "text-cyan-600", bg: "bg-cyan-50" },
      ];
    }
    if (role === "student") {
      return [
        { label: "Enrolled", value: overview.enrolledClasses, icon: CheckCircle2, accent: "text-emerald-600", bg: "bg-emerald-50" },
      ];
    }
    return [];
  }, [role, overview]);

  if (isOverviewLoading || isLatestLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, <span className="font-semibold text-foreground">{currentUser?.name}</span>! Here's what's happening.
          </p>
        </div>
        {role === "student" && (
            <Button asChild className="w-fit">
                <Link to="/enrollments/join">Join a New Class</Link>
            </Button>
        )}
      </div>

      {/* KPI Section */}
      <div className={`grid gap-4 grid-cols-2 lg:grid-cols-3 ${role === 'admin' ? 'xl:grid-cols-6' : ''}`}>
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden relative">
            <div className={`absolute top-0 right-0 p-3 opacity-10 ${kpi.accent}`}>
                <kpi.icon size={48} />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-bold tracking-wider">{kpi.label}</CardDescription>
              <CardTitle className="text-3xl font-bold">{kpi.value ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className={`h-1.5 w-full rounded-full ${kpi.bg} mt-1`}>
                    <div className={`h-full rounded-full ${kpi.accent.replace('text', 'bg')} w-2/3 opacity-40`} />
                </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      {(role === "admin" || role === "teacher") && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {/* User Distribution Pie Chart */}
          {role === "admin" && (
              <Card className="xl:col-span-1 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">User Distribution</CardTitle>
                  <CardDescription>By role and participation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          dataKey="total"
                          nameKey="role"
                          data={charts.usersByRole}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                        >
                          {charts.usersByRole?.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={roleColors[index % roleColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
          )}

          {/* Subjects per Department Bar Chart */}
          <Card className={`${role === 'admin' ? 'xl:col-span-2' : 'md:col-span-2'} shadow-sm`}>
            <CardHeader>
              <CardTitle className="text-lg">Departmental Landscape</CardTitle>
              <CardDescription>Number of active subjects in each department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.subjectsByDepartment}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="departmentName" axisLine={false} tickLine={false} fontSize={12} />
                    <YAxis axisLine={false} tickLine={false} fontSize={12} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="totalSubjects" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Classes per Subject Chart */}
          <Card className="md:col-span-2 xl:col-span-3 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Class Density</CardTitle>
              <CardDescription>Volume of classes offered per subject</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.classesBySubject} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="subjectName" type="category" axisLine={false} tickLine={false} fontSize={12} width={150} />
                    <Tooltip />
                    <Bar dataKey="totalClasses" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity / Lists Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Role-specific content lists */}
        {role === "admin" && latest.latestClasses && (
           <Card className="shadow-sm">
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <div>
                <CardTitle className="text-lg">Recent Classes</CardTitle>
                <CardDescription>Latest class additions to the system</CardDescription>
               </div>
               <Button variant="ghost" size="sm" asChild>
                  <Link to="/classes"><ArrowRight size={16} /></Link>
               </Button>
             </CardHeader>
             <CardContent className="space-y-4 pt-4">
               {latest.latestClasses.map((item: any) => (
                 <div key={item.id} className="flex items-center gap-4 group">
                    <div className="size-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 overflow-hidden shrink-0">
                        {item.bannerUrl ? <img src={item.bannerUrl} className="object-cover size-full" /> : <Layers size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors cursor-pointer" onClick={() => navigate(`/classes/show/${item.id}`)}>{item.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.subject?.name} • {item.teacher?.name}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] py-0 h-5">ID: {item.classCode || item.inviteCode}</Badge>
                 </div>
               ))}
             </CardContent>
           </Card>
        )}

        {role === "admin" && latest.latestTeachers && (
            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-lg">New Faculty</CardTitle>
                        <CardDescription>Recently onboarded instructors</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                        <Link to="/faculty"><ArrowRight size={16} /></Link>
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    {latest.latestTeachers.map((teacher: any) => (
                        <div key={teacher.id} className="flex items-center gap-4">
                            <div className="size-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 font-bold">
                                {teacher.name?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{teacher.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{teacher.email}</p>
                            </div>
                            <Badge variant="secondary" className="capitalize text-[10px]">{teacher.role}</Badge>
                        </div>
                    ))}
                </CardContent>
            </Card>
        )}

        {role === "teacher" && latest.myLatestClasses && (
           <Card className="shadow-sm">
             <CardHeader>
                <CardTitle className="text-lg">My Classrooms</CardTitle>
                <CardDescription>Overview of your active teaching sessions</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               {latest.myLatestClasses.length === 0 && (
                <div className="py-8 text-center border-2 border-dashed rounded-xl">
                   <p className="text-muted-foreground text-sm">You haven't created any classes yet.</p>
                   <Button variant="link" asChild><Link to="/classes/create">Create your first class</Link></Button>
                </div>
               )}
               {latest.myLatestClasses.map((item: any) => (
                 <Link key={item.id} to={`/classes/show/${item.id}`} className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/30 transition-all bg-card shadow-sm">
                    <div className="flex flex-col gap-1 overflow-hidden">
                        <span className="text-sm font-bold truncate">{item.name}</span>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">{item.subject?.name}</Badge>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock size={10} /> {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Code</p>
                            <p className="text-xs font-mono font-bold tracking-tight">{item.classCode || item.inviteCode}</p>
                        </div>
                        <Button size="sm" variant="outline" className="rounded-full px-4">Manage</Button>
                    </div>
                 </Link>
               ))}
             </CardContent>
           </Card>
        )}

        {role === "student" && latest.myEnrollments && (
           <Card className="shadow-sm">
             <CardHeader>
                <CardTitle className="text-lg">My Learning</CardTitle>
                <CardDescription>Classes you are currently enrolled in</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               {latest.myEnrollments.length === 0 && (
                    <div className="py-12 text-center border-2 border-dashed rounded-xl flex flex-col items-center gap-3">
                        <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                            <Layers size={24} className="text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold">No active enrollments</p>
                            <p className="text-muted-foreground text-xs px-8">You aren't enrolled in any classes. Use a class code to join one!</p>
                        </div>
                        <Button size="sm" asChild><Link to="/enrollments/join">Join Class</Link></Button>
                    </div>
               )}
               {latest.myEnrollments.map((item: any) => (
                 <Link key={item.id} to={`/classes/show/${item.class?.id}`} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/30 transition-all group">
                    <div className="size-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <BookOpen size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{item.class?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.subject?.name} • {item.teacher?.name}</p>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 border-none group-hover:bg-emerald-500 group-hover:text-white transition-colors">Active</Badge>
                 </Link>
               ))}
             </CardContent>
           </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
