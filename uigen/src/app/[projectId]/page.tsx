import { getUser } from "@/actions";
import { getProject } from "@/actions/get-project";
import { redirect } from "next/navigation";
import { ClientMainContent } from "@/components/ClientMainContent";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { projectId } = await params;
  const user = await getUser();

  if (!user) {
    redirect("/");
  }

  let project;
  try {
    project = await getProject(projectId);
  } catch (error) {
    redirect("/");
  }

  return <ClientMainContent user={user} project={project} />;
}
