import { useGetIdentity, useShow } from "@refinedev/core";
import { useParams } from "react-router";
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

type LectureRecord = {
  id: number;
  classId: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  notesUrl?: string;
  class?: { id: number; name: string };
  teacher?: { id: string; name: string; email: string };
  createdAt: string;
};

const LecturesShow = () => {
  const { id } = useParams();
  const { data: currentUser } = useGetIdentity<User>();

  const { query } = useShow<LectureRecord>({
    resource: "lectures",
    id,
  });

  const record = query.data?.data;
  const canManage =
    currentUser?.role === "admin" || currentUser?.role === "teacher";

  if (query.isLoading)
    return <p className="text-sm text-muted-foreground">Loading lecture...</p>;
  if (query.isError || !record)
    return <p className="text-sm text-red-500">Failed to load lecture.</p>;

  // Extract YouTube video ID
  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  const embedUrl = getYouTubeEmbedUrl(record.videoUrl);
  const isYouTube = record.videoUrl.includes('youtube.com') || record.videoUrl.includes('youtu.be');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{record.title}</h1>
          <p className="text-sm text-muted-foreground">
            {record.class?.name ?? `Class #${record.classId}`} • {record.teacher?.name}
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link to={`/lectures/edit/${record.id}`}>Edit Lecture</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-0">
              {isYouTube ? (
                <iframe
                  src={embedUrl}
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={record.videoUrl}
                  controls
                  className="w-full aspect-video"
                  poster={record.thumbnailUrl}
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{record.description}</p>
            </CardContent>
          </Card>

          {record.notesUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Lecture Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <a href={record.notesUrl} target="_blank" rel="noopener noreferrer">
                    Download Notes
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lecture Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Class</p>
                <p className="text-sm text-muted-foreground">{record.class?.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Instructor</p>
                <p className="text-sm text-muted-foreground">{record.teacher?.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Uploaded</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(record.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Video Source</p>
                <p className="text-sm text-muted-foreground">
                  {isYouTube ? "YouTube" : "Direct Video"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LecturesShow;