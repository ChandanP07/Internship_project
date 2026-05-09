// LMS frontend module scaffold added
import { useState, type FormEvent } from "react";
import {
  useCreate,
  useGetIdentity,
  useList,
  useNavigation,
} from "@refinedev/core";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@/types";

type ClassItem = { id: number; name: string };

const AnnouncementsCreate = () => {
  const { data: currentUser } = useGetIdentity<User>();
  const { mutate: createAnnouncement } = useCreate();
  const { list } = useNavigation();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState({
    title: "",
    content: "",
    classId: "",
  });

  const { query: classQuery } = useList<ClassItem>({
    resource: "classes",
    pagination: { pageSize: 200 },
  });
  const classes = classQuery.data?.data ?? [];

  const canManage =
    currentUser?.role === "admin" || currentUser?.role === "teacher";
  if (!canManage) {
    return (
      <p className="text-sm text-red-500">
        You do not have permission to create announcements.
      </p>
    );
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.title.trim() || !values.content.trim()) {
      setFormError("Title and content are required.");
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    createAnnouncement(
      {
        resource: "announcements",
        values: {
          title: values.title,
          content: values.content,
          ...(values.classId ? { classId: Number(values.classId) } : {}),
        },
      },
      {
        onSuccess: () => list("announcements"),
        onError: () => setFormError("Failed to create announcement."),
        onSettled: () => setIsSubmitting(false),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Announcement</CardTitle>
        <CardDescription>
          Post an announcement to a class or school-wide.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Class (optional)</p>
            <Select
              value={values.classId}
              onValueChange={(v) =>
                setValues((p) => ({ ...p, classId: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All classes / school-wide" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">School-wide</SelectItem>
                {classes.map((c: ClassItem) => (
                  <SelectItem key={`ann-class-${c.id}`} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Title</p>
            <Input
              value={values.title}
              onChange={(e) =>
                setValues((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Announcement title"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Content</p>
            <Textarea
              value={values.content}
              onChange={(e) =>
                setValues((p) => ({ ...p, content: e.target.value }))
              }
              placeholder="Announcement content..."
              rows={5}
            />
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Posting..." : "Post Announcement"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AnnouncementsCreate;