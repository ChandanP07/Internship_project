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

type AnnouncementItem = {
  id: number;
  title: string;
  content: string;
  classId?: number;
  class?: { id: number; name: string };
  createdAt: string;
};

const AnnouncementsList = () => {
  const { data: currentUser } = useGetIdentity<User>();
  const { query } = useList<AnnouncementItem>({
    resource: "announcements",
    pagination: { pageSize: 50 },
  });

  const announcements = query.data?.data ?? [];
  const canCreate =
    currentUser?.role === "admin" || currentUser?.role === "teacher";

  if (query.isLoading)
    return (
      <p className="text-sm text-muted-foreground">
        Loading announcements...
      </p>
    );
  if (query.isError)
    return (
      <p className="text-sm text-red-500">Failed to load announcements.</p>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            Class and school-wide announcements.
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/announcements/create">New Announcement</Link>
          </Button>
        )}
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            No announcements yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {announcements.map((item: AnnouncementItem) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  {item.class && (
                    <Badge variant="secondary">{item.class.name}</Badge>
                  )}
                </div>
                <CardDescription>
                  {new Date(item.createdAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {item.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementsList;