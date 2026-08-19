# 🛡️ ScanGolpe — Threat Intelligence & Detecção de Fraudes Digitais

O **ScanGolpe** é uma plataforma de prevenção contra fraudes digitais voltada a identificar **indícios** de risco no cenário brasileiro. O motor combina regras explicáveis para analisar mensagens, URLs, pedidos de pagamento e anúncios. O resultado é uma triagem: não confirma que um conteúdo é seguro nem substitui a validação pelo canal oficial.

---

## 🚀 Arquitetura de Detecção

O sistema é equipado com algoritmos focados na análise de padrões maliciosos, classificados em múltiplas frentes de atuação:

- 💬 **Engenharia Social (Mensagens):** Detecção de esquemas de manipulação, clonagem de contas (ex: WhatsApp) e falsas centrais de atendimento.
- 🔗 **Phishing e Typosquatting (Links):** Validação estrutural de URLs e cruzamento de dados com marcas reais utilizando algoritmos de proximidade (Distância de Levenshtein) para identificar domínios fraudulentos.
- 💸 **Fraudes Financeiras (Pix/Dados):** Identificação de pedidos direcionados de Pix ou transferência sob pressão. Leitura de QR Code e validação de boleto ainda não fazem parte do motor.
- 📢 **Anúncios Maliciosos:** Mapeamento de gatilhos mentais coercitivos, falsas escassezes e promoções irreais.

---

## ⚠️ Limites e transparência do resultado

- O nível de risco e a pontuação são heurísticos; não representam uma probabilidade nem uma confirmação definitiva de golpe.
- A tela mostra quantos indícios foram encontrados e exibe quando a reputação externa de uma URL está indisponível ou parcial. Falha de consulta nunca significa que a URL é segura.
- A integração atual de reputação usa a API Google Safe Browsing v4. Antes de uso comercial, ela deve ser migrada para um serviço compatível e contratado, pois a v4 está descontinuada.
- O motor ainda não lê imagens, áudios, QR Codes ou códigos de barras. Esses formatos exigem uma etapa própria de OCR e validação.

---

## 🛠️ Tecnologias e Estrutura do Projeto

A aplicação adota uma arquitetura modular baseada em tecnologias front-end modernas, priorizando performance, manutenibilidade e segurança na detecção (client-side):

- **HTML5:** Estrutura semântica (`index.html`) e acessível da interface de análise.
- **CSS3 Modular (`styles.css`):**
  - Tipografia técnica (`JetBrains Mono` para dados analíticos, `Inter` para legibilidade).
  - Identidade visual sob paleta sóbria (Deep Space Black & Neon Cyan), refletindo um ambiente corporativo de cibersegurança.
  - Animações de varredura (Scanline) e efeitos visuais avançados (`backdrop-filter`) para uma experiência de diagnóstico realista.
- **JavaScript (Vanilla JS):**
  - **`app.js`**: Core lógico da aplicação, responsável pelo roteamento das validações, parsing de URLs, cálculo algorítmico de Levenshtein e renderização dinâmica dos relatórios de ameaça.
  - **`history.js`**: Persistência, paginação e exclusão do histórico privado da conta autenticada.
  - **`brands.json`**: Base de dados externa de marcas monitoradas, permitindo escalabilidade e atualização fácil das assinaturas de detecção de phishing sem alteração no código fonte.

---

## 🎨 Identidade Visual e UI/UX

O design foi concebido sob princípios de interfaces de ferramentas de _Threat Intelligence_ (Inteligência de Ameaças):

- **Linguagem de Relatório:** Os resultados das análises são apresentados com precisão técnica (nível de risco, tipo de ameaça, recomendações táticas).
- **Feedback Visual:** Uso de scanlines radiais, conectores e marcadores de status (🔴 Crítico, 🟡 Alerta, 🟢 Seguro) para comunicação universal e instantânea do nível de ameaça.

---

## 🔧 Como Executar o Ambiente de Desenvolvimento

O projeto foi refatorado para uma estrutura modular. Devido à integração com o arquivo `brands.json`, a execução exige um servidor web local.

1. Clone o repositório para o seu ambiente local:
   ```bash
   git clone https://github.com/IsaacFirmino/ScanGolpe-.git
   ```
2. Acesse o diretório do projeto:
   ```bash
   cd ScanGolpe-
   ```
