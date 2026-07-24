"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-07-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "consultorios",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("nit", sa.String(length=30), nullable=False),
        sa.Column("nombre", sa.String(length=150), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("nit"),
    )

    op.create_table(
        "psicologos",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("cedula", sa.String(length=30), nullable=False),
        sa.Column("nombre", sa.String(length=150), nullable=False),
        sa.Column("especialidad", sa.String(length=150), nullable=True),
        sa.Column("tarjeta_profesional", sa.String(length=80), nullable=True),
        sa.Column("telefono_contacto", sa.String(length=30), nullable=True),
        sa.Column("email", sa.String(length=180), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_psicologos_email", "psicologos", ["email"])

    op.create_table(
        "psicologo_consultorio",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("psicologo_id", sa.BigInteger(), nullable=False),
        sa.Column("consultorio_id", sa.BigInteger(), nullable=False),
        sa.Column("rol", sa.Enum("ADMIN", "PSICOLOGO", name="rolconsultorio"), nullable=False),
        sa.Column(
            "estado",
            sa.Enum("PENDIENTE", "AUTORIZADO", "RECHAZADO", "INACTIVO", name="estadovinculacion"),
            nullable=False,
        ),
        sa.Column("autorizado_por_id", sa.BigInteger(), nullable=True),
        sa.Column("autorizado_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["autorizado_por_id"], ["psicologos.id"]),
        sa.ForeignKeyConstraint(["consultorio_id"], ["consultorios.id"]),
        sa.ForeignKeyConstraint(["psicologo_id"], ["psicologos.id"]),
        sa.UniqueConstraint("psicologo_id", "consultorio_id", name="uq_pc_psicologo_consultorio"),
    )
    op.create_index("idx_pc_consultorio_estado", "psicologo_consultorio", ["consultorio_id", "estado"])
    op.create_index("idx_pc_psicologo_estado", "psicologo_consultorio", ["psicologo_id", "estado"])

    op.create_table(
        "pacientes",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("consultorio_id", sa.BigInteger(), nullable=False),
        sa.Column("psicologo_id", sa.BigInteger(), nullable=False),
        sa.Column("nombre", sa.String(length=150), nullable=False),
        sa.Column("documento_identidad", sa.String(length=40), nullable=False),
        sa.Column("fecha_nacimiento", sa.Date(), nullable=True),
        sa.Column("escolaridad", sa.String(length=120), nullable=True),
        sa.Column("direccion_casa", sa.String(length=250), nullable=True),
        sa.Column("telefono_casa", sa.String(length=30), nullable=True),
        sa.Column("telefono_celular", sa.String(length=30), nullable=True),
        sa.Column("email", sa.String(length=180), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["consultorio_id"], ["consultorios.id"]),
        sa.ForeignKeyConstraint(["psicologo_id"], ["psicologos.id"]),
        sa.UniqueConstraint(
            "consultorio_id",
            "psicologo_id",
            "documento_identidad",
            name="uq_paciente_documento_por_psicologo",
        ),
    )
    op.create_index("idx_paciente_tenant_owner", "pacientes", ["consultorio_id", "psicologo_id"])

    op.create_table(
        "procesos",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("paciente_id", sa.BigInteger(), nullable=False),
        sa.Column("fecha_vinculacion", sa.Date(), nullable=False),
        sa.Column("motivo_consulta", sa.Text(), nullable=True),
        sa.Column("aspectos_historia_vida", sa.Text(), nullable=True),
        sa.Column("impresion_diagnostica", sa.Text(), nullable=True),
        sa.Column("logros_significativos", sa.Text(), nullable=True),
        sa.Column("cierre_proceso", sa.Text(), nullable=True),
        sa.Column("recomendaciones", sa.Text(), nullable=True),
        sa.Column("estado", sa.Enum("ABIERTO", "CERRADO", name="estadoproceso"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["paciente_id"], ["pacientes.id"]),
    )
    op.create_index("idx_proceso_paciente_estado", "procesos", ["paciente_id", "estado"])

    op.create_table(
        "sesiones",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("proceso_id", sa.BigInteger(), nullable=False),
        sa.Column("fecha_sesion", sa.Date(), nullable=False),
        sa.Column("numero_sesion", sa.Integer(), nullable=False),
        sa.Column("notas_sesion", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["proceso_id"], ["procesos.id"]),
        sa.UniqueConstraint("proceso_id", "numero_sesion", name="uq_sesion_numero_por_proceso"),
    )
    op.create_index("idx_sesion_proceso_fecha", "sesiones", ["proceso_id", "fecha_sesion"])

    op.create_table(
        "compromisos",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("sesion_id", sa.BigInteger(), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=False),
        sa.Column("resultado_seguimiento", sa.Text(), nullable=True),
        sa.Column(
            "estado",
            sa.Enum("PENDIENTE", "EN_SEGUIMIENTO", "CUMPLIDO", "NO_CUMPLIDO", name="estadocompromiso"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["sesion_id"], ["sesiones.id"]),
    )
    op.create_index("idx_compromiso_sesion_estado", "compromisos", ["sesion_id", "estado"])

    op.create_table(
        "registro_envio_historia",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("paciente_id", sa.BigInteger(), nullable=False),
        sa.Column("psicologo_id", sa.BigInteger(), nullable=False),
        sa.Column("consultorio_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "tipo_documento",
            sa.Enum("RESUMEN_SESIONES", "RESUMEN_PROCESO", "HISTORIA_COMPLETA", name="tipodocumentoenvio"),
            nullable=False,
        ),
        sa.Column("email_destino", sa.String(length=180), nullable=False),
        sa.Column("enviado_at", sa.DateTime(), nullable=False),
        sa.Column("estado", sa.Enum("ENVIADO", "FALLIDO", name="estadoenvio"), nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["consultorio_id"], ["consultorios.id"]),
        sa.ForeignKeyConstraint(["paciente_id"], ["pacientes.id"]),
        sa.ForeignKeyConstraint(["psicologo_id"], ["psicologos.id"]),
    )
    op.create_index("idx_envio_paciente_fecha", "registro_envio_historia", ["paciente_id", "enviado_at"])
    op.create_index("idx_envio_tenant_owner", "registro_envio_historia", ["consultorio_id", "psicologo_id"])


def downgrade() -> None:
    op.drop_index("idx_envio_tenant_owner", table_name="registro_envio_historia")
    op.drop_index("idx_envio_paciente_fecha", table_name="registro_envio_historia")
    op.drop_table("registro_envio_historia")
    op.drop_index("idx_compromiso_sesion_estado", table_name="compromisos")
    op.drop_table("compromisos")
    op.drop_index("idx_sesion_proceso_fecha", table_name="sesiones")
    op.drop_table("sesiones")
    op.drop_index("idx_proceso_paciente_estado", table_name="procesos")
    op.drop_table("procesos")
    op.drop_index("idx_paciente_tenant_owner", table_name="pacientes")
    op.drop_table("pacientes")
    op.drop_index("idx_pc_psicologo_estado", table_name="psicologo_consultorio")
    op.drop_index("idx_pc_consultorio_estado", table_name="psicologo_consultorio")
    op.drop_table("psicologo_consultorio")
    op.drop_index("ix_psicologos_email", table_name="psicologos")
    op.drop_table("psicologos")
    op.drop_table("consultorios")
