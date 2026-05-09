import { AdvancedImage } from "@cloudinary/react";
import { useShow, useGetIdentity, useList } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useParams, useNavigate } from "react-router";

import { DataTable } from "@/components/classora-ui/data-table/data-table";
import { ShowButton } from "@/components/classora-ui/buttons/show";
import { EditButton } from "@/components/classora-ui/buttons/edit";
import {
  ShowView,
  ShowViewHeader,
} from "@/components/classora-ui/views/show-view";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { bannerPhoto } from "@/lib/cloudinary";
import { ClassDetails, User } from "@/types";
import { Users, GraduationCap, Building2, BookOpen, Key, FileText } from "lucide-react";

type ClassUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
};

const ClassesShow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const classId = id ?? "";
  const { data: currentUser } = useGetIdentity<User>();

  const { query } = useShow<ClassDetails>({
    resource: "classes",
  });

  const classDetails = query.data?.data;
  const isAdmin = currentUser?.role === "admin";
  const isTeacher = currentUser?.role === "teacher";
  const isStudent = currentUser?.role === "student";
  const { result: assignmentsResult } = useList<any>({
    resource: "assignments",
    filters: [
      { field: "classId", operator: "eq", value: Number(classId) },
    ],
    pagination: { pageSize: 5 },
    queryOptions: {
      enabled: Number.isFinite(Number(classId)),
    },
  });
  const assignments = assignmentsResult.data ?? [];

  const assignmentIds = assignments.map(a => a.id);
  const { result: submissionsResult } = useList<any>({
    resource: "submissions",
    filters: assignmentIds.length > 0 ? [
      { field: "assignmentId", operator: "in", value: assignmentIds },
    ] : [],
    pagination: { pageSize: 100 }, // Get all submissions for stats
    queryOptions: {
      enabled: assignmentIds.length > 0,
    },
  });
  const submissions = submissionsResult.data ?? [];

  const studentColumns = useMemo<ColumnDef<ClassUser>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        size: 240,
        header: () => <p className="column-title">Student</p>,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              {row.original.image && (
                <AvatarImage src={row.original.image} alt={row.original.name} />
              )}
              <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col truncate">
              <span className="text-sm font-medium truncate">{row.original.name}</span>
              <span className="text-xs text-muted-foreground truncate">
                {row.original.email}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "details",
        size: 100,
        header: () => <p className="column-title">Actions</p>,
        cell: ({ row }) => (
          <ShowButton
            resource="users"
            recordItemId={row.original.id}
            variant="ghost"
            size="sm"
          >
            View Profile
          </ShowButton>
        ),
      },
    ],
    []
  );

  const studentsTable = useTable<ClassUser>({
    columns: studentColumns,
    refineCoreProps: {
      resource: `classes/${classId}/users`,
      pagination: {
        pageSize: 5,
        mode: "server",
      },
      filters: {
        permanent: [
          {
            field: "role",
            operator: "eq",
            value: "student",
          },
        ],
      },
      queryOptions: {
        enabled: !isStudent, // Only fetch list for non-students
      }
    },
  });

  if (query.isLoading || query.isError || !classDetails) {
    return (
      <ShowView className="class-view class-show">
        <ShowViewHeader resource="classes" title="Class Details" />
        <div className="flex items-center justify-center py-20">
          <p className="state-message">
            {query.isLoading
              ? "Loading class details..."
              : query.isError
                ? "Failed to load class details."
                : "Class details not found."}
          </p>
        </div>
      </ShowView>
    );
  }

  const teacherName = classDetails.teacher?.name ?? "Unknown";
  const teacherInitials = teacherName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const placeholderUrl = `https://placehold.co/600x400?text=${encodeURIComponent(
    teacherInitials || "NA"
  )}`;

  return (
    <ShowView className="class-view class-show space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <ShowViewHeader
          resource="classes"
          title={classDetails.name}
        />

        {(isAdmin || isTeacher) && (
          <EditButton
            resource="classes"
            recordItemId={classDetails.id}
            variant="outline"
          >
            Edit Class
          </EditButton>
        )}
      </div>

      <div className="relative h-64 w-full rounded-2xl overflow-hidden shadow-lg group">
        {classDetails.bannerUrl ? (
          classDetails.bannerUrl.includes("res.cloudinary.com") &&
            classDetails.bannerCldPubId ? (
            <AdvancedImage
              cldImg={bannerPhoto(
                classDetails.bannerCldPubId ?? "",
                classDetails.name
              )}
              alt="Class Banner"
              className="object-cover size-full group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <img
              src={classDetails.bannerUrl}
              alt={classDetails.name}
              loading="lazy"
              className="object-cover size-full group-hover:scale-105 transition-transform duration-500"
            />
          )
        ) : (
          <div className="size-full bg-gradient-to-r from-orange-400 to-rose-400" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-6 left-8 text-white">
          <h1 className="text-3xl font-bold">{classDetails.name}</h1>
          <p className="opacity-90">{classDetails.subject?.name}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="text-primary" /> About this Class
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed italic">
                &quot;{classDetails.description || "No description provided for this class."}&quot;
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm">
                  <Users size={16} className="text-blue-500" />
                  <span className="font-medium">{classDetails.capacity} Seats Total</span>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm">
                  <Building2 size={16} className="text-cyan-500" />
                  <span className="font-medium">{classDetails.department?.name}</span>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm">
                  <BookOpen size={16} className="text-purple-500" />
                  <span className="font-medium">{classDetails.subject?.name} ({classDetails.subject?.code})</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {(isAdmin || isTeacher) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Enrolled Students</CardTitle>
                  <CardDescription>List of students currently in this class</CardDescription>
                </div>
                <Badge variant="outline" className="h-fit">Verified</Badge>
              </CardHeader>
              <CardContent>
                <DataTable table={studentsTable} paginationVariant="simple" />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Assignments</CardTitle>
                <CardDescription>Latest assignments for this class</CardDescription>
              </div>
              {(isAdmin || isTeacher) && (
                <Button size="sm" onClick={() => navigate("/assignments/create")}>
                  Create
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assignments yet.</p>
              ) : (
                assignments.map((assignment: any) => (
                  <div key={assignment.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{assignment.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : "N/A"}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/assignments/show/${assignment.id}`)}>
                      View
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {(isAdmin || isTeacher) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="text-primary" /> Submission Overview
                </CardTitle>
                <CardDescription>Submission status across all assignments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assignments to show submissions for.</p>
                ) : (
                  assignments.map((assignment: any) => {
                    const assignmentSubmissions = submissions.filter((s: any) => s.assignmentId === assignment.id);
                    const submitted = assignmentSubmissions.filter((s: any) => s.status === 'submitted' || s.status === 'late').length;
                    const graded = assignmentSubmissions.filter((s: any) => s.status === 'graded').length;
                    const total = assignmentSubmissions.length; // This assumes we have all enrolled students, but we might not

                    return (
                      <div key={assignment.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{assignment.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Due {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : "N/A"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="text-center">
                            <p className="font-medium">{submitted}</p>
                            <p className="text-xs text-muted-foreground">Submitted</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium">{graded}</p>
                            <p className="text-xs text-muted-foreground">Graded</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/assignments/show/${assignment.id}`)}>
                          View Details
                        </Button>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          )}

          {isStudent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="text-primary" /> My Submissions
                </CardTitle>
                <CardDescription>Your submission status for class assignments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assignments yet.</p>
                ) : (
                  assignments.map((assignment: any) => {
                    const mySubmission = submissions.find((s: any) =>
                      s.assignmentId === assignment.id && s.studentId === currentUser?.id
                    );

                    return (
                      <div key={assignment.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{assignment.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Due {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : "N/A"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {mySubmission ? (
                            <Badge
                              variant={
                                mySubmission.status === "graded" ? "default" :
                                  mySubmission.status === "late" ? "destructive" :
                                    "secondary"
                              }
                              className="capitalize"
                            >
                              {mySubmission.status}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not Submitted</Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/assignments/show/${assignment.id}`)}
                          >
                            {mySubmission ? "View" : "Submit"}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          )}

          {isStudent && (
            <Card className="bg-emerald-50 border-emerald-100 dark:bg-emerald-950 dark:border-emerald-900">
              <CardContent className="flex items-center gap-4 py-8">
                <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-900 dark:text-emerald-100">Learning alongside others</h3>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    You are enrolled in this class. Access your assignments and syllabus from the classroom portal.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardDescription className="text-xs uppercase font-bold tracking-widest">Instructor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-16 border-2 border-primary/20">
                  <AvatarImage src={classDetails.teacher?.image ?? placeholderUrl} />
                  <AvatarFallback>{teacherInitials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">{teacherName}</p>
                  <p className="text-sm text-muted-foreground">{classDetails.teacher?.email}</p>
                </div>
              </div>
              <Button variant="outline" className="w-full" size="sm">Contact Instructor</Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-orange-100 bg-orange-50/30 dark:border-orange-900/50 dark:bg-orange-950/20">
            <CardHeader className="bg-orange-100/50 dark:bg-orange-900/30 py-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-700 dark:text-orange-400 uppercase tracking-tighter">
                <Key size={14} /> Class Access
              </CardTitle>
            </CardHeader>
            <CardContent className="py-6 space-y-4">
              {isAdmin || isTeacher ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Class Code</p>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background border font-mono font-bold tracking-wider text-xl text-primary">
                    {classDetails.classCode || classDetails.inviteCode}
                    <Button size="icon" variant="ghost" onClick={() => navigator.clipboard.writeText(classDetails.classCode || classDetails.inviteCode || "")}>
                      <Badge variant="outline" className="text-[10px] lowercase py-0">copy</Badge>
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">Share this code with students to let them join.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Want to attend this class?</p>
                  <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={() => navigate("/enrollments/join")}>Join Now</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ShowView>
  );
};

const getInitials = (name = "") => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "";
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""
    }`.toUpperCase();
};

export default ClassesShow;
