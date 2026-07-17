"use client";
// src/app/dashboard/customers/page.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { dashboardApi } from "@/lib/api";
import { RoleGuard } from "@/components/ui/RoleGuard";
import { DataTable } from "@/components/dashboard/DataTable";
import { Customer } from "@/types";
import { formatCurrency } from "@/lib/bre";
import {
  Search, UserCheck, Eye, X, Mail, Calendar,
  FileText, BadgeCheck, AlertCircle, User as UserIcon
} from "lucide-react";

const PAGE_SIZE = 10;

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return <span className="status-pending">No Application</span>;
  }
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`status-${status}`}>{label}</span>;
}

// ─── Customer Details Modal ───────────────────────────────
function CustomerDetailsModal({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-fade-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-600 flex items-center justify-center text-white">
              <UserIcon size={20} />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-lg leading-tight">
                {customer.name}
              </h3>
              <p className="text-xs text-slate-500">Customer Profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Contact */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Mail size={16} className="text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <p className="text-sm font-medium text-slate-800">{customer.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Calendar size={16} className="text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Registered Date</p>
                <p className="text-sm font-medium text-slate-800">
                  {formatDate(customer.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Profile details */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserCheck size={13} /> Profile
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border border-slate-100 rounded-xl">
                <p className="text-xs text-slate-400">PAN</p>
                <p className="text-sm font-medium text-slate-800 font-mono">
                  {customer.pan || "—"}
                </p>
              </div>
              <div className="p-3 border border-slate-100 rounded-xl">
                <p className="text-xs text-slate-400">Employment</p>
                <p className="text-sm font-medium text-slate-800 capitalize">
                  {customer.employmentMode?.replace("-", " ") || "—"}
                </p>
              </div>
              <div className="p-3 border border-slate-100 rounded-xl">
                <p className="text-xs text-slate-400">Monthly Salary</p>
                <p className="text-sm font-medium text-slate-800">
                  {customer.monthlySalary ? formatCurrency(customer.monthlySalary) : "—"}
                </p>
              </div>
              <div className="p-3 border border-slate-100 rounded-xl">
                <p className="text-xs text-slate-400">Eligibility (BRE)</p>
                <p className="text-sm font-medium text-slate-800 capitalize">
                  {customer.breStatus}
                </p>
              </div>
            </div>
          </div>

          {/* Loan status */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText size={13} /> Loan Information
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border border-slate-100 rounded-xl">
                <p className="text-xs text-slate-400">Application Status</p>
                <div className="mt-1">
                  <StatusBadge status={customer.applicationStatus} />
                </div>
              </div>
              <div className="p-3 border border-slate-100 rounded-xl">
                <p className="text-xs text-slate-400">Loan Amount</p>
                <p className="text-sm font-bold font-mono text-slate-900">
                  {customer.loanAmount ? formatCurrency(customer.loanAmount) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="flex items-start gap-2 p-3 bg-brand-50 rounded-xl">
            {customer.isProfileComplete ? (
              <BadgeCheck size={16} className="text-brand-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
            )}
            <p className="text-xs text-slate-600">
              {customer.isProfileComplete
                ? "Profile is complete and eligibility check passed."
                : "Profile is incomplete — borrower has not finished onboarding."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Customers Content ────────────────────────────────────
function CustomersContent() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCustomers = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const res = await dashboardApi.getCustomers(p, PAGE_SIZE, q);
      const payload = res.data.data;
      setCustomers(payload.data);
      setTotal(payload.total);
      setPage(payload.page);
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers(1, "");
  }, [fetchCustomers]);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchCustomers(1, value);
    }, 350);
  };

  const columns = [
    {
      key: "name",
      header: "Customer",
      render: (row: Customer) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{row.name}</p>
            <p className="text-xs text-slate-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "registered",
      header: "Registered",
      render: (row: Customer) => (
        <span className="text-xs text-slate-500">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: "applicationStatus",
      header: "Application Status",
      render: (row: Customer) => <StatusBadge status={row.applicationStatus} />,
    },
    {
      key: "loanAmount",
      header: "Loan Amount",
      render: (row: Customer) => (
        <span className="font-bold font-mono text-slate-900">
          {row.loanAmount ? formatCurrency(row.loanAmount) : "—"}
        </span>
      ),
    },
    {
      key: "action",
      header: "",
      width: "w-32",
      render: (row: Customer) => (
        <button
          onClick={() => setSelected(row)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 transition"
        >
          <Eye size={15} />
          Quick View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage and view all registered borrowers
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name, email or PAN..."
            className="input-field pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={customers}
        total={total}
        page={page}
        limit={PAGE_SIZE}
        loading={loading}
        onPageChange={(p) => fetchCustomers(p, search)}
        emptyMessage={search ? "No customers match your search" : "No customers found"}
        emptyIcon={<UserCheck size={40} />}
      />

      {/* Details Modal */}
      {selected && (
        <CustomerDetailsModal customer={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <CustomersContent />
    </RoleGuard>
  );
}