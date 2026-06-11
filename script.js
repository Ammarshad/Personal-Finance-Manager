const STORAGE_KEY = "personal-finance-manager-v1";

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

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: "D" },
  { key: "income", label: "Add Income", icon: "+" },
  { key: "expense", label: "Add Expense", icon: "-" },
  { key: "history", label: "Transactions", icon: "T" },
  { key: "categories", label: "Categories", icon: "C" },
  { key: "analytics", label: "Analytics", icon: "A" },
];

const state = {
  activePage: "dashboard",
  historyFilter: "all",
  editingId: null,
  newCategoryColor: categoryColors[0],
  categories: [],
  transactions: [],
};

const app = document.getElementById("app");

function uid() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed.transactions)) {
      state.transactions = parsed.transactions;
    }
    if (Array.isArray(parsed.categories)) {
      state.categories = parsed.categories;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function saveData() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      transactions: state.transactions,
      categories: state.categories,
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
  app.innerHTML = `
    <div class="app-shell">
      <button class="overlay" data-action="close-sidebar" aria-label="Close navigation"></button>
      ${renderSidebar()}
      <main class="main">
        <header class="topbar">
          <div>
            <p class="eyebrow">Personal Finance Manager</p>
            <h1 class="page-title">${escapeHtml(getPageTitle())}</h1>
          </div>
          <div class="topbar-actions">
            <span class="badge income desktop-badge">Local storage</span>
            <button class="button secondary icon mobile-menu" data-action="open-sidebar" aria-label="Open navigation">M</button>
          </div>
        </header>
        <section class="content">${renderPage()}</section>
      </main>
    </div>
  `;
}

function renderSidebar() {
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">$</div>
        <div>
          <p class="brand-title">FinTrack</p>
          <p class="brand-subtitle">Student budget suite</p>
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
        <p><strong>Assignment ready</strong></p>
        <p class="small muted">CRUD, local storage, analytics, and responsive navigation are included.</p>
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
    { label: "Current Balance", value: totals.balance, icon: "$", color: "var(--sky)" },
    { label: "Savings Amount", value: totals.savings, icon: "S", color: "var(--accent)" },
  ];

  return `
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

    <div class="grid two-col" style="margin-top:24px">
      <article class="card">
        <div class="card-header">
          <h2 class="card-title">Financial Snapshot</h2>
          <p class="card-description">Income, expense, and savings performance.</p>
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
          <p class="card-description">Latest activity in your budget.</p>
        </div>
        <div class="card-content">
          ${renderTransactionList(recent, true)}
        </div>
      </article>
    </div>
  `;
}

