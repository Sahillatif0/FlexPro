'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PDFButton } from '@/components/ui/pdf-button';
import { useAppStore } from '@/store';
import { ArrowLeft, Calendar, Hash, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function ChallanPage() {
  const { user } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [challanData, setChallanData] = useState<any>(null);

  useEffect(() => {
    async function fetchChallanData() {
      if (!user) return;
      try {
        const response = await fetch(`/api/fees?userId=${user.id}`);
        const data = await response.json();

        // Find the tuition fee invoice or the most recent pending one
        const invoice = data.invoices.find((inv: any) => inv.description === 'Tuition Fee' && inv.status === 'pending')
          || data.invoices[0];

        if (invoice) {
          setChallanData({
            studentName: `${user.firstName} ${user.lastName}`,
            studentId: user.studentId,
            program: user.program,
            semester: user.semester,
            term: invoice.term || 'Current Term',
            fees: [
              { description: invoice.description, amount: invoice.amount },
              // Add other fixed fees if needed, or fetch them
            ],
            totalAmount: invoice.amount,
            dueDate: invoice.dueDate,
            challanNumber: `FP-${new Date().getFullYear()}-${invoice.id.substring(0, 6).toUpperCase()}`,
            bankDetails: {
              bankName: 'Allied Bank Limited',
              accountTitle: 'FlexPro University',
              accountNumber: '0010-1234567890',
            },
            invoiceId: invoice.id,
            status: invoice.status,
          });
        }
      } catch (error) {
        console.error('Failed to fetch challan data', error);
      } finally {
        setLoading(false);
      }
    }

    fetchChallanData();
  }, [user]);

  if (loading) {
    return <div className="text-white">Loading challan details...</div>;
  }

  if (!challanData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/fees">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Fees
            </Button>
          </Link>
        </div>
        <div className="text-white">No pending challan found.</div>
      </div>
    );
  }

  const totalPaid = challanData.status === 'paid' ? challanData.totalAmount : 0;
  const totalPending = challanData.status === 'pending' ? challanData.totalAmount : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/fees">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Fees
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Fee Challan</h1>
            <p className="text-gray-400">Generate and download your fee payment challan</p>
          </div>
        </div>
        <PDFButton
          title={`Fee Challan - ${challanData.term}`}
          data={challanData}
          filename={`fee-challan-${challanData.challanNumber}.pdf`}
          variant="default"
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Challan Preview */}
        <div className="lg:col-span-2">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="border-b border-gray-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Payment Challan</CardTitle>
                <Badge variant="outline" className={
                  challanData.status === 'paid'
                    ? "border-emerald-500 text-emerald-400"
                    : "border-amber-500 text-amber-400"
                }>
                  {challanData.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {/* Header */}
              <div className="text-center border-b border-gray-700 pb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">F</span>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white">FlexPro University</h2>
                <p className="text-gray-400 text-sm">Student Fee Payment Challan</p>
              </div>

              {/* Student Details */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-white text-lg">Student Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white">{challanData.studentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Student ID:</span>
                      <span className="text-blue-400 font-mono">{challanData.studentId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Program:</span>
                      <span className="text-white">{challanData.program}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Semester:</span>
                      <span className="text-white">{challanData.semester}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-white text-lg">Challan Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Challan #:</span>
                      <span className="text-white font-mono">{challanData.challanNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Term:</span>
                      <span className="text-white">{challanData.term}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Due Date:</span>
                      <span className="text-amber-400">{new Date(challanData.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="space-y-3">
                <h3 className="font-semibold text-white text-lg">Fee Breakdown</h3>
                <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                  {challanData.fees.map((fee: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-300">{fee.description}</span>
                      <span className="text-white font-mono">PKR {fee.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-600 pt-2 mt-3">
                    <div className="flex justify-between font-bold">
                      <span className="text-white">Total Amount:</span>
                      <span className="text-emerald-400 text-lg">PKR {challanData.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-3">
                <h3 className="font-semibold text-white text-lg">Bank Details</h3>
                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Bank Name:</span>
                    <span className="text-white">{challanData.bankDetails.bankName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Account Title:</span>
                    <span className="text-white">{challanData.bankDetails.accountTitle}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Account Number:</span>
                    <span className="text-blue-400 font-mono">{challanData.bankDetails.accountNumber}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {challanData.status === 'pending' && challanData.totalAmount > 0 && (
                <Link href={`/fees/payment?invoiceId=${challanData.invoiceId}&amount=${challanData.totalAmount}`}>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Online
                  </Button>
                </Link>
              )}
              <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                <Hash className="h-4 w-4 mr-2" />
                Track Payment
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Due:</span>
                <span className="text-amber-400 font-bold">PKR {totalPending.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Paid:</span>
                <span className="text-emerald-400 font-bold">PKR {totalPaid.toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-700 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">Due Date:</span>
                  <span className="text-amber-400">{new Date(challanData.dueDate).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-900/20 border-amber-700">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-amber-400 font-medium text-sm">Payment Reminder</p>
                  <p className="text-amber-300 text-xs">
                    Late fee charges apply after due date. Pay before {new Date(challanData.dueDate).toLocaleDateString()} to avoid penalties.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}