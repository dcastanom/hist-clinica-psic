# Manual de instalacion local (sin Docker)

Esta guia te permite instalar y usar la aplicacion **Historia Clinica
Psicologica** en un computador con Windows, sin necesidad de Docker ni de
conocimientos tecnicos previos. Se pensó para que puedas usar la app en
cualquier computador, incluso si varias personas del mismo consultorio la
usan al mismo tiempo desde esa maquina.

Solo tienes que seguir los pasos en orden, una sola vez. Despues de eso,
usar la aplicacion cada dia se reduce a hacer doble click en un archivo.

---

## Resumen de lo que vas a hacer

1. Instalar 3 programas gratuitos (Python, Node.js, MySQL) — una sola vez.
2. Crear la base de datos dentro de MySQL — una sola vez.
3. Ejecutar `instalar.bat` (doble click) — una sola vez.
4. Ejecutar `iniciar.bat` (doble click) — cada vez que quieras usar la app.

---

## Paso 1: Instalar Python

1. Ve a https://www.python.org/downloads/ y descarga la version mas reciente
   (Python 3.11 o superior).
2. Abre el instalador descargado.
3. **Muy importante**: en la primera pantalla del instalador, marca la
   casilla que dice **"Add python.exe to PATH"** (o "Add Python to PATH")
   antes de darle a "Install Now".
4. Espera a que termine la instalacion.

Para comprobar que quedo bien instalado, abre el "Simbolo del sistema" (busca
"cmd" en el menu de inicio) y escribe:

```
python --version
```

Deberia mostrarte algo como `Python 3.12.0`. Si te dice que el comando no se
reconoce, vuelve a instalar Python asegurandote de marcar la casilla del
paso 3.

## Paso 2: Instalar Node.js

1. Ve a https://nodejs.org/ y descarga la version **LTS** (la recomendada,
   no la "Current").
2. Abre el instalador y dale "Siguiente" a todo con las opciones por
   defecto.
3. Espera a que termine la instalacion.

Para comprobarlo, en el mismo "Simbolo del sistema" escribe:

```
node --version
npm --version
```

Deberian mostrarte un numero de version en ambos casos.

## Paso 3: Instalar MySQL

1. Ve a https://dev.mysql.com/downloads/installer/ y descarga
   "MySQL Installer for Windows".
2. Abre el instalador y elige el tipo de instalacion **"Server only"**
   (solo el servidor; no hace falta instalar todo el paquete completo).
3. Sigue el asistente con las opciones por defecto.
4. Cuando te pida configurar una contraseña para el usuario **root** de
   MySQL, elige una y **anotala en un lugar seguro** — la necesitaras en el
   siguiente paso.
5. Cuando el asistente pregunte si MySQL debe iniciar automaticamente como
   servicio de Windows, deja esa opcion activada (es la que viene marcada
   por defecto). Asi no tendras que iniciarlo manualmente cada vez.
6. Termina el asistente.

## Paso 4: Crear la base de datos

1. Abre "MySQL Workbench" (se instalo junto con MySQL en el paso anterior)
   o el "Simbolo del sistema".
2. Si usas MySQL Workbench: conectate con el usuario `root` y la
   contraseña que elegiste en el paso 3, abre una pestaña de consulta nueva
   (icono de rayo/SQL) y pega lo siguiente:

   ```sql
   CREATE DATABASE hist_clinica_psic CHARACTER SET utf8mb4;
   CREATE USER 'hist_user'@'localhost' IDENTIFIED BY 'hist_password';
   GRANT ALL PRIVILEGES ON hist_clinica_psic.* TO 'hist_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

   Ejecuta ese bloque completo (icono de rayo, o Ctrl+Shift+Enter).

3. Si prefieres el "Simbolo del sistema", ejecuta:

   ```
   mysql -u root -p
   ```

   Escribe tu contraseña de `root` cuando te la pida, y luego pega las
   mismas 4 lineas SQL de arriba, una por una, terminando cada una con
   Enter.

Con esto queda creada la base de datos `hist_clinica_psic` y un usuario
`hist_user` (contraseña `hist_password`) con permisos sobre ella. Estos son
los mismos valores que ya vienen configurados en `backend/.env.example`, asi
que no hace falta que cambies nada mas.

> Si prefieres usar otra contraseña para `hist_user`, puedes hacerlo, pero
> despues debes editar el archivo `backend/.env` (se crea en el paso
> siguiente) y cambiar la linea `DATABASE_URL` para que coincida.

## Paso 5: Ejecutar el instalador de la aplicacion

1. Abre la carpeta del proyecto (`hist-clinica-psic`).
2. Haz doble click en **`instalar.bat`**.
3. Se abrira una ventana negra (la consola) que va mostrando el progreso.
   Este paso puede tardar varios minutos la primera vez porque descarga e
   instala las dependencias del backend y del frontend — es normal.
4. Al final deberia mostrar el mensaje **"Instalacion completa."** junto con
   un usuario de prueba para iniciar sesion.

Si en algun punto aparece un mensaje que empieza con `[ERROR]`, léelo con
calma: te dice exactamente que revisar (por ejemplo, que falta instalar
Python, o que MySQL no esta corriendo) y en que paso de este manual
encontrar la solucion. Corrige eso y vuelve a hacer doble click en
`instalar.bat`.

Este paso normalmente solo se hace una vez. Solo tendrias que repetirlo si
el manual de una actualizacion futura te lo pide explicitamente.

## Paso 6: Usar la aplicacion (cada vez)

1. Haz doble click en **`iniciar.bat`**.
2. Se abriran automaticamente **dos ventanas negras** (una para el
   "Backend" y otra para el "Frontend") y, unos segundos despues, tu
   navegador con la aplicacion ya abierta en `http://localhost:5173`.
