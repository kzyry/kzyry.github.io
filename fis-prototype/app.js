// ========== STATE MANAGEMENT ==========
let currentUser = {
    name: '',
    role: '', // 'Продуктолог' | 'Андеррайтер' | 'Актуарий' | 'Методолог'
    canEdit: function(fieldOwner) {
        return this.role === fieldOwner;
    }
};

const AppState = {
    currentPage: 'dashboard',
    currentTab: 'business-context',
    products: [],
    currentProduct: null,
    autosaveTimer: null,
    filters: {
        status: 'all',
        partner: 'all',
        search: ''
    },
    // Block 5.1: Audit log for tracking all changes
    auditLog: []
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        hideLoginModal();
        initApp();
    } else {
        showLoginModal();
    }
});

function initApp() {
    loadProducts();
    loadAuditLog(); // Block 5.1: Load audit log from localStorage
    initNavigation();
    initTabs();
    initFormHandlers();
    initDynamicTables();
    initWYSIWYG();
    initRoleSections(); // Initialize role-based sections
    initFilters(); // Initialize product filters
    renderDashboard();
    updateUserProfile();
    applyRoleBasedAccess();
}

// ========== AUTHENTICATION ==========
function showLoginModal() {
    const modal = document.getElementById('login-modal');
    const loginName = document.getElementById('login-name');
    const loginBtn = document.getElementById('login-btn');
    const roleOptions = document.querySelectorAll('.role-option');

    let selectedRole = '';

    // Role selection
    roleOptions.forEach(option => {
        option.addEventListener('click', () => {
            roleOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedRole = option.dataset.role;
            loginBtn.disabled = !loginName.value || !selectedRole;
        });
    });

    // Name input
    loginName.addEventListener('input', () => {
        loginBtn.disabled = !loginName.value || !selectedRole;
    });

    // Login button
    loginBtn.addEventListener('click', () => {
        if (loginName.value && selectedRole) {
            login(selectedRole, loginName.value);
        }
    });

    modal.classList.add('active');
}

function hideLoginModal() {
    const modal = document.getElementById('login-modal');
    modal.classList.remove('active');
}

function login(role, name) {
    currentUser.role = role;
    currentUser.name = name;

    // Save to LocalStorage
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    hideLoginModal();
    initApp();
    showToast(`Добро пожаловать, ${name}! Вы вошли как ${role}`, 'success');
}

function logout() {
    // Clear current user
    currentUser = {
        name: '',
        role: '',
        canEdit: function(fieldOwner) {
            return this.role === fieldOwner;
        }
    };

    // Remove from LocalStorage
    localStorage.removeItem('currentUser');

    // Reset filters
    AppState.filters = {
        status: 'all',
        partner: 'all',
        search: ''
    };

    // Show login modal
    showLoginModal();

    // Optional: reload page to reset state
    location.reload();
}

function updateUserProfile() {
    const userName = document.querySelector('.user-name');
    const userRole = document.querySelector('.user-role');
    const avatar = document.querySelector('.avatar');

    if (userName) userName.textContent = currentUser.name;
    if (userRole) userRole.textContent = currentUser.role;
    if (avatar) avatar.textContent = currentUser.name.substring(0, 2).toUpperCase();
}

// ========== ROLE-BASED ACCESS CONTROL ==========
function applyRoleBasedAccess() {
    // Apply color coding to role sections
    applyRoleSectionColors();

    // Find all fields with data-role-owner
    const fields = document.querySelectorAll('[data-role-owner]');

    fields.forEach(field => {
        const owner = field.getAttribute('data-role-owner');

        if (!currentUser.canEdit(owner)) {
            // Disable field
            if (field.tagName === 'INPUT' || field.tagName === 'SELECT' || field.tagName === 'TEXTAREA') {
                field.disabled = true;
                field.style.opacity = '0.6';
                field.style.cursor = 'not-allowed';

                // Add tooltip
                field.title = `Это поле заполняет ${owner}`;
            } else if (field.classList.contains('multi-select-container')) {
                // Disable all checkboxes inside
                const checkboxes = field.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    cb.disabled = true;
                    cb.style.cursor = 'not-allowed';
                });
                field.style.opacity = '0.6';
                field.title = `Это поле заполняет ${owner}`;
            }
        }
    });

    // Disable KV tables based on role
    const kvAssetsSection = document.getElementById('kv-assets-section');
    const kvStandardSection = document.getElementById('kv-standard-section');

    if (currentUser.role !== 'Актуарий') {
        disableSection(kvAssetsSection, 'Актуарий');
        disableSection(kvStandardSection, 'Актуарий');
    }

    // Disable contract template tab for non-Методолог
    const contractEditor = document.getElementById('template-editor');
    if (contractEditor && currentUser.role !== 'Методолог') {
        contractEditor.contentEditable = 'false';
        contractEditor.style.opacity = '0.6';
        contractEditor.style.cursor = 'not-allowed';
        contractEditor.title = 'Редактирование доступно только Методологу';
    }
}

function disableSection(section, owner) {
    if (!section) return;

    const inputs = section.querySelectorAll('input, select, textarea, button');
    inputs.forEach(input => {
        if (!input.classList.contains('btn-text')) { // Don't disable back button
            input.disabled = true;
            input.style.opacity = '0.6';
            input.title = `Эта секция доступна только для ${owner}`;
        }
    });
}

// ========== ROLE-BASED SECTIONS ==========
function initRoleSections() {
    // Add toggle functionality to all role section headers
    const headers = document.querySelectorAll('.role-section-header');

    headers.forEach(header => {
        header.addEventListener('click', () => {
            const section = header.closest('.role-section');
            section.classList.toggle('collapsed');

            // Update toggle text
            const toggleText = header.querySelector('.toggle-text');
            if (section.classList.contains('collapsed')) {
                toggleText.textContent = 'Развернуть';
            } else {
                toggleText.textContent = 'Свернуть';
            }
        });
    });

    // Apply color coding based on user role
    applyRoleSectionColors();
}

function applyRoleSectionColors() {
    const roleSections = document.querySelectorAll('.role-section');

    roleSections.forEach(section => {
        const sectionRole = section.getAttribute('data-role');
        const badge = section.querySelector('.role-section-badge');
        const statusIcon = badge.querySelector('.status-icon');
        const statusText = badge.querySelector('.status-text');

        if (currentUser.role === sectionRole) {
            // Editable - green
            section.classList.remove('readonly');
            section.classList.add('editable');
            statusIcon.textContent = '✅';
            statusText.textContent = 'Вы можете редактировать';

            // Enable all fields in this section
            enableSectionFields(section);
        } else {
            // Read-only - red
            section.classList.remove('editable');
            section.classList.add('readonly');
            statusIcon.textContent = '🔒';
            statusText.textContent = 'Только просмотр';

            // Disable all fields in this section
            disableSectionFields(section, sectionRole);
        }
    });
}

function enableSectionFields(section) {
    const fields = section.querySelectorAll('input, select, textarea, button');
    fields.forEach(field => {
        // Don't enable close modal buttons
        if (!field.classList.contains('close-modal')) {
            field.disabled = false;
            field.style.opacity = '1';
            field.style.cursor = 'default';
            field.title = '';

            if (field.tagName === 'TEXTAREA' || field.id === 'template-editor') {
                field.contentEditable = 'true';
            }
        }
    });
}

function disableSectionFields(section, roleName) {
    const fields = section.querySelectorAll('input, select, textarea, button');
    fields.forEach(field => {
        field.disabled = true;
        field.style.opacity = '0.6';
        field.style.cursor = 'not-allowed';
        field.title = `Эти поля редактирует ${roleName}`;

        if (field.tagName === 'TEXTAREA' || field.id === 'template-editor') {
            field.contentEditable = 'false';
        }
    });

    // Also disable contenteditable divs
    const editableDivs = section.querySelectorAll('[contenteditable]');
    editableDivs.forEach(div => {
        div.contentEditable = 'false';
        div.style.opacity = '0.6';
        div.style.cursor = 'not-allowed';
        div.title = `Это редактирует ${roleName}`;
    });
}

// ========== STATUS MODEL ==========
const STATUS_TRANSITIONS = {
    'draft': ['approval'],
    'approval': ['approved', 'draft'],
    'approved': ['approval', 'sent'],
    'sent': []
};

function canTransitionTo(currentStatus, newStatus) {
    return STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
}

function changeStatus(product, newStatus, comment = '') {
    if (!product) return false;

    if (!canTransitionTo(product.status, newStatus)) {
        showToast('Невозможный переход статуса', 'error');
        return false;
    }

    if (!product.statusHistory) product.statusHistory = [];
    product.statusHistory.push({
        status: newStatus,
        date: new Date().toISOString(),
        changedBy: currentUser.name,
        comment
    });

    product.status = newStatus;
    product.updatedAt = new Date().toISOString();
    saveProducts();

    // Block 5.3: Log status change
    logAuditEntry(
        'status_change',
        product.id,
        product.data?.marketingName || 'Без названия',
        { newStatus, comment }
    );

    return true;
}

function approveByRole(product, role, comment = '') {
    if (!product.approvals) {
        product.approvals = {
            'Продуктолог': { approved: false, comment: '', date: null },
            'Андеррайтер': { approved: false, comment: '', date: null },
            'Актуарий': { approved: false, comment: '', date: null },
            'Методолог': { approved: false, comment: '', date: null }
        };
    }

    product.approvals[role] = {
        approved: true,
        comment: comment,
        date: new Date().toISOString()
    };

    // Check if all approved
    const allApproved = Object.values(product.approvals).every(a => a.approved);
    if (allApproved && product.status === 'approval') {
        changeStatus(product, 'approved', 'Автоматическое согласование');
        showToast('Все роли согласовали! Продукт переведен в статус "Согласовано"', 'success');
    }

    saveProducts();

    // Block 5.3: Log approval
    logAuditEntry(
        'approve',
        product.id,
        product.data?.marketingName || 'Без названия',
        { role, comment }
    );

    renderApprovalPanel(product);
}

function rejectByRole(product, role, comment) {
    if (!comment) {
        showToast('Укажите причину отклонения', 'error');
        return;
    }

    product.approvals[role] = {
        approved: false,
        comment: comment,
        date: new Date().toISOString()
    };

    changeStatus(product, 'draft', `Отклонено: ${role} - ${comment}`);
    saveProducts();

    // Block 5.3: Log rejection
    logAuditEntry(
        'reject',
        product.id,
        product.data?.marketingName || 'Без названия',
        { role, comment }
    );

    showToast('Продукт отклонен и возвращен в черновик', 'info');
    updateApprovalButton(product);
    renderApprovalPanel(product);
}

function renderApprovalPanel(product) {
    const panel = document.getElementById('approval-panel');
    if (!panel || !product) return;

    // Always show approval panel
    panel.style.display = 'block';

    const roleMap = {
        'Продуктолог': 'productolog',
        'Андеррайтер': 'underwriter',
        'Актуарий': 'actuary',
        'Методолог': 'methodologist'
    };

    Object.keys(roleMap).forEach(role => {
        const statusEl = document.getElementById(`approval-status-${roleMap[role]}`);
        const actionsEl = document.getElementById(`approval-actions-${roleMap[role]}`);
        const cardEl = statusEl?.closest('.approval-card');

        if (!product.approvals || !product.approvals[role]) return;

        const approval = product.approvals[role];

        // Remove previous highlight
        if (cardEl) {
            cardEl.classList.remove('current-user-card');
        }

        if (approval.approved) {
            statusEl.innerHTML = `<span style="color: var(--accent-green);">✓ Согласовано</span><br><small>${approval.comment || ''}</small><br><small>${new Date(approval.date).toLocaleDateString('ru-RU')}</small>`;
        } else {
            statusEl.innerHTML = '<span style="color: var(--text-muted);">Ожидает согласования</span>';

            // Highlight current user's card
            if (currentUser.role === role && cardEl) {
                cardEl.classList.add('current-user-card');
            }
        }

        // Always clear actions
        if (actionsEl) {
            actionsEl.innerHTML = '';
        }
    });
}

function approveProduct() {
    if (AppState.currentProduct) {
        const comment = prompt('Комментарий (необязательно):') || '';
        approveByRole(AppState.currentProduct, currentUser.role, comment);
    }
}

function showRejectModal() {
    const comment = prompt('Укажите причину отклонения (обязательно):');
    if (comment) {
        rejectByRole(AppState.currentProduct, currentUser.role, comment);
    }
}

