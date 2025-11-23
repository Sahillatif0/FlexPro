import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { invoiceId, amount, paymentDetails, userId } = body;

        if (!invoiceId || !amount || !userId) {
            return NextResponse.json(
                { message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Simulate payment processing delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 1. Create FeePayment record
        const payment = await prisma.feePayment.create({
            data: {
                userId,
                invoiceId,
                amount: parseFloat(amount),
                method: 'online',
                reference: `TXN-${Math.random().toString(36).substring(7).toUpperCase()}`,
            },
        });

        // 2. Update FeeInvoice status
        // For this fake implementation, we assume full payment clears the invoice
        await prisma.feeInvoice.update({
            where: { id: invoiceId },
            data: { status: 'paid' },
        });

        return NextResponse.json({
            message: 'Payment successful',
            payment,
        });
    } catch (error) {
        console.error('Payment API error', error);
        return NextResponse.json(
            { message: 'Payment failed' },
            { status: 500 }
        );
    }
}
