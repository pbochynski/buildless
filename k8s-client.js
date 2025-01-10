class K8sClient {
  constructor(apiPrefix, options, fetchFunction) {
    console.log('K8sClient', apiPrefix, fetchFunction);
    this.options = { ...options };
    this.apiPrefix = apiPrefix;
    this.groupVersions = {};
    if (fetchFunction) {
      this.fetch = fetchFunction;
    } else {
      const fn = (...args) => fetch(...args);
      this.fetch = fn;
    }
  }
  async apply(res) {
    let path = await this.path(res);
    path += '?fieldManager=kubectl&fieldValidation=Strict&force=false';
    let o = {
      ...this.options,
      method: 'PATCH',
      body: JSON.stringify(res),
    };
    o.headers = {
      ...o.headers,
      'content-type': 'application/apply-patch+yaml',
    };
    let response = await this.fetch(this.apiPrefix + path, o);
    let txt = await response.text();
    // console.log(txt)
    if (response.status >= 300) {
      console.log(res.kind, res.metadata.name, `error:${response.status}`, txt);
    }
    return response;
  }

  async path(r) {
    let url = r.apiVersion === 'v1' ? '/api/v1' : `/apis/${r.apiVersion}`;
    let api = this.groupVersions[r.apiVersion];
    let resource = null;
    if (api) {
      resource = api.resources.find(res => res.kind == r.kind);
    }
    if (resource == null) {
      api = await this.cacheAPI(r.apiVersion);
      resource = api.resources.find(res => res.kind == r.kind);
    }
    if (resource) {
      let ns = r.metadata.namespace || 'default';
      let nsPath = resource.namespaced ? `/namespaces/${ns}` : '';
      return url + nsPath + `/${resource.name}/${r.metadata.name}`;
    }
    return null;
  }

  async get(pathOrResource) {
    console.log('GET', pathOrResource);
    let path = pathOrResource;
    if (typeof path !== 'string') {
      path = await this.path(pathOrResource);
    }
    if (path == null) {
      console.error('path not found for resource:', pathOrResource);
      return Promise.resolve(undefined);
    }
    console.log('GET', this.apiPrefix + path);
    console.log('fetch', this.fetch);
    return this.fetch(this.apiPrefix + path, {
      method: 'GET',
      ...this.options,
    })
      .then(res => {
        console.log('GET', path, res.status);
        if (res.status == 200) {
          return res.json();
        }
        return undefined;
      })
      .catch(e => {
        console.error('GET', path, e);
        return undefined;
      });
  }
  async delete(pathOrResource) {
    let path = pathOrResource;
    if (typeof pathOrResource !== 'string') {
      path = await this.path(pathOrResource);
    }
    return this.fetch(this.apiPrefix + path, {
      method: 'DELETE',
      ...this.options,
    });
  }
  patch(path, body) {
    this.fetch(this.apiPrefix + path, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json-patch+json' },
      body,
      ...this.options,
    });
  }

  async cacheAPI(apiVersion) {
    let url = apiVersion === 'v1' ? '/api/v1' : `/apis/${apiVersion}`;
    let res = await this.fetch(this.apiPrefix + url, {
      method: 'GET',
      ...this.options,
    });
    if (res.status == 200) {
      let body = await res.json();
      this.groupVersions[apiVersion] = body;
      return body;
    }
    return { resources: [] };
  }
}
export { K8sClient };
