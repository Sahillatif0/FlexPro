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
}

export function PDFButton({ title, data, filename, variant = 'default', size = 'default' }: PDFButtonProps) {
  const generatePDF = () => {
    const doc = new jsPDF();
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
    doc.save(filename);
  };

  return (
    <Button
      onClick={generatePDF}
      variant={variant}
      size={size}
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      Download PDF
    </Button>
  );
}
