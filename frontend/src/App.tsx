import { Authenticated, CanAccess, Refine, useGetIdentity } from "@refinedev/core";
import { DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import routerProvider, {
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router";
import "./App.css";
import { Toaster } from "./components/classora-ui/notification/toaster";
import { useNotificationProvider } from "./components/classora-ui/notification/use-notification-provider";
import { ThemeProvider } from "./components/classora-ui/theme/theme-provider";
import { accessControlProvider } from "./providers/accessControl";
import {
  BookOpen,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  Home,
  Users,
} from "lucide-react";
import { Layout } from "./components/classora-ui/layout/layout";
import { dataProvider } from "./providers/data";
import { authProvider } from "./providers/auth";
import { Login } from "./pages/login";
import { Register } from "./pages/register";
import { AccessDenied } from "./components/access-denied";

import Dashboard from "./pages/dashboard";
import SubjectsList from "./pages/subjects/list";
import SubjectsCreate from "./pages/subjects/create";
import SubjectsShow from "./pages/subjects/show";
import ClassesList from "./pages/classes/list";
import ClassesCreate from "./pages/classes/create";
import ClassesShow from "./pages/classes/show";
import ClassesEdit from "./pages/classes/edit";
import DepartmentsList from "./pages/departments/list";
import DepartmentsCreate from "./pages/departments/create";
import DepartmentShow from "./pages/departments/show";
import FacultyList from "./pages/faculty/list";
import FacultyShow from "./pages/faculty/show";
import EnrollmentRequests from "./pages/enrollments/requests";
import EnrollmentsJoin from "./pages/enrollments/join";
import AssignmentsList from "./pages/assignments/list";
import AssignmentsCreate from "./pages/assignments/create";
import AssignmentsShow from "./pages/assignments/show";
import SubmissionsList from "./pages/submissions/list";
import SubmissionsCreate from "./pages/submissions/create";
import Profile from "./pages/profile";
import { User } from "./types";

function EnrollmentRedirect() {
  const { data: user } = useGetIdentity<User>();
  if (user?.role === "teacher" || user?.role === "admin") {
    return <Navigate to="/enrollments/requests" replace />;
  }
  return <Navigate to="/enrollments/join" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ThemeProvider>
          <DevtoolsProvider>
            <Refine
              dataProvider={dataProvider}
              authProvider={authProvider}
              accessControlProvider={accessControlProvider}
              notificationProvider={useNotificationProvider()}
              routerProvider={routerProvider}
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
                projectId: "kkWuv7-GgBIfw-P8CGy0",
                title: {
                  text: "Classora",
                  icon: <Building2 className="text-primary w-6 h-6" />,
                },
              }}
              resources={[
                {
                  name: "dashboard",
                  list: "/",
                  meta: { label: "Home", icon: <Home /> },
                },
                {
                  name: "classes",
                  list: "/classes",
                  create: "/classes/create",
                  edit: "/classes/edit/:id",
                  show: "/classes/show/:id",
                  meta: { label: "Classes", icon: <GraduationCap /> },
                },
                {
                  name: "enrollments",
                  list: "/enrollments",
                  meta: { label: "Enrollments", icon: <ClipboardCheck /> },
                },
                {
                  name: "assignments",
                  list: "/assignments",
                  create: "/assignments/create",
                  show: "/assignments/show/:id",
                  meta: { label: "Assignments", icon: <ClipboardList /> },
                },
                {
                  name: "submissions",
                  list: "/submissions",
                  create: "/submissions/create",
                  show: "/submissions/show/:id",
                  meta: { label: "Submissions", icon: <FileText /> },
                },
                {
                  name: "subjects",
                  list: "/subjects",
                  create: "/subjects/create",
                  show: "/subjects/show/:id",
                  meta: { label: "Subjects", icon: <BookOpen /> },
                },
                {
                  name: "departments",
                  list: "/departments",
                  show: "/departments/show/:id",
                  create: "/departments/create",
                  meta: { label: "Departments", icon: <Building2 /> },
                },
                {
                  name: "users",
                  list: "/faculty",
                  show: "/faculty/show/:id",
                  meta: { label: "Faculty", icon: <Users /> },
                },
              ]}
            >
              <Routes>
                <Route
                  element={
                    <Authenticated key="public-routes" fallback={<Outlet />}>
                      <NavigateToResource fallbackTo="/" />
                    </Authenticated>
                  }
                >
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                </Route>

                <Route
                  element={
                    <Authenticated key="private-routes" fallback={<Login />}>
                      <Layout>
                        <Outlet />
                      </Layout>
                    </Authenticated>
                  }
                >
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />

                  {/* Classes */}
                  <Route path="classes">
                    <Route index element={<ClassesList />} />
                    <Route
                      path="create"
                      element={
                        <CanAccess
                          resource="classes"
                          action="create"
                          fallback={<AccessDenied />}
                        >
                          <ClassesCreate />
                        </CanAccess>
                      }
                    />
                    <Route path="show/:id" element={<ClassesShow />} />

                    <Route
                      path="edit/:id"
                      element={
                        <CanAccess
                          resource="classes"
                          action="edit"
                          fallback={<AccessDenied />}
                        >
                          <ClassesEdit />
                        </CanAccess>
                      }
                    />
                  </Route>

                  {/* Enrollments */}
                  <Route path="enrollments">
                    <Route index element={<EnrollmentRedirect />} />
                    <Route path="requests" element={<EnrollmentRequests />} />
                    <Route path="join" element={<EnrollmentsJoin />} />
                  </Route>

                  {/* Assignments */}
                  <Route path="assignments">
                    <Route index element={<AssignmentsList />} />
                    <Route
                      path="create"
                      element={
                        <CanAccess
                          resource="assignments"
                          action="create"
                          fallback={<AccessDenied />}
                        >
                          <AssignmentsCreate />
                        </CanAccess>
                      }
                    />
                    <Route path="show/:id" element={<AssignmentsShow />} />
                  </Route>

                  {/* Submissions */}
                  <Route path="submissions">
                    <Route index element={<SubmissionsList />} />
                    <Route
                      path="create"
                      element={
                        <CanAccess
                          resource="submissions"
                          action="create"
                          fallback={<AccessDenied />}
                        >
                          <SubmissionsCreate />
                        </CanAccess>
                      }
                    />
                  </Route>

                  {/* Subjects */}
                  <Route path="subjects">
                    <Route index element={<SubjectsList />} />
                    <Route
                      path="create"
                      element={
                        <CanAccess
                          resource="subjects"
                          action="create"
                          fallback={<AccessDenied />}
                        >
                          <SubjectsCreate />
                        </CanAccess>
                      }
                    />
                    <Route path="show/:id" element={<SubjectsShow />} />
                  </Route>

                  {/* Departments */}
                  <Route path="departments">
                    <Route index element={<DepartmentsList />} />
                    <Route
                      path="create"
                      element={
                        <CanAccess
                          resource="departments"
                          action="create"
                          fallback={<AccessDenied />}
                        >
                          <DepartmentsCreate />
                        </CanAccess>
                      }
                    />
                    <Route path="show/:id" element={<DepartmentShow />} />
                  </Route>

                  {/* Faculty (Users) */}
                  <Route
                    path="faculty"
                    element={
                      <CanAccess
                        resource="users"
                        action="list"
                        fallback={<AccessDenied />}
                      >
                        <Outlet />
                      </CanAccess>
                    }
                  >
                    <Route index element={<FacultyList />} />
                    <Route path="show/:id" element={<FacultyShow />} />
                  </Route>
                </Route>
              </Routes>

              <Toaster />
              <RefineKbar />
              <UnsavedChangesNotifier />
              <DocumentTitleHandler />
            </Refine>
          </DevtoolsProvider>
        </ThemeProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
