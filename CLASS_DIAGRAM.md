# Diagrama de clases — Slider TikTok

## Vista general

```mermaid
classDiagram
    direction LR

    class CountFormatter {
        <<utility>>
        +parse(text)$ number
        +format(value)$ string
        +bump(text, delta)$ string
    }

    class LikeBurst {
        -element : HTMLElement
        +play() void
    }

    class ActionButton {
        -element : HTMLElement
        -action : string
        -counter : HTMLElement
        -onShare : Function
        +isActive : boolean
        +setActive(active) void
        +bumpCounter(delta) void
        +handleClick(event) void
    }

    class FollowButton {
        -element : HTMLElement
        +handleClick(event) void
    }

    class Slide {
        +DOUBLE_TAP_MS$ : number
        +TAP_DELAY_MS$ : number
        -element : HTMLElement
        -media : HTMLElement
        -onDoubleTap : Function
        -lastTapAt : number
        -tapTimeout : number
        -likeButton : ActionButton
        -actions : ActionButton[]
        -followButtons : FollowButton[]
        +isVideo : boolean
        +play() void
        +pause() void
        +togglePlayback() void
        +setVisible(visible) void
        +like() void
        +share() void
        +handleTap(event) void
        +scrollNext() void
        +scrollPrev() void
    }

    class TikTokSlider {
        +VISIBLE_THRESHOLD$ : number
        -root : HTMLElement
        -burst : LikeBurst
        -slides : Slide[]
        -slidesByElement : Map
        -observer : IntersectionObserver
        +currentSlide : Slide
        +handleIntersect(entries) void
        +handleKeydown(event) void
    }

    TikTokSlider "1" *-- "*" Slide       : owns
    TikTokSlider "1" *-- "1" LikeBurst   : owns
    Slide        "1" *-- "*" ActionButton : owns
    Slide        "1" *-- "*" FollowButton : owns
    ActionButton ..> CountFormatter      : uses
    Slide        ..> LikeBurst           : triggers via callback
```

## Flujos de interacción

### Tap simple → play / pause

```mermaid
sequenceDiagram
    actor User
    participant DOM as .slide
    participant S as Slide
    participant V as <video>

    User->>DOM: click
    DOM->>S: handleTap(event)
    S->>S: lastTapAt = now
    S->>S: setTimeout(280ms)
    Note over S: espera por posible 2º tap
    S->>V: togglePlayback()
    V-->>User: play / pause
```

### Doble tap → like + animación

```mermaid
sequenceDiagram
    actor User
    participant S as Slide
    participant A as ActionButton(like)
    participant T as TikTokSlider
    participant B as LikeBurst

    User->>S: 1er tap
    S->>S: lastTapAt = now
    User->>S: 2º tap (<300ms)
    S->>S: clearTimeout
    S->>A: setActive(true)
    S->>A: bumpCounter(+1)
    A->>CountFormatter: bump("1.2K", +1)
    CountFormatter-->>A: "1.2K"
    S->>T: onDoubleTap()
    T->>B: play()
    B-->>User: corazón gigante animado
```

### Cambio de slide visible (scroll)

```mermaid
sequenceDiagram
    actor User
    participant IO as IntersectionObserver
    participant T as TikTokSlider
    participant S1 as Slide saliente
    participant S2 as Slide entrante

    User->>IO: scroll vertical
    IO->>T: handleIntersect(entries)
    T->>S1: setVisible(false)
    S1->>S1: pause()
    T->>S2: setVisible(true)
    S2->>S2: play() (currentTime = 0)
```

## Árbol de dependencias entre módulos

```mermaid
graph TD
    A[index.js] --> B[TikTokSlider.js]
    B --> C[Slide.js]
    B --> D[LikeBurst.js]
    C --> E[ActionButton.js]
    C --> F[FollowButton.js]
    E --> G[CountFormatter.js]
```

## Estructura de archivos

```
slider/
├── index.html
├── index.css
├── index.js                  # entry point: new TikTokSlider()
└── js/
    ├── CountFormatter.js     # utilidad estática (1.2K, 3M…)
    ├── LikeBurst.js          # animación de corazón gigante
    ├── ActionButton.js       # botones laterales (like, bookmark, share, comment)
    ├── FollowButton.js       # botón "+" del avatar
    ├── Slide.js              # un slide: tap/double-tap, play/pause, like
    └── TikTokSlider.js       # orquestador: IntersectionObserver + teclado
```

## Responsabilidades por capa

| Capa            | Clase           | Conoce a            | No conoce a          |
| --------------- | --------------- | ------------------- | -------------------- |
| **Aplicación**  | `TikTokSlider`  | `Slide`, `LikeBurst`| ActionButton, DOM detalle |
| **Entidad**     | `Slide`         | `ActionButton`, `FollowButton` | `TikTokSlider`, `LikeBurst` (solo callback) |
| **Componentes** | `ActionButton`  | `CountFormatter`    | `Slide`, otros botones |
| **Componentes** | `FollowButton`  | —                   | resto del sistema    |
| **Componentes** | `LikeBurst`     | —                   | resto del sistema    |
| **Utilidad**    | `CountFormatter`| —                   | DOM completo         |

> El sentido de las flechas es siempre de fuera hacia dentro: `TikTokSlider` conoce a `Slide`, pero `Slide` **no** conoce a `TikTokSlider` (solo recibe un callback `onDoubleTap`). Esto permite testear cada clase aisladamente y reutilizarlas.
