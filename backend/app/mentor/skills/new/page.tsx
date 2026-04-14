import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NewSkillForm } from "@/app/mentor/skills/new/new-skill-form";

export default async function NewSkillPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/mentor/skills/new");
  }
  if (user.role !== "MENTOR") {
    redirect("/");
  }

  return <NewSkillForm />;
}
