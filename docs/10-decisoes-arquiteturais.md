# 10 · Decisões Arquiteturais (ADRs)

> Registro das principais decisões (Bloco 10), no formato ADR: **Contexto → Decisão → Consequências**. ADRs deixam explícito *por que* cada escolha foi feita.

---

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

## Evolução planejada

- **Backend:** camada de apresentação (API) chamando os mesmos casos de uso.
- **Frontend / Mobile:** novas apresentações sobre a API; núcleo intacto.
- **Microsserviços:** as fronteiras de agregado já são candidatos naturais a serviços.
- **Anti-acoplamento:** referências por ID, dependências via interfaces, regras no domínio e regra de dependência para dentro.
