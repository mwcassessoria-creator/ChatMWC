# 🚀 Guia de Conexão do WhatsApp

## Passo a Passo para Conectar o WhatsApp ao Chatbot

### 1️⃣ Iniciar o Servidor Backend

Abra um terminal no diretório do projeto e execute:

```bash
npm start
```

Ou se preferir usar Node diretamente:

```bash
node server.js
```

### 2️⃣ Aguardar o QR Code

Após iniciar o servidor, você verá uma mensagem no terminal:

```
📲 Escaneie o QR Code abaixo:
```

Um QR Code será exibido no terminal (em formato ASCII).

### 3️⃣ Escanear o QR Code

1. Abra o **WhatsApp** no seu celular
2. Vá em **Configurações** → **Aparelhos conectados**
3. Toque em **Conectar um aparelho**
4. Escaneie o QR Code que apareceu no terminal

### 4️⃣ Confirmação de Conexão

Quando a conexão for bem-sucedida, você verá:

```
✅ Tudo certo! WhatsApp conectado.
```

### 5️⃣ Iniciar o Frontend (Opcional)

Se quiser usar a interface web do chatbot, abra outro terminal e execute:

```bash
cd client
npm run dev
```

A interface estará disponível em: `http://localhost:5173`

---

## 🔧 Solução de Problemas

### Problema: QR Code não aparece

**Solução:** Verifique se:
- As dependências estão instaladas: `npm install`
- O Chrome/Chromium está instalado pelo Puppeteer: `npx puppeteer browsers install chrome`

### Problema: "Could not find Chrome"

**Solução:** Execute:
```bash
npx puppeteer browsers install chrome
```

### Problema: Conexão perdida

**Solução:** 
- Reinicie o servidor (`Ctrl+C` e depois `npm start` novamente)
- Um novo QR Code será gerado automaticamente

### Problema: Porta 3000 já em uso

**Solução:**
- Encontre o processo: `netstat -ano | findstr :3000`
- Mate o processo: `taskkill /PID <número_do_pid> /F`
- Ou altere a porta no arquivo `.env`

---

## 📱 Como Funciona

Uma vez conectado, o chatbot irá:

1. **Receber mensagens** automaticamente de todos os contatos
2. **Exibir menu** quando receber mensagens como "oi", "menu", "olá"
3. **Rotear para departamentos** quando o usuário escolher uma opção (1-5):
   - 1. Fiscal
   - 2. Contábil
   - 3. DP
   - 4. Societário
   - 5. Financeiro
4. **Atribuir a agentes** disponíveis ou colocar em fila

---

## 🔐 Credenciais de Acesso

### Super Admin
- **Email:** mwc.assessoria@gmail.com
- **Senha:** Mwc2015

### Agentes
Os agentes devem ser cadastrados através da interface web pelo Super Admin.

---

## 📊 Monitoramento

Para verificar o status da conexão, acesse a interface web e observe:
- 🟢 **Verde (Connected):** WhatsApp conectado e funcionando
- 🟡 **Amarelo (QR Needed):** Aguardando escaneamento do QR Code
- 🔴 **Vermelho (Disconnected):** Desconectado

---

## 💡 Dicas

- **Mantenha o servidor rodando:** O servidor precisa estar ativo para o bot funcionar
- **Sessão persistente:** Após a primeira conexão, o WhatsApp ficará conectado mesmo após reiniciar o servidor (graças ao LocalAuth)
- **Múltiplos dispositivos:** Você pode ter o WhatsApp conectado no celular e no chatbot simultaneamente
