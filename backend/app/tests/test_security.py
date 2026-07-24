from jose import jwt

from app.core import security
from app.core.config import settings


def test_hash_password_roundtrip():
    hashed = security.hash_password("Sup3rSecret!")
    assert hashed != "Sup3rSecret!"
    assert security.verify_password("Sup3rSecret!", hashed)


def test_verify_password_rejects_wrong_password():
    hashed = security.hash_password("Sup3rSecret!")
    assert not security.verify_password("otra-clave", hashed)


def test_hash_password_generates_different_hash_each_time():
    first = security.hash_password("Sup3rSecret!")
    second = security.hash_password("Sup3rSecret!")
    assert first != second


def test_create_access_token_contains_subject_and_expiration():
    token = security.create_access_token("42")
    payload = jwt.decode(token, settings.secret_key, algorithms=[security.ALGORITHM])
    assert payload["sub"] == "42"
    assert "exp" in payload


def test_create_access_token_includes_extra_claims():
    token = security.create_access_token("7", extra_claims={"rol": "ADMIN"})
    payload = jwt.decode(token, settings.secret_key, algorithms=[security.ALGORITHM])
    assert payload["rol"] == "ADMIN"
