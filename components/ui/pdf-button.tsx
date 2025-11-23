'use client';

import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';

interface PDFButtonProps {
  title: string;
  data: any;
  filename: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function PDFButton({ title, data, filename, variant = 'default', size = 'default', className }: PDFButtonProps) {
  const generatePDF = () => {
    const doc = new jsPDF();

    // Check if this is a Challan Data structure
    if (data && data.challanNumber) {
      // --- Challan Layout ---
      doc.setFontSize(22);
      doc.setTextColor(59, 130, 246); // Blue
      doc.text('FlexPro University', 105, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text('Student Fee Payment Challan', 105, 28, { align: 'center' });

      doc.setLineWidth(0.5);
      doc.setDrawColor(200);
      doc.line(20, 35, 190, 35);

      let y = 45;

      // Student Details
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Student Information', 20, y);
      y += 10;

      doc.setFontSize(11);
      doc.setTextColor(80);
      const leftColX = 20;
      const rightColX = 110;

      doc.text(`Name: ${data.studentName}`, leftColX, y);
      doc.text(`Student ID: ${data.studentId}`, rightColX, y);
      y += 8;
      doc.text(`Program: ${data.program}`, leftColX, y);
      doc.text(`Semester: ${data.semester}`, rightColX, y);
      y += 8;
      doc.text(`Challan #: ${data.challanNumber}`, leftColX, y);
      doc.text(`Term: ${data.term}`, rightColX, y);
      y += 8;
      doc.text(`Due Date: ${new Date(data.dueDate).toLocaleDateString()}`, leftColX, y);

      y += 15;

      // Fee Breakdown
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Fee Breakdown', 20, y);
      y += 10;

      // Table Header
      doc.setFillColor(240, 240, 240);
      doc.rect(20, y - 6, 170, 8, 'F');
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text('Description', 25, y);
      doc.text('Amount (PKR)', 185, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 10;

      // Fee Items
      if (Array.isArray(data.fees)) {
        data.fees.forEach((fee: any) => {
          doc.text(fee.description, 25, y);
          doc.text(fee.amount.toLocaleString(), 185, y, { align: 'right' });
          y += 8;
        });
      }

      // Total Line
      doc.line(20, y - 4, 190, y - 4);
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.text('Total Amount:', 25, y);
      doc.setTextColor(59, 130, 246); // Blue
      doc.text(data.totalAmount.toLocaleString(), 185, y, { align: 'right' });
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');

      y += 15;

      // Bank Details
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Bank Details', 20, y);
      y += 10;

      doc.setFontSize(11);
      doc.setTextColor(80);
      if (data.bankDetails) {
        doc.text(`Bank: ${data.bankDetails.bankName}`, 20, y);
        y += 6;
        doc.text(`Account Title: ${data.bankDetails.accountTitle}`, 20, y);
        y += 6;
        doc.text(`Account Number: ${data.bankDetails.accountNumber}`, 20, y);
      }

      // Footer
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text('This is a computer generated document and does not require a signature.', 105, 280, { align: 'center' });

    } else {
      // --- Existing Logic for Transcript/Generic ---
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246);
      doc.text('FlexPro Student Portal', 20, 30);
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(title, 20, 50);
      doc.setFontSize(12);
      let y = 70;

      const pageHeight = doc.internal.pageSize.height;
      const bottomMargin = 20;
      const ensureSpace = (lines: number = 1) => {
        const needed = lines * 8;
        if (y + needed > pageHeight - bottomMargin) {
          doc.addPage();
          y = 30;
        }
      };

      const hasTerms = data && Array.isArray(data.terms);

      if (!hasTerms) {
        if (data) {
          Object.entries(data).forEach(([key, value]) => {
            const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
            ensureSpace(1);
            doc.text(`${formattedKey}: ${String(value)}`, 20, y);
            y += 10;
          });
        }
      } else {
        const headerPairs: [string, unknown][] = [
          ['Student Name', data.studentName],
          ['Student Id', data.studentId],
          ['Program', data.program],
          ['Total Credit Hours', data.totalCreditHours],
          ['Overall CGPA', data.cgpa],
        ];
        headerPairs.forEach(([k, v]) => {
          ensureSpace(1);
          doc.text(`${k}: ${String(v)}`, 20, y);
          y += 10;
        });
        ensureSpace(1);
        y += 5;

        const colX = { code: 20, title: 60, cr: 150, grade: 170, gp: 190 } as const;

        const drawTableHeader = () => {
          doc.setFontSize(11);
          doc.text('Code', colX.code, y);
          doc.text('Title', colX.title, y);
          doc.text('CR', colX.cr, y);
          doc.text('Grade', colX.grade, y);
          doc.text('GP', colX.gp, y);
          y += 8;
        };

        const truncate = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1) + '…' : s);

        data.terms.forEach((term: any, idx: number) => {
          if (idx > 0) {
            ensureSpace(2);
          }
          doc.setFontSize(13);
          doc.setTextColor(0, 0, 0);
          doc.text(`Term: ${term.term}`, 20, y);
          doc.setFontSize(11);
          doc.setTextColor(34, 197, 94);
          doc.text(`SGPA: ${term.sgpa}`, 120, y);
          doc.setTextColor(59, 130, 246);
          doc.text(`CGPA: ${term.cgpaUntilTerm}`, 160, y);
          y += 10;
          drawTableHeader();

          term.courses.forEach((c: any) => {
            ensureSpace(1);
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(String(c.courseCode), colX.code, y);
            doc.text(truncate(String(c.courseTitle), 40), colX.title, y);
            doc.text(String(c.creditHours), colX.cr, y);
            doc.text(String(c.grade), colX.grade, y);
            doc.text(String(c.gradePoints), colX.gp, y);
            y += 8;
          });
          y += 6;
        });
      }

      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, doc.internal.pageSize.height - 20);
    }

    doc.save(filename);
  };

  return (
    <Button
      onClick={generatePDF}
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className || ''}`}
    >
      <Download className="h-4 w-4" />
      Download PDF
    </Button>
  );
}