3. Ya puedes usar la aplicacion normalmente.

Usuario administrador de prueba (creado por `instalar.bat`):

- Email: `admin@example.com`
- Password: `Admin12345!`

### Como detener la aplicacion

Simplemente **cierra las dos ventanas negras** ("Backend - Historia
Clinica" y "Frontend - Historia Clinica"). Con eso queda todo apagado. La
base de datos de MySQL puede seguir corriendo en segundo plano sin
problema — no ocupa recursos relevantes y no hace falta apagarla.

---

## Solucion de problemas comunes

**"No se pudo conectar a MySQL en localhost:3306"**
El servicio de MySQL no esta iniciado. Presiona la tecla Windows, escribe
"Servicios", busca uno que empiece con "MySQL" (por ejemplo `MySQL80`),
click derecho sobre el y elige "Iniciar". Vuelve a ejecutar `iniciar.bat`.

**"No se encontro Python" / "No se encontro Node.js"**
Vuelve al paso 1 o 2 de este manual. Es probable que falte marcar la
casilla de "Add to PATH" durante la instalacion, o que haga falta cerrar y
volver a abrir la ventana de "Simbolo del sistema" para que reconozca el
nuevo programa instalado.

**Fallo la aplicacion de migraciones ("alembic upgrade head")**
Casi siempre significa que la base de datos o el usuario del paso 4 no se
crearon correctamente, o que la contraseña no coincide con
`backend/.env`. Repite el paso 4 con cuidado.

**Las ventanas del backend o frontend muestran un error de "puerto ya en uso" (`address already in use`)**
Esto pasa si ya tienes la aplicacion corriendo con Docker al mismo tiempo (o
si `iniciar.bat` ya estaba corriendo desde antes). Docker y esta instalacion
nativa usan los mismos puertos (8000 y 5173), asi que no pueden estar
corriendo los dos a la vez en el mismo computador. Cierra uno de los dos
antes de iniciar el otro.

**La pagina no carga en el navegador**
Espera unos segundos mas — el backend y el frontend tardan un momento en
arrancar la primera vez. Si despues de un minuto sigue sin cargar, revisa
las dos ventanas negras: si alguna muestra un error en rojo, ese texto
indica que fallo.

**Quiero volver a instalar todo desde cero**
Puedes borrar la carpeta `backend\.venv` y volver a ejecutar
`instalar.bat`. Los datos guardados en MySQL no se pierden con esto (viven
en MySQL, no en esa carpeta).

---

## Notas para quien de soporte tecnico

- La app usa MySQL en `localhost:3306`, base de datos `hist_clinica_psic`,
  usuario `hist_user` — configurado en `backend/.env` (variable
  `DATABASE_URL`), no en `backend/.env.example` (ese es solo la plantilla).
- `instalar.bat` crea `backend/.env` a partir de `backend/.env.example`
  **solo si no existe todavia**, para no pisar cambios manuales.
- `instalar.bat` es idempotente: se puede ejecutar varias veces sin
  problema (no duplica datos, no reinstala lo que ya esta al dia).
- Backend: FastAPI servido con `uvicorn` en el puerto 8000. Frontend: Vite
  en modo desarrollo en el puerto 5173. Ambos corren como procesos nativos
  de Windows (sin contenedores), cada uno en su propia ventana de consola
  abierta por `iniciar.bat`.
- Este manual es independiente del flujo con Docker documentado en
  `README.md` (pensado para desarrollo). Ambos flujos pueden coexistir en
  la misma maquina sin chocar entre si, porque usan archivos `.env`
  distintos (`./.env` para Docker, `backend/.env` para este manual).
