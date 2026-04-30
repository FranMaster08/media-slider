# Explicación del diagrama de clases

Este documento acompaña a [`CLASS_DIAGRAM.md`](CLASS_DIAGRAM.md) y explica, en castellano y paso a paso, **qué hace cada clase**, **por qué existe**, **cómo se relaciona con las demás** y **qué patrones de diseño se han aplicado**.

> Si todavía no has abierto el diagrama, hazlo en otra pestaña. Aquí asumo que ves los cuadros y las flechas.

---

## 1. Filosofía general

El código está organizado en **6 clases** repartidas en archivos separados. La idea central es:

> Cada clase tiene **una sola responsabilidad** y **conoce lo mínimo** del resto del sistema.

Esto se llama **principio de responsabilidad única (SRP)** y es una de las cinco letras de SOLID. La consecuencia práctica es que puedes:

- Cambiar el diseño visual de un botón sin tocar el slider entero.
- Reemplazar la animación del corazón sin tocar el `Slide`.
- Probar `CountFormatter` con tests unitarios sin necesidad de un navegador.

---

## 2. Las clases, una por una

### 2.1. `CountFormatter` — utilidad estática

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

**Para qué sirve**: convertir entre el texto que se ve en pantalla (`"1.2K"`, `"3M"`) y el número real (`1200`, `3000000`), y viceversa.

**Por qué es una clase utility (todo `static`)**: no guarda estado, no necesita instanciarse. Es solo un namespace para agrupar funciones relacionadas. Podría ser un módulo con funciones sueltas, pero al ser una clase queda más auto-documentado: cuando ves `CountFormatter.bump(...)` en otro archivo, sabes inmediatamente de qué va.

**El símbolo `$` en el diagrama**: significa "miembro estático". Es la convención UML.

**Lo importante**: esta clase **no conoce a nadie**. Es una hoja del árbol. Si la borraras, solo `ActionButton` se enteraría.

---

### 2.2. `LikeBurst` — el corazón gigante animado

```
┌────────────────────────────┐
│       LikeBurst            │
├────────────────────────────┤
│ - element : HTMLElement    │
├────────────────────────────┤
│ + play() : void            │
└────────────────────────────┘
```

**Para qué sirve**: cuando haces doble tap, aparece un corazón rojo gigante en el centro de la pantalla. Esta clase controla esa animación.

**Por qué existe como clase aparte**: porque la animación tiene un truco no obvio. Para que se pueda re-disparar varias veces seguidas (haz doble tap, doble tap, doble tap...) hay que hacer un *reflow forzado*:

```js
this.element.classList.remove('is-active');
void this.element.offsetWidth;   // ← fuerza al navegador a recalcular
this.element.classList.add('is-active');
```

Encapsular ese truco en `LikeBurst.play()` evita que ese código raro contamine el resto.

**Quién la usa**: solo `TikTokSlider`, que la pasa al `Slide` por callback.

---

### 2.3. `ActionButton` — los botones laterales

```
┌─────────────────────────────────┐
│       ActionButton              │
├─────────────────────────────────┤
│ - element : HTMLElement         │
│ - action : string               │
│ - counter : HTMLElement         │
│ - onShare : Function            │
├─────────────────────────────────┤
│ + isActive : boolean (getter)   │
│ + setActive(active) : void      │
│ + bumpCounter(delta) : void     │
│ + handleClick(event) : void     │
└─────────────────────────────────┘
```

**Para qué sirve**: representa **uno** de los botones de la columna derecha (like, bookmark, comment, share). Cada slide tiene 4 instancias de esta clase.

**Cómo decide qué hacer**: lee `data-action` del propio botón en el HTML:

```html
<button class="action" data-action="like">…</button>
<button class="action" data-action="bookmark">…</button>
```

Y en `handleClick` hace un `switch` sobre ese valor. Esto es el **patrón "self-classifying DOM"**: el HTML lleva su propia identidad, el JS solo la lee.

**Por qué recibe `onShare` por callback en vez de hacer `navigator.share` directamente**: porque "compartir" es lógica de negocio del `Slide` (sabe el título, la URL, etc.), no del botón. El botón solo sabe "me han pulsado, dispara el callback que me han dado". Esto es **inversión de dependencias**.

**Usa `CountFormatter`**: para que al darle a like, el contador pase de `"1.2K"` a `"1.3K"` correctamente.

---

### 2.4. `FollowButton` — el botón "+" del avatar

```
┌────────────────────────────┐
│       FollowButton         │
├────────────────────────────┤
│ - element : HTMLElement    │
├────────────────────────────┤
│ + handleClick(event) : void│
└────────────────────────────┘
```

**Para qué sirve**: cuando pulsas el `+` debajo del avatar, le pone una clase CSS que lo hace desaparecer con animación.

