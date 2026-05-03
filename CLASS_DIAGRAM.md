# Diagrama de clases — Media Slider (Angular)

> Este diagrama corresponde a la librería `media-slider` que vive en
> `angular-slider/projects/media-slider/`. Si buscas la versión vanilla JS,
> consulta el historial de git.

## Vista general

```mermaid
classDiagram
    direction LR

    class SlideData {
        <<interface>>
        +type : 'image' | 'video'
        +media : string
        +poster? : string
        +user : string
        +avatar : string
        +caption : string
        +music : string
        +counts : Partial~Record~SlideAction,string~~
    }

    class CountFormatter {
        <<utility>>
        +parse(text)$ number
        +format(value)$ string
        +bump(text, delta)$ string
    }

    class LikeBurstComponent {
        -element : Signal~ElementRef~
        -active : WritableSignal~boolean~
        +play() void
    }

    class ActionButtonComponent {
        +action : InputSignal~SlideAction~
        +initialCount : InputSignal~string~
        +share : OutputEmitter~void~
        -active : WritableSignal~boolean~
        -count : WritableSignal~string~
        -icon : Signal~string~
        -label : Signal~string~
        +isActive : boolean
        +setActive(value) void
        +bumpCounter(delta) void
        +onClick(event) void
    }

    class FollowButtonComponent {
        -following : WritableSignal~boolean~
        +onClick(event) void
    }

    class SlideComponent {
        +DOUBLE_TAP_MS$ : 300
        +TAP_DELAY_MS$ : 280
        +data : InputSignal~SlideData~
        +muted : InputSignal~boolean~
        +doubleTap : OutputEmitter~void~
        -visible : WritableSignal~boolean~
        -progress : WritableSignal~number~
        -actionButtons : QueryList~ActionButtonComponent~
        -lastTapAt : number
        -tapTimeout : number
        +element : HTMLElement
        +setVisible(value) void
        +play() void
        +pause() void
        +togglePlayback() void
        +like() void
        +share() void
        +scrollNext() void
        +scrollPrev() void
        +onTap(event) void
        +onProgress(event) void
    }

    class MediaSliderComponent {
        +VISIBLE_THRESHOLD$ : 0.7
        +slides : InputSignal~readonly SlideData[]~
        +doubleTap : OutputEmitter~void~
        +mutedChange : OutputEmitter~boolean~
        -muted : WritableSignal~boolean~
        -hasVideos : Signal~boolean~
        -viewportRef : ElementRef
        -slideComponents : QueryList~SlideComponent~
        -burst : LikeBurstComponent
        -observer : IntersectionObserver
        -slidesByElement : Map
        -currentSlide : SlideComponent
        +ngAfterViewInit() void
        +onSlideDoubleTap() void
        +toggleMute(event) void
        +handleKeydown(event) void
    }

    MediaSliderComponent "1" *-- "*" SlideComponent          : owns (template)
    MediaSliderComponent "1" *-- "1" LikeBurstComponent      : owns (template)
    SlideComponent       "1" *-- "*" ActionButtonComponent   : owns (template)
    SlideComponent       "1" *-- "1" FollowButtonComponent   : owns (template)
    MediaSliderComponent ..> SlideData                       : consumes
    SlideComponent       ..> SlideData                       : consumes
    ActionButtonComponent ..> CountFormatter                 : uses
    SlideComponent       ..> LikeBurstComponent              : triggers via output
```

> La librería expone además outputs agregados a nivel de slider:
> `slideAction: { index, action, active, count }` y
> `slideFollow: { index, following }`, más inputs opcionales para hidratar
> el estado inicial de cada slide (`initialLiked`, `initialBookmarked`,
> `initialFollowing`). Gracias a eso la capa de persistencia puede vivir
> **fuera** de la librería, como se ve en la siguiente sección.

## Capa de persistencia (app consumidora)

La librería no sabe nada de HTTP. La app es la que habla con `json-server`
(un REST fake apuntando a `db.json`) a través de un `SlidesService`.

```mermaid
classDiagram
    direction LR

    class PersistedSlide {
        <<interface>>
        +id : string
        +likedByMe : boolean
        +bookmarkedByMe : boolean
        +following : boolean
        <<extends SlideData>>
    }

    class SlidesService {
        <<Injectable>>
        -http : HttpClient
        -_slides : WritableSignal~PersistedSlide[]~
        +slides : Signal~PersistedSlide[]~
        +initialLiked : Signal~boolean[]~
        +initialBookmarked : Signal~boolean[]~
        +initialFollowing : Signal~boolean[]~
        +load() Observable
        +updateAction(index, action, active, count) void
        +updateFollowing(index, following) void
    }

    class AppComponent {
        -slidesService : SlidesService
        +slides : Signal~PersistedSlide[]~
        +ngOnInit() void
        +onSlideAction(event) void
        +onSlideFollow(event) void
    }

    class MediaSliderComponent {
        +slides : InputSignal
        +slideAction : OutputEmitter
        +slideFollow : OutputEmitter
    }

    AppComponent --> SlidesService           : inject
    AppComponent --> MediaSliderComponent    : template
    SlidesService ..> PersistedSlide         : stores
    PersistedSlide --|> SlideData            : extends
```

### Flujo "like" con persistencia end-to-end

