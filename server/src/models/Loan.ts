import mongoose, { Document, Schema } from 'mongoose';

export type LoanStatus = 'applied' | 'sanctioned' | 'rejected' | 'disbursed' | 'closed';

export interface ILoan extends Document {
  borrowerId: mongoose.Types.ObjectId;
  amount: number;
  tenure: number;
  interestRate: number;
  simpleInterest: number;
  totalRepayment: number;
  status: LoanStatus;
  rejectionReason?: string;
  sanctionedBy?: mongoose.Types.ObjectId;
  disbursedBy?: mongoose.Types.ObjectId;
  appliedAt?: Date;
  sanctionedAt?: Date;
  disbursedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LoanSchema = new Schema<ILoan>(
  {
    borrowerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 50000, max: 500000 },
    tenure: { type: Number, required: true, min: 30, max: 365 },
    interestRate: { type: Number, required: true, default: 12 },
    simpleInterest: { type: Number, required: true },
    totalRepayment: { type: Number, required: true },
    status: {
      type: String,
      enum: ['applied', 'sanctioned', 'rejected', 'disbursed', 'closed'],
      default: 'applied',
    },
    rejectionReason: { type: String },
    sanctionedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    disbursedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    appliedAt: { type: Date, default: Date.now },
    sanctionedAt: { type: Date },
    disbursedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<ILoan>('Loan', LoanSchema);
