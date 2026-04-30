import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TikTokSliderComponent } from 'tiktok-slider';
import { TopbarComponent } from './components/topbar/topbar.component';
import { SLIDES } from './data/slides.data';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TikTokSliderComponent, TopbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly slides = signal(SLIDES);
}