function updateApprovalButton(product) {
    const btn = document.getElementById('send-approval-btn');
    if (!btn || !product) return;

    const currentApproval = product.approvals?.[currentUser.role];
    const isCurrentRoleApproved = currentApproval?.approved || false;

    if (product.status === 'draft') {
        btn.textContent = 'Отправить на согласование';
        btn.style.display = 'inline-block';
        btn.disabled = false;
    } else if (product.status === 'approval') {
        if (isCurrentRoleApproved) {
            btn.textContent = 'Уже согласовано';
            btn.disabled = true;
            btn.style.display = 'inline-block';
        } else {
            btn.textContent = 'Согласовать';
            btn.disabled = false;
            btn.style.display = 'inline-block';
        }
    } else if (product.status === 'approved') {
        btn.textContent = 'Отправить в ЦБ';
        btn.disabled = false;
        btn.style.display = 'inline-block';
    } else if (product.status === 'sent') {
        btn.textContent = 'Отправлено в ЦБ';
        btn.disabled = true;
        btn.style.display = 'inline-block';
    }
}

function handleApprovalButtonClick() {
    const product = AppState.currentProduct;
    if (!product) return;

    if (product.status === 'draft') {
        // Send to approval and auto-approve by current role
        if (validateProduct()) {
            if (changeStatus(product, 'approval')) {
                saveProduct('approval');
                // Auto-approve by current user's role
                approveByRole(product, currentUser.role, 'Автоматическое согласование при отправке');
                updateApprovalButton(product);
                showToast('Продукт отправлен на согласование и согласован вами', 'success');
            }
        }
    } else if (product.status === 'approval') {
        // Approve by current role
        const comment = prompt('Комментарий (необязательно):') || '';
        approveByRole(product, currentUser.role, comment);
        updateApprovalButton(product);
    } else if (product.status === 'approved') {
        // Send to CB
        if (changeStatus(product, 'sent')) {
            saveProduct('sent');
            updateApprovalButton(product);
            renderApprovalPanel(product);
            showToast('Продукт отправлен в ЦБ', 'success');
        }
    }
}

// ========== NAVIGATION ==========
function initNavigation() {
    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;

            if (page === 'dashboard') {
                switchPage('dashboard');
            } else if (page === 'archive') {
                switchPage('archive');
                renderArchivePage();
            } else if (page === 'settings') {
                switchPage('settings');
                renderSettingsPage();
            } else if (page === 'analytics') {
                switchPage('analytics');
                renderAnalyticsPage();
            }
        });
    });

    // Create product button
    document.getElementById('create-product-btn').addEventListener('click', () => {
        createNewProduct();
    });

    // Back to dashboard
    document.getElementById('back-to-dashboard').addEventListener('click', () => {
        switchPage('dashboard');
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите выйти?')) {
            logout();
        }
    });
}

function switchPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${pageName}-page`).classList.add('active');
    AppState.currentPage = pageName;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });
}

// ========== TABS ==========
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    AppState.currentTab = tabName;
}

// ========== FORM HANDLERS ==========
function initFormHandlers() {
    // Partner conditional field
    const partnerSelect = document.getElementById('partner');
    const newPartnerGroup = document.getElementById('new-partner-group');
    const newPartnerInput = document.getElementById('new-partner-name');

    partnerSelect.addEventListener('change', () => {
        if (partnerSelect.value === 'new') {
            newPartnerGroup.style.display = 'block';
            newPartnerInput.required = true;
            showToast('Введите название нового партнёра', 'info');
        } else {
            newPartnerGroup.style.display = 'none';
            newPartnerInput.required = false;
        }
    });

    // Asset-linked product checkbox
    const assetLinkedCheckbox = document.getElementById('asset-linked');
    const kvAssetsSection = document.getElementById('kv-assets-section');
    const kvStandardSection = document.getElementById('kv-standard-section');

    assetLinkedCheckbox.addEventListener('change', () => {
        if (assetLinkedCheckbox.checked) {
            kvAssetsSection.style.display = 'block';
            kvStandardSection.style.display = 'none';
            showToast('Переключено на "Лестничное КВ (ДСЖ и Активы)"', 'success');
        } else {
            kvAssetsSection.style.display = 'none';
            kvStandardSection.style.display = 'block';
            showToast('Переключено на "Лестничное КВ"', 'success');
        }
    });

    // Fixed rate checkbox
    const fixedRateCheckbox = document.getElementById('fixed-rate');
    const exchangeRateGroup = document.getElementById('exchange-rate-group');
    const exchangeRateInput = document.getElementById('exchange-rate');

    fixedRateCheckbox.addEventListener('change', () => {
        if (fixedRateCheckbox.checked) {
            exchangeRateGroup.style.display = 'block';
            exchangeRateInput.required = true;
        } else {
            exchangeRateGroup.style.display = 'none';
            exchangeRateInput.required = false;
        }
    });

    // Fixed premiums checkbox
    const fixedPremiumsCheckbox = document.getElementById('fixed-premiums');
    const fixedPremiumsSection = document.getElementById('fixed-premiums-section');

    fixedPremiumsCheckbox.addEventListener('change', () => {
        if (fixedPremiumsCheckbox.checked) {
            fixedPremiumsSection.style.display = 'block';
            generateFixedPremiumsTables();
        } else {
            fixedPremiumsSection.style.display = 'none';
        }
    });

    // Save buttons
    document.getElementById('save-draft-btn').addEventListener('click', () => {
        saveProduct('draft');
    });

    document.getElementById('send-approval-btn').addEventListener('click', () => {
        handleApprovalButtonClick();
    });

    // Autosave on input
    document.querySelectorAll('#business-context-tab input, #business-context-tab select').forEach(field => {
        field.addEventListener('input', () => {
            triggerAutosave();
        });
    });
}

// ========== DYNAMIC TABLES ==========
function initDynamicTables() {
    // Currency and Frequency checkboxes trigger N×M table generation
    const currencyCheckboxes = document.querySelectorAll('input[name="currency"]');
    const frequencyCheckboxes = document.querySelectorAll('input[name="frequency"]');

    currencyCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            generateMinPremiumTable();
            generateMinSumTable();
            generateFixedPremiumsTables();
            // Block 3: new tables
            generateMaxPremiumByAgeTables();
            generateMaxPremiumSKTables();
            generateMaxSumRiskTable();
        });
    });

    frequencyCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            generateMinPremiumTable();
            generateFixedPremiumsTables();
            // Block 3: new tables
            generateFixedSumsTables();
        });
    });

    // Add row buttons for KV tables
    document.getElementById('add-kv-assets-row').addEventListener('click', () => {
        addKVRow('assets');
    });

    document.getElementById('add-kv-standard-row').addEventListener('click', () => {
        addKVRow('standard');
    });
}

function generateMinPremiumTable() {
    const currencies = getSelectedValues('input[name="currency"]');
    const frequencies = getSelectedValues('input[name="frequency"]');
    const tbody = document.querySelector('#min-premium-table tbody');

    if (currencies.length === 0 || frequencies.length === 0) {
        tbody.innerHTML = '<tr class="empty-state-row"><td colspan="3">Выберите валюты и периодичность оплаты для генерации таблицы</td></tr>';
        return;
    }

    // N × M formula
    const rows = [];
    currencies.forEach(currency => {
        frequencies.forEach(frequency => {
            rows.push({ currency, frequency, amount: '' });
        });
    });

    tbody.innerHTML = rows.map((row, index) => `
        <tr class="new-row">
            <td>${row.currency}</td>
            <td>${row.frequency}</td>
            <td>
                <input type="number"
                       min="0"
                       step="0.01"
                       placeholder="Введите сумму"
                       data-currency="${row.currency}"
                       data-frequency="${row.frequency}"
                       required>
            </td>
        </tr>
    `).join('');

    showToast(`Сгенерировано ${rows.length} строк (${currencies.length} × ${frequencies.length})`, 'success');
}

function generateMinSumTable() {
    const currencies = getSelectedValues('input[name="currency"]');
    const tbody = document.querySelector('#min-sum-table tbody');

    if (currencies.length === 0) {
        tbody.innerHTML = '<tr class="empty-state-row"><td colspan="2">Выберите валюты для генерации таблицы</td></tr>';
        return;
    }

    tbody.innerHTML = currencies.map(currency => `
        <tr class="new-row">
            <td>${currency}</td>
            <td>
                <input type="number"
                       min="0"
                       step="0.01"
                       placeholder="Введите ограничение"
                       data-currency="${currency}"
                       required>
            </td>
        </tr>
    `).join('');

    showToast(`Сгенерировано ${currencies.length} строк по валютам`, 'info');
}

function generateFixedPremiumsTables() {
    const frequencies = getSelectedValues('input[name="frequency"]');
    const container = document.getElementById('fixed-premiums-container');

    if (frequencies.length === 0) {
        container.innerHTML = '<p class="help-text">Выберите периодичность оплаты</p>';
        return;
    }

    container.innerHTML = frequencies.map(frequency => `
        <div class="table-group">
            <h4>Группа: ${frequency}</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Срок страхования (лет)</th>
                        <th>Фиксированная премия</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="fixed-premiums-${frequency.replace(/\s/g, '-')}">
                    <tr class="empty-state-row">
                        <td colspan="3">Нажмите "+ Добавить" для добавления строки</td>
                    </tr>
                </tbody>
            </table>
            <button class="btn btn-secondary" onclick="addFixedPremiumRow('${frequency}')">+ Добавить фиксированную премию</button>
        </div>
    `).join('');
}

function addFixedPremiumRow(frequency) {
    const tbodyId = `fixed-premiums-${frequency.replace(/\s/g, '-')}`;
    const tbody = document.getElementById(tbodyId);

    // Remove empty state
    const emptyRow = tbody.querySelector('.empty-state-row');
    if (emptyRow) emptyRow.remove();

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>
            <input type="number" min="1" max="30" placeholder="Срок (лет)" required>
        </td>
        <td>
            <input type="number" min="0" step="0.01" placeholder="Премия" required>
        </td>
        <td>
            <button class="delete-btn" onclick="deleteRow(this)">🗑</button>
        </td>
    `;
    tbody.appendChild(row);
}

function addKVRow(type) {
    const tableId = type === 'assets' ? 'kv-assets-table' : 'kv-standard-table';
    const tbody = document.querySelector(`#${tableId} tbody`);

    const row = document.createElement('tr');
    if (type === 'assets') {
        // Block 4.1: Updated to 10 columns
        row.innerHTML = `
            <td><input type="number" min="1" max="30" placeholder="5" required data-role-owner="Актуарий"></td>
            <td><input type="text" placeholder="RU000A0JX0A1" required data-role-owner="Актуарий"></td>
            <td><input type="number" step="0.01" placeholder="7.50" data-role-owner="Актуарий"></td>
            <td><input type="number" step="0.01" placeholder="1000000" data-role-owner="Актуарий"></td>
            <td><input type="number" step="0.01" placeholder="500000" data-role-owner="Актуарий"></td>
            <td><input type="number" step="0.01" placeholder="5000" data-role-owner="Актуарий"></td>
            <td><input type="number" step="0.01" placeholder="1000" data-role-owner="Актуарий"></td>
            <td><input type="number" step="0.001" placeholder="0.027" data-role-owner="Актуарий"></td>
            <td><input type="checkbox" data-role-owner="Актуарий"></td>
            <td><input type="checkbox" data-role-owner="Актуарий"></td>
            <td><button class="delete-btn" onclick="deleteRow(this)">🗑</button></td>
        `;
    } else {
        row.innerHTML = `
            <td><input type="text" placeholder="Код стратегии"></td>
            <td><input type="text" placeholder="01.01.2024 - бессрочно"></td>
            <td><input type="number" min="1" placeholder="5"></td>
            <td>
                <select>
                    <option value="">Выберите</option>
                    <option value="RUB">RUB</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                </select>
            </td>
            <td><input type="text" placeholder="Ежегодно"></td>
            <td><input type="text" placeholder="Базовая"></td>
            <td><input type="number" step="0.01" placeholder="7.50"></td>
            <td><input type="number" step="0.01" placeholder="35.00"></td>
            <td><input type="number" step="0.001" placeholder="0.027"></td>
            <td><input type="number" step="0.01" placeholder="100"></td>
            <td><input type="number" step="0.01" placeholder="20.00"></td>
            <td><button class="delete-btn" onclick="deleteRow(this)">🗑</button></td>
        `;
    }
    tbody.appendChild(row);
    showToast('Строка добавлена', 'success');
}

