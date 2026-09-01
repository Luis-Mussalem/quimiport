# 02 · Modelagem com Domain Driven Design

> Entidades, objetos de valor e agregados (Bloco 2). Diagrama correspondente em [07-diagramas.md](07-diagramas.md#diagrama-de-domínio).

## Conceitos aplicados

- **Entidade:** tem **identidade própria** que a distingue mesmo que seus atributos mudem (duas cargas com os mesmos dados ainda são cargas diferentes). É identificada por um `id`.
- **Objeto de Valor (VO):** definido **apenas pelos seus valores**, sem identidade; é **imutável** e se **autovalida**. `Quantidade(500, "kg")` é sempre igual a outra `Quantidade(500, "kg")`.
- **Agregado:** um conjunto de objetos tratados como **uma unidade de consistência**. Tem uma **raiz (Aggregate Root)** que é a única porta de entrada e a responsável por proteger as **invariantes** (regras que nunca podem ser violadas).

---

## Entidades

### Carga Química *(raiz do agregado principal)*
- **Responsabilidade:** representar uma carga em movimentação e proteger todas as regras do seu ciclo de vida.
- **Atributos:** `id`, `produtoId` (referência), `quantidade` (VO), `classificacaoDeRisco` (VO), `responsavelTecnicoId` (referência), `status` (VO/enum), `documentos` (lista), `inspecoes` (lista), `historico` (lista).
- **Regras relacionadas:** exige produto associado, classificação de risco, responsável técnico e quantidade > 0; controla transições de status; só libera com documentação válida.
- **Relacionamentos:** referencia `Produto Químico` e `Responsável Técnico` **por ID**; **contém** `Documento da Carga` e `Inspeção`.

### Produto Químico *(raiz de agregado próprio)*
- **Responsabilidade:** representar a substância cadastrada e sua periculosidade.
- **Atributos:** `id`, `nome`, `classeDeRisco` (VO/enum), `ativo` (boolean).
- **Regras:** não existe sem nome nem sem classe de risco; produto inativo não entra em novas cargas.
- **Relacionamentos:** referenciado por `Carga Química`.

### Responsável Técnico *(raiz de agregado próprio)*
- **Responsabilidade:** identificar o profissional responsável pela carga.
- **Atributos:** `id`, `nome`, `registroProfissional`.
- **Regras:** toda carga precisa referenciar um responsável válido.
- **Relacionamentos:** referenciado por `Carga Química`.

### Documento da Carga *(entidade interna do agregado Carga)*
- **Responsabilidade:** representar um documento obrigatório da carga.
- **Atributos:** `id`, `tipo`, `validade`, `valido`.
- **Regras:** compõe a checagem de "documentação obrigatória completa" na liberação.
- **Relacionamentos:** pertence a uma `Carga Química` (não existe fora dela).

### Inspeção *(entidade interna do agregado Carga)*
- **Responsabilidade:** registrar uma verificação técnica da carga.
- **Atributos:** `id`, `data`, `resultado`, `responsavel`.
- **Relacionamentos:** pertence a uma `Carga Química`.

---

## Objetos de Valor

| Objeto de Valor | Por que é VO | Regra que carrega |
|---|---|---|
| **Quantidade** | Sem identidade, imutável | `valor > 0`; guarda valor + unidade |
| **Classe de Risco** | Categoria fixa (enum) | Valor pertence ao conjunto de classes válidas |
| **Classificação de Risco** | Derivada da classe do produto | Toda carga precisa ter uma |
| **Status da Carga** | Enum de estados | Só aceita transições válidas |
| **Identificadores** (`CargaId`, `ProdutoId`, `ResponsavelId`) | Encapsulam o id | Garantem tipagem forte e evitam trocar um id por outro |

---

## Agregados

### Agregado principal: **Carga Química**

**Por que a Carga é a raiz?** Porque quase toda regra de segurança do sistema precisa avaliar o **estado completo da carga de forma atômica**: seu status, seus documentos e sua consistência interna. Concentrar isso numa única raiz garante que a carga nunca fique num estado inválido (ex.: "liberada sem documentação"). A raiz é a única porta de entrada — ninguém altera um documento ou o status "por fora", apenas através de métodos da carga (`liberar()`, `bloquear()`, `cancelar()`, `movimentar()`, `solicitarInspecao()`).

**Invariantes que o agregado protege:**
- Quantidade sempre > 0.
- Sempre há classificação de risco e responsável técnico.
- Só libera com documentação obrigatória válida.
- Carga cancelada nunca volta a ser liberada.
- Só executa `movimentar()` quando Liberada e não Bloqueada.
- Transições de status seguem a máquina de estados definida.

### Agregados de apoio: **Produto Químico** e **Responsável Técnico**

São agregados **separados** porque têm ciclo de vida independente da carga (um produto existe e é reutilizado por várias cargas). Seguindo a regra de ouro do DDD — **referenciar outros agregados por identidade (ID), não por objeto** —, a carga guarda `produtoId` e `responsavelTecnicoId`, e não instâncias inteiras. Isso mantém as fronteiras claras, reduz acoplamento e prepara o terreno para persistência e escalabilidade.

> **Consequência importante:** regras que dependem de mais de um agregado (ex.: *"não registrar carga com produto inativo"*) **não** ficam dentro do agregado Carga — ficam no **caso de uso**, que carrega o produto, verifica se está ativo e só então manda a carga ser criada. Ver [04-regras-de-negocio.md](04-regras-de-negocio.md).
