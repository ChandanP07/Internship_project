import { useState } from "react";
import {
  useDelete,
  useGetIdentity,
  useList,
  useNavigation,
  useShow,
  useUpdate,
} from "@refinedev/core";
import { useParams } from "react-router";
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

type AssignmentRecord = {
  id: number;
  classId: number;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  status: "draft" | "published" | "closed" | string;
  attachmentUrl?: string | null;
  class?: { id: number; name: string };
  teacher?: { id: string; name: string; email: string };
};

type SubmissionRecord = {
  id: number;
  status: string;
  marks?: number | null;
  feedback?: string | null;
  submittedAt?: string;
  student?: { id: string; name: string };
};

const AssignmentsShow = () => {
  const { id } = useParams();
  const { data: currentUser } = useGetIdentity<User>();
  const { list } = useNavigation();
  const { mutate: deleteOne } = useDelete();
  const { mutate: updateStatus } = useUpdate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { query } = useShow<AssignmentRecord>({
    resource: "assignments",
    id,
  });

  const { query: submissionsQuery } = useList<SubmissionRecord>({
    resource: currentUser?.role === "student" ? "submissions/my" : "submissions",
    filters: [{ field: "assignmentId", operator: "eq", value: id }],
    queryOptions: { enabled: !!currentUser && !!id },
  });

  const record = query.data?.data;
  const submissions = submissionsQuery.data?.data ?? [];
  const canManage =
    currentUser?.role === "admin" || currentUser?.role === "teacher";

  if (query.isLoading)
    return (
      <p className="text-sm text-muted-foreground">Loading assignment...</p>
    );
  if (query.isError || !record)
    return <p className="text-sm text-red-500">Failed to load assignment.</p>;

  const nextStatus = record.status === "published" ? "closed" : "published";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{record.title}</CardTitle>
            <CardDescription>
              {record.class?.name ?? `Class #${record.classId}`} • Due{" "}
              {new Date(record.dueDate).toLocaleString()}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="capitalize">
            {record.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6">{record.description}</p>

        <div className="grid gap-2 text-sm text-muted-foreground">
          <p>
            Total Marks:{" "}
            <span className="font-medium text-foreground">
              {record.totalMarks}
            </span>
          </p>
          {record.teacher && (
            <p>
              Created By:{" "}
              <span className="font-medium text-foreground">
                {record.teacher.name}
              </span>
            </p>
          )}
          {record.attachmentUrl && (
            <a
              className="text-primary underline"
              href={record.attachmentUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open Attachment
            </a>
          )}
        </div>

        {/* Submission Section */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-3">Submissions</h3>
          {currentUser?.role === "student" ? (
            submissions.length > 0 ? (
              <div className="space-y-2">
                <Badge
                  variant={
                    submissions[0].status === "graded" ? "default" :
                    submissions[0].status === "late" ? "destructive" :
                    "secondary"
                  }
                  className="capitalize"
                >
                  {submissions[0].status}
                </Badge>
                {submissions[0].marks != null && (
                  <p className="text-sm">
                    Marks: <span className="font-medium">{submissions[0].marks}</span>
                  </p>
                )}
                {submissions[0].feedback && (
                  <div className="text-sm">
                    <p className="font-medium mb-1">Feedback:</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{submissions[0].feedback}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Submitted on {submissions[0].submittedAt ? new Date(submissions[0].submittedAt).toLocaleString() : 'Unknown'}
                </p>
              </div>
            ) : (
              <Button asChild>
                <a href={`/submissions/create?assignmentId=${record.id}`}>
                  Submit Assignment
                </a>
              </Button>
            )
          ) : (
            // Teacher view
            submissions.length > 0 ? (
              <div className="space-y-2">
                {submissions.map((sub) => (
                  <Card key={sub.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{sub.student?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Submitted: {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'Unknown'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              sub.status === "graded" ? "default" :
                              sub.status === "late" ? "destructive" :
                              "secondary"
                            }
                            className="capitalize"
                          >
                            {sub.status}
                          </Badge>
                          {sub.marks != null && (
                            <span className="text-sm font-medium">{sub.marks} marks</span>
                          )}
                        </div>
                      </div>
                      {sub.feedback && (
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{sub.feedback}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            )
          )}
        </div>

        {canManage && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              disabled={isUpdating}
              onClick={() => {
                setIsUpdating(true);
                updateStatus(
                  {
                    resource: "assignments",
                    id: record.id,
                    values: { status: nextStatus },
                  },
                  { onSettled: () => setIsUpdating(false) }
                );
              }}
            >
              {isUpdating ? "Updating..." : `Mark as ${nextStatus}`}
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                setIsDeleting(true);
                deleteOne(
                  { resource: "assignments", id: record.id },
                  {
                    onSuccess: () => list("assignments"),
                    onSettled: () => setIsDeleting(false),
                  }
                );
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AssignmentsShow;