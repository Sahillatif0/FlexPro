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
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246); // Blue color
    doc.text('FlexPro Student Portal', 20, 30);
    
    // Title
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(title, 20, 50);
    
    // Content
    doc.setFontSize(12);
    let yPosition = 70;
    
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        doc.text(`${formattedKey}: ${String(value)}`, 20, yPosition);
        yPosition += 10;
      });
    }
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, doc.internal.pageSize.height - 20);
    
    // Save
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