# Guia de Integração Lovable ❤️ -> API SaaS Multi-Tenant

Copie e cole os blocos abaixo diretamente no chat do Lovable (ou em seus arquivos de código) para conectar perfeitamente as telas do seu aplicativo à nossa API Backend hospedada no EasyPanel.

## 1. Configuração Central da API (O Cérebro das Requisições)

**Prompt para o Lovable:**
> "Crie um serviço centralizado de requisições chamado `api.ts` (ou `api.js`) na pasta de utilitários do projeto. Ele deve usar o `fetch` nativo (ou Axios) configurado com a `BASE_URL = 'https://SUA_API_EASYPANEL.com/api'`. Adicione um interceptador que anexe automaticamente o cabeçalho \`Authorization: Bearer \${localStorage.getItem('token')}\` em todas as chamadas, exceto nas rotas de \`/auth/login\` e \`/auth/register-tenant\`."

---

## 2. Tela de Criação de Conta (Cadastro de Empresa)

**Prompt para o Lovable:**
> "Crie um componente de formulário completo e estilizado para 'Criar Nova Conta / Empresa'. Deve conter os campos: Nome da Empresa (tenantName), Nome Completo (name), E-mail e Senha.
> 
> Quando o usuário enviar o formulário, faça uma requisição POST na rota `/auth/register-tenant`.
> 
> O corpo da requisição (JSON) deve ter exatamente este formato:
> \`\`\`json
> {
>   "tenantName": "valorDoInputEmpresa",
>   "email": "valorDoInputEmail",
>   "password": "valorDoInputSenha",
>   "name": "valorDoInputNome"
> }
> \`\`\`
> Se a API retornar código 201, exiba uma mensagem de sucesso elegante ('Sua conta de empresa foi criada. Faça login') e redirecione o usuário para a tela de Login. Em caso de erro (ex: e-mail já existe), exiba a mensagem retornada no JSON `error` ou `message` usando um componente de Toast."

---

## 3. Tela de Login e Guardar a Sessão

**Prompt para o Lovable:**
> "Crie uma página de Login bonita e responsiva contendo E-mail e Senha. 
> Ao submeter o formulário, faça um POST para a rota `/auth/login` com os parâmetros `email` e `password`.
> 
> A resposta de sucesso trará um JSON com a seguinte estrutura:
> \`\`\`json
> {
>   "token": "eyJhb...",
>   "refreshToken": "abcdef...",
>   "user": { "id": "...", "email": "...", "name": "...", "role": "admin", "tenantId": "..." }
> }
> \`\`\`
> Ao receber isso, você deve obrigatoriamente:
> 1. Salvar o `token` e o `refreshToken` no `localStorage`.
> 2. Salvar o objeto `user` em um estado global (Zustand ou Context API) para que a aplicação saiba quem está logado, qual é o papel dele (`role`) e qual empresa ele pertence (`tenantId`).
> 3. Redirecionar para a rota privada `/dashboard`."

---

## 4. O Dashboard do Administrador (Carregar Gráficos)

**Prompt para o Lovable:**
> "Construa uma tela de Dashboard moderna para Administradores. Assim que a tela carregar (\`useEffect\` ou React Query), ela deve fazer uma requisição GET para `/admin/dashboard`. Lembre-se que o token JWT deve estar nos headers.
> 
> A API retornará os dados consolidados neste formato exato de JSON:
> \`\`\`json
> {
>   "stats": { "totalTenants": 1, "totalUsers": 1, "totalSubscriptions": 0 },
>   "recentTenants": [...],
>   "recentUsers": [...],
>   "recentSubscriptions": [...]
> }
> \`\`\`
> Use o objeto \`stats\` para preencher grandes 'Cards Informativos' no topo da tela (Empresas Ativas, Usuários Totais, Assinaturas Ativas). Use os arrays abaixo dele (\`recent...\`) para alimentar tabelas curtas mostrando um 'Feed de Atividades Recentes'."

---

## 5. Listagem Privada de Usuários da Empresa (Team)

A nossa API isola empresas sozinha, o Front não precisa enviar o código do seu Tenant!

**Prompt para o Lovable:**
> "Crie a página de 'Membros da Equipe'. Faça um GET para a rota `/users` protegida com o Token.
> A API vai processar a qual empresa esse usuário pertence automaticamente e devolverá apenas os funcionários dela em um array dentro da chave \`users\`.
> 
> Desenhe os dados em uma tabela contendo as colunas: 'Nome', 'E-mail' e 'Nível de Acesso (role)'. Para Adicionar novo usuário, faça um botão que abra um Modal de criação fazendo POST na mesma rota `/users` enviando \`{ name, email, password, roleName: 'user' }\` (Esta rota requer privilégios de Admin)."