function addKVRowWithData(type, data) {
    const tableId = type === 'assets' ? 'kv-assets-table' : 'kv-standard-table';
    const tbody = document.querySelector(`#${tableId} tbody`);

    const row = document.createElement('tr');
    if (type === 'assets') {
        // Block 4.1: Updated to 10 columns
        row.innerHTML = `
            <td><input type="number" min="1" max="30" value="${data.term || ''}" required data-role-owner="Актуарий"></td>
            <td><input type="text" value="${data.idIsin || ''}" required data-role-owner="Актуарий"></td>
            <td><input type="number" step="0.01" value="${data.kvRate || ''}" data-role-owner="Актуарий"></td>
            <td><input type="number" step="0.01" value="${data.icValue || ''}" data-role-owner="Актуарий"></td>
            <td><input type="number" step="0.01" value="${data.mfValue || ''}" data-role-owner="Актуарий"></td>
            <td><input type="number" step="0.01" value="${data.openingCosts || ''}" data-role-owner="Актуарий"></td>
            <td><input type="number" step="0.01" value="${data.withdrawalFee || ''}" data-role-owner="Актуарий"></td>
            <td><input type="number" step="0.001" value="${data.rko || ''}" data-role-owner="Актуарий"></td>
            <td><input type="checkbox" ${data.standardConditions ? 'checked' : ''} data-role-owner="Актуарий"></td>
            <td><input type="checkbox" ${data.udApproval ? 'checked' : ''} data-role-owner="Актуарий"></td>
            <td><button class="delete-btn" onclick="deleteRow(this)">🗑</button></td>
        `;
    } else {
        row.innerHTML = `
            <td><input type="text" value="${data.strategyCode || ''}"></td>
            <td><input type="text" value="${data.period || ''}"></td>
            <td><input type="number" min="1" value="${data.term || ''}"></td>
            <td>
                <select>
                    <option value="">Выберите</option>
                    <option value="RUB" ${data.currency === 'RUB' ? 'selected' : ''}>RUB</option>
                    <option value="EUR" ${data.currency === 'EUR' ? 'selected' : ''}>EUR</option>
                    <option value="USD" ${data.currency === 'USD' ? 'selected' : ''}>USD</option>
                </select>
            </td>
            <td><input type="text" value="${data.frequency || ''}"></td>
            <td><input type="text" value="${data.variant || ''}"></td>
            <td><input type="number" step="0.01" value="${data.rateISG || ''}"></td>
            <td><input type="number" step="0.01" value="${data.cashbackNSG || ''}"></td>
            <td><input type="number" step="0.001" value="${data.rko || ''}"></td>
            <td><input type="number" step="0.01" value="${data.ku || ''}"></td>
            <td><input type="number" step="0.01" value="${data.kv || ''}"></td>
            <td><button class="delete-btn" onclick="deleteRow(this)">🗑</button></td>
        `;
    }
    tbody.appendChild(row);
}

// ========== BLOCK 3: NEW TABLES ==========

// Block 3.2: Max Premium by Age (grouped by currency)
function generateMaxPremiumByAgeTables() {
    const currencies = getSelectedValues('input[name="currency"]');
    const container = document.getElementById('max-premium-by-age-container');

    if (currencies.length === 0) {
        container.innerHTML = '<p class="help-text">Выберите валюты договора</p>';
        return;
    }

    container.innerHTML = currencies.map(currency => `
        <div class="table-group">
            <h4>Валюта: ${currency}</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Возраст (от)</th>
                        <th>Возраст (до)</th>
                        <th>Максимальная премия *</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="max-premium-age-${currency}">
                    <tr class="empty-state-row">
                        <td colspan="4">Нажмите "+ Добавить" для добавления строки</td>
                    </tr>
                </tbody>
            </table>
            <button class="btn btn-secondary" onclick="addMaxPremiumAgeRow('${currency}')" data-role-owner="Андеррайтер">+ Добавить возрастной диапазон</button>
        </div>
    `).join('');
}

function addMaxPremiumAgeRow(currency) {
    const tbodyId = `max-premium-age-${currency}`;
    const tbody = document.getElementById(tbodyId);

    const emptyRow = tbody.querySelector('.empty-state-row');
    if (emptyRow) emptyRow.remove();

    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="number" min="0" max="100" placeholder="18" required data-role-owner="Андеррайтер"></td>
        <td><input type="number" min="0" max="100" placeholder="65" required data-role-owner="Андеррайтер"></td>
        <td><input type="number" min="0" step="0.01" placeholder="1000000" required data-role-owner="Андеррайтер"></td>
        <td><button class="delete-btn" onclick="deleteRow(this)">🗑</button></td>
    `;
    tbody.appendChild(row);
}

// Block 3.3: Max Premium with SK Approval (grouped by currency)
function generateMaxPremiumSKTables() {
    const currencies = getSelectedValues('input[name="currency"]');
    const container = document.getElementById('max-premium-sk-container');

    if (currencies.length === 0) {
        container.innerHTML = '<p class="help-text">Выберите валюты договора</p>';
        return;
    }

    container.innerHTML = currencies.map(currency => `
        <div class="table-group">
            <h4>Валюта: ${currency}</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Условие</th>
                        <th>Максимальная премия с согласованием СК *</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="max-premium-sk-${currency}">
                    <tr class="empty-state-row">
                        <td colspan="3">Нажмите "+ Добавить" для добавления строки</td>
                    </tr>
                </tbody>
            </table>
            <button class="btn btn-secondary" onclick="addMaxPremiumSKRow('${currency}')" data-role-owner="Андеррайтер">+ Добавить условие</button>
        </div>
    `).join('');
}

function addMaxPremiumSKRow(currency) {
    const tbodyId = `max-premium-sk-${currency}`;
    const tbody = document.getElementById(tbodyId);

    const emptyRow = tbody.querySelector('.empty-state-row');
    if (emptyRow) emptyRow.remove();

    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" placeholder="При страховой сумме > 10 млн" required data-role-owner="Андеррайтер"></td>
        <td><input type="number" min="0" step="0.01" placeholder="50000000" required data-role-owner="Андеррайтер"></td>
        <td><button class="delete-btn" onclick="deleteRow(this)">🗑</button></td>
    `;
    tbody.appendChild(row);
}

// Block 3.4: Max Sum Risk Table (simple table by currency)
function generateMaxSumRiskTable() {
    const currencies = getSelectedValues('input[name="currency"]');
    const tbody = document.querySelector('#max-sum-risk-table tbody');

    if (currencies.length === 0) {
        tbody.innerHTML = '<tr class="empty-state-row"><td colspan="2">Выберите валюты для генерации таблицы</td></tr>';
        return;
    }

    tbody.innerHTML = currencies.map(currency => `
        <tr>
            <td>${currency}</td>
            <td><input type="number" min="0" step="0.01" placeholder="Введите ограничение" data-currency="${currency}" data-role-owner="Андеррайтер"></td>
        </tr>
    `).join('');
}

// Block 3.5: Fixed Sums Table (grouped by payment frequency)
function generateFixedSumsTables() {
    const frequencies = getSelectedValues('input[name="frequency"]');
    const container = document.getElementById('fixed-sums-container');

    if (frequencies.length === 0) {
        container.innerHTML = '<p class="help-text">Выберите периодичность оплаты</p>';
        return;
    }

    container.innerHTML = frequencies.map(frequency => `
        <div class="table-group">
            <h4>Группа: ${frequency}</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Срок страхования (лет)</th>
                        <th>Фиксированная страховая сумма</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="fixed-sums-${frequency.replace(/\s/g, '-')}">
                    <tr class="empty-state-row">
                        <td colspan="3">Нажмите "+ Добавить" для добавления строки</td>
                    </tr>
                </tbody>
            </table>
            <button class="btn btn-secondary" onclick="addFixedSumRow('${frequency}')" data-role-owner="Андеррайтер">+ Добавить фиксированную сумму</button>
        </div>
    `).join('');
}

