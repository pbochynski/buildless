# How to set up your custom busola extension

1. Modify general.yaml section (change scope to 'namespace' or 'cluster', etc. )
2. Adjust ui.html and script.js files. Remember to keep general.customElement property in sync with the name of the custom element defined in script.js. The script is loaded only only once and general.customElement property is used to determine if the customElement with that name is already defined.
3. Run `npm run start` to start the development server.
4. Run `npm run deploy` to deploy the extension to the cluster.
