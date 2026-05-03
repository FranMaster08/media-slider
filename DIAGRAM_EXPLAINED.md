# Explicación del diagrama de clases (Angular)

Este documento acompaña a [`CLASS_DIAGRAM.md`](CLASS_DIAGRAM.md) y explica, en
castellano y paso a paso, **qué hace cada componente**, **por qué existe**,
**cómo se relaciona con los demás** y **qué patrones de diseño se han
aplicado** en la librería Angular `media-slider`.

> Si todavía no has abierto el diagrama, hazlo en otra pestaña. Aquí asumo que
> ves los cuadros y las flechas.

---

## 1. Filosofía general

El código está organizado en **6 piezas** (5 componentes + 1 utilidad) más un
modelo de datos (`SlideData`) en archivos separados. La idea central es:

> Cada componente tiene **una sola responsabilidad** y **conoce lo mínimo**
> del resto del sistema.

Esto se llama **principio de responsabilidad única (SRP)** y es una de las
cinco letras de SOLID. La consecuencia práctica es que puedes:

- Cambiar el diseño visual de un botón sin tocar el slider entero.
- Reemplazar la animación del corazón sin tocar el `SlideComponent`.
- Probar `CountFormatter` con tests unitarios sin necesidad de Angular.

En la versión Angular se añade una idea extra propia del framework:

> La composición se expresa **en el template**, no con `new` en código.

Cuando `MediaSliderComponent` "posee" varios `SlideComponent`, lo único que
escribe es `<media-slide>` en su HTML. Angular se encarga de instanciar,
inyectar y destruir.

---

## 2. Las piezas, una por una

### 2.1. `SlideData` — el contrato de datos

```
┌─────────────────────────────────────────────┐
│             SlideData (interface)           │
├─────────────────────────────────────────────┤
│ + type    : 'image' | 'video'               │
│ + media   : string                          │
│ + poster? : string                          │
│ + user    : string                          │
│ + avatar  : string                          │
│ + caption : string                          │
│ + music   : string                          │
│ + counts  : Partial<Record<SlideAction,…>>  │
└─────────────────────────────────────────────┘
```

**Para qué sirve**: definir, sin ambigüedad, qué información necesita cada
slide. La librería **no consume DOM**, consume datos. La aplicación que la
usa pasa un array de `SlideData` y la librería decide cómo renderizarlos.

**Por qué existe como tipo**: es el contrato público de la librería. Va
exportado desde `public-api.ts` precisamente para que el consumidor sepa
qué construir. Cambiar este tipo es una **breaking change**, así que está
pensado para ser estable.

**No conoce a nadie**: igual que `CountFormatter`, es una hoja del árbol.

---

### 2.2. `CountFormatter` — utilidad estática

```
┌─────────────────────────────┐
│      CountFormatter         │
│      <<utility>>            │
├─────────────────────────────┤
│ + parse(text) : number      │
│ + format(value) : string    │
│ + bump(text, delta) : string│
└─────────────────────────────┘
```

**Para qué sirve**: convertir entre el texto que se ve en pantalla
(`"1.2K"`, `"3M"`) y el número real (`1200`, `3000000`), y viceversa.

**Por qué es una clase utility (todo `static`)**: no guarda estado, no
necesita instanciarse, ni inyectarse, ni siquiera ser un `@Injectable`. Es
solo un namespace para agrupar funciones relacionadas.

**El símbolo `$` en el diagrama**: significa "miembro estático". Es la
convención UML.

**Lo importante**: esta clase **no conoce a nadie**. Si la borraras, solo
`ActionButtonComponent` se enteraría.

---

### 2.3. `LikeBurstComponent` — el corazón gigante animado

```
┌────────────────────────────────────┐
│       LikeBurstComponent           │
├────────────────────────────────────┤
│ - element : Signal<ElementRef>     │
│ - active  : WritableSignal<boolean>│
├────────────────────────────────────┤
│ + play() : void                    │
└────────────────────────────────────┘
```

**Para qué sirve**: cuando haces doble tap, aparece un corazón rojo
gigante en el centro de la pantalla. Este componente controla esa
animación.

**Por qué existe como componente aparte**: porque la animación tiene un
truco no obvio. Para que se pueda re-disparar varias veces seguidas (haz
doble tap, doble tap, doble tap...) hay que hacer un *reflow forzado*:

```ts
el.classList.remove('is-active');
void el.offsetWidth;   // ← fuerza al navegador a recalcular
el.classList.add('is-active');
```

