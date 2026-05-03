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

export interface ActionToggleEvent {
  readonly action: SlideAction;
  readonly active: boolean;
  readonly count: string;
}

@Component({
  selector: 'media-action-button',
  standalone: true,
  templateUrl: './action-button.component.html',
  styleUrl: './action-button.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionButtonComponent implements OnInit {
  readonly action = input.required<SlideAction>();
  readonly initialCount = input<string>('');
  readonly initialActive = input<boolean>(false);

  readonly share = output<void>();
  readonly toggle = output<ActionToggleEvent>();

  protected readonly active = signal(false);
  protected readonly count = signal('');

  protected readonly icon = computed(() => ICONS[this.action()]);
  protected readonly label = computed(() =>
    this.action() === 'share' ? 'Share' : this.count(),
  );

  ngOnInit(): void {
    this.count.set(this.initialCount());
    this.active.set(this.initialActive());
  }

  get isActive(): boolean {
    return this.active();
  }

  setActive(value: boolean): void {
    if (this.active() === value) return;
    this.active.set(value);
    this.emitToggle();
  }

  bumpCounter(delta: number): void {
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
        this.emitToggle();
        break;
      }
      case 'comment':
        this.bumpCounter(+1);
        this.emitToggle();
        break;
      case 'share':
        this.bumpCounter(+1);
        this.emitToggle();
        this.share.emit();
        break;
    }
  }

  private emitToggle(): void {
    this.toggle.emit({
      action: this.action(),
      active: this.active(),
      count: this.count(),
    });
  }
}
