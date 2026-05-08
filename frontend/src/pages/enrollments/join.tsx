import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCreate, useGetIdentity, useNotification } from "@refinedev/core";
import { useNavigate } from "react-router";

import { Breadcrumb } from "@/components/classora-ui/layout/breadcrumb";
import { CreateView } from "@/components/classora-ui/views/create-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { User } from "@/types";
import { CheckCircle2, Clock } from "lucide-react";

const joinSchema = z.object({
  classCode: z.string().min(3, "Class code is required"),
});

type JoinFormValues = z.infer<typeof joinSchema>;

const EnrollmentsJoin = () => {
  const navigate = useNavigate();
  const { open } = useNotification();
  const {
    mutateAsync: joinEnrollment,
    mutation: { isPending, isSuccess },
  } = useCreate();
  const { data: currentUser } = useGetIdentity<User>();

  const form = useForm<JoinFormValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      classCode: "",
    },
  });

  const classCode = form.watch("classCode");

  const onSubmit = async (values: JoinFormValues) => {
    if (!currentUser?.id) return;

    try {
        await joinEnrollment({
            resource: "enrollments/join",
            values: {
                classCode: values.classCode,
            },
        });
        
        open?.({
            type: "success",
            message: "Request Sent",
            description: "Your join request has been sent to the instructor for approval.",
        });
    } catch (error) {
        // Error is handled by notification provider or caught here
    }
  };

  const isSubmitDisabled = isPending || !currentUser?.id || !classCode || isSuccess;

  return (
    <CreateView className="class-view">
      <Breadcrumb />

      <h1 className="page-title">Join a Class</h1>
      <div className="intro-row">
        <p>Enter the class code provided by your teacher to request entry.</p>
      </div>

      <Separator />

      <div className="my-4 flex flex-col md:flex-row gap-6">
        <Card className="class-form-card flex-1">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gradient-orange">
              Join by Code
            </CardTitle>
          </CardHeader>

          <Separator />

          <CardContent className="mt-7">
            {isSuccess ? (
                <div className="text-center py-8 space-y-4">
                    <div className="flex justify-center">
                        <CheckCircle2 className="size-16 text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-semibold">Request Sent!</h2>
                    <p className="text-muted-foreground">
                        Your request to join class <strong>{classCode}</strong> is now pending approval from the teacher.
                    </p>
                    <Button variant="outline" onClick={() => navigate("/")}>Go to Dashboard</Button>
                </div>
            ) : (
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                    >
                        <FormField
                        control={form.control}
                        name="classCode"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="font-semibold">
                                Class Code
                            </FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. ABC123" {...field} className="text-lg h-12 uppercase" />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground mt-2">
                                7-8 characters, letters or numbers, no spaces or symbols.
                            </p>
                            </FormItem>
                        )}
                        />

                        <Button type="submit" size="lg" className="w-full" disabled={isSubmitDisabled}>
                        {isPending ? "Sending Request..." : "Request to Join"}
                        </Button>
                    </form>
                </Form>
            )}
          </CardContent>
        </Card>

        {!isSuccess && (
            <div className="flex-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                             <Clock className="size-4 text-orange-500" /> Pending Approval
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground leading-relaxed">
                        After you send a request, the instructor must approve your enrollment before you can see the class content or participate in activities.
                    </CardContent>
                </Card>

                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 dark:bg-blue-950 dark:border-blue-900">
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1 font-semibold uppercase">Troubleshooting</p>
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                        If the code isn't working, check with your teacher to make sure you're using the correct one, or try again later.
                    </p>
                </div>
            </div>
        )}
      </div>
    </CreateView>
  );
};

export default EnrollmentsJoin;
