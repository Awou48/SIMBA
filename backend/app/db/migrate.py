"""Lightweight schema sync for development databases.

`Base.metadata.create_all` only creates missing *tables*. When a model gains a
new nullable column, this adds it to an existing table so the app keeps working
without a full Alembic setup. It never drops or alters existing columns.
"""
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from app.db.database import Base


def add_missing_columns(engine: Engine) -> list[str]:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    added: list[str] = []

    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue
            present = {col["name"] for col in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in present:
                    continue
                if not column.nullable and column.default is None and column.server_default is None:
                    raise RuntimeError(
                        f"Cannot auto-add NOT NULL column {table.name}.{column.name} without a default"
                    )
                col_type = column.type.compile(dialect=engine.dialect)
                conn.execute(text(f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}'))
                added.append(f"{table.name}.{column.name}")
    return added


def sync_schema(engine: Engine) -> list[str]:
    """create_all for new tables, then add any columns new to existing tables."""
    Base.metadata.create_all(bind=engine)
    return add_missing_columns(engine)
