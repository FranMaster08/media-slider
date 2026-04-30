export type SlideAction = 'like' | 'comment' | 'bookmark' | 'share';

export type SlideMediaType = 'image' | 'video';

export interface SlideData {
  readonly type: SlideMediaType;
  readonly media: string;
  readonly user: string;
  readonly avatar: string;
  readonly caption: string;
  readonly music: string;
  readonly counts: Partial<Record<SlideAction, string>>;
}
