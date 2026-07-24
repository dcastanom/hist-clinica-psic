# Analisis de requerimientos y modelo de datos

## 1. Alcance de la aplicacion

La aplicacion gestionara historias clinicas psicologicas en un entorno multi-tenant, donde varios consultorios pueden usar la misma plataforma y cada consultorio puede tener varios psicologos.

El sistema debe permitir:

- Registro de psicologos asociados a uno o varios consultorios.
- Autorizacion de psicologos por parte del administrador del consultorio.
- Acceso restringido por consultorio y por psicologo.
- Gestion de pacientes asignados a un psicologo.
- Gestion de procesos terapeuticos por paciente.
- Gestion de sesiones por proceso.
- Gestion de compromisos y seguimientos por sesion.
- Generacion de resumenes e historia clinica completa para imprimir o enviar por correo.

## 2. Reglas de negocio identificadas

### Consultorios

- Los consultorios ya existen antes del registro de psicologos.
- No se requieren formularios de administracion de consultorios en la primera version.
- Cada consultorio tiene un NIT y un nombre.
- Un consultorio puede tener muchos psicologos.
- Solo puede haber un administrador por consultorio.

### Psicologos

- El email identifica al psicologo dentro de la plataforma.
- Un psicologo puede pertenecer a uno o varios consultorios.
- La pertenencia de un psicologo a un consultorio debe tener un estado de autorizacion.
- Un psicologo no autorizado en un consultorio no puede acceder a la aplicacion en el contexto de ese consultorio.
- Un psicologo administrador puede autorizar nuevos psicologos dentro de su consultorio.

### Pacientes

- Cada paciente pertenece a un consultorio y esta asignado a un psicologo responsable.
- Un psicologo solo puede ver y modificar sus propios pacientes.
- Un psicologo no debe ver pacientes de otros psicologos, incluso si pertenecen al mismo consultorio.
- Un paciente puede tener varios procesos.

### Procesos

- Un proceso pertenece a un paciente.
- Un proceso representa un ciclo de atencion psicologica.
- Un proceso puede tener varias sesiones.
- El proceso almacena informacion clinica general del ciclo, incluyendo motivo de consulta, historia de vida, impresion diagnostica, logros, cierre y recomendaciones.

### Sesiones

- Una sesion pertenece a un proceso.
- Cada sesion tiene fecha y numero.
- Cada sesion permite registrar notas clinicas de la atencion.
- Un proceso puede tener muchas sesiones.
- El numero de sesion debe ser unico dentro del proceso.

### Compromisos

- Un compromiso pertenece a una sesion.
- Una sesion puede tener varios compromisos.
- Cada compromiso registra descripcion y resultado o seguimiento.

### Seguridad y multi-tenancy

- Toda consulta de datos clinicos debe filtrarse por consultorio y psicologo.
- La aplicacion usara autenticacion JWT.
- El backend debe validar permisos en cada endpoint, no solo ocultar datos desde el frontend.
- La relacion psicologo-consultorio es clave para resolver autorizacion, rol y contexto activo.

## 3. Supuestos aprobados

Estos puntos fueron propuestos para cerrar ambiguedades del requerimiento y quedan aprobados para la primera version:

- El psicologo inicia sesion con email y password.
- Si el psicologo pertenece a varios consultorios, despues de autenticarse debe seleccionar o activar un consultorio de trabajo.
- La autorizacion se maneja por consultorio, no globalmente.
- El paciente puede tener el mismo documento en distintos consultorios sin mezclar informacion clinica.
- En una primera version, un paciente pertenece a un unico psicologo responsable dentro de un consultorio.
- La edad puede calcularse desde la fecha de nacimiento, por lo que no conviene persistirla como dato principal. Se puede mostrar calculada en la interfaz.
- La historia clinica completa se puede generar desde pacientes, procesos, sesiones y compromisos, sin requerir una tabla separada para el documento generado.
- El envio por correo debe quedar registrado como auditoria basica en una tabla de envios.