3. Inicie um servidor web local. Recomendamos o uso da extensão **Live Server** no VS Code ou o módulo nativo do Python:
   ```bash
   python -m http.server 8000
   ```
4. Acesse a aplicação através do navegador no endereço [https://isaacfirmino.github.io/ScanGolpe-](https://isaacfirmino.github.io/ScanGolpe-).

---

## 👥 Pesquisadores e Desenvolvedores

- Isabelle Firmino
- Isaac Firmino

---

## 🔐 Tela de Autenticação (`auth.html`)

Tela dedicada de login/cadastro com identidade visual alinhada à landing page (preto profundo + roxo/violeta neon). Usa **exclusivamente o Supabase Auth** — nenhuma senha, segredo OAuth ou token é armazenado no front-end.

### Arquivos adicionados / alterados

| Arquivo | Status | Responsabilidade |
| --- | --- | --- |
| `auth.html` | refinado | Card progressivo em tela dividida no desktop; autenticação priorizada no mobile |
| `auth.css` | refinado | Estados fluidos, card compacto e responsividade com os tokens visuais existentes |
| `auth.js` | refinado | Máquina de estados do card e fluxos reais de login, cadastro, OAuth, recuperação e sessão |
| `supabase-client.js` | inalterado | Já expõe `window.supabaseClient` — reaproveitado |
| `index.html` | alterado | Header agora tem link "Entrar" → `auth.html` (botão "Escanear" também leva ao login se deslogado) |
| `app.js` | alterado | Injeta o banner de sessão e publica o resultado concluído para o histórico, sem bloquear o scanner anônimo |
| `history.js` | adicionado | Salva, carrega, pagina e exclui as análises da conta conectada |
| `styles.css` | alterado | Estilos da autenticação no header, banner de sessão e área de histórico |
| `supabase/migrations/*_create_scan_history.sql` | adicionado | Cria a tabela, índice e políticas RLS do histórico |
| `supabase/migrations/*_restrict_scan_history_grants.sql` | adicionado | Restringe os privilégios aos comandos necessários |

### Funcionalidades Supabase Auth já integradas

- **Login e-mail/senha** (`signInWithPassword`)
- **Cadastro e-mail/senha** (`signUp`) — confirmação por e-mail se o projeto Supabase exigir
- **OAuth Google** (`signInWithOAuth({ provider: "google" })`) — requer configuração adicional
- **Logout** (`signOut`) — restaura o estado da UI
- **Recuperação de senha** (`resetPasswordForEmail` + `updateUser`) — envio do link e definição da nova senha
- **Sessão persistente** (`getSession` + `onAuthStateChange`) — sobrevive a refresh, com UI sincronizada

### O que precisa ser configurado no painel do Supabase

#### 1. URL de redirect (Authentication → URL Configuration)

Adicione as URLs do seu site em **Site URL** e **Redirect URLs**:

```
https://seu-dominio/
https://seu-dominio/auth.html
http://localhost:5500/auth.html      # se usar Live Server do VS Code
http://localhost:8000/auth.html      # se usar python -m http.server
```

Sem isso, OAuth e o e-mail de redefinição de senha **não voltam para a sua aplicação**.

#### 2. Google OAuth (Authentication → Providers → Google)

1. Crie um projeto no [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crie uma credencial **OAuth Client ID** do tipo "Web application"
3. Em **Authorized redirect URIs** adicione a URL mostrada pelo Supabase em *Google → Callback URL* (ex.: `https://<project-ref>.supabase.co/auth/v1/callback`)
4. Copie `Client ID` e `Client Secret` para o painel do Supabase (Authentication → Providers → Google) e salve
5. Habilite o toggle do provider

> ⚠️ Nunca cole o `Client Secret` no front-end. Ele fica **apenas** no painel do Supabase (server-side).

#### 3. E-mail de recuperação (Authentication → Email Templates)

O template `Reset Password` é o usado pelo `resetPasswordForEmail`. Você pode personalizar o texto do e-mail enviado aos usuários.

### Como testar

1. **Subir o servidor local**
   ```bash
   cd ScanGolpe
   python -m http.server 8000
   ```
2. Acessar [`http://localhost:8000/auth.html`](http://localhost:8000/auth.html)
3. Confirmar que o estado inicial mostra apenas Google, e-mail e o acesso ao cadastro
4. **Login e-mail/senha** — escolher e-mail, entrar e confirmar o redirecionamento ao scanner
5. **Cadastro** — abrir "Criar conta", validar confirmação de senha e concluir o `signUp`
6. **Google OAuth** — usar "Continuar com Google" (funciona depois de configurar o provider)
7. **Recuperação de senha** — solicitar o link, abri-lo e salvar uma nova senha no estado de redefinição
8. **Sessão persistente** — fazer login e atualizar a página; o card mostra a sessão ativa

### Onde a tela redireciona após login

- Por padrão, redireciona para `index.html#scanner`
- É possível customizar adicionando `?redirectTo=/caminho` (apenas paths internos são aceitos — proteção contra open-redirect)
  - Exemplo: `auth.html?redirectTo=%2Findex.html%23historico`

### Privacidade e segurança implementadas

- Nenhum client secret, service role key ou credencial OAuth é exposta no front
- O cliente Supabase usa a chave **publishable/anon** (chave pública, escopada por RLS no servidor)
- Senhas são gerenciadas **exclusivamente** pelo Supabase Auth
- Mensagens de erro genéricas do servidor são convertidas em texto amigável para o usuário
- Cada etapa substitui a anterior; os campos de login, cadastro e recuperação nunca aparecem juntos
- Recuperação de senha não revela se o e-mail está cadastrado (mesma mensagem para sucesso e e-mail inexistente)

### Utilitários SQL internos

- `private.tg_touch_updated_em()` mantém `atualizado_em` sincronizado na tabela `dominios_golpe`.
- `private.rls_auto_enable()` habilita RLS automaticamente em novas tabelas criadas no schema `public`.
- As duas funções usam `SECURITY INVOKER`, `search_path` vazio e referências qualificadas com `pg_catalog`.
- O schema `private` e as funções não concedem acesso a `anon`, `authenticated` ou `service_role`.
- A migration `20260813032648_harden_database_utility_functions.sql` preserva os gatilhos existentes enquanto remove a exposição pela Data API.

## 🕘 Histórico privado de análises

Ao concluir uma varredura com uma conta conectada, o resultado é salvo automaticamente em `historico_analises`. A seção **Histórico** da página principal mostra as análises mais recentes, permite carregar páginas anteriores e excluir um item. Visitantes continuam usando o scanner normalmente, mas nada é persistido.

O histórico guarda um snapshot do resultado: tipo e conteúdo analisados, domínio quando aplicável, risco, pontuação heurística, resumo, sinais explicáveis, status da verificação on-line e data. O conteúdo é limitado a 10.000 caracteres.

### Isolamento por conta

- `user_id` recebe `auth.uid()` automaticamente e referencia `auth.users` com exclusão em cascata.
- Row Level Security está habilitado para `SELECT`, `INSERT` e `DELETE` somente quando `(select auth.uid()) = user_id`.
- O papel `anon` não possui acesso à tabela nem à sequence.
- O papel `authenticated` não recebe `UPDATE` ou `TRUNCATE`.
- O índice `(user_id, id desc)` atende a listagem privada em ordem cronológica com paginação por cursor.

`relatos_golpe` continua sendo a base de denúncias públicas e não é reutilizada como histórico pessoal. A separação evita misturar moderação pública com dados privados da conta.

### Como testar o histórico

1. Entre em uma conta e abra `index.html#scanner`.
2. Cole uma mensagem, link, chave Pix ou anúncio suspeito e execute a varredura.
3. Abra `#historico` e confirme que o novo resultado apareceu no topo, sem atualizar a página.
4. Atualize a página e confirme que o registro continua visível.
5. Exclua o item pelo botão da lixeira e confirme que ele não reaparece.
6. Saia da conta: a lista privada deve desaparecer e o scanner deve continuar disponível sem persistência.

> Privacidade: ao usar uma conta conectada, o conteúdo enviado ao scanner é armazenado no projeto Supabase para compor o histórico. Evite inserir senhas, códigos de autenticação ou outros segredos.

---

## 📋 Próximos passos sugeridos (não implementados nesta entrega)

- Confirmação obrigatória de e-mail antes de permitir salvar histórico
- Política de retenção ou exclusão em massa do histórico
- Área administrativa separada para moderação de `relatos_golpe`

