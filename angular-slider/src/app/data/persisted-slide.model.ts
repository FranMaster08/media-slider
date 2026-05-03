import { SlideData } from 'media-slider';

export interface PersistedSlide extends SlideData {
  readonly id: string;
  readonly likedByMe: boolean;
  readonly bookmarkedByMe: boolean;
  readonly following: boolean;
}
