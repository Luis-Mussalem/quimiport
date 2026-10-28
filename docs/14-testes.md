# 14 · Testes

> Fase 2. Como o [Plano de Qualidade](08-plano-de-qualidade.md) da Fase 1 foi implementado: estratégia, organização e cobertura dos cenários obrigatórios.

## Como rodar

```bash
docker compose up -d db   # banco para os testes de integração com o Prisma
npm test                  # roda todos os testes uma vez
npm run test:watch        # modo observação, durante o desenvolvimento
```

Os testes de repositório Prisma usam a variável `TEST_DATABASE_URL`, que aponta para um **schema separado** (`test`) do mesmo banco: os dados de desenvolvimento nunca são apagados. As migrations são aplicadas nesse schema automaticamente antes dos testes. Sem a variável, apenas esses testes são pulados.

No **CI** (GitHub Actions) todos os testes rodam a cada push, com um PostgreSQL de verdade.

## Pirâmide de testes

| Camada | Pasta | O que cobre | Testes | Banco |
|---|---|---|---|---|
| **Unitário** | `tests/unit/domain` | Entidades, objeto de valor `Quantidade` e máquina de estados | 110 | Não |
| **Integração — casos de uso** | `tests/integration/application` | Casos de uso com repositórios em memória e logger falso | 22 | Não |
| **Integração — persistência** | `tests/integration/persistence` | Repositórios Prisma contra PostgreSQL real; repositório em memória | 10 | Sim |
| **Integração — API** | `tests/integration/http` | Requisições HTTP completas: rota → validação → caso de uso → erro → resposta | 27 | Não |
| | | **Total** | **169** | |

A base da pirâmide é o domínio: como ele não depende de banco nem de framework, a maioria dos testes é unitária e roda em milissegundos.

**Testes de API sem servidor:** o `app.inject()` do Fastify simula requisições HTTP reais sem abrir porta de rede, com a aplicação completa montada (rotas, validação, tratamento de erros e casos de uso).

**Máquina de estados testada por completo:** `StatusDaCarga.test.ts` verifica todas as 64 combinações de status — as **11 transições permitidas** passam e as **53 proibidas** são recusadas.

## Cenários obrigatórios

Cada cenário do enunciado é coberto em mais de uma camada:

- **D** = domínio (`tests/unit/domain`)
- **C** = caso de uso (`tests/integration/application`)
- **A** = API (`tests/integration/http`)
- **P** = persistência (`tests/integration/persistence`)

| # | Cenário | Testes |
|---|---|---|
| 1 | Cadastro de produto | **D** cria um produto ativo com dados válidos · **C** cadastra o produto, persiste e registra log · **A** cadastra um produto e responde 201 |
| 2 | Produto sem nome | **D** rejeita produto sem nome · **C** não persiste produto sem nome · **A** responde 400 para produto sem nome |
| 3 | Produto sem classe de risco | **D** rejeita produto sem classe de risco · **C** não persiste produto sem classe de risco · **A** responde 400 para produto sem classe de risco |
| 4 | Registro de carga | **D** registra a carga com status REGISTRADA e histórico inicial · **C** registra carga com produto ativo e loga o evento · **A** registra a carga e responde 201 · **P** salva a carga com documentos e histórico |
| 5 | Carga com produto inativo | **C** rejeita carga com produto inativo · **A** responde 422 para carga com produto inativo |
| 6 | Carga com quantidade ≤ 0 | **D** `Quantidade` e rejeita quantidade 0 / −10 · **C** rejeita carga com quantidade 0 / −5 · **A** responde 400 para quantidade 0 / −5 |
| 7 | Liberação sem documentação | **D** não libera carga sem a documentação obrigatória · **C** não libera carga sem documentação e libera depois de apresentada · **A** responde 422 ao liberar sem a documentação obrigatória |
| 8 | Atualização de status | **D** percorre o fluxo completo até FINALIZADA · **C** atualiza o status, persiste e loga a transição · **A** percorre o fluxo completo até FINALIZADA · **P** grava mudança de status e histórico |
| 9 | Transições permitidas | **D** permite *X → Y* (11 transições) · libera carga em inspeção com documentação completa · movimenta carga liberada |
| 10 | Transições proibidas | **D** proíbe *X → Y* (53 combinações) · rejeita transição proibida e mantém o status · **C** rejeita transição proibida sem alterar a carga salva · **A** responde 409 para transição proibida |
| 11 | Cancelamento | **D** cancela a partir de cada status permitido · não cancela em movimentação ou finalizada · não altera mais nada depois de cancelada · **C** cancela a carga registrando o motivo no histórico · **A** cancela a carga e depois não permite liberar |
| 12 | Movimentar carga bloqueada | **D** não movimenta carga bloqueada · **C** não movimenta carga bloqueada · **A** não movimenta carga bloqueada |

## Além dos obrigatórios

- **Regras da Fase 1:** carga sem responsável técnico (RN-12), sem produto (RN-01), produto inexistente, carga cancelada não liberada (RN-06), não finalizar sem liberar (RN-07).
- **Persistência:** código duplicado barrado pela restrição `UNIQUE`, chave estrangeira impede carga de produto inexistente, concorrência otimista rejeita versão desatualizada.
- **API:** 404 para recurso e rota inexistentes, 400 para id que não é UUID e para JSON malformado, 500 sem expor detalhes internos, health check e documentação OpenAPI disponíveis.

## Organização dos dados de teste

- **Repositórios em memória** (`src/infrastructure/persistence/in-memory`): implementam as mesmas interfaces do domínio que os repositórios Prisma; preferidos a *mocks* por serem estáveis.
- **Test Data Builders** (`tests/support/builders.ts`): `dadosDeProduto()`, `umProdutoAtivo()`, `umaCargaEm(status)` montam cenários legíveis com poucos dados.
- **Logger falso** (`loggerFalso()`): funções espiãs do Vitest (`vi.fn`) que permitem verificar quais eventos de negócio foram registrados no log.
- **App de teste** (`tests/support/app.ts`): monta a API completa com repositórios em memória.
