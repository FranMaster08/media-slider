import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import {
  MediaSliderComponent,
  SlideActionEvent,
  SlideFollowEvent,
} from 'media-slider';
import { TopbarComponent } from './components/topbar/topbar.component';
import { SlidesService } from './data/slides.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MediaSliderComponent, TopbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly slidesService = inject(SlidesService);

  readonly slides = this.slidesService.slides;
  readonly initialLiked = this.slidesService.initialLiked;
  readonly initialBookmarked = this.slidesService.initialBookmarked;
  readonly initialFollowing = this.slidesService.initialFollowing;

  ngOnInit(): void {
    this.slidesService.load().subscribe({
      error: (err) =>
        console.error(
          'No se pudieron cargar los slides. ¿Está corriendo json-server en :3000?',
          err,
        ),
    });
  }

  onSlideAction(event: SlideActionEvent): void {
    this.slidesService.updateAction(
      event.index,
      event.action,
      event.active,
      event.count,
    );
  }

  onSlideFollow(event: SlideFollowEvent): void {
    this.slidesService.updateFollowing(event.index, event.following);
  }
}
