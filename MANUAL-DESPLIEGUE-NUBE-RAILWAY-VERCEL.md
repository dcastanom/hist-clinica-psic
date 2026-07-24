# Manual de despliegue en la nube: Railway + Vercel

Esta es la opcion **mas simple** para publicar la aplicacion en internet:
todo se hace desde paneles web, sin tocar servidores ni la terminal (salvo
para subir el codigo a GitHub, un par de comandos que ya se detallan aqui).

- **Backend + base de datos MySQL**: [Railway](https://railway.com)
- **Frontend**: [Vercel](https://vercel.com)

**Costo esperado**: Railway ya no ofrece un plan gratuito permanente. El
plan "Hobby" cuesta **5 USD/mes fijos** (incluye ese mismo monto en uso; si
el backend y la base de datos consumen mas, se cobra la diferencia — para
una app de un solo consultorio con poco trafico, deberia mantenerse cerca
de esos 5 USD/mes). Vercel para el frontend **es gratis** sin limite de
tiempo. Total aproximado: **5-10 USD/mes**.

No se usa un dominio propio: cada proveedor asigna una URL gratuita
(`algo.up.railway.app` y `algo.vercel.app`).

---

## Resumen de lo que vas a hacer

0. Subir el proyecto a GitHub.
1. Crear cuenta en Railway y conectar el repositorio.
2. Agregar una base de datos MySQL dentro de Railway.
3. Configurar el backend en Railway (variables de entorno) y obtener su URL publica.
4. Crear cuenta en Vercel y desplegar el frontend apuntando a esa URL.
5. Conectar ambos (CORS) y verificar que todo funciona.

Despues de esto, cada vez que hagas `git push`, **Railway y Vercel
actualizan la aplicacion automaticamente solos** — no hay que repetir estos
pasos para futuros cambios de codigo.

---

## Paso 0: Subir el proyecto a GitHub

El proyecto ya esta preparado como repositorio git local (con un primer
commit hecho). Falta conectarlo a GitHub:

1. Entra a https://github.com e inicia sesion (o crea una cuenta si no
   tienes).
2. Click en el boton **"New"** (o el "+" arriba a la derecha -> "New
   repository").
3. Ponle un nombre, por ejemplo `hist-clinica-psic`. Dejalo en **Private**
   si no quieres que sea publico (recomendado, ya que el codigo maneja
   informacion de una clinica). **No marques** ninguna casilla de
   "Add a README" / ".gitignore" / "license" (el proyecto ya tiene su
   propio contenido).
4. Click en "Create repository". GitHub te va a mostrar unos comandos —
   no hace falta copiarlos, usa estos (reemplazando la URL por la que
   te muestre GitHub en "…or push an existing repository from the
   command line"):

   ```powershell
   git remote add origin https://github.com/TU-USUARIO/hist-clinica-psic.git
   git branch -M main
   git push -u origin main
   ```

   La primera vez que hagas `git push`, es posible que se abra una ventana
   para iniciar sesion en GitHub desde tu navegador — sigue esas
   instrucciones.

5. Recarga la pagina de tu repositorio en GitHub: deberias ver todos los
   archivos del proyecto ahi.

---

## Paso 1: Crear el proyecto en Railway

1. Entra a https://railway.com y crea una cuenta (puedes usar tu cuenta de
   GitHub para registrarte, es lo mas rapido).
2. Click en **"New Project"**.
3. Elige **"Deploy from GitHub repo"** y autoriza a Railway a acceder a tu
   cuenta de GitHub si te lo pide.
4. Selecciona el repositorio `hist-clinica-psic` que subiste en el paso 0.
5. Railway va a intentar detectar y desplegar algo automaticamente — **no
   te preocupes si falla en este primer intento**, en el paso 3 lo vamos a
   configurar correctamente.

## Paso 2: Agregar la base de datos MySQL

1. Dentro de tu proyecto de Railway, click en **"+ New"** (o "Create") y
   elige **"Database" -> "Add MySQL"**.
2. Railway crea el servicio de base de datos solo, sin nada que
   configurar. Cuando termine, click sobre ese servicio y entra a la
   pestana **"Variables"**.
3. Vas a ver variables como `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`,
   `MYSQLPASSWORD`, `MYSQLDATABASE`. Anota sus valores (los vas a necesitar
   en el siguiente paso) o dejalos abiertos en otra pestana.

## Paso 3: Configurar el servicio del backend

1. Click en el servicio que Railway creo para tu repositorio (no el de
   MySQL) y entra a **"Settings"**.
2. En la seccion **"Source"** / **"Build"**, busca **"Root Directory"** y
   ponle `backend`. Esto le dice a Railway que el codigo del backend esta
   en esa carpeta (el repositorio tiene backend y frontend juntos). Railway
   deberia detectar automaticamente el `Dockerfile` que hay ahi.
3. En la seccion **"Networking"**, click en **"Generate Domain"**. Cuando
   te pida el puerto, escribe **8000** (el backend siempre escucha en ese
   puerto). Railway te da una URL publica del tipo
   `https://algo-production.up.railway.app` — **anotala**, la vas a
   necesitar en el Paso 4.
4. Entra a la pestana **"Variables"** de este mismo servicio (el backend,
   no MySQL) y agrega una por una (boton "+ New Variable" o pegar en modo
   "Raw Editor"):

   ```
   APP_NAME=Historia Clinica Psicologica
   ENVIRONMENT=production
   DEBUG=false
   ACCESS_TOKEN_EXPIRE_MINUTES=120
   SECRET_KEY=<una clave larga y aleatoria, ver abajo como generarla>
   DATABASE_URL=mysql+pymysql://<MYSQLUSER>:<MYSQLPASSWORD>@<MYSQLHOST>:<MYSQLPORT>/<MYSQLDATABASE>
   CORS_ORIGINS=http://localhost:5173
   SEED_ADMIN_EMAIL=admin@example.com
   SEED_ADMIN_PASSWORD=Admin12345!
   SEED_ADMIN_NOMBRE=Administrador Demo
   SEED_ADMIN_CEDULA=1000000000
   SEED_CONSULTORIO_NIT=900000000-1
   SEED_CONSULTORIO_NOMBRE=Consultorio Demo
   MAIL_FROM=no-reply@example.com
   ```

   - Reemplaza `DATABASE_URL` con los valores reales que anotaste en el
     Paso 2 (sin los signos `<` `>`).
   - `CORS_ORIGINS` lo vamos a corregir con la URL real de Vercel en el
     Paso 5 — por ahora dejalo asi para que el backend arranque.
   - Para `SECRET_KEY`, genera una clave aleatoria abriendo una consola en
     tu computador (donde ya tienes Python instalado) y ejecutando:

     ```
     python -c "import secrets; print(secrets.token_hex(32))"
     ```

     Copia el resultado (una cadena larga de letras y numeros) como valor
     de `SECRET_KEY`.

5. Guarda las variables. Railway va a reconstruir y desplegar el backend
   automaticamente. Las migraciones de base de datos y el usuario
   administrador de prueba se crean solos al arrancar (no hay que hacer
   nada mas).
6. Espera un minuto y abre en tu navegador
   `https://<tu-url-de-railway>/api/v1/health` — deberia mostrar
   `{"status":"ok"}`. Si ves eso, el backend ya esta funcionando en la
   nube.

## Paso 4: Desplegar el frontend en Vercel

1. Entra a https://vercel.com y crea una cuenta (tambien puedes usar tu
   cuenta de GitHub).
2. Click en **"Add New..." -> "Project"**.
3. Elige **"Import"** sobre el repositorio `hist-clinica-psic`.
4. Antes de desplegar, click en **"Edit"** junto a **"Root Directory"** y
   selecciona la carpeta `frontend`. Vercel deberia detectar
   automaticamente que es un proyecto Vite y dejar el resto de la
   configuracion por defecto.
5. Abre la seccion **"Environment Variables"** y agrega:

   ```
   VITE_API_BASE_URL=https://<tu-url-de-railway>/api/v1
   ```

   (la misma URL que anotaste en el Paso 3, agregando `/api/v1` al final).

6. Click en **"Deploy"**. Espera uno o dos minutos.
7. Cuando termine, Vercel te muestra la URL publica del frontend (algo
   como `https://hist-clinica-psic.vercel.app`) — **anotala**.

## Paso 5: Conectar el backend con el frontend (CORS)

1. Vuelve a Railway, al servicio del backend, pestana **"Variables"**.
2. Edita la variable `CORS_ORIGINS` y reemplaza su valor por la URL de
   Vercel del Paso 4, por ejemplo:

   ```
   CORS_ORIGINS=https://hist-clinica-psic.vercel.app
   ```

3. Guarda. Railway vuelve a desplegar el backend con el nuevo valor (tarda
   menos de un minuto, no hace falta tocar nada mas).

## Paso 6: Verificar que todo funciona

1. Abre la URL de Vercel (la del Paso 4) en el navegador.
2. Inicia sesion con el usuario administrador de prueba:
   - Email: `admin@example.com`
   - Password: `Admin12345!`
3. Deberias poder navegar la aplicacion con normalidad. Prueba crear un
   paciente para confirmar que el frontend efectivamente esta hablando con
   el backend en la nube.

---

## Como actualizar la aplicacion mas adelante

Cada vez que quieras subir un cambio de codigo:

```powershell
git add -A
git commit -m "Describe aqui el cambio"
git push
```

Railway y Vercel detectan el `push` a la rama `main` y vuelven a desplegar
automaticamente, sin que tengas que repetir ningun paso de este manual.

---

## Solucion de problemas comunes

**El backend no arranca / `/api/v1/health` no responde**
Revisa en Railway, servicio del backend, pestana **"Deployments" ->
Build/Deploy Logs**. Lo mas comun es un error en `DATABASE_URL` (usuario,
password o host de MySQL mal copiados desde el Paso 2).

**El frontend carga pero al iniciar sesion da error de red / CORS**
Verifica que `CORS_ORIGINS` en Railway sea EXACTAMENTE la URL de Vercel
(con `https://`, sin barra `/` al final) y que `VITE_API_BASE_URL` en
Vercel apunte a la URL de Railway terminada en `/api/v1`. Cualquier
diferencia en estas dos variables se debe corregir y volver a desplegar
(en Vercel: Settings -> Environment Variables -> editar -> luego
"Deployments" -> "..." -> "Redeploy", porque las variables de Vercel solo
se aplican en un build nuevo).

**Quiero ver los logs del backend en vivo**
Railway: servicio del backend -> pestana "Deployments" -> click en el
deployment activo -> "View Logs".

**Quiero cambiar el usuario/contrasena administrador de prueba**
Antes del primer despliegue, cambia `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` en las variables de Railway. Si ya desplegaste y
quieres cambiar la contrasena del usuario admin ya creado, inicia sesion
en la app y usa "Perfil -> Cambiar contrasena".

---

## Notas para quien de soporte tecnico

- El backend corre desde `backend/Dockerfile` (el mismo que se usa para
  desarrollo local con Docker). Al arrancar ejecuta
  `backend/docker-entrypoint.sh`, que aplica `alembic upgrade head` y el
  seed automaticamente antes de levantar `uvicorn` — no hace falta correr
  migraciones a mano en ningun proveedor de nube.
- El frontend en Vercel se compila con `npm run build` (deteccion
  automatica de Vite); no usa Docker en este camino.
- Railway Hobby cobra por uso por encima del credito de 5 USD incluido; si
  el consumo crece (mas trafico, mas replicas), el costo mensual puede
  subir. Revisar el panel de "Usage" de Railway periodicamente.
