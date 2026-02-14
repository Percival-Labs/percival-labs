import { SetupWizard } from "@/components/setup/setup-wizard";

export const metadata = {
  title: "Setup Your Harness | Percival Labs",
  description:
    "Build your personal AI infrastructure in minutes. Answer a few questions and get a provisioned Harness with curated skill recommendations.",
};

export default function SetupPage() {
  return <SetupWizard />;
}
