# Project Control - NutriCasa Mobile

Este archivo es la fuente corta de control del proyecto para no perder el foco.
Actualizalo cada vez que:

- instales o elimines dependencias,
- cambies flujo de negocio,
- cierres un bug importante,
- agregues nuevos requisitos.

## Baseline del proyecto

- Stack: React Native + Expo 52 + TypeScript.
- Entrada: `App.tsx`.
- Auth global: `src/context/AuthContext.tsx`.
- Navegacion principal: `src/navigation/stacks/AppStack.tsx`.
- API base por defecto:
  - web: `http://localhost:8000/api/v1`
  - android emulador: `http://10.0.2.2:8000/api/v1`

## Resumen del proyecto NutriCasa

Autor/es: Lilith Moreno, Miguel Alcaraz, Dimitri Gonzalez.

### Idea base

NutriCasa es una app movil para gestionar despensas, listas de la compra, caducidades, recetas y notificaciones, con escaneo de codigo de barras y apoyo a la alimentacion saludable.

### Objetivo general

Facilitar la gestion domestica de la alimentacion mediante una herramienta movil que ayude a organizar la despensa, planificar compras, reducir desperdicio y fomentar una alimentacion mas saludable.

### Objetivos especificos del documento

- Gestion colaborativa de listas y despensas.
- Control de caducidades y alertas.
- Recomendacion de recetas segun productos disponibles.
- Informacion nutricional automatica por codigo de barras.
- Soporte para gestion de gastos compartidos.
- Interfaz intuitiva para hogares individuales, familiares o compartidos.

### Tareas principales del proyecto

- Tarea 1: Analizar y diseñar la base de datos.
- Tarea 2: Disenar la interfaz UX/UI.
- Tarea 3: Desarrollar el backend.
- Tarea 4: Desarrollar la aplicacion movil.
- Tarea 5: Probar y validar la aplicacion.
- Tarea 6: Desplegar y documentar el proyecto.

### Estado actual frente al documento

- Base de datos y API: parcialmente cubiertas desde la app y el backend ya existentes.
- UX/UI: bastante avanzado en la app, pero faltan pulidos para acercarse al prototipo final.
- Backend: los flujos principales consumidos por la app estan integrados.
- App movil: cubre auth, despensa, escaner, lista, perfil y recetas.
- Testing: se ha validado TypeScript y se han corregido bugs importantes, pero faltan pruebas reales finales.
- Despliegue y documentacion: documentacion en progreso y despliegue final pendiente.

## Trazabilidad de requisitos

### Funcion principal -> estado

- Auth con token y recuperacion de sesion -> implementado.
- CRUD de despensa -> implementado.
- Lista de la compra con mover a despensa -> implementado.
- Escaneo de codigo de barras -> implementado.
- Consulta nutricional -> implementada via backend.
- Caducidades y alertas -> implementado parcialmente en UI y backend.
- Recetas segun despensa -> implementado con TheMealDB.
- Notificaciones push reales -> pendiente de integrar completamente.
- Grupo / permisos / roles -> pendiente de cierre si el backend final no lo deja completo.
- Foto/avatares de perfil -> implementado localmente, pendiente de sincronizar con backend.
- Build y distribucion final -> pendiente.

### Requisitos no cubiertos o a cerrar

- Sistema de notificaciones push real con FCM y scheduler.
- Sincronizacion remota de foto/avatar de perfil.
- Confirmar soporte real de grupos, roles y permisos en backend.
- Generacion final de APK y guia de distribucion estable.
- Pruebas de usuario documentadas con feedback final.

## Dependencias clave (runtime)

- `expo-camera`
- `expo-image-picker`
- `@react-native-async-storage/async-storage`
- `@react-native-community/datetimepicker`
- `@react-navigation/native`
- `@react-navigation/native-stack`
- `@react-navigation/bottom-tabs`
- `axios`
- `react-hook-form`

## Lista maestra de comprobacion del proyecto

Usa esta lista para comprobar si el proyecto cumple con lo que pide el documento.

### Producto minimo funcional

- [x] Autenticacion funcional.
- [x] Persistencia de sesion.
- [x] Dashboard con datos reales.
- [x] Despensa y CRUD de productos.
- [x] Escaner de codigo de barras.
- [x] Lista de compra.
- [x] Recetas sugeridas.
- [x] Perfil y cambio de contraseña.
- [ ] Notificaciones reales.
- [ ] Sincronizacion de foto/avatar con backend.
- [ ] Grupo / roles / permisos completos.

### Entrega academica

- [x] README funcional y documentado.
- [x] Archivo de control del proyecto.
- [x] Mapa de rubrica RA1-RA7.
- [ ] Capturas finales de pantallas.
- [ ] Evidencias de pruebas con usuarios.
- [ ] APK final de distribucion.

### Alineacion con el documento del proyecto

- [x] Gestion de despensa.
- [x] Gestion de lista de la compra.
- [x] Escaneo de productos.
- [x] Propuestas de recetas.
- [x] Control de caducidades en UI.
- [ ] Alertas push reales.
- [ ] Analitica o vista de gastos compartidos si se decide incluirla.
- [ ] Confirmar alcance final de grupos y permisos.

## Rubrica de evaluacion

Esta seccion sigue la rubrica que me compartiste para ir comprobando el proyecto por criterios.

### RA1 - Datos y acceso a API

