const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

interface BREInput {
  dob: Date;
  monthlySalary: number;
  pan: string;
  employmentMode: string;
}

interface BREResult {
  passed: boolean;
  failedRule?: string;
  reason?: string;
}

function getAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export function runBRE(input: BREInput): BREResult {
  const age = getAge(input.dob);
  if (isNaN(age) || age < 23 || age > 50) {
    return {
      passed: false,
      failedRule: 'age',
      reason: `Age must be between 23 and 50 years. Your age: ${isNaN(age) ? 'invalid' : age}`,
    };
  }

  if (!input.monthlySalary || input.monthlySalary < 25000) {
    return {
      passed: false,
      failedRule: 'salary',
      reason: `Monthly salary must be at least ₹25,000. Provided: ₹${input.monthlySalary}`,
    };
  }

  if (!PAN_REGEX.test(input.pan.toUpperCase())) {
    return {
      passed: false,
      failedRule: 'pan',
      reason: `Invalid PAN format. Must match ABCDE1234F (5 letters, 4 digits, 1 letter). Provided: ${input.pan}`,
    };
  }

  if (input.employmentMode === 'unemployed') {
    return {
      passed: false,
      failedRule: 'employment',
      reason: 'Unemployed applicants are not eligible for loans.',
    };
  }

  return { passed: true };
}
