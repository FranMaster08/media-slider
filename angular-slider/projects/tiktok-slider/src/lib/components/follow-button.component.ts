import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'ttk-follow-button',
  standalone: true,
  templateUrl: './follow-button.component.html',
  styleUrl: './follow-button.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowButtonComponent {
  protected readonly following = signal(false);

  onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.following.set(true);
  }
}
