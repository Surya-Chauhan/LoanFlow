// src/lib/bre.ts
// Business Rule Engine - Client-side pre-validation
// The authoritative BRE runs on the server; this is just UX feedback

export interface BREInput {
  dateOfBirth: string;
  monthlySalary: number;
  pan: string;
  employmentMode: string;
}

export interface BREResult {
  passed: boolean;
  errors: Record<string, string>;
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

function getAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function runClientBRE(input: BREInput): BREResult {
  const errors: Record<string, string> = {};

  // Rule 1: Age between 23 and 50
  const age = getAge(input.dateOfBirth);
  if (isNaN(age) || age < 23 || age > 50) {
    errors.dateOfBirth = `Age must be between 23 and 50 years (your age: ${isNaN(age) ? "invalid" : age})`;
  }

  // Rule 2: Monthly salary >= 25000
  if (!input.monthlySalary || input.monthlySalary < 25000) {
    errors.monthlySalary = "Monthly salary must be at least ₹25,000";
  }

  // Rule 3: Valid PAN format
  if (!PAN_REGEX.test(input.pan?.toUpperCase() || "")) {
    errors.pan = "PAN must be in format: ABCDE1234F (5 letters, 4 digits, 1 letter)";
  }

  // Rule 4: Not unemployed
  if (input.employmentMode === "unemployed") {
    errors.employmentMode = "Unemployed applicants are not eligible for loans";
  }

  return { passed: Object.keys(errors).length === 0, errors };
}

// Loan calculation
export function calculateLoan(principal: number, tenureDays: number) {
  const rate = 12; // fixed 12% p.a.
  const si = (principal * rate * tenureDays) / (365 * 100);
  const totalRepayment = principal + si;
  return {
    simpleInterest: Math.round(si * 100) / 100,
    totalRepayment: Math.round(totalRepayment * 100) / 100,
    monthlyEMI: Math.round((totalRepayment / (tenureDays / 30)) * 100) / 100,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
