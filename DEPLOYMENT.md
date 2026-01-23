# Guia de Deploy - Chat MWC

## Arquitetura
- **Frontend (React)**: Vercel
- **Backend (Express + WhatsApp)**: Render.com
- **Database**: Supabase

---

## 1. Deploy do Backend (Render.com)

A opção gratuita do Render é excelente, mas o servidor "dorme" após inatividade e demora uns 50 segundos para acordar no primeiro acesso.

### Passo 1: Criar Web Service
1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Clique em **New +** → **Web Service**
3. Selecione "Build and deploy from a Git repository"
4. Conecte sua conta do GitHub e selecione o repositório `ChatMWC`

### Passo 2: Configurações do Serviço
Preencha os campos da seguinte forma:

- **Name**: `chat-mwc-api` (ou o nome que preferir)
- **Region**: Selecione a mais próxima (ex: Ohio ou Frankfurt)
- **Branch**: `main`
- **Root Directory**: Deixe em branco (ou `.`)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Instance Type**: Free

### Passo 3: Variáveis de Ambiente
Role para baixo até encontrar a seção **Environment Variables** e adicione:

| Key | Value |
|-----|-------|
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://seu-app.vercel.app` (Coloque a URL do Vercel aqui) |
| `SUPABASE_URL` | `https://fkmyutasybvxagnxidoc.supabase.co` |
| `SUPABASE_ANON_KEY` | `sb_publishable_6b3zkp9eqfcVToB2_fmxow_zO1xUQfr` |

**Dica**: Por enquanto, em `CORS_ORIGIN`, se ainda não tiver a URL do Vercel, você pode colocar `*` para testar, mas depois atualize para a URL correta por segurança.

### Passo 4: Deploy
1. Clique em **Create Web Service**
2. O Render iniciará o deploy. Acompanhe os logs.
3. Quando finalizar, copie a URL gerada no topo esquerdo (ex: `https://chat-mwc-api.onrender.com`)

---


## 🔄 Modo Híbrido (Desenvolvimento)
**Frontend no Vercel -> Backend no seu PC (Localhost)**

Isso permite que você teste o site oficial (Vercel) usando o backend do seu computador (para debugar o WhatsApp, por exemplo).

1.  **Inicie o Backend Localmente:**
    ```bash
    npm start
    ```

3.  **Crie um Túnel (Ngrok):**
    *   Crie uma conta em: [dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup)
    *   Copie seu **Authtoken** do painel.
    *   No terminal, rode:
        ```bash
        ngrok config add-authtoken <SEU_TOKEN_AQUI>
        ```
    *   Agora sim, inicie o túnel:
        ```bash
        ngrok http 3000
        ```
    *   Copie o link gerado (ex: `https://xyz.ngrok-free.app`).

3.  **Configure no Vercel:**
    *   Vá em **Settings -> Environment Variables**.
    *   Mude `VITE_API_URL` para o link do Ngrok.
    *   Mude `VITE_SOCKET_URL` para o link do Ngrok.
    *   **Redeploy** (ou aguarde um novo deploy).

4.  **Configure o Backend Local:**
    No seu arquivo `.env` local, adicione/altere:
    ```env
    CORS_ORIGIN=https://seu-app.vercel.app
    ```
    (Substitua pelo link real do seu site no Vercel).

---

## 2. Deploy do Frontend (Vercel)

O projeto já está configurado com `vercel.json` na raiz para facilitar o deploy.

### Opção A: Importar Repositório (Recomendado)
1. No painel do Vercel, clique em **Add New...** -> **Project**.
2. Importe o repositório Git do `ChatMWC`.
3. **Framework Preset**: O Vercel deve detectar `Vite` automaticamente.
4. **Root Directory**: Mantenha como está (Raiz).
   - O arquivo `vercel.json` configurará automaticamente o comando de build (`cd client && npm install && npm run build`) e o diretório de saída (`client/dist`).
5. **Environment Variables**:
   Adicione as variáveis para conectar ao seu backend (Render/Railway ou Ngrok):
   - `VITE_API_URL`: ex `https://chat-mwc-api.onrender.com`
   - `VITE_SOCKET_URL`: ex `https://chat-mwc-api.onrender.com`

### Opção B: Deploy via CLI
Se preferir usar o `vercel-cli`:
```bash
vercel
```
Siga as instruções. As configurações do `vercel.json` serão respeitadas.

### Passo Adicional: Atualizar Backend
Após ter a URL do seu frontend no Vercel (ex: `https://chat-mwc.vercel.app`), lembre-se de voltar no seu Backend (Render/Railway) e atualizar a variável `CORS_ORIGIN` para permitir conexões deste domínio.

---

## 3. Conectar WhatsApp

### No Render:
1. Vá no painel do seu serviço
2. Clique em **Logs**
3. Quando o servidor iniciar, o QR Code do WhatsApp aparecerá nos logs (pode aparecer "quebrado" ou em formato de texto, tente copiar e colar em um visualizador de QR code se necessário, ou verifique se o terminal do Render exibe corretamente).

**Nota**: O WhatsApp Web JS pode ter dificuldades em ambientes sem interface gráfica como o Render Free. Se o QR Code não funcionar de primeira, pode ser necessário ajustar configurações de sessão, mas para teste inicial deve bastar.

---

## 4. Configurar Supabase (Se ainda não fez)

Execute os SQLs no Supabase SQL Editor se ainda não tiver feito:
1. `supabase-schema.sql`
2. `supabase-agents-migration.sql`
3. `supabase-password-migration.sql`
4. `supabase-assignments-migration.sql`

---

## Troubleshooting

### Tela Branca no Vercel
Verifique se as variáveis `VITE_API_URL` e `VITE_SOCKET_URL` no Vercel correspondem exatamente à URL do Render.

### Erro de CORS
Verifique se a variável `CORS_ORIGIN` no Render corresponde exatamente à URL do seu site no Vercel.

### Servidor Lento
No plano gratuito do Render, o primeiro acesso após 15 minutos de inatividade demora cerca de 50 segundos. Tenha paciência no primeiro load.

---

## Credenciais

### Super Admin
- **Email**: mwc.assessoria@gmail.com
- **Senha**: Mwc2015
