'use client';

import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PDFButton } from '@/components/ui/pdf-button';
import { Wallet, CreditCard, DollarSign, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function FeesPage() {
  // Mock data
  const feeInvoices = [
    {
      id: '1',
      description: 'Tuition Fee - Fall 2024',
      amount: 75000,
      dueDate: '2024-12-30',
      status: 'pending',
      createdAt: '2024-08-15',
    },
    {
      id: '2',
      description: 'Laboratory Fee - Fall 2024',
      amount: 5000,
      dueDate: '2024-12-30',
      status: 'paid',
      createdAt: '2024-08-15',
    },
    {
      id: '3',
      description: 'Library Fee - Fall 2024',
      amount: 2000,
      dueDate: '2024-12-30',
      status: 'paid',
      createdAt: '2024-08-15',
    },
    {
      id: '4',
      description: 'Sports Fee - Fall 2024',
      amount: 3000,
      dueDate: '2024-12-30',
      status: 'paid',
      createdAt: '2024-08-15',
    },
  ];

  const totalPaid = feeInvoices.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
  const totalPending = feeInvoices.filter(f => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0);

  const columns = [
    {
      key: 'description',
      title: 'Description',
      render: (value: string) => (
        <span className="font-medium text-white">{value}</span>
      ),
      sortable: true,
    },
    {
      key: 'amount',
      title: 'Amount',
      render: (value: number) => (
        <span className="font-mono text-emerald-400">PKR {value.toLocaleString()}</span>
      ),
      sortable: true,
    },
    {
      key: 'dueDate',
      title: 'Due Date',
      render: (value: string) => (
        <span className="text-gray-300">{new Date(value).toLocaleDateString()}</span>
      ),
      sortable: true,
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => (
        <Badge
          variant={value === 'paid' ? 'default' : value === 'pending' ? 'destructive' : 'secondary'}
          className={
            value === 'paid' ? 'bg-emerald-600' :
            value === 'pending' ? 'bg-amber-600' : ''
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, item: any) => (
        <div className="flex gap-2">
          <PDFButton
            title="Fee Challan"
            data={{
              studentName: 'Sahil Latif',
              studentId: '23I-0763',
              description: item.description,
              amount: `PKR ${item.amount.toLocaleString()}`,
              dueDate: new Date(item.dueDate).toLocaleDateString(),
              status: item.status,
            }}
            filename={`challan-${item.id}.pdf`}
            variant="outline"
            size="sm"
          />
          {item.status === 'pending' && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              Pay Now
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Fee Management</h1>
          <p className="text-gray-400">View and manage your fee payments</p>
        </div>
        <div className="flex gap-2">
          <Link href="/fees/challan">
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              Generate Challan
            </Button>
          </Link>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <CreditCard className="h-4 w-4 mr-2" />
            Pay Online
          </Button>
        </div>
      </div>

      {/* Fee Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Paid</p>
                <p className="text-2xl font-bold text-emerald-400">PKR {totalPaid.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Pending</p>
                <p className="text-2xl font-bold text-amber-400">PKR {totalPending.toLocaleString()}</p>
              </div>
              <Wallet className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Next Due Date</p>
                <p className="text-2xl font-bold text-white">Dec 30</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Invoices Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Fee Details</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={feeInvoices}
            columns={columns}
            searchKey="description"
            emptyMessage="No fee records found"
          />
        </CardContent>
      </Card>
    </div>
  );
}