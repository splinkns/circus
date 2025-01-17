# CIRCUS Web UI

This repository includes only front-end code.

## Requirements

- Node.js (including NPM, version >= 10)

## Quick Install

1. Clone this repository.

   ```
   % git clone git@github.com:utrad-ical/circus-web-ui.git
   % cd circus-web-ui
   ```

2. Install dependencies. This may take a few minutes.

   ```
   % npm ci
   ```

   (`npm install` is not safe in deployment because it may overwrite
   `package-lock.json`)

### For deployment

3. Build the client code (this may take a few minutes).

   ```
   % npm run build
   ```

4. Host the built code under `public` using a web server such as `nginx`.

### For development

3. Type `npm start`. This will start a webpack-dev-server along with
   a reverse proxy pointing to `circus-api`.

## License

Modified BSD License.
