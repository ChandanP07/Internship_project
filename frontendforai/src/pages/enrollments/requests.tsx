import { useUpdate, useList } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { DataTable } from "@/components/classora-ui/data-table/data-table";
import { ListView } from "@/components/classora-ui/views/list-view";
import { Breadcrumb } from "@/components/classora-ui/layout/breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Check, X } from "lucide-react";

const EnrollmentRequests = () => {
  const { mutate: processRequest } = useUpdate();
  
  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "student",
        header: () => <p className="column-title">Student</p>,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              {row.original.student?.image && (
                <AvatarImage src={row.original.student.image} />
              )}
              <AvatarFallback>{row.original.student?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col truncate">
              <span className="text-sm font-medium">{row.original.student?.name}</span>
              <span className="text-xs text-muted-foreground">{row.original.student?.email}</span>
            </div>
          </div>
        )
      },
      {
        id: "class",
        header: () => <p className="column-title">Class</p>,
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium">{row.original.class?.name}</p>
            <p className="text-xs text-muted-foreground">Code: {row.original.class?.classCode || row.original.class?.inviteCode}</p>
          </div>
        )
      },
      {
        id: "status",
        header: () => <p className="column-title">Status</p>,
        cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>
      },
      {
        id: "actions",
        header: () => <p className="column-title">Actions</p>,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button 
                size="sm" 
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleAction(row.original.id, "approve")}
            >
              <Check className="size-4 mr-1" /> Approve
            </Button>
            <Button 
                size="sm" 
                variant="destructive"
                onClick={() => handleAction(row.original.id, "reject")}
            >
              <X className="size-4 mr-1" /> Reject
            </Button>
          </div>
        )
      }
    ],
    []
  );

  const handleAction = (id: number, action: "approve" | "reject") => {
    processRequest({
      resource: "enrollments",
      id,
      values: { action },
    });
  };

  const table = useTable<any>({
    columns,
    refineCoreProps: {
        resource: "enrollments/pending",
        pagination: { mode: "off" },
    }
  });

  return (
    <ListView>
      <Breadcrumb />
      <h1 className="page-title">Enrollment Requests</h1>
      <p className="text-muted-foreground mb-6">Manage students trying to join your classes.</p>
      
      <DataTable table={table} />
    </ListView>
  );
};

export default EnrollmentRequests;
