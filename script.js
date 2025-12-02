// ============================================
// PARTE 1: SISTEMA DE AUTENTICAÇÃO COM FIREBASE
// ============================================

// Variáveis globais do sistema de autenticação
let currentMixUser = null;
let firebaseDb = null;

// ===== INICIALIZAÇÃO FIREBASE =====
async function initFirebase() {
    try {
        // Aguardar Firebase carregar
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

            // Verificar se admin existe
            await checkAdminUser();

            // Verificar login salvo
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

        // USANDO ÍNDICE: role + __name__
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
                mixLoadUsers();
            } else {
                loadDashboardScreen();
            }
        } catch (e) {
            localStorage.removeItem('mixvision_user');
        }
    }
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

    // Mostrar loading
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
            mixLoadUsers();
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

            if (currentMixUser.role === 'admin') {
                showScreen('admin-screen');
                mixLoadUsers();
            } else {
                loadDashboardScreen();
            }
        } else {
            showError('Token inválido ou usuário não encontrado!');
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Acessar Dashboard';
                loginBtn.disabled = false;
            }
        }
    } catch (error) {
        console.error('Erro:', error);
        showError('Erro de conexão com o servidor');
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Acessar Dashboard';
            loginBtn.disabled = false;
        }
    }
}

async function mixCreateUser() {
    const nameInput = document.getElementById('new-user-name');
    const name = nameInput ? nameInput.value.trim() : '';
    const createBtn = document.getElementById('create-user-btn');

    if (!name) {
        alert('Digite um nome para o vendedor!');
        return;
    }

    // Gerar token aleatório
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

        alert(`✅ Vendedor criado com sucesso!\n\nNome: ${name}\nToken: ${token}\n\nCopie este token e entregue ao vendedor.`);

        if (nameInput) nameInput.value = '';
        mixLoadUsers();
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        alert('Erro ao criar vendedor. Tente novamente.');
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

        // USANDO ÍNDICE: role + createdAt + __name__
        const q = query(
            collection(firebaseDb, 'users'),
            where('role', '==', 'user'),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = '<p>Nenhum vendedor cadastrado ainda.</p>';
            return;
        }

        let html = '';
        querySnapshot.forEach(doc => {
            const user = doc.data();
            const date = user.createdAt ? new Date(user.createdAt) : new Date();
            html += `
                <div class="user-item">
                    <div>
                        <strong>${user.name}</strong><br>
                        <small style="color: #94a3b8; font-size: 12px;">
                            Criado em: ${date.toLocaleDateString('pt-BR')}
                        </small>
                    </div>
                    <div class="token-display">${user.token}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);

        // Fallback: tentar sem orderBy se ainda der erro de índice
        if (error.code === 'failed-precondition') {
            console.log('Tentando fallback sem orderBy...');
            tryFallbackLoadUsers(container);
        } else {
            container.innerHTML = '<p style="color: #ef4444;">Erro ao carregar vendedores.</p>';
        }
    }
}

// Fallback se índice ainda não estiver pronto
async function tryFallbackLoadUsers(container) {
    try {
        const { collection, query, where, getDocs } = await import(
            "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
        );

        const q = query(
            collection(firebaseDb, 'users'),
            where('role', '==', 'user')
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = '<p>Nenhum vendedor cadastrado ainda.</p>';
            return;
        }

        // Ordenar manualmente
        const usersArray = [];
        querySnapshot.forEach(doc => {
            const user = doc.data();
            user.id = doc.id;
            usersArray.push(user);
        });

        usersArray.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
        });

        let html = '';
        usersArray.forEach(user => {
            const date = user.createdAt ? new Date(user.createdAt) : new Date();
            html += `
                <div class="user-item">
                    <div>
                        <strong>${user.name}</strong><br>
                        <small style="color: #94a3b8; font-size: 12px;">
                            Criado em: ${date.toLocaleDateString('pt-BR')}
                        </small>
                    </div>
                    <div class="token-display">${user.token}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (fallbackError) {
        console.error('Fallback também falhou:', fallbackError);
        container.innerHTML = '<p style="color: #ef4444;">Índice ainda não está pronto. Aguarde alguns minutos.</p>';
    }
}

function mixLogout() {
    localStorage.removeItem('mixvision_user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    currentMixUser = null;
    showScreen('login-screen');
    const tokenInput = document.getElementById('token-input');
    if (tokenInput) tokenInput.value = '';
}

// ===== FUNÇÕES AUXILIARES =====
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

// ===== CARREGAR DASHBOARD =====
function loadDashboardScreen() {
    const dashboardContent = document.getElementById('dashboard-content');
    const userName = currentMixUser?.name || localStorage.getItem('userName') || 'Vendedor';

    // HTML do dashboard - VERSÃO CORRIGIDA (APENAS 2 ABAS)
    dashboardContent.innerHTML = `
        <div class="app-container">
            <header class="app-header">
                <div>
                    <h1><i class="fas fa-chart-network mr-2"></i>MixVision</h1>
                    <p class="subtitle">Dashboard Inteligente de Oportunidades</p>
                </div>

                <div class="flex items-center gap-4">
                    <div class="user-welcome">
                        <div class="user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div>
                            <div class="font-medium" id="current-user">${userName}</div>
                            <div class="text-xs text-secondary">Consultor</div>
                        </div>
                    </div>
                    <button class="btn-primary btn-logout" onclick="mixLogout()">
                        <i class="fas fa-sign-out-alt"></i> Sair
                    </button>
                </div>
            </header>

            <section id="upload-section" class="card">
                <h3><i class="fas fa-file-upload"></i> Carregar Dados de Vendas</h3>
                <p class="text-secondary mb-4">Faça upload da planilha mais recente para analisar oportunidades por cliente</p>

                <div id="drop-zone" class="upload-area">
                    <div class="upload-icon">
                        <i class="fas fa-cloud-upload-alt"></i>
                    </div>
                    <h4 class="text-xl font-semibold mb-2">Arraste e solte sua planilha</h4>
                    <p class="text-secondary mb-6">Formatos suportados: .xlsx, .xls, .csv</p>
                    <button id="btn-upload" class="btn-primary">
                        <i class="fas fa-folder-open"></i> Procurar Arquivo
                    </button>
                    <input type="file" id="file-input" accept=".xlsx,.xls,.csv" class="hidden" />
                    <p class="text-xs text-muted mt-6">
                        <i class="fas fa-info-circle mr-1"></i>
                        Sua planilha será processada localmente, garantindo segurança dos dados
                    </p>
                </div>

                <div class="stats-grid mt-6" id="upload-stats" style="display: none;">
                    <div class="stat-card">
                        <div class="stat-value" id="stat-consultants">0</div>
                        <div class="stat-label">Consultores</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="stat-clients">0</div>
                        <div class="stat-label">Clientes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="stat-products">0</div>
                        <div class="stat-label">Produtos</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="stat-opportunities">0</div>
                        <div class="stat-label">Oportunidades</div>
                    </div>
                </div>
            </section>

            <section id="filters-section" class="card hidden">
                <h3><i class="fas fa-filter"></i> Análise de Oportunidades</h3>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="form-group">
                        <label><i class="fas fa-user-tie mr-2"></i>Consultor</label>
                        <select id="consultant-select" class="form-control">
                            <option value="">Selecionar consultor...</option>
                        </select>
                    </div>

                    <div id="route-group" class="form-group">
                        <label><i class="fas fa-route mr-2"></i>Rota</label>
                        <select id="route-select" class="form-control" disabled>
                            <option value="">Selecione primeiro o consultor</option>
                        </select>
                    </div>

                    <div id="client-group" class="form-group">
                        <label><i class="fas fa-building mr-2"></i>Cliente</label>
                        <select id="client-select" class="form-control" disabled>
                            <option value="">Selecione primeiro a rota</option>
                        </select>
                    </div>
                </div>

                <!-- ABAS CORRETAS (APENAS 2) -->
                <div class="tabs-container">
                    <button id="tab-opportunities" class="tab-button active">
                        <i class="fas fa-bullseye mr-2"></i>Oportunidades
                    </button>
                    <button id="tab-sold" class="tab-button">
                        <i class="fas fa-check-circle mr-2"></i>Já Vendidos
                    </button>
                </div>

                <div class="opportunity-count mb-6">
                    <div>
                        <div class="count-label" id="results-title">OPORTUNIDADES DE VENDA</div>
                        <div class="count-display" id="opportunity-count-text">0 itens</div>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="badge badge-profile" id="profile-badge">Perfil: N/D</div>
                        <button id="btn-export" class="btn-primary" style="display: none;">
                            <i class="fas fa-download"></i> Exportar
                        </button>
                    </div>
                </div>

                <div id="opportunities-list" class="opportunity-grid"></div>

                <div id="empty-state" class="empty-state hidden">
                    <div class="empty-state-icon">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                    <h4 class="text-xl font-semibold mb-2">Nenhum dado para exibir</h4>
                    <p class="text-secondary">Selecione um consultor, rota e cliente para visualizar as oportunidades</p>
                </div>
            </section>

            <section class="card">
                <div class="flex justify-between items-center mb-4">
                    <h3><i class="fas fa-terminal"></i> Console do Sistema</h3>
                    <button id="btn-clear-log" class="btn-primary" style="padding: 8px 16px; font-size: 12px;">
                        <i class="fas fa-broom"></i> Limpar Logs
                    </button>
                </div>
                <div class="log-container">
                    <pre id="debug-log"></pre>
                </div>
            </section>
        </div>
        
        <div id="loading-overlay" class="loading-overlay hidden">
            <div class="spinner"></div>
            <p class="text-secondary mt-4">Processando planilha...</p>
        </div>
    `;

    showScreen('dashboard-screen');

    // Inicializar o dashboard
    setTimeout(() => {
        // Atualizar nome do usuário
        const userElement = document.getElementById('current-user');
        if (userElement && currentMixUser) {
            userElement.textContent = currentMixUser.name;
        }

        // Inicializar app
        if (typeof initializeApp === 'function') {
            initializeApp();
        }
    }, 100);
}

// ============================================
// PARTE 2: SEU CÓDIGO ORIGINAL DE PROCESSAMENTO
// ============================================

// --- Variáveis Globais ---
let allProducts = new Set();
let hierarchy = {};
let currentTab = 'opportunities'; // 'opportunities' ou 'sold'
let currentProfile = 'N/D';
let currentMissing = [];
let currentSold = [];
let currentConsultantName = '';
let consultantData = {};

// --- DOM Elements ---
let fileInput, dropZone, uploadSection, filtersSection, consultantSelect;
let routeGroup, opportunityCount, opportunitiesList, debugLog;
let resultsTitle, tabOpportunities, tabSold, btnUpload;

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

    // Mostrar loading
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
            continue; // Pula dados de outros consultores
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

    // Mostrar mensagem se nenhum dado foi encontrado para o consultor
    if (Object.keys(hierarchy).length === 0) {
        alert(`ATENÇÃO: Nenhum dado encontrado para o consultor "${currentConsultantName}". Verifique se o nome está exatamente igual na planilha.`);
    }

    // Esconder loading
    hideLoading();

    populateConsultants();

    // Show filters, hide upload
    if (uploadSection) uploadSection.classList.add('hidden');
    if (filtersSection) filtersSection.classList.remove('hidden');
}

function updateStatistics(consultants, clients, products, opportunities) {
    const statConsultants = document.getElementById('stat-consultants');
    const statClients = document.getElementById('stat-clients');
    const statProducts = document.getElementById('stat-products');
    const statOpportunities = document.getElementById('stat-opportunities');
    const uploadStats = document.getElementById('upload-stats');

    if (statConsultants) statConsultants.textContent = consultants;
    if (statClients) statClients.textContent = clients;
    if (statProducts) statProducts.textContent = products;
    if (statOpportunities) statOpportunities.textContent = opportunities;
    if (uploadStats) uploadStats.style.display = 'grid';
}

function populateConsultants() {
    if (!consultantSelect) return;

    consultantSelect.innerHTML = '<option value="">Selecione...</option>';

    // Mostrar apenas o consultor logado
    const consultants = Object.keys(hierarchy).sort();

    if (consultants.length > 0) {
        // Auto-selecionar o consultor logado
        consultantSelect.innerHTML = `<option value="${escapeHtml(currentConsultantName)}" selected>${escapeHtml(currentConsultantName)}</option>`;

        // Disparar o evento de change para carregar as rotas
        setTimeout(() => {
            consultantSelect.dispatchEvent(new Event('change'));
        }, 100);
    } else {
        log('AVISO: Nenhum dado encontrado para este consultor na planilha.');
    }
}

function handleConsultantChange() {
    const selected = consultantSelect.value;

    // Limpar elementos filhos do route-group
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
        <label class="block text-sm font-medium text-gray-400 mb-2">Rota</label>
        <select id="route-select" class="form-control w-full">
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
        <label class="block text-sm font-medium text-gray-400 mb-2">Cliente</label>
        <select id="client-select" class="form-control w-full">
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

    // Update profile badge
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

    // Update counts and badges
    const opportunityCountText = document.getElementById('opportunity-count-text');
    const resultsTitleElement = document.getElementById('results-title');

    if (opportunityCountText) {
        opportunityCountText.textContent = `${items.length} ${countText}`;
    }

    if (resultsTitleElement) {
        resultsTitleElement.textContent = currentTab === 'opportunities' ? 'OPORTUNIDADES DE VENDA' : 'ITENS JÁ VENDIDOS';
    }

    // Hide empty state if showing results
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.classList.add('hidden');

    if (items.length === 0) {
        opportunitiesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    ${currentTab === 'opportunities' ? '🎉' : '📊'}
                </div>
                <h4 class="text-xl font-semibold mb-2">
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
        div.className = 'opportunity-card group';

        const actionBtn = currentTab === 'opportunities'
            ? `<button class="btn-primary opacity-0 group-hover:opacity-100 transition-opacity" style="padding: 6px 12px; font-size: 12px;" data-prod="${escapeHtml(prod)}">
                <i class="fas fa-copy mr-1"></i> Copiar
               </button>`
            : `<span class="text-green-400 text-sm"><i class="fas fa-check-circle mr-1"></i>Vendido</span>`;

        div.innerHTML = `
            <span class="product-name">${escapeHtml(prod)}</span>
            ${actionBtn}
        `;
        opportunitiesList.appendChild(div);
    });

    // Add event listeners for copy buttons
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

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    log(`Arquivo selecionado: ${file.name}`);

    // Save to localStorage
    const readerForStorage = new FileReader();
    readerForStorage.onload = (e) => {
        try {
            localStorage.setItem('lastSpreadsheet', e.target.result);
            localStorage.setItem('lastSpreadsheetName', file.name);
            log('Arquivo salvo em cache.');
        } catch (err) {
            log('Aviso: Arquivo muito grande para salvar em cache.');
        }
    };
    readerForStorage.readAsDataURL(file);

    // Process
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
            processData(rows);
        } catch (err) {
            log(`ERRO FATAL: ${err.message}`);
            alert('Erro ao ler arquivo Excel.');
            hideLoading();
        }
    };
    reader.readAsArrayBuffer(file);
}

