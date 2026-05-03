import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { SlideAction } from 'media-slider';
import { PersistedSlide } from './persisted-slide.model';

const API_URL = 'http://localhost:3000/slides';

@Injectable({ providedIn: 'root' })
export class SlidesService {
  private readonly http = inject(HttpClient);

  private readonly _slides = signal<readonly PersistedSlide[]>([]);
  readonly slides = this._slides.asReadonly();

  readonly initialLiked = computed(() =>
    this._slides().map((s) => s.likedByMe),
  );
  readonly initialBookmarked = computed(() =>
    this._slides().map((s) => s.bookmarkedByMe),
  );
  readonly initialFollowing = computed(() =>
    this._slides().map((s) => s.following),
  );

  load(): Observable<readonly PersistedSlide[]> {
    return this.http
      .get<PersistedSlide[]>(API_URL)
      .pipe(tap((slides) => this._slides.set(slides)));
  }

  updateAction(
    index: number,
    action: SlideAction,
    active: boolean,
    count: string,
  ): void {
    const slide = this._slides()[index];
    if (!slide) return;

    const patch = this.buildActionPatch(slide, action, active, count);
    if (!patch) return;

    this.patchLocal(index, patch);
    this.http.patch(`${API_URL}/${slide.id}`, patch).subscribe({
      error: (err) => console.error('PATCH slide falló', err),
    });
  }

  private buildActionPatch(
    slide: PersistedSlide,
    action: SlideAction,
    active: boolean,
    count: string,
  ): Partial<PersistedSlide> | null {
    switch (action) {
      case 'like':
        return {
          likedByMe: active,
          counts: { ...slide.counts, like: count },
        };
      case 'bookmark':
        return {
          bookmarkedByMe: active,
          counts: { ...slide.counts, bookmark: count },
        };
      case 'comment':
        return { counts: { ...slide.counts, comment: count } };
      case 'share':
        return { counts: { ...slide.counts, share: count } };
      default:
        return null;
    }
  }

  updateFollowing(index: number, following: boolean): void {
    const slide = this._slides()[index];
    if (!slide) return;

    this.patchLocal(index, { following });
    this.http.patch(`${API_URL}/${slide.id}`, { following }).subscribe({
      error: (err) => console.error('PATCH slide falló', err),
    });
  }

  private patchLocal(index: number, patch: Partial<PersistedSlide>): void {
    this._slides.update((list) =>
      list.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }
}
