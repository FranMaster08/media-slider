import 'zone.js';
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { TikTokSliderComponent } from '../../tiktok-slider/src/public-api';

(async () => {
  const app = await createApplication();
  const element = createCustomElement(TikTokSliderComponent, {
    injector: app.injector,
  });
  customElements.define('tiktok-slider', element);
})();
