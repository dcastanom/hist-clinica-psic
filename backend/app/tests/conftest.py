import pytest
from fastapi.testclient import TestClient
from sqlalchemy import BigInteger, create_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Consultorio


@compiles(BigInteger, "sqlite")
def _compile_big_integer_sqlite(type_, compiler, **kw):
    # SQLite solo autogenera valores para columnas declaradas exactamente
    # como INTEGER PRIMARY KEY (alias de rowid). BigInteger se compila como
    # BIGINT, lo que rompe el autoincrement en las claves primarias.
    return "INTEGER"


@pytest.fixture()
def engine():
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(test_engine)
    yield test_engine
    test_engine.dispose()


@pytest.fixture()
def session_factory(engine):
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


@pytest.fixture()
def db_session(session_factory) -> Session:
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(session_factory) -> TestClient:
    def override_get_db():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def consultorio(db_session: Session) -> Consultorio:
    entidad = Consultorio(nit="900000001-1", nombre="Consultorio Uno")
    db_session.add(entidad)
    db_session.commit()
    db_session.refresh(entidad)
    return entidad


@pytest.fixture()
def otro_consultorio(db_session: Session) -> Consultorio:
    entidad = Consultorio(nit="900000002-2", nombre="Consultorio Dos")
    db_session.add(entidad)
    db_session.commit()
    db_session.refresh(entidad)
    return entidad
