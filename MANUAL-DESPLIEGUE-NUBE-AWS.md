# Manual de despliegue en la nube: AWS (EC2 + Docker Compose)

Esta opcion usa Amazon Web Services (AWS). A diferencia del manual de
Railway + Vercel (paneles "apunta y haz click"), aqui vas a manejar tu
propio servidor virtual en la nube — es un poco mas de trabajo la primera
vez, pero reutiliza exactamente lo mismo que ya construimos para
`MANUAL-INSTALACION-LOCAL.md` (Docker Compose), asi que no hay conceptos
nuevos de AWS que aprender mas alla de "conseguir una maquina virtual y
conectarme a ella".

**Costo esperado**: depende de la antiguedad de tu cuenta de AWS (ver Paso
1 mas abajo). Puede ser **$0/mes** si tu cuenta califica para la capa
gratuita clasica de 12 meses, o consumir creditos de bienvenida si tu
cuenta es mas nueva. En cualquier caso, la instancia que vamos a usar
(`t2.micro`/`t3.micro` o el tipo que la consola marque como
"Free tier eligible") cuesta muy poco incluso pagando de tu bolsillo, unos
7-8 USD/mes si se te acaba el credito.

No se usa un dominio propio ni HTTPS en este manual: la app queda
accesible por la IP publica de la instancia, sobre `http://` (sin
cifrado). Es aceptable para aprender/probar; si mas adelante quieres un
dominio propio con HTTPS, se puede agregar despues sin rehacer este
despliegue.

---

## Resumen de lo que vas a hacer

1. Revisar si tu cuenta de AWS califica para la capa gratuita.
2. Crear una maquina virtual (instancia EC2).
3. Conectarte a ella desde el navegador (sin instalar nada extra).
4. Instalar Docker.
5. Subir el codigo del proyecto (clonar desde GitHub).
6. Configurar las variables de entorno de produccion.
7. Levantar la aplicacion con Docker Compose.
8. Verificar que funciona.

---

## Paso 1: Revisar tu elegibilidad de AWS Free Tier

1. Entra a https://console.aws.amazon.com/ (inicia sesion con tu cuenta).
2. Arriba a la derecha, click en tu nombre de cuenta -> **"Billing and Cost
   Management"**.
3. En el menu de la izquierda busca **"Free Tier"** (o **"Credits"**).
4. Ahi vas a ver una de estas dos situaciones:
   - **Capa gratuita clasica** (cuentas creadas antes del 15 de julio de
     2025): te muestra el uso de "750 hrs" de EC2 por mes, gratis durante
     los primeros 12 meses desde que creaste la cuenta.
   - **Creditos de bienvenida** (cuentas mas nuevas): te muestra un saldo
     en dolares (hasta 200 USD) que se va descontando segun lo que uses,
     valido por varios meses.

No pasa nada si no calificas para nada de esto — simplemente vas a pagar
el uso real (muy bajo para esta app) desde el principio. Lo importante es
que sepas que esperar en tu primera factura.

## Paso 2: Crear la instancia EC2

1. En la consola de AWS, busca el servicio **"EC2"** (usa el buscador
   arriba) y entra.
2. Click en **"Launch instance"**.
3. **Name**: ponle un nombre, ej. `hist-clinica-psic`.
4. **Application and OS Images (AMI)**: elige **"Amazon Linux 2023"**
   (deberia aparecer marcada como "Free tier eligible").
5. **Instance type**: elige la que la consola marque con la etiqueta
   **"Free tier eligible"** (normalmente `t2.micro` o `t3.micro` segun la
   region).
6. **Key pair (login)**: click en **"Create new key pair"**.
   - Dale un nombre, ej. `hist-clinica-key`.
   - Tipo: RSA. Formato: `.pem`.
   - Click "Create key pair" — se descarga un archivo `.pem` a tu
     computador. **Guardalo en un lugar que recuerdes**, lo puedes
     necesitar mas adelante (aunque en este manual nos conectamos desde el
     navegador y no hace falta usarlo directamente).