Encapsular ese truco en `LikeBurstComponent.play()` evita que ese código
raro contamine el resto.

**Quién lo usa**: solo `MediaSliderComponent`, que lo declara en su
template (`<media-like-burst />`) y lo recupera con `@ViewChild`.

---

### 2.4. `ActionButtonComponent` — los botones laterales

```
┌────────────────────────────────────────┐
│        ActionButtonComponent           │
├────────────────────────────────────────┤
│ + action       : InputSignal<…>        │
│ + initialCount : InputSignal<string>   │
│ + share        : OutputEmitter<void>   │
│ - active       : WritableSignal<bool>  │
│ - count        : WritableSignal<string>│
│ - icon, label  : computed Signal       │
├────────────────────────────────────────┤
│ + isActive : boolean (getter)          │
│ + setActive(active) : void             │
│ + bumpCounter(delta) : void            │
│ + onClick(event) : void                │
└────────────────────────────────────────┘
```

**Para qué sirve**: representa **uno** de los botones de la columna
derecha (`like`, `comment`, `bookmark`, `share`). Cada slide tiene 4
instancias.

**Cómo decide qué hacer**: ya **no** lee `data-action` del DOM. Recibe la
acción como `input.required<SlideAction>()`:

```html
<media-action-button action="like"     [initialCount]="..." />
<media-action-button action="bookmark" [initialCount]="..." />
<media-action-button action="share"    (share)="share()" />
```

Y en `onClick` hace un `switch` sobre `this.action()`. Es el mismo patrón
de "el componente lleva su propia identidad", pero **vía binding
declarativo** en vez de atributos `data-*`. Más type-safe (TypeScript
verifica que solo le pasas valores de `SlideAction`) y más idiomático en
Angular.

**Por qué emite `share` por `output()` en vez de hacer `navigator.share`
directamente**: porque "compartir" es lógica de negocio del slide (sabe el
título, la URL, etc.), no del botón. El botón solo sabe "me han pulsado,
emito el evento". Esto es **inversión de dependencias**.

> En la versión vanilla esto era un callback `onShare: Function` pasado al
> constructor. En Angular se hace con `EventEmitter` (`output<void>()`),
> que es el mecanismo idiomático del framework. La idea es la misma; cambia
> el cableado.

**Usa `CountFormatter`**: para que al darle a like, el contador pase de
`"1.2K"` a `"1.3K"` correctamente.

---

### 2.5. `FollowButtonComponent` — el botón "+" del avatar

```
┌────────────────────────────────────┐
│       FollowButtonComponent        │
├────────────────────────────────────┤
│ - following : WritableSignal<bool> │
├────────────────────────────────────┤
│ + onClick(event) : void            │
└────────────────────────────────────┘
```

**Para qué sirve**: cuando pulsas el `+` debajo del avatar, conmuta una
clase CSS que lo hace desaparecer con animación.

**Por qué es un componente tan pequeño**: porque **podría crecer**. Hoy
solo cambia un signal, pero mañana podría hacer una llamada a una API real
(`POST /api/follow/:userId`), gestionar un estado de "pendiente"… Tener su
propio componente deja la puerta abierta a esa evolución sin tocar nada
más.

**Principio aplicado**: **Open/Closed** (la "O" de SOLID). Abierto a
extensión, cerrado a modificación.

---

### 2.6. `SlideComponent` — un slide completo

```
┌──────────────────────────────────────────────┐
│              SlideComponent                  │
├──────────────────────────────────────────────┤
│ + DOUBLE_TAP_MS$ : 300                       │
│ + TAP_DELAY_MS$  : 280                       │
│ + data           : InputSignal<SlideData>    │
│ + muted          : InputSignal<boolean>      │
│ + doubleTap      : OutputEmitter<void>       │
│ - visible        : WritableSignal<boolean>   │
│ - progress       : WritableSignal<number>    │
│ - actionButtons  : QueryList<ActionButton…>  │
│ - lastTapAt      : number                    │
│ - tapTimeout     : number | null             │
├──────────────────────────────────────────────┤
│ + element : HTMLElement (getter)             │
│ + setVisible(value) : void                   │
│ + play() / pause() / togglePlayback()        │
│ + like() / share() : void                    │
│ + scrollNext() / scrollPrev() : void         │
│ + onTap(event) : void                        │
│ + onProgress(event) : void                   │
└──────────────────────────────────────────────┘
```

