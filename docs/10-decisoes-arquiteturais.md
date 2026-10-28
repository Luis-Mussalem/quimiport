# 10 · Decisões Arquiteturais (ADRs)

> Registro das principais decisões no formato ADR: **Contexto → Decisão → Consequências**. ADRs deixam explícito *por que* cada escolha foi feita. Os ADRs 001 a 006 são da Fase 1 (modelagem); os ADRs 007 em diante registram as decisões da Fase 2 (implementação).

---

## Fase 1 · Modelagem

### ADR-001 · Usar TypeScript
- **Contexto:** o domínio tem muitas regras e estados; erros de tipo em runtime seriam caros.
- **Decisão:** adotar TypeScript com tipagem forte em todo o código.
- **Consequências:** erros pegos em tempo de compilação, melhor autocompletar e refatoração segura; custo de build/configuração aceitável.

### ADR-002 · Separar domínio, aplicação e infraestrutura
- **Contexto:** o projeto evoluirá para backend, frontend e possivelmente microsserviços.
- **Decisão:** arquitetura em camadas (Clean Architecture) com a regra de dependência apontando para o domínio.
- **Consequências:** núcleo testável sem banco/framework; troca de tecnologia sem tocar no negócio; um pouco mais de estrutura inicial (mais pastas/interfaces).

### ADR-003 · Carga Química como agregado raiz; referência entre agregados por ID
- **Contexto:** as regras de segurança precisam de consistência sobre o estado completo da carga; produto e responsável têm ciclo de vida próprio.
- **Decisão:** Carga é a raiz do agregado principal e referencia Produto e Responsável **por ID**.
- **Consequências:** invariantes da carga protegidas num único ponto; fronteiras claras; regras cross-agregado empurradas para os casos de uso.

### ADR-004 · Invariantes no domínio, regras cross-agregado nos casos de uso
- **Contexto:** regras espalhadas geram duplicação e bugs.
- **Decisão:** regras de um único agregado/valor ficam no domínio; regras que atravessam agregados ficam nos casos de uso.
- **Consequências:** impossível criar objetos inválidos; agregados desacoplados; casos de uso com responsabilidade clara de orquestração.

### ADR-005 · Tratamento de erros de negócio com `Result<T>`
- **Contexto:** falhas de negócio (documentação faltando) não são excepcionais — são esperadas.
- **Decisão:** usar `Result<T>` para falhas de negócio e `Error` apenas para falhas técnicas.
- **Consequências:** fluxos de erro explícitos e tipados; menos `try/catch` espalhado; chamadas precisam tratar o `Result`.

### ADR-006 · Repositórios como interfaces no domínio (Inversão de Dependência)
- **Contexto:** o domínio não pode depender de banco.
- **Decisão:** o domínio declara interfaces de repositório; a infraestrutura as implementa (memória agora, banco depois).
- **Consequências:** domínio isolado e testável com fakes; troca de persistência sem impacto no núcleo.

---

## Fase 2 · Implementação

### ADR-007 · Fastify como framework HTTP
- **Contexto:** a API precisa de validação, documentação (Swagger) e logs estruturados, sem que o framework imponha sua própria arquitetura sobre a definida na Fase 1.
- **Decisão:** usar Fastify. O Express exigiria montar logs e documentação manualmente; o NestJS traz módulos, decorators e injeção de dependência próprios, que competiriam com as camadas já definidas.
- **Consequências:** logs nativos com Pino, plugins oficiais de Swagger e testes HTTP sem abrir porta (`app.inject`); o framework fica restrito à camada `interfaces/http`.

### ADR-008 · Zod como único validador de entrada
- **Contexto:** dados vindos de fora (corpo, parâmetros, variáveis de ambiente) precisam ser validados em tempo de execução; o TypeScript só verifica tipos na compilação.
- **Decisão:** validar com Zod nos controllers e gerar o JSON Schema do Swagger a partir dos mesmos schemas. A validação própria do Fastify é desligada para não haver duas fontes de verdade.
- **Consequências:** documentação e validação nunca divergem; mensagens de erro em português e por campo. O Zod confere apenas o **formato**; as **regras de negócio** continuam no domínio (ADR-004).

### ADR-009 · PostgreSQL com Prisma 6
- **Contexto:** dados relacionais (carga → produto) e necessidade de transações e migrations versionadas ([modelagem](11-banco-de-dados.md)).
- **Decisão:** PostgreSQL 17 com Prisma 6, isolado nos repositórios da infraestrutura. Mantida a versão 6 (estável) em vez da 7, que mudava a configuração do projeto. Uma vulnerabilidade em dependência indireta (`deepmerge-ts`) foi corrigida com `overrides` no `package.json`.
- **Consequências:** schema tipado e migrations automáticas; atualização de versão maior do Prisma fica como evolução planejada.

