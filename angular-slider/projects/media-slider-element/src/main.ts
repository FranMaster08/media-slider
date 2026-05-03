import 'zone.js';
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { MediaSliderComponent } from '../../media-slider/src/public-api';

(async () => {
  const app = await createApplication();
  const element = createCustomElement(MediaSliderComponent, {
    injector: app.injector,
  });
  customElements.define('media-slider', element);
})();
