# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

---

## Docker Demo Instructions

### Build and Run

1. Build and start all services:
   ```sh
   docker-compose up --build
   ```

2. Access the frontend at [http://localhost:8080](http://localhost:8080)

3. The API will be available at [http://localhost:3000](http://localhost:3000)

### Stopping

To stop and remove containers:
```sh
   docker-compose down
```

### Notes
- The demo uses resource limits and healthchecks for all services.
- Static assets are cached for 30 days in production.
- For CI/CD, see `.github/workflows/docker-demo.yml`.
