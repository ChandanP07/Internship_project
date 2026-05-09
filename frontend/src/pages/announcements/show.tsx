import { useShow } from "@refinedev/core";
import { useParams } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AnnouncementRecord = {
  id: number;
  title: string;
  content: string;
  class?: { id: number; name: string };
  createdAt: string;
};

const AnnouncementsShow = () => {
  const { id } = useParams();
  const { query } = useShow<AnnouncementRecord>({
    resource: "announcements",
    id,
  });
  const record = query.data?.data;

  if (query.isLoading)
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (query.isError || !record)
    return (
      <p className="text-sm text-red-500">Failed to load announcement.</p>
    );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{record.title}</CardTitle>
          {record.class && (
            <Badge variant="secondary">{record.class.name}</Badge>
          )}
        </div>
        <CardDescription>
          {new Date(record.createdAt).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed">{record.content}</p>
      </CardContent>
    </Card>
  );
};

export default AnnouncementsShow;