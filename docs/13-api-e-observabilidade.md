# 13 · API, Erros e Logs

> Fase 2. Visão geral da API REST, do padrão de erros e dos logs. O detalhe de cada endpoint (parâmetros, exemplos de requisição e resposta) está no **Swagger**, em `http://localhost:3333/docs`.

## Endpoints

### Produtos químicos

| Método | Rota | Descrição | Sucesso | Erros |
|---|---|---|---|---|
| `POST` | `/produtos-quimicos` | Cadastra um produto (status inicial `ATIVO`) | 201 | 400 |
| `GET` | `/produtos-quimicos` | Lista produtos. Filtro opcional: `?status=ATIVO\|INATIVO` | 200 | 400 |
| `GET` | `/produtos-quimicos/:id` | Busca um produto | 200 | 400, 404 |
| `PUT` | `/produtos-quimicos/:id` | Atualiza os dados de um produto | 200 | 400, 404 |
| `PATCH` | `/produtos-quimicos/:id/inativar` | Inativa o produto (exclusão lógica) | 200 | 400, 404 |

### Cargas químicas

| Método | Rota | Descrição | Sucesso | Erros |
|---|---|---|---|---|
| `POST` | `/cargas-quimicas` | Registra uma carga (status inicial `REGISTRADA`) | 201 | 400, 409, 422 |
| `GET` | `/cargas-quimicas` | Lista cargas. Filtros opcionais: `?status=` e `?produtoId=` | 200 | 400 |
| `GET` | `/cargas-quimicas/:id` | Busca uma carga, com documentação e histórico | 200 | 400, 404 |
| `PATCH` | `/cargas-quimicas/:id/status` | Altera o status (ver [fluxo de status](12-fluxo-de-status.md)) | 200 | 400, 404, 409, 422 |
| `PATCH` | `/cargas-quimicas/:id/liberar` | Libera a carga | 200 | 400, 404, 409, 422 |
| `PATCH` | `/cargas-quimicas/:id/bloquear` | Bloqueia a carga (motivo obrigatório) | 200 | 400, 404, 409 |
| `PATCH` | `/cargas-quimicas/:id/cancelar` | Cancela a carga (motivo obrigatório) | 200 | 400, 404, 409 |
| `PATCH` | `/cargas-quimicas/:id/documentos` | Registra a apresentação de um documento obrigatório | 200 | 400, 404, 422 |

### Infraestrutura

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Verifica a API e a conexão com o banco (200 `ok` ou 503 `indisponivel`) |
| `GET` | `/docs` | Interface do Swagger |
| `GET` | `/docs/json` | Documento OpenAPI 3.0 |

## Padrão de erros

Todas as respostas de erro têm o mesmo formato:

```json
{
  "erro": "VALIDACAO",
  "mensagem": "Dados de entrada inválidos",
  "detalhes": [{ "campo": "quantidade", "mensagem": "A quantidade deve ser maior que zero" }]
}
```

`detalhes` só aparece em erros de validação e indica **qual campo** falhou.

| HTTP | `erro` | Quando |
|---|---|---|
| 400 | `VALIDACAO` | Campo ausente ou em formato inválido; motivo ausente em bloqueio/cancelamento |
| 400 | `REQUISICAO_INVALIDA` | Requisição malformada (ex.: JSON inválido) |
| 404 | `NAO_ENCONTRADO` | Produto ou carga inexistente |
| 404 | `ROTA_NAO_ENCONTRADA` | Rota inexistente |
| 409 | `CONFLITO` | Código de carga duplicado; carga alterada por outra operação ao mesmo tempo |
| 409 | `TRANSICAO_DE_STATUS_INVALIDA` | Transição fora do fluxo permitido ou carga em status final |
| 422 | `REGRA_DE_NEGOCIO` | Produto inativo ou inexistente na carga; liberação sem documentação; documentação congelada |
| 500 | `ERRO_INTERNO` | Erro inesperado. Os detalhes vão **apenas para o log**, nunca para a resposta |

### Onde cada erro nasce

1. **Formato** (tipos, obrigatórios, enums, UUID): schemas **Zod** nos controllers → 400.
2. **Regras de negócio**: **domínio** e **casos de uso**, que devolvem `Result` com um erro tipado.
3. **Tradução para HTTP**: um único *error handler* (`src/interfaces/http/erros.ts`) converte cada tipo de erro no código HTTP da tabela acima.

## Logs

Os logs são gerados com o **Pino** em **JSON, um objeto por linha**, prontos para ferramentas de observabilidade. Em desenvolvimento (`npm run dev`) saem coloridos e legíveis. Cada linha traz nível, horário ISO, `servico` e, nos eventos de negócio, o campo `evento`:

```json
{"level":30,"time":"2026-10-28T17:37:18.120Z","servico":"quimiport-api","evento":"produto.criado","produtoId":"49171c25-e145-4570-96ab-beb80e0d77c4","nome":"Tolueno","classeDeRisco":"3","msg":"produto.criado"}
```

### Rastreamento de requisições

Cada requisição recebe um id (`reqId`), devolvido também no cabeçalho de resposta **`x-request-id`**. Todos os logs daquela requisição carregam o mesmo id, o que permite seguir uma requisição do início ao fim.

### Eventos registrados

| O que o enunciado pede | Evento | Nível |
|---|---|---|
| Requisições | `incoming request` / `request completed` (método, rota, status, tempo de resposta) | info |
| Erros de validação | `requisicao.validacao_falhou` (com os campos) | warn |
| Requisições rejeitadas por regra | `requisicao.rejeitada` (código e status HTTP) | warn |
| Erros internos | `erro_interno` (com o *stack trace*) | error |
| Criação de produto | `produto.criado` · também `produto.atualizado` e `produto.inativado` | info |
| Registro de carga | `carga.registrada` · `carga.registro_rejeitado` (produto inativo) | info / warn |
| Mudanças de status | `carga.status_alterado` (de → para) · `carga.transicao_rejeitada` | info / warn |
| Bloqueios e liberações | `carga.bloqueada` · `carga.liberada` · `carga.cancelada` (com motivo) | info |
| Documentação | `carga.documento_atualizado` | info |

Cabeçalhos sensíveis (`authorization`, `cookie`) são omitidos automaticamente dos logs.

### Consultando os logs

Todos os logs da API em execução no Docker:

```bash
docker compose logs -f api
```

Só os eventos de carga:

```bash
docker compose logs api --no-log-prefix | grep '"evento":"carga.'
```

Só avisos e erros (nível ≥ 40):

```bash
docker compose logs api --no-log-prefix | grep -E '"level":(40|50)'
```
