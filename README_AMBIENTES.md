# Como configurar ambientes (desenvolvimento e produção)

## Frontend (Angular)

- O Angular usa arquivos de ambiente para definir a URL da API:
  - `src/environments/environment.ts` (desenvolvimento):
    ```ts
    export const environment = {
      production: false,
      apiUrl: 'http://localhost:3001/pacientes'
    };
    ```
  - `src/environments/environment.prod.ts` (produção):
    ```ts
    export const environment = {
      production: true,
      apiUrl: 'https://protuario-eletronico-1.onrender.com/pacientes'
    };
    ```
- O código usa `environment.apiUrl` para todas as requisições.
- O build de produção (`ng build --configuration=production`) usa automaticamente o arquivo `.prod`.

## Design Profissional

O sistema possui layout moderno e profissional para ambiente  hospitalar:
- Gradientes e sombras suaves
- Cores institucionais (azul, verde, cinza)
- Ícones representativos (🏥, 📋)
- Transições e efeitos hover
- Tipografia clara e hierárquica
- Layout responsivo para diferentes dispositivos

## Backend (Node.js/Express)

- O backend usa variáveis de ambiente para banco e porta:
  - `.env` (local):
    ```env
    DATABASE_URL=postgres://postgres:postgres@db:5432/prontuario
    PORT=3001
    ```
  - No Render, defina a variável `DATABASE_URL` no painel de ambiente com a string do banco de produção:
    ```env
    DATABASE_URL=postgresql://mydb_l01f_user:9SMTVGi0Sb1QgSesdVxAmGZuCXnMEtKJ@dpg-d1jjelemcj7s739u1vjg-a/mydb_l01f
    ```
- O backend lê sempre de `process.env.DATABASE_URL` e `process.env.PORT`.

## Dicas
- Nunca suba `.env` para o repositório (já está no `.gitignore`).
- Use `.env.example` como modelo para novos desenvolvedores.
- Não é necessário alterar código ou links ao fazer merge entre branches: cada ambiente usa sua configuração automaticamente.

---

Dúvidas? Veja os arquivos de ambiente ou consulte este README!
