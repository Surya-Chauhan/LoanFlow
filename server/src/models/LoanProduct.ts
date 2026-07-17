import mongoose, { Document, Schema } from 'mongoose';

export interface ILoanProduct extends Document {
  name: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  maxTenure: number;
  processingFee: number;
  active: boolean;
}

const LoanProductSchema = new Schema<ILoanProduct>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    minAmount: { type: Number, required: true, min: 0 },
    maxAmount: { type: Number, required: true, min: 1 },
    interestRate: { type: Number, required: true, min: 0 },
    maxTenure: { type: Number, required: true, min: 1 },
    processingFee: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ILoanProduct>('LoanProduct', LoanProductSchema);