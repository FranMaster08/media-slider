# tiktok-slider

Slider vertical estilo TikTok para **Angular 19+** y como **Web Component** standalone.

- Soporta **imágenes y vídeos** (campo `type: 'image' | 'video'`).
- Scroll snap vertical, un slide por viewport.
- Auto-play / pause de vídeos al entrar/salir del viewport (`IntersectionObserver`).
- Vídeos con `loop`, `playsinline`, `poster` opcional y barra de progreso fina en la base.
- **Botón global de mute / unmute** (esquina superior derecha) — solo aparece si hay al menos un vídeo en el feed. Estado compartido entre todos los slides.
- Doble-tap o tecla `L` para dar like, con animación de burst.
- Soporte de teclado: flechas / `PageUp` / `PageDown` para navegar, `Espacio` para play/pause.
- Standalone component sin dependencias externas.

---

## Uso como librería Angular

### Instalación

```bash
npm install tiktok-slider
```

### En tu componente

```ts
import { Component, signal } from '@angular/core';
import { TikTokSliderComponent, SlideData } from 'tiktok-slider';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [TikTokSliderComponent],
  template: `<ttk-slider [slides]="slides()" (doubleTap)="onLike()" />`,
})
export class FeedComponent {
  readonly slides = signal<SlideData[]>([
    {
      type: 'image',
      media: 'https://picsum.photos/720/1280',
      user: '@demo',
      avatar: 'https://i.pravatar.cc/100',
      caption: 'Hola mundo',
      music: 'sonido original',
      counts: { like: '1.2K', comment: '340', bookmark: '89' },
    },
    {
      type: 'video',
      media: 'https://example.com/clip.mp4',
      user: '@demo',
      avatar: 'https://i.pravatar.cc/100',
      caption: 'Vídeo con autoplay + loop',
      music: 'mute por defecto',
      counts: { like: '8K' },
    },
  ]);

  onLike() {
    console.log('liked');
  }
}
```

### API

```ts
@Component({ selector: 'ttk-slider', standalone: true })
class TikTokSliderComponent {
  slides = input.required<readonly SlideData[]>();
  doubleTap = output<void>();
  mutedChange = output<boolean>(); // emite al cambiar mute global
}

interface SlideData {
  type: 'image' | 'video';   // requerido
  media: string;             // URL absoluta a imagen o vídeo
  poster?: string;           // (vídeos) frame previo mientras carga
  user: string;
  avatar: string;
  caption: string;
  music: string;
  counts: Partial<Record<SlideAction, string>>;
}

type SlideAction = 'like' | 'comment' | 'bookmark' | 'share';
type SlideMediaType = 'image' | 'video';
```

---

## Uso como Web Component (cualquier framework / HTML plano)

Carga el bundle generado por `npm run build:element` (un único `.js` con todas las dependencias incluidas):

```html
<!doctype html>
<html>
  <body>
    <tiktok-slider id="feed"></tiktok-slider>

    <script src="./tiktok-slider-element.js"></script>
    <script>
      document.getElementById('feed').slides = [
        {
          type: 'image',
          media: 'https://picsum.photos/720/1280',
          user: '@demo',
          avatar: 'https://i.pravatar.cc/100',
          caption: 'Hola mundo',
          music: 'sonido original',
          counts: { like: '1.2K' },
        },
        {
          type: 'video',
          media: 'https://example.com/clip.mp4',
          user: '@demo',
          avatar: 'https://i.pravatar.cc/100',
          caption: 'Vídeo con autoplay',
          music: 'sonido original',
          counts: { like: '8K' },
        },
      ];
      document.getElementById('feed').addEventListener('doubleTap', () => {
        console.log('liked');
      });
    </script>
  </body>
</html>
```

> El input `slides` se asigna como **propiedad** (no como atributo HTML), porque es un array.

---

## Atajos de teclado

| Tecla              | Acción                  |
| ------------------ | ----------------------- |
| `↓` / `PageDown`   | Slide siguiente         |
| `↑` / `PageUp`     | Slide anterior          |
| `Espacio`          | Play / pause del vídeo  |
| `L`                | Like                    |
| `M`                | Mute / unmute global    |

## Licencia

MIT
