# API Backend SaaS (Multi-Tenant)

Uma API backend completa, pronta para produção, projetada para arquiteturas SaaS multi-tenant (várias empresas no mesmo sistema). Agora atualizada com automação de registro, trial de planos, proteção contra ataques (rate limiting), sistema avançado de logs e validações isoladas.

## 🚀 Como instalar no EasyPanel (Muito Fácil)

O EasyPanel foi feito para rodar aplicações usando o **Docker Compose**. Siga estes passos simples e você terá sua API e Banco de Dados rodando em menos de 5 minutos!

### Passo 1: Acesse seu EasyPanel e crie o Projeto
1. Abra o EasyPanel e clique no seu **Project**.
2. Clique em **Templates**.
3. Role até o final e escolha **Docker Compose** (ou "AppFrom Template" -> "Compose").

### Passo 2: Configure o Docker Compose
Copie o conteúdo exato do arquivo `docker-compose.yml` deste repositório e cole na caixa do Docker Compose no EasyPanel:

```yml
version: '3.8'

services:
  api:
    build:
      context: .
    container_name: saas_api
    restart: unless-stopped
    ports:
      - "${APP_PORT:-3000}:3000"
    environment:
      - DB_HOST=${DB_HOST}
      - DB_PORT=${DB_PORT}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
      - DATABASE_URL=mysql://${DB_USER}:${DB_PASSWORD}@mysql:3306/${DB_NAME}
      - JWT_SECRET=${JWT_SECRET}
      - APP_PORT=3000
      - CORS_ORIGINS=${CORS_ORIGINS}
    depends_on:
      mysql:
        condition: service_healthy

  mysql:
    image: mysql:8.0
    container_name: saas_mysql
    restart: unless-stopped
    ports:
      - "${DB_PORT:-3306}:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD}
      - MYSQL_DATABASE=${DB_NAME}
      - MYSQL_USER=${DB_USER}
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10

volumes:
  mysql_data:
```
*(Nota: Lembre-se que você precisa linkar o código-fonte (este repositório do Github) na configuração do serviço `api` do Easypanel para que ele consiga fazer o `build`, ou subir o código diretamente para o contêiner se ele estiver criando a partir de uma pasta local nas opções avançadas).*

### Passo 3: Coloque as Variáveis de Ambiente
No EasyPanel, na aba de **Environment** (Variáveis), adicione o seguinte:

```env
DB_HOST=mysql
DB_PORT=3306
DB_USER=saas_user
DB_PASSWORD=senha_forte_do_banco_123
DB_NAME=saas_db
JWT_SECRET=umasenhamuitosegura_para_seus_tokens
APP_PORT=3000
CORS_ORIGINS=https://seu-frontend.com,http://localhost:3000
```

### Passo 4: Salvar e "Deploy"
Clique em **Deploy / Create**. O EasyPanel vai baixar o MySQL, ler o seu `Dockerfile` otimizado, compilar a aplicação Typescript, iniciar o Prisma ORM instalando as tabelas e vai rodar o sistema.

**Dica Extra:** Acesse o **Terminal** do contêiner `api` dentro do EasyPanel e digite o comando abaixo para criar as contas e planos Iniciais automaticamente:
```bash
npm run prisma:seed
```

### Passo 5: Expor um Domínio (Proxy)
1. No seu serviço `api` do EasyPanel, vá em **Domains**.
2. Adicione seu subdomínio (Ex: `api.meusistema.com`).
3. Aponte a porta para `3000`. Crie seu certificado SSL gratuito e pronto! Sua API está no ar!

---

## 💻 Instalação Local (Para Desenvolvedores)

Se você quer apenas rodar no seu computador para testar ou programar mais:

1. **Instale as dependências:**
   ```bash
   npm install
   ```
2. **Crie seu `.env`:**
   Configure a string do banco de dados (Você precisa de um MySQL local rodando).
3. **Suba as tabelas no Banco de Dados:**
   ```bash
   npx prisma migrate dev --name init
   ```
4. **Crie os dados iniciais:**
   ```bash
   npm run prisma:seed
   ```
5. **Inicie o servidor localmente:**
   ```bash
   npm run dev
   ```

---

## 🛠 Novidades Adicionadas

1. **Registro Automático de Empresas:** Agora o `/api/auth/register-tenant` não só cria o usuário, como também já cadastra a nova "Empresa", gera o Trial de 14 dias automaticamente, e atribui o papel de Admin dono da empresa a ele.
2. **Sistema de Email e Recuperação de Senhas:** Fluxo para verificar se o email é válido, bem como um sistema de envio de token de esqueci minha senha `/auth/forgot-password`.
3. **Múltiplos Webhooks de Pagamento:** Além de receber um pagamento aprovado, você pode ouvir `payment-cancelled` (Para pausar contas na hora) e `payment-renewed` (Para estender assinaturas ativas).
4. **Monitoramento Global de Limites e Isolamento de Tenants:** Adicionado middleware `enforceTenantIsolation` (Apenas os dados da empresa de quem logou vão transitar). Adicionada tabela de `Usage` que verifica se limites estipulados no Prisma como chamadas de API ou GB de Storage foram estouradas baseando-se no `limit` do plano.
5. **Segurança Extrema:** Proteção Bruteforce instalada que trava quem tentar errar a senha por 5 vezes seguidas. Além disso Tokens Refresh JWT adicionados validando logs em banco de dados e CORS vinculável por Ambiente (.env).
6. **Docker Otimizado e Logging Automático:** O seu Log via Winston monitorará automaticamente erros, rastreando Ips e salvando tudo numa tabela dentro do seu próprio MySQL.

---

## 🔌 Exemplos de Rotas (Endpoints)

Ao acessar a API, utilize esses domínios:

- `POST /api/auth/register-tenant`: Registra uma empresa e seu dono pela primeira vez.
- `POST /api/auth/login`: Pega um Token curto de acesso 15min e um Longo (Refresh Token).
- `POST /api/auth/refresh-token`: Renova o token de acesso.
- `GET /api/health`: Verifica perfeitamente se a API sobreviveu e checa ping na comunicação entre a API e o Banco de dados MySQL confirmando a saúde dos dois pontos.