7. **Network settings**: click en "Edit" y configura el grupo de
   seguridad (firewall) con estas reglas:
   - SSH, puerto 22, origen: **"Anywhere-IPv4" (`0.0.0.0/0`)**.
   - Agrega una regla: HTTP, puerto 80, origen: **Anywhere (0.0.0.0/0)**
     (para que cualquiera pueda ver el frontend).
   - Agrega otra regla: **Custom TCP**, puerto **8000**, origen:
     **Anywhere (0.0.0.0/0)** (para que el navegador pueda hablar con el
     backend).
   - No abras el puerto 3306 (MySQL) — no hace falta, MySQL solo lo usa el
     backend internamente en la misma maquina.

   > **Por que "Anywhere" y no "My IP" en el puerto 22**: el boton
   > "Connect" -> "EC2 Instance Connect" del navegador (que usamos en el
   > Paso 3) no se conecta desde tu propia IP, sino desde infraestructura
   > interna de AWS. Si restringes el puerto 22 a "My IP", esa conexion
   > queda bloqueada por el firewall y vas a ver el error
   > *"Error establishing SSH connection to your instance. Try again
   > later."* aunque la instancia este perfectamente sana (asi se
   > descubrio este detalle: revisando el log de arranque, que se veia
   > limpio, mientras la conexion seguia fallando). Si mas adelante
   > prefieres mantener el puerto 22 restringido a tu IP por seguridad,
   > podes hacerlo, pero entonces hay que conectarse con un cliente SSH
   > normal (ej. `ssh -i hist-clinica-key.pem ec2-user@TU-IP-PUBLICA` desde
   > PowerShell) en vez del boton del navegador.
8. **Configure storage**: sube el tamano a **20 GB** (la capa gratuita
   cubre hasta 30 GB; el valor por defecto de 8 GB queda muy justo con las
   imagenes de Docker).
9. Click en **"Launch instance"**. Espera 1-2 minutos y luego click en
   **"View all instances"** — deberias ver tu instancia con estado
   **"Running"**.
10. Click sobre la instancia y copia su **"Public IPv4 address"** (la vas
    a necesitar en varios pasos siguientes). En este manual la vamos a
    llamar `TU-IP-PUBLICA`.

> La IP publica cambia si detienes (`Stop`) y vuelves a iniciar la
> instancia. Si eso pasa, repite el Paso 6 (variables de entorno) con la
> IP nueva.

## Paso 3: Conectarte a la instancia

La forma mas simple, sin instalar nada en tu computador:

1. En la lista de instancias de EC2, selecciona la tuya y click en
   **"Connect"** (arriba).
2. Pestana **"EC2 Instance Connect"** -> click en **"Connect"**.
3. Se abre una terminal directamente en tu navegador, ya conectada a tu
   maquina virtual. Todos los comandos de los pasos siguientes se escriben
   ahi.

## Paso 4: Instalar Docker

En la terminal del navegador (Paso 3), ejecuta uno por uno:

```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
```

Cierra la ventana de la terminal y vuelve a conectarte (repite el Paso 3)
para que el cambio de permisos tome efecto. Luego instala Docker Compose:

```bash
mkdir -p ~/.docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
docker compose version
```

Si el ultimo comando muestra un numero de version (ej. `Docker Compose
version v2...`), Docker quedo instalado correctamente.

Tambien hace falta instalar `buildx` (el motor que usa `docker compose
build`), porque Amazon Linux 2023 no lo trae preinstalado y sin el vas a
ver el error `compose build requires buildx 0.17.0 or later` cuando mas
adelante ejecutes `docker compose ... up --build`:

```bash
BUILDX_URL=$(curl -s https://api.github.com/repos/docker/buildx/releases/latest | grep "browser_download_url.*linux-amd64\"" | cut -d '"' -f 4)
curl -SL "$BUILDX_URL" -o ~/.docker/cli-plugins/docker-buildx
chmod +x ~/.docker/cli-plugins/docker-buildx
docker buildx version
```

## Paso 5: Agregar un poco de memoria de intercambio (swap)

La instancia gratuita tiene solo 1 GB de RAM, lo cual es justo para correr
MySQL + backend + frontend al mismo tiempo. Este paso agrega un colchon de
seguridad para que la aplicacion no se caiga por falta de memoria:

