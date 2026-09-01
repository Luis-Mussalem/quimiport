# 01 · Domínio e Linguagem Ubíqua

> Entendimento do domínio (Bloco 1) e vocabulário compartilhado que será usado em toda a modelagem, arquitetura e código.

---

## 1. Entendimento do Domínio

### 1.1 Contexto

O Porto de Santos é um dos principais pontos de movimentação de cargas do Brasil. Entre elas há **produtos químicos**, que exigem controle rigoroso: documentação adequada, classificação de risco e acompanhamento técnico. Hoje o registro é **manual e descentralizado**, o que dificulta consultar informações, acompanhar o status e validar regras de segurança antes de liberar a carga.

### 1.2 Problema que o sistema resolve

Centralizar e padronizar a gestão de cargas químicas portuárias, garantindo que **nenhuma carga seja movimentada sem cumprir as regras obrigatórias** de classificação de risco, documentação e responsabilidade técnica — substituindo o controle manual por um fluxo confiável, rastreável e auditável.

### 1.3 Usuários / perfis envolvidos

| Perfil | Responsabilidade no sistema |
|---|---|
| Operador portuário | Registra cargas, associa produtos, acompanha status, solicita movimentação |
| Responsável técnico | Responde tecnicamente pela carga; sua indicação é obrigatória |
| Analista de documentação | Valida se a documentação obrigatória está completa e válida |
| Analista de qualidade | Solicita/realiza inspeções e verifica conformidade |
| Gestor operacional | Consulta status e histórico; visão gerencial |
| Administrador do sistema | Gerencia cadastros base (produtos), usuários e configurações |

### 1.4 Informações controladas

Produtos químicos (nome, classe de risco, situação); cargas (produto associado, quantidade, classificação de risco, documentação, responsável técnico, status, inspeções e histórico); documentação obrigatória; inspeções. *(Área de armazenamento: prevista para fase futura.)*

### 1.5 Processos da operação

1. Cadastrar / inativar produto químico.
2. Registrar carga química (associando um produto).
3. Validar a documentação da carga.
4. Solicitar e registrar inspeção.
5. Liberar, bloquear ou cancelar a carga.
6. Consultar cargas por status e histórico de uma carga.

### 1.6 Decisões que o sistema precisa tomar

Todas do tipo *"pode ou não pode?"*, decididas automaticamente por regras de negócio:

- **Pode registrar esta carga?** (produto ativo? tem classificação de risco? tem responsável técnico? quantidade > 0?)
- **Pode liberar esta carga?** (documentação obrigatória válida? carga não está bloqueada nem cancelada?)
- **Pode movimentar esta carga?** (carga liberada e não bloqueada?)
- **Esta transição de status é válida?**

### 1.7 Riscos e restrições

- **Segurança física:** movimentar carga perigosa sem classificação/documentação é risco real a pessoas e ao ambiente.
- **Restrições regulatórias:** documentação obrigatória precisa existir e ser válida antes da liberação.
- **Integridade de dados:** não pode haver carga sem produto, sem responsável ou com quantidade inválida.

### 1.8 O que poderá evoluir

Persistência em banco, backend (API), frontend web, mobile, autenticação real, integração com sistemas do porto e eventual quebra em microsserviços.

---

## 2. Linguagem Ubíqua (Glossário)

Termos usados **de forma idêntica** na documentação, nos diagramas e no código.

| Termo | Significado no QuimiPort |
|---|---|
| **Produto Químico** | Substância cadastrada, com nome e classe de risco, que pode estar Ativa ou Inativa. Só produtos ativos entram em novas cargas. |
| **Classe de Risco** | Categoria de periculosidade **intrínseca do produto**. |
| **Carga Química** | Registro de uma quantidade de um produto a ser movimentada. Elemento central do sistema. |
| **Classificação de Risco** | Nível de risco **da carga**, derivado da classe de risco do produto associado. |
| **Quantidade** | Volume/massa da carga. Deve ser maior que zero. |
| **Responsável Técnico** | Profissional que responde tecnicamente pela carga. Obrigatório. |
| **Documentação Obrigatória / Documento da Carga** | Documentos exigidos para liberar a carga. |
| **Inspeção** | Verificação técnica da carga, opcional antes da liberação. |
| **Status da Carga** | Situação atual no ciclo de vida: Registrada, Em Inspeção, Liberada, Bloqueada, Cancelada. |
| **Liberar** | Autorizar a carga para movimentação (exige documentação válida). |
| **Bloquear** | Impedir a movimentação da carga. |
| **Cancelar** | Encerrar a carga; cancelada não pode ser liberada. |
| **Movimentar** | Ação de mover fisicamente a carga (só se Liberada e não Bloqueada). |
| **Ativo / Inativo** | Situação do produto químico no cadastro. |

---

## 3. Decisões de modelagem (fechadas)

1. **Classe de Risco × Classificação de Risco:** são **dois termos distintos e relacionados**. O produto carrega a *Classe de Risco*; a carga recebe uma *Classificação de Risco* derivada do produto no momento do registro. Isso separa o cadastro (produto) da operação (carga) e mantém a linguagem precisa.
2. **Movimentação é uma ação, não um status.** Manter "Movimentar" como ação sobre uma carga *Liberada* deixa a máquina de estados enxuta e fiel às regras (uma carga bloqueada simplesmente não pode executar a ação).
3. **Área de Armazenamento** é citada no modelo conceitual, mas **fora do agregado central e do escopo da Fase 1** — forte candidata a próxima fase, evitando inchar o escopo.
