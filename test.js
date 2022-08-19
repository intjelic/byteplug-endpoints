import express from 'express'
import test from 'ava'
import Endpoints from './index.js'

function sleep(ms) {
  return new Promise((resolve) => {
      setTimeout(resolve, ms)
  })
}

function waitFor(condition) {
	const poll = resolve => {
	  if(condition())
	  	resolve()
	  else
	  	setTimeout(_ => poll(resolve), 100)
	}

	return new Promise(poll)
}

test.before(async t => {
	const port = 3000

	const app = express()
  app.use(express.json()) // for parsing application/json

	app.post('/foo', (req, res) => {
    var body = {}

    if (req.is('json'))
      body.document = req.body

    const auth = req.get('Authorization')
    if (auth !== undefined)
      body.token = auth.split(" ")[1]

		res.json(body)
	})

	app.post('/bar/oloy', (req, res) => {
    var body = {}

    if (req.is('json'))
      body.document = req.body

    const auth = req.get('Authorization')
    if (auth !== undefined)
      body.token = auth.split(" ")[1]

		res.json(body)
	})

	app.post('/quz/:item/oloy', (req, res) => {
    var body = {
      item: req.params.item
    }

    if (req.is('json'))
      body.document = req.body

    const auth = req.get('Authorization')
    if (auth !== undefined)
      body.token = auth.split(" ")[1]

		res.json(body)
	})

  app.post('/authorization-token', async (req, res) => {
    const authorization = req.get('Authorization')

    if (authorization === undefined)
      res.status(401).send()
    else {
      const token = authorization.split(" ")[1]
      res.status(200).json({ token: token })
    }
  })

  app.post('/client-side-error', async (req, res) => {
    res.status(400).send({
      kind: "client-side-error",
      foo: "bar",
      bar: "foo"
    })
  })

  app.post('/server-side-error', async (req, res) => {
    res.status(400).send({
      kind: "server-side-error",
      foo: "bar",
      bar: "foo"
    })
  })

  app.post('/slow-endpoint', async (req, res) => {
    await sleep(500)
    res.status(204).send()
  })

  app.post('/non-compliant-invalid-status', async (req, res) => {
    res.status(501).send()
  })

  app.post('/non-compliant-invalid-kind-value', async (req, res) => {
    res.status(400).send({ kind: "yolo" })
  })

  app.post('/non-compliant-invalid-response', async (req, res) => {
    // Returns a JSON body without the right 'Content-Type' set in the header.
    res.set('Content-Type', 'text/plain').send("42")
  })

  // Start server and wait until it's fully up and running.
	var isReady = false
	var server = app.listen(port, () => {
		isReady = true
	})

	await waitFor(_ => isReady === true)

  // Set up context to shut down server later.
	t.context = { app, port, server }
})

test.after(t => {
	var server = t.context.server
	server.close()
})

test('non-collection-endpoint', async t => {
	var endpoints = new Endpoints("http://127.0.0.1:3000")
	var endpoint = endpoints.endpoint("foo")

  const document = {
    foo: "bar",
    bar: "foo"
  }
  const token = "abcd1234"

  endpoint.response = body => t.deepEqual(body, {
    document: document
  })
  await endpoint.request(document)

  endpoint.response = body => t.deepEqual(body, {
    document: document,
    token: token
  })
  await endpoint.request(document, token)
})

test('collection-endpoint-without-item', async t => {
	var endpoints = new Endpoints("http://127.0.0.1:3000")
	var endpoint = endpoints.collectionEndpoint("bar", "oloy", false)

  const document = {
    foo: "bar",
    bar: "foo"
  }
  const token = "abcd1234"

  endpoint.response = body => t.deepEqual(body, {
    document: document
  })
  await endpoint.request(document)

  endpoint.response = body => t.deepEqual(body, {
    document: document,
    token: token
  })
  await endpoint.request(document, token)
})

test('collection-endpoint-with-item', async t => {
	var endpoints = new Endpoints("http://127.0.0.1:3000")
	var endpoint = endpoints.collectionEndpoint("quz", "oloy", true)

  const document = {
    foo: "bar",
    bar: "foo"
  }
  const token = "abcd1234"

  endpoint.response = body => t.deepEqual(body, {
    item: "yolo"
  })
  await endpoint.request("yolo", undefined)

  endpoint.response = body => t.deepEqual(body, {
    item: "yolo",
    document: document
  })
  await endpoint.request("yolo", document)

  endpoint.response = body => t.deepEqual(body, {
    item: "yolo",
    document: document,
    token: token
  })
  await endpoint.request("yolo", document, token)
})

test('authorization-token', async t => {
	var endpoints = new Endpoints("http://127.0.0.1:3000")
	var endpoint = endpoints.endpoint("authorization-token")

  var flag = false
  endpoint.authorizationError = _ => flag = true
  endpoint.response = document => t.deepEqual(document, {token: "abcd1234"})

  await endpoint.request(undefined)
  t.is(flag, true)

  await endpoint.request(undefined, "abcd1234")
})

test('client-side-error', async t => {
	var endpoints = new Endpoints("http://127.0.0.1:3000")
	var endpoint = endpoints.endpoint("client-side-error")

  endpoint.clientError = document => {
    t.deepEqual(document, {
      kind: "client-side-error",
      foo: "bar",
      bar: "foo"
    })
  }

  await endpoint.request()
})

test('server-side-error', async t => {
	var endpoints = new Endpoints("http://127.0.0.1:3000")
	var endpoint = endpoints.endpoint("server-side-error")

  endpoint.serverError = document => {
    t.deepEqual(document, {
      kind: "server-side-error",
      foo: "bar",
      bar: "foo"
    })
  }

  await endpoint.request()
})

test('timeout-error', async t => {
  // Test if custom timeout is honored and if the 'timeoutError' callback is
  // called.
	var endpoints = new Endpoints("http://127.0.0.1:3000", 200)
	t.is(endpoints.timeout, 200)

	var endpoint = endpoints.endpoint("slow-endpoint")

  var flag = false
  endpoint.timeoutError = _ => flag = true

  await endpoint.request()

  t.is(flag, true)
})

test('non-compliant-endpoints', async t => {
  // TODO; There must be more non-compliant endpoint cases to handle.

	var endpoints = new Endpoints("http://127.0.0.1:3000")

	var endpoint = endpoints.endpoint("non-compliant-invalid-status")
  await endpoint.request().then(
    undefined,
    error => t.is(error, "non-compliant-invalid-status")
  )

	var endpoint = endpoints.endpoint("non-compliant-invalid-kind-value")
  await endpoint.request().then(
    undefined,
    error => t.is(error, "non-compliant-invalid-kind-value")
  )

	var endpoint = endpoints.endpoint("non-compliant-invalid-response")
  await endpoint.request().then(
    undefined,
    error => t.is(error, "non-compliant-invalid-response")
  )
})