### ADR-010 · Agregado Carga gravado em transação com concorrência otimista
- **Contexto:** a carga ocupa três tabelas (carga, documentos, histórico), e dois operadores podem alterar a mesma carga ao mesmo tempo.
- **Decisão:** gravar o agregado inteiro em uma transação e usar uma coluna `versao`: a atualização só é aplicada se a versão não mudou desde a leitura.
- **Consequências:** o agregado nunca fica pela metade no banco e alterações simultâneas não se sobrescrevem; quem perde a disputa recebe 409 e tenta novamente.

### ADR-011 · Histórico de status e documentos como partes do agregado
- **Contexto:** é preciso saber por que e quando uma carga mudou de status, e quais documentos obrigatórios estão pendentes.
- **Decisão:** cada transição gera um registro de histórico (anterior, novo, motivo, data); a documentação é uma lista fixa dos 3 documentos obrigatórios, cada um marcado como apresentado ou não, em vez de um único booleano.
- **Consequências:** auditoria completa da vida da carga; a API informa exatamente quais documentos faltam.

### ADR-012 · Nova máquina de estados da carga
- **Contexto:** o enunciado da Fase 2 definiu status oficiais (incluindo `EM_ANALISE`, `EM_MOVIMENTACAO` e `FINALIZADA`), diferentes da proposta da Fase 1.
- **Decisão:** reescrever o fluxo como uma tabela de transições permitidas, aplicada por um único método (`alterarStatus`) usado por todos os endpoints de status. Bloqueio e cancelamento exigem motivo; carga bloqueada só pode ser cancelada.
- **Consequências:** regra em um só lugar e fácil de testar; detalhes e diferenças em relação à Fase 1 em [Fluxo de Status](12-fluxo-de-status.md).

### ADR-013 · Escopo simplificado: responsável técnico como texto e sem entidade Inspeção
- **Contexto:** a Fase 1 previa Responsável Técnico como agregado e Inspeção como entidade; a Fase 2 não exige cadastro de responsáveis nem registro de inspeções.
- **Decisão:** guardar o responsável técnico como texto obrigatório na carga e representar a inspeção apenas pelo status `EM_INSPECAO`.
- **Consequências:** menos tabelas e endpoints para o escopo atual, mantendo a regra "toda carga possui responsável técnico" (RN-12). Ambos ficam como evolução futura.

### ADR-014 · Tradução de erros na borda HTTP
- **Contexto:** domínio e casos de uso devolvem `Result` (ADR-005); a API precisa responder com códigos HTTP coerentes e sem expor detalhes internos.
- **Decisão:** na camada HTTP, a falha do `Result` vira exceção e um único *error handler* traduz cada tipo de erro: validação → 400, não encontrado → 404, conflito e transição inválida → 409, regra de negócio → 422, inesperado → 500 sem detalhes.
- **Consequências:** formato de erro único em toda a API ([catálogo](13-api-e-observabilidade.md)); nenhuma regra de mapeamento espalhada pelos controllers.

### ADR-015 · Estratégia de testes
- **Contexto:** os testes precisam cobrir domínio, casos de uso, banco e API, rodando rápido localmente e no CI.
- **Decisão:** Vitest para tudo. Domínio testado sem dependências; casos de uso e API com repositórios em memória; repositórios Prisma contra um PostgreSQL real, num schema separado (`test`). Para a API foi usado o `app.inject` do Fastify em vez do Supertest planejado: simula requisições HTTP completas sem abrir porta e sem dependência extra.
- **Consequências:** a maior parte dos testes não depende de banco e roda em segundos; os testes de banco não apagam dados de desenvolvimento ([testes](14-testes.md)).

### ADR-016 · Docker com migrations na inicialização
- **Contexto:** o sistema precisa subir com um único comando, em qualquer máquina.
- **Decisão:** Dockerfile em duas etapas (compilação e execução, sem dependências de desenvolvimento, usuário não-root e *healthcheck*); a API aplica as migrations pendentes ao iniciar e só sobe depois que o banco está saudável. No host, o PostgreSQL usa a porta 5433 para não conflitar com outras instalações locais.
- **Consequências:** `docker compose up -d --build` sobe banco e API já prontos para uso; o CI também valida que a imagem continua sendo construída.

---

## Evolução planejada

- **Backend:** ✅ implementado na Fase 2 — API REST chamando os mesmos casos de uso, sem alterar o domínio.
- **Frontend / Mobile:** novas apresentações sobre a API; núcleo intacto.
- **Microsserviços:** as fronteiras de agregado já são candidatos naturais a serviços.
- **Anti-acoplamento:** referências por ID, dependências via interfaces, regras no domínio e regra de dependência para dentro.
