# Contribuindo

Obrigado pelo interesse em colaborar com o SUNO Music DNA Hybridizer.

## Fluxo De Trabalho

1. Faca um fork do repositorio.
2. Crie uma branch descritiva.
3. Faca alteracoes pequenas e focadas.
4. Rode as validacoes locais.
5. Abra um pull request explicando o que mudou.

```bash
npm install
npm run lint
npm run build
```

## Padroes

- Nao envie chaves de API, `.env.local` ou arquivos com segredos.
- Mantenha `node_modules` e `dist` fora do commit.
- Prefira alteracoes pequenas, com descricao clara no PR.
- Quando mexer em prompts, explique o comportamento esperado e mostre exemplos.
- Quando mexer na interface, preserve a experiencia mobile.

## Ideias De Contribuicao

- Melhorar a confiabilidade da extracao de faixas.
- Adicionar validacao de schemas nas respostas do Gemini.
- Melhorar mensagens de erro para chaves invalidas ou cota excedida.
- Criar um `Dockerfile` para Hugging Face Spaces.
- Adicionar testes automatizados.
- Documentar exemplos de playlists e resultados.