Es el componente más grande porque concentra la lógica de un slide
individual.

**Responsabilidades**:

1. **Renderizar la media**: si `data().type === 'video'`, pinta un
   `<video>`; si no, una `<img>`. El template tiene la lógica con `@if`.
2. **Gestionar el playback**: si es vídeo, sabe hacer play/pause y resetear
   `currentTime = 0` al volver a ser visible.
3. **Detectar tap simple vs doble tap**: con un timer de 280ms, igual que
   en la versión vanilla.
4. **"Construir" sus propios botones**: ya no con `new`, sino
   declarándolos en el template (`<media-action-button>` ×4 +
   `<media-follow-button>`). Los recoge con `@ViewChildren` para poder
   invocar métodos sobre el botón de like (`bumpCounter`, `setActive`)
   desde TypeScript.
5. **Mostrar el progreso del vídeo**: signal `progress` actualizado en cada
   `timeupdate`, pintado vía `[style.width.%]`.
6. **Disparar el "burst" del corazón**: cuando se hace like, emite el
   `output('doubleTap')` para que el padre llame a `LikeBurstComponent.play()`.

**El truco del doble tap** (algoritmo, idéntico al vanilla):

```
Recibir tap
├─ ¿Han pasado <300ms desde el último?
│   ├─ SÍ → cancelar timer pendiente, ejecutar like()
│   └─ NO → guardar timestamp, programar timer de 280ms
│             └─ Si no llega otro tap → togglePlayback()
```

Las constantes `DOUBLE_TAP_MS = 300` y `TAP_DELAY_MS = 280` están como
**propiedades estáticas** para que sean fáciles de tunear sin bucear en el
código.

**Por qué `play()` resetea `currentTime = 0`**: para que cada vez que el
slide vuelva a ser visible, el vídeo arranque desde el principio
(comportamiento típico de feeds verticales).

**`element` (getter)**: el padre necesita el `HTMLElement` raíz del slide
para registrarlo en el `IntersectionObserver`. Se expone con un getter
sobre el `ElementRef` inyectado.

---

### 2.7. `MediaSliderComponent` — el orquestador

```
┌──────────────────────────────────────────────────┐
│              MediaSliderComponent                │
├──────────────────────────────────────────────────┤
│ + VISIBLE_THRESHOLD$ : 0.7                       │
│ + slides       : InputSignal<readonly SlideData[]>│
│ + doubleTap    : OutputEmitter<void>             │
│ + mutedChange  : OutputEmitter<boolean>          │
│ - muted        : WritableSignal<boolean>         │
│ - hasVideos    : Signal<boolean> (computed)      │
│ - viewportRef  : ElementRef                      │
│ - slideComponents : QueryList<SlideComponent>    │
│ - burst        : LikeBurstComponent              │
│ - observer     : IntersectionObserver            │
│ - slidesByElement : Map<Element, SlideComponent> │
├──────────────────────────────────────────────────┤
│ + ngAfterViewInit() : void                       │
│ + onSlideDoubleTap() : void                      │
│ + toggleMute(event) : void                       │
│ + handleKeydown(event) : void                    │
└──────────────────────────────────────────────────┘
```

Es el componente de más alto nivel. La única pieza pública de la librería
(`public-api.ts` solo exporta `MediaSliderComponent` y los tipos).

**Responsabilidades**:

1. **Recibir los datos**: vía `slides = input.required<readonly SlideData[]>()`.
2. **Renderizar los slides**: con un `@for` en el template.
3. **Detectar qué slide está visible**: mediante `IntersectionObserver`
   creado en `ngAfterViewInit`.
4. **Reaccionar a cambios en la lista**: si el padre añade/quita slides,
   `slideComponents.changes` re-suscribe el observer. La suscripción se
   limpia automáticamente con `takeUntilDestroyed(this.destroyRef)`.
5. **Mute global**: signal `muted`, propagado a todos los slides vía
   `[muted]` y conmutable por botón o tecla `M`.
6. **Atajos de teclado**: ↑↓ para navegar, espacio para play/pause, L para
   like, M para mute.

**El `Map<Element, SlideComponent>`**: cuando el `IntersectionObserver` te
da `entry.target` (un elemento DOM), necesitas saber a qué `SlideComponent`
corresponde. Podrías hacer `slideComponents.find(s => s.element === entry.target)`
cada vez (O(n)), pero con un `Map` es O(1). Optimización pequeña pero
limpia.

