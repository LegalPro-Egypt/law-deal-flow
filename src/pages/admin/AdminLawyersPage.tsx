import { LawyerRequestsManager } from "@/components/LawyerRequestsManager";

export default function AdminLawyersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lawyers Management</h1>
        <p className="text-muted-foreground">
          Manage lawyer applications, verifications, and profiles
        </p>
      </div>
      <LawyerRequestsManager />
    </div>
  );
}