function addFixedSumRow(frequency) {
    const tbodyId = `fixed-sums-${frequency.replace(/\s/g, '-')}`;
    const tbody = document.getElementById(tbodyId);

    const emptyRow = tbody.querySelector('.empty-state-row');
    if (emptyRow) emptyRow.remove();

    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="number" min="1" max="30" placeholder="Срок (лет)" required data-role-owner="Андеррайтер"></td>
        <td><input type="number" min="0" step="0.01" placeholder="Страховая сумма" required data-role-owner="Андеррайтер"></td>
        <td><button class="delete-btn" onclick="deleteRow(this)">🗑</button></td>
    `;
    tbody.appendChild(row);
}

function deleteRow(btn) {
    if (confirm('Удалить эту строку? Это действие нельзя отменить.')) {
        btn.closest('tr').remove();
        showToast('Строка удалена', 'info');
    }
}

// ========== WYSIWYG EDITOR ==========
function initWYSIWYG() {
    const editor = document.getElementById('template-editor');
    const fieldItems = document.querySelectorAll('.field-item');

    // Insert dynamic fields on click
    fieldItems.forEach(item => {
        item.addEventListener('click', () => {
            const field = item.dataset.field;
            insertAtCursor(editor, ` ${field} `);
            showToast(`Поле "${field}" добавлено`, 'success');
        });
    });

    // Preview button
    document.getElementById('preview-template-btn').addEventListener('click', () => {
        previewTemplate();
    });

    // Export HTML button
    document.getElementById('export-html-btn').addEventListener('click', () => {
        exportHTML();
    });

    // Close modal
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('preview-modal').classList.remove('active');
    });
}

function insertAtCursor(element, text) {
    element.focus();
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

function previewTemplate() {
    const editor = document.getElementById('template-editor');
    let html = editor.innerHTML;

    // Replace dynamic fields with test data
    const testData = {
        'product.marketing_name': 'Стратегия на пять. Гарант',
        'product.code': 'IBGVTBROZ',
        'product.partner': 'ВТБ Розница',
        'contract.number': '000001',
        'contract.date': '13.05.2024',
        'contract.currency': 'RUB'
    };

    Object.keys(testData).forEach(key => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        html = html.replace(regex, testData[key]);
    });

    document.getElementById('preview-content').innerHTML = html;
    document.getElementById('preview-modal').classList.add('active');
}

function exportHTML() {
    const editor = document.getElementById('template-editor');
    const html = editor.innerHTML;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contract-template.html';
    a.click();
    URL.revokeObjectURL(url);

    showToast('HTML экспортирован', 'success');
}

// ========== PRODUCT MANAGEMENT ==========
function createNewProduct() {
    AppState.currentProduct = {
        id: Date.now(),
        status: 'draft',
        createdAt: new Date().toISOString(),
        data: {}
    };
    clearForm();
    switchPage('product-edit');
    document.getElementById('product-title').textContent = 'Новый продукт';

    // Update approval button for new product
    setTimeout(() => {
        updateApprovalButton(AppState.currentProduct);
        renderApprovalPanel(AppState.currentProduct);
    }, 100);
}

function saveProduct(status) {
    const productData = collectFormData();

    if (!AppState.currentProduct) {
        AppState.currentProduct = {
            id: Date.now(),
            createdAt: new Date().toISOString()
        };
    }

    AppState.currentProduct.status = status;
    AppState.currentProduct.data = productData;
    AppState.currentProduct.updatedAt = new Date().toISOString();

    // Update or add to products array
    const existingIndex = AppState.products.findIndex(p => p.id === AppState.currentProduct.id);
    const isNewProduct = existingIndex < 0;

    if (existingIndex >= 0) {
        AppState.products[existingIndex] = AppState.currentProduct;
    } else {
        AppState.products.push(AppState.currentProduct);
    }

    saveProducts();

    // Block 5.3: Log audit entry
    logAuditEntry(
        isNewProduct ? 'create' : 'update',
        AppState.currentProduct.id,
        productData.marketingName || 'Без названия',
        { status: status }
    );

    updatePartnerFilter();
    renderDashboard();

    const statusText = {
        'draft': 'Черновик сохранён',
        'approval': 'Отправлено на согласование',
        'approved': 'Согласовано',
        'sent': 'Отправлено в ЦБ'
    };

    showToast(statusText[status] || 'Сохранено', 'success');
    updateAutosaveStatus('сохранено');
}

function collectFormData() {
    return {
        priority: document.getElementById('priority').value,
        launchDate: document.getElementById('launch-date').value,
        closureDate: document.getElementById('closure-date').value,
        marketingName: document.getElementById('marketing-name').value,
        partner: document.getElementById('partner').value,
        newPartnerName: document.getElementById('new-partner-name').value,
        segment: document.getElementById('segment').value,
        agencyCode: document.getElementById('agency-code').value,
        productGroup: document.getElementById('product-group').value,
        productCode: document.getElementById('product-code').value,
        lkCardType: document.getElementById('lk-card-type').value,
        productSubtype: document.getElementById('product-subtype').value,
        assetLinked: document.getElementById('asset-linked').checked,
        investmentStrategy: document.getElementById('investment-strategy').checked,
        llob: document.getElementById('llob').value,
        currencies: getSelectedValues('input[name="currency"]'),
        frequencies: getSelectedValues('input[name="frequency"]'),
        fixedRate: document.getElementById('fixed-rate').checked,
        exchangeRate: document.getElementById('exchange-rate').value,
        fixedPremiums: document.getElementById('fixed-premiums').checked,
        guaranteedIncome: document.getElementById('guaranteed-income').checked,
        evaluationContract: document.getElementById('evaluation-contract').checked,
        specialOffer: document.getElementById('special-offer').checked,
        // Block 3.1: новые поля
        paymentFrequencies: getSelectedValues('input[name="payment-frequencies"]'),
        survivalPayoutOption: document.getElementById('survival-payout-option').value,
        guaranteedPayout: document.getElementById('guaranteed-payout').value,
        nonPaymentOption: document.getElementById('non-payment-option').checked,
        allowPremiumCalculation: document.getElementById('allow-premium-calculation').checked,
        // Block 3.1.4: новые поля страхового взноса
        maxInsuranceSum: document.getElementById('max-insurance-sum').value,
        maxInsuranceSumApproved: document.getElementById('max-insurance-sum-approved').value,
        setFixedInsuranceSum: document.getElementById('set-fixed-insurance-sum').checked,
        disableRiskInsuranceSum: document.getElementById('disable-risk-insurance-sum').checked,
        useThreePayments: document.getElementById('use-three-payments').checked,
        freeOptionAvailable: document.getElementById('free-option-available').checked,
        allowSumCalculation: document.getElementById('allow-sum-calculation').checked
    };
}

function validateProduct() {
    // Check only required fields that belong to current user's role or have no owner
    const requiredFields = [
        { id: 'priority', role: 'Продуктолог' },
        { id: 'launch-date', role: 'Продуктолог' },
        { id: 'marketing-name', role: 'Продуктолог' },
        { id: 'partner', role: 'Продуктолог' },
        { id: 'segment', role: 'Продуктолог' },
        { id: 'product-group', role: 'Продуктолог' }
    ];

    for (const fieldInfo of requiredFields) {
        // Only validate if field belongs to current user's role
        if (fieldInfo.role === currentUser.role) {
            const field = document.getElementById(fieldInfo.id);
            if (!field.value) {
                showToast(`Заполните поле: ${field.previousElementSibling.textContent}`, 'error');
                field.focus();
                return false;
            }
        }
    }

    // Check currencies and frequencies for Андеррайтер only
    if (currentUser.role === 'Андеррайтер') {
        const currencies = getSelectedValues('input[name="currency"]');
        if (currencies.length === 0) {
            showToast('Выберите хотя бы одну валюту', 'error');
            return false;
        }

        const frequencies = getSelectedValues('input[name="frequency"]');
        if (frequencies.length === 0) {
            showToast('Выберите хотя бы одну периодичность оплаты', 'error');
            return false;
        }
    }

    return true;
}

function clearForm() {
    document.querySelectorAll('#business-context-tab input, #business-context-tab select').forEach(field => {
        if (field.type === 'checkbox') {
            field.checked = false;
        } else {
            field.value = '';
        }
    });
}

// ========== DASHBOARD ==========
function renderDashboard() {
    updateMetrics();
    renderProductsList();
}

function updateMetrics() {
    const metrics = {
        draft: 0,
        approval: 0,
        approved: 0,
        sent: 0
    };

    AppState.products.forEach(product => {
        if (metrics.hasOwnProperty(product.status)) {
            metrics[product.status]++;
        }
    });

    document.querySelectorAll('.metric-card').forEach(card => {
        const status = card.classList.contains('yellow') ? 'draft' :
                      card.classList.contains('orange') ? 'approval' :
                      card.classList.contains('green') ? 'approved' : 'sent';
        card.querySelector('.metric-value').textContent = metrics[status];
    });
}

function getFilteredProducts() {
    let filtered = AppState.products;

    // Filter by status
    if (AppState.filters.status !== 'all') {
        filtered = filtered.filter(product => product.status === AppState.filters.status);
    }

    // Filter by partner
    if (AppState.filters.partner !== 'all') {
        filtered = filtered.filter(product => product.data.partner === AppState.filters.partner);
    }

    // Filter by search query
    if (AppState.filters.search) {
        const query = AppState.filters.search.toLowerCase();
        filtered = filtered.filter(product => {
            const marketingName = (product.data.marketingName || '').toLowerCase();
            const partner = (product.data.partner || '').toLowerCase();
            const productGroup = (product.data.productGroup || '').toLowerCase();
            const productCode = (product.data.productCode || '').toLowerCase();

            return marketingName.includes(query) ||
                   partner.includes(query) ||
                   productGroup.includes(query) ||
                   productCode.includes(query);
        });
    }

    return filtered;
}

function renderProductsList() {
    const listContainer = document.getElementById('products-list');
    const filteredProducts = getFilteredProducts();

    if (AppState.products.length === 0) {
        listContainer.innerHTML = '<div class="empty-state"><p>Нет созданных продуктов. Создайте первый продукт!</p></div>';
        return;
    }

    if (filteredProducts.length === 0) {
        listContainer.innerHTML = '<div class="empty-state"><p>Нет продуктов, соответствующих фильтрам.</p></div>';
        return;
    }

    listContainer.innerHTML = filteredProducts.map(product => {
        const statusClass = product.status === 'draft' ? 'draft' :
                           product.status === 'approval' ? 'approval' :
                           product.status === 'approved' ? 'approved' : 'sent';

        const statusText = product.status === 'draft' ? 'Черновик 🟡' :
                          product.status === 'approval' ? 'Согласование 🟠' :
                          product.status === 'approved' ? 'Согласовано ✅' : 'Отправлено в ЦБ 🔵';

        const progress = calculateProgress(product);

        return `
            <div class="product-card">
                <div class="product-header">
                    <div class="product-title">${product.data.marketingName || 'Без названия'}</div>
                    <div class="status-badge ${statusClass}">${statusText}</div>
                </div>
                <div class="product-meta">
                    ${product.data.partner || 'Партнёр не указан'} |
                    ${product.data.productGroup || 'Группа не указана'} |
                    Приоритет: ${product.data.priority || '-'}
                </div>
                <div class="product-meta">
                    Запуск: ${product.data.launchDate || '-'} | Заполнено: ${progress}%
                </div>
                <div class="product-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="progress-text">${progress}%</div>
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary" onclick="editProduct(${product.id})">Продолжить</button>
                    <button class="btn btn-secondary" onclick="copyProduct(${product.id})">Копировать</button>
                    <button class="btn btn-secondary" onclick="deleteProduct(${product.id})">🗑</button>
                </div>
            </div>
        `;
    }).join('');
}

function calculateProgress(product) {
    const totalFields = 15; // Basic required fields
    let filledFields = 0;

    const data = product.data;
    if (data.priority) filledFields++;
    if (data.launchDate) filledFields++;
    if (data.marketingName) filledFields++;
    if (data.partner) filledFields++;
    if (data.segment) filledFields++;
    if (data.productGroup) filledFields++;
    if (data.currencies && data.currencies.length > 0) filledFields++;
    if (data.frequencies && data.frequencies.length > 0) filledFields++;

    return Math.round((filledFields / totalFields) * 100);
}

// ========== FILTERS ==========
function initFilters() {
    const statusFilter = document.getElementById('filter-status');
    const partnerFilter = document.getElementById('filter-partner');
    const searchInput = document.getElementById('filter-search');

    if (!statusFilter || !partnerFilter || !searchInput) return;

    // Status filter change event
    statusFilter.addEventListener('change', (e) => {
        AppState.filters.status = e.target.value;
        renderProductsList();
    });

    // Partner filter change event
    partnerFilter.addEventListener('change', (e) => {
        AppState.filters.partner = e.target.value;
        renderProductsList();
    });

    // Search input event (with debounce)
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            AppState.filters.search = e.target.value;
            renderProductsList();
        }, 300); // 300ms debounce
    });

    // Update partner filter options
    updatePartnerFilter();
}

function updatePartnerFilter() {
    const partnerFilter = document.getElementById('filter-partner');
    if (!partnerFilter) return;

    // Get unique partners from products
    const partners = new Set();
    AppState.products.forEach(product => {
        if (product.data.partner) {
            partners.add(product.data.partner);
        }
    });

    // Clear existing options except the first one (Все)
    partnerFilter.innerHTML = '<option value="all">Партнёр: Все</option>';

    // Add partner options
    Array.from(partners).sort().forEach(partner => {
        const option = document.createElement('option');
        option.value = partner;
        option.textContent = partner;
        partnerFilter.appendChild(option);
    });
}

function editProduct(id) {
    const product = AppState.products.find(p => p.id === id);
    if (!product) return;

    AppState.currentProduct = product;
    loadProductData(product.data);
    switchPage('product-edit');
    document.getElementById('product-title').textContent = product.data.marketingName || 'Редактирование продукта';

    // Apply role-based access and render approval panel
    setTimeout(() => {
        applyRoleBasedAccess();
        updateApprovalButton(product);
        renderApprovalPanel(product);
    }, 200);
}

function loadProductData(data) {
    // Clear all checkboxes first
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

    // Load basic fields
    Object.keys(data).forEach(key => {
        const field = document.getElementById(kebabCase(key));
        if (field) {
            if (field.type === 'checkbox') {
                field.checked = data[key];
            } else {
                field.value = data[key];
            }
        }
    });

    // Load multi-selects
    if (data.currencies) {
        data.currencies.forEach(currency => {
            const checkbox = document.querySelector(`input[name="currency"][value="${currency}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }

    if (data.frequencies) {
        data.frequencies.forEach(frequency => {
            const checkbox = document.querySelector(`input[name="frequency"][value="${frequency}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }

    // Block 3.1: Load payment frequencies
    if (data.paymentFrequencies) {
        data.paymentFrequencies.forEach(frequency => {
            const checkbox = document.querySelector(`input[name="payment-frequencies"][value="${frequency}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }

    // Trigger conditional displays
    document.getElementById('partner').dispatchEvent(new Event('change'));
    document.getElementById('asset-linked').dispatchEvent(new Event('change'));
    document.getElementById('fixed-rate').dispatchEvent(new Event('change'));
    document.getElementById('fixed-premiums').dispatchEvent(new Event('change'));

    // Regenerate dynamic tables
    generateMinPremiumTable();
    generateMinSumTable();
    // Block 3: new tables
    generateMaxPremiumByAgeTables();
    generateMaxPremiumSKTables();
    generateMaxSumRiskTable();
    generateFixedSumsTables();

    // Load saved values into dynamic tables
    setTimeout(() => {
        if (data.minPremiums) {
            data.minPremiums.forEach(item => {
                const input = document.querySelector(`#min-premium-table input[data-currency="${item.currency}"][data-frequency="${item.frequency}"]`);
                if (input) input.value = item.amount;
            });
        }

        if (data.minSums) {
            data.minSums.forEach(item => {
                const input = document.querySelector(`#min-sum-table input[data-currency="${item.currency}"]`);
                if (input) input.value = item.amount;
            });
        }

        // Load KV tables
        if (data.kvStandard && !data.assetLinked) {
            const tbody = document.querySelector('#kv-standard-table tbody');
            tbody.innerHTML = '';
            data.kvStandard.forEach(row => {
                addKVRowWithData('standard', row);
            });
        }

        if (data.kvAssets && data.assetLinked) {
            const tbody = document.querySelector('#kv-assets-table tbody');
            tbody.innerHTML = '';
            data.kvAssets.forEach(row => {
                addKVRowWithData('assets', row);
            });
        }
    }, 100);
}

function copyProduct(id) {
    const product = AppState.products.find(p => p.id === id);
    if (!product) return;

    const newProduct = {
        ...product,
        id: Date.now(),
        status: 'draft',
        createdAt: new Date().toISOString(),
        data: {
            ...product.data,
            marketingName: (product.data.marketingName || 'Копия') + ' (копия)'
        }
    };

    AppState.products.push(newProduct);
    saveProducts();
    updatePartnerFilter();
    renderDashboard();
    showToast('Продукт скопирован', 'success');
}

function deleteProduct(id) {
    if (confirm('Удалить этот продукт? Это действие нельзя отменить.')) {
        const product = AppState.products.find(p => p.id === id);
        const productName = product ? (product.data?.marketingName || 'Без названия') : 'Неизвестный продукт';

        AppState.products = AppState.products.filter(p => p.id !== id);
        saveProducts();

        // Block 5.3: Log deletion
        logAuditEntry('delete', id, productName, {});

        updatePartnerFilter();
        renderDashboard();
        showToast('Продукт удалён', 'info');
    }
}

// ========== STORAGE ==========
function saveProducts() {
    localStorage.setItem('insurance_products', JSON.stringify(AppState.products));
}

function loadProducts() {
    const stored = localStorage.getItem('insurance_products');
    if (stored) {
        AppState.products = JSON.parse(stored);
    } else if (typeof loadTestData === 'function') {
        // Загрузить тестовые данные при первом запуске
        AppState.products = loadTestData();
        console.log('✅ Загружены тестовые данные: ' + AppState.products.length + ' продуктов');
    }
}

// Block 5.1: Audit log persistence
function saveAuditLog() {
    localStorage.setItem('audit_log', JSON.stringify(AppState.auditLog));
}

function loadAuditLog() {
    const stored = localStorage.getItem('audit_log');
    if (stored) {
        AppState.auditLog = JSON.parse(stored);
    } else {
        AppState.auditLog = [];
    }
}

// Block 5.2: Audit entry logging function
function logAuditEntry(action, productId, productName, details = {}) {
    const entry = {
        id: Date.now() + Math.random(), // Unique ID
        timestamp: new Date().toISOString(),
        action: action, // 'create', 'update', 'delete', 'status_change', 'approve', 'reject'
        productId: productId,
        productName: productName,
        user: currentUser.name || 'Система',
        role: currentUser.role || 'Система',
        details: details // Any additional info (field changes, status transitions, etc.)
    };

    AppState.auditLog.push(entry);
    saveAuditLog();

    console.log('📝 Audit log entry:', entry);
}

// ========== AUTOSAVE ==========
function triggerAutosave() {
    updateAutosaveStatus('сохранение...');

    if (AppState.autosaveTimer) {
        clearTimeout(AppState.autosaveTimer);
    }

    AppState.autosaveTimer = setTimeout(() => {
        if (AppState.currentProduct) {
            saveProduct(AppState.currentProduct.status || 'draft');
        }
    }, 2000);
}

function updateAutosaveStatus(status) {
    const indicator = document.getElementById('autosave-status');
    if (indicator) {
        indicator.textContent = status;
    }
}

// ========== UTILITIES ==========
function getSelectedValues(selector) {
    return Array.from(document.querySelectorAll(selector))
        .filter(el => el.checked)
        .map(el => el.value);
}

function kebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ========== ARCHIVE PAGE ==========
function renderArchivePage() {
    // Get archived products (you can add 'archived' status to products later)
    // For now, we'll show products with 'sent_to_cb' status as example
    const archivedProducts = AppState.products.filter(p => p.status === 'sent_to_cb' || p.archived === true);

    // Update metrics
    document.getElementById('archive-total').textContent = archivedProducts.length;
    document.getElementById('archive-completed').textContent = archivedProducts.filter(p => p.status === 'sent_to_cb').length;
    document.getElementById('archive-rejected').textContent = 0; // Can be extended later
    document.getElementById('archive-avg-time').textContent = '45 дн.'; // Placeholder

    // Render products list
    const archiveList = document.getElementById('archive-list');

    if (archivedProducts.length === 0) {
        archiveList.innerHTML = '<div class="empty-state"><p>📁 Архив пуст. Здесь будут отображаться завершенные и отклоненные продукты.</p></div>';
        return;
    }

    archiveList.innerHTML = archivedProducts.map(product => {
        const data = product.data || {};
        const progress = calculateProgress(data);
        const statusInfo = getStatusInfo(product.status);

        return `
            <div class="product-card">
                <div class="product-header">
                    <h3>${data.marketingName || 'Без названия'}</h3>
                    <span class="status-badge ${product.status}">${statusInfo.label} ${statusInfo.icon}</span>
                </div>
                <div class="product-meta">
                    ${data.partner || 'Партнёр не указан'} | ${data.productGroup || 'Группа не указана'} | Приоритет: ${data.priority || '—'}
                </div>
                <div class="product-footer">
                    <div class="product-dates">
                        <small>Запуск: ${data.launchDate || '—'} | Заполнено: ${progress}%</small>
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-small btn-secondary" onclick="editProduct(${product.id})">Просмотр</button>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
    }).join('');

    initArchiveFilters();
}

function initArchiveFilters() {
    const searchInput = document.getElementById('archive-search');
    const filterStatus = document.getElementById('archive-filter-status');
    const filterPartner = document.getElementById('archive-filter-partner');
    const filterYear = document.getElementById('archive-filter-year');

    // Search
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            // Add search logic here
            showToast('Поиск в архиве обновляется...', 'info');
        });
    }

    // Export button
    const exportBtn = document.getElementById('export-archive-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportArchive();
        });
    }
}

function exportArchive() {
    const archivedProducts = AppState.products.filter(p => p.status === 'sent_to_cb' || p.archived === true);

    const dataStr = JSON.stringify(archivedProducts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `archive-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    showToast('Архив экспортирован', 'success');
}

// ========== SETTINGS PAGE ==========
const AppSettings = {
    directories: {
        partners: [
            { id: 1, name: 'ВТБ', code: 'VTB', status: 'active', dateAdded: '2024-01-15' },
            { id: 2, name: 'РОСБАНК', code: 'ROSB', status: 'active', dateAdded: '2024-01-20' },
            { id: 3, name: 'СОВКОМБАНК', code: 'SKB', status: 'active', dateAdded: '2024-02-01' },
            { id: 4, name: 'ПОЧТАБАНК', code: 'PCHTA', status: 'active', dateAdded: '2024-02-10' }
        ],
        segments: [
            { id: 1, name: 'Розница', description: 'Розничные клиенты', status: 'active' },
            { id: 2, name: 'Прайм', description: 'Премиальный сегмент', status: 'active' },
            { id: 3, name: 'VIP', description: 'VIP клиенты', status: 'active' }
        ],
        productGroups: [
            { id: 1, name: 'НСЖ', code: 'NSG', description: 'Накопительное страхование жизни' },
            { id: 2, name: 'ИСЖ', code: 'ISG', description: 'Инвестиционное страхование жизни' }
        ]
    }
};

function renderSettingsPage() {
    // Initialize settings tabs
    initSettingsTabs();

    // Render directories
    renderPartnersTable();
    renderSegmentsTable();
    renderProductGroupsTable();

    // Initialize settings handlers
    initSettingsHandlers();
}

function initSettingsTabs() {
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.settingsTab;

            // Remove active from all
            document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));

            // Add active to clicked
            btn.classList.add('active');
            document.getElementById(`${tabName}-settings-tab`).classList.add('active');
        });
    });
}

function renderPartnersTable() {
    const tbody = document.querySelector('#partners-table tbody');
    if (!tbody) return;

    tbody.innerHTML = AppSettings.directories.partners.map(partner => `
        <tr>
            <td>${partner.name}</td>
            <td>${partner.code}</td>
            <td><span class="status-badge ${partner.status === 'active' ? 'approved' : 'draft'}">${partner.status === 'active' ? 'Активен' : 'Неактивен'}</span></td>
            <td>${partner.dateAdded}</td>
            <td>
                <button class="btn btn-small btn-secondary" onclick="editPartner(${partner.id})">✏️ Редактировать</button>
                <button class="btn btn-small btn-danger" onclick="deletePartner(${partner.id})">🗑</button>
            </td>
        </tr>
    `).join('');
}

function renderSegmentsTable() {
    const tbody = document.querySelector('#segments-table tbody');
    if (!tbody) return;

    tbody.innerHTML = AppSettings.directories.segments.map(segment => `
        <tr>
            <td>${segment.name}</td>
            <td>${segment.description}</td>
            <td><span class="status-badge ${segment.status === 'active' ? 'approved' : 'draft'}">${segment.status === 'active' ? 'Активен' : 'Неактивен'}</span></td>
            <td>
                <button class="btn btn-small btn-secondary" onclick="editSegment(${segment.id})">✏️ Редактировать</button>
                <button class="btn btn-small btn-danger" onclick="deleteSegment(${segment.id})">🗑</button>
            </td>
        </tr>
    `).join('');
}

function renderProductGroupsTable() {
    const tbody = document.querySelector('#product-groups-table tbody');
    if (!tbody) return;

    tbody.innerHTML = AppSettings.directories.productGroups.map(group => `
        <tr>
            <td>${group.name}</td>
            <td>${group.code}</td>
            <td>${group.description}</td>
            <td>
                <button class="btn btn-small btn-secondary" onclick="editProductGroup(${group.id})">✏️ Редактировать</button>
                <button class="btn btn-small btn-danger" onclick="deleteProductGroup(${group.id})">🗑</button>
            </td>
        </tr>
    `).join('');
}

function initSettingsHandlers() {
    // Add partner button
    const addPartnerBtn = document.getElementById('add-partner-btn');
    if (addPartnerBtn) {
        addPartnerBtn.addEventListener('click', () => {
            const name = prompt('Введите название партнёра:');
            if (name) {
                const code = prompt('Введите код партнёра:');
                if (code) {
                    AppSettings.directories.partners.push({
                        id: Date.now(),
                        name: name,
                        code: code,
                        status: 'active',
                        dateAdded: new Date().toISOString().split('T')[0]
                    });
                    renderPartnersTable();
                    saveSettings();
                    showToast('Партнёр добавлен', 'success');
                }
            }
        });
    }

    // Add segment button
    const addSegmentBtn = document.getElementById('add-segment-btn');
    if (addSegmentBtn) {
        addSegmentBtn.addEventListener('click', () => {
            const name = prompt('Введите название сегмента:');
            if (name) {
                const description = prompt('Введите описание:');
                AppSettings.directories.segments.push({
                    id: Date.now(),
                    name: name,
                    description: description || '',
                    status: 'active'
                });
                renderSegmentsTable();
                saveSettings();
                showToast('Сегмент добавлен', 'success');
            }
        });
    }

    // Add product group button
    const addGroupBtn = document.getElementById('add-product-group-btn');
    if (addGroupBtn) {
        addGroupBtn.addEventListener('click', () => {
            const name = prompt('Введите название группы:');
            if (name) {
                const code = prompt('Введите код:');
                const description = prompt('Введите описание:');
                AppSettings.directories.productGroups.push({
                    id: Date.now(),
                    name: name,
                    code: code || '',
                    description: description || ''
                });
                renderProductGroupsTable();
                saveSettings();
                showToast('Группа продуктов добавлена', 'success');
            }
        });
    }

    // Save settings button
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            saveSettings();
            showToast('Настройки сохранены', 'success');
        });
    }

    // Reset settings button
    const resetSettingsBtn = document.getElementById('reset-settings-btn');
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', () => {
            if (confirm('Сбросить все настройки к значениям по умолчанию?')) {
                loadSettings();
                renderSettingsPage();
                showToast('Настройки сброшены', 'info');
            }
        });
    }

    // Backup buttons
    const createBackupBtn = document.getElementById('create-backup-btn');
    if (createBackupBtn) {
        createBackupBtn.addEventListener('click', createBackup);
    }

    const restoreBackupBtn = document.getElementById('restore-backup-btn');
    if (restoreBackupBtn) {
        restoreBackupBtn.addEventListener('click', restoreBackup);
    }

    const clearDataBtn = document.getElementById('clear-all-data-btn');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', () => {
            if (confirm('ВНИМАНИЕ! Это удалит ВСЕ данные безвозвратно. Продолжить?')) {
                if (confirm('Вы уверены? Это действие нельзя отменить!')) {
                    localStorage.clear();
                    location.reload();
                }
            }
        });
    }

    updateBackupInfo();
}

