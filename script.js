import expressTemplate from './express-templ.js?raw';
import tcpTemplate from './tcp-templ.js?raw';
import templateHtml from './template.html?raw';
import deploymentTemplate from './deployment-template.yaml?raw';
import serviceTemplate from './service-template.yaml?raw';
import * as jsYaml from 'js-yaml';
import { K8sClient } from './k8s-client';

function configMap(name, namespace, code, dependencies) {
  const configMap = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name,
      namespace,
    },
    data: {
      'server.js': code,
      'package.json': dependencies,
    },
  };
  return jsYaml.dump(configMap);
}
function deployment(name, namespace) {
  const deployment = jsYaml.load(deploymentTemplate);
  deployment.metadata.name = name;
  deployment.metadata.namespace = namespace;
  deployment.metadata.labels.app = name;
  deployment.spec.selector.matchLabels.app = name;
  deployment.spec.template.metadata.labels.app = name;
  deployment.spec.template.spec.volumes[0].configMap.name = name;
  return jsYaml.dump(deployment);
}
function service(name, namespace) {
  const service = jsYaml.load(serviceTemplate);
  service.metadata.name = name;
  service.metadata.namespace = namespace;
  service.spec.selector.app = name;
  return jsYaml.dump(service);
}

function generateManifest(name, namespace, code, packageJson) {
  const cm = configMap(name, namespace, code, packageJson);
  const dp = deployment(name, namespace);
  const svc = service(name, namespace);
  return cm + '\n---\n' + dp + '\n---\n' + svc;
}

const templates = [
  {
    name: 'express',
    script: expressTemplate,
    port: 3000,
    packageJson: {
      main: 'server.js',
      scripts: {
        start: 'node server.js',
      },
      dependencies: {
        express: '^4.17.1',
      },
    },
  },
  {
    name: 'tcp',
    script: tcpTemplate,
    packageJson: {
      main: 'server.js',
      scripts: {
        start: 'node server.js',
      },
    },
    port: 3000,
  },
];

class KymaBuildless extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });

    const template = document.createElement('template');
    template.innerHTML = templateHtml;
    const cloned = template.content.cloneNode(true);
    shadow.appendChild(cloned);

    const useTemplateButton = shadow.getElementById('use-template-button');
    const templateDropdown = shadow.getElementById('template-dropdown');
    console.log('Creating template dropdown');

    this.k8sClient = new K8sClient(
      window.extensionProps?.kymaFetchFn ? '' : '/backend',
      {},
      window.extensionProps?.kymaFetchFn,
    );
    this.k8sClient.get('/api/v1/namespaces').then(namespaces => {
      const namespaceDropdown = shadow.getElementById('namespace-dropdown');
      namespaceDropdown.innerHTML = '';
      namespaces.items.forEach(ns => {
        const option = document.createElement('ui5-option');
        option.value = ns.metadata.name;
        option.innerText = ns.metadata.name;
        namespaceDropdown.appendChild(option);
      });
    });
    console.log('Use template button:');
    useTemplateButton.onclick = () => {
      console.log('Inserting template');
      const selectedTemplate = templates.find(
        t => t.name === templateDropdown.value,
      );
      const editor = shadow.getElementById('code-editor');
      editor.value = selectedTemplate.script;
      const dependencies = shadow.getElementById('dependencies-editor');
      dependencies.value = JSON.stringify(
        selectedTemplate.packageJson,
        null,
        2,
      );
      const deploymentEditor = shadow.getElementById('deployment-editor');
      deploymentEditor.value = '';
    };
    const generateBtn = shadow.getElementById('generate-button');
    generateBtn.onclick = () => {
      const code = shadow.getElementById('code-editor');
      const dependencies = shadow.getElementById('dependencies-editor');
      const deploymentEditor = shadow.getElementById('deployment-editor');
      const appNameInput = shadow.getElementById('app-name-input');
      const namespaceDropdown = shadow.getElementById('namespace-dropdown');
      deploymentEditor.value = generateManifest(
        appNameInput.value,
        namespaceDropdown.value,
        code.value,
        dependencies.value,
      );
    };
    const applyBtn = shadow.getElementById('apply-button');
    applyBtn.onclick = async () => {
      console.log('Applying manifest');
      jsYaml.loadAll(shadow.getElementById('deployment-editor').value, doc => {
        if (doc.kind) {
          console.log('Applying:', doc.kind, doc.metadata.name);
          this.k8sClient.apply(doc);
        }
      });
    };
  }
}
if (!customElements.get('kyma-buildless')) {
  customElements.define('kyma-buildless', KymaBuildless);
}
