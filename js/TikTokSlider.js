import { Slide } from './Slide.js';
import { LikeBurst } from './LikeBurst.js';
import { SlideRenderer } from './SlideRenderer.js';

export class TikTokSlider {
    static VISIBLE_THRESHOLD = 0.7;

    constructor({
        root = '.slider',
        template = '#slide-template',
        burst = '.like-burst',
        slides = [],
    } = {}) {
        this.root = document.querySelector(root);
        this.burst = new LikeBurst(document.querySelector(burst));
        this.renderer = new SlideRenderer(document.querySelector(template));

        this.slides = slides.map((data) => {
            const element = this.renderer.render(data);
            this.root.appendChild(element);
            return new Slide(element, { onDoubleTap: () => this.burst.play() });
        });

        this.slidesByElement = new Map(this.slides.map((s) => [s.element, s]));

        this.observer = new IntersectionObserver(this.handleIntersect.bind(this), {
            root: this.root,
            threshold: [0, TikTokSlider.VISIBLE_THRESHOLD, 1],
        });

        this.slides.forEach((s) => this.observer.observe(s.element));
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    get currentSlide() {
        return this.slides.find((s) => s.element.classList.contains('is-visible'));
    }

    handleIntersect(entries) {
        entries.forEach((entry) => {
            const slide = this.slidesByElement.get(entry.target);
            if (!slide) return;
            const visible =
                entry.isIntersecting && entry.intersectionRatio >= TikTokSlider.VISIBLE_THRESHOLD;
            slide.setVisible(visible);
        });
    }

    handleKeydown(event) {
        const current = this.currentSlide;
        if (!current) return;

        switch (event.key) {
            case 'ArrowDown':
            case 'PageDown':
                event.preventDefault();
                current.scrollNext();
                break;
            case 'ArrowUp':
            case 'PageUp':
                event.preventDefault();
                current.scrollPrev();
                break;
            case ' ':
                event.preventDefault();
                current.togglePlayback();
                break;
            case 'l':
            case 'L':
                current.like();
                break;
        }
    }
}