**Por qué es una clase tan pequeña**: porque **podría crecer**. Hoy solo añade una clase, pero mañana podría hacer una llamada a una API real (`POST /api/follow/:userId`), gestionar un estado de "pendiente"… Tener su propia clase deja la puerta abierta a esa evolución sin tocar nada más.

**Principio aplicado**: **Open/Closed** (la "O" de SOLID). Abierto a extensión, cerrado a modificación.

---

### 2.5. `Slide` — un slide completo

```
┌──────────────────────────────────────────┐
│              Slide                       │
├──────────────────────────────────────────┤
│ + DOUBLE_TAP_MS$ : 300                   │
│ + TAP_DELAY_MS$ : 280                    │
│ - element : HTMLElement                  │
│ - media : HTMLElement (img|video)        │
│ - onDoubleTap : Function                 │
│ - lastTapAt : number                     │
│ - tapTimeout : number                    │
│ - likeButton : ActionButton              │
│ - actions : ActionButton[]               │
│ - followButtons : FollowButton[]         │
├──────────────────────────────────────────┤
│ + isVideo : boolean (getter)             │
│ + play() / pause() / togglePlayback()    │
│ + setVisible(visible) : void             │
│ + like() / share() : void                │
│ + handleTap(event) : void                │
│ + scrollNext() / scrollPrev() : void     │
└──────────────────────────────────────────┘
```

Esta es la clase más grande porque concentra la lógica de un slide individual.

**Responsabilidades**:

1. **Gestionar la media**: si es un `<video>`, sabe hacer play/pause; si es un `<img>`, no hace nada.
2. **Detectar tap simple vs doble tap**: con un timer de 280ms.
3. **Construir sus propios botones**: en el constructor recorre el DOM hijo y crea los `ActionButton` y `FollowButton`.
4. **Disparar el "burst" del corazón**: cuando se hace like, invoca el callback `onDoubleTap`.

**El truco del doble tap** (algoritmo):

```
Recibir tap
├─ ¿Han pasado <300ms desde el último?
│   ├─ SÍ → cancelar timer pendiente, ejecutar like()
│   └─ NO → guardar timestamp, programar timer de 280ms
│             └─ Si no llega otro tap → togglePlayback()
```

Las constantes `DOUBLE_TAP_MS = 300` y `TAP_DELAY_MS = 280` están como **propiedades estáticas** para que sean fáciles de tunear sin bucear en el código.

**Por qué `play()` resetea `currentTime = 0`**: para que cada vez que el slide vuelva a ser visible, el vídeo arranque desde el principio (comportamiento idéntico al de TikTok).

---

### 2.6. `TikTokSlider` — el orquestador

```
┌─────────────────────────────────────────────┐
│            TikTokSlider                     │
├─────────────────────────────────────────────┤
│ + VISIBLE_THRESHOLD$ : 0.7                  │
│ - root : HTMLElement                        │
│ - burst : LikeBurst                         │
│ - slides : Slide[]                          │
│ - slidesByElement : Map<HTMLElement, Slide> │
│ - observer : IntersectionObserver           │
├─────────────────────────────────────────────┤
│ + currentSlide : Slide (getter)             │
│ + handleIntersect(entries) : void           │
│ + handleKeydown(event) : void               │
└─────────────────────────────────────────────┘
```

Esta es la clase de más alto nivel. La única que se instancia desde fuera (`new TikTokSlider()` en `index.js`).

**Responsabilidades**:

1. **Construir todo el árbol** de objetos: crea el `LikeBurst`, los `Slide` (que a su vez crean `ActionButton`s y `FollowButton`s).
2. **Detectar qué slide está visible** mediante `IntersectionObserver`.
3. **Atajos de teclado**: ↑↓ para navegar, espacio para play/pause, L para like.

**El `Map<HTMLElement, Slide>`**: cuando el `IntersectionObserver` te da `entry.target` (un elemento DOM), necesitas saber a qué `Slide` corresponde. Podrías hacer `slides.find(s => s.element === entry.target)` cada vez (O(n)), pero con un `Map` es O(1). Optimización pequeña pero limpia.

**El umbral 0.7**: el slide se considera "visible" si al menos el 70% está en pantalla. Por debajo de eso, se considera que estás en transición.

---

## 3. Las relaciones del diagrama, explicadas

En UML hay tres tipos de flecha que aparecen en este diagrama:

### 3.1. Composición ◆── (rombo relleno)

> "**A** posee a **B**. Si **A** muere, **B** muere con ella."

```
TikTokSlider ◆── Slide
TikTokSlider ◆── LikeBurst
Slide        ◆── ActionButton
Slide        ◆── FollowButton
```

**Cómo se ve en el código**:

```js
// En el constructor de Slide:
this.actions = [...element.querySelectorAll('.action')]
    .map(btn => new ActionButton(btn, ...));
```

Los `ActionButton` se crean **dentro** del `Slide`. No existen sin él.

### 3.2. Dependencia ╌╌► (línea discontinua)

