# Sistema de Controle de Documentos Ocupacionais (SCDO)

Sistema web para gerenciamento de empresas, filiais e controle de vigência de documentos de Saúde e Segurança do Trabalho (SST), como PCMSO, LTCAT e PGR.

## 📋 Sobre o Projeto

Este projeto é uma aplicação **Client-Side** (roda diretamente no navegador) que utiliza **LocalStorage** para persistência de dados. O objetivo é permitir o cadastro de empresas e o upload de seus documentos regulatórios, oferecendo uma visão clara do status de vigência e hierarquia entre matrizes e filiais.

> **Nota:** Como os arquivos PDF são convertidos para Base64 e salvos no LocalStorage, este sistema tem um limite de armazenamento dependente do navegador (geralmente entre 5MB e 10MB). É ideal para demonstrações ou controle de pequeno volume de dados.

## 🚀 Funcionalidades

*   **Autenticação:** Sistema de login com diferenciação de perfis (Admin vs Usuário).
*   **Gestão de Empresas:**
    *   Cadastro de Matrizes e Filiais.
    *   Vínculo hierárquico (Filial -> Matriz).
    *   Dados cadastrais (CNPJ, Datas, Status, Médico Coordenador).
*   **Controle de Documentos:**
    *   Upload obrigatório de PCMSO, LTCAT e PGR (apenas PDF).
    *   Visualização dos documentos dentro do próprio sistema.
*   **Dashboard Visual:**
    *   Indicadores de status (Vencido, A vencer, Em dia).
    *   Listagem expansível de filiais.

## 🛠️ Tecnologias Utilizadas

*   HTML5
*   CSS3 (Design responsivo e temas)
*   JavaScript (Vanilla ES6+)
*   LocalStorage (Banco de dados local)

## 📦 Como Usar

1.  Baixe ou clone este repositório.
2.  Abra o arquivo `index.html` (na raiz) em seu navegador.
3.  O sistema redirecionará automaticamente para a tela de login.

### Credenciais de Acesso (Padrão)

O sistema já vem com usuários pré-configurados no arquivo `assets/js/auth.js`:

| Perfil | Email | Senha | Permissões |
| :--- | :--- | :--- | :--- |
| **Administrador** | `pereira@gmai.come` | `12345678` | Acesso total (Criar, Editar, Excluir) |
| **Usuário** | `usuario@example.com` | `123456` | Acesso restrito (Visualizar, Criar) |

## 📂 Estrutura de Pastas

*   `/assets`: Estilos globais (CSS) e lógicas compartilhadas (JS de Auth, Storage, Utils).
*   `/cadastro`: Tela de criação e edição de empresas.
*   `/visualizar`: Dashboard principal com a lista de empresas e status.
*   `/login`: Tela de autenticação.
*   `/usuarios`: (Opcional) Gestão de usuários do sistema.

## ⚠️ Limitações Conhecidas

*   **Persistência:** Ao limpar o cache do navegador, todos os dados cadastrados serão perdidos.
*   **Tamanho de Arquivos:** PDFs muito grandes podem falhar ao salvar devido ao limite do LocalStorage. Recomenda-se arquivos pequenos.
