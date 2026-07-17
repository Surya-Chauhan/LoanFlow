export function calculateLoan(principal: number, tenureDays: number) {
  const rate = 12; // fixed 12% p.a.
  const si = (principal * rate * tenureDays) / (365 * 100);
  const totalRepayment = principal + si;
  return {
    principal,
    tenure: tenureDays,
    interestRate: rate,
    simpleInterest: Math.round(si * 100) / 100,
    totalRepayment: Math.round(totalRepayment * 100) / 100,
  };
}
