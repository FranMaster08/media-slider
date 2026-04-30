import { ActionButton } from './ActionButton.js';
import { FollowButton } from './FollowButton.js';

export class Slide {
    static DOUBLE_TAP_MS = 300;
    static TAP_DELAY_MS = 280;

    constructor(element, { onDoubleTap } = {}) {
        this.element = element;
        this.media = element.querySelector('.slide__media');
        this.onDoubleTap = onDoubleTap;

        this.lastTapAt = 0;
        this.tapTimeout = null;

        this.likeButton = null;
        this.actions = [...element.querySelectorAll('.action')].map((btn) => {
            const action = new ActionButton(btn, { onShare: () => this.share() });
            if (action.action === 'like') this.likeButton = action;
            return action;
        });

        this.followButtons = [...element.querySelectorAll('.slide__follow')]
            .map((btn) => new FollowButton(btn));

        this.element.addEventListener('click', this.handleTap.bind(this));
    }

    get isVideo() {
        return this.media?.tagName === 'VIDEO';
    }

    play() {
        if (!this.isVideo) return;
        this.media.currentTime = 0;
        this.media.play().catch(() => {});
    }

    pause() {
        if (this.isVideo) this.media.pause();
    }

    togglePlayback() {
        if (!this.isVideo) return;
        if (this.media.paused) this.media.play().catch(() => {});
        else this.media.pause();
    }

    setVisible(visible) {
        this.element.classList.toggle('is-visible', visible);
        if (visible) this.play();
        else this.pause();
    }

    like() {
        if (this.likeButton && !this.likeButton.isActive) {
            this.likeButton.setActive(true);
            this.likeButton.bumpCounter(+1);
        }
        this.onDoubleTap?.(this);
    }

    share() {
        if (navigator.share) {
            navigator.share({ title: 'TikTok Slider', url: location.href }).catch(() => {});
        }
    }

    handleTap(event) {
        if (event.target.closest('.action') || event.target.closest('.slide__follow')) return;

        const now = Date.now();
        const delta = now - this.lastTapAt;

        if (delta > 0 && delta < Slide.DOUBLE_TAP_MS) {
            clearTimeout(this.tapTimeout);
            this.like();
            this.lastTapAt = 0;
        } else {
            this.lastTapAt = now;
            this.tapTimeout = setTimeout(() => this.togglePlayback(), Slide.TAP_DELAY_MS);
        }
    }

    scrollNext() {
        this.element.nextElementSibling?.scrollIntoView({ behavior: 'smooth' });
    }

    scrollPrev() {
        this.element.previousElementSibling?.scrollIntoView({ behavior: 'smooth' });
    }
}
