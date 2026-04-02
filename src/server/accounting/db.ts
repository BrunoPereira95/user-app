import { Store, schema } from 'modelence/server';

// Clientes/Entidades
export const dbClients = new Store('clients', {
  schema: {
    name: schema.string(),
    nif: schema.string().optional(),
    email: schema.string().optional(),
    phone: schema.string().optional(),
    address: schema.string().optional(),
    notes: schema.string().optional(),
    userId: schema.userId(),
    createdAt: schema.date(),
    updatedAt: schema.date(),
  },
  indexes: [
    { key: { userId: 1 } },
    { key: { userId: 1, name: 1 } },
  ]
});

// Faturas emitidas (profissional)
export const dbInvoices = new Store('invoices', {
  schema: {
    // Referência ao cliente
    clientId: schema.objectId(),
    clientName: schema.string(), // Cached for display

    // Detalhes da fatura
    invoiceNumber: schema.string().optional(),
    description: schema.string(),

    // Valores
    baseValue: schema.number(), // Valor base
    ivaRate: schema.number(), // Taxa IVA (ex: 23, 6, 13, 0)
    ivaValue: schema.number(), // Valor do IVA calculado
    retentionRate: schema.number(), // Taxa retenção na fonte (ex: 25, 16.5, 0)
    retentionValue: schema.number(), // Valor retenção calculado
    ssRate: schema.number(), // Taxa SS (0 se isento, 21.4 se aplicável)
    ssValue: schema.number(), // Valor SS calculado
    totalValue: schema.number(), // Valor total com IVA
    netValue: schema.number(), // Valor líquido a receber

    // Estado
    status: schema.string(), // 'pending', 'paid', 'overdue', 'cancelled'

    // Datas
    issueDate: schema.date(),
    dueDate: schema.date().optional(),
    paidDate: schema.date().optional(),

    // Documento anexo (PDF/imagem da fatura-recibo)
    documentPath: schema.string().optional(),
    documentType: schema.string().optional(), // 'pdf', 'image'

    // Metadata
    userId: schema.userId(),
    createdAt: schema.date(),
    updatedAt: schema.date(),
  },
  indexes: [
    { key: { userId: 1 } },
    { key: { userId: 1, status: 1 } },
    { key: { userId: 1, issueDate: -1 } },
    { key: { userId: 1, clientId: 1 } },
  ]
});

// Despesas para dedução de IVA
export const dbExpenses = new Store('expenses', {
  schema: {
    // Detalhes
    description: schema.string(),
    category: schema.string(), // 'transport', 'food', 'office', 'equipment', 'services', 'other'

    // Valores
    totalValue: schema.number(), // Valor total pago
    ivaRate: schema.number(), // Taxa IVA da despesa
    ivaValue: schema.number(), // Valor IVA dedutível
    netValue: schema.number(), // Valor sem IVA

    // Fornecedor
    supplierName: schema.string().optional(),
    supplierNif: schema.string().optional(),

    // Datas
    expenseDate: schema.date(),

    // Documento anexo (fatura da despesa)
    documentPath: schema.string().optional(),
    documentType: schema.string().optional(),

    // Metadata
    userId: schema.userId(),
    createdAt: schema.date(),
    updatedAt: schema.date(),
  },
  indexes: [
    { key: { userId: 1 } },
    { key: { userId: 1, expenseDate: -1 } },
    { key: { userId: 1, category: 1 } },
  ]
});

// Transações pessoais (gastos, rendimentos, investimentos)
export const dbPersonalTransactions = new Store('personalTransactions', {
  schema: {
    description: schema.string(),
    type: schema.string(), // 'expense', 'income', 'investment'
    category: schema.string(), // 'transport', 'food', 'salary', 'crypto', 'rent', etc.
    value: schema.number(), // Positivo para receita, negativo para despesa/investimento
    transactionDate: schema.date(),

    // Metadata
    userId: schema.userId(),
    createdAt: schema.date(),
  },
  indexes: [
    { key: { userId: 1 } },
    { key: { userId: 1, transactionDate: -1 } },
    { key: { userId: 1, type: 1 } },
    { key: { userId: 1, category: 1 } },
  ]
});

// Configurações do utilizador (isenções, datas importantes)
export const dbUserSettings = new Store('userSettings', {
  schema: {
    userId: schema.userId(),

    // Segurança Social
    ssExempt: schema.boolean(), // Isento de SS?
    ssExemptionEndDate: schema.date().optional(), // Data fim isenção

    // Configurações IVA
    ivaQuarterly: schema.boolean(), // IVA trimestral?

    // Taxas padrão
    defaultIvaRate: schema.number(),
    defaultRetentionRate: schema.number(),

    updatedAt: schema.date(),
  },
  indexes: [
    { key: { userId: 1 }, unique: true }
  ]
});