import './assets/main.css'
import absmartly from '@absmartly/vue3-sdk';

import { createApp } from 'vue'
import App from './App.vue'

createApp(App)
  .use(absmartly.ABSmartlyVue, {
    sdkOptions: {
      endpoint: import.meta.env.VITE_ABSMARTLY_ENDPOINT,
      apiKey: import.meta.env.VITE_ABSMARTLY_API_KEY,
      environment: "prod",
      application: "web",
    },
    context: {
      units: {
        user_id: Math.floor(Math.random() * 100000)
      }
    },
    attributes: {
      user_agent: navigator.userAgent
    }
  })
  .mount('#app')
