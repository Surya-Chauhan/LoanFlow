"use client";
// src/app/dashboard/reports/page.tsx
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { dashboardApi } from "@/lib/api";
import { RoleGuard } from "@/components/ui/RoleGuard";
import { Loan } from "@/types";
import {
  BarChart3, FileSpreadsheet, Loader2, IndianRupee, CheckCircle,
  XCircle, Banknote, FileText
} from "lucide-react";

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
}

const PAGE_SIZE = 100; // fetch in bulk for CSV export

// ─── Summary Card ────────────────────────────────────────
function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
  prefix,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  prefix?: string;
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">
          {prefix}{value.toLocaleString("en-IN")}
        </p>
        <p className="text-sm text-slate-500 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── CSV helpers (no external library) ───────────────────
function escapeCsv(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(loans: Loan[]): string {
  const headers = [
    "Loan ID",
    "Customer Name",
    "Customer Email",
    "Loan Amount",
    "Interest Rate",
    "Simple Interest",
    "Tenure (days)",
    "Total Repayment",
    "Status",
    "Created Date",
  ];
  const rows = loans.map((loan) => {
    const borrower = typeof loan.borrower === "object" ? loan.borrower : null;
    const cfg = loan.loanConfig;
    return [
      loan._id,
      borrower?.name || "",
      borrower?.email || "",
      cfg?.amount ?? "",
      cfg?.interestRate ?? "",
      cfg?.simpleInterest ?? "",
      cfg?.tenure ?? "",
      cfg?.totalRepayment ?? "",
      loan.status,
      loan.createdAt ? new Date(loan.createdAt).toISOString() : "",
    ].map(escapeCsv).join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}

function downloadCsv(csv: string, filename: string) {
  // Prepend BOM so Excel reads UTF-8 correctly
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Reports Content ─────────────────────────────────────
function ReportsContent() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getOverview();
      setOverview(res.data.data);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all loans across pages reusing the existing admin loans endpoint
      let allLoans: Loan[] = [];
      let page = 1;
      // First page to learn the total
      const first = await dashboardApi.getLoans(page, PAGE_SIZE, "");
      const total = first.data.data.total;
      allLoans = first.data.data.data;
      const totalPages = Math.ceil(total / PAGE_SIZE);
      while (page < totalPages) {
        page += 1;
        const res = await dashboardApi.getLoans(page, PAGE_SIZE, "");
        allLoans = allLoans.concat(res.data.data.data);
      }

      if (allLoans.length === 0) {
        toast.error("No loan data to export");
        return;
      }

      const csv = buildCsv(allLoans);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadCsv(csv, `loanflow-loans-${dateStr}.csv`);
      toast.success(`Exported ${allLoans.length} loans to CSV`);
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  if (loading || !overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const approved = overview.loans.sanctioned + overview.loans.disbursed + overview.loans.closed;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
            <BarChart3 size={20} className="text-cyan-600" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Reports</h1>
            <p className="text-slate-500 text-sm">Loan portfolio summary and data export</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-primary flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard
          icon={FileText}
          label="Total Loans"
          value={overview.totalLoanApplications}
          color="bg-slate-500"
        />
        <SummaryCard
          icon={CheckCircle}
          label="Approved"
          value={approved}
          color="bg-emerald-500"
        />
        <SummaryCard
          icon={XCircle}
          label="Rejected"
          value={overview.loans.rejected}
          color="bg-red-500"
        />
        <SummaryCard
          icon={Banknote}
          label="Disbursed"
          value={overview.loans.disbursed}
          color="bg-purple-500"
        />
        <SummaryCard
          icon={IndianRupee}
          label="Collection"
          value={overview.totalCollected}
          color="bg-brand-600"
          prefix="₹"
        />
      </div>

      <p className="text-xs text-slate-400">
        Use <span className="font-medium text-slate-600">Export CSV</span> to download the full loan
        register (Loan ID, customer, amount, interest, tenure, status, created date) generated from
        existing loan data.
      </p>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <ReportsContent />
    </RoleGuard>
  );
}