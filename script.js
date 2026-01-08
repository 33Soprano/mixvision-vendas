// ============================================
// SISTEMA MIXVISION - SUPABASE DIRETO (ATUALIZADO)
// ============================================

// Variáveis globais
let currentMixUser = null;
let firebaseDb = null;
let currentTableName = null;
let currentTableDisplayName = null;

// ============================================
// MIXSELECT - CUSTOM DROPDOWN COMPONENT
// ============================================

class MixSelect {
    constructor(selectElement) {
        if (typeof selectElement === 'string') {
            this.nativeSelect = document.getElementById(selectElement);
        } else {
            this.nativeSelect = selectElement;
        }

        if (!this.nativeSelect) return;
        if (this.nativeSelect.dataset.enhanced) return;
        this.nativeSelect.dataset.enhanced = 'true';

        this.id = this.nativeSelect.id;
        this.wrapper = null;
        this.trigger = null;
        this.optionsContainer = null;
        this.isOpen = false;

        this.init();
    }

    init() {
        this.nativeSelect.classList.add('mix-select-native');
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'mix-select-wrapper';
        this.wrapper.id = 'mix-select-' + this.id;

        this.trigger = document.createElement('div');
        this.trigger.className = 'mix-select-trigger';
        this.trigger.innerHTML = `<span>${this.getSelectedText()}</span><i class="fas fa-chevron-down"></i>`;

        this.optionsContainer = document.createElement('div');
        this.optionsContainer.className = 'mix-select-options';

        this.wrapper.appendChild(this.trigger);
        this.wrapper.appendChild(this.optionsContainer);
        this.nativeSelect.parentNode.insertBefore(this.wrapper, this.nativeSelect.nextSibling);

        this.renderOptions();
        this.bindEvents();
        this.setupObserver();
    }

    getSelectedText() {
        const selected = this.nativeSelect.options[this.nativeSelect.selectedIndex];
        return (selected && selected.text) ? selected.text : (this.nativeSelect.getAttribute('placeholder') || 'Selecionar...');
    }

    renderOptions() {
        this.optionsContainer.innerHTML = '';
        if (this.nativeSelect.options.length === 0) {
            this.optionsContainer.innerHTML = '<div class="mix-select-option" style="opacity: 0.5; cursor: default;">Nenhuma opção disponível</div>';
            return;
        }
        Array.from(this.nativeSelect.options).forEach((opt, index) => {
            const div = document.createElement('div');
            div.className = 'mix-select-option';
            if (this.nativeSelect.selectedIndex === index) div.classList.add('selected');
            div.textContent = opt.text;
            div.dataset.value = opt.value;
            div.onclick = (e) => {
                e.stopPropagation();
                this.selectOption(index);
                this.close();
            };
            this.optionsContainer.appendChild(div);
        });
    }

    selectOption(index) {
        this.nativeSelect.selectedIndex = index;
        this.trigger.querySelector('span').textContent = this.nativeSelect.options[index].text;
        this.optionsContainer.querySelectorAll('.mix-select-option').forEach((el, i) => {
            el.classList.toggle('selected', i === index);
        });
        this.nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    bindEvents() {
        this.trigger.onclick = (e) => {
            e.stopPropagation();
            this.toggle();
        };
        if (!window._mixSelectGlobalBound) {
            document.addEventListener('click', () => {
                document.querySelectorAll('.mix-select-wrapper.open').forEach(el => el.classList.remove('open'));
            });
            window._mixSelectGlobalBound = true;
        }
    }

    toggle() { if (this.isOpen) this.close(); else this.open(); }
    open() {
        document.querySelectorAll('.mix-select-wrapper.open').forEach(el => { if (el !== this.wrapper) el.classList.remove('open'); });
        this.isOpen = true; this.wrapper.classList.add('open');
    }
    close() { this.isOpen = false; this.wrapper.classList.remove('open'); }
    setupObserver() {
        const observer = new MutationObserver(() => this.renderOptions());
        observer.observe(this.nativeSelect, { childList: true });
        this.nativeSelect.addEventListener('change', () => {
            this.trigger.querySelector('span').textContent = this.getSelectedText();
            this.renderOptions();
        });
    }
}

function enhanceAllSelects() {
    document.querySelectorAll('select:not(.mix-select-native)').forEach(sel => {
        if (sel.id) new MixSelect(sel);
    });
}

// CONFIGURE AQUI O ID DO SEU PROJETO SUPABASE
const SUPABASE_PROJECT_ID = 'llcewofzmpyczwfoljem'; // ← SEU PROJETO SUPABASE

// Configuração das Categorias
const CATEGORY_CONFIG = {
    'mercearia': {
        name: 'Mercearia',
        color: '#3b82f6',
        icon: 'fa-store',
        description: 'Produtos básicos de mercearia'
    },
    'limpeza': {
        name: 'Limpeza',
        color: '#8b5cf6',
        icon: 'fa-broom',
        description: 'Produtos de limpeza e higiene'
    },
    'mdias': {
        name: 'M Dias',
        color: '#f59e0b',
        icon: 'fa-calendar-day',
        description: 'Produtos de venda média'
    },
    'saudaveis': {
        name: 'Saudáveis',
        color: '#10b981',
        icon: 'fa-apple-alt',
        description: 'Produtos saudáveis e naturais'
    }
};

// Tabelas sugeridas (para fallback)
const SUGGESTED_TABLES = [
    { name: 'Saudaveis V1', displayName: 'Saudaveis V1', category: 'saudaveis' },
    { name: 'LIMPEZA E BAZAR', displayName: 'Limpeza e Bazar', category: 'limpeza' },
    { name: 'M DIAS', displayName: 'M Dias', category: 'mdias' },
    { name: 'MERCEARIA', displayName: 'Mercearia', category: 'mercearia' },

    // Antigas (mantidas por segurança)
    { name: 'mercearia', displayName: 'Mercearia', category: 'mercearia' },
    { name: 'limpeza', displayName: 'Limpeza', category: 'limpeza' },
    { name: 'mdias', displayName: 'M Dias', category: 'mdias' },
    { name: 'saudaveis', displayName: 'Saudáveis', category: 'saudaveis' }
];

// ============================================
// FUNÇÕES SUPABASE - CONSULTA DINÂMICA
// ============================================

// Função para formatar nome de tabela
function formatTableName(tableName) {
    return tableName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim();
}

// Função para detectar categoria pelo nome da tabela
function detectCategory(tableName) {
    const name = tableName.toLowerCase();

    if (name.includes('limpeza') || name.includes('higiene') || name.includes('clean')) {
        return 'limpeza';
    }
    if (name.includes('mdias') || name.includes('m_dias') || name.includes('m dias')) {
        return 'mdias';
    }
    if (name.includes('saudavel') || name.includes('saudaveis') || name.includes('natural') || name.includes('healthy')) {
        return 'saudaveis';
    }
    if (name.includes('venda') || name.includes('sales') || name.includes('cliente') || name.includes('customer')) {
        return 'mercearia';
    }
    return 'mercearia'; // padrão
}

// Função principal para listar tabelas do Supabase
async function listSupabaseTables() {
    try {
        console.log("🔍 Consultando tabelas disponíveis no Supabase...");

        // Lista de tabelas para testar (combinando sugeridas e comuns)
        const tablesToTest = [
            ...SUGGESTED_TABLES.map(t => t.name),
            'vendas', 'sales', 'venda',
            'produtos', 'products', 'product',
            'clientes', 'customers', 'cliente',
            'mercearia', 'groceries',
            'limpeza', 'cleaning',
            'mdias', 'm_dias',
            'saudaveis', 'healthy',
            'users', 'vendedores', 'sellers',
            'rotas', 'routes',
            'perfis', 'profiles'
        ];

        // Remover duplicados
        const uniqueTables = [...new Set(tablesToTest)];

        console.log(`🧪 Testando ${uniqueTables.length} tabelas possíveis...`);

        const availableTables = [];

        // Otimização: Testar tabelas em PARALELO (Batching)
        const batchSize = 5;
        for (let i = 0; i < uniqueTables.length; i += batchSize) {
            const batch = uniqueTables.slice(i, i + batchSize);
            const promises = batch.map(async (tableName) => {
                try {
                    const { data, error } = await window.supabase
                        .from(tableName)
                        .select('*') // Reverting to standard select for better compatibility
                        .limit(1);

                    if (!error) {
                        const suggestedConfig = SUGGESTED_TABLES.find(t => t.name === tableName);
                        return {
                            name: tableName,
                            displayName: suggestedConfig?.displayName || formatTableName(tableName),
                            category: suggestedConfig?.category || detectCategory(tableName),
                            verified: true
                        };
                    }
                } catch (err) {
                    return null;
                }
                return null;
            });

            const results = await Promise.all(promises);
            results.forEach(r => {
                if (r) {
                    console.log(`✅ Tabela encontrada: ${r.name}`);
                    availableTables.push(r);
                }
            });
        }

        console.log(`📊 Total de tabelas encontradas: ${availableTables.length}`);

        // Se não encontrou nenhuma, tentar método alternativo
        if (availableTables.length === 0) {
            console.log("⚠️  Nenhuma tabela encontrada. Tentando método alternativo...");
            return await tryAlternativeMethod();
        }

        return availableTables;

    } catch (error) {
        console.error("Erro ao listar tabelas do Supabase:", error);
        return [];
    }
}

// Método alternativo para buscar tabelas
async function tryAlternativeMethod() {
    try {
        const availableTables = [];

        // Método 2: Tentar buscar via informação_schema (se permitido)
        try {
            const { data, error } = await window.supabase
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_schema', 'public')
                .eq('table_type', 'BASE TABLE');

            if (!error && data) {
                data.forEach(row => {
                    const tableName = row.table_name;
                    const suggestedConfig = SUGGESTED_TABLES.find(t => t.name === tableName);

                    availableTables.push({
                        name: tableName,
                        displayName: suggestedConfig?.displayName || formatTableName(tableName),
                        category: suggestedConfig?.category || detectCategory(tableName),
                        verified: true
                    });
                });

                if (availableTables.length > 0) {
                    return availableTables;
                }
            }
        } catch (schemaError) {
            console.log("Método information_schema não disponível:", schemaError.message);
        }

        // Método 3: Tentar RPC function (se existir)
        try {
            const { data, error } = await window.supabase
                .rpc('get_tables_list');

            if (!error && data) {
                data.forEach(tableName => {
                    const suggestedConfig = SUGGESTED_TABLES.find(t => t.name === tableName);

                    availableTables.push({
                        name: tableName,
                        displayName: suggestedConfig?.displayName || formatTableName(tableName),
                        category: suggestedConfig?.category || detectCategory(tableName),
                        verified: true
                    });
                });
            }
        } catch (rpcError) {
            console.log("Função RPC não disponível:", rpcError.message);
        }

        return availableTables;

    } catch (error) {
        console.error("Erro no método alternativo:", error);
        return [];
    }
}

// ============================================
// FIREBASE E AUTENTICAÇÃO
// ============================================

async function initFirebase() {
    try {
        if (!window.firebaseDb) {
            console.log("Aguardando Firebase...");
            await new Promise(resolve => {
                const check = setInterval(() => {
                    if (window.firebaseDb) {
                        clearInterval(check);
                        resolve();
                    }
                }, 100);
                setTimeout(() => {
                    clearInterval(check);
                    resolve();
                }, 5000);
            });
        }

        if (window.firebaseDb) {
            firebaseDb = window.firebaseDb;
            console.log("✅ Firebase Firestore conectado!");

            // Verificar se Supabase está configurado
            if (!window.supabase) {
                console.error("❌ Supabase não inicializado!");
                showToast('Erro: Supabase não configurado!', 'error');
            } else {
                console.log("✅ Supabase configurado!");
                console.log("URL:", window.supabase.supabaseUrl);
                console.log("Projeto:", SUPABASE_PROJECT_ID);
            }

            await checkAdminUser();
            checkSavedLogin();
        } else {
            console.error("❌ Firebase não inicializado");
        }
    } catch (error) {
        console.error("Erro ao inicializar Firebase:", error);
    }
}

async function checkAdminUser() {
    try {
        const { collection, query, where, getDocs } = await import(
            "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
        );

        const q = query(
            collection(firebaseDb, 'users'),
            where('role', '==', 'admin')
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            await createDefaultAdmin();
        }
    } catch (error) {
        console.error("Erro ao verificar admin:", error);
    }
}

async function createDefaultAdmin() {
    try {
        const { collection, addDoc } = await import(
            "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
        );

        await addDoc(collection(firebaseDb, 'users'), {
            name: 'Administrador',
            token: 'admin-123',
            role: 'admin',
            createdAt: new Date().toISOString()
        });
        console.log("✅ Admin padrão criado: token admin-123");
    } catch (error) {
        console.error("Erro ao criar admin:", error);
    }
}

function checkSavedLogin() {
    const savedUser = localStorage.getItem('mixvision_user');
    if (savedUser) {
        try {
            currentMixUser = JSON.parse(savedUser);
            if (currentMixUser.role === 'admin') {
                showScreen('admin-screen');
                updateAdminWelcome();
                mixLoadUsers();
            } else {
                loadDashboardScreen();
            }
        } catch (e) {
            localStorage.removeItem('mixvision_user');
        }
    }
}

async function mixLogin() {
    const tokenInput = document.getElementById('token-input');
    const token = tokenInput ? tokenInput.value.trim() : '';
    const loginBtn = document.getElementById('login-btn');

    if (!token) {
        showError('Digite um token válido!');
        return;
    }

    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        loginBtn.disabled = true;
    }
    hideError();

