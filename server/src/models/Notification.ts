import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'loan_approved'
  | 'loan_rejected'
  | 'loan_disbursed'
  | 'payment_received';

export interface INotification extends Document {
  type: NotificationType;
  message: string;
  loanId?: mongoose.Types.ObjectId;
  borrowerId?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      enum: ['loan_approved', 'loan_rejected', 'loan_disbursed', 'payment_received'],
      required: true,
    },
    message: { type: String, required: true },
    loanId: { type: Schema.Types.ObjectId, ref: 'Loan' },
    borrowerId: { type: Schema.Types.ObjectId, ref: 'User' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>('Notification', NotificationSchema);