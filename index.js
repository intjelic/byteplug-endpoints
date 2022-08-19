// Copyright (c) 2022 - Jonathan De Wachter
//
// This source file is part of a project released under the MIT license. Please
// refer to the LICENSE file that can be found at the root of the project
// directory.
//
// Written by Jonathan De Wachter <dewachter.jonathan@gmail.com>, September 2020

import axios from "axios"

function doRequestEndpoint(endpoints, endpoint, url, document, token) {

  var configs = {
    baseURL: endpoints.baseURL,
    timeout: endpoints.timeout,
    // Always resolve the promise; we handle any 'request error' ourselves.
    validateStatus: _ => true
  }

  var headers = {}

  // We are manually setting the proper content type in the header (instead of
  // letting axios do it based on some custom rules).
  if (document !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token !== undefined) {
    headers['Authorization'] = `Bearer ${token}`
  }

  configs['headers'] = headers

  return new Promise(async (resolve, reject) => {
    // We wait for the axios request to complete, execute the associated
    // callback, then the promise is marked as fulfilled. If the callback fails
    // to execute successfully, the promise is marked as failed.

    await axios.post(url, document, configs).
    then((response) => {
      if (response.status == 200) {
        // Check if content type is JSON (as specified by the standards).
        const contentType = response.headers['content-type']
        if (!contentType.includes('application/json')) {
          reject("non-compliant-invalid-response")
        }

        document = response.data
        if (endpoint.response != null) {
          endpoint.response(response.data)
        }

        resolve()
      }
      else if (response.status == 204) {
        if (endpoint.response != null) {
          endpoint.response()
        }

        resolve()
      }
      else if (response.status == 401) {
        if (endpoint.authorizationError != null) {
          endpoint.authorizationError()
        }

        resolve()
      }
      else if (response.status == 400 || response.status == 500) {
        var kind = response.data['kind']

        if (kind == 'error') {
          var code = response.data['code']
          if (code in endpoint.errors) {
            endpoint.errors[code](response.data)
          }
        }
        else if (kind == 'client-side-error') {
          if (endpoint.clientError != null) {
            endpoint.clientError(response.data)
          }
        }
        else if (kind == 'server-side-error') {
          if (endpoint.serverError != null) {
            endpoint.serverError(response.data)
          }
        }
        else {
          reject("non-compliant-invalid-kind-value")
        }

        resolve()
      }
      else {
        reject("non-compliant-invalid-status")
      }
    })
    .catch((error) => {
      if (error.code === 'ECONNABORTED') {
        if (endpoint.timeoutError != null) {
          endpoint.timeoutError()
        }

        resolve()
      }

      // An exception was thrown (perhaps user callback failed to execute?),
      // propagate it up.
      reject(error)
    })
  })
}

class Endpoint {
  constructor() {
    this.response = null
    this.errors = {}

    this.authorizationError = null
    this.clientError = null
    this.serverError = null
    this.timeoutError = null
  }
}

class Endpoints {
  constructor(baseURL, timeout=10000) {
    this.baseURL = baseURL
    this.timeout = timeout
  }

  endpoint(path) {
    var endpoints = this // because 'this' variable will be shadowed later

    var endpoint = new Endpoint()
    endpoint.request = function(document, token) {
      return doRequestEndpoint(endpoints, this, path, document, token)
    }

    return endpoint
  }

  collectionEndpoint(name, path, operate_on_item=false) {
    var endpoints = this // because 'this' variable will be shadowed later

    var endpoint = new Endpoint()

    if (operate_on_item) {
      endpoint.request = function(item, document, token) {
        var url = name + '/' + item + '/' + path
        return doRequestEndpoint(endpoints, this, url, document, token)
      }
    }
    else {
      endpoint.request = function(document, token) {
        var url = name + '/' + path
        return doRequestEndpoint(endpoints, this, url, document, token)
      }
    }

    return endpoint
  }
}

export default Endpoints;