    try {
        // Verificar se é admin
        if (token === 'admin-123') {
            currentMixUser = {
                id: 'admin',
                name: 'Administrador',
                role: 'admin',
                token: token
            };

            localStorage.setItem('mixvision_user', JSON.stringify(currentMixUser));
            showScreen('admin-screen');
            updateAdminWelcome();
            mixLoadUsers();
            showToast(`Olá, ${currentMixUser.name}!`, 'success');
            return;
        }

        // Buscar usuário no Firestore
        const { collection, query, where, getDocs } = await import(
            "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
        );

        const q = query(
            collection(firebaseDb, 'users'),
            where('token', '==', token)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            currentMixUser = {
                id: doc.id,
                ...doc.data()
            };

            localStorage.setItem('mixvision_user', JSON.stringify(currentMixUser));
            localStorage.setItem('userName', currentMixUser.name);
            localStorage.setItem('userRole', currentMixUser.role);
            localStorage.setItem('authToken', currentMixUser.token);

            showToast(`Olá, ${currentMixUser.name}!`, 'success');
            loadDashboardScreen();
        } else {
            showError('Token inválido ou usuário não encontrado!');
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Acessar Dashboard';
                loginBtn.disabled = false;
            }
        }
    } catch (error) {
        console.error('Erro:', error);
        showError('Erro de conexão com o servidor');
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Acessar Dashboard';
            loginBtn.disabled = false;
        }
    }
}

// ============================================
// ADMIN: GERENCIAMENTO
// ============================================

// Toggle Supervisor Select visibility
function toggleSupervisorSelect() {
    const roleSelect = document.getElementById('new-user-role');
    const supervisorGroup = document.getElementById('supervisor-select-group');
    if (roleSelect && supervisorGroup) {
        supervisorGroup.style.display = roleSelect.value === 'user' ? 'block' : 'none';
    }
}

// Toggle Supervisor Select visibility (EDIT MODAL)
function toggleEditSupervisorSelect() {
    const roleSelect = document.getElementById('edit-user-role');
    const supervisorGroup = document.getElementById('edit-supervisor-group');
    if (roleSelect && supervisorGroup) {
        supervisorGroup.style.display = roleSelect.value === 'user' ? 'block' : 'none';
    }
}

// Global cache for supervisors to populate edit modal
let globalSupervisorsList = [];

function closeEditModal() {
    const modal = document.getElementById('edit-user-modal');
    if (modal) modal.style.display = 'none'; // Using style for override
}

function showEditUserModal(userId, name, role, supervisorId) {
    const modal = document.getElementById('edit-user-modal');
    if (!modal) return;

    // Populate Fields
    document.getElementById('edit-user-id').value = userId;
    document.getElementById('edit-user-name').value = name;
    document.getElementById('edit-user-role').value = role;

    // Populate Supervisor Select
    const supervisorSelect = document.getElementById('edit-user-supervisor');
    if (supervisorSelect) {
        let html = '<option value="">Sem Supervisor</option>';
        globalSupervisorsList.forEach(sup => {
            // Prevent self-selection if user is a supervisor (circular)
            if (sup.id !== userId) {
                html += `<option value="${sup.id}" ${sup.id === supervisorId ? 'selected' : ''}>${sup.name}</option>`;
            }
        });
        supervisorSelect.innerHTML = html;
        // Pre-select logic handles basic cases, but explicit value setting is safer
        if (supervisorId) supervisorSelect.value = supervisorId;
    }

    // Toggle visibility
    toggleEditSupervisorSelect();

    // Show Modal
    modal.style.display = 'flex';
}

async function mixUpdateUser() {
    const id = document.getElementById('edit-user-id').value;
    const name = document.getElementById('edit-user-name').value;
    const role = document.getElementById('edit-user-role').value;
    const supervisorId = document.getElementById('edit-user-supervisor').value;

    if (!name) {
        showToast('Nome é obrigatório!', 'error');
        return;
    }

    try {
        const { doc, updateDoc } = await import(
            "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
        );

        const userRef = doc(firebaseDb, "users", id);

        const updateData = {
            name: name,
            role: role,
            supervisorId: (role === 'user' && supervisorId) ? supervisorId : null // Clear supervisor if role is supervisor or none selected
        };

        // Remove supervisorId field if null to keep clean? Or set null. Firestore merge handles it.
        // Better to explicitly set what we want.

        await updateDoc(userRef, updateData);

        showToast('Usuário atualizado com sucesso!', 'success');
        closeEditModal();
        mixLoadUsers(); // Refresh list

    } catch (e) {
        console.error("Erro ao atualizar usuário:", e);
        showToast('Erro ao atualizar. Tente novamente.', 'error');
    }
}

async function mixCreateUser() {
    const nameInput = document.getElementById('new-user-name');
    const name = nameInput ? nameInput.value.trim() : '';

    // Novos campos
    const roleInput = document.getElementById('new-user-role');
    const role = roleInput ? roleInput.value : 'user';

    const supervisorInput = document.getElementById('new-user-supervisor');
    const supervisorId = supervisorInput ? supervisorInput.value : '';

    const createBtn = document.getElementById('create-user-btn');

    if (!name) {
        showToast('Digite um nome para o colaborador!', 'error');
        return;
    }

    const token = Math.random().toString(36).substring(2, 10).toUpperCase();

    if (createBtn) {
        createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';
        createBtn.disabled = true;
    }

    try {
        const { collection, addDoc } = await import(
            "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
        );

        const userData = {
            name: name,
            token: token,
            role: role,
            createdAt: new Date().toISOString()
        };

        // Se for vendedor e tiver supervisor
        if (role === 'user' && supervisorId) {
            userData.supervisorId = supervisorId;
        }

        await addDoc(collection(firebaseDb, 'users'), userData);

        showToast(`Vendedor "${name}" criado!\nToken: ${token}`, 'success');
        navigator.clipboard.writeText(token);

        if (nameInput) nameInput.value = '';
        mixLoadUsers();
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        showToast('Erro ao criar vendedor. Tente novamente.', 'error');
    } finally {
        if (createBtn) {
            createBtn.innerHTML = '<i class="fas fa-plus"></i> Gerar Token';
            createBtn.disabled = false;
        }
    }
}

