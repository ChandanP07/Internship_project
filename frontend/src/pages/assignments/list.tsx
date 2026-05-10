import { useGetIdentity, useList } from "@refinedev/core";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import type { User } from "@/types";

type AssignmentItem = {
  id: number;
  classId: number;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  status: "draft" | "published" | "closed" | string;
  class?: { id: number; name: string };
  teacher?: { id: string; name: string };
};

const AssignmentsList = () => {
  const { data: currentUser } = useGetIdentity<User>();
  const { query } = useList<AssignmentItem>({
    resource: "assignments",
    pagination: { pageSize: 50 },
  });

  const assignments = query.data?.data ?? [];
  const canCreate = currentUser?.role === "teacher";

  if (query.isLoading)
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48 mt-1" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  if (query.isError)
    return <p className="text-sm text-red-500">Failed to load assignments.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Assignments</h1>
          <p className="text-sm text-muted-foreground">
            {currentUser?.role === "student"
              ? "Published assignments from your enrolled classes."
              : "Manage class assignments, deadlines and marks."}
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/assignments/create">Create Assignment</Link>
          </Button>
        )}
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No assignments yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {currentUser?.role === "student"
                ? "Your teachers haven't posted any assignments yet."
                : "Create your first assignment to get started."}
            </p>
            {canCreate && (
              <Button asChild>
                <Link to="/assignments/create">Create Assignment</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map((item: AssignmentItem) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>
                      {item.class?.name ?? `Class #${item.classId}`} • Due{" "}
                      {new Date(item.dueDate).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {item.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Total Marks:{" "}
                    <span className="font-medium text-foreground">
                      {item.totalMarks}
                    </span>
                  </p>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/assignments/show/${item.id}`}>View</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignmentsList;