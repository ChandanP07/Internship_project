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

type LectureItem = {
  id: number;
  classId: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  notesUrl?: string;
  class?: { id: number; name: string };
  teacher?: { id: string; name: string };
  createdAt: string;
};

const LecturesList = () => {
  const { data: currentUser } = useGetIdentity<User>();
  const { query } = useList<LectureItem>({
    resource: "lectures",
    pagination: { pageSize: 50 },
  });

  const lectures = query.data?.data ?? [];
  const canCreate = currentUser?.role === "teacher";

  if (query.isLoading)
    return <p className="text-sm text-muted-foreground">Loading lectures...</p>;
  if (query.isError)
    return <p className="text-sm text-red-500">Failed to load lectures.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lectures</h1>
          <p className="text-sm text-muted-foreground">
            {currentUser?.role === "student"
              ? "Recorded lectures from your enrolled classes."
              : "Manage recorded lectures for your classes."}
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/lectures/create">Create Lecture</Link>
          </Button>
        )}
      </div>

      {lectures.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            No lectures found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {lectures.map((item: LectureItem) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {item.title}
                    </CardTitle>
                    <CardDescription>
                      {item.class?.name ?? `Class #${item.classId}`} • {item.teacher?.name}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    Lecture
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/lectures/show/${item.id}`}>Watch</Link>
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

export default LecturesList;