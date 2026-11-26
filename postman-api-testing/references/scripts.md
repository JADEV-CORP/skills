# Postman scripts

All snippets use the `pm` API of the current Postman sandbox. They run the same in the Postman app and in Newman.

## Create, then chain

Post-response script on `POST /orders`:

```js
pm.test('201 Created', () => pm.response.to.have.status(201));

const orderSchema = {
  type: 'object',
  required: ['id', 'customerId', 'status', 'items'],
  properties: {
    id: { type: 'string', minLength: 1 },
    customerId: { type: 'string' },
    status: { enum: ['Pending', 'Paid', 'Cancelled'] },
    items: { type: 'array', minItems: 1 }
  }
};

pm.test('body matches the order contract', () => {
  pm.response.to.have.jsonSchema(orderSchema);
});

pm.test('Location points to the new order', () => {
  const { id } = pm.response.json();
  pm.expect(pm.response.headers.get('Location')).to.include(`/orders/${id}`);
  pm.collectionVariables.set('orderId', id);
});
```

`GET /orders/{{orderId}}` then asserts the values sent in the POST, not just that fields exist:

```js
pm.test('returns what was created', () => {
  const body = pm.response.json();
  pm.expect(body.id).to.eql(pm.collectionVariables.get('orderId'));
  pm.expect(body.items[0].quantity).to.eql(2);
});
```

Keep schemas in a collection-level script or a collection variable when several requests share them, so a contract change is edited once.

## Errors

```js
pm.test('400 with problem details', () => {
  pm.response.to.have.status(400);
  pm.expect(pm.response.headers.get('Content-Type')).to.include('application/problem+json');
  const body = pm.response.json();
  pm.expect(body).to.include.keys('type', 'title', 'status');
  // Match the casing your API returns for field names.
  pm.expect(body.errors).to.have.property('customerId');
});
```

`GET /orders/{{orderId}}` after the delete:

```js
pm.test('deleted order is gone', () => pm.response.to.have.status(404));
```

For 401, set the request's auth to "No Auth". For 403, use a second token for a user without the role, stored in its own variable.

## Paging

```js
pm.test('paging metadata is consistent', () => {
  const body = pm.response.json();
  pm.expect(body.items.length).to.be.at.most(body.pageSize);
  pm.expect(body.totalPages).to.eql(Math.ceil(body.totalCount / body.pageSize));
});
```

Adapt the field names to the API's real paging shape (cursor-based APIs have none of these).

## Token pre-request script (client credentials)

Collection-level pre-request script. It reuses the token until one minute before expiry and never logs it. Postman's built-in OAuth 2.0 helper is fine in the app, but Newman does not fetch tokens through it, so a script keeps app and CI identical.

```js
const expiresAt = Number(pm.collectionVariables.get('tokenExpiresAt') || 0);

if (Date.now() > expiresAt - 60000) {
  pm.sendRequest({
    url: pm.environment.get('tokenUrl'),
    method: 'POST',
    header: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: {
      mode: 'urlencoded',
      urlencoded: [
        { key: 'grant_type', value: 'client_credentials' },
        { key: 'client_id', value: pm.environment.get('clientId') },
        { key: 'client_secret', value: pm.environment.get('clientSecret') },
        { key: 'scope', value: pm.environment.get('scope') }
      ]
    }
  }, (err, res) => {
    if (err || res.code !== 200) {
      // Leave the token unset: the requests fail with 401 and the run shows why.
      console.error('Token request failed', err ? err.message : res.code);
      return;
    }
    const json = res.json();
    pm.collectionVariables.set('accessToken', json.access_token);
    pm.collectionVariables.set('tokenExpiresAt', String(Date.now() + json.expires_in * 1000));
  });
}
```

The main request waits for the callback to finish. Set the collection's auth to Bearer `{{accessToken}}` so every request inherits it.

## Test data

```js
// Pre-request on the create request: unique per run.
pm.collectionVariables.set('customerEmail', `api-test-${Date.now()}@example.test`);
```

Use the reserved `.test` or `example.com` domains for addresses, never real people's data.

## Converting an old collection

- `tv4.validate(...)`: replace with `pm.response.to.have.jsonSchema(schema)`.
- `postman.setEnvironmentVariable`, `responseBody`, `tests['...'] = ...`: legacy sandbox API. Replace with `pm.environment.set`, `pm.response.json()`, `pm.test`.
- Tests that only log: turn them into real assertions or delete them.
