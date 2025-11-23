import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { message: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    // 1. Get Active Term
    const activeTerm = await prisma.term.findFirst({ where: { isActive: true } });
    if (!activeTerm) {
      return NextResponse.json(
        { message: 'No active term configured' },
        { status: 404 }
      );
    }

    // 2. Calculate Tuition Fee based on Enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        termId: activeTerm.id,
        status: 'enrolled',
      },
      include: {
        course: true,
      },
    });

    const totalCreditHours = enrollments.reduce(
      (sum, enrollment) => sum + (enrollment.course.creditHours || 0),
      0
    );

    const requiredTuitionFee = totalCreditHours * 7000;

    // 3. Persist/Update Tuition Fee Invoice
    // Check if tuition fee invoices already exist for this term
    const existingTuitionInvoices = await prisma.feeInvoice.findMany({
      where: {
        userId,
        termId: activeTerm.id,
        description: 'Tuition Fee',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate total paid amount for Tuition Fees
    const totalPaidTuition = existingTuitionInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);

    // Calculate Net Balance (Positive = Due, Negative = Credit/Refund)
    const netBalance = requiredTuitionFee - totalPaidTuition;

    // Find the pending invoice (if any) to adjust
    const pendingInvoice = existingTuitionInvoices.find(inv => inv.status === 'pending');

    if (netBalance !== 0) {
      if (pendingInvoice) {
        // Update existing pending invoice
        if (pendingInvoice.amount !== netBalance) {
          await prisma.feeInvoice.update({
            where: { id: pendingInvoice.id },
            data: { amount: netBalance },
          });
        }
      } else {
        // Create new pending invoice (can be negative for credit)
        // Double check to avoid race conditions
        const doubleCheck = await prisma.feeInvoice.findFirst({
          where: {
            userId,
            termId: activeTerm.id,
            description: 'Tuition Fee',
            status: 'pending',
          },
        });

        if (doubleCheck) {
          await prisma.feeInvoice.update({
            where: { id: doubleCheck.id },
            data: { amount: netBalance },
          });
        } else {
          await prisma.feeInvoice.create({
            data: {
              userId,
              termId: activeTerm.id,
              amount: netBalance,
              description: 'Tuition Fee',
              dueDate: new Date(activeTerm.endDate),
              status: 'pending',
            },
          });
        }
      }
    } else {
      // Balance is 0, delete any pending invoice as nothing is due
      if (pendingInvoice) {
        await prisma.feeInvoice.delete({
          where: { id: pendingInvoice.id },
        });
      }
    }

    // Cleanup: If we have multiple pending invoices (shouldn't happen with above logic, but for safety), delete extras
    const extraPendingInvoices = existingTuitionInvoices.filter(inv => inv.status === 'pending' && inv.id !== pendingInvoice?.id);
    if (extraPendingInvoices.length > 0) {
      await prisma.feeInvoice.deleteMany({
        where: { id: { in: extraPendingInvoices.map(inv => inv.id) } }
      });
    }

    // 4. Fetch all invoices to return
    const invoices = await prisma.feeInvoice.findMany({
      where: { userId },
      include: {
        term: true,
        payments: true,
      },
      orderBy: { dueDate: 'desc' },
    });

    // Deduplicate Tuition Fee invoices in the response (hide race condition artifacts)
    const uniqueInvoices = invoices.filter((invoice, index, self) => {
      if (invoice.description === 'Tuition Fee' && invoice.status === 'pending') {
        // Only keep the first (newest) pending tuition fee
        return index === self.findIndex(i => i.description === 'Tuition Fee' && i.status === 'pending');
      }
      return true;
    });

    const totalPaid = uniqueInvoices.reduce((sum, invoice) => {
      if (invoice.status === 'paid') {
        return sum + invoice.amount;
      }
      const partialPayments = invoice.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0);
      return sum + partialPayments;
    }, 0);

    const totalPending = uniqueInvoices
      .filter((invoice) => invoice.status === 'pending' || invoice.status === 'overdue')
      .reduce((sum, invoice) => sum + invoice.amount, 0);

    const upcomingInvoice = uniqueInvoices
      .filter((invoice) => invoice.status === 'pending' || invoice.status === 'overdue')
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0] ?? null;

    const formattedInvoices = uniqueInvoices.map((invoice) => ({
      id: invoice.id,
      description: invoice.description,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      status: invoice.status,
      term: invoice.term?.name ?? null,
      createdAt: invoice.createdAt,
    }));

    return NextResponse.json({
      invoices: formattedInvoices,
      summary: {
        totalPaid,
        totalPending,
        nextDueDate: upcomingInvoice?.dueDate ?? null,
        pendingCount: invoices.filter((invoice) => invoice.status === 'pending').length,
        paidCount: invoices.filter((invoice) => invoice.status === 'paid').length,
      },
    });
  } catch (error) {
    console.error('Fees API error', error);
    return NextResponse.json(
      { message: 'Failed to load fee information' },
      { status: 500 }
    );
  }
}
