import { StepNavigation } from "@/components/StepNavigation";

export default function WizardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <StepNavigation />
      {children}
    </div>
  );
}