```mermaid
sequenceDiagram
    actor User
    participant A as ActionButtonComponent
    participant S as SlideComponent
    participant M as MediaSliderComponent
    participant App as AppComponent
    participant Svc as SlidesService
    participant Api as json-server :3000

    User->>A: click ♥
    A->>A: active = true, bumpCounter(+1)
    A->>S: toggle.emit({action,active,count})
    S->>M: actionToggle.emit(...)
    M->>App: slideAction.emit({index, ...})
    App->>Svc: updateAction(index, 'like', true, "1.3K")
    Svc->>Svc: actualiza signal local
    Svc->>Api: PATCH /slides/1 {likedByMe:true, counts:{...}}
    Api->>Api: escribe db.json
    Api-->>Svc: 200 OK
```

## Flujos de interacción

### Tap simple → play / pause

```mermaid
sequenceDiagram
    actor User
    participant H as host (.media-slide)
    participant S as SlideComponent
    participant V as <video>

    User->>H: click
    H->>S: onTap(event)
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
    participant S as SlideComponent
    participant A as ActionButtonComponent(like)
    participant T as MediaSliderComponent
    participant B as LikeBurstComponent

    User->>S: 1er tap
    S->>S: lastTapAt = now
    User->>S: 2º tap (<300ms)
    S->>S: clearTimeout
    S->>A: setActive(true)
    S->>A: bumpCounter(+1)
    A->>CountFormatter: bump("1.2K", +1)
    CountFormatter-->>A: "1.3K"
    S->>T: doubleTap.emit()
    T->>B: play()
    B-->>User: corazón gigante animado
```

### Cambio de slide visible (scroll)

```mermaid
sequenceDiagram
    actor User
    participant IO as IntersectionObserver
    participant T as MediaSliderComponent
    participant S1 as SlideComponent saliente
    participant S2 as SlideComponent entrante

    User->>IO: scroll vertical
    IO->>T: handleIntersect(entries)
    T->>S1: setVisible(false)
    S1->>S1: pause()
    T->>S2: setVisible(true)
    S2->>S2: play() (currentTime = 0)
```

### Toggle mute global

```mermaid
sequenceDiagram
    actor User
    participant T as MediaSliderComponent
    participant S as SlideComponent (todas)
    participant V as <video>

    alt clic en botón mute
        User->>T: toggleMute(event)
    else tecla M
        User->>T: handleKeydown('M')
    end
    T->>T: muted.set(!muted())
    T->>T: mutedChange.emit(muted())
    Note over S,V: input [muted] propaga vía signals
    T-->>S: muted() actualizado
    S-->>V: [muted] = true/false
```

## Árbol de dependencias entre módulos

```mermaid
graph TD
    A[app.component.ts] --> B[MediaSliderComponent]
    B --> C[SlideComponent]
    B --> D[LikeBurstComponent]
    C --> E[ActionButtonComponent]
    C --> F[FollowButtonComponent]
    C --> G[SlideData]
    B --> G
    E --> H[CountFormatter]
```

## Estructura de archivos

```
angular-slider/
├── src/
│   ├── app/
│   │   ├── app.component.{ts,html,css}     # consumidor: <media-slider [slides]="...">
│   │   └── data/slides.data.ts             # SlideData[] de ejemplo
│   └── index.html
└── projects/
    ├── media-slider/                       # ← la librería publicable
    │   └── src/
    │       ├── public-api.ts               # MediaSliderComponent + tipos
    │       └── lib/
    │           ├── media-slider.component.{ts,html,css}    # orquestador
    │           ├── components/
    │           │   ├── slide.component.{ts,html,css}       # un slide
    │           │   ├── action-button.component.{ts,html,css}
    │           │   ├── follow-button.component.{ts,html,css}
    │           │   └── like-burst.component.{ts,html,css}
    │           ├── models/slide.model.ts                   # SlideData, SlideAction
    │           └── utils/count-formatter.ts                # 1.2K, 3M…
    └── media-slider-element/                # build como Custom Element
```

## Responsabilidades por capa

| Capa            | Componente              | Conoce a                                  | No conoce a                              |
| --------------- | ----------------------- | ----------------------------------------- | ---------------------------------------- |
| **Aplicación**  | `MediaSliderComponent`  | `SlideComponent`, `LikeBurstComponent`, `SlideData` | `ActionButton*`, `FollowButton*`, DOM detalle |
| **Entidad**     | `SlideComponent`        | `ActionButtonComponent`, `FollowButtonComponent`, `SlideData` | `MediaSliderComponent`, `LikeBurstComponent` (solo `output`) |
| **Componentes** | `ActionButtonComponent` | `CountFormatter`, `SlideAction`           | `SlideComponent`, otros botones          |
| **Componentes** | `FollowButtonComponent` | —                                         | resto del sistema                        |
| **Componentes** | `LikeBurstComponent`    | —                                         | resto del sistema                        |
| **Modelo**      | `SlideData` (interface) | —                                         | DOM, runtime                             |
| **Utilidad**    | `CountFormatter`        | —                                         | DOM completo                             |

> El sentido de las flechas sigue siendo siempre de fuera hacia dentro:
> `MediaSliderComponent` conoce a `SlideComponent`, pero `SlideComponent` **no**
> conoce a `MediaSliderComponent` (solo emite un `output('doubleTap')`). Esto
> permite testear cada componente aisladamente y reutilizarlos. La diferencia
> respecto a la versión vanilla es que la composición ya no se hace con `new`
> en el constructor, sino **declarativamente en el template** y Angular instancia
> los hijos por nosotros.
