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
either `endpoint()` or `collectionEndpoint()`.

```javascript
var nonCollectionEndpoint = endpoints.endpoint("my-path")
var collectionEndpoint = endpoints.collectionEndpoint("my-collection", "my-path", false)
var itemCollectionEndpoint = endpoints.collectionEndpoint("my-collection", "my-path", true)
```

Then you attach the response and error handlers to this endpoint object. It
also supports `clientError` and `serverError`.

```javascript
myEndpoint.response = (document) => {
    //
}
myEndpoint.errors['foo'] = (document) -=> {
    // Deal when 'foo' error is returned.
}
myEndpoint.errors['bar'] = () -=> {
    // Deal when 'bar error is returned'
}
```

At this point, no HTTP request has been made yet, you must call the `request()`
method with the document, if any, and a token.

```javascript
myEndpoint.request(document/*, token*/)
```

If the endpoint requires authentication, pass the token after the document. If
the endpoint operates on an item of a collection, you must pass the item ID as
well. For instance:

```javascript
item = "42"
myCollectionEndpoint.request(item, document, token)
```

The `request()` method returns a promise, and therefore you can wait for the
HTTP request to actually be completed and wait until all callbacks are
fully run.

## Additional notes

This HTTP client expects a compliant behavior from the server. When it finds
oddities, the promise returned by `request()` will fail with an explicit
message error.

It also implements very basic unit tests (it's far from being complete).

```
npm run test
```
```
> byteplug-endpoints@0.0.1 test
> ava


  ✔ client-side-error
  ✔ server-side-error
  ✔ non-collection-endpoint
  ✔ collection-endpoint-without-item
  ✔ authorization-token
  ✔ collection-endpoint-with-item
  ✔ non-compliant-endpoints
  ✔ timeout-error (209ms)
  ─

  8 tests passed
  ```
