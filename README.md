# QuimiPort — Gestão de Cargas Químicas Portuárias

> Tech Challenge · Fase 1 · Pós-Tech Full Stack Development (FIAP)
> Disciplinas: JavaScript Avançado · Arquitetura de Software com TypeScript · Domain Driven Design · Qualidade de Software

## Autor

Projeto individual.

- Luis Otavio Mussalem Santos — RM 375787
- GitHub: [Luis-Mussalem](https://github.com/Luis-Mussalem)

## O problema

O Porto de Santos movimenta grande volume de **produtos químicos**, que exigem controle rigoroso de classificação de risco, documentação obrigatória e acompanhamento técnico. Hoje, esse controle é feito de forma **manual e descentralizada**, o que dificulta consultar informações, acompanhar o status das cargas e — o mais crítico — **validar as regras de segurança antes de liberar uma carga para movimentação**.

## A solução

O **QuimiPort** centraliza o ciclo de vida das cargas químicas portuárias, garantindo que nenhuma carga seja movimentada sem cumprir as regras obrigatórias de risco, documentação e responsabilidade técnica.

> **Escopo desta fase:** proposta **técnica e arquitetural** — não há frontend, backend ou banco de dados implementados. O foco é o **núcleo**: domínio, regras de negócio, modelagem DDD, arquitetura e plano de qualidade.

## Como navegar pela documentação

| # | Documento | Conteúdo |
|---|---|---|
| 01 | [Domínio e Linguagem Ubíqua](docs/01-dominio.md) | Entendimento do domínio, usuários, processos e glossário |
| 02 | [Modelagem DDD](docs/02-modelagem-ddd.md) | Entidades, objetos de valor e agregados |
| 03 | [Casos de Uso](docs/03-casos-de-uso.md) | Casos de uso (ator, entrada, saída, regras, exceções) |
| 04 | [Regras de Negócio](docs/04-regras-de-negocio.md) | Regras catalogadas e **onde cada uma mora** na arquitetura |
| 05 | [Arquitetura](docs/05-arquitetura.md) | Camadas, responsabilidades e caminho de evolução |
| 06 | [Organização do Projeto](docs/06-organizacao-do-projeto.md) | Estrutura de pastas proposta |
| 07 | [Diagramas](docs/07-diagramas.md) | Domínio e fluxo de status (obrigatórios) + apoio |
| 08 | [Plano de Qualidade](docs/08-plano-de-qualidade.md) | O que testar, tipos de teste, mocks e fluxos críticos |
| 09 | [TypeScript e JS Avançado](docs/09-typescript-e-js-avancado.md) | Decisões de linguagem com exemplos conceituais |
| 10 | [Decisões Arquiteturais (ADRs)](docs/10-decisoes-arquiteturais.md) | Registro das decisões e suas consequências |

Diagramas em imagem: [`docs/diagramas/`](docs/diagramas) · Apresentação: [`apresentacao/`](apresentacao)

## Stack planejada (próximas fases)

TypeScript · Node.js · Arquitetura em camadas (Clean Architecture / Ports & Adapters) · Vitest (testes) · persistência inicialmente em memória, evoluindo para banco relacional.

## Roadmap de evolução

- **Fase 1 (atual):** modelagem de domínio, regras de negócio, arquitetura e plano de qualidade.
- **Próximas fases:** implementação do domínio em TypeScript, casos de uso, testes automatizados, backend (API), persistência em banco, frontend web, mobile e possível quebra em microsserviços.
