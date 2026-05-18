# Pantry Manager Mobile

Aplicación móvil en React Native + Expo para gestionar despensas, productos, listas de compra, perfil y sugerencias de recetas.

## Qué hace la app

La app funciona como un panel móvil conectado a una API Laravel. El flujo principal es:

1. El usuario inicia sesión o crea cuenta.
2. La app restaura sesión guardada en `AsyncStorage`.
3. Se muestra un dashboard con resumen de despensa, alertas, accesos rápidos y elementos recientes.
4. Desde ahí puedes ir a despensas, productos, escáner de códigos, lista de compra, recetas y perfil.

La app también integra TheMealDB para sugerir recetas usando productos de la despensa.

## Estado actual

Estas partes ya están conectadas y funcionando a nivel de código:

- Login, registro y recuperación de contraseña.
- Bootstrap de auth y persistencia de token.
- Dashboard con datos reales de usuario, despensa, alertas y lista de compra.
- CRUD de despensas y productos.
- Escaneo de código de barras con consulta al backend.
- Lista de compra con añadir, marcar comprado, mover a despensa, borrar y completar lista.
- Perfil con edición de nombre, cambio de contraseña y logout.
- Recetas basadas en despensa usando TheMealDB.

Lo único claramente mock en la UI es `NotificationsScreen`, que todavía muestra datos de ejemplo.

## Arquitectura

- [App.tsx](App.tsx): punto de entrada, `AuthProvider` y `NavigationContainer`.
- [src/context/AuthContext.tsx](src/context/AuthContext.tsx): sesión, bootstrap, login, registro y logout.
- [src/navigation/RootNavigator.tsx](src/navigation/RootNavigator.tsx): decide si mostrar auth o app.
- [src/navigation/stacks/AppStack.tsx](src/navigation/stacks/AppStack.tsx): tabs principales y stacks internos.
- [src/api](src/api): cliente HTTP y endpoints de backend.
- [src/screens](src/screens): pantallas por feature.
- [src/components](src/components): componentes reutilizables.

## Pantallas y flujos

### Auth

- `LoginScreen`: login real y credenciales demo `demo@test.com` / `demo`.
- `RegisterScreen`: alta de usuario.
- `ForgotPasswordScreen`: pantalla de recuperación.
- `SplashScreen`: pantalla de carga durante bootstrap.

### Dashboard

Muestra:

- saludo con el nombre del usuario,
- resumen de productos en despensa,
- productos próximos a caducar,
- pendientes de compra,
- alertas si hay notificaciones,
- productos recientes,
- accesos rápidos a despensa, escáner, recetas y lista.

### Despensas y productos

- `PantriesScreen`: lista productos de la primera despensa, permite buscar y filtrar por ubicación.
- `ProductsScreen`: formulario para añadir o editar productos.
- `BarcodeScanScreen`: escanea un código y consulta al backend.

Flujo del escáner:

1. Llama `GET /api/v1/products/barcode/{data}`.
2. Si devuelve 200, navega a `Products` con `barcodeData`.
3. Si devuelve 404, llama `GET /api/v1/products/barcode/{data}/nutritional`.
4. Si todo falla, muestra un alert con opción de añadir manualmente.

### Lista de compra

- `ShoppingListsScreen`: lista activa, añadir producto, marcar comprado, desmarcar, borrar, mover a despensa y completar lista.

### Perfil

- `ProfileScreen`: ver usuario, editar nombre y logout.
- `ChangePasswordScreen`: cambiar contraseña.

### Recetas

- `RecipesScreen`: busca recetas con ingredientes que ya tienes.
- `RecipeDetailScreen`: muestra detalle e ingredientes, y permite añadir los faltantes a la lista de compra.

### Notificaciones

- `NotificationsScreen`: todavía usa mock data.

## Botones y acciones reales

Estos botones ya tienen comportamiento asociado en código:

- Iniciar sesión.
- Crear cuenta.
- Enviar instrucciones de recuperación.
- Cerrar sesión.
- Editar perfil.
- Cambiar contraseña.
- Añadir producto.
- Escanear código.
- Ver recetas.
- Ir a mi lista.
- Marcar comprado / desmarcar comprado.
- Mover item a despensa.
- Eliminar item de lista.
- Completar lista.
- Editar / eliminar producto en despensa.
- Ver detalle de receta.
- Añadir ingredientes faltantes a la lista.

Lo que todavía no está conectado al backend real:

- Notificaciones, que siguen siendo demo.
- Algunas cadenas de UI y estados visuales pueden requerir ajuste fino en pantalla según el backend responda con datos distintos.

## API y entorno

La URL de la API se resuelve desde [src/config/env.ts](src/config/env.ts):

- Web: `http://localhost:8000/api/v1`
- Android emulado: `http://10.0.2.2:8000/api/v1`
- Sobrescritura opcional con `EXPO_PUBLIC_API_URL`

Ejemplo de `.env`:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Cómo levantar el proyecto

1. Instala dependencias.

```bash
npm install
```

2. Configura el backend si hace falta.

```bash
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

3. Arranca Expo.

```bash
npm run start
```

4. Opcionalmente abre web o Android.

```bash
npm run web
npm run android
```

## Requisitos previos

- Node.js y npm.
- Expo Go en el teléfono, o un emulador Android/iOS.
- Backend Laravel corriendo y accesible desde la red local.

## Verificación rápida

Ya se validó la compilación TypeScript con:

```bash
npx tsc --noEmit
```

## Estructura del proyecto

- `src/api`: cliente HTTP y wrappers de endpoints.
- `src/components`: botones, tarjetas, inputs y estados vacíos.
- `src/config`: tema y variables de entorno.
- `src/context`: autenticación global.
- `src/navigation`: navegación raíz y stacks.
- `src/screens`: pantallas por dominio funcional.
- `src/services`: helpers de almacenamiento.
- `src/types`: tipos compartidos.

## Notas útiles

- El login demo existe para probar sin backend: `demo@test.com` / `demo`.
- El bootstrap de auth restaura el token guardado al iniciar la app.
- El escáner usa la API de `expo-camera` y el backend como fuente de verdad.
- Si la pantalla queda en blanco, normalmente significa que Metro tiene un error de compilación pendiente; revisa la consola.