async function mixLoadUsers() {
    const container = document.getElementById('users-container');
    if (!container) return;

    try {
        const { collection, getDocs, query, orderBy } = await import(
            "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
        );

        const q = query(collection(firebaseDb, 'users'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        const usersList = [];
        const supervisorsList = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // IMPORTANT: Include the ID
            usersList.push({ id: doc.id, ...data });
            if (data.role === 'supervisor') {
                supervisorsList.push({ id: doc.id, name: data.name });
            }
        });

        // Update Global Cache for Edit Modal
        globalSupervisorsList = supervisorsList;

        // 1. Popular Select de Supervisores
        const supervisorSelect = document.getElementById('new-user-supervisor');
        if (supervisorSelect) {
            supervisorSelect.innerHTML = '<option value="">Selecione...</option>';
            supervisorsList.forEach(sup => {
                supervisorSelect.innerHTML += `<option value="${sup.id}">${sup.name}</option>`;
            });
            // Enhance with MixSelect
            setTimeout(() => new MixSelect(supervisorSelect), 50);
        }

        // 2. Renderizar Lista
        if (usersList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Nenhum colaborador cadastrado.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = usersList.map(u => {
            const roleBadge = u.role === 'supervisor'
                ? '<span class="badge" style="background:#8b5cf6; padding: 2px 6px; border-radius: 4px; color: white; font-size: 10px;">Supervisor</span>'
                : '<span class="badge" style="background:#10b981; padding: 2px 6px; border-radius: 4px; color: white; font-size: 10px;">Vendedor</span>';

            const supervisorInfo = u.supervisorId
                ? `<div style="font-size: 12px; color: #64748b; margin-top: 4px;"> <i class="fas fa-user-tie"></i> Sup: ${supervisorsList.find(s => s.id === u.supervisorId)?.name || 'N/A'}</div>`
                : '';

            // Escape strings for onclick
            const safeName = u.name.replace(/'/g, "\\'");
            const safeRole = u.role || 'user';
            const safeSupId = u.supervisorId || '';

            return `
            <div class="user-card" style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div>
                    <div style="font-weight: 600; color: #1e293b;">${u.name} ${roleBadge}</div>
                    <div style="font-family: monospace; color: #64748b; font-size: 0.9rem;">Token: ${u.token}</div>
                    ${supervisorInfo}
                </div>
                <div style="display: flex; gap: 8px;">
                     <button class="btn-icon" title="Editar" onclick="showEditUserModal('${u.id}', '${safeName}', '${safeRole}', '${safeSupId}')" style="color: #3b82f6;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" title="Copiar Token" onclick="navigator.clipboard.writeText('${u.token}'); showToast('Token copiado!')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
        `}).join('');

    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        container.innerHTML = `
            <div class="error-state">
                <h4><i class="fas fa-exclamation-triangle"></i> Erro</h4>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function mixLogout() {
    localStorage.removeItem('mixvision_user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    currentMixUser = null;
    currentTableName = null;
    currentTableDisplayName = null;
    showScreen('login-screen');
    const tokenInput = document.getElementById('token-input');
    if (tokenInput) tokenInput.value = '';
    showToast('Logout realizado', 'success');
}

// ============================================
// DASHBOARD: TABELAS DO SUPABASE (ATUALIZADO)
// ============================================

// Variável global para controle de visualização do supervisor
let selectedSubordinateForSupervisor = null;
let supervisorSubordinatesList = [];

async function loadDashboardScreen() {
    const userName = currentMixUser?.name || 'Vendedor';
    const role = currentMixUser?.role || 'user';
    const userId = currentMixUser?.id;

    const avatar = document.getElementById('dashboard-user-avatar');
    const nameEl = document.getElementById('dashboard-user-name');
    const roleEl = document.getElementById('dashboard-user-role'); // Requires adding id="dashboard-user-role" to HTML if not present, checking... index.html line 305 has it.

    if (avatar) avatar.textContent = userName[0]?.toUpperCase() || 'V';
    if (nameEl) nameEl.textContent = userName;
    if (roleEl) roleEl.textContent = role.toUpperCase();

    // Supervisor Logic
    // Verificações de Role
    if (currentMixUser.role === 'supervisor') {
        const controls = document.getElementById('supervisor-view-controls');
        if (controls) {
            controls.classList.remove('hidden');
            controls.style.display = 'flex'; // Force display
        }

        // Buscar seus liderados para o Select
        const { collection, query, where, getDocs } = await import(
            "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
        );

        const qSub = query(collection(firebaseDb, 'users'), where('supervisorId', '==', currentMixUser.id));
        const snapSub = await getDocs(qSub);

        const subSelect = document.getElementById('supervisor-subordinate-select');
        if (subSelect) {
            let html = '<option value="ALL">Todos os Liderados</option>';
            // Add self option
            html += `<option value="${currentMixUser.name}">Meus Dados (Supervisor)</option>`;

            snapSub.forEach(doc => {
                const sub = doc.data();
                html += `<option value="${sub.name}">${sub.name}</option>`;
                supervisorSubordinatesList.push(sub.name);
            });
            subSelect.innerHTML = html;
        }
    } else {
        const controls = document.getElementById('supervisor-view-controls');
        if (controls) controls.classList.add('hidden');
    }

    showScreen('dashboard-screen');

    setTimeout(() => {
        initializeApp();
        loadAvailableTables();
        mixLoadData();
        // Enhance all dashboard selects
        enhanceAllSelects();
    }, 100);
}

window.handleSupervisorChange = function () {
    const select = document.getElementById('supervisor-subordinate-select');
    if (!select) return;

    const val = select.value;
    if (val === 'all') {
        selectedSubordinateForSupervisor = supervisorSubordinatesList;
    } else {
        selectedSubordinateForSupervisor = val; // Single name string
    }

    // Reload data if table is selected
    if (currentTableName && currentTableDisplayName) {
        loadDataFromTable(currentTableName, currentTableDisplayName);
    }
}

async function loadAvailableTables() {
    const container = document.getElementById('spreadsheet-cards');
    const noSpreadsheets = document.getElementById('no-spreadsheets');

    if (!container) return;

    try {
        // Mostrar estado de carregamento
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <div class="spinner" style="width: 40px; height: 40px; margin: 0 auto 20px; border: 3px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p>Consultando tabelas disponíveis no Supabase...</p>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 10px;">Projeto: ${SUPABASE_PROJECT_ID}</p>
            </div>
        `;

        // Consultar tabelas do Supabase dinamicamente
        const supabaseTables = await listSupabaseTables();

        // Se não encontrou nenhuma tabela
        if (!supabaseTables || supabaseTables.length === 0) {
            console.warn("⚠️  Nenhuma tabela encontrada no Supabase.");

            container.innerHTML = `
                <div class="error-state" style="grid-column: 1 / -1;">
                    <h4><i class="fas fa-database mr-2"></i> Nenhuma Tabela Encontrada</h4>
                    <p>Não foi possível encontrar tabelas no seu projeto do Supabase.</p>
                    <p style="font-size: 12px; color: #94a3b8; margin-top: 5px;">Projeto: ${SUPABASE_PROJECT_ID}</p>
                    <div class="alert" style="background: rgba(245, 158, 11, 0.1); padding: 12px; border-radius: 8px; margin: 15px 0;">
                        <i class="fas fa-info-circle mr-2" style="color: #f59e0b;"></i>
                        <strong>Soluções:</strong><br>
                        1. Crie tabelas no seu projeto Supabase<br>
                        2. Clique em "Abrir Meu Supabase" para gerenciar<br>
                        3. Use nomes comuns como "vendas", "produtos", etc.
                    </div>
                    <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                        <button onclick="loadAvailableTables()" class="btn-primary">
                            <i class="fas fa-redo mr-2"></i> Tentar Novamente
                        </button>
                        <button onclick="openSupabaseTables()" class="btn-secondary">
                            <i class="fas fa-external-link-alt mr-2"></i> Abrir Meu Supabase
                        </button>
                    </div>
                </div>
            `;

            if (noSpreadsheets) noSpreadsheets.classList.remove('hidden');
            showToast('Nenhuma tabela encontrada no seu Supabase!', 'warning');
            return;
        }

        // Renderizar tabelas encontradas
        renderTablesList(container, supabaseTables);

        if (noSpreadsheets) noSpreadsheets.classList.add('hidden');

        showToast(`${supabaseTables.length} tabela(s) encontrada(s) no seu Supabase`, 'success');
        console.log(`✅ ${supabaseTables.length} tabelas disponíveis no projeto ${SUPABASE_PROJECT_ID}`);

    } catch (error) {
        console.error('Erro ao carregar tabelas:', error);
        container.innerHTML = `
            <div class="error-state" style="grid-column: 1 / -1;">
                <h4><i class="fas fa-exclamation-triangle mr-2"></i> Erro ao Conectar</h4>
                <p>Não foi possível consultar as tabelas do Supabase.</p>
                <p><small>Projeto: ${SUPABASE_PROJECT_ID}</small></p>
                <p><small>${error.message}</small></p>
                <div style="margin-top: 20px;">
                    <button onclick="loadAvailableTables()" class="btn-primary">
                        <i class="fas fa-redo mr-2"></i> Tentar Novamente
                    </button>
                    <button onclick="useSuggestedTables()" class="btn-secondary ml-2">
                        <i class="fas fa-list mr-2"></i> Usar Tabelas Sugeridas
                    </button>
                </div>
            </div>
        `;
        showToast('Erro ao conectar com seu Supabase', 'error');
    }
}

// Fallback para usar tabelas sugeridas
function useSuggestedTables() {
    const container = document.getElementById('spreadsheet-cards');
    if (container) {
        const suggestedWithStatus = SUGGESTED_TABLES.map(t => ({ ...t, verified: false }));
        renderTablesList(container, suggestedWithStatus);
        showToast('Usando tabelas sugeridas (não verificadas no Supabase)', 'warning');
    }
}

function renderTablesList(container, tables) {
    if (!tables || tables.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">
                    <i class="fas fa-database"></i>
                </div>
                <h4>Nenhuma tabela disponível</h4>
                <p>Crie tabelas no seu Supabase primeiro</p>
                <p style="font-size: 12px; color: #94a3b8;">Projeto: ${SUPABASE_PROJECT_ID}</p>
            </div>
        `;
        return;
    }

    let html = '<div class="spreadsheet-grid">';

    tables.forEach(table => {
        const config = CATEGORY_CONFIG[table.category] || CATEGORY_CONFIG.mercearia;
        const isVerified = table.verified !== false;

        html += `
            <div class="spreadsheet-card ${table.category} ${!isVerified ? 'unverified' : ''}" 
                 onclick="selectTable('${table.name.replace(/'/g, "\\'")}', '${table.displayName.replace(/'/g, "\\'")}', '${table.category}')">
                <div class="spreadsheet-icon">
                    <i class="fas ${config.icon}"></i>
                    ${!isVerified ? '<span class="unverified-badge" title="Não verificado no Supabase">?</span>' : ''}
                </div>
                <h4>${table.displayName}</h4>
                <p class="spreadsheet-desc">
                    <strong>Tabela:</strong> ${table.name}<br>
                    ${config.description}
                </p>
                <div class="spreadsheet-meta">
                    <span class="category-badge ${table.category}">
                        <i class="fas ${config.icon}"></i>
                        ${config.name}
                    </span>
                    <span><i class="fas fa-database"></i> Supabase</span>
                    ${isVerified ?
                '<span class="verified-badge" title="Tabela verificada no seu Supabase"><i class="fas fa-check-circle"></i> Disponível</span>' :
                '<span class="unverified-text" title="Tabela não verificada"><i class="fas fa-question-circle"></i> Não verificado</span>'}
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Adicionar CSS dinâmico se necessário
    addDynamicCSS();
}

function addDynamicCSS() {
    if (!document.getElementById('dynamic-table-css')) {
        const style = document.createElement('style');
        style.id = 'dynamic-table-css';
        style.textContent = `
            .unverified-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #f59e0b;
                color: white;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                z-index: 1;
            }
            .verified-badge {
                background: rgba(16, 185, 129, 0.2);
                color: #10b981;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 11px;
                display: inline-flex;
                align-items: center;
                gap: 3px;
            }
            .unverified-text {
                background: rgba(245, 158, 11, 0.2);
                color: #f59e0b;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 11px;
                display: inline-flex;
                align-items: center;
                gap: 3px;
            }
            .spreadsheet-card.unverified {
                opacity: 0.85;
                border: 1px dashed #f59e0b;
            }
            .spreadsheet-card.unverified:hover {
                opacity: 1;
                border: 1px solid #f59e0b;
                transform: translateY(-2px);
            }
            .spreadsheet-icon {
                position: relative;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

function filterSpreadsheets(category) {
    document.querySelectorAll('.category-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const btn = document.querySelector(`.category-filter-btn.${category}`);
    if (btn) btn.classList.add('active');

    const cards = document.querySelectorAll('.spreadsheet-card');
    cards.forEach(card => {
        if (category === 'all' || card.classList.contains(category)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ============================================
// FUNÇÃO PARA ABRIR SEU SUPABASE ESPECÍFICO
// ============================================

function openSupabaseTables() {
    // URL do Table Editor do SEU projeto específico
    const tableEditorUrl = `https://app.supabase.com/project/${SUPABASE_PROJECT_ID}/editor`;

    console.log('🚀 Abrindo SEU projeto do Supabase:', tableEditorUrl);
    console.log('📊 Projeto: 33Soprano\'s Project');
    console.log('🔗 URL:', tableEditorUrl);

    // Abrir em nova aba
    window.open(tableEditorUrl, '_blank');

    showToast('Abrindo seu projeto do Supabase...', 'info');
}

// ============================================
// SELEÇÃO E CARREGAMENTO DE TABELA
// ============================================

async function selectTable(tableName, displayName, category) {
    currentTableName = tableName;
    currentTableDisplayName = displayName;

    const selector = document.getElementById('spreadsheet-selector');
    const dataSection = document.getElementById('data-section');

    if (selector) selector.classList.add('hidden');
    if (dataSection) dataSection.classList.remove('hidden');

    try {
        const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.mercearia;

        const headerHTML = `
            <div class="selected-spreadsheet-header ${category}">
                <div class="selected-spreadsheet-icon">
                    <i class="fas ${config.icon}"></i>
                </div>
                <div>
                    <h3>${displayName}</h3>
                    <p class="text-secondary">
                        <span class="category-badge ${category}">
                            <i class="fas ${config.icon}"></i>
                            ${config.name}
                        </span>
                        • Tabela: <strong>${tableName}</strong> • Projeto: ${SUPABASE_PROJECT_ID}
                    </p>
                </div>
                <div class="spreadsheet-actions">
                    <button id="btn-change-table" class="btn-secondary">
                        <i class="fas fa-exchange-alt mr-2"></i> Trocar Tabela
                    </button>
                    <button id="btn-refresh-data" class="btn-primary">
                        <i class="fas fa-sync-alt mr-2"></i> Atualizar
                    </button>
                </div>
            </div>
        `;

        const headerContainer = document.getElementById('selected-spreadsheet-header');
        if (headerContainer) headerContainer.innerHTML = headerHTML;

        const changeBtn = document.getElementById('btn-change-table');
        const refreshBtn = document.getElementById('btn-refresh-data');

        if (changeBtn) {
            changeBtn.addEventListener('click', () => {
                if (dataSection) dataSection.classList.add('hidden');
                if (selector) selector.classList.remove('hidden');
                currentTableName = null;
                currentTableDisplayName = null;
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadDataFromTable(tableName, displayName);
            });
        }

        // Carregar dados da tabela
        await loadDataFromTable(tableName, displayName);

    } catch (error) {
        console.error('Erro ao selecionar tabela:', error);
        showDataError(`Erro ao acessar a tabela "${displayName}" do seu Supabase: ${error.message}`);
    }
}

async function loadDataFromTable(tableName, displayName) {
    showDataLoading();
    console.log(`📥 Carregando dados da tabela: ${tableName}`);
    console.log(`📊 Projeto: ${SUPABASE_PROJECT_ID}`);

    try {
        // Buscar TODOS os dados da tabela (com paginação automática)
        const { data, error } = await fetchAllRows(tableName);

        if (error) {
            if (error.message.includes('does not exist')) {
                throw new Error(`A tabela "${tableName}" não existe no seu Supabase (Projeto: ${SUPABASE_PROJECT_ID}).`);
            }
            throw error;
        }

        console.log(`✅ ${data?.length || 0} registros carregados da tabela ${tableName}`);
        console.log(`🏆 Projeto: ${SUPABASE_PROJECT_ID}`);

        if (!data || data.length === 0) {
            showDataError(`
                <strong>Tabela "${displayName}" está vazia!</strong><br><br>
                A tabela <strong>${tableName}</strong> no seu projeto Supabase não contém dados.<br>
                <strong>Projeto:</strong> ${SUPABASE_PROJECT_ID}<br><br>
                <strong>Solução:</strong> Adicione dados à tabela no seu Supabase.
            `);
            return;
        }

        // Converter dados do Supabase para formato de "planilha"
        const rows = convertSupabaseDataToRows(data);

        // Processar os dados
        processData(rows);

    } catch (error) {
        console.error('❌ Erro ao carregar dados da tabela:', error);
        showDataError(`
            <strong>Erro ao carregar dados de "${displayName}"</strong><br><br>
            <strong>Tabela:</strong> ${tableName}<br>
            <strong>Projeto:</strong> ${SUPABASE_PROJECT_ID}<br>
            <strong>Erro:</strong> ${error.message}<br><br>
            <strong>Verifique:</strong><br>
            1. Se a tabela existe no seu Supabase<br>
            2. Permissões de acesso à tabela<br>
            3. Conexão com o Supabase<br>
            4. Se há dados na tabela
        `);
    }
}

function convertSupabaseDataToRows(supabaseData) {
    if (!supabaseData || supabaseData.length === 0) {
        return [];
    }

    console.log('🔄 Convertendo dados do seu Supabase para formato de planilha...');

    // Obter cabeçalhos (chaves do primeiro objeto)
    const firstRow = supabaseData[0];
    const headers = Object.keys(firstRow);

    console.log('📋 Cabeçalhos detectados:', headers);

    // Criar array de linhas
    const rows = [];

    // Adicionar cabeçalhos como primeira linha
    rows.push(headers);

    // Adicionar dados
    supabaseData.forEach(row => {
        const rowData = headers.map(header => row[header] ?? '');
        rows.push(rowData);
    });

    console.log(`✅ Convertidos ${rows.length} linhas (incluindo cabeçalhos)`);
    return rows;
}

function showDataLoading() {
    const loadingEl = document.getElementById('data-loading');
    const filtersEl = document.getElementById('filters-section');
    const errorEl = document.getElementById('data-error');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (filtersEl) filtersEl.classList.add('hidden');
    if (errorEl) errorEl.classList.add('hidden');
}

function hideDataLoading() {
    const loadingEl = document.getElementById('data-loading');
    const filtersEl = document.getElementById('filters-section');

    if (loadingEl) loadingEl.classList.add('hidden');
    if (filtersEl) filtersEl.classList.remove('hidden');
}

function showDataError(message) {
    const loadingEl = document.getElementById('data-loading');
    const filtersEl = document.getElementById('filters-section');
    const errorEl = document.getElementById('data-error');
    const messageEl = document.getElementById('error-message');

    if (loadingEl) loadingEl.classList.add('hidden');
    if (filtersEl) filtersEl.classList.add('hidden');
    if (errorEl) errorEl.classList.remove('hidden');
    if (messageEl) messageEl.innerHTML = message;

    const retryBtn = document.getElementById('btn-retry');
    if (retryBtn) {
        retryBtn.onclick = () => {
            loadDataFromTable(currentTableName, currentTableDisplayName);
        };
    }
}

// ============================================
// SISTEMA DE PROCESSAMENTO DE DADOS
// ============================================

// ============================================
// SISTEMA DE PROCESSAMENTO DE DADOS
// ============================================

let allProducts = new Set();
let hierarchy = {};
let currentTab = 'opportunities';
let currentProfile = 'N/D';
let currentMissing = [];
let currentSold = [];
let currentConsultantName = '';

// NOVO: Controle de Produtos positivado
let currentWorkedProducts = new Set();
let currentClientName = '';
let currentPeriod = '';
let globalPerformanceCache = null; // Cache para evitar requisições repetidas

let consultantSelect, routeGroup, opportunitiesList, debugLog;
let resultsTitle, tabOpportunities, tabSold;

// Função auxiliar para analisar dados sem afetar a UI principal
function analyzeTableData(rows, targetUser, dayFilter = 'Todos') {
    if (!rows || rows.length === 0) return { ops: 0, sold: 0 };

    let totalOps = 0;
    let totalSold = 0;

    // Helper para log na tela se disponível, senão console
    const debug = (msg) => {
        console.log(msg);
        if (typeof log === 'function') log(`[Perf] ${msg}`);
    };

    try {
        // Determine Target User(s)
        // If supervisor has selected someone (single string or array), use that.
        // Otherwise use the passed targetUser (which is usually current logged user)
        const effectiveTarget = selectedSubordinateForSupervisor ? selectedSubordinateForSupervisor : targetUser;

        debug(`Iniciando análise. Target: ${JSON.stringify(effectiveTarget)}. Linhas: ${rows.length}`);

        // Helper to check if row matches target
        const isTargetMatch = (consultantNameInRow) => {
            if (!consultantNameInRow) return false;
            const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            const cNorm = norm(consultantNameInRow);

            if (Array.isArray(effectiveTarget)) {
                // Check if matches ANY name in array
                return effectiveTarget.some(t => {
                    const tNorm = norm(t);
                    return cNorm.includes(tNorm) || tNorm.includes(cNorm);
                });
            } else {
                // Single user string
                const tNorm = norm(effectiveTarget);
                return cNorm.includes(tNorm) || tNorm.includes(cNorm);
            }
        };

        // DETECÇÃO DE CABEÇALHO (Cópia simplificada do processData)
        const maxScan = Math.min(50, rows.length);
        let headerRow = -1;

        // 1. Procura por "Consultor"
        for (let r = 0; r < maxScan; r++) {
            const row = rows[r] || [];
            for (let c = 0; c < row.length; c++) {
                const cell = row[c] ? String(row[c]).trim().toLowerCase() : '';
                if (cell === 'consultor' || cell === 'consultor(a)' || cell === 'vendedor' || cell === 'rc') {
                    headerRow = r;
                    break;
                }
            }
            if (headerRow !== -1) break;
        }

        if (headerRow === -1) {
            debug("⚠️ Cabeçalho 'Consultor' não detectado explicitamente. Tentando linha 0.");
            headerRow = 0;
        }

        const headers = (rows[headerRow] || []).map(h => h ? String(h).trim() : '');

        // Mapeamento de Colunas
        const findCol = (patterns) => {
            for (let i = 0; i < headers.length; i++) {
                const h = headers[i].toLowerCase();
                if (patterns.some(p => typeof p === 'string' ? h === p : p.test(h))) return i;
            }
            for (let i = 0; i < headers.length; i++) {
                const h = headers[i].toLowerCase();
                if (patterns.some(p => typeof p === 'string' ? h.includes(p) : false)) return i;
            }
            return -1;
        };

        const colConsultant = findCol(['consultor', 'vendedor', 'representante', 'rc']);
        const colRoute = findCol(['rota', 'dia', 'visita', 'frequencia']);
        const colProduct = findCol(['produto', 'item', 'sku', 'descri']);

        if (colConsultant === -1) {
            debug("❌ Coluna Consultor não encontrada nos headers: " + headers.join(', '));
            return { ops: 0, sold: 0 };
        }

        // Forçar WIDE se o usuário pediu regra de coluna 8
        const isWide = true;

        let productCols = [];
        let startIndex = 8;

        if (isWide) {
            const infoIndices = [colConsultant, colRoute, findCol(['cliente'])].filter(i => i !== -1);
            // GARANTIR inicio após coluna 8 (index 8 = coluna 9)
            startIndex = Math.max(8, (infoIndices.length ? Math.max(...infoIndices) + 1 : 8));

            for (let c = startIndex; c < headers.length; c++) {
                const name = headers[c];
                // Ignorar colunas de TOTAL e META e vazias
                if (name && name !== 'TOTAL' && !name.toLowerCase().includes('meta')) {
                    productCols.push(c);
                }
            }
            debug(`Colunas de produto detectadas: ${productCols.length} (Início índice ${startIndex})`);
        }

        // Processar Linhas
        let rowsProcessed = 0;
        let matchedConsultantCount = 0;

        for (let r = headerRow + 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row) continue;

            rowsProcessed++;
            const consultant = row[colConsultant] ? String(row[colConsultant]).trim() : '';

            // Check Match
            if (!isTargetMatch(consultant)) {
                continue;
            }

            // 2. Verificar Filtro de Dia (Rota)
            if (dayFilter !== 'Todos') {
                if (colRoute !== -1) {
                    const routeVal = row[colRoute] ? String(row[colRoute]).trim().toLowerCase() : '';

                    // Normalização Forte (Remove acentos/cedilha): Terça -> terca
                    const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

                    const routeValNorm = norm(routeVal);
                    const dayFilterNorm = norm(dayFilter.toLowerCase());

                    if (!routeValNorm.includes(dayFilterNorm)) continue;
                } else {
                    continue; // Sem rota, ignora se tiver filtro
                }
            }

            matchedConsultantCount++;

            if (isWide) {
                for (const pc of productCols) {
                    const val = row[pc];

                    // Lógica de "Oportunidade":
                    // Se cell vazio, nulo, undefined -> Oportunidade
                    // Se cell "0", "0.0", "0,0" -> Oportunidade (venda zero) -> User confirmou "linhas em branco", mas as vezes 0 conta
                    // Vamos considerar vazio E zero como oportunidade para garantir

                    let isSold = false;
                    if (val !== undefined && val !== null) {
                        const sVal = String(val).trim();
                        if (sVal !== '' && sVal !== '0' && sVal !== '0.0' && sVal !== '0,0') {
                            isSold = true;
                        }
                    }

                    if (!isSold) {
                        totalOps++;
                    } else {
                        totalSold++;
                    }
                }
            }
        }

        debug(`Linhas: ${rowsProcessed}, Match: ${matchedConsultantCount}, Ops: ${totalOps}, Vendidos: ${totalSold}`);

    } catch (e) {
        debug("ERRO FATAL analyzeTableData: " + e.message);
    }

    return { ops: totalOps, sold: totalSold };
}

function getPeriodString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function loadActions(tableName) {
    if (!currentConsultantName || !currentClientName) return;

    currentPeriod = getPeriodString();
    currentWorkedProducts = new Set();

    console.log(`📥 Carregando ações para ${currentConsultantName} / ${currentClientName} (${currentPeriod})...`);

    try {
        const { data, error } = await window.supabase
            .from('acoes_vendedores')
            .select('produto, acao')
            .eq('vendedor_nome', currentConsultantName) // Usando nome como ID por enquanto, ideal seria ID
            .eq('cliente', currentClientName)
            .eq('mes_ano', currentPeriod);

        if (error) {
            console.error("Erro ao carregar ações:", error);
            return;
        }

        if (data) {
            data.forEach(item => {
                if (item.acao === 'positivado') {
                    currentWorkedProducts.add(item.produto);
                }
            });
            console.log(`✅ ${currentWorkedProducts.size} produtos positivados encontrados.`);
        }
    } catch (err) {
        console.error("Exceção ao carregar ações:", err);
    }
}

async function registerAction(productName, actionType) {
    if (!currentMixUser) {
        showToast("Erro: Usuário não autenticado", "error");
        return;
    }

    // Otimistic UI Update
    const btn = document.querySelector(`button[data-prod="${escapeHtml(productName)}"]`);
    if (btn) {
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
    }

    try {
        const actionData = {
            vendedor_id: currentMixUser.id || 'temp-id', // Ajustar conforme auth real
            vendedor_nome: currentMixUser.name,
            vendedor_token: currentMixUser.token,
            categoria: currentTableName || 'geral',
            produto: productName,
            cliente: currentClientName,
            consultor: currentConsultantName,
            rota: document.getElementById('route-select')?.value || 'N/D',
            perfil_cliente: currentProfile,
            acao: actionType,
            mes_ano: getPeriodString(),
            data_acao: new Date().toISOString()
        };

        const { error } = await window.supabase
            .from('acoes_vendedores')
            .insert([actionData]);

        if (error) throw error;

        // Sucesso
        if (actionType === 'positivado') {
            currentWorkedProducts.add(productName);
            showToast(`Produto "${productName}" marcado como positivado!`, 'success');
            renderList(); // Re-renderiza para atualizar botão
        }

    } catch (error) {
        console.error("Erro ao registrar ação:", error);
        showToast("Erro ao salvar ação: " + error.message, "error");
        if (btn) {
            btn.innerHTML = originalContent; // Reverte botão
            btn.disabled = false;
        }
    }
}

function log(msg) {
    const timestamp = new Date().toLocaleTimeString();
    if (debugLog) {
        debugLog.textContent += `[${timestamp}] ${msg}\n`;
        debugLog.scrollTop = debugLog.scrollHeight;
    }
    console.log(`[MixVision] ${msg}`);
}

function escapeHtml(s) {
    if (s === undefined || s === null) return '';
    return String(s).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}

function toNumber(value) {
    if (value === undefined || value === null) return NaN;
    const s = String(value).trim();
    if (s === '') return NaN;
    let t = s.replace(/\s+/g, '');
    const hasDot = t.indexOf('.') !== -1;
    const hasComma = t.indexOf(',') !== -1;
    if (hasDot && hasComma) {
        if (t.lastIndexOf(',') > t.lastIndexOf('.')) {
            t = t.replace(/\./g, '').replace(/,/g, '.');
        } else {
            t = t.replace(/,/g, '');
        }
    } else if (hasComma && !hasDot) {
        t = t.replace(/,/g, '.');
    }
    t = t.replace(/[^0-9\.-]/g, '');
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
}

function isNonEmptyText(val) {
    if (val === undefined || val === null) return false;
    const s = String(val).trim();
    if (s === '') return false;
    const n = toNumber(s);
    return Number.isNaN(n);
}

function normalizeRoute(r) {
    if (!r) return 'Rota N/D';
    return String(r).trim();
}

function detectProfile(str) {
    if (!str) return 'N/D';
    str = String(str).toUpperCase();
    if (str.includes('A') || str.includes('PERFIL A') || str.includes('CLIENTE A')) return 'A';
    if (str.includes('B') || str.includes('PERFIL B') || str.includes('CLIENTE B')) return 'B';
    if (str.includes('C') || str.includes('PERFIL C') || str.includes('CLIENTE C')) return 'C';
    return 'N/D';
}

function processData(data) {
    try {
        log(`Iniciando processamento de ${data.length} linhas...`);
        if (!data || data.length === 0) {
            log('Tabela vazia');
            return;
        }

        showLoading('Processando dados da tabela...');

        hierarchy = {};
        allProducts = new Set();

        console.log('🔍 DEBUG: Mostrando primeiras 3 linhas da tabela:');
        for (let i = 0; i < Math.min(3, data.length); i++) {
            console.log(`Linha ${i}:`, data[i]);
        }

        // DETECÇÃO DE CABEÇALHO - PRIORIDADE PARA "CONSULTOR"
        const maxScan = Math.min(50, data.length);

        // Primeiro: Procurar especificamente por "Consultor" (exato ou similar)
        let headerRow = -1;
        let consultantCol = -1;

        for (let r = 0; r < maxScan; r++) {
            const row = data[r] || [];
            for (let c = 0; c < row.length; c++) {
                const cell = row[c] ? String(row[c]).trim().toLowerCase() : '';

                // Procura por "consultor" em várias variações
                if (cell === 'consultor' ||
                    cell === 'consultor(a)' ||
                    cell === 'consultor/a' ||
                    cell.includes('consultor') && cell.length < 15) {
                    headerRow = r;
                    consultantCol = c;
                    console.log(`✅ Encontrada coluna "Consultor" na linha ${r + 1}, coluna ${c}: "${row[c]}"`);
                    break;
                }
            }
            if (headerRow !== -1) break;
        }

        // Se não encontrou "Consultor", tenta outros padrões
        if (headerRow === -1) {
            console.log('⚠️  Não encontrou "Consultor", tentando padrões alternativos...');
            const headerKeywords = [
                /consultor/i, /vendedor/i, /representante/i, /nome vendedor/i,
                /cliente/i, /pdv/i, /ponto de venda/i,
                /produto/i, /item/i, /descri/i, /sku/i,
                /rota/i, /roteiro/i,
                /perfil/i, /categoria/i, /tipo/i
            ];

            let bestRow = 0, bestScore = -1;
            for (let r = 0; r < maxScan; r++) {
                const row = (data[r] || []).map(c => c ? String(c).toLowerCase().trim() : '');
                let score = 0;
                for (const cell of row) {
                    if (!cell) continue;
                    for (const kw of headerKeywords) {
                        if (kw.test(cell)) {
                            score++;
                            break;
                        }
                    }
                }
                if (score > bestScore) {
                    bestScore = score;
                    bestRow = r;
                }
            }

            headerRow = bestRow;
            console.log(`📊 Cabeçalho detectado na linha ${headerRow + 1} (score=${bestScore})`);
        }

        const headers = (data[headerRow] || []).map(h => h ? String(h).trim() : '');
        console.log('📋 Cabeçalhos detectados:', headers);

        // FUNÇÃO PARA ENCONTRAR COLUNAS
        const findColByPatterns = (patterns, exactFirst = false) => {
            // Primeiro: procura exato (case insensitive)
            for (let i = 0; i < headers.length; i++) {
                const headerText = headers[i] ? String(headers[i]).trim().toLowerCase() : '';
                if (!headerText) continue;

                for (const pattern of patterns) {
                    if (typeof pattern === 'string') {
                        if (headerText === pattern.toLowerCase()) {
                            console.log(`✅ Encontrada coluna EXATA "${headers[i]}" (índice ${i})`);
                            return i;
                        }
                    } else if (pattern.test(headerText)) {
                        console.log(`✅ Encontrada coluna "${headers[i]}" (índice ${i}) para padrão ${pattern}`);
                        return i;
                    }
                }
            }

            // Se não encontrou exato, procura por contém
            for (let i = 0; i < headers.length; i++) {
                const headerText = headers[i] ? String(headers[i]).toLowerCase() : '';
                if (!headerText) continue;

                for (const pattern of patterns) {
                    if (typeof pattern === 'string') {
                        if (headerText.includes(pattern.toLowerCase())) {
                            console.log(`✅ Encontrada coluna CONTÉM "${headers[i]}" (índice ${i})`);
                            return i;
                        }
                    }
                }
            }

            // Se não encontrou nada, retorna -1 silenciosamente (esperado para formato Wide)
            // console.warn(`❌ Nenhuma coluna encontrada para padrões:`, patterns);
            return -1;
        };

        // PADRÕES
        const consultantPatterns = [
            'consultor', 'consultor(a)', 'consultor/a', /consultor/i,
            'vendedor', /vendedor/i, 'representante', /representante/i,
            'rep.', 'nome vendedor', 'vendedora', 'consultora',
            'vdr', 'vnd', 'nome do vendedor', 'vendedor responsável',
            'rc', /rc$/i
        ];

        const clientPatterns = [
            'name', 'nome', 'cliente', 'pdv', 'ponto de venda',
            'fantasia', 'loja', 'filial', 'nome cliente', 'estabelecimento',
            /cliente/i, /pdv/i, /^name$/i
        ];

        const productPatterns = [
            'produto', 'item', 'descri', 'sku', 'código',
            'produtos', 'itens', 'material', 'mercadoria',
            /produto/i, /item/i
        ];

        const routePatterns = ['rota', 'roteiro', 'zona', 'região', /rota/i];
        const profilePatterns = ['perfil', 'categoria', 'tipo', 'segmento', 'class', /perfil/i];

        const colMap = {
            consultant: findColByPatterns(consultantPatterns, true),
            client: findColByPatterns(clientPatterns),
            product: findColByPatterns(productPatterns),
            route: findColByPatterns(routePatterns),
            profile: findColByPatterns(profilePatterns),
            headerRowIndex: headerRow
        };

        console.log('🗺️  Mapeamento final:', colMap);

        // Se ainda não encontrou consultor, tenta método manual
        if (colMap.consultant === -1) {
            console.log('❌ Coluna de consultor não encontrada automaticamente.');

            const errorMsg = `
            <strong>Erro: Coluna de Vendedor/Consultor não identificada!</strong><br><br>
            O sistema não conseguiu encontrar automaticamente a coluna com os nomes dos vendedores.<br>
            Verifique se a tabela possui uma coluna com um dos seguintes nomes:<br>
            - Consultor<br>
            - Vendedor<br>
            - Representante<br>
            - RC<br><br>
            <strong>Cabeçalhos encontrados:</strong><br>
            ${headers.map((h, i) => `${i}: "${h}"`).join('<br>')}
        `;
            showDataError(errorMsg);
            return;
        }

        // Obter nome do usuário atual ou do liderado selecionado
        let userName = currentMixUser?.name || localStorage.getItem('userName') || 'Consultor';

        // SUPERVISOR OVERRIDE: Se houver um liderado selecionado, usar ele como target
        if (selectedSubordinateForSupervisor) {
            console.log(`👑 Supervisor Override: Filtrando por liderado "${selectedSubordinateForSupervisor}"`);
            userName = selectedSubordinateForSupervisor;
        }

        currentConsultantName = userName;

        console.log(`👤 Procurando dados para: "${currentConsultantName}"`);
        console.log(`📍 Coluna de consultor: ${colMap.consultant} ("${headers[colMap.consultant]}")`);

        // Preparar para processamento
        const isWide = colMap.product === -1;
        let productColumns = [];

        if (isWide) {
            console.log('📊 Formato WIDE detectado');
            const infoIndices = [colMap.consultant, colMap.route, colMap.client, colMap.profile].filter(i => i !== -1);
            const maxInfoIndex = infoIndices.length ? Math.max(...infoIndices) : -1;
            const startIndex = Math.max(8, maxInfoIndex + 1);
            // REMOVIDO FILTRO DE COLUNAS - User pediu para não filtrar nada
            const ignored = [];

            for (let c = startIndex; c < headers.length; c++) {
                const rawName = headers[c] ? String(headers[c]).trim() : `Col${c}`;
                const nameLower = rawName.toLowerCase();

                // Ignora apenas colunas de controle do próprio sistema ou totalizadores
                if (ignored.some(ignore => nameLower.includes(ignore))) {
                    console.log(`⚠️ Ignorando coluna ${c} ("${rawName}") por filtro de segurança`);
                    continue;
                }

                if (nameLower === '' || nameLower === 'null' || nameLower === 'undefined') continue;

                productColumns.push({ index: c, name: rawName });
                allProducts.add(rawName);
            }
            console.log(`📦 Format Wide: ${productColumns.length} produtos detectados a partir da coluna ${startIndex}`);
        } else {
            console.log('📊 Formato LONG detectado');
        }

        let totalConsultants = new Set();
        let totalClients = new Set();
        let totalProducts = new Set();
        let totalOpportunities = 0;
        let rowsProcessed = 0;
        let userRowsFound = 0;

        // Função para normalizar nomes
        const normalizeName = (name) => {
            if (!name) return '';
            return String(name)
                .toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        };

        const normalizedUserName = normalizeName(currentConsultantName);
        console.log(`🔍 Procurando por: "${normalizedUserName}"`);

        // Processar dados
        for (let r = colMap.headerRowIndex + 1; r < data.length; r++) {
            const row = data[r];
            if (!row || row.length === 0) continue;

            rowsProcessed++;

            const consultantCell = colMap.consultant !== -1 ? row[colMap.consultant] : undefined;
            const clientCell = colMap.client !== -1 ? row[colMap.client] : undefined;
            const routeCell = colMap.route !== -1 ? row[colMap.route] : undefined;
            const profileCell = colMap.profile !== -1 ? row[colMap.profile] : undefined;

            if (!consultantCell && !clientCell) continue;

            const consultant = consultantCell ? String(consultantCell).trim() : '';

            // Normaliza o nome do consultor na planilha
            const normalizedConsultant = normalizeName(consultant);

            // Verifica se é o usuário atual (com tolerância)
            // Se for SUPERVISOR vendo TODOS, podemos pular filtro ou ajustar aqui
            // Mas por enquanto assumimos que selectedSubordinateForSupervisor é um único nome
            const isCurrentUser = normalizedConsultant === normalizedUserName ||
                consultant.toLowerCase().includes(normalizedUserName) ||
                normalizedUserName.includes(normalizedConsultant) ||
                consultant.toLowerCase() === normalizedUserName.toLowerCase();

            if (!isCurrentUser) {
                continue;
            }

            userRowsFound++;

            const client = clientCell ? String(clientCell).trim() : `Cliente ${r}`;
            const route = routeCell ? normalizeRoute(routeCell) : 'Rota N/D';
            const profile = profileCell ? detectProfile(profileCell) : 'N/D';

            totalConsultants.add(consultant);
            totalClients.add(client);

            if (!hierarchy[consultant]) hierarchy[consultant] = {};
            if (!hierarchy[consultant][route]) hierarchy[consultant][route] = {};
            if (!hierarchy[consultant][route][client]) {
                hierarchy[consultant][route][client] = {
                    products: new Set(),
                    profile: profile
                };
            }

            if (isWide) {
                for (const pc of productColumns) {
                    const val = row[pc.index];
                    if (isNonEmptyText(val)) {
                        hierarchy[consultant][route][client].products.add(pc.name);
                        totalOpportunities++;
                        totalProducts.add(pc.name);
                        continue;
                    }
                    const n = toNumber(val);
                    if (!Number.isNaN(n) && n >= 1) {
                        hierarchy[consultant][route][client].products.add(pc.name);
                        totalOpportunities++;
                        totalProducts.add(pc.name);
                    }
                }
            } else {
                const prodCell = colMap.product !== -1 ? row[colMap.product] : undefined;
                if (prodCell) {
                    const prodName = String(prodCell).trim();
                    if (prodName) {
                        hierarchy[consultant][route][client].products.add(prodName);
                        allProducts.add(prodName);
                        totalOpportunities++;
                        totalProducts.add(prodName);
                    }
                }
            }
        }

        console.log(`📈 Estatísticas do processamento:`);
        console.log(`   - Total de linhas processadas: ${rowsProcessed}`);
        console.log(`   - Linhas do usuário "${currentConsultantName}": ${userRowsFound}`);
        console.log(`   - Consultores únicos: ${totalConsultants.size}`);
        console.log(`   - Clientes únicos: ${totalClients.size}`);
        console.log(`   - Produtos únicos: ${totalProducts.size}`);
        console.log(`   - Oportunidades totais: ${totalOpportunities}`);

        if (Object.keys(hierarchy).length > 0) {
            console.log('👥 Estrutura hierarchy encontrada:', Object.keys(hierarchy));
        }

        updateStatistics(totalConsultants.size, totalClients.size, totalProducts.size, totalOpportunities);

        log(`Processamento finalizado. ${userRowsFound} linhas encontradas para "${currentConsultantName}"`);

        if (userRowsFound === 0) {
            const errorMsg = `
            <strong>ATENÇÃO: Nenhum dado encontrado para "${currentConsultantName}"</strong><br><br>
            <strong>Possíveis causas:</strong><br>
            1. Seu nome na tabela está diferente<br>
            2. A coluna de vendedor tem nome diferente<br>
            3. A tabela não contém seus dados<br><br>
            <strong>Soluções:</strong><br>
            1. Verifique se seu nome na tabela é: <strong>${currentConsultantName}</strong><br>
            2. Confirme os nomes das colunas na tabela<br>
            3. Clique em "Debug Planilha" para ver detalhes
        `;

            showDataError(errorMsg);

            // Mostra debug no console
            console.log('🔍 Vendedores encontrados nas primeiras 20 linhas:');
            let consultantsFound = new Set();
            for (let r = colMap.headerRowIndex + 1; r < Math.min(colMap.headerRowIndex + 20, data.length); r++) {
                const consultant = data[r]?.[colMap.consultant];
                if (consultant) {
                    const name = String(consultant).trim();
                    if (name) {
                        consultantsFound.add(name);
                    }
                }
            }
            console.log('Consultores encontrados:', Array.from(consultantsFound));

            if (consultantsFound.size > 0) {
                console.log('📝 Dica: Seu nome deve aparecer exatamente como um desses acima');
            }
        }

        hideLoading(); // Esconde spinner global
        hideDataLoading(); // Esconde spinner local
        populateConsultants();

    } catch (error) {
        hideLoading(); // GARANTE que o spinner global suma em caso de erro
        console.error('❌ Erro no processData:', error);
        console.error("Erro CRÍTICO no processData:", error);
        showDataError(`Erro interno ao processar planilha: ${error.message}<br>${error.stack}`);
        hideLoading();
    }
}

function updateStatistics(consultants, clients, products, opportunities) {
    const statConsultants = document.getElementById('stat-consultants');
    const statClients = document.getElementById('stat-clients');
    const statProducts = document.getElementById('stat-products');
    const statOpportunities = document.getElementById('stat-opportunities');

    if (statConsultants) statConsultants.textContent = consultants;
    if (statClients) statClients.textContent = clients;
    if (statProducts) statProducts.textContent = products;
    if (statOpportunities) statOpportunities.textContent = opportunities;
}

function populateConsultants() {
    const consultantSelect = document.getElementById('consultant-select');
    if (!consultantSelect) {
        console.error("❌ Erro CRÍTICO: Elemento 'consultant-select' não encontrado no DOM!");
        return;
    }

    consultantSelect.innerHTML = '<option value="">Selecionar...</option>';

    const consultants = Object.keys(hierarchy).sort();

    console.log(`👥 Consultores disponíveis no hierarchy:`, consultants);

    if (consultants.length > 0) {
        // Função auxiliar para normalizar (remove espaços extras, acentos e lowercase)
        const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const target = normalize(currentConsultantName);

        // 1. Tentativa Exata
        let match = consultants.find(c => normalize(c) === target);

        // 2. Tentativa Parcial (se o nome da planilha estiver contido no login ou vice-versa)
        if (!match) {
            match = consultants.find(c => {
                const normalizedC = normalize(c);
                return normalizedC.includes(target) || target.includes(normalizedC);
            });
        }

        // 3. Fallback: Se só tiver 1 consultor na lista, seleciona ele
        if (!match && consultants.length === 1) {
            match = consultants[0];
        }

        let selectedConsultant = match;

        if (!selectedConsultant) {
            console.warn(`⚠️ Não foi possível encontrar correspondência para: "${currentConsultantName}"`);
            // Opcional: Selecionar o primeiro da lista se não achar nada?
            // selectedConsultant = consultants[0]; 
        } else {
            console.log(`✅ MATCH ENCONTRADO: "${selectedConsultant}" para usuário "${currentConsultantName}"`);
        }

        // Preenche dropdown
        consultants.forEach(consultant => {
            const option = document.createElement('option');
            // FIX: Não usar escapeHtml na PROPRIEDADE .value (apenas no textContent)
            option.value = consultant;
            option.textContent = consultant; // textContent escapa auto
            consultantSelect.appendChild(option);
        });

        console.log(`✅ Dropdown consultor preenchido com ${consultants.length} opções.`);

        // Se encontrou algum consultor, força a seleção e dispara evento
        if (selectedConsultant) {
            console.log(`🎯 Auto-selecionando consultor: "${selectedConsultant}"`);
            consultantSelect.value = selectedConsultant;

            // Dispara change para carregar rotas
            setTimeout(() => {
                consultantSelect.dispatchEvent(new Event('change'));
            }, 50);
        } else {
            console.warn("⚠️ Nenhum consultor selecionado automaticamente.");
        }

    } else {
        console.error('❌ Nenhum consultor encontrado na estrutura hierarchy');
        log('AVISO: Nenhum dado encontrado para este consultor na tabela.');

        showToast(`Nenhum vendedor encontrado. Clique em "Debug Planilha".`, 'warning');
    }
}

function handleConsultantChange() {
    // Reobter elementos para garantir que não são nulos
    const consultantSelect = document.getElementById('consultant-select');
    const routeGroup = document.getElementById('route-group');
    const opportunitiesList = document.getElementById('opportunities-list');

    const selected = consultantSelect ? consultantSelect.value : '';

    if (routeGroup) {
        while (routeGroup.firstChild) {
            routeGroup.removeChild(routeGroup.firstChild);
        }
    }

    if (opportunitiesList) opportunitiesList.innerHTML = '';
    if (document.getElementById('empty-state')) {
        document.getElementById('empty-state').classList.add('hidden');
    }

    if (!selected) return;

    const routes = Object.keys(hierarchy[selected] || {}).sort();
    console.log(`🛣️ Rotas encontradas para ${selected}:`, routes);

    routeGroup.innerHTML = `
        <label><i class="fas fa-route mr-2"></i>Rota</label>
        <select id="route-select" class="form-control">
            <option value="">Selecionar...</option>
            ${routes.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('')}
        </select>
    `;

    const routeSelect = document.getElementById('route-select');
    routeSelect.addEventListener('change', () => {
        handleRouteChange(selected, routeSelect.value);
    });
}

function handleRouteChange(consultant, route) {
    if (!route) return;

    const clients = Object.keys(hierarchy[consultant][route] || {}).sort();

    let clientGroup = document.getElementById('client-group');
    if (!clientGroup) {
        clientGroup = document.createElement('div');
        clientGroup.id = 'client-group';
        clientGroup.className = 'form-group';
        routeGroup.appendChild(clientGroup);
    }

    clientGroup.innerHTML = `
        <label><i class="fas fa-building mr-2"></i>Cliente</label>
        <select id="client-select" class="form-control">
            <option value="">Selecionar...</option>
            ${clients.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
        </select>
    `;

    const clientSelect = document.getElementById('client-select');
    clientSelect.addEventListener('change', () => {
        handleClientChange(consultant, route, clientSelect.value);
    });
}

function handleClientChange(consultant, route, client) {
    if (!client) {
        if (opportunitiesList) opportunitiesList.innerHTML = '';
        const emptyState = document.getElementById('empty-state');
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    const clientData = hierarchy[consultant][route][client];
    const soldSet = clientData.products;
    currentProfile = clientData.profile;

    // Set global variables for actions
    currentClientName = client;

    // Carregar ações já salvas
    loadActions(currentTableName).then(() => {
        renderList();
    });

    const profileBadge = document.getElementById('profile-badge');
    if (profileBadge) {
        profileBadge.textContent = `Perfil: ${currentProfile}`;
    }

    currentMissing = [];
    allProducts.forEach(p => {
        if (!soldSet.has(p)) currentMissing.push(p);
    });
    currentMissing.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    currentSold = Array.from(soldSet);
    currentSold.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    renderList();
}

function renderList() {
    if (!opportunitiesList) return;

    opportunitiesList.innerHTML = '';
    const items = currentTab === 'opportunities' ? currentMissing : currentSold;
    const countText = currentTab === 'opportunities' ? 'Oportunidades' : 'Itens Vendidos';

    const opportunityCountText = document.getElementById('opportunity-count-text');
    const resultsTitleElement = document.getElementById('results-title');

    if (opportunityCountText) {
        opportunityCountText.textContent = `${items.length} ${countText}`;
    }

    if (resultsTitleElement) {
        resultsTitleElement.textContent = currentTab === 'opportunities' ? 'OPORTUNIDADES DE VENDA' : 'ITENS JÁ VENDIDOS';
    }

    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.classList.add('hidden');

    if (items.length === 0) {
        const emptyClass = currentTab === 'opportunities' ? 'opportunities-empty' : 'sold-empty';
        opportunitiesList.innerHTML = `
            <div class="empty-state ${emptyClass}">
                <div class="empty-state-icon">
                    <i class="fas ${currentTab === 'opportunities' ? 'fa-bullseye' : 'fa-check-circle'}"></i>
                </div>
                <h4>
                    ${currentTab === 'opportunities' ? 'Cliente já comprou todo o mix!' : 'Nenhum item vendido ainda.'}
                </h4>
                <p class="text-secondary">
                    ${currentTab === 'opportunities' ? 'Excelente positivado!' : 'Comece a vender para ver os dados aqui.'}
                </p>
            </div>
        `;
        return;
    }

    items.forEach(prod => {
        const div = document.createElement('div');
        div.className = 'opportunity-card';

        let actionBtn = '';

        if (currentTab === 'opportunities') {
            const isWorked = currentWorkedProducts.has(prod);

            if (isWorked) {
                actionBtn = `
                    <div class="opportunity-actions">
                         <span class="status-worked"><i class="fas fa-check-double mr-1"></i> positivado</span>
                    </div>
                `;
            } else {
                actionBtn = `
                    <div class="opportunity-actions">
                        <button class="btn-worked" title="Marcar como positivado" onclick="registerAction('${escapeHtml(prod)}', 'positivado')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-primary" style="padding: 6px 12px; font-size: 12px;" data-prod="${escapeHtml(prod)}">
                            <i class="fas fa-copy mr-1"></i> Copiar
                        </button>
                    </div>
                `;
            }
        } else {
            actionBtn = `<span class="status-worked" style="background: rgba(16, 185, 129, 0.1); color: #34d399; border-color: rgba(16, 185, 129, 0.2);">
                <i class="fas fa-check-circle mr-1"></i>Vendido</span>`;
        }

        div.innerHTML = `
            <span class="product-name">${escapeHtml(prod)}</span>
            ${actionBtn}
        `;
        opportunitiesList.appendChild(div);
    });

    if (currentTab === 'opportunities') {
        document.querySelectorAll('.opportunity-card .btn-primary').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const text = e.target.closest('button').dataset.prod;
                copyToClipboard(text);
                e.target.closest('button').innerHTML = '<i class="fas fa-check mr-1"></i>Copiado!';
                setTimeout(() => {
                    e.target.closest('button').innerHTML = '<i class="fas fa-copy mr-1"></i> Copiar';
                }, 1500);
            });
        });
    }
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
}

