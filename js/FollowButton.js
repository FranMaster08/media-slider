export class FollowButton {
    constructor(element) {
        this.element = element;
        this.element.addEventListener('click', this.handleClick.bind(this));
    }

    handleClick(event) {
        event.stopPropagation();
        this.element.classList.add('is-following');
    }
}
