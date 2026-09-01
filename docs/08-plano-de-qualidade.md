# 08 · Plano de Qualidade de Software

> Como o projeto será testado nas próximas fases (Bloco 8).

## Estratégia

A arquitetura foi desenhada para ser testável: como o **domínio não depende de banco nem framework**, a maior parte dos testes é **unitária e rápida**, cobrindo diretamente as regras de negócio. Adotei a pirâmide de testes — muitos testes unitários na base, testes de integração no meio, e poucos end-to-end no topo (fases futuras).

**Ferramenta planejada:** Vitest (rápido, nativo para TypeScript/ESM). Jest é alternativa equivalente.

## Regras de negócio que precisam ser testadas

Todas as RN do [catálogo](04-regras-de-negocio.md) viram casos de teste. As prioritárias, por impacto de segurança:

- Não cadastrar produto sem nome / sem classe de risco (RN-08, RN-09).
- Não registrar carga com produto inativo (RN-02, RN-10).
- Não liberar carga sem documentação obrigatória (RN-04).
- Não movimentar carga bloqueada (RN-05).
- Não liberar carga cancelada (RN-06).
- Quantidade > 0 (RN-11).
- Transição de status válida (RN-07).
- Toda carga com responsável técnico (RN-12).

## Casos de uso mais críticos

**Registrar Carga** e **Liberar Carga** — concentram as regras de segurança e o maior risco operacional. Recebem a cobertura mais completa (caminho feliz + todas as exceções).

## Tipos de teste

| Tipo | O que cobre | Quando |
|---|---|---|
| **Unitário** | VOs (`Quantidade`), invariantes de entidades, métodos do agregado (`liberar`, `bloquear`), funções puras de validação | Já planejável na modelagem |
| **Integração** | Casos de uso + repositórios falsos em memória | Ao implementar a camada de aplicação |
| **End-to-end** | Fluxo completo via API | Fases futuras, com backend |

## Como aplicarei testes unitários

Testar o domínio isoladamente, um cenário por regra. Ex.: `Quantidade.criar(0)` deve falhar; `carga.liberar()` sem documentação deve retornar erro; `carga.liberar()` de uma carga cancelada deve ser rejeitada. Como o domínio é puro, esses testes não precisam de mocks.

## Como aplicarei testes de integração (futuro)

Instanciar o caso de uso com **repositórios falsos em memória** (que implementam as mesmas interfaces do domínio) e verificar o fluxo completo — ex.: registrar um produto, inativá-lo e confirmar que registrar uma carga com ele falha.

## Validação dos fluxos principais

Cada caso de uso crítico terá cenários de caminho feliz e de exceção. O fluxo de status é validado percorrendo a máquina de estados: transições permitidas devem passar; proibidas (ex.: Cancelada → Liberada) devem falhar.

## Organização de mocks e dados simulados

- **Repositórios falsos (fakes) em memória** implementando as interfaces do domínio — preferidos a mocks, por serem mais estáveis.
- **Test Data Builders (Object Mother):** funções como `umProdutoAtivo()`, `umaCargaRegistrada()` para montar cenários legíveis e reduzir repetição.
- Dados simulados isolados na pasta `tests/`, nunca no código de produção.

## Cenários de teste planejados (do enunciado → mapeados)

| Cenário | Regra | Resultado esperado |
|---|---|---|
| Cadastrar produto sem classe de risco | RN-09 | Falha |
| Registrar carga com produto inativo | RN-02/RN-10 | Falha |
| Liberar carga sem documentação | RN-04 | Falha |
| Movimentar carga bloqueada | RN-05 | Falha |
| Liberar carga com documentação válida | RN-04 | Sucesso |
| Quantidade ≤ 0 | RN-11 | Falha |
| Transição Cancelada → Liberada | RN-06/RN-07 | Falha |
