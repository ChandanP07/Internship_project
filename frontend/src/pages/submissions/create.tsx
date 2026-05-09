// LMS frontend module scaffold added
import { useState, type FormEvent } from "react";
import { useCreate, useGetIdentity, useNavigation } from "@refinedev/core";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@/types";

const SubmissionsCreate = () => {
  const { data: currentUser } = useGetIdentity<User>();
  const { mutate: createSubmission } = useCreate();
  const { list } = useNavigation();
  const [searchParams] = useSearchParams();
  const assignmentIdFromUrl = searchParams.get("assignmentId") ?? "";

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState({
    assignmentId: assignmentIdFromUrl,
    fileUrl: "",
    notes: "",
  });

  if (currentUser?.role !== "student") {
    return (
      <p className="text-sm text-red-500">
        Only students can submit assignments.
      </p>
    );
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.assignmentId) {
      setFormError("Assignment ID is required.");
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    createSubmission(
      {
        resource: "submissions",
        values: {
          assignmentId: Number(values.assignmentId),
          fileUrl: values.fileUrl || undefined,
          notes: values.notes || undefined,
        },
      },
      {
        onSuccess: () => list("submissions"),
        onError: () => setFormError("Failed to submit. Please try again."),
        onSettled: () => setIsSubmitting(false),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Assignment</CardTitle>
        <CardDescription>Upload your work for grading.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Assignment ID</p>
            <Input
              value={values.assignmentId}
              onChange={(e) =>
                setValues((p) => ({ ...p, assignmentId: e.target.value }))
              }
              placeholder="Assignment ID"
              readOnly={!!assignmentIdFromUrl}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">File URL (optional)</p>
            <Input
              value={values.fileUrl}
              onChange={(e) =>
                setValues((p) => ({ ...p, fileUrl: e.target.value }))
              }
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Notes (optional)</p>
            <Textarea
              value={values.notes}
              onChange={(e) =>
                setValues((p) => ({ ...p, notes: e.target.value }))
              }
              placeholder="Any notes for your teacher..."
              rows={3}
            />
          </div>
          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SubmissionsCreate;