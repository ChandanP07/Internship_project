import { useMemo, useState, type FormEvent } from "react";
import {
  useForm,
  useGetIdentity,
  useList,
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

const LecturesEdit = () => {
  const { data: currentUser } = useGetIdentity<User>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { formLoading, onFinish } = useForm({
    resource: "lectures",
    action: "edit",
  });

  const { query: classQuery } = useList<ClassItem>({
    resource: "classes",
    pagination: { pageSize: 200 },
  });
  const classes = classQuery.data?.data ?? [];

  const filteredClasses = useMemo(() => {
    // For now, show all classes - backend will validate ownership
    return classes;
  }, [classes]);

  if (currentUser?.role === "student") {
    return (
      <p className="text-sm text-red-500">
        Only teachers and admins can edit lectures.
      </p>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const values = {
      classId: Number(formData.get("classId")),
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      videoUrl: formData.get("videoUrl") as string,
      thumbnailUrl: formData.get("thumbnailUrl") as string || undefined,
      notesUrl: formData.get("notesUrl") as string || undefined,
    };

    if (!values.classId || !values.title || !values.description || !values.videoUrl) {
      setFormError("Class, title, description and video URL are required.");
      return;
    }
    setFormError(null);
    setIsSubmitting(true);

    onFinish(values).then(() => {
      setIsSubmitting(false);
    }).catch(() => {
      setFormError("Failed to update lecture. Please try again.");
      setIsSubmitting(false);
    });
  };

  if (formLoading) {
    return <p className="text-sm text-muted-foreground">Loading lecture...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Lecture</CardTitle>
        <CardDescription>Update lecture details.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Class</p>
            <Select name="classId" defaultValue="">
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {filteredClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Title</p>
            <Input
              name="title"
              placeholder="Lecture title"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Description</p>
            <Textarea
              name="description"
              placeholder="Lecture description"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Video URL</p>
            <Input
              name="videoUrl"
              placeholder="https://youtube.com/watch?v=... or direct video URL"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Thumbnail URL (optional)</p>
            <Input
              name="thumbnailUrl"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Notes URL (optional)</p>
            <Input
              name="notesUrl"
              placeholder="https://..."
            />
          </div>
          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Lecture"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default LecturesEdit;