## 4. Entidades principales

### 4.1 Consultorio

Representa un centro de atencion o consultorio.

Campos:

| Campo | Tipo sugerido | Reglas |
| --- | --- | --- |
| id | BIGINT | PK |
| nit | VARCHAR(30) | Requerido, unico |
| nombre | VARCHAR(150) | Requerido |
| activo | BOOLEAN | Default true |
| created_at | DATETIME | Requerido |
| updated_at | DATETIME | Requerido |

### 4.2 Psicologo

Representa al usuario profesional que accede a la aplicacion.

Campos:

| Campo | Tipo sugerido | Reglas |
| --- | --- | --- |
| id | BIGINT | PK |
| cedula | VARCHAR(30) | Requerido |
| nombre | VARCHAR(150) | Requerido |
| especialidad | VARCHAR(150) | Opcional |
| tarjeta_profesional | VARCHAR(80) | Opcional |
| telefono_contacto | VARCHAR(30) | Opcional |
| email | VARCHAR(180) | Requerido, unico |
| password_hash | VARCHAR(255) | Requerido |
| avatar_url | VARCHAR(500) | Opcional |
| activo | BOOLEAN | Default true |
| created_at | DATETIME | Requerido |
| updated_at | DATETIME | Requerido |

Notas:

- No se debe guardar el password en texto plano.
- `password_hash` debe generarse con un algoritmo seguro, por ejemplo bcrypt.

### 4.3 PsicologoConsultorio

Tabla puente entre psicologos y consultorios. Resuelve multi-tenancy, autorizacion y rol.

Campos:

| Campo | Tipo sugerido | Reglas |
| --- | --- | --- |
| id | BIGINT | PK |
| psicologo_id | BIGINT | FK a psicologos.id |
| consultorio_id | BIGINT | FK a consultorios.id |
| rol | ENUM('ADMIN', 'PSICOLOGO') | Requerido |
| estado | ENUM('PENDIENTE', 'AUTORIZADO', 'RECHAZADO', 'INACTIVO') | Requerido |
| autorizado_por_id | BIGINT | FK a psicologos.id, opcional |
| autorizado_at | DATETIME | Opcional |
| created_at | DATETIME | Requerido |
| updated_at | DATETIME | Requerido |

Restricciones:

- Unico compuesto: `(psicologo_id, consultorio_id)`.
- Solo un administrador autorizado por consultorio.
- Un psicologo con estado distinto de `AUTORIZADO` no puede operar en ese consultorio.

Implementacion sugerida para "solo un administrador":

- En MySQL puede resolverse desde la aplicacion y reforzarse con una columna generada o validacion transaccional.
- Como regla minima, todo cambio de rol a `ADMIN` debe verificar que no exista otro administrador autorizado en el mismo consultorio.

### 4.4 Paciente

Representa la informacion general del paciente.

Campos:

| Campo | Tipo sugerido | Reglas |
| --- | --- | --- |
| id | BIGINT | PK |
| consultorio_id | BIGINT | FK a consultorios.id |
| psicologo_id | BIGINT | FK a psicologos.id |
| nombre | VARCHAR(150) | Requerido |
| documento_identidad | VARCHAR(40) | Requerido |
| fecha_nacimiento | DATE | Opcional |
| escolaridad | VARCHAR(120) | Opcional |
| direccion_casa | VARCHAR(250) | Opcional |
| telefono_casa | VARCHAR(30) | Opcional |
| telefono_celular | VARCHAR(30) | Opcional |
| email | VARCHAR(180) | Opcional |
| activo | BOOLEAN | Default true |
| created_at | DATETIME | Requerido |
| updated_at | DATETIME | Requerido |

Restricciones:

- Indice compuesto: `(consultorio_id, psicologo_id)`.
- Unico sugerido: `(consultorio_id, psicologo_id, documento_identidad)`.

Notas:

- No se persiste `edad` porque es derivada de `fecha_nacimiento`.
- Si mas adelante se requiere que varios psicologos atiendan al mismo paciente, se puede introducir una tabla `paciente_psicologo`.

### 4.5 Proceso

Representa un proceso de atencion de un paciente.

Campos:

| Campo | Tipo sugerido | Reglas |
| --- | --- | --- |
| id | BIGINT | PK |
| paciente_id | BIGINT | FK a pacientes.id |
| fecha_vinculacion | DATE | Requerido |
| motivo_consulta | TEXT | Opcional |
| aspectos_historia_vida | TEXT | Opcional |
| impresion_diagnostica | TEXT | Opcional |
| logros_significativos | TEXT | Opcional |
| cierre_proceso | TEXT | Opcional |
| recomendaciones | TEXT | Opcional |
| estado | ENUM('ABIERTO', 'CERRADO') | Default 'ABIERTO' |
| created_at | DATETIME | Requerido |
| updated_at | DATETIME | Requerido |

Restricciones:

- Indice: `(paciente_id, estado)`.

### 4.6 Sesion

Representa una sesion de atencion dentro de un proceso.

Campos:

| Campo | Tipo sugerido | Reglas |
| --- | --- | --- |
| id | BIGINT | PK |
| proceso_id | BIGINT | FK a procesos.id |
| fecha_sesion | DATE | Requerido |
| numero_sesion | INT | Requerido |
| notas_sesion | TEXT | Opcional |
| created_at | DATETIME | Requerido |
| updated_at | DATETIME | Requerido |

Restricciones:

- Unico compuesto: `(proceso_id, numero_sesion)`.
- Indice: `(proceso_id, fecha_sesion)`.

Nota:

- `notas_sesion` se incluye para registrar notas clinicas generales de cada sesion.

### 4.7 Compromiso

Representa un compromiso definido en una sesion y su seguimiento.

Campos:

| Campo | Tipo sugerido | Reglas |
| --- | --- | --- |
| id | BIGINT | PK |
| sesion_id | BIGINT | FK a sesiones.id |
| descripcion | TEXT | Requerido |
| resultado_seguimiento | TEXT | Opcional |
| estado | ENUM('PENDIENTE', 'EN_SEGUIMIENTO', 'CUMPLIDO', 'NO_CUMPLIDO') | Default 'PENDIENTE' |
| created_at | DATETIME | Requerido |
| updated_at | DATETIME | Requerido |

Restricciones:

- Indice: `(sesion_id, estado)`.

### 4.8 RegistroEnvioHistoria

Registra envios por correo de resumenes o historia clinica.

Campos:

| Campo | Tipo sugerido | Reglas |
| --- | --- | --- |
| id | BIGINT | PK |
| paciente_id | BIGINT | FK a pacientes.id |
| psicologo_id | BIGINT | FK a psicologos.id |
| consultorio_id | BIGINT | FK a consultorios.id |
| tipo_documento | ENUM('RESUMEN_SESIONES', 'RESUMEN_PROCESO', 'HISTORIA_COMPLETA') | Requerido |
| email_destino | VARCHAR(180) | Requerido |
| enviado_at | DATETIME | Requerido |
| estado | ENUM('ENVIADO', 'FALLIDO') | Requerido |
| error | TEXT | Opcional |

Notas:

- Esta tabla no es indispensable para mostrar la historia clinica, pero es conveniente para auditoria.
- En salud, conviene conservar trazabilidad de documentos enviados.

## 5. Relaciones

Resumen cardinal:

- `consultorios 1:N psicologo_consultorio`
- `psicologos 1:N psicologo_consultorio`
- `consultorios 1:N pacientes`
- `psicologos 1:N pacientes`
- `pacientes 1:N procesos`
- `procesos 1:N sesiones`
- `sesiones 1:N compromisos`
- `pacientes 1:N registro_envio_historia`

Diagrama textual:

```text
consultorios
  |-- psicologo_consultorio -- psicologos
  |-- pacientes -- procesos -- sesiones -- compromisos
  |-- registro_envio_historia

psicologos
  |-- pacientes
  |-- registro_envio_historia
```

