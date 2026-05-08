import { useMemo, useState, type FormEvent } from "react";
import { useCreate, useGetIdentity, useList, useNavigation } from "@refinedev/core";

import { assignmentSchema } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@/types";
type ClassItem = { id: number; name: string };

const AssignmentsCreate = () => {
  const { data: currentUser } = useGetIdentity<User>();
  const { mutate: createAssignment } = useCreate();
  const { list } = useNavigation();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState({
    classId: "",
    title: "",
    description: "",
    dueDate: "",
    totalMarks: "100",
    status: "published",
    attachmentUrl: "",
  });

  const { result: classResult } = useList<ClassItem>({
    resource: "classes",
    pagination: { pageSize: 200 },
  });

  const classes = classResult.data ?? [];

  const canManage = currentUser?.role === "admin" || currentUser?.role === "teacher";
  if (!canManage) {
    return <p className="text-sm text-red-500">You do not have permission to create assignments.</p>;
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const parsed = assignmentSchema.safeParse({
      classId: Number(values.classId),
      title: values.title,
      description: values.description,
      dueDate: values.dueDate,
      totalMarks: Number(values.totalMarks),
      attachmentUrl: values.attachmentUrl,
      status: values.status,
    });

    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Invalid form values");
      return;
    }

    setIsSubmitting(true);
    createAssignment(
      {
        resource: "assignments",
        values: {
          ...parsed.data,
          attachmentUrl: parsed.data.attachmentUrl || undefined,
        },
      },
      {
        onSuccess: () => list("assignments"),
        onError: () => setFormError("Failed to create assignment."),
        onSettled: () => setIsSubmitting(false),
      }
    );
  };

  const dueDateValue = useMemo(
    () => (values.dueDate ? values.dueDate.slice(0, 16) : ""),
    [values.dueDate]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Assignment</CardTitle>
        <CardDescription>Set up assignment details, due date and marks.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Class</p>
            <Select
              value={values.classId}
              onValueChange={(v) => setValues((prev) => ({ ...prev, classId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((item: ClassItem) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Title</p>
            <Input
              value={values.title}
              onChange={(e) => setValues((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Assignment title"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Description</p>
            <Textarea
              value={values.description}
              onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Assignment instructions"
              rows={5}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Due Date</p>
              <Input
                value={dueDateValue}
                onChange={(e) => setValues((prev) => ({ ...prev, dueDate: e.target.value }))}
                type="datetime-local"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Total Marks</p>
              <Input
                value={values.totalMarks}
                onChange={(e) => setValues((prev) => ({ ...prev, totalMarks: e.target.value }))}
                type="number"
                min={1}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Status</p>
              <Select
                value={values.status}
                onValueChange={(v) => setValues((prev) => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Attachment URL (optional)</p>
              <Input
                value={values.attachmentUrl}
                onChange={(e) => setValues((prev) => ({ ...prev, attachmentUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Assignment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AssignmentsCreate;