```bash
sudo dd if=/dev/zero of=/swapfile bs=128M count=16
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

## Paso 6: Descargar el codigo del proyecto

Si tu repositorio de GitHub es **privado** (recomendado, ya sea que lo
hayas creado siguiendo el Paso 0 de `MANUAL-DESPLIEGUE-NUBE-RAILWAY-VERCEL.md`
o ahora mismo), necesitas un "Personal Access Token" para poder clonarlo:

1. En GitHub: click en tu foto de perfil -> **"Settings"** -> al final del
   menu izquierdo, **"Developer settings"** -> **"Personal access tokens"**
   -> **"Tokens (classic)"** -> **"Generate new token (classic)"**.
2. Dale un nombre, marca la casilla **"repo"** (acceso completo a
   repositorios privados), y genera el token.
3. **Copia el token inmediatamente** (empieza con `ghp_...`) — GitHub solo
   lo muestra una vez.

En la terminal de la instancia EC2:

```bash
git clone https://github.com/TU-USUARIO/hist-clinica-psic.git
```

Cuando te pida usuario y contrasena, usa tu usuario de GitHub como
"Username" y **pega el token** (no tu contrasena real) como "Password".

Si tu repositorio es publico, el mismo comando `git clone` funciona sin
pedir credenciales.

```bash
cd hist-clinica-psic
```

## Paso 7: Configurar las variables de entorno de produccion

Crea el archivo `.env` en la raiz del proyecto (el mismo que usa
`docker-compose.prod.yml`):

```bash
nano .env
```

Pega este contenido, **reemplazando `TU-IP-PUBLICA`** por la IP que
anotaste en el Paso 2 y `SECRET_KEY` por una clave generada (mas abajo):

```
APP_NAME=Historia Clinica Psicologica
ENVIRONMENT=production
DEBUG=false
ACCESS_TOKEN_EXPIRE_MINUTES=120
SECRET_KEY=cambia-esto-por-una-clave-larga-y-aleatoria
CORS_ORIGINS=http://TU-IP-PUBLICA
MYSQL_DATABASE=hist_clinica_psic
MYSQL_USER=hist_user
MYSQL_PASSWORD=hist_password
MYSQL_ROOT_PASSWORD=elige-una-contrasena-root-segura
DATABASE_URL=mysql+pymysql://hist_user:hist_password@mysql:3306/hist_clinica_psic
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=Admin12345!
SEED_ADMIN_NOMBRE=Administrador Demo
SEED_ADMIN_CEDULA=1000000000
SEED_CONSULTORIO_NIT=900000000-1
SEED_CONSULTORIO_NOMBRE=Consultorio Demo
MAIL_FROM=no-reply@example.com
VITE_API_BASE_URL=http://TU-IP-PUBLICA:8000/api/v1
```

Para generar una `SECRET_KEY` aleatoria, abre otra pestana de la terminal
(o hazlo despues) y ejecuta:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Copia el resultado como valor de `SECRET_KEY` en el archivo `.env`
(volviendo a abrirlo con `nano .env` si ya lo habias cerrado).

Para guardar en `nano`: `Ctrl+O`, `Enter`, y para salir `Ctrl+X`.

> `MYSQL_USER`/`MYSQL_PASSWORD` deben coincidir con lo que aparece en
> `DATABASE_URL` — si cambias uno, cambia el otro.

## Paso 8: Levantar la aplicacion

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

La primera vez tarda varios minutos (descarga las imagenes base y compila
el frontend). Las migraciones de base de datos y el usuario administrador
de prueba se crean solos al arrancar el backend — no hay que hacer nada
mas.

Puedes ver el progreso con:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

(Presiona `Ctrl+C` para salir de los logs sin detener la aplicacion.)

## Otros comandos utiles para debuguear

Si algo no carga o falla, estos comandos ayudan a diagnosticar:

```bash
# Ver el valor de CORS_ORIGINS que quedo escrito en el archivo .env
cat .env | grep CORS_ORIGINS

# Ver el valor que el contenedor del backend esta usando REALMENTE en este
# momento (si no coincide con el de arriba, el contenedor esta desactualizado
# y hace falta recrearlo con el comando de abajo)
docker compose -f docker-compose.prod.yml exec backend printenv CORS_ORIGINS

# Recrear solo el backend despues de editar .env (no hace falta tocar
# frontend ni mysql si no cambiaste nada de ellos)
docker compose -f docker-compose.prod.yml up -d --build backend
```

## Paso 9: Verificar que funciona

1. Desde tu propio computador (no la terminal de EC2), abre en el
   navegador: `http://TU-IP-PUBLICA:8000/api/v1/health` — **con el puerto
   `:8000`**, porque esa ruta vive en el backend, no en el frontend.
   Deberia mostrar `{"status":"ok"}`. Si la abres sin el puerto (osea en
   el 80, donde esta el frontend), la propia aplicacion te va a redirigir
   al login, porque el frontend no reconoce esa ruta como una pantalla
   propia — no es un error, simplemente estarias probando el servicio
   equivocado.
2. Abre `http://TU-IP-PUBLICA/` (sin puerto, el 80 por defecto) — deberia
   cargar la aplicacion.
3. Inicia sesion con el usuario administrador de prueba:
   - Email: `admin@example.com`
   - Password: `Admin12345!`

