'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PDFButton } from '@/components/ui/pdf-button';
import { Wallet, CreditCard, DollarSign, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useAppStore } from '@/store';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface FeeInvoice {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
  term: string | null;
  createdAt: string;
}

interface FeeSummary {
  totalPaid: number;
  totalPending: number;
  nextDueDate: string | null;
  pendingCount: number;
  paidCount: number;
}

export default function FeesPage() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();

    async function loadFees() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ userId: user.id });
        const response = await fetch(`/api/fees?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.message || 'Failed to load fee information');
        }

        const payload = (await response.json()) as {
          invoices: FeeInvoice[];
          summary: FeeSummary;
        };

        setInvoices(payload.invoices);
        setSummary(payload.summary);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Fees fetch error', err);
        setError(err.message || 'Failed to load fee information');
        toast({
          title: 'Unable to load fees',
          description: err.message || 'Please try again later.',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadFees();
    return () => controller.abort();
  }, [toast, user]);

  const columns = useMemo(
    () => [
      {
        key: 'description',
        title: 'Description',
        render: (value: string, item: FeeInvoice) => (
          <div>
            <span className="font-medium text-white">{value}</span>
            {item.term ? (
              <p className="text-xs text-gray-400">{item.term}</p>
            ) : null}
          </div>
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
              value === 'paid'
                ? 'bg-emerald-600'
                : value === 'pending'
                ? 'bg-amber-600'
                : ''
            }
          >
            {value}
          </Badge>
        ),
      },
      {
        key: 'actions',
        title: 'Actions',
        render: (_value: unknown, item: FeeInvoice) => (
          <div className="flex gap-2">
            <PDFButton
              title="Fee Challan"
              data={{
                studentName: user ? `${user.firstName} ${user.lastName}` : 'Student',
                studentId: user?.studentId ?? 'N/A',
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
    ],
    [user]
  );

  if (!user) {
    return <p className="text-gray-300">Sign in to view fee information.</p>;
  }

  const totalPaid = summary?.totalPaid ?? 0;
  const totalPending = summary?.totalPending ?? 0;
  const nextDueDate = summary?.nextDueDate
    ? new Date(summary.nextDueDate).toLocaleDateString()
    : 'No upcoming dues';

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

      {error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {/* Fee Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        {isLoading && !summary ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24 bg-gray-700" />
                  <Skeleton className="h-6 w-32 bg-gray-700" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
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
                    <p className="text-2xl font-bold text-white">{nextDueDate}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Fee Invoices Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Fee Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-48 bg-gray-700" />
                  <Skeleton className="h-4 w-24 bg-gray-700" />
                  <Skeleton className="h-4 w-32 bg-gray-700" />
                  <Skeleton className="h-8 w-20 bg-gray-700" />
                </div>
              ))}
            </div>
          ) : (
            <DataTable
              data={invoices}
              columns={columns}
              searchKey="description"
              emptyMessage="No fee records found"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}