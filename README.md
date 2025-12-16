# 📊 MixVision - Dashboard de Oportunidades Comerciais

Visão Geral
MixVision é um dashboard interativo que permite:

Vendedores: Analisar oportunidades de vendas por categoria

Administradores: Gerenciar vendedores e planilhas de dados

Análise de Dados: Processamento inteligente de planilhas para identificar oportunidades

✨ Funcionalidades Principais
👥 Sistema de Autenticação
Tokens únicos para cada vendedor

Painel administrativo com token especial

Sessão persistente no navegador

📊 Dashboard Vendedor
Seleção de planilhas por categoria (Mercearia, Limpeza, M Dias, Saudáveis)

Filtros hierárquicos: Consultor → Rota → Cliente

Visualização de oportunidades vs. produtos já vendidos

Exportação de dados

Sistema de copiar produto para área de transferência

🔧 Dashboard Administrativo
Cadastro de novos vendedores

Geração automática de tokens

Gerenciamento de tabelas do Supabase

Visualização de todos os vendedores cadastrados

🔄 Integrações
Supabase: Armazenamento e consulta de dados

Firebase: Autenticação e gerenciamento de usuários

SheetJS: Processamento de planilhas Excel

🛠️ Tecnologias Utilizadas
Frontend: HTML5, CSS3, JavaScript (ES6+)

Backend como Serviço:

Firebase Firestore (autenticação e usuários)

Supabase (banco de dados PostgreSQL)

Bibliotecas:

Font Awesome (ícones)

Google Fonts (Inter, JetBrains Mono)

SheetJS (manipulação de Excel)

Estilo: CSS Moderno com variáveis CSS, gradientes, animações

🚀 Como Executar o Projeto
Pré-requisitos
Conta no Firebase

Conta no Supabase

Navegador moderno (Chrome 90+, Firefox 88+, Safari 14+)

Configuração Passo a Passo
1. Configurar Firebase
javascript
// No arquivo index.html, substitua a configuração:
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO",
    // ... outras configurações
};
2. Configurar Supabase
javascript
// No arquivo index.html, substitua:
const supabaseUrl = 'SUA_URL_DO_SUPABASE';
const supabaseAnonKey = 'SUA_CHAVE_ANONIMA';
3. Estrutura do Banco de Dados
Firebase (Firestore):

Coleção: users

Campos: name, token, role, createdAt

Supabase (PostgreSQL):

Tabelas sugeridas:

mercearia, limpeza, mdias, saudaveis

Ou qualquer tabela com estrutura de dados de vendas

4. Executar Localmente
bash
# Clone o repositório
git clone https://github.com/seu-usuario/mixvision-dashboard.git

# Navegue até o diretório
cd mixvision-dashboard

# Execute um servidor local (Python 3)
python -m http.server 8000

# Ou use o Live Server do VS Code
# Acesse: http://localhost:8000
📁 Estrutura de Arquivos
text
mixvision-dashboard/
│
├── index.html          # Página principal com configurações
├── style.css           # Estilos principais do sistema
├── script.js           # Lógica principal da aplicação
│
├── assets/             # (Opcional) Imagens e ícones
│   ├── logo.svg
│   └── favicon.ico
│
└── README.md           # Este arquivo
🔧 Configuração Avançada
Personalização de Categorias
javascript
// Em script.js, modifique:
const CATEGORY_CONFIG = {
    'nome-da-categoria': {
        name: 'Nome Amigável',
        color: '#HEXCOLOR',
        icon: 'fa-icon-class',
        description: 'Descrição da categoria'
    }
};
Adicionar Novas Tabelas
Acesse seu projeto no Supabase

Crie uma nova tabela no Table Editor

O sistema detectará automaticamente na próxima atualização

Tokens de Acesso
Admin: Use admin-123 para acessar o painel administrativo

Vendedores: Tokens são gerados automaticamente no painel admin

📱 Responsividade
O sistema é totalmente responsivo e funciona em:

✅ Desktop (1024px+)

✅ Tablet (768px - 1023px)

✅ Mobile (até 767px)

🔒 Considerações de Segurança
⚠️ Importante: Este projeto usa credenciais no lado do cliente. Para produção:

Configure regras de segurança no Firebase

Use Row Level Security no Supabase

Considere implementar um backend proxy para credenciais

Ative CORS apropriadamente

🐛 Solução de Problemas
Problema: "Nenhuma tabela encontrada"
Solução:

Verifique se o projeto Supabase está correto

Confirme se há tabelas criadas no Table Editor

Clique em "Atualizar Lista"

Problema: "Token inválido"
Solução:

Verifique se o token foi digitado corretamente

Confirme no painel admin se o vendedor está cadastrado

Tente gerar um novo token

Problema: Dados não carregam
Solução:

Verifique o console do navegador (F12)

Confira a conexão com Supabase

Use o botão "Debug Planilha" para diagnóstico

📈 Fluxo de Dados
text
Usuário digita token → Firebase valida → Redireciona para dashboard
↓
Usuário seleciona tabela → Supabase consulta dados → Processamento local
↓
Dados são analisados → Oportunidades identificadas → Interface renderizada
🤝 Contribuindo
Fork o projeto

Crie uma branch para sua feature (git checkout -b feature/AmazingFeature)

Commit suas mudanças (git commit -m 'Add some AmazingFeature')

Push para a branch (git push origin feature/AmazingFeature)

Abra um Pull Request

📄 Licença
Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE para detalhes.

🙋‍♂️ Suporte
Para suporte, dúvidas ou sugestões:

Abra uma issue

Verifique a seção de Solução de Problemas acima

Consulte a documentação do Firebase e Supabase

🎯 Próximas Features Planejadas
Gráficos e visualizações avançadas

Exportação para PDF/Excel

Sistema de notificações

Dashboard em tempo real

API REST para integrações

Desenvolvido com ❤️ para otimizar processos de vendas

Nota: Este projeto é um exemplo de implementação e pode ser adaptado para diferentes necessidades de negócio.
