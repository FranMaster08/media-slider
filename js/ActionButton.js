import { CountFormatter } from './CountFormatter.js';

export class ActionButton {
    constructor(element, { onShare } = {}) {
        this.element = element;
        this.action = element.dataset.action;
        this.counter = element.querySelector('small');
        this.onShare = onShare;
        this.element.addEventListener('click', this.handleClick.bind(this));
    }

    get isActive() {
        return this.element.classList.contains('is-active');
    }

    setActive(active) {
        this.element.classList.toggle('is-active', active);
    }

    bumpCounter(delta) {
        if (!this.counter) return;
        this.counter.textContent = CountFormatter.bump(this.counter.textContent, delta);
    }

    handleClick(event) {
        event.stopPropagation();

        switch (this.action) {
            case 'like':
            case 'bookmark': {
                const willActivate = !this.isActive;
                this.setActive(willActivate);
                if (this.action === 'like') this.bumpCounter(willActivate ? +1 : -1);
                break;
            }
            case 'share':
                this.onShare?.();
                break;
        }
    }
}