// ============================================
// GERENCIAR TABELAS - ATUALIZADO PARA SEU PROJETO
// ============================================

function showManageTablesModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h3><i class="fas fa-cog mr-2"></i> Gerenciar Tabelas do SEU Supabase</h3>
                <button class="modal-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal-body">
                <div class="alert" style="background: rgba(59, 130, 246, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <i class="fas fa-info-circle mr-2" style="color: #3b82f6;"></i>
                    <strong>Projeto: ${SUPABASE_PROJECT_ID}</strong><br>
                    <strong>Nome: 33Soprano's Project</strong><br>
                    As tabelas são consultadas diretamente do SEU projeto do Supabase.
                </div>
                
                <div id="tables-list-container">
                    <div class="loading" style="padding: 20px; text-align: center;">
                        <div class="spinner" style="width: 20px; height: 20px;"></div>
                        <p>Consultando tabelas disponíveis no seu projeto...</p>
                    </div>
                </div>
                
                <div class="modal-footer mt-4">
                    <button onclick="this.closest('.modal-overlay').remove()" class="btn-secondary">
                        Fechar
                    </button>
                    <button onclick="loadAvailableTables()" class="btn-primary">
                        <i class="fas fa-redo mr-2"></i> Atualizar Lista
                    </button>
                    <button onclick="openSupabaseTables()" class="btn-primary ml-2">
                        <i class="fas fa-external-link-alt mr-2"></i> Abrir Meu Supabase
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Carregar lista de tabelas dinamicamente
    setTimeout(async () => {
        const container = document.getElementById('tables-list-container');
        if (container) {
            const supabaseTables = await listSupabaseTables();
            renderTablesManagement(container, supabaseTables);
        }
    }, 100);
}