- Estado actual: muy avanzado.
- Ya hay acceso a auth, despensas, productos, notificaciones, listas de compra y escaneo.
- Falta para subir de nivel: reforzar validacion de errores, cobertura de casos borde, seguridad de acceso en algunos endpoints y cerrar bien grupos/permisos.

### RA2 - App movil y experiencia en dispositivo

- Estado actual: alto.
- La app corre en Expo, tiene pantallas reales y varios flujos funcionales.
- Falta para subir de nivel: terminar de pulir comportamiento en dispositivo real, permisos, carga de imagen, notificaciones y algunos detalles de UX.

### RA3 - Servicios y procesos

- Estado actual: alto.
- Ya se consumen endpoints REST con axios y hay logica separada por dominio.
- Falta para subir de nivel: completar integracion de notificaciones reales, sincronizacion de foto/avatar con backend, revisar autenticacion en todos los casos y confirmar integracion de Open Food Facts en backend final.

### RA4 - Diseno e interfaces

- Estado actual: medio-alto.
- Se uso un tema consistente y pantallas mas limpias y modernas.
- Falta para subir de nivel: homogeneizar algunos componentes, hacer la experiencia de perfil mas redonda y unificar mejor modales, botones, estados vacios y flujo visual de notificaciones.

### RA5 - Componentes de acceso a datos

- Estado actual: medio-alto.
- Hay wrappers claros para auth, pantries, shopping lists, products y client HTTP.
- Falta para subir de nivel: normalizar mejor tipos y respuestas, reducir props inconsistentes, dejar una capa de dominio mas estricta y revisar validacion de entradas en backend.

### RA6 - Documentacion

- Estado actual: alto.
- Ya existe este archivo de control y el README principal documenta arranque, arquitectura y estado funcional.
- Falta para subir de nivel: documentar decisiones tecnicas por pantalla, adjuntar capturas y dejar un changelog simple por iteraciones.

### RA7 - Despliegue y entrega

- Estado actual: basico.
- El proyecto arranca en local y se valida TypeScript.
- Falta para subir de nivel: preparar build estable, probar en dispositivo real, documentar paso de distribucion y comprobar el comportamiento del APK/IPA segun el caso.

### Resumen rapido de la rubrica

- Fuertes: RA1, RA2, RA3, RA6.
- En progreso: RA4, RA5.
- Pendiente de cerrar para entrega: RA7.

## Checklist rapida de arranque

1. `npm install`
2. Configurar `EXPO_PUBLIC_API_URL` si aplica
3. `npm run start`
4. Si hay errores de build: `npx tsc --noEmit`

## Auto-arranque del entorno de desarrollo

Opciones incluidas en este repo para facilitar el arranque automático del proyecto:

- Desarrollo en VS Code (recomendado para desarrollo):
  - `/.vscode/tasks.json` ya contiene una tarea `Start Expo` que ejecuta `npm run start` al abrir el workspace. VS Code pedirá permiso la primera vez.
  - `/.vscode/launch.json` añade la configuración `Open Expo Web (Start + Browser)` que ejecuta la tarea y abre el navegador en `http://localhost:19006`.

- Abrir Expo Web directamente:
  - Nuevo script `npm run web-open` que ejecuta `expo start --web`.
  - Puedes lanzarlo manualmente o desde `tasks.json`/`launch.json`.

- Auto-arranque en sesión Linux (opcional, fuera de VS Code):
  - Plantilla `systemd/pantry-manager-mobile.service` (edítala para ajustar `WorkingDirectory`) y habilítala con:

```bash
systemctl --user daemon-reload
systemctl --user enable --now pantry-manager-mobile.service
```

  - Plantilla GUI `autostart/pantry-manager-mobile.desktop` (cópiala a `~/.config/autostart/` y edita `Exec` si tu ruta es distinta).

Recomendación: Para desarrollo, usa la opción de VS Code (`tasks.json` + `launch.json`). Usa systemd/autostart solo si quieres Expo levantado al iniciar sesión sin abrir VS Code.

## Checklist de seguimiento por rubrica

- [ ] RA1: validar errores, permisos y respuestas de API en pantalla real.
- [ ] RA2: probar todo en dispositivo/emulador con permisos de camara, galeria y red.
- [ ] RA3: integrar notificaciones reales y sincronizacion de foto/avatar con backend.
- [ ] RA4: unificar estilo de botones, modales y estados vacios.
- [ ] RA5: revisar tipos y contratos de los wrappers de API.
- [ ] RA6: mantener README y este archivo al dia tras cada iteracion.
- [ ] RA7: preparar guia de build y distribucion final.

## Log de instalaciones / cambios

### 2026-05-18

- Instalado `expo-image-picker` para permitir foto de perfil desde galeria.
- Perfil actualizado para soportar:
  - foto real,
  - avatar por icono,
  - edicion desde el circulo de perfil.
- Agregado script `postinstall` en `package.json` para recordar revisar este archivo.

## Pendientes funcionales detectados

- Notificaciones aun usan datos mock (`NotificationsScreen`).
- Sincronizar avatar/foto con backend (ahora se guarda local en AsyncStorage).
- Mejorar validacion de estados de red y errores API en UI.

## Convencion de control (recomendada)

Cada vez que ejecutes `npm install` o `npx expo install`:

1. Anotar aqui lo instalado y por que.
2. Ejecutar `npx tsc --noEmit`.
3. Probar flujo afectado.
