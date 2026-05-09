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
  const canCreate =
    currentUser?.role === "admin" || currentUser?.role === "teacher";

  if (query.isLoading)
    return <p className="text-sm text-muted-foreground">Loading assignments...</p>;
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
          <CardContent className="py-10 text-sm text-muted-foreground">
            No assignments found.
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