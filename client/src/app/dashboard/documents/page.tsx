"use client";
// src/app/dashboard/documents/page.tsx
import { useEffect, useState, useCallback } from "react";
import { dashboardApi, getFileUrl } from "@/lib/api";
import { RoleGuard } from "@/components/ui/RoleGuard";
import { DataTable } from "@/components/dashboard/DataTable";
import { User } from "@/types";
import { FolderOpen, Eye, Download, FileText, CheckCircle } from "lucide-react";

const PAGE_SIZE = 10;

interface DocumentRow {
  _id: string;
  borrower: User | null;
  originalName: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentType: string;
  url: string;
  createdAt: string;
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

// ─── Documents Content ───────────────────────────────────
function DocumentsContent() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getDocuments(page, PAGE_SIZE);
      const payload = res.data.data;
      setDocuments(payload.data);
      setTotal(payload.total);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const columns = [
    {
      key: "borrower",
      header: "Borrower",
      render: (row: DocumentRow) => (
        <div>
          <p className="font-semibold text-slate-800">{row.borrower?.name || "—"}</p>
          <p className="text-xs text-slate-400">{row.borrower?.email || "—"}</p>
        </div>
      ),
    },
    {
      key: "file",
      header: "Uploaded Salary Slip",
      render: (row: DocumentRow) => (
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-red-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
              {row.originalName}
            </p>
            <p className="text-xs text-slate-400">{formatSize(row.fileSize)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "uploaded",
      header: "Upload Date",
      render: (row: DocumentRow) => (
        <span className="text-xs text-slate-500">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: () => (
        <span className="status-sanctioned">
          <CheckCircle size={12} className="inline mr-1" />
          Uploaded
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      width: "w-44",
      render: (row: DocumentRow) => {
        const fileUrl = getFileUrl(row.url);
        return (
          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 transition"
            >
              <Eye size={15} /> View
            </a>
            <a
              href={fileUrl}
              download={row.originalName}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              <Download size={15} /> Download
            </a>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <FolderOpen size={20} className="text-teal-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Documents</h1>
          <p className="text-slate-500 text-sm">Borrower salary slip uploads</p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={documents}
        total={total}
        page={page}
        limit={PAGE_SIZE}
        loading={loading}
        onPageChange={setPage}
        emptyMessage="No documents uploaded yet"
        emptyIcon={<FolderOpen size={40} />}
      />
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <DocumentsContent />
    </RoleGuard>
  );
}