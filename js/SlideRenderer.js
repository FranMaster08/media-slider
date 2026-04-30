export class SlideRenderer {
    constructor(template) {
        if (!template) throw new Error('SlideRenderer requires a <template> element');
        this.template = template;
    }

    render(data) {
        const fragment = this.template.content.cloneNode(true);
        const slide = fragment.querySelector('.slide');

        slide.querySelector('.slide__media').src = data.media;
        slide.querySelector('.slide__info h3').textContent = data.user;
        slide.querySelector('.slide__info p').textContent = data.caption;
        slide.querySelector('.slide__music-text').textContent = data.music;
        slide.querySelector('.slide__avatar img').src = data.avatar;

        for (const [action, count] of Object.entries(data.counts ?? {})) {
            const counter = slide.querySelector(`.action[data-action="${action}"] small`);
            if (counter) counter.textContent = count;
        }

        return slide;
    }
}
