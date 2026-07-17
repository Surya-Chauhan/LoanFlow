import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { upload } from '../utils/multerConfig';
import { runBRE } from '../utils/bre';
import { calculateLoan } from '../utils/loanCalculator';
import User from '../models/User';
import Loan from '../models/Loan';
import DocumentModel from '../models/Document';
import Payment from '../models/Payment';

const router = Router();
router.use(authenticate, authorize('borrower'));

// POST /api/borrower/personal-details
router.post(
  '/personal-details',
  [
    body('pan').notEmpty().withMessage('PAN is required'),
    body('dateOfBirth').notEmpty().isISO8601().withMessage('Invalid date'),
    body('monthlySalary').isFloat({ min: 0 }).withMessage('Salary required'),
    body('employmentMode')
      .isIn(['salaried', 'self-employed', 'unemployed', 'self_employed'])
      .withMessage('Invalid employment mode'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const pan = (req.body.pan || '').toUpperCase().trim();
    const dob = new Date(req.body.dateOfBirth || req.body.dob);
    const monthlySalary = Number(req.body.monthlySalary);
    // Normalize: frontend may send self_employed, backend stores self-employed
    const employmentMode = (req.body.employmentMode || '').replace('_', '-') as string;
    const fullName = req.body.fullName || req.body.name;

    try {
      const breResult = runBRE({ dob, monthlySalary, pan, employmentMode });

      if (!breResult.passed) {
        await User.findByIdAndUpdate(req.user!.userId, {
          pan, dob, monthlySalary, employmentMode,
          breStatus: 'failed', breFailReason: breResult.reason, isProfileComplete: false,
        });
        res.status(400).json({
          success: false,
          message: 'Eligibility check failed.',
          data: { breStatus: 'failed', failedRule: breResult.failedRule, reason: breResult.reason },
        });
        return;
      }

      const updateData: Record<string, unknown> = {
        pan, dob, monthlySalary, employmentMode,
        breStatus: 'passed', breFailReason: undefined, isProfileComplete: true,
      };
      if (fullName) updateData.name = fullName;

      await User.findByIdAndUpdate(req.user!.userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Personal details saved. Eligibility check passed.',
        data: { breStatus: 'passed' },
      });
    } catch (err) {
      console.error('personal-details error:', err);
      res.status(500).json({ success: false, message: 'Failed to save personal details.' });
    }
  }
);

// POST /api/borrower/upload-salary-slip
router.post(
  '/upload-salary-slip',
  upload.single('salarySlip'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await User.findById(req.user!.userId);
      if (!user) { res.status(404).json({ success: false, message: 'User not found.' }); return; }

      if (user.breStatus !== 'passed') {
        res.status(400).json({ success: false, message: 'Complete eligibility check first.' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded.' });
        return;
      }

      // Remove old salary slip if exists
      await DocumentModel.deleteMany({ borrowerId: req.user!.userId, documentType: 'salary_slip' });

      const document = await DocumentModel.create({
        borrowerId: req.user!.userId,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        documentType: 'salary_slip',
      });

      res.status(201).json({
        success: true,
        message: 'Salary slip uploaded successfully.',
        data: {
          documentId: document._id,
          fileName: document.originalName,
          fileSize: document.fileSize,
        },
      });
    } catch (err) {
      console.error('upload-salary-slip error:', err);
      res.status(500).json({ success: false, message: 'File upload failed.' });
    }
  }
);

// POST /api/borrower/apply-loan  (also /apply for compatibility)
const applyLoanHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { amount, tenure } = req.body;
  const amtNum = Number(amount);
  const tenureNum = Number(tenure);

  if (!amtNum || amtNum < 50000 || amtNum > 500000) {
    res.status(400).json({ success: false, message: 'Loan amount must be between ₹50,000 and ₹5,00,000' });
    return;
  }
  if (!tenureNum || tenureNum < 30 || tenureNum > 365) {
    res.status(400).json({ success: false, message: 'Tenure must be between 30 and 365 days' });
    return;
  }

  try {
    const user = await User.findById(req.user!.userId);
    if (!user) { res.status(404).json({ success: false, message: 'User not found.' }); return; }
    if (user.breStatus !== 'passed') {
      res.status(400).json({ success: false, message: 'Pass eligibility check before applying.' });
      return;
    }

    const salarySlip = await DocumentModel.findOne({
      borrowerId: req.user!.userId,
      documentType: 'salary_slip',
    });
    if (!salarySlip) {
      res.status(400).json({ success: false, message: 'Upload salary slip before applying.' });
      return;
    }

    const existingLoan = await Loan.findOne({
      borrowerId: req.user!.userId,
      status: { $in: ['applied', 'sanctioned', 'disbursed'] },
    });
    if (existingLoan) {
      res.status(409).json({ success: false, message: 'You already have an active loan application.' });
      return;
    }

    const loanCalc = calculateLoan(amtNum, tenureNum);
    const loan = await Loan.create({
      borrowerId: req.user!.userId,
      amount: loanCalc.principal,
      tenure: loanCalc.tenure,
      interestRate: loanCalc.interestRate,
      simpleInterest: loanCalc.simpleInterest,
      totalRepayment: loanCalc.totalRepayment,
      status: 'applied',
      appliedAt: new Date(),
    });

    await DocumentModel.findByIdAndUpdate(salarySlip._id, { loanId: loan._id });

    res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully.',
      data: {
        loanId: loan._id,
        amount: loan.amount,
        tenure: loan.tenure,
        interestRate: loan.interestRate,
        simpleInterest: loan.simpleInterest,
        totalRepayment: loan.totalRepayment,
        status: loan.status,
      },
    });
  } catch (err) {
    console.error('apply-loan error:', err);
    res.status(500).json({ success: false, message: 'Loan application failed.' });
  }
};

