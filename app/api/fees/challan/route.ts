import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export { dynamic, revalidate, fetchCache } from "@/lib/route-config";

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

    const [user, activeTerm] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.term.findFirst({ where: { isActive: true } }),
    ]);

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const invoices = await prisma.feeInvoice.findMany({
      where: {
        userId,
        ...(activeTerm ? { termId: activeTerm.id } : {}),
      },
      orderBy: { dueDate: 'asc' },
    });

    if (!invoices.length) {
      return NextResponse.json(
        { message: 'No invoices found for challan generation' },
        { status: 404 }
      );
    }

    const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const dueDate = invoices.reduce((earliest, invoice) => {
      if (!earliest) return invoice.dueDate;
      return invoice.dueDate < earliest ? invoice.dueDate : earliest;
    }, invoices[0].dueDate);

    const challanNumber = `FP-${(activeTerm?.year ?? new Date().getFullYear()).toString()}-${
      user.studentId?.replace(/[^0-9A-Z]/gi, '').slice(-4) || '0000'
    }`;

    const fees = invoices.map((invoice) => ({
      id: invoice.id,
      description: invoice.description,
      amount: invoice.amount,
      status: invoice.status,
    }));

    return NextResponse.json({
      challan: {
        studentName: `${user.firstName} ${user.lastName}`,
        studentId: user.studentId,
        program: user.program,
        semester: user.semester,
        term: activeTerm?.name ?? null,
        totalAmount,
        dueDate,
        challanNumber,
        fees,
        bankDetails: {
          bankName: 'Allied Bank Limited',
          accountTitle: 'FlexPro University',
          accountNumber: '0010-1234567890',
          branchCode: '0123',
        },
      },
    });
  } catch (error) {
    console.error('Challan API error', error);
    return NextResponse.json(
      { message: 'Failed to generate challan' },
      { status: 500 }
    );
  }
}
