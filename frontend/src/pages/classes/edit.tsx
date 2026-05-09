import { useEffect } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useBack, useList, useOne } from "@refinedev/core";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Breadcrumb } from "@/components/classora-ui/layout/breadcrumb";
import { EditView } from "@/components/classora-ui/views/edit-view";

import UploadWidget from "@/components/upload-widget";

import { Loader2 } from "lucide-react";

import { classSchema } from "@/lib/schema";

import { Subject, User } from "@/types";

import z from "zod";

type ClassesEditProps = {
  id?: string;
};

const ClassesEdit = ({ id }: ClassesEditProps) => {
  const back = useBack();

  const form = useForm({
    resolver: zodResolver(classSchema),
    refineCoreProps: {
      resource: "classes",
      action: "edit",
      id,
      meta: {
        method: "put",
      },
    },
    defaultValues: {
      name: "",
      description: "",
      bannerUrl: "",
      bannerCldPubId: "",
      teacherId: "",
      status: "active",
    },
  });

  const {
    refineCore: { onFinish },
    handleSubmit,
    formState: { isSubmitting, errors },
    control,
    reset,
  } = form;

  const bannerPublicId = form.watch("bannerCldPubId");

  // Fetch class data
  const { result: classData, query } = useOne({
    resource: "classes",
    id: id!,
    queryOptions: {
      enabled: !!id,
    },
  });
  const classLoading = query.isLoading;

  // Fetch subjects
  const { query: subjectsQuery } = useList<Subject>({
    resource: "subjects",
    pagination: {
      pageSize: 100,
    },
  });

  // Fetch teachers
  const { query: teachersQuery } = useList<User>({
    resource: "users",
    filters: [
      {
        field: "role",
        operator: "eq",
        value: "teacher",
      },
    ],
    pagination: {
      pageSize: 100,
    },
  });

  const subjects = subjectsQuery.data?.data || [];
  const teachers = teachersQuery.data?.data || [];

  const subjectsLoading = subjectsQuery.isLoading;
  const teachersLoading = teachersQuery.isLoading;

  // Populate form
  useEffect(() => {
    if (classData?.data) {
      const cls = classData.data;

      reset({
        name: cls.name ?? "",
        description: cls.description ?? "",
        bannerUrl: cls.bannerUrl ?? "",
        bannerCldPubId: cls.bannerCldPubId ?? "",
        teacherId: cls.teacherId ?? "",
        subjectId: cls.subjectId,
        capacity: cls.capacity,
        status: cls.status ?? "active",
      });
    }
  }, [classData, reset]);

  const onSubmit = async (values: z.infer<typeof classSchema>) => {
    try {
      await onFinish(values);
    } catch (error) {
      console.error("Error updating class:", error);
    }
  };

  if (classLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <EditView className="class-view">
      <Breadcrumb />

      <h1 className="page-title">Edit Class</h1>

      <div className="intro-row">
        <p>Update the class information below.</p>

        <Button onClick={() => back()}>
          Go Back
        </Button>
      </div>

      <Separator />

      <div className="my-4 flex items-center">
        <Card className="class-form-card">
          <CardHeader className="relative z-10">
            <CardTitle className="text-2xl pb-0 font-bold text-gradient-orange">
              Update class
            </CardTitle>
          </CardHeader>

          <Separator />

          <CardContent className="mt-7">
            <Form {...form}>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
              >
                {/* Banner */}
                <FormField
                  control={control}
                  name="bannerUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Banner Image{" "}
                        <span className="text-orange-600">*</span>
                      </FormLabel>

                      <FormControl>
                        <UploadWidget
                          value={
                            field.value
                              ? {
                                url: field.value,
                                publicId: bannerPublicId ?? "",
                              }
                              : null
                          }
                          onChange={(file) => {
                            if (file) {
                              field.onChange(file.url);

                              form.setValue(
                                "bannerCldPubId",
                                file.publicId,
                                {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                }
                              );
                            } else {
                              field.onChange("");

                              form.setValue("bannerCldPubId", "", {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
                            }
                          }}
                        />
                      </FormControl>

                      <FormMessage />

                      {errors.bannerCldPubId && !errors.bannerUrl && (
                        <p className="text-destructive text-sm">
                          {errors.bannerCldPubId.message?.toString()}
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {/* Name */}
                <FormField
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Class Name{" "}
                        <span className="text-orange-600">*</span>
                      </FormLabel>

                      <FormControl>
                        <Input
                          placeholder="Introduction to Biology - Section A"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Subject + Teacher */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name="subjectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Subject{" "}
                          <span className="text-orange-600">*</span>
                        </FormLabel>

                        <Select
                          onValueChange={(value) =>
                            field.onChange(Number(value))
                          }
                          value={field.value?.toString() ?? ""}
                          disabled={subjectsLoading}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a subject" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            {subjects.map((subject) => (
                              <SelectItem
                                key={subject.id}
                                value={subject.id.toString()}
                              >
                                {subject.name} ({subject.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="teacherId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Teacher{" "}
                          <span className="text-orange-600">*</span>
                        </FormLabel>

                        <Select
                          onValueChange={field.onChange}
                          value={field.value?.toString() ?? ""}
                          disabled={teachersLoading}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a teacher" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            {teachers.map((teacher) => (
                              <SelectItem
                                key={teacher.id}
                                value={teacher.id}
                              >
                                {teacher.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Capacity + Status */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Capacity{" "}
                          <span className="text-orange-600">*</span>
                        </FormLabel>

                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            placeholder="30"
                            onChange={(e) => {
                              const value = e.target.value;

                              field.onChange(
                                value ? Number(value) : undefined
                              );
                            }}
                            value={
                              (field.value as number | undefined) ?? ""
                            }
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Status{" "}
                          <span className="text-orange-600">*</span>
                        </FormLabel>

                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            <SelectItem value="active">
                              Active
                            </SelectItem>

                            <SelectItem value="inactive">
                              Inactive
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <FormField
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Description{" "}
                        <span className="text-orange-600">*</span>
                      </FormLabel>

                      <FormControl>
                        <Textarea
                          placeholder="Brief description about the class"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                >
                  {isSubmitting ? (
                    <div className="flex gap-1">
                      <span>Updating Class...</span>

                      <Loader2 className="inline-block ml-2 animate-spin" />
                    </div>
                  ) : (
                    "Update Class"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </EditView>
  );
};

export default ClassesEdit;