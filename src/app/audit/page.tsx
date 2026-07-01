import React from "react";
import AuditClient from "@/components/features/audit/AuditClient";
import { getSystemAuditLogs } from "@/actions/auditActions";

export const revalidate = 0;

export default async function AuditPage() {
  const logs = await getSystemAuditLogs();

  return (
    <div className="py-2">
      <AuditClient initialLogs={logs} />
    </div>
  );
}