function renderAIInsights(totals) {
  const insights = getAIInsights(totals);

  return `
    <section class="ai-section">
      <div class="ai-heading">
        <div>
          <p class="eyebrow">Local AI Insights</p>
          <h2 class="section-title">Smart money signals</h2>
        </div>
        <span class="badge income">No API used</span>
      </div>
      <div class="health-card">
        <div>
          <p class="stat-label">Financial Health Score</p>
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
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthTransactions = state.transactions.filter((transaction) =>
    transaction.date.startsWith(currentMonthKey),
  );
  const monthlyIncome = currentMonthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const monthlyExpenses = currentMonthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const categoryTotals = getExpenseCategoryTotals();
  const largestCategory = categoryTotals[0] || null;
  const averageExpense =
    expenses.length > 0
      ? expenses.reduce((sum, transaction) => sum + Number(transaction.amount), 0) /
        expenses.length
      : 0;
  const unusualExpenses = expenses
    .filter((transaction) => Number(transaction.amount) >= averageExpense * 1.8)
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 2);
  const expenseRatio = totals.income > 0 ? totals.expenses / totals.income : 0;
  const savingsRate = totals.income > 0 ? totals.savings / totals.income : 0;
  const healthScore = calculateHealthScore(expenseRatio, savingsRate, totals.balance);
  const cards = [];

  cards.push({
    icon: "C",
    tag: "Category",
    title: largestCategory ? "Largest spending category" : "No spending yet",
    message: largestCategory
      ? `${largestCategory.category} is your biggest expense area at ${formatMoney(largestCategory.amount)}. Review this category first for quick savings.`
      : "Add expenses to see which category needs the most attention.",
    tone: "teal",
  });

  cards.push({
    icon: "M",
    tag: "This month",
    title: "Monthly spending summary",
    message: `This month you recorded ${formatMoney(monthlyIncome)} income and ${formatMoney(monthlyExpenses)} expenses, leaving ${formatMoney(monthlyIncome - monthlyExpenses)} for the month.`,
    tone: monthlyExpenses > monthlyIncome && monthlyIncome > 0 ? "danger" : "blue",
  });

  cards.push({
    icon: "S",
    tag: "Saving",
    title: "Savings recommendation",
    message: getSavingsRecommendation(totals, largestCategory),
    tone: "violet",
  });

  if (totals.expenses > totals.income && totals.income > 0) {
    cards.push({
      icon: "!",
      tag: "Warning",
      title: "Expenses exceed income",
      message: `You are overspending by ${formatMoney(totals.expenses - totals.income)}. Pause non-essential spending until income catches up.`,
      tone: "danger",
    });
  } else {
    cards.push({
      icon: "OK",
      tag: "Balance",
      title: "Income covers expenses",
      message:
        totals.income > 0
          ? "Your income currently covers your expenses. Keep protecting that gap by reviewing larger purchases before they happen."
          : "Add income records to compare earnings against spending.",
      tone: "teal",
    });
  }

  cards.push({
    icon: "R",
    tag: "Reduce",
    title: "Spending reduction idea",
    message: largestCategory
      ? `Try reducing ${largestCategory.category} by 10%. That would save about ${formatMoney(largestCategory.amount * 0.1)} based on your current records.`
      : "Start with food, transport, or entertainment categories once you add more expenses.",
    tone: "amber",
  });

  cards.push({
    icon: "U",
    tag: "Unusual",
    title: "Unusual expense check",
    message:
      unusualExpenses.length > 0
        ? `${unusualExpenses.map((item) => `${item.title} (${formatMoney(Number(item.amount))})`).join(" and ")} look higher than your usual expense size.`
        : "No unusual expenses detected yet. Larger one-off expenses will appear here automatically.",
    tone: unusualExpenses.length > 0 ? "danger" : "blue",
  });

  return {
    healthScore,
    healthTone:
      healthScore >= 75 ? "strong" : healthScore >= 50 ? "medium" : "low",
    healthSummary: getHealthSummary(healthScore, savingsRate, expenseRatio),
    cards,
  };
}

function getExpenseCategoryTotals() {
  return state.categories
    .filter((category) => category.type === "expense")
    .map((category) => ({
      category: category.name,
      amount: state.transactions
        .filter(
          (transaction) =>
            transaction.type === "expense" && transaction.category === category.name,
        )
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
    }))
    .filter((category) => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

function calculateHealthScore(expenseRatio, savingsRate, balance) {
  let score = 55;
  score += Math.min(savingsRate * 80, 25);
  score -= Math.max(expenseRatio - 0.7, 0) * 70;
  if (balance < 0) score -= 20;
  if (expenseRatio <= 0.5) score += 12;
  if (expenseRatio > 1) score -= 12;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getHealthSummary(score, savingsRate, expenseRatio) {
  if (score >= 80) {
    return "Excellent position. Your spending is controlled and your savings buffer is growing.";
  }
  if (score >= 60) {
    return savingsRate > 0.15
      ? "Stable position. Keep the savings habit steady and watch category spikes."
      : "Decent position. A stronger savings target would improve your score.";
  }
  if (expenseRatio > 1) {
    return "Needs attention. Expenses are higher than income, so the budget needs a quick reset.";
  }
  return "Improving position. Reduce one recurring category and build a small monthly savings buffer.";
}

function getSavingsRecommendation(totals, largestCategory) {
  if (totals.income <= 0) {
    return "Add income first so the app can calculate a realistic monthly savings target.";
  }
  const targetSavings = totals.income * 0.2;
  if (totals.savings >= targetSavings) {
    return `You are meeting a 20% savings target. Consider setting aside ${formatMoney(targetSavings)} before spending each month.`;
  }
  const gap = targetSavings - totals.savings;
  if (largestCategory) {
    return `Aim to save another ${formatMoney(gap)}. The easiest first move is trimming ${largestCategory.category}, your largest expense category.`;
  }
  return `Aim to save another ${formatMoney(gap)} to reach a 20% savings target.`;
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
              ${isIncome ? "Record scholarships, salary, freelance work, and other money coming in." : "Track spending across rent, food, study, transport, and daily life."}
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
            <label for="amount">Amount</label>
            <input id="amount" name="amount" type="number" min="0" step="0.01" value="${escapeHtml(formData.amount)}" placeholder="0.00" required />
          </div>
          <div class="field">
            <label for="category">Category</label>
            <select id="category" name="category" required>
              ${categories.length ? "" : '<option value="">Add a category first</option>'}
              ${categories
                .map(
                  (category) => `
                    <option value="${escapeHtml(category.name)}" ${category.name === formData.category ? "selected" : ""}>${escapeHtml(category.name)}</option>
                  `,
                )
                .join("")}
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
            <p class="card-description">Create, review, edit, and delete records.</p>
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
          <p class="card-description">Customize income and expense groups.</p>
        </div>
        <div class="card-content">
          <form id="category-form" class="grid">
            <div class="field">
              <label for="category-name">Name</label>
              <input id="category-name" name="name" placeholder="Category name" required />
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
          <p class="card-description">Existing groups used by transaction forms.</p>
        </div>
        <div class="card-content">
          <div class="category-list">
            ${state.categories
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
              .join("")}
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
              <p class="card-description">Pie chart based on expense categories.</p>
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
              <p class="card-description">Six-month comparison bar chart.</p>
            </div>
          </div>
        </div>
        <div class="card-content">${renderBarChart()}</div>
      </article>
    </div>
  `;
}

function renderPieChart() {
  const slices = state.categories
    .filter((category) => category.type === "expense")
    .map((category) => ({
      ...category,
      amount: state.transactions
        .filter(
          (transaction) =>
            transaction.type === "expense" && transaction.category === category.name,
        )
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
    }))
    .filter((category) => category.amount > 0);
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
                  ${escapeHtml(slice.name)}
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
                  <div class="bar income" title="Income ${formatMoney(month.income)}" style="height:${Math.max((month.income / maxValue) * 100, 3)}%"></div>
                  <div class="bar expense" title="Expenses ${formatMoney(month.expense)}" style="height:${Math.max((month.expense / maxValue) * 100, 3)}%"></div>
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

loadData();
render();
