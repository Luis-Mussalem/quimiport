-- CreateEnum
CREATE TYPE "status_produto" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "status_carga" AS ENUM ('REGISTRADA', 'EM_ANALISE', 'EM_INSPECAO', 'LIBERADA', 'BLOQUEADA', 'EM_MOVIMENTACAO', 'FINALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "unidade_de_medida" AS ENUM ('KG', 'T', 'L', 'M3');

-- CreateEnum
CREATE TYPE "tipo_de_documento" AS ENUM ('FDS', 'FICHA_DE_EMERGENCIA', 'DECLARACAO_DE_MERCADORIA_PERIGOSA');

-- CreateTable
CREATE TABLE "produto_quimico" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "numero_onu" VARCHAR(6),
    "classe_de_risco" VARCHAR(3) NOT NULL,
    "grupo_de_compatibilidade" VARCHAR(30),
    "status" "status_produto" NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMPTZ(3) NOT NULL,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "produto_quimico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carga_quimica" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "produto_id" UUID NOT NULL,
    "quantidade" DECIMAL(14,3) NOT NULL,
    "unidade_de_medida" "unidade_de_medida" NOT NULL,
    "origem" VARCHAR(150) NOT NULL,
    "destino" VARCHAR(150) NOT NULL,
    "responsavel_tecnico" VARCHAR(150) NOT NULL,
    "status" "status_carga" NOT NULL,
    "data_de_entrada" TIMESTAMPTZ(3) NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criado_em" TIMESTAMPTZ(3) NOT NULL,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "carga_quimica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_carga" (
    "carga_id" UUID NOT NULL,
    "tipo" "tipo_de_documento" NOT NULL,
    "apresentado" BOOLEAN NOT NULL DEFAULT false,
    "apresentado_em" TIMESTAMPTZ(3),

    CONSTRAINT "documento_carga_pkey" PRIMARY KEY ("carga_id","tipo")
);

-- CreateTable
CREATE TABLE "historico_status_carga" (
    "id" UUID NOT NULL,
    "carga_id" UUID NOT NULL,
    "ordem" INTEGER NOT NULL,
    "status_anterior" "status_carga",
    "status_novo" "status_carga" NOT NULL,
    "motivo" VARCHAR(500),
    "ocorrido_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "historico_status_carga_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "produto_quimico_status_idx" ON "produto_quimico"("status");

-- CreateIndex
CREATE UNIQUE INDEX "carga_quimica_codigo_key" ON "carga_quimica"("codigo");

-- CreateIndex
CREATE INDEX "carga_quimica_status_idx" ON "carga_quimica"("status");

-- CreateIndex
CREATE INDEX "carga_quimica_produto_id_idx" ON "carga_quimica"("produto_id");

-- CreateIndex
CREATE UNIQUE INDEX "historico_status_carga_carga_id_ordem_key" ON "historico_status_carga"("carga_id", "ordem");

-- AddForeignKey
ALTER TABLE "carga_quimica" ADD CONSTRAINT "carga_quimica_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto_quimico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_carga" ADD CONSTRAINT "documento_carga_carga_id_fkey" FOREIGN KEY ("carga_id") REFERENCES "carga_quimica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status_carga" ADD CONSTRAINT "historico_status_carga_carga_id_fkey" FOREIGN KEY ("carga_id") REFERENCES "carga_quimica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
