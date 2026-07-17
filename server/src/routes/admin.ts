import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Loan from '../models/Loan';
import Payment from '../models/Payment';
import DocumentModel from '../models/Document';
import Notification from '../models/Notification';
import { calculateLoan } from '../utils/loanCalculator';

const router = Router();
router.use(authenticate, authorize('admin'));

// GET /api/admin/customers
// Reuses the existing User (Borrower) and Loan models. No new Customer model.
// Supports search by name/email and pagination.
router.get('/customers', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const limit = Math.max(1, parseInt(String(req.query.limit || '10')));
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();

    const filter: Record<string, unknown> = { role: 'borrower' };
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { email: regex }, { pan: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    const customers = await Promise.all(
      users.map(async (user) => {
        const loan = await Loan.findOne({ borrowerId: user._id }).sort({ createdAt: -1 });
        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          pan: user.pan || null,
          employmentMode: user.employmentMode || null,
          monthlySalary: user.monthlySalary || null,
          breStatus: user.breStatus,
          isProfileComplete: user.isProfileComplete,
          createdAt: user.createdAt,
          // Application status = latest loan status (null if no application yet)
          applicationStatus: loan?.status || null,
          // Current loan amount (latest loan)
          loanAmount: loan?.amount || null,
          loanId: loan?._id || null,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: { data: customers, total, page, limit },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch customers.' });
  }
});

// GET /api/admin/loans
// Reuses the existing Loan model and User (Borrower) model. No new model.
// Lists ALL loans across every status with borrower populated, for the
// unified Loan Management view. Approve/Reject/Disburse actions are performed
// via the existing /sanction and /disbursement endpoints (no duplicate logic).
router.get('/loans', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const limit = Math.max(1, parseInt(String(req.query.limit || '10')));
    const skip = (page - 1) * limit;
    const status = String(req.query.status || '').trim();
    const search = String(req.query.search || '').trim();

    const filter: Record<string, unknown> = {};
    if (status && ['applied', 'sanctioned', 'rejected', 'disbursed', 'closed'].includes(status)) {
      filter.status = status;
    }

    // Reuse the same search approach as /admin/customers: match borrower
    // name/email or loan ID. Borrower is populated after the query, so we
    // resolve matching borrower IDs first when a search term is present.
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const matched = await User.find({
        $or: [{ name: regex }, { email: regex }],
      }).select('_id');
      const borrowerIds = matched.map((u) => u._id);
      filter.$or = [
        { borrowerId: { $in: borrowerIds } },
        { _id: search.length === 24 ? search : { $in: [] } },
      ];
    }

    const [loans, total] = await Promise.all([
      Loan.find(filter)
        .populate('borrowerId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Loan.countDocuments(filter),
    ]);

    const loansData = loans.map((loan) => {
      const borrower = loan.borrowerId as unknown as { _id: string; name: string; email: string };
      return {
        _id: loan._id,
        borrower: { _id: borrower._id, name: borrower.name, email: borrower.email },
        status: loan.status,
        rejectionReason: loan.rejectionReason || null,
        loanConfig: {
          amount: loan.amount,
          tenure: loan.tenure,
          interestRate: loan.interestRate,
          simpleInterest: loan.simpleInterest,
          totalRepayment: loan.totalRepayment,
        },
        createdAt: loan.createdAt,
        updatedAt: loan.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      data: { data: loansData, total, page, limit },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch loans.' });
  }
});

// GET /api/admin/documents
// Reuses the existing Document model (salary slips) and User (Borrower) model.
// No new document logic — files are served statically at /uploads/:fileName.
router.get('/documents', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const limit = Math.max(1, parseInt(String(req.query.limit || '10')));
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      DocumentModel.find({ documentType: 'salary_slip' })
        .populate('borrowerId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DocumentModel.countDocuments({ documentType: 'salary_slip' }),
    ]);

    const documents = docs.map((doc) => {
      const borrower = doc.borrowerId as unknown as { _id: string; name: string; email: string };
      return {
        _id: doc._id,
        borrower: { _id: borrower._id, name: borrower.name, email: borrower.email },
        originalName: doc.originalName,
        fileName: doc.fileName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        documentType: doc.documentType,
        // Static URL already used across the app (see app.ts: /uploads)
        url: `/uploads/${doc.fileName}`,
        createdAt: doc.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      data: { data: documents, total, page, limit },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch documents.' });
  }
});

// GET /api/admin/emi
// Reuses the existing Loan + Payment models and the calculateLoan utility.
// No new calculation logic — EMI comes from calculateLoan(); paid/remaining
// are derived from recorded payments. Only disbursed/closed loans have schedules.
router.get('/emi', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const limit = Math.max(1, parseInt(String(req.query.limit || '10')));
    const skip = (page - 1) * limit;

    const filter = { status: { $in: ['disbursed', 'closed'] as const } };

    const [loans, total] = await Promise.all([
      Loan.find(filter)
        .populate('borrowerId', 'name email')
        .sort({ disbursedAt: -1 })
        .skip(skip)
        .limit(limit),
      Loan.countDocuments(filter),
    ]);

    const schedules = await Promise.all(
      loans.map(async (loan) => {
        const borrower = loan.borrowerId as unknown as { _id: string; name: string; email: string };
        const calc = calculateLoan(loan.amount, loan.tenure);
        // EMI uses the same monthly cadence as the client-side calculateLoan helper
        // (totalRepayment spread over tenure/30 ~= monthly cycles). No new logic.
        const emi = Math.round((calc.totalRepayment / (loan.tenure / 30)) * 100) / 100;
        const payments = await Payment.find({ loanId: loan._id });
        const paid = payments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = Math.max(0, loan.totalRepayment - paid);
        const progress = loan.totalRepayment > 0
          ? Math.min(100, Math.round((paid / loan.totalRepayment) * 100))
          : 0;

        // Next due date: one EMI cycle (30 days) after the last activity.
        // Uses the same monthly cadence implied by calculateLoan's monthlyEMI.
        let nextDueDate: Date | null = null;
        if (loan.status === 'disbursed') {
          const base = loan.disbursedAt || loan.createdAt;
          const lastPayment = payments.length
            ? Math.max(...payments.map((p) => new Date(p.paymentDate).getTime()))
            : new Date(base).getTime();
          nextDueDate = new Date(lastPayment + 30 * 24 * 60 * 60 * 1000);
        }

        return {
          _id: loan._id,
          borrower: { _id: borrower._id, name: borrower.name, email: borrower.email },
          loanConfig: {
            amount: loan.amount,
            tenure: loan.tenure,
            interestRate: loan.interestRate,
            simpleInterest: loan.simpleInterest,
            totalRepayment: loan.totalRepayment,
          },
          emi,
          paid: Math.round(paid * 100) / 100,
          remaining: Math.round(remaining * 100) / 100,
          progress,
          status: loan.status,
          disbursedAt: loan.disbursedAt,
          nextDueDate,
          createdAt: loan.createdAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: { data: schedules, total, page, limit },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch EMI schedules.' });
  }
});

// GET /api/admin/notifications
// Returns recent database-backed notifications (no websocket). Reuses the
// Notification model populated by loan/payment events.
router.get('/notifications', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.max(1, parseInt(String(req.query.limit || '20')));
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    const unread = await Notification.countDocuments({ read: false });
    res.status(200).json({
      success: true,
      data: { data: notifications, unread },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
});

// GET /api/admin/overview
router.get('/overview', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalBorrowers, appliedLoans, sanctionedLoans, disbursedLoans, closedLoans, rejectedLoans, allPayments, recentLoans] = await Promise.all([
      User.countDocuments({ role: 'borrower' }),
      Loan.countDocuments({ status: 'applied' }),
      Loan.countDocuments({ status: 'sanctioned' }),
      Loan.countDocuments({ status: 'disbursed' }),
      Loan.countDocuments({ status: 'closed' }),
      Loan.countDocuments({ status: 'rejected' }),
      Payment.find({}),
      Loan.find({ status: { $in: ['applied', 'sanctioned', 'disbursed'] } })
        .populate('borrowerId', 'name email')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const totalCollected = allPayments.reduce((sum, p) => sum + p.amount, 0);

    // Format recent loans
    const recentLoansData = await Promise.all(
      recentLoans.map(async (loan) => {
        const borrower = loan.borrowerId as unknown as { _id: string; name: string; email: string };
        return {
          _id: loan._id,
          borrower: { _id: borrower._id, name: borrower.name, email: borrower.email },
          status: loan.status,
          loanConfig: {
            amount: loan.amount,
            tenure: loan.tenure,
            interestRate: loan.interestRate,
            simpleInterest: loan.simpleInterest,
            totalRepayment: loan.totalRepayment,
          },
          createdAt: loan.createdAt,
        };
      })
    );

    const totalLoanApplications = appliedLoans + sanctionedLoans + disbursedLoans + closedLoans + rejectedLoans;

    res.status(200).json({
      success: true,
      data: {
        totalBorrowers,
        totalLoanApplications,
        loans: { applied: appliedLoans, sanctioned: sanctionedLoans, disbursed: disbursedLoans, closed: closedLoans, rejected: rejectedLoans },
        totalCollected,
        recentLoans: recentLoansData,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch overview.' });
  }
});

export default router;