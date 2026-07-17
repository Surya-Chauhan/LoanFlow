// src/types/index.ts

export type Role = "admin" | "sales" | "sanction" | "disbursement" | "collection" | "borrower";

export type LoanStatus =
  | "pending"
  | "applied"
  | "sanctioned"
  | "rejected"
  | "disbursed"
  | "closed";

export type EmploymentMode = "salaried" | "self-employed" | "self_employed" | "unemployed";

export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: Role;
  isProfileComplete?: boolean;
  breStatus?: "pending" | "passed" | "failed";
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

export interface PersonalDetails {
  fullName: string;
  pan: string;
  dateOfBirth: string;
  monthlySalary: number;
  employmentMode: EmploymentMode;
}

export interface LoanConfig {
  amount: number;
  tenure: number; // in days
  interestRate: number; // fixed 12% p.a.
  simpleInterest: number;
  totalRepayment: number;
}

export interface Loan {
  _id: string;
  borrower: User | string;
  status: LoanStatus;
  personalDetails?: PersonalDetails;
  salarySlipUrl?: string;
  loanConfig?: LoanConfig;
  rejectionReason?: string;
  appliedAt?: string;
  sanctionedAt?: string;
  disbursedAt?: string;
  closedAt?: string;
  totalPaid: number;
  outstanding?: number;
  payments: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  loan?: string;
  loanId?: string;
  utrNumber: string;
  amount: number;
  paymentDate: string;
  date?: string;
  recordedBy?: string;
  createdAt?: string;
}

export interface BREResult {
  passed: boolean;
  errors: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Customer = Borrower (User with role "borrower"). Reused, not a new model.
export interface Customer {
  _id: string;
  name: string;
  email: string;
  pan: string | null;
  employmentMode: string | null;
  monthlySalary: number | null;
  breStatus: "pending" | "passed" | "failed";
  isProfileComplete: boolean;
  createdAt: string;
  // Application status = latest loan status (null if no application yet)
  applicationStatus: LoanStatus | null;
  // Current loan amount (latest loan)
  loanAmount: number | null;
  loanId: string | null;
}