**El umbral 0.7**: el slide se considera "visible" si al menos el 70% está
en pantalla. Por debajo de eso, se considera que estás en transición.

**`hasVideos` (computed)**: se usa para mostrar el botón de mute solo si
hay al menos un vídeo en el conjunto. Recalcula automáticamente si cambia
el array de slides.

---

## 3. Las relaciones del diagrama, explicadas

### 3.1. Composición ◆── (rombo relleno)

> "**A** posee a **B**. Si **A** muere, **B** muere con ella."

```
MediaSliderComponent ◆── SlideComponent
MediaSliderComponent ◆── LikeBurstComponent
SlideComponent       ◆── ActionButtonComponent
SlideComponent       ◆── FollowButtonComponent
```

**Cómo se ve en el código** — ya no hay `new`, es el template:

```html
<!-- media-slider.component.html -->
@for (slide of slides(); track slide.media) {
    <media-slide [data]="slide" [muted]="muted()" (doubleTap)="onSlideDoubleTap()" />
}
<media-like-burst />
```

```html
<!-- slide.component.html -->
<media-action-button action="like"     [initialCount]="data().counts.like ?? ''" />
<media-action-button action="comment"  [initialCount]="data().counts.comment ?? ''" />
<media-action-button action="bookmark" [initialCount]="data().counts.bookmark ?? ''" />
<media-action-button action="share"    (share)="share()" />
<media-follow-button />
```

Angular instancia y destruye los hijos al ritmo del padre. La semántica
de "composición" se mantiene; cambia solo el mecanismo.

### 3.2. Dependencia ╌╌► (línea discontinua)

> "**A** usa a **B** puntualmente, pero no la posee."

```
ActionButtonComponent ╌╌► CountFormatter        (la llama, no la guarda)
SlideComponent        ╌╌► LikeBurstComponent    (la dispara vía output)
MediaSliderComponent  ╌╌► SlideData             (consume el tipo)
SlideComponent        ╌╌► SlideData             (consume el tipo)
```

**Cómo se ve en el código**:

```ts
// ActionButtonComponent solo invoca métodos estáticos:
this.count.update((current) => CountFormatter.bump(current, delta));

// SlideComponent solo emite, no conoce LikeBurstComponent:
this.doubleTap.emit();
```

### 3.3. Cardinalidad: 1, 1..*, 0..1

| Relación                                                 | Significado                            |
| -------------------------------------------------------- | -------------------------------------- |
| `MediaSliderComponent "1" *── "*" SlideComponent`        | 1 slider tiene muchos slides           |
| `MediaSliderComponent "1" *── "1" LikeBurstComponent`    | 1 slider tiene exactamente 1 burst     |
| `SlideComponent "1" *── "*" ActionButtonComponent`       | 1 slide tiene 4 action buttons         |
| `SlideComponent "1" *── "1" FollowButtonComponent`       | 1 slide tiene exactamente 1 follow     |

---

## 4. Por qué las flechas van solo "hacia abajo"

Si miras el diagrama, todas las flechas apuntan **del nivel alto al nivel
bajo**:

```
MediaSliderComponent ──► SlideComponent ──► ActionButtonComponent ──► CountFormatter
MediaSliderComponent ──► LikeBurstComponent
```

**Nunca al revés**. Esto se llama **dependencia acíclica** y tiene una
consecuencia muy concreta:

> Puedes coger `CountFormatter`, copiarlo a otro proyecto y funciona solo.
> Puedes coger `ActionButtonComponent` + `CountFormatter` + `SlideData` y
> funciona solo. Pero **no al revés**: `MediaSliderComponent` solo no
> funciona, necesita a todos los demás.

Esto es la regla del **Acyclic Dependencies Principle (ADP)** y es lo que
evita los `import` circulares (un infierno conocido en TypeScript).

---

## 5. El truco del `output` (inversión de dependencias)

Mira esta línea en `media-slider.component.html`:

```html
<media-slide [data]="slide" [muted]="muted()" (doubleTap)="onSlideDoubleTap()" />
```

Y esta otra en `slide.component.ts`:

```ts
readonly doubleTap = output<void>();
// ...
like(): void {
  // ...
  this.doubleTap.emit();
}
```

**`SlideComponent` no importa a `LikeBurstComponent`**. Solo emite un
evento. ¿Por qué importa esto?

- Si mañana quieres que el doble tap haga otra cosa (mostrar un toast,
  enviar analytics, lanzar confetti), **solo cambias `MediaSliderComponent`**.
  `SlideComponent` no se entera.
