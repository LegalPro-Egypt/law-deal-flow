import { FormsPoliciesLayout } from '@/components/forms-policies/FormsPoliciesLayout';

export default function ClientPoliciesPage() {
  return (
    <FormsPoliciesLayout
      type="client_policies"
      title="Client Terms & Privacy"
      description="Manage client-facing Terms of Service and Privacy Policy documents with version control and publishing workflow."
    />
  );
}