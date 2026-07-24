from app.core.config import Settings


def test_cors_origin_list_strips_trailing_slash():
    """El navegador manda el header Origin sin barra final; si alguien
    configura CORS_ORIGINS con una barra final por error, CORSMiddleware
    nunca coincide y bloquea todo en silencio (bug real encontrado en un
    despliegue: CORS_ORIGINS=http://1.2.3.4/ no dejaba pasar nada)."""
    settings = Settings(cors_origins="http://1.2.3.4/")
    assert settings.cors_origin_list == ["http://1.2.3.4"]


def test_cors_origin_list_handles_multiple_origins_with_spaces_and_slashes():
    settings = Settings(cors_origins="http://a.com/, http://b.com , http://c.com/")
    assert settings.cors_origin_list == ["http://a.com", "http://b.com", "http://c.com"]


def test_cors_origin_list_ignores_empty_entries():
    settings = Settings(cors_origins="http://a.com,,  ,http://b.com")
    assert settings.cors_origin_list == ["http://a.com", "http://b.com"]
