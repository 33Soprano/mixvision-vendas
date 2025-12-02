# 📊 MixVision - Dashboard de Oportunidades Comerciais

![MixVision Preview](https://img.shields.io/badge/Status-Online-brightgreen)
![Firebase](https://img.shields.io/badge/Firebase-Cloud%20Database-orange)
![GitHub Pages](https://img.shields.io/badge/Hosting-GitHub%20Pages-blue)

**Sistema web para análise inteligente de mix de produtos e identificação de oportunidades de vendas.**

## 🌐 Demo Online
🔗 **Acesse agora:** [https://33soprano.github.io/mixvision-vendas](https://33soprano.github.io/mixvision-vendas)

**Credenciais de teste:**
- **Admin**: Token `admin-123`
- **Vendedores**: Tokens gerados no painel administrativo

## 🎯 Funcionalidades Principais

### 📈 **Dashboard Inteligente**
- Upload de planilhas Excel/CSV (formatos .xlsx, .xls, .csv)
- Detecção automática de estrutura de dados
- Filtragem por consultor → rota → cliente
- Identificação de produtos não vendidos por cliente

### 👥 **Sistema de Acesso Multi-usuário**
- Painel administrativo para gerar tokens únicos
- Cada vendedor acessa apenas seus dados
- Controle centralizado de usuários

### 📊 **Análises Visualizadas**
- Visualização de oportunidades por perfil (A/B/C)
- Diferenciação entre "já vendidos" e "oportunidades"
- Estatísticas em tempo real
- Exportação de dados

### 🔒 **Segurança e Performance**
- Autenticação por tokens sem necessidade de senhas
- Processamento 100% no navegador (dados não saem do computador)
- Interface responsiva (funciona em celulares e tablets)
- Cache inteligente para performance

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Finalidade |
|------------|------------|
| **HTML5/CSS3** | Interface do usuário moderna e responsiva |
| **JavaScript (ES6+)** | Lógica de aplicação e interatividade |
| **Firebase Firestore** | Banco de dados em tempo real para usuários |
| **SheetJS (xlsx)** | Processamento de planilhas Excel no navegador |
| **GitHub Pages** | Hospedagem estática gratuita |
| **Firebase Auth** | Sistema de autenticação por tokens |

## 🚀 Como Usar

### Para Administradores:
1. Acesse o site com token `admin-123`
2. Cadastre vendedores (nome + token gerado automaticamente)
3. Distribua os tokens para sua equipe

### Para Vendedores:
1. Receba seu token pessoal
2. Acesse o dashboard
3. Faça upload da planilha de vendas
4. Visualize oportunidades por cliente

### Para Desenvolvedores:
```bash
# Clone o repositório
git clone https://github.com/33Soprano/mixvision-vendas.git

# Os arquivos estão prontos para uso:
- index.html  # Página principal
- style.css   # Estilos
- script.js   # Lógica completa
