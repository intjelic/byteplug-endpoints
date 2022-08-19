// Copyright (c) 2022 - Jonathan De Wachter
//
// This source file is part of a project released under the MIT license. Please
// refer to the LICENSE file that can be found at the root of the project
// directory.
//
// Written by Jonathan De Wachter <dewachter.jonathan@gmail.com>, September 2020

import axios from "axios"

class EndpointError extends Error {}

function doRequestEndpoint(endpoints, endpoint, url, document, token) {

  var configs = {
    baseURL: endpoints.baseURL,
    timeout: endpoints.timeout
  }

  var headers = {}

  if (document !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token !== undefined) {
    headers['Authorization'] = `Bearer ${token}`
  }

  configs['headers'] = headers


  axios.post(url, document, configs).
    then((response) => {
      var document = null
      if (response.status == 200) {
        if (response.headers['content-type'] != 'application/json') {
          throw new EndpointError("non-compliant endpoint; HTTP responses with document must be JSON")
        }

        document = response.data
      }
      else if (response.status == 204) {
        // Nothing to do (check if response.data is null ?).
      }
      else {
        throw new EndpointError("non-compliant endpoint; HTTP status code is not expected")
      }

      // If the user wants to handle the response, execute their callback.
      if (endpoint.response != null) {
        endpoint.response(response.data)
      }
    })
    .catch((error) => {
      if (endpoint.anyError != null) {
        endpoint.anyError(error)
      }

      if (error.response.status == 401) {
        console.log("authentication failed; stopping here")
        return
      }

      var kind = error.response.data['kind']
      if (kind == 'error') {
        var code = error.response.data['code']
        if (code in endpoint.errors) {
          endpoint.errors[code](error.response.data)
        }
      }
      else if (kind == 'client-side-error') {
        // TODO; More things to do here.
        if (endpoint.clientError != null) {
          endpoint.clientError(error.response.data)
        }
      }
      else if (kind == 'server-side-error') {
        // TODO; More things to do here.
        if (endpoint.serverError != null) {
          endpoint.serverError(error.response.data)
        }
      }
      else {
        throw new EndpointError("non-compliant endpoint; 'kind' value is unexpected")
      }
    })
}

class Endpoint {
  constructor() {
    this.response = null
    this.errors = {}

    this.clientError = null
    this.serverError = null

    this.anyError = null
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
      doRequestEndpoint(endpoints, this, path, document, token)
    }

    return endpoint
  }

  collectionEndpoint(name, path, operate_on_item=false) {
    var endpoints = this // because 'this' variable will be shadowed later

    var endpoint = new Endpoint()

    if (operate_on_item) {
      endpoint.request = function(item, document, token) {
        var url = name + '/' + item + '/' + path
        doRequestEndpoint(endpoints, this, url, document, token)
      }
    }
    else {
      endpoint.request = function(document, token) {
        var url = name + '/' + path
        doRequestEndpoint(endpoints, this, url, document, token)
      }
    }

    return endpoint
  }
}

export default Endpoints;
