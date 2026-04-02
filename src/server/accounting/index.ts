import z from 'zod';
import { AuthError } from 'modelence';
import { Module, ObjectId, UserInfo, getFileUrl } from 'modelence/server';
import { dbClients, dbInvoices, dbExpenses, dbPersonalTransactions, dbUserSettings } from './db';

// Taxas portuguesas
const SS_RATE = 21.4; // Taxa SS trabalhador independente

// Categorias
const EXPENSE_CATEGORIES = ['transport', 'food', 'office', 'equipment', 'services', 'other'] as const;
const PERSONAL_CATEGORIES = ['transport', 'food', 'salary', 'crypto', 'rent', 'utilities', 'health', 'entertainment', 'education', 'other'] as const;
const PERSONAL_TYPES = ['expense', 'income', 'investment'] as const;

export default new Module('accounting', {
  stores: [dbClients, dbInvoices, dbExpenses, dbPersonalTransactions, dbUserSettings],

  queries: {
    // ==================== CLIENTES ====================
    getClients: async (_args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const clients = await dbClients.fetch({ userId: new ObjectId(user.id) }, { sort: { name: 1 } });
      return clients.map(c => ({
        _id: c._id.toString(),
        name: c.name,
        nif: c.nif,
        email: c.email,
        phone: c.phone,
        address: c.address,
        notes: c.notes,
      }));
    },

    getClient: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const { clientId } = z.object({ clientId: z.string() }).parse(args);
      const client = await dbClients.requireOne({ _id: new ObjectId(clientId), userId: new ObjectId(user.id) });

      return {
        _id: client._id.toString(),
        name: client.name,
        nif: client.nif,
        email: client.email,
        phone: client.phone,
        address: client.address,
        notes: client.notes,
      };
    },

    // ==================== FATURAS ====================
    getInvoices: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const { status, clientId, startDate, endDate } = z.object({
        status: z.string().optional(),
        clientId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).parse(args);

      const query: Record<string, unknown> = { userId: new ObjectId(user.id) };
      if (status) query.status = status;
      if (clientId) query.clientId = new ObjectId(clientId);
      if (startDate || endDate) {
        query.issueDate = {};
        if (startDate) (query.issueDate as Record<string, Date>).$gte = new Date(startDate);
        if (endDate) (query.issueDate as Record<string, Date>).$lte = new Date(endDate);
      }

      const invoices = await dbInvoices.fetch(query, { sort: { issueDate: -1 }, limit: 100 });

      return Promise.all(invoices.map(async inv => {
        let documentUrl: string | undefined;
        if (inv.documentPath) {
          const result = await getFileUrl(inv.documentPath);
          documentUrl = result.url;
        }

        return {
          _id: inv._id.toString(),
          clientId: inv.clientId.toString(),
          clientName: inv.clientName,
          invoiceNumber: inv.invoiceNumber,
          description: inv.description,
          baseValue: inv.baseValue,
          ivaRate: inv.ivaRate,
          ivaValue: inv.ivaValue,
          retentionRate: inv.retentionRate,
          retentionValue: inv.retentionValue,
          ssRate: inv.ssRate,
          ssValue: inv.ssValue,
          totalValue: inv.totalValue,
          netValue: inv.netValue,
          status: inv.status,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          paidDate: inv.paidDate,
          documentPath: inv.documentPath,
          documentUrl,
        };
      }));
    },

    getInvoice: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const { invoiceId } = z.object({ invoiceId: z.string() }).parse(args);
      const inv = await dbInvoices.requireOne({ _id: new ObjectId(invoiceId), userId: new ObjectId(user.id) });

      let documentUrl: string | undefined;
      if (inv.documentPath) {
        const result = await getFileUrl(inv.documentPath);
        documentUrl = result.url;
      }

      return {
        _id: inv._id.toString(),
        clientId: inv.clientId.toString(),
        clientName: inv.clientName,
        invoiceNumber: inv.invoiceNumber,
        description: inv.description,
        baseValue: inv.baseValue,
        ivaRate: inv.ivaRate,
        ivaValue: inv.ivaValue,
        retentionRate: inv.retentionRate,
        retentionValue: inv.retentionValue,
        ssRate: inv.ssRate,
        ssValue: inv.ssValue,
        totalValue: inv.totalValue,
        netValue: inv.netValue,
        status: inv.status,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        paidDate: inv.paidDate,
        documentPath: inv.documentPath,
        documentUrl,
      };
    },

    // ==================== DESPESAS IVA ====================
    getExpenses: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const { category, startDate, endDate } = z.object({
        category: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).parse(args);

      const query: Record<string, unknown> = { userId: new ObjectId(user.id) };
      if (category) query.category = category;
      if (startDate || endDate) {
        query.expenseDate = {};
        if (startDate) (query.expenseDate as Record<string, Date>).$gte = new Date(startDate);
        if (endDate) (query.expenseDate as Record<string, Date>).$lte = new Date(endDate);
      }

      const expenses = await dbExpenses.fetch(query, { sort: { expenseDate: -1 }, limit: 100 });

      return Promise.all(expenses.map(async exp => {
        let documentUrl: string | undefined;
        if (exp.documentPath) {
          const result = await getFileUrl(exp.documentPath);
          documentUrl = result.url;
        }

        return {
          _id: exp._id.toString(),
          description: exp.description,
          category: exp.category,
          totalValue: exp.totalValue,
          ivaRate: exp.ivaRate,
          ivaValue: exp.ivaValue,
          netValue: exp.netValue,
          supplierName: exp.supplierName,
          supplierNif: exp.supplierNif,
          expenseDate: exp.expenseDate,
          documentPath: exp.documentPath,
          documentUrl,
        };
      }));
    },

    // ==================== TRANSAÇÕES PESSOAIS ====================
    getPersonalTransactions: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const { type, category, startDate, endDate, limit: queryLimit } = z.object({
        type: z.string().optional(),
        category: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().optional(),
      }).parse(args);

      const query: Record<string, unknown> = { userId: new ObjectId(user.id) };
      if (type) query.type = type;
      if (category) query.category = category;
      if (startDate || endDate) {
        query.transactionDate = {};
        if (startDate) (query.transactionDate as Record<string, Date>).$gte = new Date(startDate);
        if (endDate) (query.transactionDate as Record<string, Date>).$lte = new Date(endDate);
      }

      const transactions = await dbPersonalTransactions.fetch(query, {
        sort: { transactionDate: -1 },
        limit: queryLimit || 20
      });

      return transactions.map(t => ({
        _id: t._id.toString(),
        description: t.description,
        type: t.type,
        category: t.category,
        value: t.value,
        transactionDate: t.transactionDate,
      }));
    },

    // ==================== DASHBOARD PROFISSIONAL ====================
    getProfessionalDashboard: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const { period, year, month, quarter } = z.object({
        period: z.enum(['monthly', 'quarterly', 'annual']),
        year: z.number(),
        month: z.number().optional(),
        quarter: z.number().optional(),
      }).parse(args);

      // Calcular datas do período
      let startDate: Date;
      let endDate: Date;

      if (period === 'monthly' && month !== undefined) {
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59);
      } else if (period === 'quarterly' && quarter !== undefined) {
        const startMonth = (quarter - 1) * 3;
        startDate = new Date(year, startMonth, 1);
        endDate = new Date(year, startMonth + 3, 0, 23, 59, 59);
      } else {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
      }

      // Buscar faturas do período
      const invoices = await dbInvoices.fetch({
        userId: new ObjectId(user.id),
        issueDate: { $gte: startDate, $lte: endDate }
      });

      // Buscar despesas do período (para IVA dedutível)
      const expenses = await dbExpenses.fetch({
        userId: new ObjectId(user.id),
        expenseDate: { $gte: startDate, $lte: endDate }
      });

      // Calcular totais
      const totalBilled = invoices.reduce((sum, inv) => sum + inv.baseValue, 0);
      const totalIva = invoices.reduce((sum, inv) => sum + inv.ivaValue, 0);
      const totalRetention = invoices.reduce((sum, inv) => sum + inv.retentionValue, 0);
      const totalSs = invoices.reduce((sum, inv) => sum + inv.ssValue, 0);
      const totalNet = invoices.reduce((sum, inv) => sum + inv.netValue, 0);

      // IVA dedutível das despesas
      const deductibleIva = expenses.reduce((sum, exp) => sum + exp.ivaValue, 0);
      const ivaBalance = totalIva - deductibleIva;

      // Buscar configurações do utilizador
      const settings = await dbUserSettings.findOne({ userId: new ObjectId(user.id) });

      // Últimas faturas
      const recentInvoices = await dbInvoices.fetch(
        { userId: new ObjectId(user.id) },
        { sort: { issueDate: -1 }, limit: 5 }
      );

      // Calcular IVA trimestral acumulado (Q atual)
      const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
      const quarterStartMonth = (currentQuarter - 1) * 3;
      const quarterStart = new Date(new Date().getFullYear(), quarterStartMonth, 1);
      const quarterEnd = new Date(new Date().getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59);

      const quarterInvoices = await dbInvoices.fetch({
        userId: new ObjectId(user.id),
        issueDate: { $gte: quarterStart, $lte: quarterEnd }
      });
      const quarterExpenses = await dbExpenses.fetch({
        userId: new ObjectId(user.id),
        expenseDate: { $gte: quarterStart, $lte: quarterEnd }
      });

      const quarterIva = quarterInvoices.reduce((sum, inv) => sum + inv.ivaValue, 0);
      const quarterDeductibleIva = quarterExpenses.reduce((sum, exp) => sum + exp.ivaValue, 0);
      const quarterIvaBalance = quarterIva - quarterDeductibleIva;

      // Estimativa SS futura (baseada na média mensal)
      const monthlyAverage = totalBilled / (period === 'monthly' ? 1 : period === 'quarterly' ? 3 : 12);
      const estimatedSs = settings?.ssExempt ? 0 : monthlyAverage * (SS_RATE / 100);

      return {
        // Totais do período
        totalBilled,
        totalIva,
        totalRetention,
        totalSs,
        totalNet,
        deductibleIva,
        ivaBalance,

        // Alertas
        quarterIvaAccumulated: quarterIvaBalance,
        estimatedSs,
        ssExempt: settings?.ssExempt ?? true,
        ssExemptionEndDate: settings?.ssExemptionEndDate,

        // Últimas faturas
        recentInvoices: recentInvoices.map(inv => ({
          _id: inv._id.toString(),
          clientName: inv.clientName,
          baseValue: inv.baseValue,
          status: inv.status,
          issueDate: inv.issueDate,
        })),

        // Contagem por estado
        pendingCount: invoices.filter(i => i.status === 'pending').length,
        paidCount: invoices.filter(i => i.status === 'paid').length,
        overdueCount: invoices.filter(i => i.status === 'overdue').length,
      };
    },

    // ==================== DASHBOARD PESSOAL ====================
    getPersonalDashboard: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const { period, year, month } = z.object({
        period: z.enum(['monthly', 'annual']),
        year: z.number(),
        month: z.number().optional(),
      }).parse(args);

      let startDate: Date;
      let endDate: Date;

      if (period === 'monthly' && month !== undefined) {
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59);
      } else {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
      }

      const transactions = await dbPersonalTransactions.fetch({
        userId: new ObjectId(user.id),
        transactionDate: { $gte: startDate, $lte: endDate }
      }, { sort: { transactionDate: -1 } });

      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.value), 0);

      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.value, 0);

      const totalInvestments = transactions
        .filter(t => t.type === 'investment')
        .reduce((sum, t) => sum + Math.abs(t.value), 0);

      const balance = totalIncome - totalExpenses - totalInvestments;

      // Últimas 20 transações
      const recentTransactions = transactions.slice(0, 20).map(t => ({
        _id: t._id.toString(),
        description: t.description,
        type: t.type,
        category: t.category,
        value: t.value,
        transactionDate: t.transactionDate,
      }));

      // Gastos por categoria
      const expensesByCategory = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + Math.abs(t.value);
          return acc;
        }, {} as Record<string, number>);

      return {
        totalExpenses,
        totalIncome,
        totalInvestments,
        balance,
        recentTransactions,
        expensesByCategory,
      };
    },

    // ==================== CONFIGURAÇÕES ====================
    getUserSettings: async (_args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const settings = await dbUserSettings.findOne({ userId: new ObjectId(user.id) });

      if (!settings) {
        return {
          ssExempt: true,
          ssExemptionEndDate: null,
          ivaQuarterly: true,
          defaultIvaRate: 23,
          defaultRetentionRate: 25,
        };
      }

      return {
        ssExempt: settings.ssExempt,
        ssExemptionEndDate: settings.ssExemptionEndDate,
        ivaQuarterly: settings.ivaQuarterly,
        defaultIvaRate: settings.defaultIvaRate,
        defaultRetentionRate: settings.defaultRetentionRate,
      };
    },
  },

  mutations: {
    // ==================== CLIENTES ====================
    createClient: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const data = z.object({
        name: z.string().min(1),
        nif: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      }).parse(args);

      const now = new Date();
      const result = await dbClients.insertOne({
        ...data,
        email: data.email || undefined,
        userId: new ObjectId(user.id),
        createdAt: now,
        updatedAt: now,
      });

      return { clientId: result.insertedId.toString() };
    },

    updateClient: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const { clientId, ...data } = z.object({
        clientId: z.string(),
        name: z.string().min(1).optional(),
        nif: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      }).parse(args);

      await dbClients.updateOne(
        { _id: new ObjectId(clientId), userId: new ObjectId(user.id) },
        { $set: { ...data, updatedAt: new Date() } }
      );
    },

    deleteClient: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const { clientId } = z.object({ clientId: z.string() }).parse(args);
      await dbClients.deleteOne({ _id: new ObjectId(clientId), userId: new ObjectId(user.id) });
    },

    // ==================== FATURAS ====================
    createInvoice: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const data = z.object({
        clientId: z.string(),
        invoiceNumber: z.string().optional(),
        description: z.string().min(1),
        baseValue: z.number().positive(),
        ivaRate: z.number(),
        retentionRate: z.number(),
        applySs: z.boolean(),
        issueDate: z.string(),
        dueDate: z.string().optional(),
        documentPath: z.string().optional(),
        documentType: z.string().optional(),
      }).parse(args);

      // Buscar cliente
      const client = await dbClients.requireOne({
        _id: new ObjectId(data.clientId),
        userId: new ObjectId(user.id)
      });

      // Calcular valores
      const ivaValue = data.baseValue * (data.ivaRate / 100);
      const totalValue = data.baseValue + ivaValue;
      const retentionValue = data.baseValue * (data.retentionRate / 100);

      // Verificar se está isento de SS
      const settings = await dbUserSettings.findOne({ userId: new ObjectId(user.id) });
      const ssExempt = settings?.ssExempt ?? true;
      const ssRate = data.applySs && !ssExempt ? SS_RATE : 0;
      const ssValue = data.baseValue * (ssRate / 100);

      const netValue = totalValue - retentionValue - ssValue;

      const now = new Date();
      const result = await dbInvoices.insertOne({
        clientId: new ObjectId(data.clientId),
        clientName: client.name,
        invoiceNumber: data.invoiceNumber,
        description: data.description,
        baseValue: data.baseValue,
        ivaRate: data.ivaRate,
        ivaValue,
        retentionRate: data.retentionRate,
        retentionValue,
        ssRate,
        ssValue,
        totalValue,
        netValue,
        status: 'pending',
        issueDate: new Date(data.issueDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        documentPath: data.documentPath,
        documentType: data.documentType,
        userId: new ObjectId(user.id),
        createdAt: now,
        updatedAt: now,
      });

      return {
        invoiceId: result.insertedId.toString(),
        ivaValue,
        retentionValue,
        ssValue,
        totalValue,
        netValue,
      };
    },

    updateInvoice: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const { invoiceId, ...data } = z.object({
        invoiceId: z.string(),
        clientId: z.string().optional(),
        invoiceNumber: z.string().optional(),
        description: z.string().min(1).optional(),
        baseValue: z.number().positive().optional(),
        ivaRate: z.number().optional(),
        retentionRate: z.number().optional(),
        applySs: z.boolean().optional(),
        status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
        issueDate: z.string().optional(),
        dueDate: z.string().optional(),
        paidDate: z.string().optional(),
        documentPath: z.string().optional(),
        documentType: z.string().optional(),
      }).parse(args);

      const invoice = await dbInvoices.requireOne({
        _id: new ObjectId(invoiceId),
        userId: new ObjectId(user.id)
      });

      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      // Se mudar cliente
      if (data.clientId) {
        const client = await dbClients.requireOne({
          _id: new ObjectId(data.clientId),
          userId: new ObjectId(user.id)
        });
        updateData.clientId = new ObjectId(data.clientId);
        updateData.clientName = client.name;
      }

      // Se mudar valores, recalcular
      if (data.baseValue !== undefined || data.ivaRate !== undefined || data.retentionRate !== undefined || data.applySs !== undefined) {
        const baseValue = data.baseValue ?? invoice.baseValue;
        const ivaRate = data.ivaRate ?? invoice.ivaRate;
        const retentionRate = data.retentionRate ?? invoice.retentionRate;

        const ivaValue = baseValue * (ivaRate / 100);
        const totalValue = baseValue + ivaValue;
        const retentionValue = baseValue * (retentionRate / 100);

        const settings = await dbUserSettings.findOne({ userId: new ObjectId(user.id) });
        const ssExempt = settings?.ssExempt ?? true;
        const ssRate = data.applySs && !ssExempt ? SS_RATE : (data.applySs === false ? 0 : invoice.ssRate);
        const ssValue = baseValue * (ssRate / 100);

        const netValue = totalValue - retentionValue - ssValue;

        Object.assign(updateData, {
          baseValue,
          ivaRate,
          ivaValue,
          retentionRate,
          retentionValue,
          ssRate,
          ssValue,
          totalValue,
          netValue,
        });
      }

      if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
      if (data.description) updateData.description = data.description;
      if (data.status) updateData.status = data.status;
      if (data.issueDate) updateData.issueDate = new Date(data.issueDate);
      if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
      if (data.paidDate) updateData.paidDate = new Date(data.paidDate);
      if (data.documentPath !== undefined) updateData.documentPath = data.documentPath;
      if (data.documentType !== undefined) updateData.documentType = data.documentType;

      await dbInvoices.updateOne(
        { _id: new ObjectId(invoiceId), userId: new ObjectId(user.id) },
        { $set: updateData }
      );
    },

    deleteInvoice: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const { invoiceId } = z.object({ invoiceId: z.string() }).parse(args);
      await dbInvoices.deleteOne({ _id: new ObjectId(invoiceId), userId: new ObjectId(user.id) });
    },

    markInvoicePaid: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const { invoiceId, paidDate } = z.object({
        invoiceId: z.string(),
        paidDate: z.string().optional(),
      }).parse(args);

      await dbInvoices.updateOne(
        { _id: new ObjectId(invoiceId), userId: new ObjectId(user.id) },
        {
          $set: {
            status: 'paid',
            paidDate: paidDate ? new Date(paidDate) : new Date(),
            updatedAt: new Date(),
          }
        }
      );
    },

    // ==================== DESPESAS ====================
    createExpense: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const data = z.object({
        description: z.string().min(1),
        category: z.enum(EXPENSE_CATEGORIES),
        totalValue: z.number().positive(),
        ivaRate: z.number(),
        supplierName: z.string().optional(),
        supplierNif: z.string().optional(),
        expenseDate: z.string(),
        documentPath: z.string().optional(),
        documentType: z.string().optional(),
      }).parse(args);

      // Calcular IVA dedutível
      const netValue = data.totalValue / (1 + data.ivaRate / 100);
      const ivaValue = data.totalValue - netValue;

      const now = new Date();
      const result = await dbExpenses.insertOne({
        description: data.description,
        category: data.category,
        totalValue: data.totalValue,
        ivaRate: data.ivaRate,
        ivaValue,
        netValue,
        supplierName: data.supplierName,
        supplierNif: data.supplierNif,
        expenseDate: new Date(data.expenseDate),
        documentPath: data.documentPath,
        documentType: data.documentType,
        userId: new ObjectId(user.id),
        createdAt: now,
        updatedAt: now,
      });

      return { expenseId: result.insertedId.toString(), ivaValue };
    },

    updateExpense: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const { expenseId, ...data } = z.object({
        expenseId: z.string(),
        description: z.string().min(1).optional(),
        category: z.enum(EXPENSE_CATEGORIES).optional(),
        totalValue: z.number().positive().optional(),
        ivaRate: z.number().optional(),
        supplierName: z.string().optional(),
        supplierNif: z.string().optional(),
        expenseDate: z.string().optional(),
        documentPath: z.string().optional(),
        documentType: z.string().optional(),
      }).parse(args);

      const expense = await dbExpenses.requireOne({
        _id: new ObjectId(expenseId),
        userId: new ObjectId(user.id)
      });

      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (data.totalValue !== undefined || data.ivaRate !== undefined) {
        const totalValue = data.totalValue ?? expense.totalValue;
        const ivaRate = data.ivaRate ?? expense.ivaRate;
        const netValue = totalValue / (1 + ivaRate / 100);
        const ivaValue = totalValue - netValue;

        Object.assign(updateData, { totalValue, ivaRate, ivaValue, netValue });
      }

      if (data.description) updateData.description = data.description;
      if (data.category) updateData.category = data.category;
      if (data.supplierName !== undefined) updateData.supplierName = data.supplierName;
      if (data.supplierNif !== undefined) updateData.supplierNif = data.supplierNif;
      if (data.expenseDate) updateData.expenseDate = new Date(data.expenseDate);
      if (data.documentPath !== undefined) updateData.documentPath = data.documentPath;
      if (data.documentType !== undefined) updateData.documentType = data.documentType;

      await dbExpenses.updateOne(
        { _id: new ObjectId(expenseId), userId: new ObjectId(user.id) },
        { $set: updateData }
      );
    },

    deleteExpense: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const { expenseId } = z.object({ expenseId: z.string() }).parse(args);
      await dbExpenses.deleteOne({ _id: new ObjectId(expenseId), userId: new ObjectId(user.id) });
    },

    // ==================== TRANSAÇÕES PESSOAIS ====================
    createPersonalTransaction: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const data = z.object({
        description: z.string().min(1),
        type: z.enum(PERSONAL_TYPES),
        category: z.enum(PERSONAL_CATEGORIES),
        value: z.number(),
        transactionDate: z.string(),
      }).parse(args);

      // Ajustar valor baseado no tipo
      let adjustedValue = Math.abs(data.value);
      if (data.type === 'expense' || data.type === 'investment') {
        adjustedValue = -adjustedValue;
      }

      const result = await dbPersonalTransactions.insertOne({
        description: data.description,
        type: data.type,
        category: data.category,
        value: adjustedValue,
        transactionDate: new Date(data.transactionDate),
        userId: new ObjectId(user.id),
        createdAt: new Date(),
      });

      return { transactionId: result.insertedId.toString() };
    },

    deletePersonalTransaction: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const { transactionId } = z.object({ transactionId: z.string() }).parse(args);
      await dbPersonalTransactions.deleteOne({
        _id: new ObjectId(transactionId),
        userId: new ObjectId(user.id)
      });
    },

    // ==================== CONFIGURAÇÕES ====================
    updateUserSettings: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');

      const data = z.object({
        ssExempt: z.boolean().optional(),
        ssExemptionEndDate: z.string().optional().nullable(),
        ivaQuarterly: z.boolean().optional(),
        defaultIvaRate: z.number().optional(),
        defaultRetentionRate: z.number().optional(),
      }).parse(args);

      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (data.ssExempt !== undefined) updateData.ssExempt = data.ssExempt;
      if (data.ssExemptionEndDate !== undefined) {
        updateData.ssExemptionEndDate = data.ssExemptionEndDate ? new Date(data.ssExemptionEndDate) : null;
      }
      if (data.ivaQuarterly !== undefined) updateData.ivaQuarterly = data.ivaQuarterly;
      if (data.defaultIvaRate !== undefined) updateData.defaultIvaRate = data.defaultIvaRate;
      if (data.defaultRetentionRate !== undefined) updateData.defaultRetentionRate = data.defaultRetentionRate;

      await dbUserSettings.upsertOne(
        { userId: new ObjectId(user.id) },
        {
          $set: updateData,
          $setOnInsert: {
            userId: new ObjectId(user.id),
            ssExempt: data.ssExempt ?? true,
            ivaQuarterly: data.ivaQuarterly ?? true,
            defaultIvaRate: data.defaultIvaRate ?? 23,
            defaultRetentionRate: data.defaultRetentionRate ?? 25,
          }
        }
      );
    },
  },
});