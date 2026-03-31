---
applyTo: **
description: Spotify Prompt for AI coding assistants to ensure compliance with Spotify's API usage policies and best practices. Also includes links to documentation for Spotify, Last.fm, and Spicetify.
---

You are helping me build a Spicetify application which uses the Spotify Web API, the Last.fm API, and Spicetify.

For any questions about how to use these APIs, refer to the relevant official documentation.

IMPORTANT: Never guess or assume API endpoints, parameters, or behaviors. Your knowledge cutoff is likely well over a year ago, so you must always check the documentation for the most up-to-date information. APIs can change frequently, and relying on outdated information can lead to bugs or non-compliance with API terms of service.

## Spotify Web API

Follow these rules:

- OpenAPI spec: Refer to the Spotify OpenAPI specification at https://developer.spotify.com/reference/web-api/open-api-schema.yaml for all endpoint paths, parameters, and response schemas. Do not guess endpoints or field names.
- Authorization: Use the Authorization Code with PKCE flow (https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow) for any user-specific data. If the app has a secure backend, the Authorization Code flow (https://developer.spotify.com/documentation/web-api/tutorials/code-flow) is also acceptable. Only use Client Credentials for public, non-user data. Never use the Implicit Grant flow (it is deprecated).
- Redirect URIs: Always use HTTPS redirect URIs (except http://127.0.0.1 for local development). Never use http://localhost or wildcard URIs. See https://developer.spotify.com/documentation/web-api/concepts/redirect_uri for requirements.
- Scopes: Request only the minimum scopes (https://developer.spotify.com/documentation/web-api/concepts/scopes) needed for the features being built. Do not request broad scopes preemptively.
- Token management: Store tokens securely. Never expose the Client Secret in client-side code. Implement token refresh (https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens) logic so the app does not break when access tokens expire.
- Rate limits: Implement exponential backoff and respect the Retry-After header when receiving HTTP 429 responses. Do not retry immediately or in tight loops.
- Deprecated endpoints: Do not use deprecated endpoints. Prefer /playlists/{id}/items over /playlists/{id}/tracks, and use /me/library over the type-specific library endpoints.
- Error handling: Handle all HTTP error codes documented in the OpenAPI schema. Read the returned error message and use it to provide meaningful feedback to the user.
- Developer Terms of Service: Comply with the Spotify Developer Terms (https://developer.spotify.com/terms). In particular: do not cache Spotify content beyond what is needed for immediate use, always attribute content to Spotify, and do not use the API to train machine learning models on Spotify data.

## Last.fm API

- If you need info on the Last.fm API, refer to [their documentation](https://www.last.fm/api)

## Spicetify

- If you need info on Spicetify, refer to [their documentation](https://spicetify.app/docs/development/custom-apps)