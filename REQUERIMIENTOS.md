### Objetivos
Esta aplicación tiene el objetivo de mantener la información de la atención de casos de sicologia a pacientes por parte de los sicologos que trabajan en diversos consultorios o centros de atencion. 

### Funcionales

- Un consultorio puede tener varios sicologos.
- La aplicacion debe ser multi-tenant (debe poder ser usada por varios sicologos dentro de varios consultorios)
- El sicologo se registrara en la aplicación e indicara a que consultorio pertenece y si es administrador. Los consultorios ya estarán creados antes de que un sicologo se pueda registrar en ese consultorio.
- Habra un administrador de consultorio quien autorizará los nuevos sicologos que se registren en sus consultorio. Sino se han autorizado, no podran acceder a la aplicación. - Solo puede haber un administrador por consultorio.
- Cuando se loguee el sicologo so podra ver sus pacientes, no los de otros sicologos ni otros consultorios.
- El sicologo ingresara la información del paciente. Tanto la general como la de los procesos, sesiones y compromisos y seguimientos a estos
- El sicologo solo podra ver y modificar informacion de sus pacientes, no los de otros sicologos ni otros consultorios
- El sicologo puede imprimir y enviar por correo al paciente el resumen de las sesiones, procesos y la hisotria clinica completa.

## Datos del consultorio (serán precreados - no necesitan formularios para esto)
NIT del consultorio
Nombre del consultorio

## DAtos del sicologo (puede pertenecer a 1 o varios consultorios)
Cedula:
Nombre:
Especialidad:
Tarjeta profesional
Telefono de contacto
Email: es el identificador dentro de la plataforma
Password:
Imagen o Avatar:


## Datos Generales paciente.
- Nombre de la persona vinculada: 
- Documento de Identidad: 
- Fecha de Nacimiento:                               
- Edad:
- Escolaridad: 
- Dirección Casa:
- Teléfono Casa
- Teléfono Celular:
- Email:

## Procesos del paciente (un paciente puede tener varios procesos)
Fecha de vinculación al proceso:                                 
Motivo de consulta:
Aspectos Relevantes Historia de Vida:
Impresión Diagnostica:
Logros significativos alcanzados durante el proceso
Cierre del proceso de atención.
Recomendaciones del proceso

## Descripción del Proceso de Atención (Sesiones de atención) (un proceso puede tener varias sesiones)
Fecha de la sesion
Número de la sesión

## Compromisos (una sesion puede tener varios compromisos)
Descripcion del compromiso
Resultado o seguimiento del compromiso

### No funcionales

- Frontend en React
- Backend en python con Fast Api
- Base de datos Mysql
- Autenticación con JWT
