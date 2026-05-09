import { useMemo, useState, type FormEvent } from "react";
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

const LecturesCreate = () => {
  const { data: currentUser } = useGetIdentity<User>();
  const { mutate: createLecture } = useCreate();
  const { list } = useNavigation();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState({
    classId: "",
    title: "",
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
    notesUrl: "",
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
        Only teachers and admins can create lectures.
      </p>
    );
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.classId || !values.title || !values.description || !values.videoUrl) {
      setFormError("Class, title, description and video URL are required.");
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    createLecture(
      {
        resource: "lectures",
        values: {
          classId: Number(values.classId),
          title: values.title,
          description: values.description,
          videoUrl: values.videoUrl,
          thumbnailUrl: values.thumbnailUrl || undefined,
          notesUrl: values.notesUrl || undefined,
        },
      },
      {
        onSuccess: () => list("lectures"),
        onError: () => setFormError("Failed to create lecture. Please try again."),
        onSettled: () => setIsSubmitting(false),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Lecture</CardTitle>
        <CardDescription>Upload a recorded lecture for your class.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Class</p>
            <Select
              value={values.classId}
              onValueChange={(value) => setValues((p) => ({ ...p, classId: value }))}
            >
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
              value={values.title ?? ""}
              onChange={(e) =>
                setValues((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Lecture title"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Description</p>
            <Textarea
              value={values.description ?? ""}
              onChange={(e) =>
                setValues((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Lecture description"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Video URL</p>
            <Input
              value={values.videoUrl ?? ""}
              onChange={(e) =>
                setValues((p) => ({ ...p, videoUrl: e.target.value }))
              }
              placeholder="https://youtube.com/watch?v=... or direct video URL"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Thumbnail URL (optional)</p>
            <Input
              value={values.thumbnailUrl ?? ""}
              onChange={(e) =>
                setValues((p) => ({ ...p, thumbnailUrl: e.target.value }))
              }
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Notes URL (optional)</p>
            <Input
              value={values.notesUrl ?? ""}
              onChange={(e) =>
                setValues((p) => ({ ...p, notesUrl: e.target.value }))
              }
              placeholder="https://..."
            />
          </div>
          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Lecture"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default LecturesCreate;