import { Button } from "@/components/ui/button";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

export const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
        <div className="relative size-24 bg-rose-50 dark:bg-rose-950/30 rounded-2xl flex items-center justify-center text-rose-600 shadow-xl border border-rose-100 dark:border-rose-900/50">
          <ShieldAlert size={48} strokeWidth={1.5} />
        </div>
      </div>

      <h1 className="text-4xl font-bold tracking-tight mb-2">Access Denied</h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        You don't have the necessary permissions to view this page. If you believe this is an error, please contact your administrator.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)} 
          className="gap-2 h-11 px-6 rounded-xl hover:bg-muted/50"
        >
          <ArrowLeft size={18} />
          Go Back
        </Button>
        <Button 
          onClick={() => navigate("/")} 
          className="gap-2 h-11 px-6 rounded-xl shadow-lg shadow-primary/20"
        >
          <Home size={18} />
          Back to Dashboard
        </Button>
      </div>

      <div className="mt-12 p-4 rounded-xl border border-dashed border-border bg-muted/30">
        <p className="text-xs font-mono text-muted-foreground">
          Error Code: 403_FORBIDDEN_RESOURCE
        </p>
      </div>
    </div>
  );
};
