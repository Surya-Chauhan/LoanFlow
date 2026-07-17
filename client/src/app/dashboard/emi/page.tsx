"use client";
// src/app/dashboard/emi/page.tsx
import { useEffect, useState, useCallback } from "react";
import { dashboardApi } from "@/lib/api";
import { RoleGuard } from "@/components/ui/RoleGuard";
import { DataTable } from "@/components/dashboard/DataTable";
import { User } from "@/types";
import { formatCurrency } from "@/lib/bre";
import { CalendarClock, IndianRupee, CheckCircle } from "lucide-react";

const PAGE_SIZE = 10;

interface EmiRow {
  _id: string;
  borrower: User | null;
  loanConfig: {
    amount: number;
    tenure: number;
    interestRate: number;
    simpleInterest: number;
    totalRepayment: number;
  };
  emi: number;
  paid: number;
  remaining: number;
  progress: number;
  status: string;
  disbursedAt: string | null;
  nextDueDate: string | null;
  createdAt: string;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── EMI Schedule Content ────────────────────────────────
function EmiContent() {
  const [rows, setRows] = useState<EmiRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getEmiSchedules(page, PAGE_SIZE);
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
    fetchSchedules();
  }, [fetchSchedules]);

  const columns = [
    {
      key: "customer",
      header: "Customer",
      render: (row: EmiRow) => (
        <div>
          <p className="font-semibold text-slate-800">{row.borrower?.name || "—"}</p>
          <p className="text-xs text-slate-400">{row.borrower?.email || "—"}</p>
        </div>
      ),
    },
    {
      key: "loan",
      header: "Loan",
      render: (row: EmiRow) => (
        <span className="font-bold font-mono text-slate-900">
          {formatCurrency(row.loanConfig.amount)}
        </span>
      ),
    },
    {
      key: "emi",
      header: "EMI Amount",
      render: (row: EmiRow) => (
        <span className="font-semibold font-mono text-brand-700">
          {formatCurrency(row.emi)}
        </span>
      ),
    },
    {
      key: "paid",
      header: "Paid",
      render: (row: EmiRow) => (
        <span className="font-mono text-emerald-700">{formatCurrency(row.paid)}</span>
      ),
    },
    {
      key: "remaining",
      header: "Remaining",
      render: (row: EmiRow) => (
        <span className="font-mono text-slate-700">{formatCurrency(row.remaining)}</span>
      ),
    },
    {
      key: "nextDue",
      header: "Next Due Date",
      render: (row: EmiRow) => (
        <span className="text-xs text-slate-500">
          {row.status === "closed" ? (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <CheckCircle size={12} /> Fully Paid
            </span>
          ) : (
            formatDate(row.nextDueDate)
          )}
        </span>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      width: "w-48",
      render: (row: EmiRow) => (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">{row.progress}%</span>
            <span className="text-xs text-slate-400 capitalize">{row.status}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                row.progress >= 100 ? "bg-emerald-500" : "bg-brand-600"
              }`}
              style={{ width: `${row.progress}%` }}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <CalendarClock size={20} className="text-orange-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">EMI Schedule</h1>
          <p className="text-slate-500 text-sm">Repayment progress for disbursed loans</p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={rows}
        total={total}
        page={page}
        limit={PAGE_SIZE}
        loading={loading}
        onPageChange={setPage}
        emptyMessage="No active EMI schedules"
        emptyIcon={<IndianRupee size={40} />}
      />
    </div>
  );
}

export default function EmiPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <EmiContent />
    </RoleGuard>
  );
}