## 6. Politica de acceso a datos

Cada endpoint clinico debe validar el contexto activo:

1. El JWT identifica al psicologo autenticado.
2. El request indica o deriva el `consultorio_id` activo.
3. El backend verifica que exista `psicologo_consultorio` con:
   - `psicologo_id` del usuario autenticado.
   - `consultorio_id` activo.
   - `estado = 'AUTORIZADO'`.
4. Para pacientes, procesos, sesiones y compromisos, el backend debe comprobar propiedad:
   - El paciente debe pertenecer al mismo `consultorio_id`.
   - El paciente debe tener `psicologo_id` igual al usuario autenticado.

La unica excepcion funcional inicial es el administrador del consultorio para autorizar psicologos. El administrador no queda autorizado automaticamente para ver historias clinicas de otros psicologos, salvo que se defina explicitamente lo contrario.

## 7. Modelo fisico sugerido para MySQL

Nombres de tablas propuestos:

- `consultorios`
- `psicologos`
- `psicologo_consultorio`
- `pacientes`
- `procesos`
- `sesiones`
- `compromisos`
- `registro_envio_historia`

Convenciones:

- Llaves primarias `BIGINT AUTO_INCREMENT`.
- Fechas de auditoria `created_at` y `updated_at`.
- Borrado logico con `activo` donde aplique.
- Indices en todas las llaves foraneas.
- Validaciones de permisos en servicio/backend, no solo en consultas del frontend.

## 8. DDL inicial propuesto

