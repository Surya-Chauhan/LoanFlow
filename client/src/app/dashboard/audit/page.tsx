"use client";
// src/app/dashboard/audit/page.tsx
import { useEffect, useState, useCallback } from "react";
import { dashboardApi } from "@/lib/api";
import { RoleGuard } from "@/components/ui/RoleGuard";
import { DataTable } from "@/components/dashboard/DataTable";
import { History, ShieldCheck } from "lucide-react";

const PAGE_SIZE = 15;

interface AuditRow {
  _id: string;
  action: string;
  entity: string;
  entityId: string | null;
  remarks: string;
  user: { name: string; email: string } | null;
  timestamp: string;
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AuditContent() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getAuditLogs(page, PAGE_SIZE);
      const payload = res.data.data;
      setRows(payload.data);
      setTotal(payload.total);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns = [
    {
      key: "action",
      header: "Action",
      render: (row: AuditRow) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 font-mono">
          {row.action}
        </span>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      render: (row: AuditRow) => <span className="text-sm text-slate-600">{row.entity}</span>,
    },
    {
      key: "remarks",
      header: "Remarks",
      render: (row: AuditRow) => (
        <span className="text-sm text-slate-700">{row.remarks || "—"}</span>
      ),
    },
    {
      key: "user",
      header: "Performed By",
      render: (row: AuditRow) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{row.user?.name || "System"}</p>
          <p className="text-xs text-slate-400">{row.user?.email || ""}</p>
        </div>
      ),
    },
    {
      key: "timestamp",
      header: "Timestamp",
      render: (row: AuditRow) => (
        <span className="text-xs text-slate-500">{formatDateTime(row.timestamp)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <History size={20} className="text-slate-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-slate-500 text-sm">Record of all loan & payment status changes</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        total={total}
        page={page}
        limit={PAGE_SIZE}
        loading={loading}
        onPageChange={setPage}
        emptyMessage="No audit logs recorded yet"
        emptyIcon={<ShieldCheck size={40} />}
      />
    </div>
  );
}

export default function AuditPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AuditContent />
    </RoleGuard>
  );
}