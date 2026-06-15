const STORAGE_KEY = "personal-finance-manager-v2";
const LEGACY_KEYS = ["personal-finance-manager-v1", "pfm-data", "finance-manager"];

// Clear any legacy storage keys with demo data from previous versions
LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
const GST_RATE = 0.18;

const categoryColors = [
  "#14b8a6",
  "#8b5cf6",
  "#f97316",
  "#38bdf8",
  "#f43f5e",
  "#84cc16",
  "#eab308",
  "#ec4899",
];

const DEFAULT_CATEGORIES = [
  { name: "Salary",        type: "income",  color: "#14b8a6" },
  { name: "Investment",    type: "income",  color: "#84cc16" },
  { name: "Other",         type: "income",  color: "#38bdf8" },
  { name: "Food",          type: "expense", color: "#f97316" },
  { name: "Transport",     type: "expense", color: "#38bdf8" },
  { name: "Shopping",      type: "expense", color: "#ec4899" },
  { name: "Bills",         type: "expense", color: "#eab308" },
  { name: "Education",     type: "expense", color: "#8b5cf6" },
  { name: "Healthcare",    type: "expense", color: "#f43f5e" },
  { name: "Entertainment", type: "expense", color: "#a78bfa" },
  { name: "Other",         type: "expense", color: "#9aa4b2" },
];

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: "D" },
  { key: "income", label: "Add Income", icon: "+" },
  { key: "expense", label: "Add Expense", icon: "-" },
  { key: "history", label: "Transactions", icon: "T" },
  { key: "categories", label: "Categories", icon: "C" },
  { key: "analytics", label: "Analytics", icon: "A" },
  { key: "tax", label: "Pakistan Tax", icon: "GST" },
];

const budgetTemplates = [
  {
    id: "student",
    name: "Student Budget",
    split: [
      ["Food", 30],
      ["Transport", 15],
      ["Study", 15],
      ["Mobile & Internet", 10],
      ["Savings", 20],
      ["Personal", 10],
    ],
  },
  {
    id: "family",
    name: "Family Budget",
    split: [
      ["Rent & Utilities", 30],
      ["Groceries", 25],
      ["School & Family", 15],
      ["Transport", 10],
      ["Medical", 8],
      ["Savings", 12],
    ],
  },
  {
    id: "aggressive",
    name: "Aggressive Savings Budget",
    split: [
      ["Essentials", 35],
      ["Transport", 8],
      ["Food", 17],
      ["Bills", 10],
      ["Savings", 30],
    ],
  },
  {
    id: "balanced",
    name: "Balanced Budget",
    split: [
      ["Needs", 50],
      ["Wants", 20],
      ["Savings", 20],
      ["Emergency Fund", 10],
    ],
  },
];

const state = {
  activePage: "dashboard",
  historyFilter: "all",
  editingId: null,
  newCategoryColor: categoryColors[0],
  categories: [],
  transactions: [],
  selectedTemplateId: "balanced",
  chatMessages: [],
};

const app = document.getElementById("app");

function uid() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatMoney(amount) {
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `₨ ${Math.round(safeAmount).toLocaleString("en-PK")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function seedDefaultCategories() {
  DEFAULT_CATEGORIES.forEach((cat) => {
    const alreadyExists = state.categories.some(
      (c) => c.name.toLowerCase() === cat.name.toLowerCase() && c.type === cat.type,
    );
    if (!alreadyExists) {
      state.categories.push({ id: uid(), ...cat });
    }
  });
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.transactions)) {
        state.transactions = parsed.transactions.filter(
          (t) => t && t.id && t.title && t.amount != null,
        );
      }
      if (Array.isArray(parsed.categories)) {
        state.categories = parsed.categories.filter(
          (c) => c && c.id && c.name && c.type,
        );
      }
      if (Array.isArray(parsed.chatMessages)) {
        state.chatMessages = parsed.chatMessages.filter(
          (m) => m && m.role && m.text,
        );
      }
      if (typeof parsed.selectedTemplateId === "string") {
        state.selectedTemplateId = parsed.selectedTemplateId;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // Always ensure all default categories exist (first launch + upgrades)
  seedDefaultCategories();
  saveData();
}

function saveData() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      transactions: state.transactions,
      categories: state.categories,
      chatMessages: state.chatMessages.slice(-16),
      selectedTemplateId: state.selectedTemplateId,
    }),
  );
}

function setPage(page) {
  state.activePage = page;
  document.body.classList.remove("sidebar-open");
  render();
}

function getPageTitle() {
  const item = navItems.find((navItem) => navItem.key === state.activePage);
  return item ? item.label : "Dashboard";
}

function getTotals() {
  const income = state.transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const expenses = state.transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  return {
    income,
    expenses,
    balance: income - expenses,
    savings: Math.max(income - expenses, 0),
    savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0,
  };
}

function render() {
  const prevScrollTop = document.querySelector(".chat-messages")?.scrollTop;
  const wasAtBottom = (() => {
    const el = document.querySelector(".chat-messages");
    return el ? el.scrollTop >= el.scrollHeight - el.clientHeight - 20 : true;
  })();
  app.innerHTML = `
    <div class="app-shell">
      <button class="overlay" data-action="close-sidebar" aria-label="Close navigation"></button>
      ${renderSidebar()}
      <main class="main">
        <header class="topbar">
          <div>
            <p class="eyebrow">Pakistani Personal Finance Assistant</p>
            <h1 class="page-title">${escapeHtml(getPageTitle())}</h1>
          </div>
          <div class="topbar-actions">
            <span class="badge income desktop-badge">PKR · Islamabad / Rawalpindi</span>
            <button class="button secondary icon mobile-menu" data-action="open-sidebar" aria-label="Open navigation">M</button>
          </div>
        </header>
        <section class="content">${renderPage()}</section>
      </main>
    </div>
  `;
  // Restore chat scroll position
  const chatEl = document.querySelector(".chat-messages");
  if (chatEl) {
    if (wasAtBottom) {
      chatEl.scrollTop = chatEl.scrollHeight;
    } else if (prevScrollTop != null) {
      chatEl.scrollTop = prevScrollTop;
    }
  }
}

function renderSidebar() {
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">₨</div>
        <div>
          <p class="brand-title">PakFin AI</p>
          <p class="brand-subtitle">Islamabad & Rawalpindi money suite</p>
        </div>
      </div>
      <nav class="nav">
        ${navItems
          .map(
            (item) => `
              <button class="nav-button ${state.activePage === item.key ? "active" : ""}" data-page="${item.key}">
                <span class="nav-icon">${item.icon}</span>
                <span>${item.label}</span>
              </button>
            `,
          )
          .join("")}
      </nav>
      <div class="sidebar-note">
        <p><strong>Local intelligence</strong></p>
        <p class="small muted">No APIs. Budgets, tax estimates, and chat guidance run fully in your browser.</p>
      </div>
    </aside>
  `;
}