- Puedes testear `SlideComponent` con `TestBed` y verificar que se emite
  `doubleTap`, sin necesidad del DOM real del corazón.

Esto es la **"D" de SOLID**: Dependency Inversion. Los componentes de alto
nivel definen interfaces (eventos) que los de bajo nivel disparan.

> En la versión vanilla esto se hacía con `onDoubleTap: Function` recibida
> en el constructor. En Angular el mecanismo idiomático es
> `output<T>()` (antes `@Output() ... = new EventEmitter()`). El espíritu
> es idéntico.

---

## 6. Lectura recomendada del diagrama

Si abres `CLASS_DIAGRAM.md` por primera vez, te recomiendo este orden:

1. **Diagrama UML de clases** — entiende qué hay y cómo se relacionan
   estructuralmente.
2. **Árbol de dependencias** — confirma que no hay ciclos y que las capas
   están separadas.
3. **Diagrama de secuencia "tap simple"** — el flujo más sencillo, ideal
   para empezar.
4. **Diagrama de secuencia "doble tap"** — ahora ya entiendes por qué pasa
   por `MediaSliderComponent`.
5. **Diagrama de secuencia "scroll"** — el flujo automático del
   `IntersectionObserver`.
6. **Diagrama de secuencia "mute global"** — un input propagándose a todos
   los hijos vía signals.

---

## 7. Resumen en una frase

> El **`MediaSliderComponent`** orquesta varios **`SlideComponent`**, cada
> uno compuesto de **`ActionButtonComponent`** y **`FollowButtonComponent`**,
> comunicándose con **`LikeBurstComponent`** mediante outputs, alimentándose
> de un array de **`SlideData`** y reutilizando la utilidad
> **`CountFormatter`** para los números.

Si has entendido eso, has entendido la arquitectura.

---

## 8. Para ir más allá

Algunas ideas de evolución que el diagrama te muestra que serían
**fáciles**:

| Cambio                                         | Qué tocas                                           |
| ---------------------------------------------- | --------------------------------------------------- |
| Añadir un botón de "no me interesa"            | `SlideAction` + un caso en `ActionButtonComponent`  |
| Cargar slides desde una API                    | El consumidor: `slides = signal(await fetch(...))`  |
| Cambiar la animación del corazón               | Solo `LikeBurstComponent`                           |
| Que el seguir haga una llamada real al backend | Solo `FollowButtonComponent` (+ inyectar un service)|
| Soportar gestos de swipe horizontal            | Nueva directiva `SwipeDirective`, aplicada al slide |
| Un segundo slider en la misma página           | Otro `<media-slider [slides]="otros()" />`          |
| Exponer eventos de analytics                   | Añadir `output('viewed')` en `SlideComponent`       |

Y algunas que serían **difíciles** (porque rompen el diagrama):

- Que `ActionButtonComponent` envíe analytics directamente → mejor emitir
  un `output('action')` y que el padre se ocupe.
- Que `SlideComponent` conozca a otros slides → mejor que esa lógica viva
  en `MediaSliderComponent`.
- Que `MediaSliderComponent` lea el DOM directamente del consumidor →
  rompería el contrato de `SlideData`.

Cuando un componente necesita conocer a más componentes de los que ahora
conoce, es el momento de **rediseñar el diagrama** antes de escribir el
código.

---

## 9. Diferencias respecto a la versión vanilla JS

Por si vienes de leer la documentación antigua:

| Concepto              | Vanilla JS                              | Angular                                       |
| --------------------- | --------------------------------------- | --------------------------------------------- |
| Composición           | `new ActionButton(el, { onShare })`     | `<media-action-button (share)="…"/>` en template |
| Callbacks             | Funciones pasadas al constructor        | `output<T>()` (EventEmitter)                  |
| Identidad de botón    | `data-action="like"` en HTML            | `[action]="'like'"` (input tipado)            |
| Estado interno        | Propiedades + manipular `textContent`   | Signals (`signal`, `computed`)                |
| Detección de cambios  | Imperativa (cambias el DOM a mano)      | OnPush + signals (Angular re-renderiza)       |
| Modelo de datos       | Solo lo que estuviera en el HTML        | `SlideData` (interface tipada)                |
| Mute / progress       | No existían                             | `muted` signal global, `progress` por slide   |
| Tipado                | JSDoc opcional                          | TypeScript end-to-end                         |
