# QuimiPort — Gestão de Cargas Químicas Portuárias

[![CI](https://github.com/Luis-Mussalem/quimiport/actions/workflows/ci.yml/badge.svg)](https://github.com/Luis-Mussalem/quimiport/actions/workflows/ci.yml)

> Tech Challenge · Fase 2 · Pós-Tech Full Stack Development (FIAP)

API REST para cadastro de produtos químicos e controle do ciclo de vida de cargas químicas no porto, garantindo que nenhuma carga seja movimentada sem cumprir as regras de risco, documentação e responsabilidade técnica.

## Integrantes

Projeto individual.

- Luis Otavio Mussalem Santos — RM 375787
- GitHub: [Luis-Mussalem](https://github.com/Luis-Mussalem)

## Contexto

O Porto de Santos movimenta grande volume de **produtos químicos**, que exigem controle rigoroso de classificação de risco, documentação obrigatória e acompanhamento técnico. Hoje, esse controle é feito de forma **manual e descentralizada**, o que dificulta consultar informações, acompanhar o status das cargas e — o mais crítico — **validar as regras de segurança antes de liberar uma carga para movimentação**.

O **QuimiPort** centraliza esse ciclo. Na **Fase 1** foram feitos a modelagem do domínio, as regras de negócio e a arquitetura. Nesta **Fase 2**, o projeto virou um backend funcional:

- API REST de produtos e cargas, com a máquina de status da carga;
- persistência em PostgreSQL;
- documentação Swagger;
- logs estruturados;
- testes automatizados;
- Docker;
- pipeline de CI.

## Tecnologias

| Área | Tecnologia |
|---|---|
| Linguagem e runtime | TypeScript 5.9 · Node.js 24 |
| HTTP | Fastify 5 |
| Validação | Zod 4 |
| Banco de dados | PostgreSQL 17 |
| Acesso ao banco | Prisma 6 (ORM e migrations) |
| Documentação da API | OpenAPI 3 com Swagger UI |
| Logs | Pino (JSON estruturado) |
| Testes | Vitest |
| Contêineres | Docker e Docker Compose |
| CI | GitHub Actions |

## Arquitetura

Clean Architecture (Ports & Adapters), com a regra de dependência apontando sempre para o domínio:

```
src/
├── domain/            # Entidades, objetos de valor, máquina de status e interfaces de repositório
├── application/       # Casos de uso, DTOs e portas (Logger)
├── infrastructure/    # Prisma, repositórios em memória, logger (Pino) e configuração
├── interfaces/http/   # Fastify: controllers, schemas Zod, tratamento de erros e Swagger
└── main.ts            # Composition root: conecta as peças concretas
```

O domínio não conhece Fastify, Prisma nem banco de dados. Por isso as regras de negócio são testadas sem infraestrutura, e qualquer peça externa pode ser trocada sem tocar nelas.

## Como executar

### Com Docker (recomendado)

Pré-requisito: Docker com Docker Compose.

Suba banco e API:

```bash
docker compose up -d --build
```

Acompanhe os logs da API:

```bash
docker compose logs -f api
```

Para parar tudo (os dados permanecem no volume):

```bash
docker compose down
```

A API sobe em **http://localhost:3333** depois que o banco está saudável e aplica as migrations automaticamente. Confira com:

```bash
curl http://localhost:3333/health
```

### Localmente (desenvolvimento)

Pré-requisitos: Node.js 24 (há um `.nvmrc`; com nvm, rode `nvm use`) e Docker para o banco.

```bash
cp .env.example .env       # variáveis de ambiente
npm install                # dependências (gera também o client do Prisma)
docker compose up -d db    # sobe só o PostgreSQL
npm run db:deploy          # aplica as migrations
npm run dev                # API com recarga automática em http://localhost:3333
```

> Em desenvolvimento, suba **só o serviço `db`**: a API do compose também usa a porta 3333.

### Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | API em modo desenvolvimento, com recarga automática e logs legíveis |
| `npm run build` / `npm start` | Compila para `dist/` e executa a versão compilada |
| `npm run typecheck` | Verificação de tipos |
| `npm test` / `npm run test:watch` | Testes (uma vez / modo observação) |
| `npm run db:deploy` | Aplica as migrations pendentes |
| `npm run db:migrate` | Cria uma nova migration a partir do `schema.prisma` |
| `npm run db:studio` | Interface visual do banco (Prisma Studio) |

## Variáveis de ambiente

Modelo completo em [`.env.example`](.env.example). As variáveis da API são validadas na inicialização: com valor inválido, a aplicação não sobe e informa qual variável está errada.

| Variável | Padrão | Descrição |
|---|---|---|
| `DATABASE_URL` | — | Conexão da API com o PostgreSQL (**obrigatória**) |
| `TEST_DATABASE_URL` | — | Banco dos testes de integração com o Prisma (schema `test`) |
| `NODE_ENV` | `development` | `development`, `test` ou `production` |
| `HOST` / `PORT` | `0.0.0.0` / `3333` | Endereço e porta da API |
| `LOG_LEVEL` | `info` | Nível mínimo de log (`debug`, `info`, `warn`, `error`...) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `quimiport` | Credenciais do banco criado pelo Docker Compose |
| `POSTGRES_PORT` | `5433` | Porta do PostgreSQL no host |
| `API_PORT` | `3333` | Porta da API no host, quando executada pelo Docker Compose |

## Documentação da API

Com a API rodando:

- **Swagger UI:** http://localhost:3333/docs — endpoints, parâmetros, exemplos de requisição e resposta e códigos de erro, com testes direto pelo navegador ("Try it out").
- **OpenAPI (JSON):** http://localhost:3333/docs/json

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/produtos-quimicos` | Cadastra um produto químico |
| `GET` | `/produtos-quimicos` | Lista produtos (filtro `?status=`) |
| `GET` | `/produtos-quimicos/:id` | Busca um produto |
| `PUT` | `/produtos-quimicos/:id` | Atualiza um produto |
| `PATCH` | `/produtos-quimicos/:id/inativar` | Inativa um produto (exclusão lógica) |
| `POST` | `/cargas-quimicas` | Registra uma carga química |
| `GET` | `/cargas-quimicas` | Lista cargas (filtros `?status=` e `?produtoId=`) |
| `GET` | `/cargas-quimicas/:id` | Busca uma carga, com documentação e histórico |
| `PATCH` | `/cargas-quimicas/:id/status` | Altera o status da carga |
| `PATCH` | `/cargas-quimicas/:id/liberar` | Libera a carga (exige documentação completa) |
| `PATCH` | `/cargas-quimicas/:id/bloquear` | Bloqueia a carga (exige motivo) |
| `PATCH` | `/cargas-quimicas/:id/cancelar` | Cancela a carga (exige motivo) |
| `PATCH` | `/cargas-quimicas/:id/documentos` | Registra a apresentação de um documento obrigatório |
| `GET` | `/health` | Saúde da API e do banco |

Fluxo de status da carga:

```
REGISTRADA → EM_ANALISE → EM_INSPECAO → LIBERADA → EM_MOVIMENTACAO → FINALIZADA
                                      ↘ BLOQUEADA
(CANCELADA a partir de qualquer status anterior a EM_MOVIMENTACAO)
```

Códigos de erro, formato das respostas e eventos de log em [API, Erros e Logs](docs/13-api-e-observabilidade.md); regras de cada transição em [Fluxo de Status](docs/12-fluxo-de-status.md).

## Banco de dados

**PostgreSQL**, porque os dados são relacionais (toda carga referencia um produto; documentos e histórico pertencem à carga). Ele também garante:

- integridade por chaves estrangeiras;
- transações ACID para gravar a carga, os documentos e o histórico juntos;
- `ENUM` nativo para os status;
- `DECIMAL` exato para as quantidades.

São quatro tabelas: `produto_quimico`, `carga_quimica`, `documento_carga` e `historico_status_carga`. Nenhum registro é apagado: produtos são **inativados** e cargas são **canceladas**. Toda mudança de status fica registrada no histórico, com o motivo.

Diagrama ER, colunas, chaves, índices, concorrência otimista e evolução futura em [Banco de Dados e Modelagem](docs/11-banco-de-dados.md).

## Testes

Para rodar todos os testes, suba o banco usado nos testes de persistência e execute:

```bash
docker compose up -d db
npm test
```

**169 testes** em quatro níveis:

- **unitários**, do domínio;
- **integração**, dos casos de uso;
- **integração**, dos repositórios contra PostgreSQL real;
- **integração**, da API HTTP.

Os **12 cenários obrigatórios** do enunciado estão mapeados para os testes correspondentes em [Testes](docs/14-testes.md).

## Integração contínua

A cada push ou pull request na `main`, o [GitHub Actions](.github/workflows/ci.yml) executa:

1. **Testes:** instala as dependências, audita vulnerabilidades, verifica tipos, compila e roda todos os testes contra um PostgreSQL real.
2. **Docker:** valida o `docker-compose.yml` e constrói a imagem da API.

## Decisões arquiteturais

Registradas em formato ADR (Contexto → Decisão → Consequências) em [Decisões Arquiteturais](docs/10-decisoes-arquiteturais.md). As principais da Fase 2:

- **Fastify** em vez de Express ou NestJS: logs e Swagger nativos, sem impor arquitetura própria.
- **Zod** como único validador: o mesmo schema valida a entrada e gera a documentação.
- **Erros de negócio como valores (`Result`)**, traduzidos para HTTP num único ponto (400, 404, 409, 422, 500).
- **Uma única porta de entrada para mudanças de status** (`CargaQuimica.alterarStatus`), usada por todos os endpoints de status.
- **Concorrência otimista** (`versao`) e gravação do agregado Carga em uma transação.

## Documentação completa

| # | Documento | Fase |
|---|---|---|
| 01 | [Domínio e Linguagem Ubíqua](docs/01-dominio.md) | 1 |
| 02 | [Modelagem DDD](docs/02-modelagem-ddd.md) | 1 |
| 03 | [Casos de Uso](docs/03-casos-de-uso.md) | 1 |
| 04 | [Regras de Negócio](docs/04-regras-de-negocio.md) | 1 |
| 05 | [Arquitetura](docs/05-arquitetura.md) | 1 |
| 06 | [Organização do Projeto](docs/06-organizacao-do-projeto.md) | 1 |
| 07 | [Diagramas](docs/07-diagramas.md) | 1 |
| 08 | [Plano de Qualidade](docs/08-plano-de-qualidade.md) | 1 |
| 09 | [TypeScript e JS Avançado](docs/09-typescript-e-js-avancado.md) | 1 |
| 10 | [Decisões Arquiteturais (ADRs)](docs/10-decisoes-arquiteturais.md) | 1 e 2 |
| 11 | [Banco de Dados e Modelagem](docs/11-banco-de-dados.md) | 2 |
| 12 | [Fluxo de Status da Carga](docs/12-fluxo-de-status.md) | 2 |
| 13 | [API, Erros e Logs](docs/13-api-e-observabilidade.md) | 2 |
| 14 | [Testes](docs/14-testes.md) | 2 |

Diagramas em imagem: [`docs/diagramas/`](docs/diagramas) · Apresentação da Fase 1: [`apresentacao/`](apresentacao)

## Roadmap

- **Fase 1:** ✅ modelagem de domínio, regras de negócio, arquitetura e plano de qualidade.
- **Fase 2:** ✅ API REST, persistência em PostgreSQL, Docker, testes automatizados, logs e CI.
- **Próximas fases:** frontend web, autenticação, cadastro de responsáveis técnicos e inspeções, mobile e possível divisão em microsserviços.
