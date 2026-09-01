# 05 · Arquitetura Proposta

> Arquitetura inicial (Bloco 5). Diagrama em [07-diagramas.md](07-diagramas.md#arquitetura-em-camadas).

## Estilo adotado: arquitetura em camadas (Clean Architecture / Ports & Adapters)

A aplicação é organizada em camadas concêntricas, com uma **regra de dependência** única e inegociável: **as dependências apontam para dentro**. O domínio, no centro, não conhece nada externo; a infraestrutura, na borda, depende do domínio — nunca o contrário.

```
Apresentação  →  Aplicação  →  Domínio  ←  Infraestrutura
(futuro)          (casos de uso)  (núcleo)     (repos, banco, frameworks)
```

## Camadas e responsabilidades

### 1. Domínio (núcleo)
Entidades, objetos de valor, agregados, regras de negócio e **interfaces de repositório** (ports). É TypeScript puro, sem imports de framework ou banco. **Nenhuma dependência externa.**

### 2. Aplicação
**Casos de uso** que orquestram os agregados, DTOs de entrada/saída e regras cross-agregado. Depende apenas do domínio. É onde uma requisição vira uma sequência de operações de negócio.

### 3. Infraestrutura
Implementações concretas dos repositórios (nesta fase, em memória; depois, banco), integrações e detalhes técnicos. **Implementa** as interfaces definidas no domínio — este é o coração da **Inversão de Dependência**: o domínio declara *o que* precisa (`CargaQuimicaRepository`), a infraestrutura decide *como* (`InMemoryCargaRepository`, futuramente `PostgresCargaRepository`).

### 4. Apresentação (futura)
Controllers HTTP (API), frontend web e mobile. Consomem os casos de uso, sem falar direto com o domínio.

## Por que separar assim

- **Testabilidade:** o domínio e os casos de uso são testados **sem banco e sem framework**, só com repositórios falsos em memória.
- **Baixo acoplamento:** trocar o banco, o framework HTTP ou o frontend **não toca no núcleo de negócio**.
- **Evolução segura:** cada camada evolui de forma isolada.

## Caminho de evolução

- **→ Backend:** adicionar uma camada de apresentação (ex.: Express/Fastify) que chama os mesmos casos de uso.
- **→ Persistência real:** trocar os repositórios em memória por implementações de banco, sem alterar domínio nem casos de uso.
- **→ Frontend / Mobile:** novas apresentações consumindo a API; o núcleo permanece igual.
- **→ Microsserviços:** as fronteiras de agregado (Produto, Carga, Responsável) já indicam candidatos naturais a serviços separados.

## Como evito acoplamento excessivo

Referências entre agregados **por ID**; dependências sempre via **interfaces** (ports); regras de negócio **dentro** do domínio, não vazando para controllers; e a regra de dependência apontando sempre para dentro.
