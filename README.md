---
title: SUNO Music DNA Hybridizer
emoji: 🎧
colorFrom: red
colorTo: yellow
sdk: static
app_file: index.html
pinned: false
---

# SUNO Music DNA Hybridizer

Aplicativo experimental que transforma playlists, links ou listas de musicas em um "DNA musical" e gera prompts estruturados para usar no modo Custom do Suno AI.

O projeto foi criado como uma demonstracao de integracao com IA generativa, engenharia de prompts musicais e experiencia de produto para criadores.

## Experimente Sem Clonar

Demo no GitHub Pages:

https://danielalvesrs.github.io/suno-music-dna/

O app nao inclui uma chave Gemini do autor. Para testar a demo, gere uma chave gratuita no Google AI Studio e cole no painel `Chave API` do app.

## Autor

Criado por Daniel Alves.

GitHub:

https://github.com/danielalvesrs

LinkedIn:

https://www.linkedin.com/in/daniel-da-silva-alves/

## Outros Projetos Publicados

[![Stroop App no Google Play](https://img.shields.io/badge/Google_Play-Stroop_App-414141?style=for-the-badge&logo=googleplay&logoColor=white)](https://play.google.com/store/apps/details?id=app.netlify.stroopapp.twa)

[![Personal Binaural no Google Play](https://img.shields.io/badge/Google_Play-Personal_Binaural-414141?style=for-the-badge&logo=googleplay&logoColor=white)](https://play.google.com/store/apps/details?id=app.netlify.personal_binaural.twa)

## Hugging Face

Demo no Hugging Face Spaces:

https://huggingface.co/spaces/11cs11/suno-music-dna

Observacao: o Hugging Face pode exigir creditos/PRO para executar Spaces nesta conta. A demo principal esta publicada no GitHub Pages.

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

1. Acesse <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>.
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

## Como Colaborar

Contribuicoes sao bem-vindas via pull request.

Fluxo recomendado:

```bash
gh repo fork danielalvesrs/suno-music-dna --clone
cd suno-music-dna
npm install
git checkout -b minha-melhoria
```

Tambem e possivel clicar em `Fork` no GitHub e clonar o seu fork manualmente.

Antes de abrir o PR:

```bash
npm run lint
npm run build
```

Boas areas para contribuir:

- Melhorar extracao de playlists e tratamento de links.
- Refinar prompts musicais para Suno.
- Adicionar exportacao para outros geradores musicais.
- Melhorar responsividade e acessibilidade.
- Criar suporte a deploy via Hugging Face Spaces.
- Adicionar testes e validacao de dados da API.
