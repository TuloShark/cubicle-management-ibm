import { createApp } from 'vue';
import App from './App.vue';
import * as Sentry from "@sentry/vue";
import 'carbon-components/css/carbon-components.min.css'; // Carbon CSS
import CarbonComponentsVue from '@carbon/vue'; // Carbon Vue components
import router from './router';

const app = createApp(App);

// Initialize Sentry (disabled for demo)
// Only initialize if DSN is provided and not empty
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn && sentryDsn.trim() !== '' && sentryDsn !== '<your_sentry_dsn>') {
  Sentry.init({
    app,
    dsn: sentryDsn,
    tracesSampleRate: 1.0,
  });
} else {
  console.log('Sentry disabled: No valid DSN provided');
}

// Use Carbon Vue components globally
app.use(CarbonComponentsVue);
app.use(router);

app.mount('#app');
