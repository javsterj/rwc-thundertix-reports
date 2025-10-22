# RWC Thundertix Reports App

A professional daily sales report generator for Rossmoor Walnut Creek Recreation Department's Thundertix data.

## Features

- 📤 Easy CSV file upload
- 📊 Automatic data grouping by genre (Classes, Excursions, Special Events, etc.)
- 👁️ Beautiful preview of formatted data
- 🎨 Highlighted refunds (red) and zero-amount transactions (gray)
- 📄 Professional PDF export with date range
- 💼 Ready for accounting department use

## Installation

1. Make sure you have Node.js installed (version 16 or higher)
2. Open a terminal in this directory
3. Run the following commands:

```bash
npm install
```

## Running the App

To start the development server:

```bash
npm run dev
```

This will open the app at `http://localhost:5173` (or another port if 5173 is in use).

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` folder, which can be deployed to any web server.

## How to Use

1. **Upload CSV**: Click the upload area and select your Thundertix CSV export file
2. **Preview**: Review the formatted data organized by genre
3. **Download PDF**: Click the "Download PDF Report" button to generate and save the PDF

## CSV Format

The app expects CSV files with these columns:
- Sum of Total Paid/Refunded (or Genres) - The category/genre name
- Date - Transaction date and time
- Payment Details - Last 4 digits of card
- Card Type - Type of credit card used
- Payment Type / card - Transaction amount

## PDF Output Features

- **Header**: Rossmoor Walnut Creek Recreation Department branding
- **Date Range**: Automatically detected from transaction dates
- **Genre Sections**: Each category displayed separately with colored headers
- **Transaction Details**: Full transaction list with all relevant information
- **Subtotals**: Each genre shows its total
- **Grand Total**: Overall daily sales total
- **Visual Highlights**: 
  - Refunds shown in red
  - $0.00 transactions shown in gray/italic

## Support

For issues or questions, contact the IT department.
