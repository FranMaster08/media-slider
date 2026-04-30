export type SlideAction = 'like' | 'comment' | 'bookmark' | 'share';

export interface SlideData {
  readonly media: string;
  readonly user: string;
  readonly avatar: string;
  readonly caption: string;
  readonly music: string;
  readonly counts: Partial<Record<SlideAction, string>>;
}
