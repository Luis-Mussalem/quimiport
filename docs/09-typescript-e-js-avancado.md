# 09 · TypeScript e JavaScript Avançado

> Como os recursos de linguagem serão usados na construção futura (Bloco 9), com exemplos **conceituais** (ilustrativos, não a implementação final).

## Decisões de linguagem

| Recurso | Uso no QuimiPort |
|---|---|
| **Tipagem forte** | Todo o domínio tipado; `any` proibido. IDs viram tipos próprios para não trocar um `ProdutoId` por um `CargaId`. |
| **Interfaces** | Contratos de repositório (ports) e DTOs de casos de uso. |
| **Classes** | Entidades e agregados (identidade + comportamento). |
| **Enums** | `StatusDaCarga` e `ClasseDeRisco`. |
| **Funções puras** | Validações (`quantidadeValida`, `documentacaoCompleta`) — fáceis de testar. |
| **Módulos ES6+** | `import/export` por feature. |
| **async/await** | Repositórios retornam `Promise` desde já, prontos para I/O real. |
| **Generics** | `Result<T>`, `Repository<T, ID>`, base `Entity<TId>`. |
| **Tratamento de erros** | `Result<T>` para falhas de negócio esperadas; `Error` para falhas técnicas excepcionais. |
| **Contratos compartilhados** | Tipos e DTOs isolados para uso entre camadas. |

## Exemplos conceituais

### Enums para status e classificação
```ts
export enum StatusDaCarga {
  Registrada = 'REGISTRADA',
  EmInspecao = 'EM_INSPECAO',
  Liberada = 'LIBERADA',
  Bloqueada = 'BLOQUEADA',
  Cancelada = 'CANCELADA',
}

export enum ClasseDeRisco {
  Explosivos = 'CLASSE_1',
  Gases = 'CLASSE_2',
  LiquidosInflamaveis = 'CLASSE_3',
  Corrosivos = 'CLASSE_8',
  Diversos = 'CLASSE_9',
}
```

### Objeto de valor autovalidável
```ts
export class Quantidade {
  private constructor(
    public readonly valor: number,
    public readonly unidade: string,
  ) {}

  static criar(valor: number, unidade: string): Quantidade {
    if (valor <= 0) {
      throw new DomainError('A quantidade deve ser maior que zero.'); // RN-11
    }
    return new Quantidade(valor, unidade);
  }
}
```

### Tratamento de erros com `Result<T>` (generics)
```ts
export type Result<T> =
  | { sucesso: true; valor: T }
  | { sucesso: false; erro: string };
```

### Interface de repositório (port) + async/await
```ts
export interface CargaQuimicaRepository {
  salvar(carga: CargaQuimica): Promise<void>;
  buscarPorId(id: CargaId): Promise<CargaQuimica | null>;
  listarPorStatus(status: StatusDaCarga): Promise<CargaQuimica[]>;
}
```

### Invariante protegida pela raiz do agregado
```ts
// dentro de CargaQuimica
liberar(): Result<void> {
  if (this.status === StatusDaCarga.Cancelada) {
    return { sucesso: false, erro: 'Carga cancelada não pode ser liberada.' }; // RN-06
  }
  if (!this.documentacaoObrigatoriaCompleta()) {
    return { sucesso: false, erro: 'Documentação obrigatória ausente ou inválida.' }; // RN-04
  }
  this.status = StatusDaCarga.Liberada;
  this.registrarHistorico('Carga liberada');
  return { sucesso: true, valor: undefined };
}
```

Esses exemplos mostram como cada recurso da linguagem serve a uma decisão de modelagem: enums fixam o vocabulário de estados, VOs impedem valores inválidos, generics padronizam o tratamento de erros e interfaces isolam o domínio da infraestrutura.
