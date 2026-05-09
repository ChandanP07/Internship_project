import { useState, type FormEvent } from "react";
import {
  useCreate,
  useGetIdentity,
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
import { InputPassword } from "@/components/classora-ui/form/input-password";
import UploadWidget from "@/components/upload-widget";
import type { User } from "@/types";

const FacultyCreate = () => {
  const { data: currentUser } = useGetIdentity<User>();
  const { mutate: createFaculty } = useCreate();
  const { list } = useNavigation();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    image: "",
    imageCldPubId: "",
  });

  if (currentUser?.role !== "admin") {
    return (
      <p className="text-sm text-red-500">
        Only admins can create faculty accounts.
      </p>
    );
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.name || !values.email || !values.password) {
      setFormError("Name, email and password are required.");
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    createFaculty(
      {
        resource: "users",
        values: {
          name: values.name,
          email: values.email,
          password: values.password,
          role: "teacher",
          image: values.image || undefined,
          imageCldPubId: values.imageCldPubId || undefined,
        },
      },
      {
        onSuccess: () => list("faculty"),
        onError: () => setFormError("Failed to create faculty account. Please try again."),
        onSettled: () => setIsSubmitting(false),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Faculty Account</CardTitle>
        <CardDescription>Add a new teacher to the system.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Full Name</p>
            <Input
              value={values.name ?? ""}
              onChange={(e) =>
                setValues((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Enter full name"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Email</p>
            <Input
              type="email"
              value={values.email ?? ""}
              onChange={(e) =>
                setValues((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="Enter email address"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Password</p>
            <InputPassword
              value={values.password ?? ""}
              onChange={(e) =>
                setValues((p) => ({ ...p, password: e.target.value }))
              }
              placeholder="Enter password"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Profile Image (optional)</p>
            <UploadWidget
              value={
                values.image
                  ? {
                      url: values.image,
                      publicId: values.imageCldPubId ?? "",
                    }
                  : null
              }
              onChange={(file) => {
                setValues((p) => ({
                  ...p,
                  image: file?.url ?? "",
                  imageCldPubId: file?.publicId ?? "",
                }));
              }}
            />
          </div>
          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Faculty Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default FacultyCreate;