function saveSettings() {
    localStorage.setItem('app_settings', JSON.stringify(AppSettings));
}

function loadSettings() {
    const stored = localStorage.getItem('app_settings');
    if (stored) {
        Object.assign(AppSettings, JSON.parse(stored));
    }
}

function createBackup() {
    const backup = {
        products: AppState.products,
        settings: AppSettings,
        timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    localStorage.setItem('last_backup_date', new Date().toISOString());
    updateBackupInfo();
    showToast('Резервная копия создана', 'success');
}

function restoreBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = event => {
            try {
                const backup = JSON.parse(event.target.result);
                if (backup.products) {
                    AppState.products = backup.products;
                    saveProducts();
                }
                if (backup.settings) {
                    Object.assign(AppSettings, backup.settings);
                    saveSettings();
                }
                showToast('Данные восстановлены из резервной копии', 'success');
                setTimeout(() => location.reload(), 1000);
            } catch (error) {
                showToast('Ошибка при восстановлении: неверный формат файла', 'error');
            }
        };

        reader.readAsText(file);
    };

    input.click();
}

function updateBackupInfo() {
    const lastBackupDate = localStorage.getItem('last_backup_date');
    const lastBackupEl = document.getElementById('last-backup-date');

    if (lastBackupEl && lastBackupDate) {
        const date = new Date(lastBackupDate);
        lastBackupEl.textContent = date.toLocaleString('ru-RU');
    }

    // Calculate data size
    const dataSize = new Blob([localStorage.getItem('insurance_products') || '']).size;
    const dataSizeEl = document.getElementById('data-size');
    if (dataSizeEl) {
        dataSizeEl.textContent = `~${(dataSize / 1024).toFixed(2)} KB`;
    }
}

