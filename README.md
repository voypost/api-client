# api-client

## Getting started

```js
import { createApiClient } from '@voypost/api-client';

export default createApiClient({
  clientId: 'xxx',
  clientSecret: 'yyy',
  baseUrl: 'https://foo.api.voypost.com/',
  audience: 'https://foo.api.voypost.com/',
  tokenBaseUrl: 'https://voypost.auth0.com/',
  scopes: ['users:read'],
});
```
