// LMS frontend module scaffold added
import { useGetIdentity, useList } from "@refinedev/core";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { User } from "@/types";

type SubmissionItem = {
  id: number;
  assignmentId: number;
  studentId: string;
  fileUrl?: string;
  grade?: number | null;
  feedback?: string | null;
  status: string;
  submittedAt?: string;
  assignment?: { id: number; title: string };
  student?: { id: string; name: string };
};

const SubmissionsList = () => {
  const { data: currentUser } = useGetIdentity<User>();
  const isStudent = currentUser?.role === "student";

  const { query } = useList<SubmissionItem>({
    resource: isStudent ? "submissions/my" : "submissions",
    pagination: { pageSize: 50 },
    queryOptions: { enabled: !!currentUser },
  });

  const submissions = query.data?.data ?? [];

  if (query.isLoading)
    return (
      <p className="text-sm text-muted-foreground">Loading submissions...</p>
    );
  if (query.isError)
    return <p className="text-sm text-red-500">Failed to load submissions.</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Submissions</h1>
        <p className="text-sm text-muted-foreground">
          {isStudent
            ? "Your submitted assignments."
            : "Student submissions for grading."}
        </p>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            No submissions found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {submissions.map((item: SubmissionItem) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">
                    {item.assignment?.title ?? `Assignment #${item.assignmentId}`}
                  </CardTitle>
                  <Badge
                    variant={item.status === "graded" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {item.status}
                  </Badge>
                </div>
                {!isStudent && item.student && (
                  <CardDescription>
                    Student: {item.student.name}
                  </CardDescription>
                )}
                {item.submittedAt && (
                  <CardDescription>
                    Submitted:{" "}
                    {new Date(item.submittedAt).toLocaleString()}
                  </CardDescription>
                )}
              </CardHeader>
              {(item.grade != null || item.feedback) && (
                <CardContent className="space-y-1 text-sm">
                  {item.grade != null && (
                    <p>
                      Grade:{" "}
                      <span className="font-medium">{item.grade}</span>
                    </p>
                  )}
                  {item.feedback && (
                    <p className="text-muted-foreground">{item.feedback}</p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubmissionsList;