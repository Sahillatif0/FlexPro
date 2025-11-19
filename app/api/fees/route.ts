import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    const invoices = await prisma.feeInvoice.findMany({
      where: { userId },
      include: {
        term: true,
        payments: true,
      },
      orderBy: { dueDate: 'desc' },
    });

    const totalPaid = invoices.reduce((sum, invoice) => {
      if (invoice.status === 'paid') {
        return sum + invoice.amount;
      }
      const partialPayments = invoice.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0);
      return sum + partialPayments;
    }, 0);

    const totalPending = invoices
      .filter((invoice) => invoice.status === 'pending' || invoice.status === 'overdue')
      .reduce((sum, invoice) => sum + invoice.amount, 0);

    const upcomingInvoice = invoices
      .filter((invoice) => invoice.status === 'pending' || invoice.status === 'overdue')
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0] ?? null;

    const formattedInvoices = invoices.map((invoice) => ({
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
