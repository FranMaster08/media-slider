import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  signal,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'media-like-burst',
  standalone: true,
  templateUrl: './like-burst.component.html',
  styleUrl: './like-burst.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LikeBurstComponent {
  protected readonly active = signal(false);

  private readonly element =
    viewChild.required<ElementRef<HTMLElement>>('burst');

  play(): void {
    const el = this.element().nativeElement;
    this.active.set(false);
    el.classList.remove('is-active');

    void el.offsetWidth;

    this.active.set(true);
    el.classList.add('is-active');
  }
}
