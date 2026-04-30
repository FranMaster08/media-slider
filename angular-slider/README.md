# TikTok Slider — Angular

Versión Angular 19 (standalone components + signals) del slider tipo TikTok original en `../`.

## Estructura

```
src/
├── index.html
├── main.ts                      # bootstrap standalone
├── styles.css                   # estilos globales (reset + body)
└── app/
    ├── app.component.ts         # raíz: monta slider + topbar + like-burst
    ├── models/
    │   └── slide.model.ts       # SlideData, SlideAction
    ├── data/
    │   └── slides.data.ts       # SLIDES (mock)
    ├── utils/
    │   └── count-formatter.ts   # parse / format / bump (1.2K -> 1.3K)
    └── components/
        ├── tiktok-slider/       # contenedor con IntersectionObserver + teclado
        ├── slide/               # un slide (tap, doble-tap, scroll prev/next)
        ├── action-button/       # like / comment / bookmark / share
        ├── follow-button/       # botón "+" del avatar
        ├── like-burst/          # corazón animado al doble-tap
        └── topbar/              # "Siguiendo / Para ti"
```

## Mapeo respecto al proyecto original

| Original (vanilla JS)         | Angular                               |
| ----------------------------- | ------------------------------------- |
| `TikTokSlider.js`             | `TikTokSliderComponent`               |
| `Slide.js`                    | `SlideComponent`                      |
| `SlideRenderer.js` + template | `SlideComponent` template (`@for`)    |
| `ActionButton.js`             | `ActionButtonComponent`               |
| `FollowButton.js`             | `FollowButtonComponent`               |
| `LikeBurst.js`                | `LikeBurstComponent`                  |
| `CountFormatter.js`           | `utils/count-formatter.ts`            |
| `slides.data.js`              | `data/slides.data.ts`                 |
| `index.html` topbar           | `TopbarComponent`                     |

## Ejecutar

```bash
npm install
npm start
```

Esto sirve la app en `http://localhost:4200/`.

## Build de producción

```bash
npm run build
```

## Atajos de teclado

- `↓` / `PageDown` — siguiente slide
- `↑` / `PageUp` — slide anterior
- `Espacio` — play/pause (sólo videos)
- `L` — like
- Doble-tap / doble-click — like + animación
