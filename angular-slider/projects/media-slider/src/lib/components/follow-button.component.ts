import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'media-follow-button',
  standalone: true,
  templateUrl: './follow-button.component.html',
  styleUrl: './follow-button.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowButtonComponent implements OnInit {
  readonly initialFollowing = input<boolean>(false);

  readonly followingChange = output<boolean>();

  protected readonly following = signal(false);

  ngOnInit(): void {
    this.following.set(this.initialFollowing());
  }

  onClick(event: MouseEvent): void {
    event.stopPropagation();
    const next = !this.following();
    this.following.set(next);
    this.followingChange.emit(next);
  }
}
