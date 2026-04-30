import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  ViewChildren,
  QueryList,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ActionButtonComponent } from './action-button.component';
import { FollowButtonComponent } from './follow-button.component';
import { SlideData } from '../models/slide.model';

@Component({
  selector: 'ttk-slide',
  standalone: true,
  imports: [ActionButtonComponent, FollowButtonComponent],
  templateUrl: './slide.component.html',
  styleUrl: './slide.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlideComponent {
  static readonly DOUBLE_TAP_MS = 300;
  static readonly TAP_DELAY_MS = 280;

  readonly data = input.required<SlideData>();

  readonly doubleTap = output<void>();

  protected readonly visible = signal(false);

  @HostBinding('class.is-visible') get visibleClass(): boolean {
    return this.visible();
  }

  @ViewChildren(ActionButtonComponent)
  private actionButtons!: QueryList<ActionButtonComponent>;

  readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  private lastTapAt = 0;
  private tapTimeout: ReturnType<typeof setTimeout> | null = null;

  get element(): HTMLElement {
    return this.hostRef.nativeElement;
  }

  private get isVideo(): boolean {
    return this.data().type === 'video';
  }

  private get videoElement(): HTMLVideoElement | null {
    if (!this.isVideo) return null;
    return this.element.querySelector<HTMLVideoElement>('video.slide__media');
  }

  private get likeButton(): ActionButtonComponent | undefined {
    return this.actionButtons?.find((btn) => btn.action() === 'like');
  }

  setVisible(value: boolean): void {
    this.visible.set(value);
    if (value) this.play();
    else this.pause();
  }

  play(): void {
    const video = this.videoElement;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(() => {});
  }

  pause(): void {
    this.videoElement?.pause();
  }

  togglePlayback(): void {
    const video = this.videoElement;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }

  like(): void {
    const btn = this.likeButton;
    if (btn && !btn.isActive) {
      btn.setActive(true);
      btn.bumpCounter(+1);
    }
    this.doubleTap.emit();
  }

  share(): void {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: 'TikTok Slider', url: location.href }).catch(() => {});
    }
  }

  scrollNext(): void {
    (this.element.nextElementSibling as HTMLElement | null)?.scrollIntoView({
      behavior: 'smooth',
    });
  }

  scrollPrev(): void {
    (this.element.previousElementSibling as HTMLElement | null)?.scrollIntoView({
      behavior: 'smooth',
    });
  }

  @HostListener('click', ['$event'])
  onTap(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.action') || target?.closest('.slide__follow')) return;

    const now = Date.now();
    const delta = now - this.lastTapAt;

    if (delta > 0 && delta < SlideComponent.DOUBLE_TAP_MS) {
      if (this.tapTimeout) clearTimeout(this.tapTimeout);
      this.tapTimeout = null;
      this.like();
      this.lastTapAt = 0;
    } else {
      this.lastTapAt = now;
      this.tapTimeout = setTimeout(
        () => this.togglePlayback(),
        SlideComponent.TAP_DELAY_MS,
      );
    }
  }
}
