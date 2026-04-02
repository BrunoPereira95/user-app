## Comprehensive Project Structure Overview
 
### 1. PROJECT OVERVIEW
 
**ContaFacil** - A complete Portuguese accounting platform for freelancers and self-employed professionals.
 
### 2. FEATURES IMPLEMENTED
 
#### Professional Accounting
- **Invoice Management**: Create, edit, delete invoices with automatic IVA/retention/SS calculations
- **Client Management**: Full CRUD for client/entity management
- **Expense Tracking**: Track expenses for IVA deduction with document upload
- **Dashboard**: Professional dashboard with period filtering (monthly/quarterly/annual)
- **Document Storage**: Upload PDF/images for invoices and expenses
 
#### Personal Finance
- **Transaction Tracking**: Track income, expenses, and investments
- **Categories**: Transport, food, salary, crypto, rent, utilities, health, entertainment, education
- **Balance Calculation**: Automatic balance with visual indicators
 
#### Portuguese Tax Compliance
- **IVA Rates**: 0%, 6%, 13%, 23%
- **Retention Rates**: 0%, 16.5%, 25%
- **Social Security**: 21.4% with exemption support
- **Quarterly IVA tracking and alerts**
 
### 3. PROJECT STRUCTURE
 
```
/user-app/
├── src/
│   ├── client/
│   │   ├── components/
│   │   │   ├── ui/          # Shadcn-style components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Label.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── Textarea.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Tabs.tsx
│   │   │   │   └── Dialog.tsx
│   │   │   ├── AppLayout.tsx    # Main app layout with sidebar
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── Page.tsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx      # Main dashboard (prof + personal)
│   │   │   ├── InvoicesPage.tsx       # Invoice list
│   │   │   ├── NewInvoicePage.tsx     # Create invoice
│   │   │   ├── EditInvoicePage.tsx    # Edit invoice
│   │   │   ├── ExpensesPage.tsx       # IVA expenses
│   │   │   ├── ClientsPage.tsx        # Client management
│   │   │   ├── PersonalPage.tsx       # Personal transactions
│   │   │   ├── SettingsPage.tsx       # User settings
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   └── ...
│   │   ├── router.tsx         # React Router config
│   │   └── index.tsx
│   │
│   └── server/
│       ├── accounting/
│       │   ├── index.ts       # Module with queries/mutations
│       │   └── db.ts          # Database schemas (Stores)
│       ├── example/           # Example module (can be removed)
│       └── app.ts             # Server entry point
```
 
### 4. DATABASE COLLECTIONS (Stores)
 
- **clients**: Client/entity information
- **invoices**: Professional invoices with IVA/retention/SS calculations
- **expenses**: Expenses for IVA deduction
- **personalTransactions**: Personal income/expenses/investments
- **userSettings**: User configuration (SS exemption, default rates)
 
### 5. KEY FEATURES
 
#### Invoice Simulation
When creating invoices, the system calculates:
- IVA value
- Retention value
- SS value (if applicable)
- Net amount to receive
- Total reserved for taxes
 
#### Document Upload
- Supports PDF and images
- Private storage with signed URLs
- Attached to invoices and expenses
 
### 6. AUTHENTICATION
 
All routes except login/signup are protected.
Users must be authenticated to access the accounting features.
 
### 7. NOTES
 
- Portuguese tax rates are hardcoded (IVA: 0/6/13/23%, Retention: 0/16.5/25%, SS: 21.4%)
- Social Security exemption can be configured in settings
- IVA is tracked quarterly with alerts