// Placeholder functions for directory item management
function editPartner(id) {
    showToast('Редактирование партнёра будет доступно в следующей версии', 'info');
}

function deletePartner(id) {
    if (confirm('Удалить этого партнёра?')) {
        AppSettings.directories.partners = AppSettings.directories.partners.filter(p => p.id !== id);
        renderPartnersTable();
        saveSettings();
        showToast('Партнёр удалён', 'info');
    }
}

function editSegment(id) {
    showToast('Редактирование сегмента будет доступно в следующей версии', 'info');
}

function deleteSegment(id) {
    if (confirm('Удалить этот сегмент?')) {
        AppSettings.directories.segments = AppSettings.directories.segments.filter(s => s.id !== id);
        renderSegmentsTable();
        saveSettings();
        showToast('Сегмент удалён', 'info');
    }
}

function editProductGroup(id) {
    showToast('Редактирование группы будет доступно в следующей версии', 'info');
}

function deleteProductGroup(id) {
    if (confirm('Удалить эту группу продуктов?')) {
        AppSettings.directories.productGroups = AppSettings.directories.productGroups.filter(g => g.id !== id);
        renderProductGroupsTable();
        saveSettings();
        showToast('Группа продуктов удалена', 'info');
    }
}

// ========== ANALYTICS PAGE ==========
function renderAnalyticsPage() {
    initAnalyticsTabs();
    initAnalyticsButtons();
    renderManagerDashboard();
}

