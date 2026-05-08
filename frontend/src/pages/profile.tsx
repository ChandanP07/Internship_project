import { useGetIdentity, useUpdate } from "@refinedev/core";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/types";
import { User as UserIcon, Mail, ShieldCheck, Calendar } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const Profile = () => {
  const { data: user, isLoading } = useGetIdentity<User>();
  const { mutate: updateProfile, isLoading: isUpdating } = useUpdate();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.name ?? "",
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    if (!user?.id) return;
    updateProfile({
      resource: "users",
      id: user.id,
      values: {
        name: values.name,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Profile Info Sidebar */}
        <Card className="md:col-span-1 border-none shadow-md overflow-hidden bg-primary/5">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="relative inline-block mb-4">
              <Avatar className="size-24 border-4 border-background shadow-xl">
                <AvatarImage src={user?.image ?? ""} />
                <AvatarFallback className="text-2xl">{user?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 size-7 bg-primary rounded-full border-2 border-background flex items-center justify-center text-primary-foreground">
                <ShieldCheck size={14} />
              </div>
            </div>
            
            <h2 className="text-xl font-bold mb-1">{user?.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">{user?.email}</p>
            <Badge variant="secondary" className="px-4 py-1 capitalize bg-white dark:bg-zinc-900 border-primary/20">{user?.role}</Badge>
            
            <Separator className="my-6" />
            
            <div className="space-y-4 text-left px-2">
                <div className="flex items-center gap-3 text-sm">
                    <Mail size={16} className="text-muted-foreground" />
                    <span className="truncate">{user?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <UserIcon size={16} className="text-muted-foreground" />
                    <span className="capitalize">{user?.role} Access</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <Calendar size={16} className="text-muted-foreground" />
                    <span>Joined April 2024</span>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Update your personal information below.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Name" {...field} className="h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input value={user?.email ?? ""} disabled className="h-11 bg-muted/30 italic" />
                  </FormControl>
                  <p className="text-[10px] text-muted-foreground">Email address cannot be changed for security reasons.</p>
                </FormItem>

                <div className="flex justify-end pt-4">
                  <Button type="submit" size="lg" disabled={isUpdating} className="px-8 shadow-lg shadow-primary/20">
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