// --- Event Listeners ---
function initializeApp() {
    // Get DOM elements
    fileInput = document.getElementById('file-input');
    dropZone = document.getElementById('drop-zone');
    uploadSection = document.getElementById('upload-section');
    filtersSection = document.getElementById('filters-section');
    consultantSelect = document.getElementById('consultant-select');
    routeGroup = document.getElementById('route-group');
    opportunityCount = document.getElementById('opportunity-count');
    opportunitiesList = document.getElementById('opportunities-list');
    debugLog = document.getElementById('debug-log');
    resultsTitle = document.getElementById('results-title');
    tabOpportunities = document.getElementById('tab-opportunities');
    tabSold = document.getElementById('tab-sold');
    btnUpload = document.getElementById('btn-upload');

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
    if (btnUpload) {
        btnUpload.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length) {
                fileInput.files = files;
                handleFileSelect({ target: { files: files } });
            }
        });
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

    // Clear log button
    const btnClearLog = document.getElementById('btn-clear-log');
    if (btnClearLog) {
        btnClearLog.addEventListener('click', () => {
            if (debugLog) debugLog.textContent = '';
        });
    }

    // Auto Load Check
    setTimeout(() => {
        const saved = localStorage.getItem('lastSpreadsheet');
        if (saved) {
            const filename = localStorage.getItem('lastSpreadsheetName') || 'Planilha Salva';
            log(`Cache encontrado: ${filename}`);

            // Create a restore banner inside upload section
            const restoreDiv = document.createElement('div');
            restoreDiv.className = 'mt-6 p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg flex items-center justify-between';
            restoreDiv.innerHTML = `
                <span class="text-blue-200 text-sm">
                    <i class="fas fa-history mr-2"></i>Restaurar "${filename}"?
                </span>
                <div class="flex gap-2">
                    <button id="btn-restore" class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors">
                        <i class="fas fa-redo mr-1"></i>Restaurar
                    </button>
                    <button id="btn-clear" class="px-3 py-1 bg-red-900/50 hover:bg-red-800 text-red-200 rounded text-sm transition-colors">
                        <i class="fas fa-trash mr-1"></i>Limpar
                    </button>
                </div>
            `;

            // Insert after the upload area
            const container = dropZone.parentNode;
            if (container) {
                container.insertBefore(restoreDiv, dropZone.nextSibling);

                document.getElementById('btn-restore').onclick = () => {
                    try {
                        const byteString = atob(saved.split(',')[1]);
                        const ab = new ArrayBuffer(byteString.length);
                        const ia = new Uint8Array(ab);
                        for (let i = 0; i < byteString.length; i++) {
                            ia[i] = byteString.charCodeAt(i);
                        }
                        const workbook = XLSX.read(ab, { type: 'array' });
                        const sheet = workbook.Sheets[workbook.SheetNames[0]];
                        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
                        processData(rows);
                        log('Restaurado com sucesso.');
                        restoreDiv.remove();
                    } catch (e) {
                        log('Erro ao restaurar: ' + e.message);
                        localStorage.removeItem('lastSpreadsheet');
                        restoreDiv.remove();
                    }
                };

                document.getElementById('btn-clear').onclick = () => {
                    localStorage.removeItem('lastSpreadsheet');
                    localStorage.removeItem('lastSpreadsheetName');
                    restoreDiv.remove();
                    log('Cache limpo.');
                };
            }
        }
    }, 500);

    log('Sistema MixVision inicializado com sucesso!');
}

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', function () {
    // Inicializar Firebase
    initFirebase();

    // Se já estiver no dashboard, inicializar
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
window.showScreen = showScreen;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

// Funções originais para compatibilidade
window.logout = mixLogout;
