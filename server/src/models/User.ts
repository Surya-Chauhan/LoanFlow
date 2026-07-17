import mongoose, { Document, Schema } from 'mongoose';

export type Role = 'admin' | 'sales' | 'sanction' | 'disbursement' | 'collection' | 'borrower';
export type BreStatus = 'pending' | 'passed' | 'failed';
export type EmploymentMode = 'salaried' | 'self-employed' | 'unemployed';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  // Borrower personal details
  pan?: string;
  dob?: Date;
  monthlySalary?: number;
  employmentMode?: EmploymentMode;
  breStatus: BreStatus;
  breFailReason?: string;
  isProfileComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'sales', 'sanction', 'disbursement', 'collection', 'borrower'],
      default: 'borrower',
    },
    pan: { type: String, uppercase: true, trim: true },
    dob: { type: Date },
    monthlySalary: { type: Number, min: 0 },
    employmentMode: { type: String, enum: ['salaried', 'self-employed', 'unemployed'] },
    breStatus: { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' },
    breFailReason: { type: String },
    isProfileComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
