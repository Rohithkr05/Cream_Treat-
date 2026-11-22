import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import path from 'node:path';
import fs from 'node:fs';
import { InvoiceDocument, SupplyType } from './schemas/invoice.schema.js';

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  /**
   * Helper to format integer paise into formatted INR string (e.g. 19000 -> "190.00")
   */
  formatPaise(paise: number): string {
    const rupees = (paise / 100).toFixed(2);
    const parts = rupees.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Indian numbering format: 1,00,000
    const lastThree = integerPart.slice(-3);
    const otherNumbers = integerPart.slice(0, -3);
    const formattedInt =
      otherNumbers !== ''
        ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
        : lastThree;

    return `₹${formattedInt}.${decimalPart}`;
  }

  /**
   * Helper to convert integer paise into Indian currency words
   */
  amountToWords(paise: number): string {
    const rupees = Math.floor(paise / 100);
    const remainderPaise = paise % 100;

    const singleDigits = [
      '',
      'One',
      'Two',
      'Three',
      'Four',
      'Five',
      'Six',
      'Seven',
      'Eight',
      'Nine',
    ];
    const twoDigits = [
      'Ten',
      'Eleven',
      'Twelve',
      'Thirteen',
      'Fourteen',
      'Fifteen',
      'Sixteen',
      'Seventeen',
      'Eighteen',
      'Nineteen',
    ];
    const tensMultiple = [
      '',
      '',
      'Twenty',
      'Thirty',
      'Forty',
      'Fifty',
      'Sixty',
      'Seventy',
      'Eighty',
      'Ninety',
    ];

    const convertTwoDigit = (n: number): string => {
      if (n === 0) return '';
      if (n < 10) return singleDigits[n];
      if (n < 20) return twoDigits[n - 10];
      const tens = Math.floor(n / 10);
      const units = n % 10;
      return tensMultiple[tens] + (units ? ' ' + singleDigits[units] : '');
    };

    const convertThreeDigit = (n: number): string => {
      const hundreds = Math.floor(n / 100);
      const rest = n % 100;
      let res = '';
      if (hundreds > 0) {
        res += singleDigits[hundreds] + ' Hundred';
        if (rest > 0) res += ' and ';
      }
      if (rest > 0) {
        res += convertTwoDigit(rest);
      }
      return res;
    };

    if (rupees === 0 && remainderPaise === 0) {
      return 'Zero Rupees Only';
    }

    let crore = Math.floor(rupees / 10000000);
    let lakh = Math.floor((rupees % 10000000) / 100000);
    let thousand = Math.floor((rupees % 100000) / 1000);
    let remainder = rupees % 1000;

    let result = '';
    if (crore > 0) result += convertTwoDigit(crore) + ' Crore ';
    if (lakh > 0) result += convertTwoDigit(lakh) + ' Lakh ';
    if (thousand > 0) result += convertTwoDigit(thousand) + ' Thousand ';
    if (remainder > 0) result += convertThreeDigit(remainder) + ' ';

    result = result.trim() + ' Rupees';

    if (remainderPaise > 0) {
      result += ' and ' + convertTwoDigit(remainderPaise) + ' Paise';
    }

    return result + ' Only';
  }

  /**
   * Generates a professional A4 binary PDF for a GST invoice
   */
  async generateInvoicePdf(invoice: InvoiceDocument): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 36, // 0.5 inch margins
          info: {
            Title: `Tax Invoice - ${invoice.invoiceNumber}`,
            Author: 'Cream Treat',
            Subject: `GST Invoice for Order ${invoice.orderNumber}`,
            Creator: 'Cream Treat GST Billing Engine',
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const primaryMaroon = '#6A0019';
        const darkText = '#1F2937';
        const grayText = '#4B5563';
        const lightBg = '#FBF7F2';
        const borderGray = '#D1D5DB';

        // 1. HEADER BRANDING & LOGO
        const logoPath = path.resolve(process.cwd(), '../frontend/public/logo.jpg');
        const fallbackLogoPath = path.resolve(process.cwd(), 'frontend/public/logo.jpg');
        const validLogo = fs.existsSync(logoPath)
          ? logoPath
          : fs.existsSync(fallbackLogoPath)
            ? fallbackLogoPath
            : null;

        if (validLogo) {
          try {
            doc.image(validLogo, 36, 36, { width: 55 });
          } catch {
            // If image corrupt, continue gracefully
          }
        }

        // Shop Title & Header
        doc
          .font('Helvetica-Bold')
          .fontSize(20)
          .fillColor(primaryMaroon)
          .text(invoice.shopInfo.shopName || 'CREAM TREAT', 100, 36);

        if (invoice.shopInfo.legalName) {
          doc
            .font('Helvetica')
            .fontSize(8.5)
            .fillColor(grayText)
            .text(`Legal Name: ${invoice.shopInfo.legalName}`, 100, 58);
        }

        const addressText = [
          invoice.shopInfo.address.line1,
          invoice.shopInfo.address.city,
          invoice.shopInfo.address.state
            ? `${invoice.shopInfo.address.state} - ${invoice.shopInfo.address.pincode}`
            : '',
        ]
          .filter(Boolean)
          .join(', ');

        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(darkText)
          .text(addressText, 100, 70, { width: 280 });

        const contactDetails = [
          invoice.shopInfo.phone ? `Phone: ${invoice.shopInfo.phone}` : '',
          invoice.shopInfo.email ? `Email: ${invoice.shopInfo.email}` : '',
        ]
          .filter(Boolean)
          .join(' | ');

        if (contactDetails) {
          doc.fontSize(8).fillColor(grayText).text(contactDetails, 100, 83);
        }

        // Top Right: TAX INVOICE Title Badge
        doc
          .font('Helvetica-Bold')
          .fontSize(14)
          .fillColor(primaryMaroon)
          .text('TAX INVOICE', 390, 36, { align: 'right', width: 170 });

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(grayText)
          .text('(Original for Recipient)', 390, 52, { align: 'right', width: 170 });

        // Shop GSTIN & State Code
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(primaryMaroon)
          .text(`GSTIN: ${invoice.shopInfo.gstin || 'UNCONFIGURED'}`, 370, 68, {
            align: 'right',
            width: 190,
          });

        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(darkText)
          .text(
            `State: ${invoice.shopInfo.address.state || 'N/A'} (Code: ${invoice.shopInfo.address.stateCode || 'N/A'})`,
            370,
            82,
            { align: 'right', width: 190 },
          );

        if (invoice.shopInfo.pan) {
          doc
            .fontSize(8)
            .fillColor(grayText)
            .text(`PAN: ${invoice.shopInfo.pan}`, 370, 95, {
              align: 'right',
              width: 190,
            });
        }

        // Horizontal Separator
        doc
          .strokeColor(primaryMaroon)
          .lineWidth(1.5)
          .moveTo(36, 114)
          .lineTo(559, 114)
          .stroke();

        // 2. INVOICE & CUSTOMER METADATA BOXES
        const metaTop = 120;
        const metaHeight = 84;

        // Box Left: Invoice Info
        doc
          .rect(36, metaTop, 255, metaHeight)
          .fillAndStroke(lightBg, borderGray);

        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(primaryMaroon)
          .text('INVOICE DETAILS', 44, metaTop + 5);

        const issueDateStr = new Date(invoice.issuedAt).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium',
          timeStyle: 'short',
        });
        const orderDateStr = new Date(invoice.orderDate).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium',
          timeStyle: 'short',
        });

        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(darkText)
          .text('Invoice No:', 44, metaTop + 18)
          .font('Helvetica')
          .text(invoice.invoiceNumber, 102, metaTop + 18);

        doc
          .font('Helvetica-Bold')
          .text('Invoice Date:', 44, metaTop + 29)
          .font('Helvetica')
          .text(`${issueDateStr} IST`, 102, metaTop + 29);

        doc
          .font('Helvetica-Bold')
          .text('Order Ref:', 44, metaTop + 40)
          .font('Helvetica')
          .text(`${invoice.orderNumber} (Table ${invoice.tableNumber})`, 102, metaTop + 40);

        doc
          .font('Helvetica-Bold')
          .text('Order Date:', 44, metaTop + 51)
          .font('Helvetica')
          .text(`${orderDateStr} IST`, 102, metaTop + 51);

        doc
          .font('Helvetica-Bold')
          .text('Payment:', 44, metaTop + 62)
          .font('Helvetica')
          .text(
            `${invoice.paymentMode} (${invoice.paymentStatus})`,
            102,
            metaTop + 62,
          );

        doc
          .font('Helvetica-Bold')
          .text('Supply Type:', 44, metaTop + 73)
          .font('Helvetica')
          .text(
            invoice.supplyType === SupplyType.INTRA_STATE
              ? 'Intra-State (CGST + SGST)'
              : 'Inter-State (IGST)',
            102,
            metaTop + 73,
          );

        // Box Right: Billed To (Customer Info)
        doc
          .rect(304, metaTop, 255, metaHeight)
          .fillAndStroke(lightBg, borderGray);

        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(primaryMaroon)
          .text('BILLED TO (CUSTOMER)', 312, metaTop + 5);

        const custName = invoice.customerInfo?.name || 'Counter / Dine-in Guest';
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(darkText)
          .text('Customer:', 312, metaTop + 18)
          .font('Helvetica')
          .text(custName, 370, metaTop + 18);

        if (invoice.customerInfo?.phone) {
          doc
            .font('Helvetica-Bold')
            .text('Phone:', 312, metaTop + 30)
            .font('Helvetica')
            .text(invoice.customerInfo.phone, 370, metaTop + 30);
        }

        if (invoice.customerInfo?.gstin) {
          doc
            .font('Helvetica-Bold')
            .text('GSTIN:', 312, metaTop + 42)
            .font('Helvetica')
            .text(invoice.customerInfo.gstin, 370, metaTop + 42);
        }

        if (invoice.customerInfo?.state) {
          doc
            .font('Helvetica-Bold')
            .text('State:', 312, metaTop + 54)
            .font('Helvetica')
            .text(
              `${invoice.customerInfo.state} (${invoice.customerInfo.stateCode || ''})`,
              370,
              metaTop + 54,
            );
        } else {
          doc
            .font('Helvetica-Bold')
            .text('Place of Supply:', 312, metaTop + 54)
            .font('Helvetica')
            .text(invoice.shopInfo.address.state || 'Local', 386, metaTop + 54);
        }

        if (invoice.customerInfo?.address) {
          doc
            .font('Helvetica-Bold')
            .text('Address:', 312, metaTop + 66)
            .font('Helvetica')
            .text(invoice.customerInfo.address, 370, metaTop + 66, { width: 180, lineBreak: false });
        }

        // 3. ITEMIZED FOOD TABLE
        let tableY = 212;
        const isInterState = invoice.supplyType === SupplyType.INTER_STATE;

        // Table Header
        doc
          .rect(36, tableY, 523, 20)
          .fillAndStroke(primaryMaroon, primaryMaroon);

        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF');
        doc.text('#', 40, tableY + 6, { width: 16 });
        doc.text('Item Description', 58, tableY + 6, { width: 160 });
        doc.text('HSN/SAC', 222, tableY + 6, { width: 44, align: 'center' });
        doc.text('Qty', 268, tableY + 6, { width: 24, align: 'center' });
        doc.text('Rate', 294, tableY + 6, { width: 48, align: 'right' });
        doc.text('Taxable', 344, tableY + 6, { width: 52, align: 'right' });

        if (isInterState) {
          doc.text('IGST', 400, tableY + 6, { width: 56, align: 'right' });
          doc.text('Total', 460, tableY + 6, { width: 95, align: 'right' });
        } else {
          doc.text('CGST', 400, tableY + 6, { width: 42, align: 'right' });
          doc.text('SGST', 444, tableY + 6, { width: 42, align: 'right' });
          doc.text('Total', 488, tableY + 6, { width: 67, align: 'right' });
        }

        tableY += 20;

        // Table Rows
        invoice.items.forEach((item, index) => {
          const rowBg = index % 2 === 0 ? '#FFFFFF' : '#FBF7F2';
          doc.rect(36, tableY, 523, 18).fillAndStroke(rowBg, '#E5E7EB');

          doc.font('Helvetica').fontSize(7.5).fillColor(darkText);
          doc.text(String(index + 1), 40, tableY + 5, { width: 16 });
          doc.font('Helvetica-Bold').text(item.nameSnapshot, 58, tableY + 5, {
            width: 160,
            ellipsis: true,
          });
          doc.font('Helvetica');
          doc.text(item.hsnSacCode || invoice.defaultHsnSac || '-', 222, tableY + 5, {
            width: 44,
            align: 'center',
          });
          doc.text(String(item.quantity), 268, tableY + 5, {
            width: 24,
            align: 'center',
          });
          doc.text(this.formatPaise(item.unitPrice), 294, tableY + 5, {
            width: 48,
            align: 'right',
          });
          doc.text(this.formatPaise(item.taxableAmount), 344, tableY + 5, {
            width: 52,
            align: 'right',
          });

          if (isInterState) {
            doc.text(
              `${this.formatPaise(item.igstAmount)} (${item.igstRate}%)`,
              400,
              tableY + 5,
              { width: 56, align: 'right' },
            );
            doc.font('Helvetica-Bold').text(this.formatPaise(item.totalAmount), 460, tableY + 5, {
              width: 95,
              align: 'right',
            });
          } else {
            doc.text(
              this.formatPaise(item.cgstAmount),
              400,
              tableY + 5,
              { width: 42, align: 'right' },
            );
            doc.text(
              this.formatPaise(item.sgstAmount),
              444,
              tableY + 5,
              { width: 42, align: 'right' },
            );
            doc.font('Helvetica-Bold').text(this.formatPaise(item.totalAmount), 488, tableY + 5, {
              width: 67,
              align: 'right',
            });
          }

          tableY += 18;
        });

        // 4. SUMMARY & TOTALS SECTION
        tableY += 6;
        const summaryTop = tableY;

        // Left box: Amount in words & Note
        doc
          .rect(36, summaryTop, 300, 85)
          .fillAndStroke(lightBg, borderGray);

        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(primaryMaroon)
          .text('INVOICE AMOUNT IN WORDS:', 44, summaryTop + 8);

        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(darkText)
          .text(this.amountToWords(invoice.grandTotal), 44, summaryTop + 22, {
            width: 284,
          });

        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(grayText)
          .text(
            invoice.isTaxInclusive
              ? '* All prices on menu were tax-inclusive. GST was calculated accordingly.'
              : '* GST was charged in addition to menu rates.',
            44,
            summaryTop + 54,
            { width: 284 },
          );

        // Right box: Numerical totals & tax breakdown
        doc
          .rect(342, summaryTop, 217, 85)
          .fillAndStroke('#FFFFFF', borderGray);

        let sumY = summaryTop + 6;
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(grayText)
          .text('Total Taxable Value:', 350, sumY)
          .fillColor(darkText)
          .text(this.formatPaise(invoice.taxableAmount), 450, sumY, {
            width: 100,
            align: 'right',
          });

        if (isInterState) {
          sumY += 14;
          doc
            .font('Helvetica')
            .fillColor(grayText)
            .text('Total IGST:', 350, sumY)
            .fillColor(darkText)
            .text(this.formatPaise(invoice.igstTotal), 450, sumY, {
              width: 100,
              align: 'right',
            });
        } else {
          sumY += 14;
          doc
            .font('Helvetica')
            .fillColor(grayText)
            .text('Total CGST:', 350, sumY)
            .fillColor(darkText)
            .text(this.formatPaise(invoice.cgstTotal), 450, sumY, {
              width: 100,
              align: 'right',
            });

          sumY += 14;
          doc
            .font('Helvetica')
            .fillColor(grayText)
            .text('Total SGST:', 350, sumY)
            .fillColor(darkText)
            .text(this.formatPaise(invoice.sgstTotal), 450, sumY, {
              width: 100,
              align: 'right',
            });
        }

        sumY += 14;
        doc
          .font('Helvetica')
          .fillColor(grayText)
          .text('Total GST Tax:', 350, sumY)
          .fillColor(darkText)
          .text(this.formatPaise(invoice.totalGst), 450, sumY, {
            width: 100,
            align: 'right',
          });

        // Grand Total Row
        sumY += 16;
        doc.rect(342, sumY - 2, 217, 23).fill(primaryMaroon);
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#FFFFFF')
          .text('GRAND TOTAL:', 350, sumY + 4)
          .text(this.formatPaise(invoice.grandTotal), 450, sumY + 4, {
            width: 100,
            align: 'right',
          });

        // 5. FOOTER & DECLARATIONS
        const footerY = 730;

        doc
          .strokeColor(borderGray)
          .lineWidth(0.8)
          .moveTo(36, footerY)
          .lineTo(559, footerY)
          .stroke();

        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor(primaryMaroon)
          .text('Terms & Conditions:', 36, footerY + 6);

        const terms = invoice.termsAndConditions?.length
          ? invoice.termsAndConditions
          : ['Thank you for dining at Cream Treat!'];

        doc
          .font('Helvetica')
          .fontSize(6.5)
          .fillColor(grayText)
          .text(terms.join(' | '), 36, footerY + 16, { width: 340 });

        doc
          .font('Helvetica')
          .fontSize(6.5)
          .fillColor(grayText)
          .text(
            'This is a computer-generated tax invoice. No signature required.',
            36,
            footerY + 30,
          );

        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(primaryMaroon)
          .text(`For ${invoice.shopInfo.shopName || 'Cream Treat'}`, 400, footerY + 6, {
            align: 'right',
            width: 155,
          });

        doc
          .font('Helvetica')
          .fontSize(6.5)
          .fillColor(grayText)
          .text('Authorized Signatory', 400, footerY + 40, {
            align: 'right',
            width: 155,
          });

        doc.end();
      } catch (error) {
        this.logger.error('Failed to generate invoice PDF', error);
        reject(error);
      }
    });
  }
}

