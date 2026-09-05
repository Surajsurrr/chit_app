import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { Customer, Receipt, Scheme } from '../data/mockData';
import { formatDateLong, formatDateShort, formatFrequency } from './dateHelpers';

// Helper to convert number to Indian currency words
export const numberToWordsINR = (num: number): string => {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero Rupees Only';

  const inWords = (n: number): string => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 > 0 ? ' ' + a[n % 10] : '') + ' ';
    } else if (n > 0) {
      str += a[n] + ' ';
    }
    return str;
  };

  const crores = Math.floor(num / 10000000);
  const lakhs = Math.floor((num % 10000000) / 100000);
  const thousands = Math.floor((num % 100000) / 1000);
  const remaining = Math.floor(num % 1000);

  let result = '';
  if (crores > 0) result += inWords(crores) + 'Crore ';
  if (lakhs > 0) result += inWords(lakhs) + 'Lakh ';
  if (thousands > 0) result += inWords(thousands) + 'Thousand ';
  if (remaining > 0) result += inWords(remaining);

  return result.trim() + ' Rupees Only';
};

/**
 * Generates an official, beautifully styled HTML receipt
 */
export const generateReceiptHtml = (
  receipt: Receipt,
  customer?: Customer,
  scheme?: Scheme
): string => {
  const formattedDate = formatDateLong(receipt.date);
  const amountFormatted = receipt.amount.toLocaleString('en-IN');
  const remainingFormatted = receipt.remainingBalance.toLocaleString('en-IN');
  const amountWords = numberToWordsINR(receipt.amount);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - ${receipt.receiptNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #0F172A;
      background-color: #FFFFFF;
      font-size: 13px;
      line-height: 1.5;
    }
    .receipt-box {
      max-width: 680px;
      margin: 0 auto;
      border: 2px solid #E2E8F0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    }
    /* Header */
    .header {
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      color: #FFFFFF;
      padding: 28px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #10B981;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #FFFFFF;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-title span {
      color: #10B981;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #94A3B8;
      margin-top: 4px;
    }
    .brand-reg {
      font-size: 10px;
      color: #64748B;
      margin-top: 2px;
    }
    .receipt-badge {
      background-color: rgba(16, 185, 129, 0.15);
      border: 1px solid #10B981;
      color: #10B981;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      text-align: right;
    }

    /* Meta Bar */
    .meta-bar {
      background-color: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748B;
      letter-spacing: 0.5px;
    }
    .meta-value {
      font-size: 13px;
      font-weight: 700;
      color: #0F172A;
      margin-top: 2px;
    }
    .meta-value.mono {
      font-family: 'Courier New', Courier, monospace;
      color: #0284C7;
    }

    /* Content */
    .content {
      padding: 32px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    .info-card {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 16px 20px;
    }
    .info-card-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 6px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .info-row:last-child {
      margin-bottom: 0;
    }
    .info-label {
      color: #64748B;
    }
    .info-val {
      font-weight: 600;
      color: #0F172A;
      text-align: right;
    }

    /* Hero Amount Box */
    .amount-box {
      background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
      border: 1.5px solid #10B981;
      border-radius: 14px;
      padding: 24px;
      text-align: center;
      margin-bottom: 24px;
    }
    .amount-label {
      font-size: 11px;
      font-weight: 700;
      color: #047857;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .amount-val {
      font-size: 34px;
      font-weight: 800;
      color: #065F46;
      margin: 6px 0;
    }
    .amount-words {
      font-size: 12px;
      font-weight: 600;
      color: #047857;
      font-style: italic;
    }

    /* Outstanding Summary Table */
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .ledger-table th {
      background-color: #F1F5F9;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 10px 14px;
      text-align: left;
      border: 1px solid #E2E8F0;
    }
    .ledger-table td {
      padding: 12px 14px;
      border: 1px solid #E2E8F0;
      font-size: 12px;
    }
    .ledger-table tr.highlight {
      background-color: #F8FAFC;
      font-weight: 700;
    }

    /* Verification Stamp & Signatory */
    .footer-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 16px;
      border-top: 1px dashed #CBD5E1;
      margin-top: 16px;
    }
    .stamp-box {
      border: 2px dashed #10B981;
      border-radius: 8px;
      padding: 8px 16px;
      display: inline-block;
      color: #047857;
      text-align: center;
      background-color: #ECFDF5;
    }
    .stamp-title {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .stamp-sub {
      font-size: 9px;
      font-weight: 600;
      margin-top: 2px;
    }
    .signature-box {
      text-align: right;
    }
    .signature-line {
      width: 160px;
      height: 1px;
      background-color: #64748B;
      margin-bottom: 6px;
      margin-left: auto;
    }
    .signatory-title {
      font-size: 11px;
      font-weight: 700;
      color: #0F172A;
    }
    .signatory-sub {
      font-size: 10px;
      color: #64748B;
    }

    /* Disclaimer */
    .disclaimer {
      background-color: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      padding: 16px 32px;
      text-align: center;
      font-size: 10px;
      color: #94A3B8;
    }
  </style>
</head>
<body>
  <div class="receipt-box">
    <!-- Header -->
    <div class="header">
      <div>
        <h1 class="brand-title">CHIT<span>FLOW</span> ENTERPRISES</h1>
        <div class="brand-subtitle">Automated Chit Fund Management & Digital Collections</div>
        <div class="brand-reg">Govt Reg No: CHIT/TN/2024/09812 · GSTIN: 33AAAFC1234F1Z5</div>
      </div>
      <div>
        <div class="receipt-badge">Official Receipt</div>
      </div>
    </div>

    <!-- Meta Details Bar -->
    <div class="meta-bar">
      <div class="meta-item">
        <span class="meta-label">Receipt Number</span>
        <span class="meta-value mono">${receipt.receiptNumber}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Payment Date</span>
        <span class="meta-value">${formattedDate}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Payment Method</span>
        <span class="meta-value">${receipt.method}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Reference ID</span>
        <span class="meta-value mono">${receipt.referenceId}</span>
      </div>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- 2-Column Info -->
      <div class="grid-2">
        <!-- Customer Details -->
        <div class="info-card">
          <div class="info-card-title">Customer Details</div>
          <div class="info-row">
            <span class="info-label">Customer Name</span>
            <span class="info-val">${receipt.customerName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Customer ID</span>
            <span class="info-val">${receipt.customerId}</span>
          </div>
          ${
            customer?.phone
              ? `
          <div class="info-row">
            <span class="info-label">Contact Phone</span>
            <span class="info-val">+91 ${customer.phone}</span>
          </div>
          `
              : ''
          }
          <div class="info-row">
            <span class="info-label">Verification</span>
            <span class="info-val" style="color: #10B981;">✓ Verified Member</span>
          </div>
        </div>

        <!-- Scheme Details -->
        <div class="info-card">
          <div class="info-card-title">Chit Scheme Terms</div>
          <div class="info-row">
            <span class="info-label">Scheme Name</span>
            <span class="info-val">${receipt.schemeName}</span>
          </div>
          ${
            scheme
              ? `
          <div class="info-row">
            <span class="info-label">Total Scheme Value</span>
            <span class="info-val">₹${scheme.totalAmount.toLocaleString('en-IN')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Installment Terms</span>
            <span class="info-val">₹${scheme.collectionAmount.toLocaleString('en-IN')} (${formatFrequency(scheme.frequency)})</span>
          </div>
          `
              : customer
              ? `
          <div class="info-row">
            <span class="info-label">Total Scheme Value</span>
            <span class="info-val">₹${customer.amountGiven.toLocaleString('en-IN')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Installment Terms</span>
            <span class="info-val">₹${customer.collectionAmount.toLocaleString('en-IN')} (${formatFrequency(customer.frequency)})</span>
          </div>
          `
              : ''
          }
          <div class="info-row">
            <span class="info-label">Payment Status</span>
            <span class="info-val" style="color: #059669;">Credited & Verified</span>
          </div>
        </div>
      </div>

      <!-- Hero Payment Amount Box -->
      <div class="amount-box">
        <div class="amount-label">Payment Received Successfully</div>
        <div class="amount-val">₹${amountFormatted}</div>
        <div class="amount-words">${amountWords}</div>
      </div>

      <!-- Financial Balance Breakdown -->
      <table class="ledger-table">
        <thead>
          <tr>
            <th>Transaction Description</th>
            <th style="text-align: right;">Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Chit Scheme Installment Collection (${receipt.schemeName})</td>
            <td style="text-align: right; font-weight: 700; color: #047857;">+ ₹${amountFormatted}</td>
          </tr>
          <tr>
            <td>Payment Transaction Channel</td>
            <td style="text-align: right; font-weight: 600;">${receipt.method}</td>
          </tr>
          <tr class="highlight">
            <td>Remaining Account Balance</td>
            <td style="text-align: right; font-weight: 800; color: #DC2626;">₹${remainingFormatted}</td>
          </tr>
        </tbody>
      </table>

      <!-- Verification Stamp and Signatory -->
      <div class="footer-section">
        <div class="stamp-box">
          <div class="stamp-title">✓ PAYMENT VERIFIED</div>
          <div class="stamp-sub">CHITFLOW SECURE TRANSACTION</div>
        </div>

        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signatory-title">Authorized Signatory</div>
          <div class="signatory-sub">ChitFlow Financial Enterprises</div>
        </div>
      </div>
    </div>

    <!-- Disclaimer Footer -->
    <div class="disclaimer">
      This is a system-generated electronic receipt issued via ChitFlow. No physical signature is required.
      <br>For any support inquiries, email us at support@chitflow.com or contact administrator.
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Generates an official consolidated statement / all-receipts report HTML
 */
export const generateConsolidatedReceiptsHtml = (
  receipts: Receipt[],
  customer?: Customer,
  scheme?: Scheme
): string => {
  const totalAmountPaid = receipts.reduce((sum, r) => sum + r.amount, 0);
  const latestRemaining = receipts.length > 0 ? receipts[0].remainingBalance : 0;
  const custName = customer?.name || (receipts.length > 0 ? receipts[0].customerName : 'Customer');
  const schemeName = scheme?.name || (receipts.length > 0 ? receipts[0].schemeName : 'Chit Scheme');

  const rowsHtml = receipts
    .map(
      (r, idx) => `
    <tr>
      <td style="text-align: center; color: #64748B;">${receipts.length - idx}</td>
      <td style="font-family: monospace; font-weight: 600; color: #0284C7;">${r.receiptNumber}</td>
      <td>${formatDateShort(r.date)}</td>
      <td>${r.method}</td>
      <td style="font-family: monospace; font-size: 11px; color: #64748B;">${r.referenceId}</td>
      <td style="text-align: right; font-weight: 700; color: #047857;">₹${r.amount.toLocaleString('en-IN')}</td>
      <td style="text-align: right; font-weight: 600; color: #64748B;">₹${r.remainingBalance.toLocaleString('en-IN')}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payment Receipts Statement - ${custName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 16px;
      color: #0F172A;
      background-color: #FFFFFF;
      font-size: 12px;
      line-height: 1.4;
    }
    .statement-box {
      max-width: 800px;
      margin: 0 auto;
      border: 1.5px solid #CBD5E1;
      border-radius: 12px;
      padding: 24px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #10B981;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 20px;
      font-weight: 800;
      color: #0F172A;
      margin: 0;
    }
    .title span {
      color: #10B981;
    }
    .subtitle {
      font-size: 11px;
      color: #64748B;
      margin-top: 2px;
    }
    .statement-title {
      text-align: right;
      font-size: 14px;
      font-weight: 700;
      color: #1E293B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .statement-date {
      font-size: 11px;
      color: #64748B;
    }
    /* Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .summary-card {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .summary-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .summary-val {
      font-size: 16px;
      font-weight: 800;
      color: #0F172A;
      margin-top: 4px;
    }
    .summary-val.green {
      color: #047857;
    }
    .summary-val.red {
      color: #DC2626;
    }
    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background-color: #0F172A;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 8px 10px;
      text-align: left;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #E2E8F0;
      font-size: 11px;
    }
    tr:nth-child(even) {
      background-color: #F8FAFC;
    }
    .total-row td {
      background-color: #ECFDF5;
      font-weight: 800;
      font-size: 12px;
      border-top: 2px solid #10B981;
      border-bottom: 2px solid #10B981;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #E2E8F0;
      font-size: 10px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="statement-box">
    <div class="header">
      <div>
        <h1 class="title">CHIT<span>FLOW</span> ENTERPRISES</h1>
        <div class="subtitle">Official Payment Receipts Statement</div>
      </div>
      <div>
        <div class="statement-title">Receipts Ledger</div>
        <div class="statement-date">Generated: ${formatDateShort(new Date().toISOString())}</div>
      </div>
    </div>

    <!-- Summary Grid -->
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Member Name</div>
        <div class="summary-val">${custName}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Chit Scheme</div>
        <div class="summary-val" style="font-size: 13px;">${schemeName}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Paid (${receipts.length})</div>
        <div class="summary-val green">₹${totalAmountPaid.toLocaleString('en-IN')}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Remaining Dues</div>
        <div class="summary-val red">₹${latestRemaining.toLocaleString('en-IN')}</div>
      </div>
    </div>

    <!-- Receipts Table -->
    <table>
      <thead>
        <tr>
          <th style="text-align: center;">#</th>
          <th>Receipt No.</th>
          <th>Date</th>
          <th>Method</th>
          <th>Reference ID</th>
          <th style="text-align: right;">Amount</th>
          <th style="text-align: right;">Balance</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr class="total-row">
          <td colspan="5" style="text-align: right;">TOTAL COLLECTED AMOUNT:</td>
          <td style="text-align: right; color: #047857;">₹${totalAmountPaid.toLocaleString('en-IN')}</td>
          <td style="text-align: right; color: #DC2626;">₹${latestRemaining.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div>ChitFlow Enterprise Automated Ledger · Computer-generated summary statement</div>
      <div>Authorized Signatory · ChitFlow Financial</div>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Downloads a single receipt across platforms (iOS, Android, Web)
 */
export const downloadReceiptPdf = async (
  receipt: Receipt,
  customer?: Customer,
  scheme?: Scheme
): Promise<{ success: boolean; error?: string }> => {
  try {
    const html = generateReceiptHtml(receipt, customer, scheme);

    if (Platform.OS === 'web') {
      // Trigger native print/save-as-pdf in web browser
      await Print.printAsync({ html });

      // In addition, trigger an instant download file for maximum convenience
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Receipt-${receipt.receiptNumber}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      return { success: true };
    }

    // On Native (Android / iOS):
    // Generate real PDF file in cache
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Check if sharing is available to save to files / downloads / whatsapp / airDrop
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Download Receipt ${receipt.receiptNumber}`,
      });
      return { success: true };
    } else {
      Alert.alert(
        'Receipt Generated',
        `PDF receipt generated at: ${uri}\nSharing is not available on this device.`
      );
      return { success: true };
    }
  } catch (error: any) {
    console.error('Error generating receipt PDF:', error);
    Alert.alert('Download Error', error?.message || 'Failed to download receipt');
    return { success: false, error: error?.message };
  }
};

/**
 * Downloads all receipts as a consolidated PDF statement
 */
export const downloadAllReceiptsPdf = async (
  receipts: Receipt[],
  customer?: Customer,
  scheme?: Scheme
): Promise<{ success: boolean; error?: string }> => {
  if (!receipts || receipts.length === 0) {
    Alert.alert('No Receipts', 'There are no payment receipts available to download.');
    return { success: false, error: 'No receipts' };
  }

  try {
    const html = generateConsolidatedReceiptsHtml(receipts, customer, scheme);
    const custName = customer?.name || receipts[0]?.customerName || 'Customer';
    const cleanName = custName.replace(/[^a-zA-Z0-9]/g, '_');

    if (Platform.OS === 'web') {
      await Print.printAsync({ html });

      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Statement-Receipts-${cleanName}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      return { success: true };
    }

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Download Statement - ${custName}`,
      });
      return { success: true };
    } else {
      Alert.alert('Statement Generated', `PDF statement created at: ${uri}`);
      return { success: true };
    }
  } catch (error: any) {
    console.error('Error generating consolidated receipts statement:', error);
    Alert.alert('Export Error', error?.message || 'Failed to export statement');
    return { success: false, error: error?.message };
  }
};
