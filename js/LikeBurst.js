export class LikeBurst {
    constructor(element) {
        this.element = element;
    }

    play() {
        if (!this.element) return;
        this.element.classList.remove('is-active');
        void this.element.offsetWidth;
        this.element.classList.add('is-active');
    }
}
