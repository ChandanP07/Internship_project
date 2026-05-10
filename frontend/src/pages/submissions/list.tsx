// LMS frontend module scaffold added
import { useGetIdentity, useList, useUpdate } from "@refinedev/core";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@/types";

type SubmissionItem = {
  id: number;
  assignmentId: number;
  studentId: string;
  submissionText?: string;
  fileUrl?: string;
  marks?: number | null;
  feedback?: string | null;
  status: string;
  submittedAt?: string;
  updatedAt?: string;
  reviewedBy?: string;
  gradedAt?: string;
  assignment?: { id: number; title: string; dueDate?: string };
  student?: { id: string; name: string };
  reviewer?: { id: string; name: string };
};

const SubmissionsList = () => {
  const { data: currentUser } = useGetIdentity<User>();
  const isStudent = currentUser?.role === "student";
  const { mutate: updateSubmission } = useUpdate();

  const { query } = useList<SubmissionItem>({
    resource: isStudent ? "submissions/my" : "submissions",
    pagination: { pageSize: 50 },
    queryOptions: { enabled: !!currentUser },
  });

  const submissions = query.data?.data ?? [];

  const [editingId, setEditingId] = useState<number | null>(null);
  const [gradeForm, setGradeForm] = useState({
    marks: "",
    feedback: "",
    status: "graded",
  });

  const startGrading = (submission: SubmissionItem) => {
    setEditingId(submission.id);
    setGradeForm({
      marks: submission.marks?.toString() || "",
      feedback: submission.feedback || "",
      status: submission.status === "graded" ? "graded" : "reviewed",
    });
  };

  const cancelGrading = () => {
    setEditingId(null);
    setGradeForm({ marks: "", feedback: "", status: "graded" });
  };

  const submitGrade = () => {
    if (!editingId) return;
    updateSubmission(
      {
        resource: "submissions",
        id: editingId,
        values: {
          marks: gradeForm.marks ? Number(gradeForm.marks) : null,
          feedback: gradeForm.feedback || null,
          status: gradeForm.status,
        },
      },
      {
        onSuccess: () => {
          query.refetch();
          cancelGrading();
        },
      }
    );
  };

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
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No submissions yet</h3>
            <p className="text-sm text-muted-foreground">
              {isStudent
                ? "You haven't submitted any assignments yet."
                : "No students have submitted assignments yet."}
            </p>
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
                    variant={
                      item.status === "graded" ? "default" :
                      item.status === "late" ? "destructive" :
                      item.status === "reviewed" ? "secondary" :
                      "outline"
                    }
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
              <CardContent className="space-y-3">
                {item.submissionText && (
                  <div className="text-sm">
                    <p className="font-medium mb-1">Submission:</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{item.submissionText}</p>
                  </div>
                )}
                {item.fileUrl && (
                  <div className="text-sm">
                    <p className="font-medium mb-1">File:</p>
                    <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {item.fileUrl}
                    </a>
                  </div>
                )}
                {(item.marks != null || item.feedback) && (
                  <div className="text-sm space-y-1">
                    {item.marks != null && (
                      <p>
                        Marks: <span className="font-medium">{item.marks}</span>
                      </p>
                    )}
                    {item.feedback && (
                      <div>
                        <p className="font-medium mb-1">Feedback:</p>
                        <p className="text-muted-foreground whitespace-pre-wrap">{item.feedback}</p>
                      </div>
                    )}
                    {item.reviewer && (
                      <p className="text-xs text-muted-foreground">
                        Graded by {item.reviewer.name} on {item.gradedAt ? new Date(item.gradedAt).toLocaleDateString() : ''}
                      </p>
                    )}
                  </div>
                )}
                {!isStudent && editingId === item.id && (
                  <div className="space-y-3 border-t pt-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Marks</label>
                      <Input
                        type="number"
                        value={gradeForm.marks}
                        onChange={(e) => setGradeForm(p => ({ ...p, marks: e.target.value }))}
                        placeholder="Enter marks"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Feedback</label>
                      <Textarea
                        value={gradeForm.feedback}
                        onChange={(e) => setGradeForm(p => ({ ...p, feedback: e.target.value }))}
                        placeholder="Enter feedback"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={submitGrade} size="sm">
                        Save
                      </Button>
                      <Button onClick={cancelGrading} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                {!isStudent && editingId !== item.id && (
                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => startGrading(item)} size="sm" variant="outline">
                      {item.status === "graded" ? "Update Grade" : "Grade"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubmissionsList;