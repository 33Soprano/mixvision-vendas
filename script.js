// ============================================
// SISTEMA MIXVISION COM ONEDRIVE
// ============================================

// Variáveis globais
let currentMixUser = null;
let firebaseDb = null;
let currentSpreadsheet = null;
let currentSpreadsheetName = null;
let currentSpreadsheetId = null;

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

// ===== INICIALIZAÇÃO FIREBASE =====
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
                loadAdminSpreadsheets();
            } else {
                loadDashboardScreen();
            }
        } catch (e) {
            localStorage.removeItem('mixvision_user');
        }
    }
}

function updateAdminWelcome() {
    const avatar = document.getElementById('user-avatar');
    const name = document.getElementById('user-name');

    if (avatar) avatar.textContent = currentMixUser?.name?.[0]?.toUpperCase() || 'A';
    if (name) name.textContent = currentMixUser?.name || 'Administrador';
}

// ===== AUTENTICAÇÃO =====
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
            loadAdminSpreadsheets();
            showToast(`Olá, ${currentMixUser.name}!`, 'success');
            return;
        }

        // Buscar usuário no Firestore
        const { collection, query, where, getDocs } = await import(
            "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
        );

        const q = query(
            collection(firebaseDb, 'users'),
            where('token', '==', token),
            where('role', '==', 'user')
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

// ===== USUÁRIOS ADMIN =====
async function mixCreateUser() {
    const nameInput = document.getElementById('new-user-name');
    const name = nameInput ? nameInput.value.trim() : '';
    const createBtn = document.getElementById('create-user-btn');

    if (!name) {
        showToast('Digite um nome para o vendedor!', 'error');
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

        await addDoc(collection(firebaseDb, 'users'), {
            name: name,
            token: token,
            role: 'user',
            createdAt: new Date().toISOString()
        });

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
        const { collection, query, where, orderBy, getDocs } = await import(
            "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
        );

        const q = query(
            collection(firebaseDb, 'users'),
            where('role', '==', 'user'),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <h4>Nenhum vendedor</h4>
                    <p>Crie o primeiro vendedor acima</p>
                </div>
            `;
            return;
        }

        let html = '<div class="users-grid">';
        querySnapshot.forEach(doc => {
            const user = doc.data();
            const date = user.createdAt ? new Date(user.createdAt) : new Date();
            html += `
                <div class="user-card">
                    <div class="user-info">
                        <div class="user-avatar">${user.name[0]?.toUpperCase()}</div>
                        <div>
                            <h4>${user.name}</h4>
                            <small>${date.toLocaleDateString('pt-BR')}</small>
                        </div>
                    </div>
                    <div class="user-token" onclick="navigator.clipboard.writeText('${user.token}');showToast('Token copiado!')">
                        ${user.token}
                    </div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;

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
    currentSpreadsheet = null;
    currentSpreadsheetName = null;
    currentSpreadsheetId = null;
    showScreen('login-screen');
    const tokenInput = document.getElementById('token-input');
    if (tokenInput) tokenInput.value = '';
    showToast('Logout realizado', 'success');
}

// ===== UTILITÁRIOS =====
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

// ============================================
// SISTEMA DE PLANILHAS COM ONEDRIVE
// ============================================

// ===== FUNÇÕES DE CONVERSÃO DE LINK =====
function convertOneDriveLink(originalLink) {
    // Se já for um link da API, retorna como está
    if (originalLink.includes('api.onedrive.com')) {
        return originalLink;
    }

    // Remove parâmetros como ?e=ibxAs4
    const cleanLink = originalLink.split('?')[0];

    try {
        // Codifica para base64 URL safe
        const base64 = btoa(cleanLink)
            .replace(/=+$/, '')  // Remove = no final
            .replace(/\//g, '_') // / → _
            .replace(/\+/g, '-'); // + → -

        // Retorna link da API do OneDrive
        return `https://api.onedrive.com/v1.0/shares/u!${base64}/driveitem/content`;
    } catch (error) {
        console.error('Erro ao converter link:', error);
        return originalLink;
    }
}

// ===== ADMIN: GERENCIAMENTO DE PLANILHAS =====
function showAddSpreadsheetModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-plus-circle"></i> Adicionar Nova Planilha</h3>
                <button class="modal-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal-body">
                <p class="text-secondary mb-6">
                    <i class="fas fa-info-circle mr-2"></i>
                    Cole o link do OneDrive e preencha os dados da planilha
                </p>
                
                <div class="space-y-4">
                    <div class="form-group">
                        <label><i class="fas fa-link mr-2"></i>Link do OneDrive</label>
                        <input type="text" id="modal-link" class="form-control" 
                               placeholder="https://1drv.ms/x/s!ABC123...">
                        <small class="text-xs text-secondary mt-1">
                            Compartilhe no OneDrive → "Qualquer pessoa" → Cole o link aqui
                        </small>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-file-excel mr-2"></i>Nome da Planilha</label>
                        <input type="text" id="modal-name" class="form-control" 
                               placeholder="Ex: Produtos Saudáveis">
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-tag mr-2"></i>Categoria</label>
                        <div class="modal-categories">
                            ${Object.entries(CATEGORY_CONFIG).map(([key, config]) => `
                                <button type="button" class="modal-category-btn ${key} ${key === 'mercearia' ? 'active' : ''}" 
                                        onclick="selectCategory('${key}')">
                                    <i class="fas ${config.icon}"></i>
                                    ${config.name}
                                </button>
                            `).join('')}
                        </div>
                        <input type="hidden" id="modal-category" value="mercearia">
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-align-left mr-2"></i>Descrição</label>
                        <textarea id="modal-description" class="form-control" rows="3" 
                                  placeholder="Descreva o conteúdo desta planilha..."></textarea>
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Cancelar
                        </button>
                        <button class="btn-primary" onclick="addNewSpreadsheet()">
                            <i class="fas fa-save mr-2"></i> Salvar Planilha
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function selectCategory(category) {
    // Remover active de todos os botões
    document.querySelectorAll('.modal-category-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Adicionar active ao botão clicado
    const btn = document.querySelector(`.modal-category-btn.${category}`);
    if (btn) {
        btn.classList.add('active');
        document.getElementById('modal-category').value = category;
    }
}

async function addNewSpreadsheet() {
    const linkInput = document.getElementById('modal-link');
    const nameInput = document.getElementById('modal-name');
    const categoryInput = document.getElementById('modal-category');
    const descriptionInput = document.getElementById('modal-description');

    const originalLink = linkInput ? linkInput.value.trim() : '';
    const name = nameInput ? nameInput.value.trim() : '';
    const category = categoryInput ? categoryInput.value : 'mercearia';
    const description = descriptionInput ? descriptionInput.value.trim() : '';

    if (!originalLink) {
        showToast('Por favor, cole o link do OneDrive!', 'error');
        return;
    }

    if (!name) {
        showToast('Por favor, informe um nome para a planilha!', 'error');
        return;
    }

    // Converter link do OneDrive
    const downloadUrl = convertOneDriveLink(originalLink);

    showLoading('Salvando planilha...');

    try {
        const { collection, addDoc, serverTimestamp } = await import(
            "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
        );

        // Extrair nome do arquivo do link
        const fileName = extractFileNameFromLink(originalLink) || 'planilha.xlsx';
        const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.mercearia;

        await addDoc(collection(firebaseDb, 'spreadsheets'), {
            name: name,
            fileName: fileName,
            originalLink: originalLink,
            downloadUrl: downloadUrl,
            category: category,
            description: description,
            icon: config.icon,
            uploadedAt: serverTimestamp(),
            uploadedBy: currentMixUser?.id || 'admin',
            status: 'ativo'
        });

        hideLoading();
        showToast('✅ Planilha adicionada com sucesso!');

        // Fechar modal e recarregar lista
        document.querySelector('.modal-overlay')?.remove();
        loadAdminSpreadsheets();

    } catch (error) {
        hideLoading();
        showToast('❌ Erro ao salvar planilha: ' + error.message, 'error');
    }
}

function extractFileNameFromLink(link) {
    // Tenta extrair nome do arquivo do link
    const match = link.match(/[^/]+\.(xlsx|xls|csv)/i);
    return match ? match[0] : 'planilha.xlsx';
}

// Função para gerar card de planilha
function generateSpreadsheetCard(doc, data, isAdmin = false) {
    const category = data.category || 'mercearia';
    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.mercearia;
    const date = data.uploadedAt?.toDate ? data.uploadedAt.toDate() : new Date();

    if (isAdmin) {
        return `
            <div class="spreadsheet-card ${category}" data-id="${doc.id}">
                <div class="spreadsheet-icon">
                    <i class="fas ${config.icon}"></i>
                </div>
                <h4>${data.name}</h4>
                <p class="spreadsheet-desc">${data.description || config.description}</p>
                <div class="spreadsheet-meta">
                    <span class="category-badge ${category}">
                        <i class="fas ${config.icon}"></i>
                        ${config.name}
                    </span>
                    <span>${date.toLocaleDateString('pt-BR')}</span>
                    <button onclick="deleteSpreadsheet('${doc.id}')" 
                            class="delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="spreadsheet-card ${category}" 
                 onclick="selectSpreadsheet('${doc.id}', '${data.name}', '${data.downloadUrl}')">
                <div class="spreadsheet-icon">
                    <i class="fas ${config.icon}"></i>
                </div>
                <h4>${data.name}</h4>
                <p class="spreadsheet-desc">${data.description || config.description}</p>
                <div class="spreadsheet-meta">
                    <span class="category-badge ${category}">
                        <i class="fas ${config.icon}"></i>
                        ${config.name}
                    </span>
                    <span>${date.toLocaleDateString('pt-BR')}</span>
                </div>
            </div>
        `;
    }
}

async function loadAdminSpreadsheets() {
    const container = document.getElementById('spreadsheets-list');
    if (!container) return;

    try {
        const { collection, query, orderBy, getDocs } = await import(
            "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
        );

        const q = query(
            collection(firebaseDb, 'spreadsheets'),
            orderBy('uploadedAt', 'desc')
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-folder-open"></i>
                    </div>
                    <h4>Nenhuma planilha cadastrada</h4>
                    <p>Clique em "Adicionar Planilha" para começar.</p>
                </div>
            `;
            return;
        }

        let html = '<div class="spreadsheet-grid">';
        snapshot.forEach(doc => {
            const data = doc.data();
            html += generateSpreadsheetCard(doc, data, true);
        });
        html += '</div>';

        container.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar planilhas:', error);
        container.innerHTML = `
            <div class="error-state">
                <h4><i class="fas fa-exclamation-triangle"></i> Erro</h4>
                <p>${error.message}</p>
            </div>
        `;
    }
}

async function deleteSpreadsheet(spreadsheetId) {
    if (!confirm('Tem certeza que deseja excluir esta planilha?')) return;

    try {
        showLoading('Excluindo planilha...');

        const { doc, deleteDoc } = await import(
            "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
        );

        await deleteDoc(doc(firebaseDb, 'spreadsheets', spreadsheetId));

        hideLoading();
        showToast('✅ Planilha excluída com sucesso!');

        loadAdminSpreadsheets();

    } catch (error) {
        hideLoading();
        showToast('❌ Erro ao excluir planilha: ' + error.message, 'error');
    }
}

// ===== DASHBOARD: SELEÇÃO DE PLANILHAS =====
function loadDashboardScreen() {
    const userName = currentMixUser?.name || 'Vendedor';

    // Atualizar informações do usuário
    const avatar = document.getElementById('dashboard-user-avatar');
    const nameEl = document.getElementById('dashboard-user-name');

    if (avatar) avatar.textContent = userName[0]?.toUpperCase() || 'V';
    if (nameEl) nameEl.textContent = userName;

    showScreen('dashboard-screen');

    // Carregar planilhas disponíveis
    setTimeout(() => {
        loadAvailableSpreadsheets();
    }, 100);
}

async function loadAvailableSpreadsheets() {
    const container = document.getElementById('spreadsheet-cards');
    const noSpreadsheets = document.getElementById('no-spreadsheets');

    if (!container) return;

    try {
        const { collection, query, orderBy, getDocs } = await import(
            "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
        );

        const q = query(
            collection(firebaseDb, 'spreadsheets'),
            orderBy('uploadedAt', 'desc')
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = '';
            if (noSpreadsheets) noSpreadsheets.classList.remove('hidden');
            return;
        }

        // Gerar cartões para cada planilha
        let html = '<div class="spreadsheet-grid">';
        snapshot.forEach(doc => {
            const data = doc.data();
            html += generateSpreadsheetCard(doc, data, false);
        });
        html += '</div>';

        container.innerHTML = html;
        if (noSpreadsheets) noSpreadsheets.classList.add('hidden');

    } catch (error) {
        console.error('Erro ao carregar planilhas:', error);
        container.innerHTML = `
            <div class="error-state">
                <h4><i class="fas fa-exclamation-triangle"></i> Erro</h4>
                <p>${error.message}</p>
                <button onclick="loadAvailableSpreadsheets()" class="btn-primary mt-4">
                    <i class="fas fa-redo mr-2"></i>Tentar Novamente
                </button>
            </div>
        `;
    }
}

// ===== FUNÇÃO PARA FILTRAR PLANILHAS =====
function filterSpreadsheets(category) {
    // Atualizar botões ativos
    document.querySelectorAll('.category-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const btn = document.querySelector(`.category-filter-btn.${category}`);
    if (btn) btn.classList.add('active');

    // Filtrar cartões
    const cards = document.querySelectorAll('.spreadsheet-card');
    cards.forEach(card => {
        if (category === 'all' || card.classList.contains(category)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ===== SELEÇÃO E CARREGAMENTO DE PLANILHA =====
async function selectSpreadsheet(spreadsheetId, spreadsheetName, downloadUrl) {
    currentSpreadsheetId = spreadsheetId;
    currentSpreadsheetName = spreadsheetName;

    // Atualizar UI
    const selector = document.getElementById('spreadsheet-selector');
    const dataSection = document.getElementById('data-section');

    if (selector) selector.classList.add('hidden');
    if (dataSection) dataSection.classList.remove('hidden');

    // Carregar dados da planilha para obter a categoria
    try {
        const { doc, getDoc } = await import(
            "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
        );

        const spreadsheetDoc = await getDoc(doc(firebaseDb, 'spreadsheets', spreadsheetId));

        if (spreadsheetDoc.exists()) {
            const data = spreadsheetDoc.data();
            const category = data.category || 'mercearia';
            const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.mercearia;

            // Atualizar cabeçalho
            const headerHTML = `
                <div class="selected-spreadsheet-header ${category}">
                    <div class="selected-spreadsheet-icon">
                        <i class="fas ${config.icon}"></i>
                    </div>
                    <div>
                        <h3>${spreadsheetName}</h3>
                        <p class="text-secondary">
                            <span class="category-badge ${category}">
                                <i class="fas ${config.icon}"></i>
                                ${config.name}
                            </span>
                            • ${data.description || config.description}
                        </p>
                    </div>
                    <div class="spreadsheet-actions">
                        <button id="btn-change-spreadsheet" class="btn-secondary">
                            <i class="fas fa-exchange-alt mr-2"></i> Trocar Planilha
                        </button>
                        <button id="btn-refresh-data" class="btn-primary">
                            <i class="fas fa-sync-alt mr-2"></i> Atualizar
                        </button>
                    </div>
                </div>
            `;

            const headerContainer = document.getElementById('selected-spreadsheet-header');
            if (headerContainer) headerContainer.innerHTML = headerHTML;

            // Reatachar eventos
            const changeBtn = document.getElementById('btn-change-spreadsheet');
            const refreshBtn = document.getElementById('btn-refresh-data');

            if (changeBtn) {
                changeBtn.addEventListener('click', () => {
                    if (dataSection) dataSection.classList.add('hidden');
                    if (selector) selector.classList.remove('hidden');
                    currentSpreadsheetId = null;
                    currentSpreadsheetName = null;
                });
            }

            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    loadSelectedSpreadsheetFromId(spreadsheetId);
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar informações da planilha:', error);
    }

    // Carregar dados da planilha selecionada
    await loadSelectedSpreadsheet(downloadUrl);
}

async function loadSelectedSpreadsheet(downloadUrl) {
    showDataLoading();

    try {
        showLoading('Baixando planilha do OneDrive...');

        // Fazer download do OneDrive
        const response = await fetch(downloadUrl);

        if (!response.ok) {
            throw new Error(`Erro ao baixar: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();

        hideLoading();

        // Processar dados
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

        processData(rows);
        hideDataLoading();

    } catch (error) {
        console.error('Erro ao carregar planilha:', error);
        hideLoading();
        showDataError(`Erro ao carregar "${currentSpreadsheetName}": ${error.message}`);
    }
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
    if (messageEl) messageEl.textContent = message;

    // Configurar botão de retry
    const retryBtn = document.getElementById('btn-retry');
    if (retryBtn) {
        retryBtn.onclick = () => {
            loadSelectedSpreadsheetFromId(currentSpreadsheetId);
        };
    }
}

async function loadSelectedSpreadsheetFromId(spreadsheetId) {
    try {
        const { doc, getDoc } = await import(
            "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
        );

        const spreadsheetDoc = await getDoc(doc(firebaseDb, 'spreadsheets', spreadsheetId));

        if (spreadsheetDoc.exists()) {
            const data = spreadsheetDoc.data();
            await loadSelectedSpreadsheet(data.downloadUrl);
        }
    } catch (error) {
        showDataError(`Erro ao recuperar dados da planilha: ${error.message}`);
    }
}

// ============================================
// SISTEMA DE PROCESSAMENTO DE DADOS (ORIGINAL)
// ============================================

// --- Variáveis Globais de Processamento ---
let allProducts = new Set();
let hierarchy = {};
let currentTab = 'opportunities';
let currentProfile = 'N/D';
let currentMissing = [];
let currentSold = [];
let currentConsultantName = '';

// --- DOM Elements ---
let consultantSelect, routeGroup, opportunitiesList, debugLog;
let resultsTitle, tabOpportunities, tabSold;

// --- Helpers ---
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

// --- Core Processing ---
function processData(data) {
    log(`Iniciando processamento de ${data.length} linhas...`);
    if (!data || data.length === 0) { log('Planilha vazia'); return; }

    showLoading('Processando planilha...');

    const maxScan = Math.min(50, data.length);
    const headerKeywords = [/consultor/i, /vendedor/i, /representante/i, /cliente/i, /produto/i, /rota/i, /name/i];

    let bestRow = 0, bestScore = -1;
    for (let r = 0; r < maxScan; r++) {
        const row = (data[r] || []).map(c => c ? String(c).toLowerCase() : '');
        let score = 0;
        for (const cell of row) {
            for (const kw of headerKeywords) {
                if (kw.test(cell)) { score++; break; }
            }
        }
        if (score > bestScore) { bestScore = score; bestRow = r; }
    }

    if (bestScore <= 0) {
        log('AVISO: cabeçalho não detectado nas primeiras 50 linhas; usando linha 0.');
        bestRow = 0;
    } else {
        log(`Cabeçalho estimado na linha ${bestRow + 1} (score=${bestScore}).`);
    }

    const headers = (data[bestRow] || []).map(h => h ? String(h).trim() : '');
    log(`Cabeçalho detectado: ${headers.join(' | ')}`);

    const findColByList = (list) => {
        for (let i = 0; i < headers.length; i++) {
            const h = headers[i] ? headers[i].toString().toLowerCase() : '';
            for (const pat of list) {
                if (typeof pat === 'string') {
                    if (h.includes(pat)) return i;
                } else {
                    if (pat.test(h)) return i;
                }
            }
        }
        return -1;
    };

    const consultantPatterns = [/consultor/i, /vendedor/i, /representante/i, /\brep\b/i, /consultora/i];
    const clientPatterns = [/cliente/i, /pdv/i, /ponto de venda/i, /fantasia/i, /loja/i, /filial/i, /name/i];
    const productPatterns = [/produto/i, /descri/i, /item/i, /sku/i];
    const routePatterns = [/rota/i, /roteiro/i];
    const profilePatterns = [/perfil/i, /categoria/i, /tipo/i, /segmento/i, /classificacao/i];

    const colMap = {
        consultant: findColByList(consultantPatterns),
        client: findColByList(clientPatterns),
        product: findColByList(productPatterns),
        route: findColByList(routePatterns),
        profile: findColByList(profilePatterns),
        headerRowIndex: bestRow
    };

    log(`Mapeamento: ${JSON.stringify(colMap)}`);

    if (colMap.consultant === -1) log('ERRO: coluna CONSULTOR não encontrada.');
    if (colMap.client === -1) log('ERRO: coluna CLIENTE não encontrada.');

    // Obter nome do consultor logado
    const userName = currentMixUser?.name || localStorage.getItem('userName') || 'Consultor';
    currentConsultantName = userName;

    log(`Filtrando dados para o consultor: ${currentConsultantName}`);

    hierarchy = {};
    allProducts = new Set();
    let salesCount = 0;
    let numericSalesCount = 0;

    const isWide = colMap.product === -1;
    let productColumns = [];

    if (isWide) {
        const infoIndices = [colMap.consultant, colMap.route, colMap.client, colMap.profile].filter(i => i !== -1);
        const maxInfoIndex = infoIndices.length ? Math.max(...infoIndices) : -1;
        const startIndex = Math.max(8, maxInfoIndex + 1);
        const ignored = ['perfil', 'tipo', 'categoria', 'segmento'];

        for (let c = startIndex; c < headers.length; c++) {
            const rawName = headers[c] ? headers[c].trim() : `Col${c}`;
            const nameLower = rawName.toString().toLowerCase();
            if (ignored.includes(nameLower)) continue;
            productColumns.push({ index: c, name: rawName });
            allProducts.add(rawName);
        }
        log(`Formato WIDE. Produtos: ${productColumns.length}`);
    } else {
        log('Formato LONG detectado.');
    }

    // Contadores para estatísticas
    let totalConsultants = new Set();
    let totalClients = new Set();
    let totalProducts = new Set();
    let totalOpportunities = 0;

    for (let r = colMap.headerRowIndex + 1; r < data.length; r++) {
        const row = data[r];
        if (!row || row.length === 0) continue;

        const consultantCell = colMap.consultant !== -1 ? row[colMap.consultant] : undefined;
        const clientCell = colMap.client !== -1 ? row[colMap.client] : undefined;
        const routeCell = colMap.route !== -1 ? row[colMap.route] : undefined;
        const profileCell = colMap.profile !== -1 ? row[colMap.profile] : undefined;

        if (!consultantCell || !clientCell) continue;

        const consultant = String(consultantCell).trim();

        // FILTRO CRÍTICO: Mostrar apenas dados do consultor logado
        if (consultant !== currentConsultantName) {
            continue;
        }

        const client = String(clientCell).trim();
        const route = normalizeRoute(routeCell);
        const profile = detectProfile(profileCell);

        // Adiciona aos contadores totais
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
                    salesCount++;
                    totalProducts.add(pc.name);
                    continue;
                }
                const n = toNumber(val);
                if (!Number.isNaN(n) && n >= 1) {
                    hierarchy[consultant][route][client].products.add(pc.name);
                    salesCount++;
                    numericSalesCount++;
                    totalProducts.add(pc.name);
                }
            }
        } else {
            const prodCell = row[colMap.product];
            if (prodCell) {
                const prodName = String(prodCell).trim();
                if (prodName) {
                    hierarchy[consultant][route][client].products.add(prodName);
                    allProducts.add(prodName);
                    salesCount++;
                    totalProducts.add(prodName);
                }
            }
        }
    }

    // Atualizar estatísticas
    updateStatistics(totalConsultants.size, totalClients.size, totalProducts.size, salesCount);

    log(`Processamento finalizado. Consultores: ${Object.keys(hierarchy).length}`);
    log(`Dados filtrados apenas para: ${currentConsultantName}`);

    if (Object.keys(hierarchy).length === 0) {
        showToast(`ATENÇÃO: Nenhum dado encontrado para o consultor "${currentConsultantName}". Verifique se o nome está exatamente igual na planilha.`, 'warning');
    }

    hideLoading();
    populateConsultants();
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
    if (!consultantSelect) return;

    consultantSelect.innerHTML = '<option value="">Selecione...</option>';

    const consultants = Object.keys(hierarchy).sort();

    if (consultants.length > 0) {
        consultantSelect.innerHTML = `<option value="${escapeHtml(currentConsultantName)}" selected>${escapeHtml(currentConsultantName)}</option>`;

        setTimeout(() => {
            consultantSelect.dispatchEvent(new Event('change'));
        }, 100);
    } else {
        log('AVISO: Nenhum dado encontrado para este consultor na planilha.');
    }
}

function handleConsultantChange() {
    const selected = consultantSelect.value;

    while (routeGroup.firstChild) {
        routeGroup.removeChild(routeGroup.firstChild);
    }

    if (opportunitiesList) opportunitiesList.innerHTML = '';
    if (document.getElementById('empty-state')) {
        document.getElementById('empty-state').classList.add('hidden');
    }

    if (!selected) return;

    const routes = Object.keys(hierarchy[selected] || {}).sort();

    routeGroup.innerHTML = `
        <label><i class="fas fa-route mr-2"></i>Rota</label>
        <select id="route-select" class="form-control">
            <option value="">Selecione...</option>
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
            <option value="">Selecione...</option>
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
        opportunitiesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    ${currentTab === 'opportunities' ? '🎉' : '📊'}
                </div>
                <h4>
                    ${currentTab === 'opportunities' ? 'Cliente já comprou todo o mix!' : 'Nenhum item vendido ainda.'}
                </h4>
                <p class="text-secondary">
                    ${currentTab === 'opportunities' ? 'Excelente trabalho!' : 'Comece a vender para ver os dados aqui.'}
                </p>
            </div>
        `;
        return;
    }

    items.forEach(prod => {
        const div = document.createElement('div');
        div.className = 'opportunity-card';

        const actionBtn = currentTab === 'opportunities'
            ? `<button class="btn-primary" style="padding: 6px 12px; font-size: 12px;" data-prod="${escapeHtml(prod)}">
                <i class="fas fa-copy mr-1"></i> Copiar
               </button>`
            : `<span class="text-green-400 text-sm"><i class="fas fa-check-circle mr-1"></i>Vendido</span>`;

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
                    e.target.closest('button').innerHTML = '<i class="fas fa-copy mr-1"></i>Copiar';
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

// --- Initialize App ---
function initializeApp() {
    // Get DOM elements
    consultantSelect = document.getElementById('consultant-select');
    routeGroup = document.getElementById('route-group');
    opportunitiesList = document.getElementById('opportunities-list');
    debugLog = document.getElementById('debug-log');
    resultsTitle = document.getElementById('results-title');
    tabOpportunities = document.getElementById('tab-opportunities');
    tabSold = document.getElementById('tab-sold');

    // Set current user name
    const userName = currentMixUser?.name || localStorage.getItem('userName');
    if (userName) {
        const userElement = document.getElementById('current-user');
        if (userElement) {
            userElement.textContent = userName;
        }
        log(`Usuário autenticado: ${userName}`);
    }

    // Setup event listeners
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

    // Clear log button
    const btnClearLog = document.getElementById('btn-clear-log');
    if (btnClearLog) {
        btnClearLog.addEventListener('click', () => {
            if (debugLog) debugLog.textContent = '';
        });
    }

    log('Sistema MixVision inicializado com sucesso!');
}

// Inicializar Firebase ao carregar
document.addEventListener('DOMContentLoaded', function () {
    initFirebase();

    if (document.getElementById('dashboard-screen')?.classList.contains('active')) {
        setTimeout(() => {
            if (typeof initializeApp === 'function') {
                initializeApp();
            }
        }, 100);
    }
});

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================
window.mixLogin = mixLogin;
window.mixLogout = mixLogout;
window.mixCreateUser = mixCreateUser;
window.showAddSpreadsheetModal = showAddSpreadsheetModal;
window.addNewSpreadsheet = addNewSpreadsheet;
window.deleteSpreadsheet = deleteSpreadsheet;
window.selectSpreadsheet = selectSpreadsheet;
window.showScreen = showScreen;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.logout = mixLogout;
window.selectCategory = selectCategory;
window.filterSpreadsheets = filterSpreadsheets;