function renderPage() {
  if (state.activePage === "income") return renderTransactionForm("income");
  if (state.activePage === "expense") return renderTransactionForm("expense");
  if (state.activePage === "history") return renderHistory();
  if (state.activePage === "categories") return renderCategories();
  if (state.activePage === "analytics") return renderAnalytics();
  if (state.activePage === "tax") return renderTaxDashboard();
  return renderDashboard();
}

function renderDashboard() {
  const totals = getTotals();
  const recent = [...state.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const expenseUsage =
    totals.income > 0 ? Math.min((totals.expenses / totals.income) * 100, 100) : 0;

  const cards = [
    { label: "Total Income", value: totals.income, icon: "+", color: "var(--primary)" },
    { label: "Total Expenses", value: totals.expenses, icon: "-", color: "var(--danger)" },
    { label: "Current Balance", value: totals.balance, icon: "₨", color: "var(--sky)" },
    { label: "Savings Amount", value: totals.savings, icon: "S", color: "var(--accent)" },
  ];

  return `
    <section class="hero-panel">
      <div>
        <p class="eyebrow">Professional PKR dashboard</p>
        <h2>Plan, save, and understand your money in Pakistan.</h2>
        <p>Track local spending, estimate GST impact, get browser-only finance guidance, and build practical budgets for Islamabad and Rawalpindi life.</p>
      </div>
      <div class="hero-actions">
        <button class="button" data-page="income">Add Income</button>
        <button class="button secondary" data-page="tax">View GST Dashboard</button>
      </div>
    </section>

    <div class="grid stats-grid">
      ${cards
        .map(
          (card) => `
            <article class="card stat-card">
              <div class="card-content">
                <div class="stat-top">
                  <div>
                    <p class="stat-label">${card.label}</p>
                    <p class="stat-value">${formatMoney(card.value)}</p>
                  </div>
                  <div class="stat-icon" style="color:${card.color}">${card.icon}</div>
                </div>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>

    ${renderAIInsights(totals)}
    ${renderBudgetTemplates(totals.income)}

    <div class="grid dashboard-grid" style="margin-top:24px">
      <article class="card">
        <div class="card-header">
          <h2 class="card-title">Financial Snapshot</h2>
          <p class="card-description">PKR income, expenses, savings, and usage.</p>
        </div>
        <div class="card-content">
          ${renderProgress("Expense Usage", expenseUsage, "expense-fill")}
          ${renderProgress("Savings Rate", Math.max(totals.savingsRate, 0), "")}
          <div class="quick-actions">
            <button class="button" data-page="income">Add Income</button>
            <button class="button secondary" data-page="expense">Add Expense</button>
          </div>
        </div>
      </article>

      <article class="card">
        <div class="card-header">
          <h2 class="card-title">Recent Transactions</h2>
          <p class="card-description">Latest PKR activity in your wallet.</p>
        </div>
        <div class="card-content">
          ${renderTransactionList(recent, true)}
        </div>
      </article>

      ${renderChatAssistant()}
    </div>
  `;
}

function renderAIInsights(totals) {
  const insights = getAIInsights(totals);

  return `
    <section class="ai-section">
      <div class="ai-heading">
        <div>
          <p class="eyebrow">Automatic AI Insights</p>
          <h2 class="section-title">Pakistan-focused money signals</h2>
        </div>
        <span class="badge income">Browser-only AI</span>
      </div>
      <div class="health-card">
        <div>
          <p class="stat-label">Monthly Financial Health Score</p>
          <p class="health-score">${insights.healthScore}<span>/100</span></p>
        </div>
        <div class="health-meter" aria-label="Financial health score">
          <div class="health-meter-fill ${insights.healthTone}" style="width:${insights.healthScore}%"></div>
        </div>
        <p class="health-summary">${escapeHtml(insights.healthSummary)}</p>
      </div>
      <div class="insights-grid">
        ${insights.cards
          .map(
            (card) => `
              <article class="insight-card ${card.tone}">
                <div class="insight-top">
                  <span class="insight-icon">${card.icon}</span>
                  <span class="insight-tag">${escapeHtml(card.tag)}</span>
                </div>
                <h3>${escapeHtml(card.title)}</h3>
                <p>${escapeHtml(card.message)}</p>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function getAIInsights(totals) {
  const expenses = state.transactions.filter(
    (transaction) => transaction.type === "expense",
  );
  const monthlyData = getMonthlyData();
  const currentMonth = monthlyData[monthlyData.length - 1] || {
    income: 0,
    expense: 0,
    label: "This month",
  };
  const previousMonth = monthlyData[monthlyData.length - 2] || { expense: 0 };
  const categoryTotals = getExpenseCategoryTotals();
  const largestCategory = categoryTotals[0] || null;
  const averageExpense =
    expenses.length > 0
      ? expenses.reduce((sum, transaction) => sum + Number(transaction.amount), 0) /
        expenses.length
      : 0;
  const unusualExpenses = expenses
    .filter((transaction) => averageExpense > 0 && Number(transaction.amount) >= averageExpense * 1.8)
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 2);
  const expenseRatio = totals.income > 0 ? totals.expenses / totals.income : 0;
  const savingsRate = totals.income > 0 ? totals.savings / totals.income : 0;
  const healthScore = calculateHealthScore(expenseRatio, savingsRate, totals.balance);
  const trendAmount = currentMonth.expense - previousMonth.expense;
  const cards = [];

  cards.push({
    icon: "TR",
    tag: "Trend",
    title: "Spending trend",
    message:
      currentMonth.expense === 0 && previousMonth.expense === 0
        ? "No spending trend yet. Add monthly transactions to unlock trend analysis."
        : trendAmount > 0
          ? `Your spending is up by ${formatMoney(trendAmount)} versus last month. Review recurring bills and food delivery habits.`
          : `Your spending is ${formatMoney(Math.abs(trendAmount))} lower than last month. Keep this controlled pace going.`,
    tone: trendAmount > 0 ? "danger" : "teal",
  });

  cards.push({
    icon: "CAT",
    tag: "Category",
    title: largestCategory ? "Largest spending category" : "No spending yet",
    message: largestCategory
      ? `${largestCategory.category} leads expenses at ${formatMoney(largestCategory.amount)}. This is the first category to audit for savings.`
      : "Add expenses to see category-level analysis for your Pakistani budget.",
    tone: "blue",
  });

  cards.push({
    icon: "SAVE",
    tag: "Opportunity",
    title: "Savings opportunity",
    message: getSavingsRecommendation(totals, largestCategory),
    tone: "violet",
  });

  cards.push({
    icon: "PK",
    tag: "Monthly",
    title: "Current month summary",
    message: `${currentMonth.label}: ${formatMoney(currentMonth.income)} income, ${formatMoney(currentMonth.expense)} expenses, ${formatMoney(currentMonth.income - currentMonth.expense)} net cash flow.`,
    tone: currentMonth.expense > currentMonth.income && currentMonth.income > 0 ? "danger" : "teal",
  });

  if (totals.expenses > totals.income && totals.income > 0) {
    cards.push({
      icon: "!",
      tag: "Warning",
      title: "Expenses exceed income",
      message: `You are overspending by ${formatMoney(totals.expenses - totals.income)}. Freeze non-essential purchases until the budget is back in surplus.`,
      tone: "danger",
    });
  } else {
    cards.push({
      icon: "OK",
      tag: "Balance",
      title: "Budget position",
      message:
        totals.income > 0
          ? "Income currently covers spending. Keep a buffer for electricity, fuel, medical, and family support costs."
          : "Add monthly income in PKR so the assistant can judge your budget position.",
      tone: "teal",
    });
  }

  cards.push({
    icon: "U",
    tag: "Unusual",
    title: "Unusual expense check",
    message:
      unusualExpenses.length > 0
        ? `${unusualExpenses.map((item) => `${item.title} (${formatMoney(Number(item.amount))})`).join(" and ")} look higher than your usual expense size.`
        : "No unusual expenses detected yet. Large one-off purchases will appear here automatically.",
    tone: unusualExpenses.length > 0 ? "danger" : "amber",
  });

  return {
    healthScore,
    healthTone:
      healthScore >= 75 ? "strong" : healthScore >= 50 ? "medium" : "low",
    healthSummary: getHealthSummary(healthScore, savingsRate, expenseRatio),
    cards,
  };
}

function renderBudgetTemplates(monthlyIncome) {
  const activeTemplate =
    budgetTemplates.find((template) => template.id === state.selectedTemplateId) ||
    budgetTemplates[0];

  return `
    <section class="template-section">
      <div class="ai-heading">
        <div>
          <p class="eyebrow">One-click budget templates</p>
          <h2 class="section-title">Build a PKR budget plan instantly</h2>
        </div>
        <span class="badge">Based on current total income</span>
      </div>
      <div class="template-tabs">
        ${budgetTemplates
          .map(
            (template) => `
              <button class="template-button ${template.id === state.selectedTemplateId ? "active" : ""}" data-template="${template.id}">
                ${escapeHtml(template.name)}
              </button>
            `,
          )
          .join("")}
      </div>
      <div class="template-plan card">
        ${activeTemplate.split
          .map(([label, percent]) => {
            const amount = (monthlyIncome * percent) / 100;
            return `
              <div class="template-row">
                <div>
                  <strong>${escapeHtml(label)}</strong>
                  <span>${percent}% allocation</span>
                </div>
                <p>${formatMoney(amount)}</p>
              </div>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderChatAssistant() {
  const messages = state.chatMessages.length
    ? state.chatMessages
    : [
        {
          role: "assistant",
          text: "Assalam o Alaikum! I'm your Pakistan-focused Finance AI, powered by Claude. I can see your current financial data and give you tailored advice on budgets, savings goals, GST impact, affordability, and practical money tips for Islamabad and Rawalpindi. What would you like to discuss?",
        },
      ];

  return `
    <article class="card chat-card">
      <div class="card-header">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div class="title-with-icon">
            <div class="stat-icon" style="background:linear-gradient(135deg,rgba(139,92,246,0.3),rgba(20,184,166,0.2));color:#c4b5fd;">AI</div>
            <div>
              <h2 class="card-title">Finance AI Chat</h2>
              <p class="card-description">Powered by Claude · Pakistan-focused advice</p>
            </div>
          </div>
          <span class="badge ai-badge">Claude AI</span>
        </div>
      </div>
      <div class="card-content">
        <div class="chat-messages" id="chat-messages-box">
          ${messages
            .map(
              (message) => `
                <div class="chat-message ${message.role}${message.loading ? " loading" : ""}">
                  ${message.loading
                    ? `<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>`
                    : `<p>${escapeHtml(message.text)}</p>`
                  }
                </div>
              `,
            )
            .join("")}
        </div>
        <form id="chat-form" class="chat-form">
          <input id="chat-input" name="message" placeholder="Ask: Can I afford a ₨ 50,000 phone?" autocomplete="off" required />
          <button class="button" type="submit">Ask</button>
        </form>
        <div class="prompt-chips">
          <button type="button" class="chip" data-prompt="Build a monthly PKR budget plan based on my income and expenses">Budget plan</button>
          <button type="button" class="chip" data-prompt="Analyze my spending habits and identify where I can cut costs">Analyze spending</button>
          <button type="button" class="chip" data-prompt="What savings goal should I set for the next 6 months?">Savings goal</button>
          <button type="button" class="chip" data-prompt="Can I afford a ₨50,000 purchase right now?">Affordability check</button>
          <button type="button" class="chip" data-prompt="How much GST am I paying and how can I reduce it?">GST impact</button>
          <button type="button" class="chip" data-prompt="Give me practical money saving tips for Rawalpindi or Islamabad">Local tips</button>
        </div>
      </div>
    </article>
  `;
}

function generateChatReply(question) {
  const text = question.toLowerCase();
  const totals = getTotals();
  const largestCategory = getExpenseCategoryTotals()[0] || null;
  const monthlyIncome = getMonthlyData().at(-1)?.income || totals.income;
  const spendRatio = totals.income > 0 ? totals.expenses / totals.income : 0;
  const purchaseAmount = extractPKRAmount(question);

  if (text.includes("afford") || text.includes("purchase") || purchaseAmount > 0) {
    const amount = purchaseAmount || 0;
    if (!amount) {
      return "Tell me the purchase amount in PKR and I will compare it with your income, savings, and current spending.";
    }
    const limit = Math.max(totals.balance * 0.35, monthlyIncome * 0.15);
    if (amount <= limit && totals.balance > amount) {
      return `A ${formatMoney(amount)} purchase looks affordable if it is necessary. Keep at least ${formatMoney(monthlyIncome * 0.1)} as an emergency buffer after buying.`;
    }
    return `A ${formatMoney(amount)} purchase looks risky right now. For Pakistan household budgeting, wait until your balance is at least ${formatMoney(amount * 2)} and monthly savings are positive.`;
  }

  if (text.includes("budget") || text.includes("plan")) {
    const baseIncome = monthlyIncome || totals.income;
    if (!baseIncome) {
      return "Add your monthly income first. A good Pakistani starter plan is 50% needs, 20% wants, 20% savings, and 10% emergency fund.";
    }
    return `For ${formatMoney(baseIncome)} monthly income: keep needs near ${formatMoney(baseIncome * 0.5)}, wants near ${formatMoney(baseIncome * 0.2)}, savings near ${formatMoney(baseIncome * 0.2)}, and emergency fund near ${formatMoney(baseIncome * 0.1)}.`;
  }

  if (text.includes("saving") || text.includes("goal")) {
    if (!totals.income) {
      return "Add income first, then target at least 20% monthly savings. Even ₨ 5,000 to ₨ 10,000/month builds discipline for students and early earners.";
    }
    return `Your suggested monthly savings goal is ${formatMoney(totals.income * 0.2)}. If this feels high, start with ${formatMoney(totals.income * 0.1)} and increase after cutting one expense category.`;
  }

  if (text.includes("tax") || text.includes("gst")) {
    const tax = getTaxSummary();
    return `Using an 18% GST estimate, your monthly GST exposure is about ${formatMoney(tax.monthlyGST)} and yearly exposure is about ${formatMoney(tax.yearlyGST)}. Lower taxable discretionary purchases to reduce this indirect tax burden.`;
  }

  if (text.includes("spending") || text.includes("habit") || text.includes("analyze")) {
    if (!totals.expenses) {
      return "No expense habits yet. Add expenses by category, then I can identify leaks like food delivery, fuel, transport, mobile, and shopping.";
    }
    return largestCategory
      ? `Your biggest habit signal is ${largestCategory.category} at ${formatMoney(largestCategory.amount)}. Spending ratio is ${Math.round(spendRatio * 100)}% of income, so reduce that category by 10% first.`
      : "Your spending is still too light for category analysis. Add categories and expenses for a clearer pattern.";
  }

  return "Practical Pakistan advice: keep rent and utilities predictable, track GST-heavy shopping, save before spending, and avoid installment purchases unless your monthly surplus comfortably covers them.";
}

function extractPKRAmount(text) {
  const matches = text.replaceAll(",", "").match(/\d+(\.\d+)?/g);
  if (!matches) return 0;
  return Number(matches[matches.length - 1]) || 0;
}

function getExpenseCategoryTotals() {
  const categoryNames = [
    ...new Set(
      state.transactions
        .filter((transaction) => transaction.type === "expense")
        .map((transaction) => transaction.category),
    ),
  ];

  return categoryNames
    .map((category) => ({
      category,
      amount: state.transactions
        .filter(
          (transaction) =>
            transaction.type === "expense" && transaction.category === category,
        )
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
    }))
    .filter((category) => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

function calculateHealthScore(expenseRatio, savingsRate, balance) {
  let score = 55;
  score += Math.min(savingsRate * 85, 28);
  score -= Math.max(expenseRatio - 0.65, 0) * 75;
  if (balance < 0) score -= 22;
  if (expenseRatio <= 0.5) score += 12;
  if (expenseRatio > 1) score -= 14;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getHealthSummary(score, savingsRate, expenseRatio) {
  if (score >= 80) {
    return "Excellent position. You are protecting cash flow and building a strong PKR savings buffer.";
  }
  if (score >= 60) {
    return savingsRate > 0.15
      ? "Stable position. Keep saving and watch food, fuel, utilities, and online shopping spikes."
      : "Decent position. A clearer monthly savings target would improve your score.";
  }
  if (expenseRatio > 1) {
    return "Needs attention. Expenses are higher than income, so reset the budget before taking on new purchases.";
  }
  return "Improving position. Reduce one recurring category and build a small emergency fund in PKR.";
}

function getSavingsRecommendation(totals, largestCategory) {
  if (totals.income <= 0) {
    return "Add income first so the assistant can calculate a realistic PKR savings target.";
  }
  const targetSavings = totals.income * 0.2;
  if (totals.savings >= targetSavings) {
    return `You are meeting a 20% savings target. Keep setting aside around ${formatMoney(targetSavings)} before spending.`;
  }
  const gap = targetSavings - totals.savings;
  if (largestCategory) {
    return `Aim to save another ${formatMoney(gap)}. Start by trimming ${largestCategory.category}, your largest expense category.`;
  }
  return `Aim to save another ${formatMoney(gap)} to reach a 20% monthly savings target.`;
}

function renderProgress(label, value, className) {
  const width = Math.max(0, Math.min(value, 100));
  return `
    <div class="progress-block">
      <div class="progress-label">
        <span>${label}</span>
        <strong>${Math.round(width)}%</strong>
      </div>
      <div class="progress-track">
        <div class="progress-fill ${className}" style="width:${width}%"></div>
      </div>
    </div>
  `;
}

function renderTransactionForm(type) {
  const editing = state.editingId
    ? state.transactions.find(
        (transaction) => transaction.id === state.editingId && transaction.type === type,
      )
    : null;
  const categories = state.categories.filter((category) => category.type === type);
  const defaultCategory = categories[0] ? categories[0].name : "";
  const date = new Date().toISOString().slice(0, 10);
  const formData = editing || {
    title: "",
    amount: "",
    category: defaultCategory,
    date,
    note: "",
  };
  const isIncome = type === "income";

  return `
    <article class="card form-card">
      <div class="card-header">
        <div class="title-with-icon">
          <div class="stat-icon">${isIncome ? "+" : "-"}</div>
          <div>
            <h2 class="card-title">${editing ? `Edit ${isIncome ? "Income" : "Expense"}` : `Add ${isIncome ? "Income" : "Expense"}`}</h2>
            <p class="card-description">
              ${isIncome ? "Record salary, freelance income, family support, or stipend in PKR." : "Track spending across food, fuel, rent, utilities, study, and shopping."}
            </p>
          </div>
        </div>
      </div>
      <div class="card-content">
        <form id="transaction-form" data-type="${type}" class="form-grid">
          <div class="field">
            <label for="title">Title</label>
            <input id="title" name="title" value="${escapeHtml(formData.title)}" placeholder="Transaction title" required />
          </div>
          <div class="field">
            <label for="amount">Amount (PKR)</label>
            <input id="amount" name="amount" type="number" min="0" step="1" value="${escapeHtml(formData.amount)}" placeholder="0" required />
          </div>
          <div class="field">
            <label for="category">Category</label>
            <select id="category" name="category" required>
              ${categories.length === 0
                ? '<option value="">No categories found</option>'
                : categories.map((category, index) =>
                    `<option value="${escapeHtml(category.name)}" ${
                      category.name === formData.category || (!formData.category && index === 0)
                        ? "selected"
                        : ""
                    }>${escapeHtml(category.name)}</option>`
                  ).join("")
              }
            </select>
          </div>
          <div class="field">
            <label for="date">Date</label>
            <input id="date" name="date" type="date" value="${escapeHtml(formData.date)}" required />
          </div>
          <div class="field full">
            <label for="note">Note</label>
            <input id="note" name="note" value="${escapeHtml(formData.note)}" placeholder="Optional note" />
          </div>
          <div class="field full">
            <div class="form-actions">
              <button class="button" type="submit">${editing ? "Save Changes" : "Save Transaction"}</button>
              ${editing ? '<button class="button secondary" type="button" data-action="cancel-edit">Cancel Edit</button>' : ""}
            </div>
          </div>
        </form>
      </div>
    </article>
  `;
}

function renderHistory() {
  const transactions = [...state.transactions]
    .filter(
      (transaction) =>
        state.historyFilter === "all" || transaction.type === state.historyFilter,
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  return `
    <article class="card">
      <div class="card-header">
        <div class="card-heading-row">
          <div>
            <h2 class="card-title">Transaction History</h2>
            <p class="card-description">Create, review, edit, and delete PKR records.</p>
          </div>
          <div class="filter-tabs">
            ${["all", "income", "expense"]
              .map(
                (filter) => `
                  <button class="filter-tab ${state.historyFilter === filter ? "active" : ""}" data-filter="${filter}">${filter}</button>
                `,
              )
              .join("")}
          </div>
        </div>
      </div>
      <div class="card-content">
        ${renderTransactionList(transactions, false)}
      </div>
    </article>
  `;
}

function renderTransactionList(transactions, compact) {
  if (!transactions.length) {
    return '<div class="empty">No transactions yet.</div>';
  }

  return `
    <div class="transaction-list">
      ${transactions
        .map(
          (transaction) => `
            <div class="transaction-item">
              <div>
                <p class="transaction-title">${escapeHtml(transaction.title)}</p>
                <div class="transaction-meta">
                  <span class="badge ${transaction.type}">${escapeHtml(transaction.category)}</span>
                  <span>${escapeHtml(transaction.date)}</span>
                  ${!compact && transaction.note ? `<span>${escapeHtml(transaction.note)}</span>` : ""}
                </div>
              </div>
              <div class="transaction-side">
                <p class="amount ${transaction.type}">
                  ${transaction.type === "income" ? "+" : "-"}${formatMoney(Number(transaction.amount))}
                </p>
                <div class="row-actions">
                  <button class="button secondary icon" data-edit="${transaction.id}" aria-label="Edit transaction">E</button>
                  <button class="button danger icon" data-delete="${transaction.id}" aria-label="Delete transaction">X</button>
                </div>
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderCategories() {
  return `
    <div class="grid category-grid">
      <article class="card">
        <div class="card-header">
          <h2 class="card-title">Add Category</h2>
          <p class="card-description">Create income and expense groups for Pakistan spending.</p>
        </div>
        <div class="card-content">
          <form id="category-form" class="grid">
            <div class="field">
              <label for="category-name">Name</label>
              <input id="category-name" name="name" placeholder="Food, Fuel, Rent, Bills..." required />
            </div>
            <div class="field">
              <label for="category-type">Type</label>
              <select id="category-type" name="type">
                <option value="income">Income</option>
                <option value="expense" selected>Expense</option>
              </select>
            </div>
            <div class="field">
              <label>Color</label>
              <div class="swatches">
                ${categoryColors
                  .map(
                    (color) => `
                      <button type="button" class="swatch ${state.newCategoryColor === color ? "active" : ""}" data-color="${color}" style="background:${color}" aria-label="Select ${color}"></button>
                    `,
                  )
                  .join("")}
              </div>
            </div>
            <div>
              <button class="button" type="submit">Add Category</button>
            </div>
          </form>
        </div>
      </article>

      <article class="card">
        <div class="card-header">
          <h2 class="card-title">Categories</h2>
          <p class="card-description">Groups used by forms, analytics, tax estimates, and chat.</p>
        </div>
        <div class="card-content">
          <div class="category-list">
            ${state.categories.length ? state.categories
              .map(
                (category) => `
                  <div class="category-item">
                    <div class="category-main">
                      <span class="color-dot" style="background:${category.color}"></span>
                      <div>
                        <p class="category-name">${escapeHtml(category.name)}</p>
                        <p class="brand-subtitle">${category.type}</p>
                      </div>
                    </div>
                    <button class="button secondary icon" data-delete-category="${category.id}" aria-label="Delete category">X</button>
                  </div>
                `,
              )
              .join("") : '<div class="empty">No categories yet.</div>'}
          </div>
        </div>
      </article>
    </div>
  `;
}

function renderAnalytics() {
  return `
    <div class="grid analytics-grid">
      <article class="card">
        <div class="card-header">
          <div class="title-with-icon">
            <div class="stat-icon">P</div>
            <div>
              <h2 class="card-title">Expenses by Category</h2>
              <p class="card-description">Better category chart for PKR spending.</p>
            </div>
          </div>
        </div>
        <div class="card-content">${renderPieChart()}</div>
      </article>

      <article class="card">
        <div class="card-header">
          <div class="title-with-icon">
            <div class="stat-icon">B</div>
            <div>
              <h2 class="card-title">Monthly Income vs Expenses</h2>
              <p class="card-description">Six-month PKR comparison bar chart.</p>
            </div>
          </div>
        </div>
        <div class="card-content">${renderBarChart()}</div>
      </article>
    </div>
  `;
}

function renderPieChart() {
  const slices = getExpenseCategoryTotals().map((category, index) => ({
    ...category,
    color: categoryColors[index % categoryColors.length],
  }));
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  let accumulated = 0;

  if (!slices.length) return '<div class="empty">No expense data yet.</div>';

  const circles = slices
    .map((slice) => {
      const percent = (slice.amount / total) * 100;
      const dash = `${percent} ${100 - percent}`;
      const offset = 25 - accumulated;
      accumulated += percent;
      return `
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="${slice.color}" stroke-width="8" stroke-dasharray="${dash}" stroke-dashoffset="${offset}"></circle>
      `;
    })
    .join("");

  return `
    <div class="chart-layout">
      <svg class="pie-chart" viewBox="0 0 42 42" aria-label="Expenses by category pie chart">
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#1f2937" stroke-width="8"></circle>
        ${circles}
      </svg>
      <div class="legend">
        ${slices
          .map(
            (slice) => `
              <div class="legend-row">
                <span class="legend-label">
                  <span class="color-dot" style="background:${slice.color}"></span>
                  ${escapeHtml(slice.category)}
                </span>
                <strong>${formatMoney(slice.amount)}</strong>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderBarChart() {
  const data = getMonthlyData();
  const maxValue = Math.max(
    1,
    ...data.flatMap((month) => [month.income, month.expense]),
  );

  return `
    <div class="bar-chart">
      <div class="bar-area">
        ${data
          .map(
            (month) => `
              <div class="bar-month">
                <div class="bar-pair">
                  <div class="bar income" title="Income ${formatMoney(month.income)}" style="height:${Math.max((month.income / maxValue) * 100, month.income ? 3 : 0)}%"></div>
                  <div class="bar expense" title="Expenses ${formatMoney(month.expense)}" style="height:${Math.max((month.expense / maxValue) * 100, month.expense ? 3 : 0)}%"></div>
                </div>
                <span class="bar-label">${month.label}</span>
              </div>
            `,
          )
          .join("")}
      </div>
      <div class="chart-key">
        <span class="key-item"><span class="key-swatch" style="background:var(--primary)"></span>Income</span>
        <span class="key-item"><span class="key-swatch" style="background:var(--danger)"></span>Expenses</span>
      </div>
    </div>
  `;
}

function renderTaxDashboard() {
  const tax = getTaxSummary();
  const cards = [
    ["Estimated Monthly GST", tax.monthlyGST],
    ["Estimated Yearly GST", tax.yearlyGST],
    ["Monthly Taxable Spending", tax.monthlyTaxable],
    ["Yearly Taxable Spending", tax.yearlyTaxable],
  ];

  return `
    <section class="hero-panel tax-hero">
      <div>
        <p class="eyebrow">Islamabad & Rawalpindi GST estimate</p>
        <h2>Pakistan Tax Dashboard</h2>
        <p>Uses an 18% GST estimate for most goods and taxable purchases. This is a planning estimate, not official tax advice.</p>
      </div>
      <span class="tax-rate">18% GST</span>
    </section>

    <div class="grid stats-grid">
      ${cards
        .map(
          ([label, value]) => `
            <article class="card stat-card">
              <div class="card-content">
                <p class="stat-label">${label}</p>
                <p class="stat-value">${formatMoney(value)}</p>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>

    <div class="grid tax-grid">
      <article class="card">
        <div class="card-header">
          <h2 class="card-title">GST by Spending Category</h2>
          <p class="card-description">Estimated 18% GST share by category.</p>
        </div>
        <div class="card-content">
          ${tax.categoryBreakdown.length ? `
            <div class="tax-table">
              ${tax.categoryBreakdown
                .map(
                  (item) => `
                    <div class="tax-row">
                      <span>${escapeHtml(item.category)}</span>
                      <strong>${formatMoney(item.gst)}</strong>
                    </div>
                  `,
                )
                .join("")}
            </div>
          ` : '<div class="empty">No expense data for tax breakdown yet.</div>'}
        </div>
      </article>

      <article class="card">
        <div class="card-header">
          <h2 class="card-title">Tax Insights & Savings</h2>
          <p class="card-description">Practical suggestions for Pakistani spending.</p>
        </div>
        <div class="card-content">
          <div class="insight-list">
            ${getTaxInsights(tax)
              .map((insight) => `<div class="mini-insight">${escapeHtml(insight)}</div>`)
              .join("")}
          </div>
        </div>
      </article>
    </div>
  `;
}

function getTaxSummary() {
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentYearKey = String(new Date().getFullYear());
  const expenses = state.transactions.filter(
    (transaction) => transaction.type === "expense",
  );
  const monthlyTaxable = expenses
    .filter((transaction) => transaction.date.startsWith(currentMonthKey))
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const yearlyTaxable = expenses
    .filter((transaction) => transaction.date.startsWith(currentYearKey))
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  return {
    monthlyTaxable,
    yearlyTaxable,
    monthlyGST: monthlyTaxable * GST_RATE,
    yearlyGST: yearlyTaxable * GST_RATE,
    categoryBreakdown: getExpenseCategoryTotals().map((item) => ({
      category: item.category,
      spending: item.amount,
      gst: item.amount * GST_RATE,
    })),
  };
}

function getTaxInsights(tax) {
  const topTaxCategory = tax.categoryBreakdown[0];
  const insights = [
    "GST is estimated at 18% for most goods and taxable purchases in this dashboard.",
  ];
  if (!tax.yearlyTaxable) {
    insights.push("Add expense transactions to estimate GST paid monthly and yearly.");
    insights.push("Separate essentials from discretionary shopping for clearer tax planning.");
    return insights;
  }
  insights.push(
    `Your estimated yearly GST exposure is ${formatMoney(tax.yearlyGST)} on ${formatMoney(tax.yearlyTaxable)} of spending.`,
  );
  if (topTaxCategory) {
    insights.push(
      `${topTaxCategory.category} creates the highest estimated GST at ${formatMoney(topTaxCategory.gst)}. Reducing this category by 10% may save around ${formatMoney(topTaxCategory.gst * 0.1)} in indirect tax exposure.`,
    );
  }
  insights.push(
    "For Islamabad and Rawalpindi households, compare prices before electronics, clothing, restaurant, and grocery purchases because these can carry meaningful indirect tax impact.",
  );
  return insights;
}

function getMonthlyData() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleString("en-US", { month: "short" });
    const monthTransactions = state.transactions.filter((transaction) =>
      transaction.date.startsWith(key),
    );
    return {
      label,
      income: monthTransactions
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
      expense: monthTransactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
    };
  });
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;

  const page = target.dataset.page;
  if (page) {
    state.editingId = null;
    setPage(page);
    return;
  }

  if (target.dataset.action === "open-sidebar") {
    document.body.classList.add("sidebar-open");
    return;
  }

  if (target.dataset.action === "close-sidebar") {
    document.body.classList.remove("sidebar-open");
    return;
  }

  if (target.dataset.action === "cancel-edit") {
    state.editingId = null;
    render();
    return;
  }

  if (target.dataset.filter) {
    state.historyFilter = target.dataset.filter;
    render();
    return;
  }

  if (target.dataset.template) {
    state.selectedTemplateId = target.dataset.template;
    saveData();
    render();
    return;
  }

  if (target.dataset.prompt) {
    target.disabled = true;
    addChatMessage(target.dataset.prompt).finally(() => {
      if (target) target.disabled = false;
    });
    return;
  }

  if (target.dataset.edit) {
    const transaction = state.transactions.find(
      (item) => item.id === target.dataset.edit,
    );
    if (!transaction) return;
    state.editingId = transaction.id;
    setPage(transaction.type);
    return;
  }

  if (target.dataset.delete) {
    state.transactions = state.transactions.filter(
      (transaction) => transaction.id !== target.dataset.delete,
    );
    if (state.editingId === target.dataset.delete) state.editingId = null;
    saveData();
    render();
    return;
  }

  if (target.dataset.deleteCategory) {
    state.categories = state.categories.filter(
      (category) => category.id !== target.dataset.deleteCategory,
    );
    saveData();
    render();
    return;
  }

  if (target.dataset.color) {
    state.newCategoryColor = target.dataset.color;
    render();
  }
});

document.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;

  if (form.id === "chat-form") {
    const formData = new FormData(form);
    const msg = String(formData.get("message") || "").trim();
    if (!msg) return;
    form.reset();
    // Disable while waiting
    const btn = form.querySelector("button[type=submit]");
    const inp = form.querySelector("input[name=message]");
    if (btn) btn.disabled = true;
    if (inp) inp.disabled = true;
    addChatMessage(msg).finally(() => {
      if (btn) btn.disabled = false;
      if (inp) inp.disabled = false;
    });
    return;
  }

  if (form.id === "transaction-form") {
    const type = form.dataset.type;
    const formData = new FormData(form);
    const amount = Number(formData.get("amount"));
    const title = String(formData.get("title") || "").trim();
    const category = String(formData.get("category") || "");
    const date = String(formData.get("date") || "");
    const note = String(formData.get("note") || "").trim();

    if (!title || !category || !date || amount <= 0) return;

    const existing =
      state.editingId &&
      state.transactions.find(
        (transaction) => transaction.id === state.editingId && transaction.type === type,
      );

    const nextTransaction = {
      id: existing ? existing.id : uid(),
      type,
      title,
      amount,
      category,
      date,
      note,
    };

    if (existing) {
      state.transactions = state.transactions.map((transaction) =>
        transaction.id === existing.id ? nextTransaction : transaction,
      );
    } else {
      state.transactions = [nextTransaction, ...state.transactions];
    }

    state.editingId = null;
    state.activePage = "history";
    saveData();
    render();
    return;
  }

  if (form.id === "category-form") {
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const type = String(formData.get("type") || "expense");
    if (!name) return;

    const exists = state.categories.some(
      (category) =>
        category.type === type && category.name.toLowerCase() === name.toLowerCase(),
    );
    if (exists) return;

    state.categories.push({
      id: uid(),
      name,
      type,
      color: state.newCategoryColor,
    });
    state.newCategoryColor = categoryColors[0];
    saveData();
    render();
  }
});

async function addChatMessage(message) {
  if (!message) return;
  state.chatMessages.push({ role: "user", text: message });
  // Show typing indicator
  state.chatMessages.push({ role: "assistant", text: "...", loading: true });
  state.chatMessages = state.chatMessages.slice(-20);
  saveData();
  render();
  scrollChatToBottom();

  try {
    const reply = await callClaudeAPI(message);
    // Replace loading indicator with real response
    state.chatMessages = state.chatMessages.filter((m) => !m.loading);
    state.chatMessages.push({ role: "assistant", text: reply });
  } catch (err) {
    state.chatMessages = state.chatMessages.filter((m) => !m.loading);
    // Fallback to local logic if API fails
    state.chatMessages.push({ role: "assistant", text: generateChatReply(message) });
  }

  state.chatMessages = state.chatMessages.slice(-20);
  saveData();
  render();
  scrollChatToBottom();
}

function scrollChatToBottom() {
  setTimeout(() => {
    const el = document.querySelector(".chat-messages");
    if (el) el.scrollTop = el.scrollHeight;
  }, 60);
}

async function callClaudeAPI(userMessage) {
  const totals = getTotals();
  const monthlyData = getMonthlyData();
  const currentMonth = monthlyData.at(-1) || { income: 0, expense: 0, label: "This month" };
  const tax = getTaxSummary();
  const largestCategory = getExpenseCategoryTotals()[0] || null;
  const spendRatio = totals.income > 0 ? Math.round((totals.expenses / totals.income) * 100) : 0;

  const systemPrompt = `You are PakFin AI, a friendly Pakistan-focused personal finance assistant for users in Islamabad and Rawalpindi. You give practical, concise financial advice in English, with a warm and helpful tone. You understand Pakistani financial context: PKR currency, local inflation, GST at 18%, utilities like IESCO/SNGPL, mobile money like JazzCash/Easypaisa, and common expenses like petrol, ration, school fees, medical, and rent in twin cities.

Current user financial snapshot:
- Total Income: ₨ ${Math.round(totals.income).toLocaleString("en-PK")}
- Total Expenses: ₨ ${Math.round(totals.expenses).toLocaleString("en-PK")}
- Current Balance: ₨ ${Math.round(totals.balance).toLocaleString("en-PK")}
- Savings Amount: ₨ ${Math.round(totals.savings).toLocaleString("en-PK")}
- Savings Rate: ${totals.savingsRate}%
- Expense Ratio: ${spendRatio}% of income
- This Month Income: ₨ ${Math.round(currentMonth.income).toLocaleString("en-PK")}
- This Month Expenses: ₨ ${Math.round(currentMonth.expense).toLocaleString("en-PK")}
- Estimated Monthly GST: ₨ ${Math.round(tax.monthlyGST).toLocaleString("en-PK")}
- Largest Spending Category: ${largestCategory ? largestCategory.category + " (₨ " + Math.round(largestCategory.amount).toLocaleString("en-PK") + ")" : "None yet"}
- Total Transactions: ${state.transactions.length}

Keep responses concise (3–5 sentences max), use PKR amounts (₨ symbol), be specific to Pakistan, and always be practical. Don't repeat the user's question. Avoid generic advice — tailor it to their actual numbers above.`;

  // Build conversation history for multi-turn context
  const historyMessages = state.chatMessages
    .filter((m) => !m.loading)
    .slice(-10)
    .map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    }));

  // Remove the last message since we pass it separately
  if (historyMessages.length > 0 && historyMessages.at(-1).role === "user") {
    historyMessages.pop();
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        ...historyMessages,
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();
  const text = data.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  return text || generateChatReply(userMessage);
}

loadData();
render();
