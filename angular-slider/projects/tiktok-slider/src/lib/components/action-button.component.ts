import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { SlideAction } from '../models/slide.model';
import { CountFormatter } from '../utils/count-formatter';

const ICONS: Record<SlideAction, string> = {
  like: '♥',
  comment: '💬',
  bookmark: '🔖',
  share: '↪',
};

@Component({
  selector: 'ttk-action-button',
  standalone: true,
  templateUrl: './action-button.component.html',
  styleUrl: './action-button.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionButtonComponent implements OnInit {
  readonly action = input.required<SlideAction>();
  readonly initialCount = input<string>('');

  readonly share = output<void>();

  protected readonly active = signal(false);
  protected readonly count = signal('');

  protected readonly icon = computed(() => ICONS[this.action()]);
  protected readonly label = computed(() =>
    this.action() === 'share' ? 'Share' : this.count(),
  );

  ngOnInit(): void {
    this.count.set(this.initialCount());
  }

  get isActive(): boolean {
    return this.active();
  }

  setActive(value: boolean): void {
    this.active.set(value);
  }

  bumpCounter(delta: number): void {
    if (this.action() === 'share') return;
    this.count.update((current) => CountFormatter.bump(current, delta));
  }

  onClick(event: MouseEvent): void {
    event.stopPropagation();

    switch (this.action()) {
      case 'like':
      case 'bookmark': {
        const willActivate = !this.active();
        this.active.set(willActivate);
        if (this.action() === 'like') {
          this.bumpCounter(willActivate ? +1 : -1);
        }
        break;
      }
      case 'share':
        this.share.emit();
        break;
    }
  }
}
