// src/lib/api.ts
import axios from "axios";
import Cookies from "js-cookie";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  // Important: include credentials (cookies) with cross-origin requests
  withCredentials: false, // we use Authorization header, not cookies on the wire
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get("lms_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — clear session and redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // Only clear and redirect if we're NOT already on the login page
      // to avoid redirect loops
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/auth")
      ) {
        Cookies.remove("lms_token");
        Cookies.remove("lms_user");
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ─────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email: email.toLowerCase().trim(), password }),

  register: (name: string, email: string, password: string) =>
    api.post("/auth/register", { name: name.trim(), email: email.toLowerCase().trim(), password }),

  me: () => api.get("/auth/me"),
};

// ─── Borrower ──────────────────────────────────────────────
export const borrowerApi = {
  savePersonalDetails: (data: {
    fullName: string;
    pan: string;
    dateOfBirth: string;
    monthlySalary: number;
    employmentMode: string;
  }) => api.post("/borrower/personal-details", data),

  uploadSalarySlip: (file: File) => {
    const formData = new FormData();
    formData.append("salarySlip", file);
    return api.post("/borrower/upload-salary-slip", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  applyLoan: (data: { amount: number; tenure: number }) =>
    api.post("/borrower/apply-loan", data),

  getMyLoan: () => api.get("/borrower/my-loan"),

  calculate: (amount: number, tenure: number) =>
    api.get(`/borrower/calculate?amount=${amount}&tenure=${tenure}`),
};

// ─── Dashboard ─────────────────────────────────────────────
export const dashboardApi = {
  // Sales
  getLeads: (page = 1, limit = 10) =>
    api.get(`/sales/leads?page=${page}&limit=${limit}`),

  // Sanction
  getAppliedLoans: (page = 1, limit = 10) =>
    api.get(`/sanction/loans?page=${page}&limit=${limit}`),

  sanctionLoan: (loanId: string) =>
    api.patch(`/sanction/loans/${loanId}/approve`),

  rejectLoan: (loanId: string, reason: string) =>
    api.patch(`/sanction/loans/${loanId}/reject`, { reason }),

  // Disbursement
  getSanctionedLoans: (page = 1, limit = 10) =>
    api.get(`/disbursement/loans?page=${page}&limit=${limit}`),

  disburseLoan: (loanId: string) =>
    api.patch(`/disbursement/loans/${loanId}/disburse`),

  // Collection
  getDisbursedLoans: (page = 1, limit = 10) =>
    api.get(`/collection/loans?page=${page}&limit=${limit}`),

  recordPayment: (
    loanId: string,
    data: { utrNumber: string; amount: number; date: string }
  ) => api.post(`/collection/loans/${loanId}/payment`, data),

  // Admin
  getOverview: () => api.get("/admin/overview"),

  // Customers (reuses Borrower/User model — no separate Customer entity)
  getCustomers: (page = 1, limit = 10, search = "") => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search.trim()) params.set("search", search.trim());
    return api.get(`/admin/customers?${params.toString()}`);
  },

  // Loans (unified list — reuses Loan model; actions reuse sanction/disbursement endpoints)
  getLoans: (page = 1, limit = 10, status = "", search = "") => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status.trim()) params.set("status", status.trim());
    if (search.trim()) params.set("search", search.trim());
    return api.get(`/admin/loans?${params.toString()}`);
  },

  // Documents (reuses Document model; files served statically at /uploads)
  getDocuments: (page = 1, limit = 10) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    return api.get(`/admin/documents?${params.toString()}`);
  },

  // EMI schedules (reuses Loan + Payment models; EMI from calculateLoan)
  getEmiSchedules: (page = 1, limit = 10) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    return api.get(`/admin/emi?${params.toString()}`);
  },

  // Notifications (database-backed, no websocket)
  getNotifications: (limit = 20) => {
    const params = new URLSearchParams({ limit: String(limit) });
    return api.get(`/admin/notifications?${params.toString()}`);
  },

  // Audit logs (database-backed, captures loan/payment status changes)
  getAuditLogs: (page = 1, limit = 15) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    return api.get(`/admin/audit-logs?${params.toString()}`);
  },

  // Loan Products (Super Admin configurable)
  getLoanProducts: () => api.get(`/admin/loan-products`),
  createLoanProduct: (data: Record<string, unknown>) => api.post(`/admin/loan-products`, data),
  updateLoanProduct: (id: string, data: Record<string, unknown>) => api.put(`/admin/loan-products/${id}`, data),
};

// Build an absolute URL for a static upload path (e.g. "/uploads/abc.pdf")
// served by the server. API_URL is like "http://localhost:5000/api",
// so we strip the trailing "/api" to get the server origin.
export function getFileUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const base = API_URL.replace(/\/api\/?$/, "");
  return `${base}${path}`;
}
