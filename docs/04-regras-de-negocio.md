# 04 · Regras de Negócio

> Regras catalogadas (Bloco 4). A coluna **"Onde mora"** é o ponto central: o enunciado pede explicitamente para indicar onde cada regra ficará concentrada na arquitetura.

## Princípio de alocação

O DDD oferece três "casas" para regras, e escolher a certa é o que evita espalhar lógica pelo sistema:

- **Objeto de Valor (VO):** regras que dependem **só do próprio valor** (ex.: quantidade > 0). O VO se recusa a existir inválido.
- **Raiz do Agregado (Entidade):** invariantes que dependem do **estado interno de um único agregado** (ex.: só liberar com documentação válida, transições de status).
- **Caso de Uso (camada de aplicação):** regras que atravessam **mais de um agregado** ou dependem de dados externos (ex.: verificar se o produto está ativo antes de registrar a carga) — porque um agregado não deve conhecer outro por dentro.

> Regra prática: se para checar a regra você precisa carregar **outro agregado** do repositório, ela mora no **caso de uso**. Se ela só olha para os dados de um agregado ou de um valor, mora **no domínio**.

## Catálogo

| ID | Regra | Onde mora |
|---|---|---|
| RN-01 | Carga não pode ser registrada sem produto associado | Caso de uso (Registrar Carga) — exige `produtoId` válido |
| RN-02 | Carga não pode ser registrada com produto **inativo** | Caso de uso (carrega o Produto e verifica `ativo`) |
| RN-03 | Carga não pode ser registrada sem classificação de risco | Agregado Carga (invariante de criação) + Caso de uso (deriva do produto) |
| RN-04 | Carga não pode ser liberada sem documentação obrigatória | Agregado Carga → método `liberar()` |
| RN-05 | Carga bloqueada não pode entrar em movimentação | Agregado Carga → ação `movimentar()` (guarda de status) |
| RN-06 | Carga cancelada não pode ser liberada | Agregado Carga → método `liberar()` (guarda de status) |
| RN-07 | Carga em inspeção não pode ser finalizada sem antes ser liberada | Agregado Carga → máquina de estados |
| RN-08 | Produto não pode ser cadastrado sem nome | Entidade Produto (invariante de criação) |
| RN-09 | Produto não pode ser cadastrado sem classe de risco | Entidade Produto (invariante de criação) |
| RN-10 | Produto inativo não pode ser usado em novas cargas | Caso de uso (Registrar Carga) |
| RN-11 | Quantidade da carga deve ser maior que zero | Objeto de Valor `Quantidade` (autovalidação) |
| RN-12 | Toda carga deve possuir responsável técnico | Agregado Carga (invariante de criação) |

## Por que essa separação importa

Concentrar as invariantes no **domínio** faz com que seja **impossível** criar objetos inválidos, independentemente de quem os chama (API, testes, script). As regras cross-agregado ficam nos **casos de uso**, mantendo os agregados desacoplados entre si. O resultado é um núcleo de negócio testável sem banco nem framework — exatamente o que a próxima fase vai aproveitar.
