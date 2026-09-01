# 07 · Diagramas

> Os **obrigatórios** para a entrega são o **Diagrama de Domínio** e o **Fluxo de Status da Carga**; os demais são apoio. As imagens abaixo são as versões finais; o código-fonte em **Mermaid** de cada uma fica logo abaixo, recolhível.

---

## Diagrama de Domínio
> **Obrigatório.** Agregados, entidades, objetos de valor e relacionamentos.

![Diagrama de Domínio do QuimiPort](diagramas/1-diagrama-de-dominio.png)

Legenda: losango cheio = composição (a parte pertence ao agregado); linha simples = objeto de valor; linha tracejada = referência por ID entre agregados.

<details>
<summary>Código-fonte (Mermaid)</summary>

```mermaid
classDiagram
    class CargaQuimica {
        <<Aggregate Root>>
        +CargaId id
        +ProdutoId produtoId
        +ResponsavelId responsavelTecnicoId
        +Quantidade quantidade
        +ClassificacaoDeRisco classificacao
        +StatusDaCarga status
        +registrar()
        +solicitarInspecao()
        +liberar()
        +bloquear()
        +cancelar()
        +movimentar()
    }
    class ProdutoQuimico {
        <<Aggregate Root>>
        +ProdutoId id
        +string nome
        +ClasseDeRisco classeDeRisco
        +boolean ativo
        +inativar()
    }
    class ResponsavelTecnico {
        <<Aggregate Root>>
        +ResponsavelId id
        +string nome
        +string registroProfissional
    }
    class DocumentoDaCarga {
        <<Entity>>
        +DocumentoId id
        +string tipo
        +Date validade
        +boolean valido
    }
    class Inspecao {
        <<Entity>>
        +InspecaoId id
        +Date data
        +string resultado
    }
    class Quantidade {
        <<Value Object>>
        +number valor
        +string unidade
    }
    class ClassificacaoDeRisco {
        <<Value Object>>
        +ClasseDeRisco classe
    }
    class ClasseDeRisco {
        <<Value Object / Enum>>
    }

    CargaQuimica "1" o-- "1" Quantidade
    CargaQuimica "1" o-- "1" ClassificacaoDeRisco
    CargaQuimica "1" *-- "0..*" DocumentoDaCarga : contem
    CargaQuimica "1" *-- "0..*" Inspecao : contem
    CargaQuimica ..> ProdutoQuimico : referencia por ID
    CargaQuimica ..> ResponsavelTecnico : referencia por ID
    ProdutoQuimico "1" o-- "1" ClasseDeRisco
```
</details>

---

## Fluxo de Status da Carga Química
> **Obrigatório.** Máquina de estados. "Movimentar" é uma **ação** sobre a carga Liberada, não um estado.

![Fluxo de Status da Carga](diagramas/2-fluxo-de-status.png)

<details>
<summary>Código-fonte (Mermaid)</summary>

```mermaid
stateDiagram-v2
    [*] --> Registrada : registrar (validacoes OK)
    Registrada --> EmInspecao : solicitarInspecao
    Registrada --> Liberada : liberar [documentacao valida]
    Registrada --> Bloqueada : bloquear
    Registrada --> Cancelada : cancelar
    EmInspecao --> Liberada : liberar [documentacao valida]
    EmInspecao --> Bloqueada : bloquear
    EmInspecao --> Cancelada : cancelar
    Liberada --> Bloqueada : bloquear
    Liberada --> Liberada : movimentar [nao bloqueada]
    Bloqueada --> Liberada : desbloquear/liberar [documentacao valida]
    Bloqueada --> Cancelada : cancelar
    Cancelada --> [*]
```
</details>

---

## Diagrama de Contexto
> Apoio. Quem interage com o QuimiPort.

![Diagrama de Contexto](diagramas/3-diagrama-de-contexto.png)

---

## Diagrama de Casos de Uso
> Apoio. Atores e casos de uso.

![Diagrama de Casos de Uso](diagramas/4-casos-de-uso.png)

---

## Arquitetura em Camadas
> Apoio. A regra de dependência aponta sempre para o domínio (núcleo).

![Arquitetura em Camadas](diagramas/5-arquitetura-camadas.png)
