# Pantry Manager Mobile

Base móvil en React Native con Expo y TypeScript para consumir la API Laravel de Pantry Manager.

## Inicio rápido

1. Instala dependencias con `npm install`.
2. Copia `.env.example` a `.env` y ajusta `EXPO_PUBLIC_API_URL`.
3. Ejecuta `npm run start`.

## Estructura

- `src/api`: cliente HTTP y endpoints.
- `src/context`: estado global de auth.
- `src/navigation`: navegación de auth y app.
- `src/screens`: pantallas por feature.
- `src/components`: UI reutilizable.

## Nota de red

En Android emulado usa `http://10.0.2.2:8000/api/v1`.