> "**A** usa a **B** puntualmente, pero no la posee."

```
ActionButton ╌╌► CountFormatter   (la llama, no la guarda)
Slide        ╌╌► LikeBurst        (la dispara vía callback)
```

**Cómo se ve en el código**:

```js
// ActionButton solo invoca métodos estáticos, no guarda referencia:
this.counter.textContent = CountFormatter.bump(this.counter.textContent, delta);
```

### 3.3. Cardinalidad: 1, 1..*, 0..1

Los números en las flechas indican cuántas instancias hay:

| Relación                          | Significado                          |
| --------------------------------- | ------------------------------------ |
| `TikTokSlider "1" *── "*" Slide`  | 1 slider tiene muchos slides         |
| `TikTokSlider "1" *── "1" LikeBurst` | 1 slider tiene exactamente 1 burst |
| `Slide "1" *── "*" ActionButton`  | 1 slide tiene varios action buttons  |

---

## 4. Por qué las flechas van solo "hacia abajo"

Si miras el diagrama, todas las flechas apuntan **del nivel alto al nivel bajo**:

```
TikTokSlider ──► Slide ──► ActionButton ──► CountFormatter
TikTokSlider ──► LikeBurst
```

**Nunca al revés**. Esto se llama **dependencia acíclica** y tiene una consecuencia muy concreta:

> Puedes coger `CountFormatter`, copiarlo a otro proyecto y funciona solo. Puedes coger `ActionButton` + `CountFormatter` y funciona solo. Puedes coger `Slide` + sus dependencias y funciona solo. Pero **no al revés**: `TikTokSlider` solo no funciona, necesita a todos los demás.

Esto es la regla del **Acyclic Dependencies Principle (ADP)** y es lo que evita los `import` circulares (un infierno conocido en JavaScript).

---

## 5. El truco del callback (inversión de dependencias)

Mira esta línea en `TikTokSlider.js`:

```js
new Slide(el, { onDoubleTap: () => this.burst.play() })
```

Y esta otra en `Slide.js`:

```js
this.onDoubleTap?.(this);
```

**`Slide` no importa a `LikeBurst`**. Solo recibe una función y la ejecuta. ¿Por qué importa esto?

- Si mañana quieres que el doble tap haga otra cosa (mostrar un toast, enviar analytics, lanzar confetti), **solo cambias `TikTokSlider`**. `Slide` no se entera.
- Puedes testear `Slide` pasándole un `onDoubleTap: jest.fn()` y verificar que se llama, sin necesidad del DOM real del corazón.

Esto es la **"D" de SOLID**: Dependency Inversion. Las clases de alto nivel definen interfaces (callbacks) que las de bajo nivel implementan.

---

## 6. Lectura recomendada del diagrama

Si abres `CLASS_DIAGRAM.md` por primera vez, te recomiendo este orden:

1. **Diagrama UML de clases** — entiende qué hay y cómo se relacionan estructuralmente.
2. **Árbol de dependencias** — confirma que no hay ciclos y que las capas están separadas.
3. **Diagrama de secuencia "tap simple"** — el flujo más sencillo, ideal para empezar.
4. **Diagrama de secuencia "doble tap"** — ahora ya entiendes por qué pasa por `TikTokSlider`.
5. **Diagrama de secuencia "scroll"** — el flujo automático del `IntersectionObserver`.

---

## 7. Resumen en una frase

> El **`TikTokSlider`** orquesta varios **`Slide`s**, cada uno compuesto de **`ActionButton`s** y **`FollowButton`s**, comunicándose con la animación **`LikeBurst`** mediante callbacks, y reutilizando la utilidad **`CountFormatter`** para los números.

Si has entendido eso, has entendido la arquitectura.

---

## 8. Para ir más allá

Algunas ideas de evolución que el diagrama te muestra que serían **fáciles**:

| Cambio                                        | Qué tocas                              |
| --------------------------------------------- | -------------------------------------- |
| Añadir un botón de "no me interesa"           | Solo `ActionButton.handleClick`        |
| Cargar slides desde una API                   | Añadir método `addSlide` en `TikTokSlider` |
| Cambiar la animación del corazón              | Solo `LikeBurst`                       |
| Que el seguir haga una llamada real al backend| Solo `FollowButton`                    |
| Soportar gestos de swipe horizontal           | Nueva clase `SwipeHandler`, agregada a `Slide` |
| Un segundo slider en la misma página          | Otra `new TikTokSlider({ root: '#x' })`|

Y algunas que serían **difíciles** (porque rompen el diagrama):

- Que `ActionButton` envíe analytics directamente → mejor pasarle un callback `onAction`.
- Que `Slide` conozca a otros slides → mejor que esa lógica viva en `TikTokSlider`.

Cuando una clase necesita conocer a más clases de las que ahora conoce, es el momento de **rediseñar el diagrama** antes de escribir el código.
