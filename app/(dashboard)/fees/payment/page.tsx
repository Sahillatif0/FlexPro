'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/store';
import { CreditCard, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function PaymentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { user } = useAppStore();

    const invoiceId = searchParams.get('invoiceId');
    const amountParam = searchParams.get('amount');

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [name, setName] = useState('');

    // Format card number with spaces
    const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').substring(0, 16);
        const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
        setCardNumber(formatted);
    };

    // Format expiry date
    const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').substring(0, 4);
        if (value.length >= 2) {
            setExpiry(`${value.substring(0, 2)}/${value.substring(2)}`);
        } else {
            setExpiry(value);
        }
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !invoiceId) return;

        setIsLoading(true);

        try {
            const response = await fetch('/api/fees/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId,
                    amount: amountParam,
                    userId: user.id,
                    paymentDetails: {
                        cardNumber,
                        expiry,
                        cvc,
                        name,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error('Payment failed');
            }

            setIsSuccess(true);
            toast({
                title: 'Payment Successful',
                description: 'Your fee has been paid successfully.',
            });

            // Redirect after a short delay
            setTimeout(() => {
                router.push('/fees');
            }, 3000);
        } catch (error) {
            toast({
                title: 'Payment Failed',
                description: 'Please try again later.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="rounded-full bg-emerald-500/20 p-6">
                    <CheckCircle className="h-16 w-16 text-emerald-500" />
                </div>
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-white">Payment Successful!</h1>
                    <p className="text-gray-400">Thank you for your payment. Redirecting you back...</p>
                </div>
                <Button onClick={() => router.push('/fees')} className="bg-emerald-600 hover:bg-emerald-700">
                    Return to Fees
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/fees">
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                </Link>
            </div>

            <Card className="bg-gray-800 border-gray-700 shadow-xl">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-blue-400" />
                        Secure Payment
                    </CardTitle>
                    <CardDescription>
                        Enter your card details to pay PKR {Number(amountParam).toLocaleString()}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePayment} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-gray-300">Cardholder Name</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="bg-gray-900 border-gray-600 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="card" className="text-gray-300">Card Number</Label>
                            <div className="relative">
                                <Input
                                    id="card"
                                    placeholder="0000 0000 0000 0000"
                                    value={cardNumber}
                                    onChange={handleCardNumberChange}
                                    required
                                    maxLength={19}
                                    className="bg-gray-900 border-gray-600 text-white pl-10"
                                />
                                <CreditCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="expiry" className="text-gray-300">Expiry Date</Label>
                                <Input
                                    id="expiry"
                                    placeholder="MM/YY"
                                    value={expiry}
                                    onChange={handleExpiryChange}
                                    required
                                    maxLength={5}
                                    className="bg-gray-900 border-gray-600 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cvc" className="text-gray-300">CVC</Label>
                                <div className="relative">
                                    <Input
                                        id="cvc"
                                        placeholder="123"
                                        value={cvc}
                                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').substring(0, 3))}
                                        required
                                        maxLength={3}
                                        type="password"
                                        className="bg-gray-900 border-gray-600 text-white pl-10"
                                    />
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 mt-6"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Processing...' : `Pay PKR ${Number(amountParam).toLocaleString()}`}
                        </Button>

                        <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1 mt-4">
                            <Lock className="h-3 w-3" />
                            Payments are secure and encrypted
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
