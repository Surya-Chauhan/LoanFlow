"use client";
// src/app/dashboard/loans/page.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { dashboardApi } from "@/lib/api";
import { RoleGuard } from "@/components/ui/RoleGuard";
import { DataTable } from "@/components/dashboard/DataTable";
import { Loan, LoanStatus } from "@/types";
import { formatCurrency, calculateLoan } from "@/lib/bre";
import {
  Receipt, Eye, CheckCircle, XCircle, Banknote, X, FileText, Filter, Search
} from "lucide-react";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: "" | LoanStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "applied", label: "Applied" },
  { value: "sanctioned", label: "Sanctioned" },
  { value: "rejected", label: "Rejected" },
  { value: "disbursed", label: "Disbursed" },
  { value: "closed", label: "Closed" },
];

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Loan Detail Modal ─────────────────────────────────────
function LoanDetailModal({
  loan,
  onClose,
  onApprove,
  onReject,
  onDisburse,
}: {
  loan: Loan;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onDisburse: () => void;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState("");
  const cfg = loan.loanConfig;
  const emi = cfg ? calculateLoan(cfg.amount, cfg.tenure).monthlyEMI : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-up">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h3 className="font-display text-xl font-bold text-slate-900">Loan Details</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{loan._id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Borrower */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Customer</p>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="font-semibold text-slate-800">
                {typeof loan.borrower === "object" ? loan.borrower.name : "—"}
              </p>
              <p className="text-xs text-slate-400">
                {typeof loan.borrower === "object" ? loan.borrower.email : ""}
              </p>
            </div>
          </div>

          {/* Loan Config */}
          {cfg && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Loan Configuration</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Principal", value: formatCurrency(cfg.amount) },
                  { label: "Tenure", value: `${cfg.tenure} days` },
                  { label: "Interest Rate", value: `${cfg.interestRate}% p.a.` },
                  { label: "Simple Interest", value: formatCurrency(cfg.simpleInterest) },
                  { label: "EMI (approx)", value: formatCurrency(emi) },
                  { label: "Total Repayment", value: formatCurrency(cfg.totalRepayment) },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejection reason */}
          {loan.status === "rejected" && loan.rejectionReason && (
            <div className="p-3 bg-red-50 rounded-xl">
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Rejection Reason</p>
              <p className="text-sm text-red-700 mt-1">{loan.rejectionReason}</p>
            </div>
          )}

          {/* Actions */}
          {rejectMode ? (
            <div className="space-y-3">
              <textarea
                className="input-field min-h-[80px] resize-none"
                placeholder="Enter rejection reason..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => setRejectMode(false)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={() => { if (reason.trim()) onReject(reason); else toast.error("Please enter a reason"); }}
                  className="btn-danger flex-1"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 pt-2">
              {loan.status === "applied" && (
                <>
                  <button
                    onClick={() => setRejectMode(true)}
                    className="btn-danger flex-1 flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                  <button onClick={onApprove} className="btn-success flex-1 flex items-center justify-center gap-2">
                    <CheckCircle size={16} /> Approve
                  </button>
                </>
              )}
              {loan.status === "sanctioned" && (
                <button onClick={onDisburse} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Banknote size={16} /> Disburse
                </button>
              )}
              {(loan.status === "disbursed" || loan.status === "closed" || loan.status === "rejected") && (
                <p className="text-sm text-slate-400 w-full text-center py-2">
                  No actions available for <span className={`status-${loan.status}`}>{loan.status}</span> loans.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Loans Content ────────────────────────────────────────
function LoansContent() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"" | LoanStatus>("");
  const [search, setSearch] = useState("");
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getLoans(page, PAGE_SIZE, statusFilter, search);
      const payload = res.data.data;
      setLoans(payload.data);
      setTotal(payload.total);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchLoans();
    }, 350);
  };

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const handleApprove = async (loanId: string) => {
    try {
      await dashboardApi.sanctionLoan(loanId);
      toast.success("Loan approved ✓");
      setSelectedLoan(null);
      fetchLoans();
    } catch {
      toast.error("Failed to approve loan");
    }
  };

  const handleReject = async (loanId: string, reason: string) => {
    try {
      await dashboardApi.rejectLoan(loanId, reason);
      toast.success("Loan rejected");
      setSelectedLoan(null);
      fetchLoans();
    } catch {
      toast.error("Failed to reject loan");
    }
  };

  const handleDisburse = async (loanId: string) => {
    try {
      await dashboardApi.disburseLoan(loanId);
      toast.success("Loan disbursed ✓");
      setSelectedLoan(null);
      fetchLoans();
    } catch {
      toast.error("Failed to disburse loan");
    }
  };

  const columns = [
    {
      key: "loanId",
      header: "Loan ID",
      render: (row: Loan) => (
        <span className="font-mono text-xs text-slate-500">
          {String(row._id).slice(-8).toUpperCase()}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
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
      key: "interest",
      header: "Interest",
      render: (row: Loan) => (
        <span className="font-mono text-sm text-slate-700">
          {row.loanConfig ? formatCurrency(row.loanConfig.simpleInterest) : "—"}
        </span>
      ),
    },
    {
      key: "tenure",
      header: "Tenure",
      render: (row: Loan) => <span>{row.loanConfig?.tenure || "—"} days</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row: Loan) => (
        <span className={`status-${row.status}`}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </span>
      ),
    },
    {
      key: "emi",
      header: "EMI",
      render: (row: Loan) => {
        const emi = row.loanConfig
          ? calculateLoan(row.loanConfig.amount, row.loanConfig.tenure).monthlyEMI
          : 0;
        return <span className="font-mono text-sm text-slate-700">{formatCurrency(emi)}</span>;
      },
    },
    {
      key: "created",
      header: "Created Date",
      render: (row: Loan) => (
        <span className="text-xs text-slate-500">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: Loan) => (
        <button
          onClick={() => setSelectedLoan(row)}
          className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors"
        >
          <Eye size={15} /> View Details
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Receipt size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Loan Management</h1>
            <p className="text-slate-500 text-sm">View and manage all loan applications</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by customer, email or Loan ID..."
            className="input-field pl-9"
          />
        </div>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={15} className="text-slate-400" />
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value || "all"}
            onClick={() => { setStatusFilter(opt.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${statusFilter === opt.value
                ? "bg-brand-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={loans}
        total={total}
        page={page}
        limit={PAGE_SIZE}
        loading={loading}
        onPageChange={setPage}
        emptyMessage="No loans found"
        emptyIcon={<FileText size={40} />}
      />

      {/* Details Modal */}
      {selectedLoan && (
        <LoanDetailModal
          loan={selectedLoan}
          onClose={() => setSelectedLoan(null)}
          onApprove={() => handleApprove(selectedLoan._id)}
          onReject={(reason) => handleReject(selectedLoan._id, reason)}
          onDisburse={() => handleDisburse(selectedLoan._id)}
        />
      )}
    </div>
  );
}

export default function LoansPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <LoansContent />
    </RoleGuard>
  );
}