```sql
CREATE TABLE consultorios (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  nit VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE psicologos (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  cedula VARCHAR(30) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  especialidad VARCHAR(150),
  tarjeta_profesional VARCHAR(80),
  telefono_contacto VARCHAR(30),
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE psicologo_consultorio (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  psicologo_id BIGINT NOT NULL,
  consultorio_id BIGINT NOT NULL,
  rol ENUM('ADMIN', 'PSICOLOGO') NOT NULL DEFAULT 'PSICOLOGO',
  estado ENUM('PENDIENTE', 'AUTORIZADO', 'RECHAZADO', 'INACTIVO') NOT NULL DEFAULT 'PENDIENTE',
  autorizado_por_id BIGINT NULL,
  autorizado_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pc_psicologo FOREIGN KEY (psicologo_id) REFERENCES psicologos(id),
  CONSTRAINT fk_pc_consultorio FOREIGN KEY (consultorio_id) REFERENCES consultorios(id),
  CONSTRAINT fk_pc_autorizado_por FOREIGN KEY (autorizado_por_id) REFERENCES psicologos(id),
  CONSTRAINT uq_pc_psicologo_consultorio UNIQUE (psicologo_id, consultorio_id),
  INDEX idx_pc_consultorio_estado (consultorio_id, estado),
  INDEX idx_pc_psicologo_estado (psicologo_id, estado)
);

CREATE TABLE pacientes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  consultorio_id BIGINT NOT NULL,
  psicologo_id BIGINT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  documento_identidad VARCHAR(40) NOT NULL,
  fecha_nacimiento DATE NULL,
  escolaridad VARCHAR(120),
  direccion_casa VARCHAR(250),
  telefono_casa VARCHAR(30),
  telefono_celular VARCHAR(30),
  email VARCHAR(180),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_paciente_consultorio FOREIGN KEY (consultorio_id) REFERENCES consultorios(id),
  CONSTRAINT fk_paciente_psicologo FOREIGN KEY (psicologo_id) REFERENCES psicologos(id),
  CONSTRAINT uq_paciente_documento_por_psicologo UNIQUE (consultorio_id, psicologo_id, documento_identidad),
  INDEX idx_paciente_tenant_owner (consultorio_id, psicologo_id)
);

CREATE TABLE procesos (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  paciente_id BIGINT NOT NULL,
  fecha_vinculacion DATE NOT NULL,
  motivo_consulta TEXT,
  aspectos_historia_vida TEXT,
  impresion_diagnostica TEXT,
  logros_significativos TEXT,
  cierre_proceso TEXT,
  recomendaciones TEXT,
  estado ENUM('ABIERTO', 'CERRADO') NOT NULL DEFAULT 'ABIERTO',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_proceso_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  INDEX idx_proceso_paciente_estado (paciente_id, estado)
);

CREATE TABLE sesiones (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  proceso_id BIGINT NOT NULL,
  fecha_sesion DATE NOT NULL,
  numero_sesion INT NOT NULL,
  notas_sesion TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sesion_proceso FOREIGN KEY (proceso_id) REFERENCES procesos(id),
  CONSTRAINT uq_sesion_numero_por_proceso UNIQUE (proceso_id, numero_sesion),
  INDEX idx_sesion_proceso_fecha (proceso_id, fecha_sesion)
);

CREATE TABLE compromisos (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  sesion_id BIGINT NOT NULL,
  descripcion TEXT NOT NULL,
  resultado_seguimiento TEXT,
  estado ENUM('PENDIENTE', 'EN_SEGUIMIENTO', 'CUMPLIDO', 'NO_CUMPLIDO') NOT NULL DEFAULT 'PENDIENTE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_compromiso_sesion FOREIGN KEY (sesion_id) REFERENCES sesiones(id),
  INDEX idx_compromiso_sesion_estado (sesion_id, estado)
);

CREATE TABLE registro_envio_historia (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  paciente_id BIGINT NOT NULL,
  psicologo_id BIGINT NOT NULL,
  consultorio_id BIGINT NOT NULL,
  tipo_documento ENUM('RESUMEN_SESIONES', 'RESUMEN_PROCESO', 'HISTORIA_COMPLETA') NOT NULL,
  email_destino VARCHAR(180) NOT NULL,
  enviado_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('ENVIADO', 'FALLIDO') NOT NULL,
  error TEXT,
  CONSTRAINT fk_envio_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  CONSTRAINT fk_envio_psicologo FOREIGN KEY (psicologo_id) REFERENCES psicologos(id),
  CONSTRAINT fk_envio_consultorio FOREIGN KEY (consultorio_id) REFERENCES consultorios(id),
  INDEX idx_envio_paciente_fecha (paciente_id, enviado_at),
  INDEX idx_envio_tenant_owner (consultorio_id, psicologo_id)
);
```

## 9. Decisiones aprobadas y observaciones futuras

- El administrador del consultorio solo puede autorizar psicologos. No puede ver todas las historias clinicas del consultorio; solo puede ver las historias de los pacientes que le pertenecen como psicologo tratante.
- Una misma persona paciente no puede ser atendida por varios psicologos dentro del mismo consultorio en la primera version.
- Las sesiones deben incluir `notas_sesion TEXT` como campo clinico adicional.
- No se incluiran reglas especificas de consentimiento y tratamiento de datos personales en la primera version.
- Los adjuntos, documentos firmados e imagenes del paciente quedan fuera de la primera version. Se dejan como observacion para revision futura.
- No se requiere auditoria completa de cambios sobre historia clinica en la primera version. Se deja como observacion para revision futura.

## 10. Recomendacion para primera version

Para una primera version codificable, se recomienda implementar:

- Autenticacion JWT.
- Registro de psicologos.
- Vinculacion de psicologos a consultorios preexistentes.
- Flujo de autorizacion por administrador.
- CRUD de pacientes propios.
- CRUD de procesos por paciente.
- CRUD de sesiones por proceso.
- CRUD de compromisos por sesion.
- Vista imprimible de resumen e historia clinica completa.
- Envio por correo con registro basico de auditoria.

El modelo anterior cubre estos puntos sin introducir complejidad innecesaria y deja espacio para evolucionar hacia auditoria avanzada, adjuntos, consentimiento informado y atencion compartida por varios psicologos.


