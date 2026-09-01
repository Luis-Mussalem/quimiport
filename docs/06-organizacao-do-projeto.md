# 06 · Organização do Projeto

> Estrutura de pastas proposta (Bloco 6). Reflete diretamente as camadas da arquitetura — cada pasta tem uma responsabilidade clara.

```
quimiport/
├── src/
│   ├── domain/                      # Núcleo: regras que não dependem de nada externo
│   │   ├── produto/
│   │   │   ├── ProdutoQuimico.ts            # Entidade / raiz de agregado
│   │   │   ├── ClasseDeRisco.ts             # Objeto de valor (enum)
│   │   │   └── ProdutoQuimicoRepository.ts  # Interface (port)
│   │   ├── carga/
│   │   │   ├── CargaQuimica.ts              # Raiz do agregado principal
│   │   │   ├── Quantidade.ts                # Objeto de valor
│   │   │   ├── ClassificacaoDeRisco.ts      # Objeto de valor
│   │   │   ├── StatusDaCarga.ts             # Enum de status
│   │   │   ├── DocumentoDaCarga.ts          # Entidade interna do agregado
│   │   │   ├── Inspecao.ts                  # Entidade interna do agregado
│   │   │   ├── EventoHistorico.ts           # Registro de histórico
│   │   │   └── CargaQuimicaRepository.ts    # Interface (port)
│   │   ├── responsavel/
│   │   │   ├── ResponsavelTecnico.ts
│   │   │   └── ResponsavelTecnicoRepository.ts
│   │   └── shared/
│   │       ├── Entity.ts                    # Base de entidade
│   │       ├── ValueObject.ts               # Base de objeto de valor
│   │       ├── Result.ts                    # Tratamento de falhas de negócio
│   │       └── DomainError.ts               # Erros de domínio
│   │
│   ├── application/                 # Casos de uso: orquestram o domínio
│   │   ├── produto/
│   │   │   ├── CadastrarProduto.ts
│   │   │   └── InativarProduto.ts
│   │   ├── carga/
│   │   │   ├── RegistrarCarga.ts
│   │   │   ├── ValidarDocumentacao.ts
│   │   │   ├── SolicitarInspecao.ts
│   │   │   ├── LiberarCarga.ts
│   │   │   ├── BloquearCarga.ts
│   │   │   ├── CancelarCarga.ts
│   │   │   ├── ConsultarCargasPorStatus.ts
│   │   │   └── ConsultarHistorico.ts
│   │   └── shared/
│   │       └── dtos/                        # Contratos de entrada/saída
│   │
│   └── infrastructure/             # Detalhes técnicos: implementam os ports
│       ├── persistence/
│       │   └── in-memory/                   # Repositórios em memória (Fase 1)
│       ├── http/                            # Controllers da API (fase futura)
│       └── config/
│
├── tests/
│   ├── unit/                        # Domínio: VOs, entidades, agregados
│   └── integration/                 # Casos de uso + repositórios falsos
│
├── docs/                            # Documentação técnica (esta pasta)
└── README.md
```

## Responsabilidades por pasta

| Pasta | Responsabilidade | Pode depender de |
|---|---|---|
| `domain/` | Regras de negócio e modelo | nada externo |
| `application/` | Casos de uso, orquestração | `domain/` |
| `infrastructure/` | Banco, HTTP, frameworks | `domain/` (via interfaces) e `application/` |
| `tests/` | Verificação automatizada | todas |

A estrutura por **feature dentro de cada camada** (`produto/`, `carga/`, `responsavel/`) mantém o código coeso e facilita uma futura extração para microsserviços.
