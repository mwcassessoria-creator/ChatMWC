# Procedimento de Reinicialização do Sistema

Siga estes passos para colocar o sistema de volta ao ar após desligar o computador.

## 1. Abrir o Terminal
Abra o **PowerShell** ou **Prompt de Comando (CMD)** e navegue até a pasta do projeto:
```powershell
cd "c:\MMQC\MLEITOR\RTF\Anderson\Chat bot"
```

## 2. Iniciar o Servidor (Backend)
No terminal aberto, execute o seguinte comando para iniciar o "cérebro" do sistema:
```powershell
npm start
```
*Aguarde aparecer a mensagem "Server running on port 3000" ou similar.*
*Se for necessário escanear o QR Code do WhatsApp novamente, ele aparecerá aqui.*

## 3. Iniciar a Interface (Frontend)
Abra uma **nova aba** ou **nova janela** do terminal.
Navegue para a pasta `client`:
```powershell
cd "c:\MMQC\MLEITOR\RTF\Anderson\Chat bot\client"
```
Execute o comando para iniciar a tela de chat:
```powershell
npm run dev
```
*O sistema estará acessível geralmente em `http://localhost:5173`.*

## 4. (Opcional) Iniciar o Ngrok
Se você precisa que o sistema seja acessível externamente (fora da rede local), você precisa rodar o Ngrok.
Abra mais uma **nova aba** no terminal na pasta raiz (`...\Chat bot`) e execute:
```powershell
.\start-ngrok.bat
```

---
**Resumo:**
1. Aba 1: `npm start` (Raiz)
2. Aba 2: `npm run dev` (Pasta client)
