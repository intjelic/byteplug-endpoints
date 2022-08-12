// Copyright (c) 2022 - Jonathan De Wachter
//
// This source file is part of a project released under the MIT license. Please
// refer to the LICENSE file that can be found at the root of the project
// directory.
//
// Written by Jonathan De Wachter <dewachter.jonathan@gmail.com>, September 2020

import axios from "axios"

class EndpointError extends Error {}

function do_request_endpoint(endpoints, endpoint, url, document, token) {

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
          throw EndpointError("non-compliant endpoint; HTTP responses with document must be JSON")
        }

        document = response.data
      }
      else if (response.status == 204) {
        // Nothing to do (check if response.data is null ?).
      }
      else {
        throw EndpointError("non-compliant endpoint; HTTP status code is not expected")
      }

      // If the user wants to handle the response, execute their callback.
      if (endpoint.response != null) {
        endpoint.response(response.data)
      }
    })
    .catch((error) => {
      if (endpoint.any_error != null) {
        endpoint.any_error(error)
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
        if (endpoint.client_error != null) {
          endpoint.client_error(error.response.data)
        }
      }
      else if (kind == 'server-side-error') {
        // TODO; More things to do here.
        if (endpoint.server_error != null) {
          endpoint.server_error(error.response.data)
        }
      }
      else {
        throw EndpointError("non-compliant endpoint; 'kind' value is unexpected")
      }
    })
}

class Endpoint {
  constructor() {
    this.response = null
    this.errors = {}

    this.client_error = null
    this.server_error = null

    this.any_error = null
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
      do_request_endpoint(endpoints, this, path, document, token)
    }

    return endpoint
  }

  collection_endpoint(name, path, operate_on_item=false) {
    var endpoints = this // because 'this' variable will be shadowed later

    var endpoint = new Endpoint()

    if (operate_on_item) {
      endpoint.request = function(item, document, token) {
        var url = name + '/' + item + '/' + path
        do_request_endpoint(endpoints, this, url, document, token)
      }
    }
    else {
      endpoint.request = function(document, token) {
        var url = name + '/' + path
        do_request_endpoint(endpoints, this, url, document, token)
      }
    }

    return endpoint
  }
}

export default Endpoints;
