# 03 · Casos de Uso

> Casos de uso planejados (Bloco 3). Cada um descreve objetivo, ator, entrada, saída, regras e exceções. Diagrama em [07-diagramas.md](07-diagramas.md#diagrama-de-casos-de-uso).

Convenção: os casos de uso vivem na **camada de aplicação** e orquestram os agregados do **domínio**.

---

### UC-01 · Cadastrar Produto Químico
- **Objetivo:** registrar um novo produto químico no cadastro.
- **Ator:** Administrador do sistema.
- **Entrada:** nome, classe de risco.
- **Saída:** produto criado (ativo por padrão).
- **Regras:** nome obrigatório; classe de risco obrigatória (RN-08, RN-09).
- **Exceções:** nome vazio; classe de risco inválida → erro de validação.

### UC-02 · Inativar Produto Químico
- **Objetivo:** marcar um produto como inativo.
- **Ator:** Administrador.
- **Entrada:** `produtoId`.
- **Saída:** produto com `ativo = false`.
- **Regras:** produto inativo não poderá ser usado em novas cargas (RN-10).
- **Exceções:** produto inexistente → erro.

### UC-03 · Registrar Carga Química
- **Objetivo:** criar uma carga associada a um produto.
- **Ator:** Operador portuário.
- **Entrada:** `produtoId`, quantidade, `responsavelTecnicoId`.
- **Saída:** carga criada com status **Registrada**.
- **Regras:** produto deve existir e estar **ativo** (RN-02, RN-10); quantidade > 0 (RN-11); responsável técnico obrigatório (RN-12); classificação de risco derivada do produto (RN-01, RN-03).
- **Exceções:** produto inexistente/inativo; quantidade ≤ 0; responsável ausente.

### UC-04 · Validar Documentação da Carga
- **Objetivo:** verificar se a documentação obrigatória está completa e válida.
- **Ator:** Analista de documentação.
- **Entrada:** `cargaId`.
- **Saída:** resultado da validação (completa/incompleta + pendências).
- **Regras:** define se a carga poderá ser liberada (RN-04).
- **Exceções:** carga inexistente.

### UC-05 · Solicitar Inspeção
- **Objetivo:** colocar a carga em inspeção técnica.
- **Ator:** Analista de qualidade.
- **Entrada:** `cargaId`.
- **Saída:** carga com status **Em Inspeção**.
- **Regras:** transição válida a partir de Registrada (ver máquina de estados).
- **Exceções:** carga cancelada; transição inválida.

### UC-06 · Liberar Carga Química
- **Objetivo:** autorizar a carga para movimentação.
- **Ator:** Operador portuário.
- **Entrada:** `cargaId`.
- **Saída:** carga com status **Liberada**.
- **Regras:** exige documentação obrigatória válida (RN-04); carga não pode estar cancelada (RN-06) nem bloqueada; transição válida (RN-07).
- **Exceções:** documentação incompleta; carga cancelada/bloqueada.

### UC-07 · Bloquear Carga Química
- **Objetivo:** impedir a movimentação da carga.
- **Ator:** Analista de qualidade / Gestor operacional.
- **Entrada:** `cargaId`, motivo.
- **Saída:** carga com status **Bloqueada**.
- **Regras:** carga bloqueada não pode ser movimentada (RN-05).
- **Exceções:** carga cancelada.

### UC-08 · Cancelar Carga Química
- **Objetivo:** encerrar a carga.
- **Ator:** Operador portuário.
- **Entrada:** `cargaId`, motivo.
- **Saída:** carga com status **Cancelada** (terminal).
- **Regras:** carga cancelada não pode mais ser liberada (RN-06).
- **Exceções:** carga já cancelada.

### UC-09 · Atualizar Status da Carga
- **Objetivo:** aplicar uma transição de status válida.
- **Ator:** Operador / Analista.
- **Entrada:** `cargaId`, novo status.
- **Saída:** carga atualizada + registro no histórico.
- **Regras:** apenas transições permitidas pela máquina de estados (RN-07).
- **Exceções:** transição inválida.

### UC-10 · Consultar Cargas por Status
- **Objetivo:** listar cargas em determinado status.
- **Ator:** Gestor operacional.
- **Entrada:** status.
- **Saída:** lista de cargas.
- **Regras:** apenas leitura.
- **Exceções:** nenhuma (lista pode vir vazia).

### UC-11 · Consultar Histórico da Carga
- **Objetivo:** exibir o histórico de eventos de uma carga.
- **Ator:** Gestor operacional / Analista.
- **Entrada:** `cargaId`.
- **Saída:** lista de eventos (transições, inspeções, liberações).
- **Regras:** apenas leitura.
- **Exceções:** carga inexistente.