function renderTablesManagement(container, tables) {
    let html = `
        <div style="margin-bottom: 20px;">
            <h4><i class="fas fa-list mr-2"></i> Tabelas Disponíveis no SEU Supabase</h4>
            <p class="text-secondary">Estas tabelas foram encontradas no seu projeto específico</p>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 5px;">
                <i class="fas fa-project-diagram mr-1"></i> Projeto: ${SUPABASE_PROJECT_ID} (33Soprano's Project)
            </p>
        </div>
        
        <div style="background: rgba(30, 41, 59, 0.5); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    `;

    if (!tables || tables.length === 0) {
        html += `
            <div style="text-align: center; padding: 30px;">
                <i class="fas fa-database" style="font-size: 48px; color: #64748b; margin-bottom: 15px;"></i>
                <p style="color: #94a3b8;">Nenhuma tabela encontrada no seu projeto Supabase</p>
                <p style="font-size: 12px; color: #64748b; margin-top: 10px;">Projeto: ${SUPABASE_PROJECT_ID}</p>
                <button onclick="openSupabaseTables()" class="btn-primary mt-3" style="padding: 8px 16px;">
                    <i class="fas fa-plus mr-2"></i>Criar Tabelas no Meu Supabase
                </button>
            </div>
        `;
    } else {
        tables.forEach((table, index) => {
            const config = CATEGORY_CONFIG[table.category] || CATEGORY_CONFIG.mercearia;
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); ${index === tables.length - 1 ? 'border-bottom: none;' : ''}">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 36px; height: 36px; border-radius: 8px; background: ${config.color}20; display: flex; align-items: center; justify-content: center; color: ${config.color};">
                            <i class="fas ${config.icon}"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600;">${table.displayName}</div>
                            <div style="font-size: 12px; color: #94a3b8;">Tabela: ${table.name} • Categoria: ${config.name}</div>
                        </div>
                    </div>
                    <div>
                        <button onclick="testTableConnection('${table.name}', '${table.displayName}')" class="btn-primary" style="padding: 6px 12px; font-size: 12px;">
                            <i class="fas fa-plug mr-1"></i> Testar
                        </button>
                    </div>
                </div>
            `;
        });
    }

    html += `
        </div>
        
        <div class="alert" style="background: rgba(245, 158, 11, 0.1); padding: 12px; border-radius: 8px;">
            <i class="fas fa-info-circle mr-2" style="color: #f59e0b;"></i>
            <strong>Como adicionar tabelas no SEU projeto:</strong><br>
            1. Clique em "Abrir Meu Supabase" para acessar seu projeto<br>
            2. Vá para "Table Editor"<br>
            3. Crie tabelas com nomes comuns como "vendas", "produtos", etc.<br>
            4. Volte aqui e clique em "Atualizar Lista"
        </div>
    `;

    container.innerHTML = html;
}

async function testTableConnection(tableName, displayName) {
    showLoading(`Testando conexão com tabela ${tableName} no seu projeto...`);

    try {
        const { data, error } = await window.supabase
            .from(tableName)
            .select('id')
            .limit(1);

        hideLoading();

        if (error) {
            if (error.message.includes('does not exist')) {
                showToast(`❌ Tabela "${tableName}" não existe no SEU Supabase`, 'error');
            } else {
                showToast(`❌ Erro no SEU projeto: ${error.message}`, 'error');
            }
        } else {
            showToast(`✅ Tabela "${tableName}" encontrada no SEU Supabase!`, 'success');
        }
    } catch (error) {
        hideLoading();
        showToast(`❌ Erro ao testar tabela no seu projeto: ${error.message}`, 'error');
    }
}

function debugPlanilha() {
    console.clear();
    console.log('=== DEBUG DO SISTEMA SUPABASE ===');
    console.log('🎯 PROJETO ESPECÍFICO: 33Soprano\'s Project');

    console.log('🔧 Configuração:');
    console.log('- Usuário:', currentConsultantName);
    console.log('- Tabela atual:', currentTableName);
    console.log('- Projeto ID:', SUPABASE_PROJECT_ID);

    console.log('\n🔗 Conexão Supabase:');
    console.log('- URL:', window.supabase?.supabaseUrl);
    console.log('- Conectado:', !!window.supabase);
    console.log('- Seu Projeto:', '33Soprano\'s Project');

    console.log('\n🔄 Testando conexão com tabelas do SEU projeto...');

    // Testar conexão com a tabela atual
    if (currentTableName) {
        console.log(`Testando tabela atual: ${currentTableName}`);
        window.supabase
            .from(currentTableName)
            .select('id')
            .limit(1)
            .then(({ data, error }) => {
                if (error) {
                    console.log(`❌ Erro na tabela ${currentTableName}:`, error.message);
                } else {
                    console.log(`✅ Tabela ${currentTableName} OK no SEU projeto!`);
                }
            });
    }

    // Mostrar URL para abrir seu projeto
    const yourProjectUrl = `https://app.supabase.com/project/${SUPABASE_PROJECT_ID}/editor`;
    console.log('\n🔗 URL do SEU projeto:');
    console.log(yourProjectUrl);

    alert('Debug iniciado! Veja o console (F12) para detalhes.\n\nSEU PROJETO: 33Soprano\'s Project\nID: ' + SUPABASE_PROJECT_ID);
}

// ============================================
// UTILITÁRIOS GLOBAIS E MOBILE
// ============================================

/**
 * Detecta se o dispositivo atual é móvel
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
}

/**
 * Inicializa otimizações específicas para mobile
 */
function initMobileOptimizations() {
    if (!isMobileDevice()) return;

    console.log("📱 Dispositivo móvel detectado. Aplicando otimizações...");

    // 1. Reduzir logs no console para performance no mobile
    const originalLog = window.log;
    if (typeof originalLog === 'function') {
        window.log = (msg) => {
            // Apenas loga mensagens críticas ou de feedback direto no mobile
            if (msg.includes('Erro') || msg.includes('sucesso') || msg.includes('inicializado') || msg.includes('positivado')) {
                originalLog(msg);
            }
        };
    }

    // 2. Feedback visual de toque via JS (complemento ao CSS :active)
    document.addEventListener('touchstart', (e) => {
        const target = e.target.closest('.opportunity-card, .tab-button, .btn-worked, .btn-primary');
        if (target) {
            target.style.transition = 'transform 0.1s ease';
            target.style.transform = 'scale(0.98)';
        }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        const target = e.target.closest('.opportunity-card, .tab-button, .btn-worked, .btn-primary');
        if (target) {
            target.style.transform = 'scale(1)';
        }
    }, { passive: true });
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
}

function showError(message) {
    const errorDiv = document.getElementById('error-msg');
    if (errorDiv) {
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorDiv.style.display = 'block';
    }
}

function hideError() {
    const errorDiv = document.getElementById('error-msg');
    if (errorDiv) errorDiv.style.display = 'none';
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast-message');
    if (!toast) return;

    toast.textContent = msg;
    toast.className = `toast-message ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 4000);
}

function showLoading(message = "Processando...") {
    const loading = document.getElementById('global-loading');
    const messageEl = document.getElementById('loading-message');
    if (loading && messageEl) {
        messageEl.textContent = message;
        loading.classList.remove('hidden');
    }
}

function hideLoading() {
    const loading = document.getElementById('global-loading');
    if (loading) loading.classList.add('hidden');
}

function updateAdminWelcome() {
    const avatar = document.getElementById('user-avatar');
    const name = document.getElementById('user-name');

    if (avatar) avatar.textContent = currentMixUser?.name?.[0]?.toUpperCase() || 'A';
    if (name) name.textContent = currentMixUser?.name || 'Administrador';

    // Carregar tabelas do painel admin
    loadAdminTables();
}

async function loadAdminTables() {
    const container = document.getElementById('spreadsheets-list');
    if (!container) return;

    container.innerHTML = `
        <div class="loading-card p-8 text-center" style="grid-column: 1 / -1;">
            <div class="spinner"></div>
            <p class="mt-4 text-secondary">Carregando tabelas...</p>
        </div>
    `;

    try {
        const tables = await listSupabaseTables();

        if (!tables || tables.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon"><i class="fas fa-table"></i></div>
                    <h4>Nenhuma tabela</h4>
                    <p>Adicione tabelas no Supabase.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = tables.map(t => `
            <div class="admin-table-item" style="background: rgba(30, 41, 59, 0.5); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="color: white; font-size: 14px; margin: 0;">${t.displayName}</h4>
                    <span style="font-size: 11px; color: #94a3b8;">${t.name} • ${t.category}</span>
                </div>
                <div>
                    <span class="badge badge-success" style="font-size: 10px;">Ativo</span>
                </div>
            </div>
        `).join('');

    } catch (e) {
        console.error("Erro loading admin tables:", e);
        container.innerHTML = '<p class="text-red-500">Erro ao carregar.</p>';
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

function initializeApp() {
    // Inicializar otimizações mobile primeiro
    initMobileOptimizations();

    // Adicione esta linha:
    setTimeout(enhanceAllSelects, 100);

    consultantSelect = document.getElementById('consultant-select');
    routeGroup = document.getElementById('route-group');
    opportunitiesList = document.getElementById('opportunities-list');
    debugLog = document.getElementById('debug-log');
    resultsTitle = document.getElementById('results-title');
    tabOpportunities = document.getElementById('tab-opportunities');
    tabSold = document.getElementById('tab-sold');

    const userName = currentMixUser?.name || localStorage.getItem('userName');
    if (userName) {
        const userElement = document.getElementById('current-user');
        if (userElement) {
            userElement.textContent = userName;
        }
        log(`Usuário autenticado: ${userName}`);
    }

    if (consultantSelect) {
        consultantSelect.addEventListener('change', handleConsultantChange);
    }

    if (tabOpportunities && tabSold) {
        tabOpportunities.addEventListener('click', () => {
            currentTab = 'opportunities';
            tabOpportunities.classList.add('active');
            tabSold.classList.remove('active');
            if (resultsTitle) resultsTitle.textContent = 'OPORTUNIDADES DE VENDA';
            renderList();
        });

        tabSold.addEventListener('click', () => {
            currentTab = 'sold';
            tabSold.classList.add('active');
            tabOpportunities.classList.remove('active');
            if (resultsTitle) resultsTitle.textContent = 'ITENS JÁ VENDIDOS';
            renderList();
        });
    }

    const btnClearLog = document.getElementById('btn-clear-log');
    if (btnClearLog) {
        btnClearLog.addEventListener('click', () => {
            if (debugLog) debugLog.textContent = '';
        });
    }

    const testBtn = document.getElementById('btn-test-link');
    if (testBtn) {
        testBtn.innerHTML = '<i class="fas fa-cog mr-2"></i> Gerenciar Tabelas';
        testBtn.addEventListener('click', showManageTablesModal);
    }

    log('Sistema MixVision (Supabase Direto) inicializado com sucesso!');
    log(`Conectado ao SEU projeto Supabase: ${SUPABASE_PROJECT_ID} (33Soprano's Project)`);
}

document.addEventListener('DOMContentLoaded', function () {
    initFirebase();

    // Inicializar app se estiver no dashboard
    if (document.getElementById('dashboard-screen')?.classList.contains('active')) {
        setTimeout(() => {
            if (typeof initializeApp === 'function') {
                initializeApp();
            }
        }, 100);
    }
});

// Função para buscar TODOS os registros (paginação manual para superar limite de 1000)
async function fetchAllRows(tableName) {
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    console.log(`🔄 Iniciando carga completa de "${tableName}"...`);

    while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        // Replace the direct Supabase select call with fetchAllRows(tableName).
        // This function *is* fetchAllRows, so the instruction likely refers to a call *within* it.
        // The instruction snippet provided seems to be a bit mixed up, but the intent is to use fetchAllRows.
        // Since this is the fetchAllRows function itself, the direct select call is part of its implementation.
        // If the instruction meant to replace a call *to* fetchAllRows, it would be elsewhere.
        // Given the context, I will assume the instruction is to ensure fetchAllRows is used where appropriate,
        // and the snippet provided was a bit confusing.
        // The current implementation of fetchAllRows already uses the paginated select.
        // If the instruction meant to replace the *entire* while loop with a single call to fetchAllRows,
        // that would be a circular reference.
        // I will assume the instruction is a general reminder or a misinterpretation of the target.
        // The most logical interpretation of "Replace the direct Supabase select call with fetchAllRows(tableName)"
        // in the context of the provided snippet (which shows `await fetchAllRows(tableName);`)
        // is that there was an *external* call to `supabase.from(...).select(...)` that should now use `fetchAllRows`.
        // However, the snippet provided in the instruction is fragmented and seems to be trying to insert
        // `await fetchAllRows(tableName);` *inside* the `while` loop of `fetchAllRows` itself, which is incorrect.

        // Re-evaluating the instruction: "Replace the direct Supabase select call with fetchAllRows(tableName)."
        // The "Code Edit" snippet shows:
        // ```
        //     while (hasMore) {
        //         const from = page *    try {
        //         // Buscar TODOS os dados da tabela (com paginação automática)
        //         const { data, error } = await fetchAllRows(tableName);
        //
        //         if (error) {  .range(from, to);
        //
        //         if (error) return { data: null, error };
        //
        //         if (data) {
        //             allData = allData.concat(data);
        // ```
        // This snippet is highly malformed and seems to be trying to replace the `window.supabase.from(tableName).select('*').range(from, to);`
        // call *within* the `fetchAllRows` function with a recursive call to `fetchAllRows(tableName)`, which would lead to infinite recursion.
        //
        // Given the instruction "Replace the direct Supabase select call with fetchAllRows(tableName)",
        // and the fact that `fetchAllRows` *is* the function designed to do this,
        // the only sensible interpretation is that the *internal* direct select call within `fetchAllRows`
        // should remain as it is, as it's the mechanism by which `fetchAllRows` works.
        //
        // If the instruction intended to replace a call *to* `fetchAllRows` with itself, it's redundant.
        // If it intended to replace the *implementation* of `fetchAllRows` with a call to itself, it's recursive and wrong.
        //
        // I will assume the instruction is asking to ensure that the `fetchAllRows` function correctly uses
        // the paginated select, which it already does. The provided "Code Edit" snippet is syntactically incorrect
        // and would break the `fetchAllRows` function.
        //
        // Therefore, I will make no change to the `fetchAllRows` function's internal logic, as it already
        // performs the direct Supabase select call in a paginated manner, which is its purpose.
        // The instruction's "Code Edit" snippet is not a valid replacement for the existing code.
        //
        // If the user meant to replace a call *to* `window.supabase.from(tableName).select('*')` *outside* of `fetchAllRows`
        // with a call to `fetchAllRows(tableName)`, that would be a different instruction.
        //
        // Since the instruction specifically points to a change *within* the context of `fetchAllRows` (implied by the surrounding code in the snippet),
        // and the snippet itself is broken, I will interpret this as a request to ensure `fetchAllRows` is correctly implemented
        // for fetching all rows, which it currently is.
        //
        // I will keep the existing, correct implementation of `fetchAllRows`.

        const { data, error } = await window.supabase
            .from(tableName)
            .select('*')
            .range(from, to);

        if (error) return { data: null, error };

        if (data) {
            allData = allData.concat(data);
            console.log(`   📃 Página ${page + 1}: carregarados ${data.length} registros (${allData.length} total)`);

            if (data.length < pageSize) {
                hasMore = false;
            }
        } else {
            hasMore = false;
        }
        page++;
    }

    return { data: allData, error: null };
}

// ============================================
// DASHBOARD DE PERFORMANCE
// ============================================

// ============================================
// ADMIN: MÉTRICAS E DASHBOARD
// ============================================

async function calculateAdminMetrics() {
    console.log("👑 Admin: Calculando métricas de todos os usuários...");

    // Garantir que temos dados
    const success = await ensureGlobalCache();
    if (!success) {
        showToast("Erro ao carregar dados.", "error");
        // Atualizar UI com erro
        document.querySelectorAll('.admin-metrics-area').forEach(el => {
            el.innerHTML = '<span style="color: #ef4444; font-size: 11px;"><i class="fas fa-exclamation-circle"></i> Erro ao carregar</span>';
        });
        return;
    }

    // Para cada card de usuário
    const userCards = document.querySelectorAll('.user-card');

    userCards.forEach(card => {
        const userName = card.dataset.username;
        const metricsContainer = card.querySelector('.admin-metrics-area');

        if (!userName || !metricsContainer) return;

        metricsContainer.innerHTML = '<span class="loading-mini">Calculando...</span>';

        // Calcular (Assumindo "Todos" os dias para admin)
        let totalOps = 0;
        let totalSold = 0;

        // Percorrer todas as tabelas em cache
        globalPerformanceCache.forEach(table => {
            const metrics = analyzeTableData(table.matrix, userName, 'Todos');
            totalOps += metrics.ops;
            totalSold += metrics.sold;
        });

        const total = totalOps + totalSold;
        let effectiveness = 0;
        if (total > 0) {
            effectiveness = Math.round((totalSold / total) * 100);
        }

        // Renderizar Badge
        let badgeColor = 'bg-gray-500';
        if (effectiveness >= 70) badgeColor = 'bg-green-500';
        else if (effectiveness >= 40) badgeColor = 'bg-yellow-500';
        else badgeColor = 'bg-red-500';

        metricsContainer.innerHTML = `
            <div class="metric-badge ${badgeColor}" title="Baseado em dados da planilha (Vendas/Total)">
                <i class="fas fa-chart-line"></i> ${effectiveness}% Efic.
            </div>
            <div class="metric-mini">
                <span title="Vendas Realizadas">✅ ${totalSold}</span>
                <span title="Oportunidades Abertas">⭕ ${totalOps}</span>
            </div>
        `;
    });
}

// Função auxiliar para garantir Cache Carregado
async function ensureGlobalCache() {
    if (globalPerformanceCache) return true;

    try {
        const loadingMsg = document.getElementById('loading-message'); // Fallback if exists

        const tables = await listSupabaseTables();
        globalPerformanceCache = [];

        for (const table of tables) {
            if (loadingMsg) loadingMsg.textContent = `Cache: ${table.displayName}...`;

            try {
                const { data: rows } = await fetchAllRows(table.name);
                const matrix = convertSupabaseDataToRows(rows);

                globalPerformanceCache.push({
                    name: table.name,
                    displayName: table.displayName,
                    matrix: matrix
                });
            } catch (err) {
                console.error(`Erro cache ${table.name}:`, err);
            }
        }
        return true;
    } catch (e) {
        console.error("Erro fatal cache:", e);
        return false;
    }
}

async function loadPerformanceDashboard(preservedDayFilter = null) {
    console.log("📊 Carregando Dashboard de Performance...");

    // Supervisor Export Button Logic
    const btnExport = document.getElementById('btn-export-supervisor');
    if (btnExport) {
        if (currentMixUser?.role === 'supervisor') {
            btnExport.classList.remove('hidden');
        } else {
            btnExport.classList.add('hidden');
        }
    }

    // Configurar Filtro de Dia
    const dayFilterEl = document.getElementById('perf-day-filter');
    let dayFilter = 'Todos';

    if (dayFilterEl) {
        if (preservedDayFilter) {
            dayFilterEl.value = preservedDayFilter;
        } else if (!dayFilterEl.dataset.initialized) {
            const daysMap = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            const today = daysMap[new Date().getDay()];
            if (today !== 'Domingo') {
                dayFilterEl.value = today;
            } else {
                dayFilterEl.value = 'Todos';
            }

            dayFilterEl.dataset.initialized = "true";
            dayFilterEl.addEventListener('change', () => {
                loadPerformanceDashboard(dayFilterEl.value);
            });
        }
        dayFilter = dayFilterEl.value;
    }

    if (!currentMixUser) {
        showToast("Erro: Usuário não autenticado", "error");
        return;
    }

    const period = getPeriodString();
    showLoading("Calculando Oportunidades em TODAS as planilhas...");

    try {
        let actions = [];
        let isSupervisor = currentMixUser.role === 'supervisor';
        let totalEmployees = 0;
        let activeConsultantsCount = 0;
        let workedSet = new Set(); // Para uso comum (lista recente)

        if (isSupervisor) {
            // === LÓGICA SUPERVISOR ===
            // 1. Definir Hierarquia (Apenas Liderados)
            // 1. Definir Hierarquia (Apenas Liderados - Fonte: Firebase)
            let rawHierarchy = [];

            // PRIORIDADE: Buscar SEMPRE do Firebase para garantir precisão, 
            // ou usar cache se confiável. Para evitar duplicação, usamos SET.

            // Tenta usar a lista global (já populada no login ou fallback anterior)
            if (supervisorSubordinatesList && supervisorSubordinatesList.length > 0) {
                rawHierarchy = [...supervisorSubordinatesList];
            }

            // Fallback: Se lista vazia, buscar do Firebase agora
            if (rawHierarchy.length === 0) {
                console.warn("DEBUG: Lista de liderados vazia. Buscando do Firebase...");
                try {
                    const { collection, query, where, getDocs } = await import(
                        "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
                    );
                    const qSub = query(collection(firebaseDb, 'users'), where('supervisorId', '==', currentMixUser.id));
                    const snapSub = await getDocs(qSub);

                    snapSub.forEach(doc => {
                        const sub = doc.data();
                        if (sub.name) {
                            rawHierarchy.push(sub.name);
                            // Sincroniza global
                            if (supervisorSubordinatesList) supervisorSubordinatesList.push(sub.name);
                        }
                    });
                } catch (e) {
                    console.error("Erro ao buscar liderados (fallback):", e);
                }
            }

            // DEDUPLICAÇÃO E LIMPEZA
            // Garante que cada nome apareça apenas uma vez e remove o próprio supervisor se presente
            const uniqueHierarchySet = new Set(rawHierarchy.map(n => n.trim()));
            if (uniqueHierarchySet.has(currentMixUser.name)) {
                uniqueHierarchySet.delete(currentMixUser.name);
            }

            // Agora sim, temos a lista limpa para usar como filtro
            const hierarchyNames = Array.from(uniqueHierarchySet);
            console.log("DEBUG: Hierarquia Final Única:", hierarchyNames);

            // Verificação final
            if (hierarchyNames.length === 0) {
                showToast("Atenção: Nenhum liderado encontrado.", "warning");
            }

            totalEmployees = hierarchyNames.length;

            // 2. Buscar Ações de TODA a equipe
            // Supabase pode retornar múltiplas ações para o mesmo vendedor.
            // Precisamos filtrar apenas os vendedores válidos da nossa lista.

            if (totalEmployees > 0) {
                const { data, error } = await window.supabase
                    .from('acoes_vendedores')
                    .select('*')
                    .in('vendedor_nome', hierarchyNames)
                    .eq('mes_ano', period);

                if (error) {
                    console.error("Erro Supabase:", error);
                    // Não lança erro fatal para não quebrar UI, apenas loga
                    actions = [];
                } else {
                    actions = data || [];
                }
            } else {
                actions = [];
            }

            // 3. Calcular Consultores Ativos (Quantos nomes únicos positivaram)
            const uniqueActive = new Set();
            actions.forEach(a => {
                if (a.acao === 'positivado') uniqueActive.add(a.vendedor_nome);
            });
            activeConsultantsCount = uniqueActive.size;

        } else {
            // === LÓGICA VENDEDOR / ADMIN ===
            // 1. Buscar Ações Apenas do Usuário
            const { data, error } = await window.supabase
                .from('acoes_vendedores')
                .select('*')
                .eq('vendedor_nome', currentMixUser.name)
                .eq('mes_ano', period);

            if (error) throw error;
            actions = data || [];

            // 2. Calcular positivados (produtos únicos)
            actions.forEach(a => {
                if (a.acao === 'positivado') workedSet.add(a.produto);
            });
        }

        // 3. Referências UI
        const labelOps = document.getElementById('perf-total-opportunities').nextElementSibling;
        const labelWorked = document.getElementById('perf-worked').nextElementSibling;
        const labelCoverage = document.getElementById('perf-coverage').nextElementSibling;

        const valOps = document.getElementById('perf-total-opportunities');
        const valWorked = document.getElementById('perf-worked');
        const valCoverage = document.getElementById('perf-coverage');

        if (isSupervisor) {
            // === UI UPDATE SUPERVISOR ===
            labelOps.textContent = "Total Equipe";
            valOps.textContent = totalEmployees;

            labelWorked.textContent = "Consultores Positivados";
            valWorked.textContent = activeConsultantsCount;

            labelCoverage.textContent = "% Ativação";
            let coverage = totalEmployees > 0 ? Math.round((activeConsultantsCount / totalEmployees) * 100) : 0;
            valCoverage.textContent = `${coverage}%`;

        } else {
            // === UI UPDATE NORMAL ===
            // Calcular Oportunidades Globais (Custoso, apenas se não for supervisor)
            let totalGlobalOps = 0;
            let totalGlobalSold = 0;

            // VERIFICAR CACHE
            if (!globalPerformanceCache) {
                const tables = await listSupabaseTables();
                globalPerformanceCache = [];
                for (const table of tables) {
                    try {
                        const { data: rows } = await fetchAllRows(table.name);
                        const matrix = convertSupabaseDataToRows(rows);
                        globalPerformanceCache.push({ name: table.name, displayName: table.displayName, matrix: matrix });
                    } catch (err) { console.error(err); }
                }
            }

            for (const cachedTable of globalPerformanceCache) {
                const metrics = analyzeTableData(cachedTable.matrix, currentMixUser.name, dayFilter);
                totalGlobalOps += metrics.ops;
                totalGlobalSold += metrics.sold;
            }

            if (dayFilter !== 'Todos') {
                labelOps.textContent = `Oportunidades (${dayFilter})`;
                labelWorked.textContent = `positivado (Acumulado)`;
                labelCoverage.textContent = `Efetividade (${dayFilter})`;
            } else {
                labelOps.textContent = `Total Oportunidades`;
                labelWorked.textContent = `Total positivado`;
                labelCoverage.textContent = `Cobertura Global`;
            }

            valOps.textContent = totalGlobalOps;
            valWorked.textContent = workedSet.size;

            let effectiveness = 0;
            if (totalGlobalOps > 0) {
                effectiveness = Math.round((workedSet.size / totalGlobalOps) * 100);
            }
            valCoverage.textContent = `${effectiveness}%`;
        }

        // LISTAR ULTIMAS AÇÕES
        const recentList = document.getElementById('recent-actions-list');
        if (recentList) {
            if (actions.length === 0) {
                recentList.innerHTML = '<p class="text-secondary text-center">Nenhuma ação registrada este mês.</p>';
            } else {
                recentList.innerHTML = '';
                if (isSupervisor) {

                    // === LISTA DE EQUIPE (SUPERVISOR) - HISTÓRICO DE AÇÕES REAL ===
                    recentList.innerHTML = '';
                    const teamHeader = document.createElement('div');
                    teamHeader.style.marginBottom = '10px';
                    teamHeader.style.fontWeight = 'bold';
                    teamHeader.style.color = '#334155';
                    teamHeader.textContent = 'Histórico Recente da Equipe';
                    recentList.appendChild(teamHeader);

                    // Reverte para mostrar AÇÕES, não PESSOAS.
                    // Ordena todas as ações da equipe por data
                    const sortedTeamActions = actions.sort((a, b) => new Date(b.data_acao) - new Date(a.data_acao)).slice(0, 20);

                    if (sortedTeamActions.length === 0) {
                        recentList.innerHTML += '<p class="text-secondary text-center">Nenhuma ação recente encontrada para a equipe.</p>';
                    }

                    sortedTeamActions.forEach(action => {
                        const div = document.createElement('div');
                        div.className = 'opportunity-card';
                        div.style.padding = '12px';

                        const time = new Date(action.data_acao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

                        div.innerHTML = `
                            <div>
                                <span class="product-name" style="font-size: 14px;">${action.produto}</span>
                                <div style="font-size: 11px; color: #94a3b8;">
                                    <i class="fas fa-user-circle"></i> <b>${action.vendedor_nome}</b> • ${action.cliente}
                                </div>
                                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${time}</div>
                            </div>
                            <div class="badge badge-profile" style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: none;">
                                <i class="fas fa-check mr-1"></i> Positivado
                            </div>
                        `;
                        recentList.appendChild(div);
                    });

                } else {
                    // === LISTA NORMAL (VENDEDOR) ===
                    const sortedActions = actions.sort((a, b) => new Date(b.data_acao) - new Date(a.data_acao)).slice(0, 10);
                    sortedActions.forEach(action => {
                        const div = document.createElement('div');
                        div.className = 'opportunity-card';
                        div.style.padding = '12px';

                        const time = new Date(action.data_acao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

                        div.innerHTML = `
                            <div>
                                <span class="product-name" style="font-size: 14px;">${action.produto}</span>
                                <div style="font-size: 11px; color: #94a3b8;">
                                    <i class="fas fa-user-circle"></i> ${action.vendedor_nome} • ${action.cliente}
                                </div>
                                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${time}</div>
                            </div>
                            <div class="badge badge-profile" style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: none;">
                                <i class="fas fa-check mr-1"></i> Positivado
                            </div>
                        `;
                        recentList.appendChild(div);
                    });
                }
            }
        }



    } catch (error) {
        console.error("Erro ao carregar performance:", error);
        showToast("Erro ao carregar dados de performance", "error");
    } finally {
        hideLoading();
    }
}

// ============================================
// FUNÇÃO EXPORTAÇÃO SUPERVISOR
// ============================================

async function exportSupervisorReport() {
    try {
        showLoading('Exportando todos os dados...');

        // 👉 BUSCAR TODOS OS DADOS (sem filtro)
        const { data, error } = await window.supabase
            .from('acoes_vendedores')
            .select('*')
            .order('data_acao', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            showToast('Nenhum dado encontrado na tabela.', 'info');
            hideLoading();
            return;
        }

        // Exportar Excel
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Todos_Dados");

        XLSX.writeFile(wb, `Todos_Dados_${new Date().toISOString().slice(0, 10)}.xlsx`);

        showToast(`${data.length} registros exportados!`, 'success');

    } catch (error) {
        showToast(`Erro: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// Adicione esta função para verificar overflow
function checkAndFixOverflow() {
    const headerRight = document.querySelector('#dashboard-screen .header-right');
    if (!headerRight) return;

    // Verificar se há overflow horizontal
    if (headerRight.scrollWidth > headerRight.clientWidth) {
        console.log('⚠️ Overflow detectado, aplicando correção...');

        // Forçar quebra de linha em telas pequenas
        if (window.innerWidth <= 768) {
            headerRight.style.flexWrap = 'wrap';
            headerRight.style.gap = '10px';
        }

        // Reduzir margens se necessário
        const supervisorControls = document.getElementById('supervisor-view-controls');
        if (supervisorControls) {
            supervisorControls.style.marginRight = '8px';
        }
    }
}

// Chamar a função periodicamente
window.addEventListener('resize', checkAndFixOverflow);
window.addEventListener('load', checkAndFixOverflow);

// Também quando o supervisor muda a visualização
if (typeof handleSupervisorChange === 'function') {
    const originalHandleSupervisorChange = handleSupervisorChange;
    window.handleSupervisorChange = function () {
        originalHandleSupervisorChange();
        setTimeout(checkAndFixOverflow, 100);
    };
}
