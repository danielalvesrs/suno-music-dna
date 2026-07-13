# SUNO Music DNA Hybridizer

Aplicativo experimental que transforma playlists, links ou listas de musicas em um "DNA musical" e gera prompts estruturados para usar no modo Custom do Suno AI.

O projeto foi criado como uma demonstracao de integracao com IA generativa, engenharia de prompts musicais e experiencia de produto para criadores.

## O Que Ele Faz

- Extrai ate 10 faixas de links ou listas em texto.
- Analisa BPM, tom, progressao, energia, clima e narrativa das musicas.
- Combina as faixas em um DNA musical hibrido.
- Gera prompt de estilo e letras/metatags prontas para o Suno AI.
- Permite modo vocal ou instrumental.
- Inclui modo Mashup, selecao de instrumentos, historico e biblioteca local.

## Stack

- React 19
- Vite
- TypeScript
- Express
- Gemini API
- Tailwind CSS
- Motion

## Como Rodar Localmente

Instale as dependencias:

```bash
npm install
```

Crie um arquivo `.env.local` com sua chave Gemini:

```bash
GEMINI_API_KEY=sua_chave_aqui
```

Rode o app:

```bash
npm run dev
```

Abra:

```text
http://localhost:3000
```

No Windows PowerShell, se `npm` estiver bloqueado pela policy local, use `npm.cmd`:

```powershell
npm.cmd run dev
```

## Usando Sua Propria Chave Gemini

Este projeto nao inclui uma chave de API propria. Para usar a analise com Gemini:

1. Acesse https://aistudio.google.com/app/apikey
2. Faca login com sua conta Google.
3. Clique em `Create API Key`.
4. Copie a chave gerada.
5. Cole no painel `Chave API` dentro do app.

A chave inserida pelo usuario e salva localmente no navegador via `localStorage`. Evite usar em computadores compartilhados e remova a chave pelo painel quando desejar.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Observacao

O app nao processa audio diretamente. Ele usa metadados e conhecimento do modelo para inferir caracteristicas musicais e gerar prompts criativos para o Suno.
