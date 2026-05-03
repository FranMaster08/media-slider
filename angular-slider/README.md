# Media Slider — Angular

Versión Angular 19 (standalone components + signals) del slider vertical de medios.
Los datos se leen y se escriben contra un **servidor REST fake** (`json-server`), que
emula persistencia real usando `db.json` como base de datos en disco.

## Estructura

```
angular-slider/
├── db.json                          # "DB" fake que sirve json-server en :3000
├── src/
│   ├── main.ts                      # bootstrap + provideHttpClient
│   └── app/
│       ├── app.component.ts         # consume SlidesService + cablea outputs
│       ├── data/
│       │   ├── persisted-slide.model.ts  # SlideData + id + estado "myX"
│       │   └── slides.service.ts         # GET /slides, PATCH /slides/:id
│       └── components/
│           └── topbar/              # "Siguiendo / Para ti"
└── projects/
    └── media-slider/                # librería publicable (Angular Package)
        └── src/lib/
            ├── media-slider.component.{ts,html,css}   # orquestador
            └── components/
                ├── slide.component.{ts,html,css}
                ├── action-button.component.{ts,html,css}
                ├── follow-button.component.{ts,html,css}
                └── like-burst.component.{ts,html,css}
```

## Arquitectura de persistencia

```
┌──────────────┐   GET /slides    ┌────────────┐   read    ┌─────────┐
│ AppComponent │ ───────────────► │ json-server │ ───────► │ db.json │
│              │ ◄─────────────── │   :3000     │ ◄─────── │         │
│              │   PATCH /:id     └────────────┘   write   └─────────┘
│              │
│     │ slides input
│     ▼
│  <media-slider>
│     │ slideAction / slideFollow output
└─────┘
```

La librería `media-slider` sigue siendo **pura**: no sabe nada de HTTP. Recibe
`SlideData[]` por input y emite outputs cuando el usuario interactúa. El
`AppComponent` es el único punto que habla con `SlidesService`, que a su vez
hace las peticiones contra `json-server`.

## Ejecutar

```bash
npm install
npm run dev      # levanta json-server (:3000) + ng serve (:4200) en paralelo
```

O por separado en dos terminales:

```bash
npm run db       # json-server --watch db.json --port 3000
npm start        # ng serve angular-slider --open
```

Cualquier like, bookmark o follow que hagas se escribe en `db.json` y
sobrevive a recargas y reinicios.

## Endpoints disponibles (json-server)

- `GET http://localhost:3000/slides` → array completo
- `GET http://localhost:3000/slides/:id` → slide concreto
- `PATCH http://localhost:3000/slides/:id` → actualiza campos
- `POST http://localhost:3000/slides` → añade un slide nuevo

## Build de producción

```bash
npm run build       # app consumidora
npm run build:lib   # sólo la librería media-slider
npm run build:all   # librería + custom element + app
```

## Atajos de teclado

- `↓` / `PageDown` — siguiente slide
- `↑` / `PageUp` — slide anterior
- `Espacio` — play/pause (sólo videos)
- `L` — like
- `M` — silenciar/activar audio global
- Doble-tap / doble-click — like + animación corazón
