import { useState } from "react";
import {
  useDelete,
  useGetIdentity,
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

  const record = query.data?.data;
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

        {canManage && (
          <div className="flex gap-2 pt-2">
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