router.post('/apply-loan', applyLoanHandler);
router.post('/apply', applyLoanHandler);

// GET /api/borrower/my-loan
router.get('/my-loan', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const loan = await Loan.findOne({ borrowerId: req.user!.userId }).sort({ createdAt: -1 });
    if (!loan) {
      res.status(404).json({ success: false, message: 'No loan found.' });
      return;
    }

    const user = await User.findById(req.user!.userId).select('-passwordHash');
    const salarySlip = await DocumentModel.findOne({
      borrowerId: req.user!.userId,
      documentType: 'salary_slip',
    });
    const payments = await Payment.find({ loanId: loan._id }).sort({ paymentDate: -1 });
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = Math.max(0, loan.totalRepayment - totalPaid);

    res.status(200).json({
      success: true,
      data: {
        loan: {
          _id: loan._id,
          borrower: user,
          status: loan.status,
          rejectionReason: loan.rejectionReason,
          appliedAt: loan.appliedAt,
          sanctionedAt: loan.sanctionedAt,
          disbursedAt: loan.disbursedAt,
          closedAt: loan.closedAt,
          createdAt: loan.createdAt,
          updatedAt: loan.updatedAt,
          personalDetails: user
            ? {
                fullName: user.name,
                pan: user.pan,
                dateOfBirth: user.dob,
                monthlySalary: user.monthlySalary,
                employmentMode: user.employmentMode,
              }
            : null,
          loanConfig: {
            amount: loan.amount,
            tenure: loan.tenure,
            interestRate: loan.interestRate,
            simpleInterest: loan.simpleInterest,
            totalRepayment: loan.totalRepayment,
          },
          salarySlipUrl: salarySlip ? `/uploads/${salarySlip.fileName}` : null,
          totalPaid,
          outstanding,
          payments,
        },
      },
    });
  } catch (err) {
    console.error('my-loan error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch loan.' });
  }
});

// GET /api/borrower/calculate
router.get('/calculate', async (req: AuthRequest, res: Response): Promise<void> => {
  const { amount, tenure } = req.query;
  if (!amount || !tenure) {
    res.status(400).json({ success: false, message: 'amount and tenure required.' });
    return;
  }
  const calc = calculateLoan(Number(amount), Number(tenure));
  res.status(200).json({ success: true, data: calc });
});

// GET /api/borrower/profile
router.get('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId).select('-passwordHash');
    if (!user) { res.status(404).json({ success: false, message: 'User not found.' }); return; }
    res.status(200).json({ success: true, data: { user } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
});

export default router;