---

## Como actualizar la aplicacion mas adelante

Conectate a la instancia (Paso 3) y ejecuta:

```bash
cd hist-clinica-psic
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Como apagar la aplicacion (para no gastar credito/dinero cuando no la uses)

- **Pausar sin perder nada** (recomendado si vas a volver a usarla
  pronto): en la consola de EC2, selecciona la instancia -> "Instance
  state" -> **"Stop instance"**. Deja de cobrarse el computo; el disco
  (con tus datos de MySQL) se mantiene y se sigue cobrando un monto muy
  pequeno de almacenamiento. Al volver a **"Start instance"**, la IP
  publica puede cambiar (repite el Paso 7 con la IP nueva si es asi).
- **Borrar todo permanentemente**: "Instance state" -> **"Terminate
  instance"**. Esto borra la maquina y sus discos — **se pierden los
  datos de MySQL que no hayas respaldado**. Usalo solo si ya no vas a
  necesitar nada de este despliegue.

---

## Solucion de problemas comunes

**"Failed to connect to your instance" / "Error establishing SSH
connection to your instance. Try again later."**
Con el "Status check" en "2/2 checks passed" (o "3/3") y el log de
arranque (Actions -> Monitor and troubleshoot -> Get system log) sin
errores visibles, esto casi siempre es el grupo de seguridad: el puerto 22
tiene que permitir **"Anywhere-IPv4" (`0.0.0.0/0`)**, no "My IP" — el boton
"EC2 Instance Connect" del navegador no se conecta desde tu propia IP (ver
la nota en el Paso 2). Edita la regla SSH del grupo de seguridad y
vuelve a intentar.

Si el log de arranque SI muestra un error real (mas alla del warning
inofensivo de "SSM Agent unable to acquire credentials", que es normal y
no afecta SSH), o si el chequeo de estado se queda mucho tiempo en
"Initializing" (mas de 5 minutos), lo mas rapido suele ser terminar la
instancia y crear una nueva (Paso 2), probando una zona de disponibilidad
distinta en "Network settings" -> "Subnet".

**`docker compose up` falla o el contenedor del backend se reinicia solo**
Revisa los logs: `docker compose -f docker-compose.prod.yml logs backend`.
Casi siempre es un error de `DATABASE_URL` en `.env` (usuario/contrasena
no coinciden con `MYSQL_USER`/`MYSQL_PASSWORD`).

**`compose build requires buildx 0.17.0 or later`**
Falta instalar el plugin `buildx` (Amazon Linux 2023 no lo trae por
defecto). Sigue las instrucciones al final del Paso 4 para instalarlo, y
vuelve a correr `docker compose -f docker-compose.prod.yml up -d --build`.

**La pagina carga pero al iniciar sesion da error de red**
Revisa que `CORS_ORIGINS` en `.env` sea exactamente `http://TU-IP-PUBLICA`
(sin `/` al final) y que `VITE_API_BASE_URL` termine en `:8000/api/v1`.
Si cambiaste `.env` despues de levantar la app, hace falta reconstruir:
`docker compose -f docker-compose.prod.yml up -d --build`.

**La aplicacion se cae o el servidor se pone lento**
Revisa la memoria disponible con `free -h`. Si el swap del Paso 5 no se
configuro, la instancia de 1 GB de RAM puede quedarse sin memoria bajo
carga. Confirma que `swapon --show` muestra el archivo de swap activo.

**Se me acabaron los creditos / la capa gratuita y no quiero que seguir
cobrando**
Sigue la seccion "Como apagar la aplicacion" de arriba (Stop o Terminate).

---

## Notas para quien de soporte tecnico

- Se usa `docker-compose.prod.yml` (no `docker-compose.yml`, que es solo
  para desarrollo local con recarga en caliente).
- El backend corre `backend/docker-entrypoint.sh` al arrancar, que aplica
  `alembic upgrade head` y el seed automaticamente (idempotentes, seguros
  de correr en cada arranque del contenedor).
- El frontend se sirve con nginx desde `frontend/Dockerfile.prod`
  (build estatico de Vite, no el servidor de desarrollo).
- MySQL no expone su puerto 3306 fuera del host ni en el grupo de
  seguridad — solo es alcanzable desde el backend por la red interna de
  Docker.
- No hay HTTPS en este despliegue (sin dominio propio). Si se agrega un
  dominio mas adelante, la forma estandar de agregar HTTPS gratis es con
  Let's Encrypt (ej. Certbot) delante de nginx.
