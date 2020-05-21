# ID5 Universal ID

The ID5 Universal ID is a shared, neutral identifier that publishers and ad tech platforms can use to recognise users even in environments where 3rd party cookies are not available. ID5 enables publishers to create and distribute a shared 1st party identifier to the entire ecosystem. Ad tech platforms connect with ID5 to decrypt the Universal ID and improve their ability to recognise users. The ID5 Universal ID is designed to respect users' privacy choices and publishers’ preferences throughout the advertising value chain.

# ID5 API Overview

> NOTE: The API is currently in BETA and may have frequent updates while we make improvements prior to releasing `v1.0`

The ID5 API is designed to make accessing the ID5 Universal ID simple for publishers and their ad tech vendors. The lightweight source code handles users’ consent preferences, retrieving, caching, and storing the ID locally, and making it available to other code on the page, including Prebid.js. A flow diagram of how the ID5 API interacts with your CMP and other vendor tags can be [found below](#api-process-flow).

Stay up-to-date with all of our API releases by subscribing to our [release notes](https://id5.io/universal-id/release-notes).

# Table of Contents

* [ID5 Universal ID](#id5-universal-id)
* [ID5 API Overview](#id5-api-overview)
* [Setup and Installation](#setup-and-installation)
  * [ID5 Partner Creation](#id5-partner-creation)
  * [Quick Start](#quick-start)
  * [API Source Code](#api-source-code)
  * [Usage](#usage)
  * [Prebid.js](#prebidjs)
* [API Process Flow](#api-process-flow)
* [Benefits of Using the ID5 API](#benefits-of-using-the-id5-api)
* [The GDPR and Privacy](#the-gdpr-and-privacy)

# Setup and Installation

## ID5 Partner Creation

The first step to work with the ID5 API and Universal ID is to apply for an ID5 Partner account. If you are not already integrated with ID5, simply go to [id5.io/universal-id](https://id5.io/universal-id) and register for an account.

## Quick Start

<!--Download the latest pre-built, minified version from Github

* [https://github.com/id5io/id5-api.js/releases/download/v0.9/id5-api.js](https://github.com/id5io/id5-api.js/releases/download/v0.8/id5-api.js)

Install the ID5 API after your CMP (if applicable), but as high in the `HEAD` as possible

```html
<script src=”/path/to/js/id5-api.js”></script>
<script>
  ID5.init({partnerId: 173}); // modify with your own partnerId
</script>
```
-->
Install the ID5 API after your CMP (if applicable), but as high in the `HEAD` as possible

```html
<!-- CMP code goes here -->

<script src="https://cdn.id5-sync.com/api/0.8/id5-api.js"></script>
<script>
  ID5.init({partnerId: 173}); // modify with your own partnerId
</script>
```

Retrieve the ID5 ID anywhere on your page

```html
<script>
  var id5Id = ID5.userId;
</script>
```

## API Source Code

> NOTE: While we are still in BETA, we suggest that you pull directly from our [hosted version](#id5-hosted-source-during-beta) until we’re ready to release v1.0. At that time, you should build from source and host it locally on your own CDN.

### ID5-Hosted Source During BETA

During our BETA period, the API should be installed by sourcing the file from our domain:

```html
<script src="https://cdn.id5-sync.com/api/0.9/id5-api.js"></script>
```

This will enable us to make more frequent changes and bug fixes without the need for you to re-build and deploy code on your end. Once the BETA is over, we recommend building from source and hosting on your own CDN instead.


### Pre-built and Minified for Download

You can download the latest release (and host on your own CDN) in a pre-built, minified version from:

* [https://github.com/id5io/id5-api.js/releases/download/v0.9/id5-api.js](https://github.com/id5io/id5-api.js/releases/download/v0.8/id5-api.js)

### Build from Source (more advanced)

To build a production-ready version of the API from source yourself, follow these steps:

Clone the repository and install dependencies

```bash
$ git clone https://github.com/id5io/id5-api.js id5-api.js
$ cd id5-api
$ npm install
```

*Note*: You need to have `NodeJS 8.9.x` or greater and `Gulp 4.0` or greater installed.

Build for production with gulp

```bash
$ gulp build
```

The resulting minified javascript file will be available in `./build/dist/id5-api.js`.

## Usage

There are three main parts to using the ID5 API:

1. Load the javascript file
1. Initialize the API with the partner ID you received from ID5, as well as any other configuration options you’d like to set
1. Access the ID5 Universal ID

### Load the API javascript file

The ID5 API script should be placed as high in the page as possible, but should be after your CMP is loaded & configured (if applicable). By placing this script early in the page, all subsequent scripts on page (including Prebid.js, ad tags, attribution or segment pixels, etc.) can leverage the ID5 Universal ID. You should load the script *synchronously* to ensure that the API is loaded before attempting to call it.

```html
<script src=”/path/to/js/id5-api.js”></script>
```

### Initialize the API

After loading the script, you must initialize the API with the `ID5.init()` method. You may pass configuration options directly into the init method.

```html
<script>
  ID5.init({partnerId: 173}); // modify with your own partnerId
  ...
</script>
```

### Access the ID5 Universal ID

Once the API has been loaded and initialized, the ID5 Universal ID can be accessed by any javascript on the page, including Prebid.js, your ad tags, or pixels and scripts from third party vendors, with the ID5.userId variable.

```html
<script>
  ...
  var id5Id = ID5.userId;
</script>
```

The `ID5.userId` variable always exists (once the API is loaded) and will return immediately with a value. If there is no ID available yet, the `ID5.userId` will return a value of `undefined`.

There are a few cases in which the ID5.userId may not be ready or have a value:

* There is no locally cached version of the ID and no response has been received yet from the ID5 servers (where the ID is generated)
* The CMP has not finished loading or gathering consent from the user, so no ID can be retrieved
* The user has not consented to allowing local storage

### Available Configuration Options

| Option Name | Scope | Type | Default Value | Description |
| --- | --- | --- | --- | --- |
| debug | Optional | boolean | `false` | Enable verbose debug mode (defaulting to `id5_debug` query string param if present, or `false`) |
| allowID5WithoutConsentApi | Optional | boolean | `false` | Allow ID5 to fetch user id even if no consent API |
| cookieName | Optional | string | `id5.1st` | ID5 1st party cookie name |
| refreshInSeconds | Optional | integer | `7200`<br>(2 hours) | Refresh period of first-party cookie |
| cookieExpirationInSeconds | Optional | integer | `7776000`<br>(90 days) | Expiration of 1st party cookie |
| partnerId | Required | integer | | ID5 Partner ID, received after registration with ID5 |
| partnerUserId | Optional | string | | User ID for the publisher, to be stored by ID5 for further matching if provided |
| cmpApi | Optional | string | `iab` | API to use CMP. As of today, either 'iab' or 'static' |
| consentData | Optional, Required if `cmpApi` is `'static'` | object | | Consent data if `cmpApi` is `'static'`. Object should contain the following:`{ getConsentData: { consentData: <consent_data>, gdprApplies: <true\|false> }}`

### Available Methods and Variables

| Name | Type | Return Type | Description |
| --- | --- | --- | --- |
| ID5.userId | variable | string | The ID5 Universal ID value. If not set yet, returns `undefined` |
| ID5.loaded | variable | boolean | Set to `true` once the API is loaded and ready for use |
| ID5.init({}) | method | n/a | Takes a config object as the only parameter and initializes the API with these configuration options |

### Examples

Default configuration options

```html
<script src=”/path/to/js/id5-api.js”>
<script>
  ID5.init({partnerId: 173}); // modify with your own partnerId

  var id5Id = ID5.userId;
</script>
```

Setting some configuration options at initialization

```html
<script src=”/path/to/js/id5-api.js”>
<script>
  ID5.init({
    partnerId: 173, // modify with your own partnerId
    cookieName: “id5api-pub”,
    refreshInSeconds: 3600,
    partnerUserId: myUserId()
  });

  var id5Id = ID5.userId;
</script>
```

### Test locally

To lint the code

```bash
$ gulp lint
```

To run the unit tests

```bash
$ gulp test
```

To generate and view the code coverage reports

```bash
$ gulp test-coverage
$ gulp view-coverage
```

Build and run the project locally with

```
$ gulp serve
```

This runs `lint` and `test`, then starts a web server at `http://localhost:9999` serving from the project root. Navigate to your example implementation to test, and if your `prebid.js` file is sourced from the `./build/dev` directory you will have sourcemaps available in your browser's developer tools.

<!--To run the example file, go to:

* `http://localhost:9999/XXXXXX`-->

As you make code changes, the bundles will be rebuilt and the page reloaded automatically.

## Prebid.js

The ID5 API can be used alongside the [User ID module in Prebid.js](http://prebid.org/dev-docs/modules/userId.html#id5-id), allowing publishers to centrally manage the Universal ID while still leveraging Prebid to push the Universal ID to its demand partners.

When deploying the ID5 API alongside Prebid on a webpage, ensure that the following order is maintained when including the code:

1. CMP
1. ID5 API
1. Prebid.js

Within the [Prebid.js configuration for the ID5 ID](http://prebid.org/dev-docs/modules/userId.html#id5-id-configuration), rather than providing the `params` object, set the `value` object with the ID5 ID:

```javascript
pbjs.setConfig({
    usersync: {
        userIds: [{
            name: "id5Id",
            value: { "id5id": ID5.userId }
        }]
    }
});
```

Note that both the User ID module and ID5 submodule must be included in the Prebid build, even when using the ID5 API to manage the ID5 Universal ID. For more detailed instructions on how to use the ID5 Universal ID in Prebid, refer to [our documentation](https://console.id5.io/docs/public/prebid).

# API Process Flow
Below is an example flow diagram of how the ID5 API interacts with your CMP and other vendor tags.

![Universal ID Diagram](universal-id-flow.png)

1. Publisher first loads its CMP and captures the user’s consent preferences. This is essential before any IDs or ads are requested or delivered
1. The ID5 API (or potentially Prebid.js, if the publisher configured their page that way) checks in cache (local storage, 1P or 3P cookies) for an ID5 ID and ensures it is still fresh. If necessary, a request to ID5 is made for a new/refreshed ID, which is then placed in cache to avoid unnecessary http requests on future page views.
1. The Vendor’s tag on the publisher’s page retrieves the ID5 ID via the API and passes it, along with any other information they normally send, to their servers for processing. Examples of Vendor Tags are Prebid.js (or other header bidding solutions), ad tags, attribution or segment pixels, etc.)
1. The Vendor’s servers makes requests to other platforms, including the ID5 ID in addition to, or instead of, the normal user IDs they pass

# Benefits of Using the ID5 API

There are a number of reasons for publishers to use the ID5 API.

* Any platform with tags on the publisher’s page can access the ID5 ID directly without calling ID5’s servers, which reduces the number of HTTP requests required to retrieve the ID5 Universal ID for all platforms, ultimately decreasing page loading time
* The API centrally manages user consent, caching, and ID storage for any platform that needs access to the ID on the page
* Allows for 1st Party storage of the user ID, enabling user identification in browsers that block 3rd Party cookies (like Safari or Firefox) without the need for workarounds that could be blocked with a new release
* With the ID5 Universal ID being consistent and persistent, publishers will earn more revenue from their ad tech platforms through near 100% match rates
* A shared ID eliminates the need for cookie syncing on publisher pages, decreasing page latency
* The API’s code is open-source and available for publisher review (and contribution) here on Github: [https://github.com/id5io/id5-api.js](https://github.com/id5io/id5-api.js) - this means we don’t have any sneaky code doing something publisher’s don’t know about

# The GDPR and Privacy

## GDPR

ID5 has built a privacy-by-design and GDPR-compliant shared ID service for publishers and ad tech vendors. The service leverages the IAB’s Transparency and Consent Framework (TCF) to capture user consent signals.

As a shared ID provider, ID5 acts as a controller of the Universal ID, and thus, we must receive consent to process requests. When we receive a request for the ID5 ID, we check that we have consent to store our user ID in a cookie before proceeding; if we don’t have consent we inform the calling page (through our API) that consent was not received and we do not write a cookie as part of the HTTP response.

## Privacy Policy

For our Platform Privacy Policy, please visit [https://id5.io/platform-privacy-policy](https://id5.io/platform-privacy-policy).