function initAnalyticsTabs() {
    const tabBtns = document.querySelectorAll('.analytics-tab-btn');
    const tabContents = document.querySelectorAll('.analytics-tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.analyticsTab;

            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update active tab content
            tabContents.forEach(content => content.classList.remove('active'));
            const targetContent = document.getElementById(`${tabName}-analytics-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // Render content for the selected tab
            if (tabName === 'manager') {
                renderManagerDashboard();
            } else if (tabName === 'product-owner') {
                renderProductOwnerDashboard();
            } else if (tabName === 'audit') {
                renderAuditLog();
            }
        });
    });
}

function initAnalyticsButtons() {
    // Export analytics button
    const exportBtn = document.getElementById('export-analytics-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const analyticsData = {
                generatedAt: new Date().toISOString(),
                metrics: calculateManagerMetrics(),
                products: AppState.products,
                audit: generateAuditEntries()
            };

            const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            showToast('Отчет экспортирован', 'success');
        });
    }

    // Refresh analytics button
    const refreshBtn = document.getElementById('refresh-analytics-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            renderAnalyticsPage();
            showToast('Данные обновлены', 'success');
        });
    }
}

function renderManagerDashboard() {
    const metrics = calculateManagerMetrics();

    // Update metrics cards
    document.getElementById('total-products-metric').textContent = metrics.totalProducts;
    document.getElementById('avg-ttm-metric').textContent = metrics.avgTTM;
    document.getElementById('avg-delay-metric').textContent = metrics.avgDelay;
    document.getElementById('completed-metric').textContent = metrics.completed;

    // Render bottleneck chart
    renderBottleneckChart(metrics.bottlenecks);

    // Render products table
    renderProductsTable();
}

function calculateManagerMetrics() {
    const products = AppState.products;
    const activeProducts = products.filter(p =>
        p.status !== 'Завершено' && p.status !== 'Отклонено' && p.status !== 'Отменено'
    );

    // Total products in work
    const totalProducts = activeProducts.length;

    // Completed products
    const completed = products.filter(p => p.status === 'Завершено').length;

    // Block 5.5: Calculate average TTM using real statusHistory
    let avgTTM = '-';
    const completedProducts = products.filter(p => p.status === 'Отправлено в ЦБ' || p.status === 'Завершено');
    if (completedProducts.length > 0) {
        const ttmValues = completedProducts.map(p => {
            // Use statusHistory to find when product reached final status
            if (p.statusHistory && p.statusHistory.length > 0) {
                const created = new Date(p.createdAt);
                const finalStatusEntry = p.statusHistory.find(h => h.status === 'sent' || h.status === 'Завершено');
                const finalDate = finalStatusEntry ? new Date(finalStatusEntry.date) : new Date(p.updatedAt);
                const diffDays = Math.floor((finalDate - created) / (1000 * 60 * 60 * 24));
                return diffDays;
            } else {
                // Fallback to old calculation if no statusHistory
                const created = new Date(p.createdAt);
                const updated = new Date(p.updatedAt);
                return Math.floor((updated - created) / (1000 * 60 * 60 * 24));
            }
        });
        const avgDays = Math.floor(ttmValues.reduce((a, b) => a + b, 0) / ttmValues.length);
        avgTTM = `${avgDays} дней`;
    }

    // Calculate average approval delay (mock calculation)
    let avgDelay = '-';
    const approvalProducts = products.filter(p => p.status === 'Согласование' || p.status === 'Согласовано');
    if (approvalProducts.length > 0) {
        const delays = approvalProducts.map(p => {
            const created = new Date(p.createdAt);
            const now = new Date();
            return Math.floor((now - created) / (1000 * 60 * 60 * 24));
        });
        const avgDelayDays = Math.floor(delays.reduce((a, b) => a + b, 0) / delays.length);
        avgDelay = `${avgDelayDays} дней`;
    }

    // Calculate bottlenecks (average days in each status)
    const bottlenecks = calculateBottlenecks();

    return {
        totalProducts,
        avgTTM,
        avgDelay,
        completed,
        bottlenecks
    };
}

function calculateBottlenecks() {
    const products = AppState.products;
    const statusCounts = {
        'Черновик': [],
        'Согласование': [],
        'Согласовано': [],
        'Отправлено в ЦБ': []
    };

    products.forEach(p => {
        const created = new Date(p.createdAt);
        const updated = new Date(p.updatedAt);
        const days = Math.floor((updated - created) / (1000 * 60 * 60 * 24));

        if (statusCounts[p.status]) {
            statusCounts[p.status].push(days);
        }
    });

    const bottlenecks = {};
    for (const [status, days] of Object.entries(statusCounts)) {
        if (days.length > 0) {
            bottlenecks[status] = Math.floor(days.reduce((a, b) => a + b, 0) / days.length);
        } else {
            bottlenecks[status] = 0;
        }
    }

    return bottlenecks;
}

function renderBottleneckChart(bottlenecks) {
    const maxDays = Math.max(...Object.values(bottlenecks), 1);

    for (const [status, days] of Object.entries(bottlenecks)) {
        const percentage = (days / maxDays) * 100;
        const barId = `bottleneck-${status.toLowerCase().replace(/\s+/g, '-')}`;
        const valueId = `${barId}-value`;

        const bar = document.getElementById(barId);
        const value = document.getElementById(valueId);

        if (bar) {
            bar.style.width = `${percentage}%`;
        }
        if (value) {
            value.textContent = `${days} дней`;
        }
    }
}

function renderProductsTable() {
    const tbody = document.getElementById('manager-products-tbody');
    if (!tbody) return;

    const products = AppState.products.filter(p =>
        p.status !== 'Завершено' && p.status !== 'Отклонено' && p.status !== 'Отменено'
    );

    tbody.innerHTML = products.map(p => {
        const progress = calculateProductProgress(p);
        const statusBadge = getStatusBadge(p.status);

        return `
            <tr>
                <td>${p.marketingName || 'Без названия'}</td>
                <td>${p.partner || '-'}</td>
                <td>${statusBadge}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="flex: 1; background: var(--bg-tertiary); height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${progress}%; background: var(--success-color); height: 100%;"></div>
                        </div>
                        <span style="font-size: 13px; color: var(--text-secondary);">${progress}%</span>
                    </div>
                </td>
                <td>${new Date(p.updatedAt).toLocaleDateString('ru-RU')}</td>
            </tr>
        `;
    }).join('');
}

function renderProductOwnerDashboard() {
    // Populate product selector
    const selector = document.getElementById('product-selector');
    if (selector) {
        const products = AppState.products.filter(p =>
            p.status !== 'Завершено' && p.status !== 'Отклонено' && p.status !== 'Отменено'
        );

        selector.innerHTML = '<option value="">Выберите продукт...</option>' +
            products.map(p => `<option value="${p.id}">${p.marketingName || 'Без названия'}</option>`).join('');

        selector.addEventListener('change', (e) => {
            const productId = e.target.value;
            if (productId) {
                const product = AppState.products.find(p => p.id === productId);
                if (product) {
                    renderProductProgress(product);
                    renderBlockingElements(product);
                    renderRolesStatus(product);
                }
            }
        });
    }
}

function renderProductProgress(product) {
    const sections = [
        { id: 'params', name: 'Параметры', progress: calculateSectionProgress(product, 'params') },
        { id: 'premium', name: 'Страховой взнос', progress: calculateSectionProgress(product, 'premium') },
        { id: 'kv', name: 'Лестничное КВ', progress: calculateSectionProgress(product, 'kv') },
        { id: 'contract', name: 'Шаблон договора', progress: calculateSectionProgress(product, 'contract') }
    ];

    sections.forEach(section => {
        const circle = document.getElementById(`${section.id}-progress-circle`);
        const value = document.getElementById(`${section.id}-progress-value`);

        if (circle) {
            circle.style.setProperty('--progress', section.progress);
        }
        if (value) {
            value.textContent = `${section.progress}%`;
        }
    });
}

function calculateSectionProgress(product, section) {
    if (section === 'params') {
        let filled = 0;
        const total = 14;
        if (product.priority) filled++;
        if (product.launchDate) filled++;
        if (product.marketingName) filled++;
        if (product.partner) filled++;
        if (product.segment) filled++;
        if (product.agencyCode) filled++;
        if (product.productGroup) filled++;
        if (product.productCode) filled++;
        if (product.cardType) filled++;
        if (product.llob) filled++;
        filled += 4; // Mock for other fields
        return Math.round((filled / total) * 100);
    } else if (section === 'premium') {
        let filled = 0;
        if (product.currencies && product.currencies.length > 0) filled += 50;
        if (product.periodicities && product.periodicities.length > 0) filled += 50;
        return filled;
    } else if (section === 'kv') {
        if (product.kvTable && product.kvTable.length > 0) return 100;
        return 0;
    } else if (section === 'contract') {
        if (product.contractTemplate && product.contractTemplate.length > 50) return 100;
        return 0;
    }
    return 0;
}

function renderBlockingElements(product) {
    const container = document.querySelector('.blocking-elements');
    if (!container) return;

    const blocking = getBlockingElements(product);

    let html = '<h3>Блокирующие элементы</h3>';

    if (blocking.length === 0) {
        html += '<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-text">Все обязательные поля заполнены</div></div>';
    } else {
        html += blocking.map(item => `
            <div class="blocking-item">
                <div class="icon">⚠️</div>
                <div class="content">
                    <div class="field-name">${item.field}</div>
                    <div class="tab-name">${item.tab}</div>
                </div>
            </div>
        `).join('');
    }

    container.innerHTML = html;
}

function getBlockingElements(product) {
    const blocking = [];

    if (!product.marketingName) blocking.push({ field: 'Маркетинговое название', tab: 'Параметры' });
    if (!product.partner) blocking.push({ field: 'Партнёр', tab: 'Параметры' });
    if (!product.segment) blocking.push({ field: 'Сегмент', tab: 'Параметры' });
    if (!product.productGroup) blocking.push({ field: 'Группа продукта', tab: 'Параметры' });
    if (!product.currencies || product.currencies.length === 0) blocking.push({ field: 'Валюты', tab: 'Страховой взнос' });
    if (!product.periodicities || product.periodicities.length === 0) blocking.push({ field: 'Периодичность оплаты', tab: 'Страховой взнос' });

    return blocking;
}

function renderRolesStatus(product) {
    const container = document.querySelector('.roles-status');
    if (!container) return;

    const progress = calculateProductProgress(product);

    const roles = [
        { name: 'Продуктолог', person: 'Иван Иванов', status: progress > 80 ? 'completed' : progress > 40 ? 'pending' : 'not-started' },
        { name: 'Риск-менеджер', person: 'Мария Петрова', status: progress > 60 ? 'completed' : progress > 30 ? 'pending' : 'not-started' },
        { name: 'Юрист', person: 'Алексей Сидоров', status: progress > 70 ? 'completed' : 'not-started' },
        { name: 'Руководитель', person: 'Ольга Иванова', status: product.status === 'Согласовано' || product.status === 'Отправлено в ЦБ' ? 'completed' : 'not-started' }
    ];

    container.innerHTML = roles.map(role => {
        let statusText = '';
        let statusClass = role.status;

        if (role.status === 'completed') statusText = '✅ Заполнено';
        else if (role.status === 'pending') statusText = '⏳ В процессе';
        else statusText = '⏸ Не начато';

        return `
            <div class="role-item">
                <div class="role-icon">👤</div>
                <div class="role-info">
                    <h4>${role.name}</h4>
                    <p>${role.person}</p>
                </div>
                <div class="role-status ${statusClass}">${statusText}</div>
            </div>
        `;
    }).join('');
}

function renderAuditLog() {
    const timeline = document.getElementById('audit-timeline');
    if (!timeline) return;

    // Block 5.6: Use real audit log data from AppState.auditLog
    const entries = AppState.auditLog.map(entry => {
        // Map action types to readable text and CSS classes
        const actionMap = {
            'create': { text: 'Создан', class: 'create' },
            'update': { text: 'Обновлен', class: 'update' },
            'delete': { text: 'Удален', class: 'delete' },
            'status_change': { text: 'Изменен статус', class: 'status' },
            'approve': { text: 'Согласовано', class: 'approve' },
            'reject': { text: 'Отклонено', class: 'reject' }
        };

        const action = actionMap[entry.action] || { text: entry.action, class: 'default' };
        const time = new Date(entry.timestamp).toLocaleString('ru-RU');
        const details = entry.details ? JSON.stringify(entry.details) : '';

        return {
            action: action.text,
            actionType: action.class,
            title: entry.productName,
            time: time,
            user: `${entry.user} (${entry.role})`,
            details: details,
            product: entry.productName
        };
    }).reverse(); // Show newest first

    // Populate filters
    const productFilter = document.getElementById('audit-filter-product');
    if (productFilter && productFilter.children.length === 1) {
        AppState.products.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.data?.marketingName || 'Без названия';
            productFilter.appendChild(option);
        });
    }

    if (entries.length === 0) {
        timeline.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">Журнал аудита пуст</div></div>';
        return;
    }

    timeline.innerHTML = entries.map(entry => `
        <div class="audit-entry">
            <div class="audit-entry-header">
                <div>
                    <span class="audit-action-badge ${entry.actionType}">${entry.action}</span>
                    <div class="audit-entry-title">${entry.title}</div>
                </div>
                <div class="audit-entry-time">${entry.time}</div>
            </div>
            <div class="audit-entry-user">${entry.user}</div>
            ${entry.details ? `<div class="audit-entry-details">${entry.details}</div>` : ''}
            <div class="audit-entry-product">📦 ${entry.product}</div>
        </div>
    `).join('');
}

function generateAuditEntries() {
    const entries = [];
    const users = ['Иван Иванов', 'Мария Петрова', 'Алексей Сидоров', 'Ольга Иванова'];

    AppState.products.forEach(product => {
        // Product creation
        entries.push({
            action: 'Создание',
            actionType: 'create',
            title: 'Создан новый продукт',
            user: users[Math.floor(Math.random() * users.length)],
            time: new Date(product.createdAt).toLocaleString('ru-RU'),
            product: product.marketingName || 'Без названия',
            details: `Статус: ${product.status}`
        });

        // Status change (if updated recently)
        if (product.updatedAt !== product.createdAt) {
            entries.push({
                action: 'Изменение статуса',
                actionType: 'status',
                title: `Статус изменен на "${product.status}"`,
                user: users[Math.floor(Math.random() * users.length)],
                time: new Date(product.updatedAt).toLocaleString('ru-RU'),
                product: product.marketingName || 'Без названия',
                details: null
            });
        }

        // Field updates
        if (product.marketingName && Math.random() > 0.5) {
            entries.push({
                action: 'Обновление',
                actionType: 'update',
                title: 'Обновлены параметры продукта',
                user: users[Math.floor(Math.random() * users.length)],
                time: new Date(product.updatedAt).toLocaleString('ru-RU'),
                product: product.marketingName,
                details: 'Изменено поле "Маркетинговое название"'
            });
        }
    });

    // Sort by time (newest first)
    entries.sort((a, b) => new Date(b.time) - new Date(a.time));

    return entries.slice(0, 20); // Limit to 20 most recent entries
}

function calculateProductProgress(product) {
    let totalFields = 0;
    let filledFields = 0;

    // Parameters section (14 fields)
    const paramFields = ['priority', 'launchDate', 'marketingName', 'partner', 'segment',
                         'agencyCode', 'productGroup', 'productCode', 'cardType', 'llob'];
    paramFields.forEach(field => {
        totalFields++;
        if (product[field]) filledFields++;
    });
    totalFields += 4; // Additional mock fields
    filledFields += 2; // Mock some as filled

    // Premium section
    totalFields += 2;
    if (product.currencies && product.currencies.length > 0) filledFields++;
    if (product.periodicities && product.periodicities.length > 0) filledFields++;

    // KV table
    totalFields++;
    if (product.kvTable && product.kvTable.length > 0) filledFields++;

    // Contract template
    totalFields++;
    if (product.contractTemplate && product.contractTemplate.length > 0) filledFields++;

    return Math.round((filledFields / totalFields) * 100);
}

// ========== TEST DATA ==========
function loadTestData() {
    const now = Date.now();
    const products = [];

    // Продукт 1: Черновик - базовые поля заполнены (Продуктолог только начал)
    products.push({
        id: now - 1000000,
        status: 'draft',
        createdAt: new Date(now - 86400000 * 5).toISOString(),
        updatedAt: new Date(now - 86400000 * 5).toISOString(),
        approvals: {
            'Продуктолог': { approved: false, comment: '', date: null },
            'Андеррайтер': { approved: false, comment: '', date: null },
            'Актуарий': { approved: false, comment: '', date: null },
            'Методолог': { approved: false, comment: '', date: null }
        },
        data: {
            priority: 'Высокий',
            launchDate: '2025-03-15',
            closureDate: '',
            marketingName: 'Защита семьи Плюс',
            partner: 'Сбербанк',
            newPartnerName: '',
            segment: 'Физические лица',
            agencyCode: '',
            productGroup: 'Страхование жизни',
            productCode: '',
            lkCardType: '',
            productSubtype: '',
            assetLinked: false,
            investmentStrategy: false,
            llob: '',
            currencies: [],
            frequencies: [],
            fixedRate: false,
            exchangeRate: '',
            fixedPremiums: false,
            guaranteedIncome: false,
            evaluationContract: false,
            specialOffer: false,
            paymentFrequencies: [],
            survivalPayoutOption: '',
            guaranteedPayout: '',
            nonPaymentOption: false,
            allowPremiumCalculation: false,
            maxInsuranceSum: '',
            maxInsuranceSumApproved: '',
            setFixedInsuranceSum: false,
            disableRiskInsuranceSum: false,
            useThreePayments: false,
            freeOptionAvailable: false,
            allowSumCalculation: false
        }
    });

    // Продукт 2: Черновик - хорошо заполнен, готов к отправке
    products.push({
        id: now - 900000,
        status: 'draft',
        createdAt: new Date(now - 86400000 * 3).toISOString(),
        updatedAt: new Date(now - 86400000 * 1).toISOString(),
        approvals: {
            'Продуктолог': { approved: false, comment: '', date: null },
            'Андеррайтер': { approved: false, comment: '', date: null },
            'Актуарий': { approved: false, comment: '', date: null },
            'Методолог': { approved: false, comment: '', date: null }
        },
        data: {
            priority: 'Средний',
            launchDate: '2025-04-01',
            closureDate: '2026-04-01',
            marketingName: 'Накопительное страхование "Будущее детей"',
            partner: 'ВТБ',
            newPartnerName: '',
            segment: 'Физические лица',
            agencyCode: 'AG-2025-042',
            productGroup: 'Накопительное страхование',
            productCode: 'NSK-FUT-001',
            lkCardType: 'Стандарт',
            productSubtype: 'ДСЖ',
            assetLinked: true,
            investmentStrategy: true,
            llob: 'Долгосрочное страхование жизни',
            currencies: ['RUB', 'USD'],
            frequencies: ['Ежегодно', 'Раз в полгода'],
            fixedRate: false,
            exchangeRate: '',
            fixedPremiums: true,
            guaranteedIncome: true,
            evaluationContract: false,
            specialOffer: false,
            paymentFrequencies: ['Ежемесячно', 'Ежеквартально', 'Ежегодно'],
            survivalPayoutOption: 'В конце срока',
            guaranteedPayout: 'В конце срока',
            nonPaymentOption: false,
            allowPremiumCalculation: true,
            maxInsuranceSum: '5000000',
            maxInsuranceSumApproved: '10000000',
            setFixedInsuranceSum: true,
            disableRiskInsuranceSum: false,
            useThreePayments: false,
            freeOptionAvailable: false,
            allowSumCalculation: true
        }
    });

    // Продукт 3: На согласовании - 2 роли уже согласовали
    products.push({
        id: now - 800000,
        status: 'approval',
        createdAt: new Date(now - 86400000 * 10).toISOString(),
        updatedAt: new Date(now - 86400000 * 2).toISOString(),
        approvals: {
            'Продуктолог': { approved: true, comment: 'Согласовано. Продукт актуален для рынка.', date: new Date(now - 86400000 * 8).toISOString() },
            'Андеррайтер': { approved: true, comment: 'Риски оценены, параметры корректны.', date: new Date(now - 86400000 * 6).toISOString() },
            'Актуарий': { approved: false, comment: '', date: null },
            'Методолог': { approved: false, comment: '', date: null }
        },
        data: {
            priority: 'Высокий',
            launchDate: '2025-02-20',
            closureDate: '2027-02-20',
            marketingName: 'Инвестиционное страхование жизни Premium',
            partner: 'Альфа-Банк',
            newPartnerName: '',
            segment: 'Премиум клиенты',
            agencyCode: 'AG-2025-015',
            productGroup: 'Инвестиционное страхование',
            productCode: 'ISG-PREM-002',
            lkCardType: 'Премиум',
            productSubtype: 'ИСЖ',
            assetLinked: true,
            investmentStrategy: true,
            llob: 'Инвестиционное страхование жизни',
            currencies: ['RUB', 'USD', 'EUR'],
            frequencies: ['Единовременно', 'Ежегодно'],
            fixedRate: true,
            exchangeRate: '95.5000',
            fixedPremiums: false,
            guaranteedIncome: true,
            evaluationContract: true,
            specialOffer: true,
            paymentFrequencies: ['Единовременно', 'Ежегодно'],
            survivalPayoutOption: 'Ежегодно',
            guaranteedPayout: 'Ежегодно',
            nonPaymentOption: false,
            allowPremiumCalculation: true,
            maxInsuranceSum: '15000000',
            maxInsuranceSumApproved: '30000000',
            setFixedInsuranceSum: false,
            disableRiskInsuranceSum: false,
            useThreePayments: true,
            freeOptionAvailable: true,
            allowSumCalculation: true
        }
    });

    // Продукт 4: На согласовании - только Продуктолог согласовал
    products.push({
        id: now - 700000,
        status: 'approval',
        createdAt: new Date(now - 86400000 * 7).toISOString(),
        updatedAt: new Date(now - 86400000 * 4).toISOString(),
        approvals: {
            'Продуктолог': { approved: true, comment: 'Автоматическое согласование при отправке', date: new Date(now - 86400000 * 4).toISOString() },
            'Андеррайтер': { approved: false, comment: '', date: null },
            'Актуарий': { approved: false, comment: '', date: null },
            'Методолог': { approved: false, comment: '', date: null }
        },
        data: {
            priority: 'Низкий',
            launchDate: '2025-05-10',
            closureDate: '',
            marketingName: 'Базовая защита онлайн',
            partner: 'Тинькофф',
            newPartnerName: '',
            segment: 'Массовый сегмент',
            agencyCode: 'AG-2025-068',
            productGroup: 'Рисковое страхование',
            productCode: 'RSK-BASE-005',
            lkCardType: 'Базовый',
            productSubtype: 'Рисковое',
            assetLinked: false,
            investmentStrategy: false,
            llob: 'Рисковое страхование жизни',
            currencies: ['RUB'],
            frequencies: ['Раз в месяц', 'Ежегодно'],
            fixedRate: false,
            exchangeRate: '',
            fixedPremiums: false,
            guaranteedIncome: false,
            evaluationContract: false,
            specialOffer: true,
            paymentFrequencies: ['Ежемесячно', 'Ежегодно'],
            survivalPayoutOption: '',
            guaranteedPayout: '',
            nonPaymentOption: true,
            allowPremiumCalculation: true,
            maxInsuranceSum: '2000000',
            maxInsuranceSumApproved: '3000000',
            setFixedInsuranceSum: true,
            disableRiskInsuranceSum: false,
            useThreePayments: false,
            freeOptionAvailable: true,
            allowSumCalculation: false
        }
    });

    // Продукт 5: Согласовано всеми - готов к отправке в ЦБ
    products.push({
        id: now - 600000,
        status: 'approved',
        createdAt: new Date(now - 86400000 * 15).toISOString(),
        updatedAt: new Date(now - 86400000 * 1).toISOString(),
        approvals: {
            'Продуктолог': { approved: true, comment: 'Продукт соответствует стратегии компании.', date: new Date(now - 86400000 * 12).toISOString() },
            'Андеррайтер': { approved: true, comment: 'Андеррайтинговые правила утверждены.', date: new Date(now - 86400000 * 10).toISOString() },
            'Актуарий': { approved: true, comment: 'Тарифы рассчитаны и проверены.', date: new Date(now - 86400000 * 5).toISOString() },
            'Методолог': { approved: true, comment: 'Документация подготовлена в полном объеме.', date: new Date(now - 86400000 * 1).toISOString() }
        },
        data: {
            priority: 'Высокий',
            launchDate: '2025-02-01',
            closureDate: '2030-02-01',
            marketingName: 'Пенсионное страхование "Достойная старость"',
            partner: 'Сбербанк',
            newPartnerName: '',
            segment: 'Физические лица',
            agencyCode: 'AG-2025-001',
            productGroup: 'Пенсионное страхование',
            productCode: 'PNS-STAR-001',
            lkCardType: 'Стандарт',
            productSubtype: 'НПО',
            assetLinked: true,
            investmentStrategy: true,
            llob: 'Негосударственное пенсионное обеспечение',
            currencies: ['RUB'],
            frequencies: ['Раз в месяц', 'Ежеквартально', 'Ежегодно'],
            fixedRate: false,
            exchangeRate: '',
            fixedPremiums: true,
            guaranteedIncome: true,
            evaluationContract: false,
            specialOffer: false,
            paymentFrequencies: ['Ежемесячно', 'Ежеквартально', 'Раз в полгода', 'Ежегодно'],
            survivalPayoutOption: 'Ежегодно с 60 лет',
            guaranteedPayout: 'Ежегодно',
            nonPaymentOption: false,
            allowPremiumCalculation: true,
            maxInsuranceSum: '8000000',
            maxInsuranceSumApproved: '12000000',
            setFixedInsuranceSum: true,
            disableRiskInsuranceSum: false,
            useThreePayments: false,
            freeOptionAvailable: false,
            allowSumCalculation: true
        }
    });

    // Продукт 6: Отправлено в ЦБ
    products.push({
        id: now - 500000,
        status: 'sent',
        createdAt: new Date(now - 86400000 * 30).toISOString(),
        updatedAt: new Date(now - 86400000 * 3).toISOString(),
        approvals: {
            'Продуктолог': { approved: true, comment: 'Согласовано.', date: new Date(now - 86400000 * 25).toISOString() },
            'Андеррайтер': { approved: true, comment: 'Согласовано.', date: new Date(now - 86400000 * 23).toISOString() },
            'Актуарий': { approved: true, comment: 'Согласовано.', date: new Date(now - 86400000 * 20).toISOString() },
            'Методолог': { approved: true, comment: 'Согласовано.', date: new Date(now - 86400000 * 18).toISOString() }
        },
        data: {
            priority: 'Высокий',
            launchDate: '2025-01-15',
            closureDate: '2028-01-15',
            marketingName: 'Ипотечное страхование жизни',
            partner: 'ВТБ',
            newPartnerName: '',
            segment: 'Заемщики',
            agencyCode: 'AG-2024-156',
            productGroup: 'Ипотечное страхование',
            productCode: 'IPT-LIFE-003',
            lkCardType: 'Стандарт',
            productSubtype: 'Кредитное',
            assetLinked: false,
            investmentStrategy: false,
            llob: 'Кредитное страхование жизни',
            currencies: ['RUB'],
            frequencies: ['Единовременно', 'Ежегодно'],
            fixedRate: false,
            exchangeRate: '',
            fixedPremiums: false,
            guaranteedIncome: false,
            evaluationContract: true,
            specialOffer: false,
            paymentFrequencies: ['Единовременно', 'Ежегодно'],
            survivalPayoutOption: '',
            guaranteedPayout: '',
            nonPaymentOption: false,
            allowPremiumCalculation: true,
            maxInsuranceSum: '20000000',
            maxInsuranceSumApproved: '25000000',
            setFixedInsuranceSum: false,
            disableRiskInsuranceSum: false,
            useThreePayments: false,
            freeOptionAvailable: false,
            allowSumCalculation: false
        }
    });

    // Продукт 7: На согласовании - 3 роли согласовали, осталась 1
    products.push({
        id: now - 400000,
        status: 'approval',
        createdAt: new Date(now - 86400000 * 12).toISOString(),
        updatedAt: new Date(now - 86400000 * 2).toISOString(),
        approvals: {
            'Продуктолог': { approved: true, comment: 'Продукт востребован на рынке.', date: new Date(now - 86400000 * 10).toISOString() },
            'Андеррайтер': { approved: true, comment: 'Риски приемлемы.', date: new Date(now - 86400000 * 8).toISOString() },
            'Актуарий': { approved: true, comment: 'Тарификация выполнена корректно.', date: new Date(now - 86400000 * 5).toISOString() },
            'Методолог': { approved: false, comment: '', date: null }
        },
        data: {
            priority: 'Средний',
            launchDate: '2025-03-01',
            closureDate: '2026-03-01',
            marketingName: 'Страхование от несчастных случаев "Активная жизнь"',
            partner: 'Райффайзен Банк',
            newPartnerName: '',
            segment: 'Физические лица',
            agencyCode: 'AG-2025-033',
            productGroup: 'Страхование от НС',
            productCode: 'NS-ACT-007',
            lkCardType: 'Стандарт',
            productSubtype: 'НС и болезни',
            assetLinked: false,
            investmentStrategy: false,
            llob: 'Страхование от несчастных случаев',
            currencies: ['RUB', 'EUR'],
            frequencies: ['Ежегодно'],
            fixedRate: false,
            exchangeRate: '',
            fixedPremiums: false,
            guaranteedIncome: false,
            evaluationContract: false,
            specialOffer: true,
            paymentFrequencies: ['Ежегодно', 'Единовременно'],
            survivalPayoutOption: '',
            guaranteedPayout: '',
            nonPaymentOption: true,
            allowPremiumCalculation: false,
            maxInsuranceSum: '3000000',
            maxInsuranceSumApproved: '5000000',
            setFixedInsuranceSum: false,
            disableRiskInsuranceSum: true,
            useThreePayments: false,
            freeOptionAvailable: true,
            allowSumCalculation: false
        }
    });

    // Продукт 8: Черновик - минимально заполнен
    products.push({
        id: now - 300000,
        status: 'draft',
        createdAt: new Date(now - 86400000 * 2).toISOString(),
        updatedAt: new Date(now - 86400000 * 2).toISOString(),
        approvals: {
            'Продуктолог': { approved: false, comment: '', date: null },
            'Андеррайтер': { approved: false, comment: '', date: null },
            'Актуарий': { approved: false, comment: '', date: null },
            'Методолог': { approved: false, comment: '', date: null }
        },
        data: {
            priority: 'Средний',
            launchDate: '2025-06-01',
            closureDate: '',
            marketingName: 'Детское страхование',
            partner: 'Газпромбанк',
            newPartnerName: '',
            segment: 'Физические лица',
            agencyCode: '',
            productGroup: 'Детское страхование',
            productCode: '',
            lkCardType: '',
            productSubtype: '',
            assetLinked: false,
            investmentStrategy: false,
            llob: '',
            currencies: [],
            frequencies: [],
            fixedRate: false,
            exchangeRate: '',
            fixedPremiums: false,
            guaranteedIncome: false,
            evaluationContract: false,
            specialOffer: false,
            paymentFrequencies: [],
            survivalPayoutOption: '',
            guaranteedPayout: '',
            nonPaymentOption: false,
            allowPremiumCalculation: false,
            maxInsuranceSum: '',
            maxInsuranceSumApproved: '',
            setFixedInsuranceSum: false,
            disableRiskInsuranceSum: false,
            useThreePayments: false,
            freeOptionAvailable: false,
            allowSumCalculation: false
        }
    });

    // Продукт 9: Согласовано - другой партнер
    products.push({
        id: now - 200000,
        status: 'approved',
        createdAt: new Date(now - 86400000 * 20).toISOString(),
        updatedAt: new Date(now - 86400000 * 5).toISOString(),
        approvals: {
            'Продуктолог': { approved: true, comment: 'Согласовано.', date: new Date(now - 86400000 * 18).toISOString() },
            'Андеррайтер': { approved: true, comment: 'Согласовано.', date: new Date(now - 86400000 * 15).toISOString() },
            'Актуарий': { approved: true, comment: 'Согласовано.', date: new Date(now - 86400000 * 10).toISOString() },
            'Методолог': { approved: true, comment: 'Согласовано.', date: new Date(now - 86400000 * 5).toISOString() }
        },
        data: {
            priority: 'Низкий',
            launchDate: '2025-04-15',
            closureDate: '2026-04-15',
            marketingName: 'Корпоративное страхование сотрудников',
            partner: 'МТС-Банк',
            newPartnerName: '',
            segment: 'Корпоративные клиенты',
            agencyCode: 'AG-2025-025',
            productGroup: 'Корпоративное страхование',
            productCode: 'CORP-EMP-002',
            lkCardType: 'Корпоративный',
            productSubtype: 'Групповое',
            assetLinked: false,
            investmentStrategy: false,
            llob: 'Групповое страхование жизни',
            currencies: ['RUB'],
            frequencies: ['Ежегодно'],
            fixedRate: false,
            exchangeRate: '',
            fixedPremiums: true,
            guaranteedIncome: false,
            evaluationContract: true,
            specialOffer: false,
            paymentFrequencies: ['Ежегодно'],
            survivalPayoutOption: '',
            guaranteedPayout: '',
            nonPaymentOption: false,
            allowPremiumCalculation: true,
            maxInsuranceSum: '1000000',
            maxInsuranceSumApproved: '1500000',
            setFixedInsuranceSum: true,
            disableRiskInsuranceSum: false,
            useThreePayments: false,
            freeOptionAvailable: false,
            allowSumCalculation: true
        }
    });

    // Продукт 10: На согласовании - все отклонили кроме Продуктолога (нереалистичный сценарий для демо)
    products.push({
        id: now - 100000,
        status: 'approval',
        createdAt: new Date(now - 86400000 * 6).toISOString(),
        updatedAt: new Date(now - 86400000 * 3).toISOString(),
        approvals: {
            'Продуктолог': { approved: true, comment: 'Автоматическое согласование при отправке', date: new Date(now - 86400000 * 6).toISOString() },
            'Андеррайтер': { approved: false, comment: '', date: null },
            'Актуарий': { approved: false, comment: '', date: null },
            'Методолог': { approved: false, comment: '', date: null }
        },
        data: {
            priority: 'Высокий',
            launchDate: '2025-02-28',
            closureDate: '2025-12-31',
            marketingName: 'Акция: Туристическое страхование со скидкой',
            partner: 'Альфа-Банк',
            newPartnerName: '',
            segment: 'Массовый сегмент',
            agencyCode: 'AG-2025-080',
            productGroup: 'Туристическое страхование',
            productCode: 'TOUR-SALE-001',
            lkCardType: 'Акционный',
            productSubtype: 'Выездное',
            assetLinked: false,
            investmentStrategy: false,
            llob: 'Страхование выезжающих за рубеж',
            currencies: ['RUB', 'USD', 'EUR'],
            frequencies: ['Единовременно'],
            fixedRate: true,
            exchangeRate: '92.0000',
            fixedPremiums: false,
            guaranteedIncome: false,
            evaluationContract: false,
            specialOffer: true,
            paymentFrequencies: ['Единовременно'],
            survivalPayoutOption: '',
            guaranteedPayout: '',
            nonPaymentOption: false,
            allowPremiumCalculation: false,
            maxInsuranceSum: '100000',
            maxInsuranceSumApproved: '150000',
            setFixedInsuranceSum: false,
            disableRiskInsuranceSum: false,
            useThreePayments: false,
            freeOptionAvailable: true,
            allowSumCalculation: false
        }
    });

    return products;
}

// ========== GLOBAL FUNCTIONS (for onclick handlers) ==========
window.deleteRow = deleteRow;
window.addFixedPremiumRow = addFixedPremiumRow;
window.editProduct = editProduct;
window.copyProduct = copyProduct;
window.deleteProduct = deleteProduct;
window.editPartner = editPartner;
window.deletePartner = deletePartner;
window.editSegment = editSegment;
window.deleteSegment = deleteSegment;
window.editProductGroup = editProductGroup;
window.deleteProductGroup = deleteProductGroup;
