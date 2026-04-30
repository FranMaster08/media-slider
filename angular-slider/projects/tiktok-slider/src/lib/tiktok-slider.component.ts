import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SlideComponent } from './components/slide.component';
import { LikeBurstComponent } from './components/like-burst.component';
import { SlideData } from './models/slide.model';

@Component({
  selector: 'ttk-slider',
  standalone: true,
  imports: [SlideComponent, LikeBurstComponent],
  templateUrl: './tiktok-slider.component.html',
  styleUrl: './tiktok-slider.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TikTokSliderComponent implements AfterViewInit {
  static readonly VISIBLE_THRESHOLD = 0.7;

  readonly slides = input.required<readonly SlideData[]>();

  readonly doubleTap = output<void>();
  readonly mutedChange = output<boolean>();

  protected readonly muted = signal(true);
  protected readonly hasVideos = computed(() =>
    this.slides().some((s) => s.type === 'video'),
  );

  @ViewChild('viewport', { static: true })
  private viewportRef!: ElementRef<HTMLElement>;

  @ViewChildren(SlideComponent) private slideComponents!: QueryList<SlideComponent>;

  @ViewChild(LikeBurstComponent, { static: true })
  private burst!: LikeBurstComponent;

  private readonly destroyRef = inject(DestroyRef);

  private observer?: IntersectionObserver;
  private slidesByElement = new Map<Element, SlideComponent>();

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersect(entries),
      {
        root: this.viewportRef.nativeElement,
        threshold: [0, TikTokSliderComponent.VISIBLE_THRESHOLD, 1],
      },
    );

    this.bindObserver(this.slideComponents.toArray());
    this.slideComponents.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list: QueryList<SlideComponent>) => {
        this.bindObserver(list.toArray());
      });

    this.destroyRef.onDestroy(() => this.observer?.disconnect());
  }

  private bindObserver(slides: SlideComponent[]): void {
    if (!this.observer) return;
    this.observer.disconnect();
    this.slidesByElement = new Map(slides.map((s) => [s.element, s]));
    for (const slide of slides) this.observer.observe(slide.element);
  }

  private handleIntersect(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      const slide = this.slidesByElement.get(entry.target);
      if (!slide) continue;
      const isVisible =
        entry.isIntersecting &&
        entry.intersectionRatio >= TikTokSliderComponent.VISIBLE_THRESHOLD;
      slide.setVisible(isVisible);
    }
  }

  private get currentSlide(): SlideComponent | undefined {
    return this.slideComponents?.find((s) =>
      s.element.classList.contains('is-visible'),
    );
  }

  onSlideDoubleTap(): void {
    this.burst.play();
    this.doubleTap.emit();
  }

  toggleMute(event: MouseEvent): void {
    event.stopPropagation();
    const next = !this.muted();
    this.muted.set(next);
    this.mutedChange.emit(next);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    const current = this.currentSlide;
    if (!current) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'PageDown':
        event.preventDefault();
        current.scrollNext();
        break;
      case 'ArrowUp':
      case 'PageUp':
        event.preventDefault();
        current.scrollPrev();
        break;
      case ' ':
        event.preventDefault();
        current.togglePlayback();
        break;
      case 'l':
      case 'L':
        current.like();
        break;
      case 'm':
      case 'M':
        this.muted.update((v) => !v);
        this.mutedChange.emit(this.muted());
        break;
    }
  }
}
