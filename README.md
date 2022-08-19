# Byteplug Endpoints (WIP!)

This is a HTTP client for Node.js to interact with HTTP APIs implementing the
Endpoints standard from Byteplug. It's essentially a wrapper around **axios**
to expose an easier-to-work-with interface. Therefore, this library works (in
theory) on both the browser and node.

```bash
npm install byteplug-endpoints
```

```javascript
import Endpoints from 'byteplug-endpoints'

var endpoints = new Endpoints("http://api.my-company.com")

var endpoint = endpoints.endpoint("foo")
endpoint.response = function(document) {
    // Do something with response and its document.
}

const document = {
    foo: "bar",
    bar: "foo"
}
endpoint.request(document)
```

This project is a **work-in-progress** and its API is subject to change
drastically (it's mostly for internal use so far).

## How to use

There is no documentation at the moment and this section is the only source of
information.

You must first create a global `Endpoints` object with the base URL. Note that
on a Vue.js app, this is typically shared across all components as a global
property.

```javascript
var endpoints = new Endpoints("https://api.my-company.com")
```

To interact with an endpoint, you must first create an endpoint object with
either `endpoint()` or `collection_endpoint()`.

```javascript
var non_collection_endpoint = endpoints.endpoint("my-path")
var collection_endpoint = endpoints.collection_endpoint("my-collection", "my-path", false)
var item_collection_endpoint = endpoints.collection_endpoint("my-collection", "my-path", true)
```

Then you attach the response and error handlers to this endpoint object. It
also supports `client_error`, `server_error` and `any_error`.

```javascript
my_endpoint.response = (document) => {
    //
}
my_endpoint.errors['foo'] = (document) -=> {
    // Deal when 'foo' error is returned.
}
my_endpoint.errors['bar'] = () -=> {
    // Deal when 'bar error is returned'
}
```

At this point, no HTTP request has been made yet, you must call the `request()`
method with the document, if any, and a token

```javascript
my_endpoint.request(document)
```

If the endpoint requires authentication, pass the token after the document. If
the endpoint operates on an item of a collection, you must pass the item ID as
well. For instance:

```javascript
item_id = "42"
my_collection_endpoint.request(item_id, document, token)
```

## Additional notes

This HTTP client expects a compliant behavior from the server. When it finds
oddities, it may throw a `EndpointError` exception.

It also implements very basic unit tests (it's far from being complete).

```
npm run test
```
