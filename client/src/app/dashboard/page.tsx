"use client";
// src/app/dashboard/page.tsx
import { useEffect, useState, useCallback } from "react";
import { dashboardApi } from "@/lib/api";
import { RoleGuard } from "@/components/ui/RoleGuard";
import { DataTable } from "@/components/dashboard/DataTable";
import { Loan } from "@/types";
import { formatCurrency } from "@/lib/bre";
import { Users, FileText, Clock, Shield, Banknote, IndianRupee, TrendingUp, BarChart3, PieChart } from "lucide-react";

interface OverviewData {
  totalBorrowers: number;
  totalLoanApplications: number;
  loans: {
    applied: number;
    sanctioned: number;
    disbursed: number;
    closed: number;
    rejected: number;
  };
  totalCollected: number;
  recentLoans: Loan[];
}

// ─── Stat Card Component ───────────────────────────────────────
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color, 
  prefix 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number; 
  color: string;
  prefix?: string;
}) {
  return (
    <div className="card card-hover p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight truncate">
          {prefix}{value.toLocaleString("en-IN")}
        </p>
        <p className="text-sm text-slate-500 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Status Card Component ───────────────────────────────────
function StatusCard({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: number; 
  color: string;
}) {
  return (
    <div className="card card-hover p-4 text-center">
      <div className={`w-10 h-10 rounded-xl ${color} mx-auto mb-2 flex items-center justify-center shadow-sm`}>
        <PieChart size={18} className="text-white" />
      </div>
      <p className="text-xl font-bold text-slate-900 font-mono">{value}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
    </div>
  );
}

// ─── Skeleton loaders ────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="skeleton w-11 h-11 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-6 w-20" />
        <div className="skeleton h-3 w-28" />
      </div>
    </div>
  );
}

function StatusCardSkeleton() {
  return (
    <div className="card p-4 text-center">
      <div className="skeleton w-10 h-10 rounded-xl mx-auto mb-2" />
      <div className="skeleton h-5 w-8 mx-auto mb-1" />
      <div className="skeleton h-3 w-16 mx-auto" />
    </div>
  );
}

// ─── Dashboard Content ───────────────────────────────────────
function DashboardContent() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getOverview();
      setData(res.data.data);
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const columns = [
    {
      key: "borrower",
      header: "Borrower",
      render: (row: Loan) => {
        const borrower = typeof row.borrower === "object" ? row.borrower : null;
        return (
          <div>
            <p className="font-semibold text-slate-800">{borrower?.name || "—"}</p>
            <p className="text-xs text-slate-400">{borrower?.email || "—"}</p>
          </div>
        );
      },
    },
    {
      key: "amount",
      header: "Loan Amount",
      render: (row: Loan) => (
        <span className="font-bold font-mono text-slate-900">
          {row.loanConfig ? formatCurrency(row.loanConfig.amount) : "—"}
        </span>
      ),
    },
    {
      key: "tenure",
      header: "Tenure",
      render: (row: Loan) => <span>{row.loanConfig?.tenure || "—"} days</span>,
    },
    {
      key: "repayment",
      header: "Total Repayment",
      render: (row: Loan) => (
        <span className="font-mono text-sm">
          {row.loanConfig ? formatCurrency(row.loanConfig.totalRepayment) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: Loan) => (
        <span className={`status-${row.status}`}>{row.status.charAt(0).toUpperCase() + row.status.slice(1)}</span>
      ),
    },
    {
      key: "applied",
      header: "Applied On",
      render: (row: Loan) => (
        <span className="text-xs text-slate-500">
          {new Date(row.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ),
    },
  ];

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div>
          <div className="skeleton h-7 w-56 mb-2" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={`stat-${i}`} />
          ))}
        </div>
        <div>
          <div className="skeleton h-5 w-48 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <StatusCardSkeleton key={`status-${i}`} />
            ))}
          </div>
        </div>
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const totalApplications = data.loans.applied + data.loans.sanctioned + data.loans.disbursed + data.loans.closed + data.loans.rejected;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500 text-sm mt-0.5">Monitor your loan portfolio at a glance</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          icon={Users} 
          label="Total Customers" 
          value={data.totalBorrowers} 
          color="bg-sky-500" 
        />
        <StatCard 
          icon={FileText} 
          label="Total Loan Applications" 
          value={totalApplications} 
          color="bg-indigo-500" 
        />
        <StatCard 
          icon={Clock} 
          label="Pending Approval" 
          value={data.loans.applied} 
          color="bg-amber-500" 
        />
        <StatCard 
          icon={Shield} 
          label="Approved Loans" 
          value={data.loans.sanctioned} 
          color="bg-emerald-500" 
        />
        <StatCard 
          icon={Banknote} 
          label="Disbursed Loans" 
          value={data.loans.disbursed} 
          color="bg-purple-500" 
        />
        <StatCard 
          icon={IndianRupee} 
          label="Total Collection" 
          value={data.totalCollected} 
          color="bg-brand-600"
          prefix="₹"
        />
      </div>

      {/* Loan Status Distribution */}
      <div>
        <h2 className="font-display text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <BarChart3 size={18} />
          Loan Status Distribution
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatusCard label="Applied" value={data.loans.applied} color="bg-blue-500" />
          <StatusCard label="Sanctioned" value={data.loans.sanctioned} color="bg-amber-500" />
          <StatusCard label="Disbursed" value={data.loans.disbursed} color="bg-purple-500" />
          <StatusCard label="Closed" value={data.loans.closed} color="bg-emerald-500" />
          <StatusCard label="Rejected" value={data.loans.rejected} color="bg-red-500" />
        </div>
      </div>

      {/* Recent Applications */}
      <div>
        <h2 className="font-display text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp size={18} />
          Recent Loan Applications
        </h2>
        <DataTable
          columns={columns}
          data={data.recentLoans}
          total={data.recentLoans.length}
          page={1}
          limit={5}
          loading={loading}
          onPageChange={() => {}}
          emptyMessage="No recent applications"
          emptyIcon={<FileText size={40} />}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <DashboardContent />
    </RoleGuard>
  );
}