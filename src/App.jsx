import { useState } from 'react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './App.css';

function App() {
  const [csvData, setCsvData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        processData(results.data);
      },
      error: (error) => {
        alert('Error parsing CSV: ' + error.message);
      }
    });
  };

  const processData = (data) => {
    // Group by genre
    const grouped = {};
    let earliestDate = null;
    let latestDate = null;

    data.forEach(row => {
      const genre = row['Sum of Total Paid/Refunded'] || row['Genres'] || 'Uncategorized';
      const dateStr = row['Date'];
      
      // Track date range
      if (dateStr && dateStr.trim()) {
        const date = new Date(dateStr);
        if (!isNaN(date)) {
          if (!earliestDate || date < earliestDate) earliestDate = date;
          if (!latestDate || date > latestDate) latestDate = date;
        }
      }

      // Skip empty genre rows or total rows
      if (!genre || genre.includes('Total') || genre.includes('Grand Total')) return;

      if (!grouped[genre]) {
        grouped[genre] = {
          transactions: [],
          total: 0
        };
      }

      // Only add if row has a date (actual transaction)
      if (dateStr && dateStr.trim()) {
        const amount = parseFloat(row['Payment Type'] || row['card'] || '0');
        grouped[genre].transactions.push({
          id: row['Classes'] || '',
          date: dateStr,
          paymentDetails: row['Payment Details'] || '',
          cardType: row['Card Type'] || '',
          amount: amount
        });
        grouped[genre].total += amount;
      }
    });

    // Calculate grand total
    let grandTotal = 0;
    Object.values(grouped).forEach(genre => {
      grandTotal += genre.total;
    });

    setProcessedData({
      genres: grouped,
      grandTotal: grandTotal,
      dateRange: {
        start: earliestDate,
        end: latestDate
      }
    });
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const generatePDF = () => {
    if (!processedData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Rossmoor Walnut Creek Recreation Department', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Daily Sales Report', pageWidth / 2, 23, { align: 'center' });
    
    // Date range
    doc.setFontSize(10);
    if (processedData.dateRange.start && processedData.dateRange.end) {
      const startDate = processedData.dateRange.start.toLocaleDateString('en-US');
      const endDate = processedData.dateRange.end.toLocaleDateString('en-US');
      const dateRangeText = startDate === endDate ? startDate : `${startDate} - ${endDate}`;
      doc.text(`Report Date: ${dateRangeText}`, pageWidth / 2, 30, { align: 'center' });
    }

    let yPosition = 40;

    // Process each genre
    Object.entries(processedData.genres).forEach(([genre, data], index) => {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Genre header
      doc.setFillColor(67, 97, 238);
      doc.rect(14, yPosition - 5, pageWidth - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(genre, 16, yPosition, { baseline: 'top' });
      
      yPosition += 10;

      // Transactions table
      const tableData = data.transactions.map(t => [
        t.id,
        formatDate(t.date),
        t.paymentDetails,
        t.cardType,
        formatCurrency(t.amount)
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['Transaction ID', 'Date', 'Payment Details', 'Card Type', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [100, 116, 139],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [0, 0, 0]
        },
        columnStyles: {
          4: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: function(data) {
          // Highlight refunds (negative amounts)
          if (data.section === 'body' && data.column.index === 4) {
            const value = data.row.raw[4];
            if (value.includes('-')) {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            }
          }
          // Highlight $0.00 transactions
          if (data.section === 'body' && data.column.index === 4) {
            const value = data.row.raw[4];
            if (value === '$0.00') {
              data.cell.styles.textColor = [107, 114, 128];
              data.cell.styles.fontStyle = 'italic';
            }
          }
        },
        margin: { left: 14, right: 14 },
      });

      yPosition = doc.lastAutoTable.finalY + 5;

      // Genre subtotal
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const subtotalText = `${genre} Total: ${formatCurrency(data.total)}`;
      doc.text(subtotalText, pageWidth - 16, yPosition, { align: 'right' });
      
      yPosition += 12;
    });

    // Grand Total
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFillColor(0, 0, 0);
    doc.rect(14, yPosition - 3, pageWidth - 28, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Grand Total: ${formatCurrency(processedData.grandTotal)}`, pageWidth / 2, yPosition + 2, { align: 'center' });

    // Save PDF
    const dateStr = processedData.dateRange.start ? 
      processedData.dateRange.start.toISOString().split('T')[0] : 
      'report';
    doc.save(`RWC-Sales-Report-${dateStr}.pdf`);
  };

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <h1>Rossmoor Walnut Creek</h1>
          <h2>Thundertix Sales Report Generator</h2>
        </div>

        <div className="upload-section">
          <label htmlFor="csv-upload" className="upload-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>Click to upload CSV file</span>
            {fileName && <span className="file-name">{fileName}</span>}
          </label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="file-input"
          />
        </div>

        {processedData && (
          <>
            <div className="preview-section">
              <div className="preview-header">
                <h3>Report Preview</h3>
                {processedData.dateRange.start && (
                  <span className="date-range">
                    {processedData.dateRange.start.toLocaleDateString('en-US')}
                    {processedData.dateRange.start.toLocaleDateString() !== processedData.dateRange.end.toLocaleDateString() &&
                      ` - ${processedData.dateRange.end.toLocaleDateString('en-US')}`
                    }
                  </span>
                )}
              </div>

              {Object.entries(processedData.genres).map(([genre, data]) => (
                <div key={genre} className="genre-section">
                  <h4 className="genre-title">{genre}</h4>
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Transaction ID</th>
                          <th>Date</th>
                          <th>Payment Details</th>
                          <th>Card Type</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.transactions.map((transaction, idx) => (
                          <tr key={idx} className={transaction.amount < 0 ? 'refund' : transaction.amount === 0 ? 'zero-amount' : ''}>
                            <td>{transaction.id}</td>
                            <td>{formatDate(transaction.date)}</td>
                            <td>{transaction.paymentDetails}</td>
                            <td>{transaction.cardType}</td>
                            <td className="amount">{formatCurrency(transaction.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="subtotal">
                    <strong>{genre} Total:</strong> {formatCurrency(data.total)}
                  </div>
                </div>
              ))}

              <div className="grand-total">
                <strong>Grand Total:</strong> {formatCurrency(processedData.grandTotal)}
              </div>
            </div>

            <button onClick={generatePDF} className="download-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download PDF Report
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
