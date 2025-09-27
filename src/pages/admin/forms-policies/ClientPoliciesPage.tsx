import { RealFormsPoliciesLayout } from '@/components/forms-policies/RealFormsPoliciesLayout';

export default function ClientPoliciesPage() {
  return (
    <RealFormsPoliciesLayout
      type="client_policies"
      title="Client Terms & Privacy"
      description="Manage client-facing Terms of Service and Privacy Policy documents with version control and publishing workflow."
    />
  );
}