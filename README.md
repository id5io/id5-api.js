# ID5 Universal ID

The ID5 Universal ID is a shared, neutral identifier that publishers, advertisers, and ad tech platforms can use to recognise users even in environments where 3rd party cookies are not available. ID5 enables websites to create and distribute a shared 1st party identifier to the entire ecosystem. Ad tech platforms connect with ID5 to decrypt the Universal ID and improve their ability to recognise users. The ID5 Universal ID is designed to respect users' privacy choices and websites' preferences throughout the advertising value chain.

# ID5 API Overview

The ID5 API is designed to make accessing the ID5 Universal ID simple for publishers, advertisers, and their ad tech vendors. The lightweight source code handles retrieving users’ consent preferences, retrieving, caching, and storing the ID locally, and making it available to other code on the page. A flow diagram of how the ID5 API interacts with your CMP and other vendor tags can be [found below](#api-process-flow).

Stay up-to-date with all of our API releases by subscribing to our [release notes](https://id5.io/universal-id/release-notes).

# Table of Contents

- [ID5 Universal ID](#id5-universal-id)
- [ID5 API Overview](#id5-api-overview)
- [Table of Contents](#table-of-contents)
- [Setup and Installation](#setup-and-installation)
  - [ID5 Partner Creation](#id5-partner-creation)
  - [Quick Start](#quick-start)
  - [API Source Code](#api-source-code)
    - [ID5 CDN](#id5-cdn)
    - [Pre-built and Minified for Download](#pre-built-and-minified-for-download)
    - [Build from Source (more advanced)](#build-from-source-more-advanced)
  - [Usage](#usage)
    - [Load the API javascript file](#load-the-api-javascript-file)
    - [Initialize the API](#initialize-the-api)
    - [Access the ID5 Universal ID](#access-the-id5-universal-id)
    - [Available Configuration Options](#available-configuration-options)
      - [Generating Partner Data String](#generating-partner-data-string)
      - [A/B Testing](#ab-testing)
    - [Available Methods and Variables](#available-methods-and-variables)
      - [EIDs Object Output](#eids-object-output)
    - [Examples](#examples)
      - [Enabling Debug Output](#enabling-debug-output)
    - [Test locally](#test-locally)
  - [Prebid.js](#prebidjs)
- [API Process Flow](#api-process-flow)
- [Benefits of Using the ID5 API](#benefits-of-using-the-id5-api)
- [The GDPR and Privacy](#the-gdpr-and-privacy)
  - [GDPR](#gdpr)
  - [Privacy Policy](#privacy-policy)

# Setup and Installation

## ID5 Partner Creation

The first step to work with the ID5 API and Universal ID is to apply for an ID5 Partner account. If you are not already integrated with ID5, simply go to [id5.io/universal-id](https://id5.io/universal-id) and register for an account.

## Quick Start

Install the ID5 API after your CMP (if applicable), but as high in the `<head>` as possible.

```html
<!-- CMP code goes here -->

<script src="https://cdn.id5-sync.com/api/1.0/id5-api.js"></script>
<script>
  (function() {
    // TODO: modify with your own partnerId
    // beware of scope of id5Status
    var id5Status = ID5.init({partnerId: 173});

    // ... do something ...

    var myId5 = id5Status.getUserId();
  })();
</script>
```

## API Source Code

### ID5 CDN

To use the ID5 CDN version of the API, you may source the library as follows:

```html
<script src="https://cdn.id5-sync.com/api/1.0/id5-api.js"></script>
```

Using our CDN has the advantage of patch updates being automatically deployed without any intervention your end.

### Pre-built and Minified for Download

You may also choose to download the latest release (and host on your own CDN) in a pre-built, minified version from Github:

* [https://github.com/id5io/id5-api.js/releases/download/v1.0.0/id5-api.js](https://github.com/id5io/id5-api.js/releases/download/v1.0.0/id5-api.js)

As a publisher or advertiser, the advantage to hosting the code in your website domain is that the API will have "1st party" privileges with the browser, improving the value of the Universal ID delivered.

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

*Note*: If you build from source, you must use our `gulp build` process as it appends required variables to the end of the built file. If `ID5.version` is missing, the API will fail to load.

## Usage

There are three main parts to using the ID5 API:

1. Load the javascript file
1. Initialize the API with the partner ID you received from ID5, as well as any other configuration options you’d like to set
1. Access the ID5 Universal ID

### Load the API javascript file

The ID5 API script should be placed as high in the page as possible, but should be *after* your CMP is loaded & initialized (if applicable). By placing this script early in the page, all subsequent scripts on page (including Prebid.js, ad tags, attribution or segment pixels, etc.) can leverage the ID5 Universal ID. You should load the script *synchronously* to ensure that the API is loaded before attempting to call it.

```html
<script src="/path/to/js/id5-api.js"></script>
```

### Initialize the API

After loading the script, you must initialize the API with the `ID5.init()` method. You may pass configuration options directly into the init method. The result of the `init()` method is a variable that you will use to access the ID5 ID or perform other actions. This variable must be unique to the page (or scoped appropriately) in order not avoid collisions with other instances of the API on the same page.

```javascript
// TODO modify with your own partnerId
// beware to scope the id5Status variable or uniquely name it to avoid collisions
var id5Status = ID5.init({partnerId: 173});
```

### Access the ID5 Universal ID

Once the API has been loaded and initialized, the ID5 Universal ID can be accessed by any javascript on the page (provided your variable is scoped appropriately) including Prebid.js, your ad tags, or pixels and scripts from third party vendors, with the `getUserId()` method on your status variable.

```javascript
var id5Id = id5Status.getUserId();
```

The `getUserId()` method always answers (once the API is loaded) and will return immediately with a value. If there is no ID available yet, the `getUserId()` will return a value of `undefined`.

There are a few cases in which `getUserId()` may not be ready or have a value yet:

* There is no locally cached version of the ID and no response has been received yet from the ID5 servers (where the ID is generated)
* The CMP has not finished loading or gathering consent from the user, so no ID can be retrieved
* The user has not consented to allowing local storage

### Available Configuration Options

| Option Name | Scope | Type | Default Value | Description |
| --- | --- | --- | --- | --- |
| partnerId | Required | integer | | ID5 Partner ID, received after registration with ID5 |
| debugBypassConsent | Optional | boolean | `false` | Bypass consent API and Local Storage access; *for debugging purpose only* |
| allowLocalStorageWithoutConsentApi | Optional | boolean | `false` | Tell ID5 that consent has been given to read local storage |
| cmpApi | Optional | string | `iab` | API to use CMP. As of today, either `'iab'` or `'static'` |
| consentData | Optional, Required if `cmpApi` is `'static'` | object | | Consent data if `cmpApi` is `'static'`. Object should be a valid TCF consent object.
| partnerUserId | Optional | string | | User ID of the platform if they are deploying this API on behalf of a publisher/advertiser, to be used for user syncing with ID5 |
| pd | Optional | string | | Partner-supplied data used for linking ID5 IDs across domains. See [Generating Partner Data String](#generating-partner-data-string) below for details on generating the string |
| refreshInSeconds | Optional | integer | `7200`<br>(2 hours) | Refresh period of first-party local storage |
| abTesting | Optional | object | `{ enabled: false, controlGroupPct: 0 }` | Enables A/B testing of the ID5 ID. See [A/B Testing](#ab-testing) below for more details |
| provider | Optional | string | `pubmatic-identity-hub` | An identifier provided by ID5 to technology partners who manage API deployments on behalf of their clients. Reach out to [ID5](mailto:support@id5.io) if you have questions about this parameter |

#### Generating Partner Data String
The `pd` field (short for Partner Data) is a base64 encoded string that contains any deterministic user data you have access to. The data will be used strictly to provide better linking of ID5 IDs across domains for improved user identification. If the user has not provided ID5 with a legal basis to process data, the information sent to ID5 will be ignored and neither used nor saved for future requests.

If you do not have any Partner Data to pass to ID5, the `pd` parameter can be omitted or left with an empty string value (`pd: ""`).

The possible keys in the string are:

| Key | Value |
| --- | --- |
| 0 | other |
| 1 | sha256 hashed email |
| 2 | sha256 hashed phone number |
| 3 | cross-domain publisher user_id value |
| 4 | cross-domain publisher user_id source (request the value from ID5) |
| 5 | single-domain publisher user_id value |

To illustrate how to generate the `pd` string, let's use an example. Suppose you have an email address for the user, in this example it is `myuser@domain.com`, and want to share it with ID5 to strengthen the value of the UID we respond with. You also have your own user id for this user that you can share: `ABC123`.

First, perform a sha256 hash of the email, resulting in the string `b50ca08271795a8e7e4012813f23d505193d75c0f2e2bb99baa63aa822f66ed3`

Next, create the raw `pd` string containing the keys `1` (for the hashed email) and `5` (for the single-domain publisher user id), separated by `&`’s (the order doesn't matter):

```
1=b50ca08271795a8e7e4012813f23d505193d75c0f2e2bb99baa63aa822f66ed3&5=ABC123
```

Finally, `base64` the entire raw pd string, resulting in the final `pd` value:

```
MT1iNTBjYTA4MjcxNzk1YThlN2U0MDEyODEzZjIzZDUwNTE5M2Q3NWMwZjJlMmJiOTliYWE2M2FhODIyZjY2ZWQzJjU9QUJDMTIz
```

This is the value you will add to the config when you initialize the API:

```javascript
var id5Status = ID5.init({
  partnerId: 173, // modify with your own partnerId
  pd: "MT1iNTBjYTA4MjcxNzk1YThlN2U0MDEyODEzZjIzZDUwNTE5M2Q3NWMwZjJlMmJiOTliYWE2M2FhODIyZjY2ZWQzJjU9QUJDMTIz"
});
```

#### A/B Testing

You may want to test the value of the ID5 ID with their downstream partners. While there are various ways to do this, A/B testing is a standard approach. Instead of manually enabling or disabling the ID5 API based on their control group settings (which leads to fewer calls to ID5, reducing our ability to recognize the user), we have baked this in to the API itself.

To turn on A/B Testing, simply edit the configuration (see below) to enable it and set what percentage of users you would like to set for the control group. The control group is the set of users where an ID5 ID will not be exposed in `id5Status.getUserId()` - this method will return `0` for the control group. It's important to note that the control group is user based, and not request based. In other words, from one page view to another, a given user may will *always* be in or out of the control group.

The configuration object for `abTesting` contains two variables:

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| enabled | boolean | `false` | Set this to `true` to turn on this feature |
| controlGroupPct | number | `0` | Must be a number between 0 and 1 (inclusive) and is used to determine the percentage of users that fall into the control group (and thus not exposing the ID5 ID). For example, a value of `0.20` will result in 20% of users without an ID5 ID and 80% with an ID. |


### Available Methods and Variables

| Name | Type | Return Type | Description |
| --- | --- | --- | --- |
| ID5.init({}) | method | n/a | Takes a config object as the only parameter and initializes the API with these configuration options, returns an `Id5Status` object|
| ID5.refreshId(id5Status, boolean, config) | method | n/a | A method to refresh the ID without reloading the page. Must come _after_ the `init()` method is called. First parameter is the `id5Status` returned from `init()`, the second (optional) param is a boolean, set to `true` to force a fetch call to ID5, set to `false` to only call ID5 if necessary. The third (optional) parameter is a valid config object to add/change options prior to refreshing the ID. |
| ID5.loaded | variable | boolean | This variable will be set to `true` once the API is loaded and ready for use |
| id5Status.getUserId() | method | string | The ID5 Universal ID value. If not set yet, returns `undefined` |
| id5Status.getLinkType() | method | number | Indicates the type of connection ID5 has made with this ID across domains. Possible values are: `0` = ID5 has not linked this user across domains (i.e. `original_uid` == `universal_uid`); `1` = ID5 has made a probabilistic link to another UID; `2` = ID5 has made a deterministic link to another UID. If `userId` is not set yet, returns `undefined` |
| id5Status.isFromCache() | method | boolean | Indicates whether the `userId` value is from cache (when set to `true`) or from a server response (when set to `false`). If `userId` is not set yet, returns `undefined` |
| id5Status.exposeUserId() | method | boolean | Applicable when [A/B Testing](#ab-testing) is turned on; when this method returns `true`, the user is not in the control group and `id5Status.getUserId()` is populated with the ID5 ID; when `false`, the user is considered as part of the control group and `id5Status.getUserId()` will be `0`. This method can be used to inform your reporting systems that an ID was available or not, instead of relying on the value of `id5Status.getUserId()` directly. |
| id5Status.getUserIdAsEid() | method | object | Retrieve the ID5 ID as an object that can be directly added to an `eids` array in an OpenRTB bid request. See [below](#eids-object-output) for a example output |
| id5Status.onAvailable(fn, timeout) | method | id5Status | Set an event to be called when the ID5 ID is available. Will be called only once per `ID5.init()`. The first parameter is a function to call, which will receive as its only parameter the `id5Status` object. The second, optional, parameter, is a timeout in ms; if the `fn` has not been called when the timeout is hit, then it will force a call to `fn` even if the ID5 ID is not available yet. If not provided, then it will wait indefinitely until the ID5 ID is available to call `fn`. |
| id5Status.onUpdate(fn) | method | id5Status | Set an event listener to be called any time the ID5 ID is updated. For example, if the ID was found in cache, then the `onAvailable` event would immediately fire; but there may be a need to call the ID5 servers for an updated ID. When the call to ID5 returns, the `onUpdate` event will fire. If `refreshId` is called, when the ID is refreshed, the `onUpdate` event will also fire. The first and only parameter is a function to call, which will receive as its only parameter the `id5Status` object. |
| id5Status.onRefresh(fn, timeout) | method | id5Status | Set an event listener to be called any time the `refreshId` method has returned with an ID. The first parameter is a function to call, which will receive as its only parameter the `id5Status` object. The second, optional, parameter, is a timeout in ms; if the `fn` has not been called when the timeout is hit, then it will force a call to `fn` even if the `refreshId` has not returned with an ID. If not provided, then it will wait indefinitely until the ID5 ID is returned from `refreshId` to call `fn` |

#### EIDs Object Output
When passing the ID5 ID in a bid request, the common practice is to include it in the `user.ext.eids[]` array. To make it easy to retrieve the ID in a format that can be included in the `eids` array, the `id5Status.getUserIdAsEid()` method can be used. An example of the output of this object is below:

```javascript
{
  "source": "id5-sync.com",
  "uids": [
    {
      "id": "ID5-ABCDEFG12345",
      "ext": {
        "linkType": 2,
        "abTestingControlGroup": false
      }
    }
  ]
}
```

### Examples

Default configuration options

```html
<script src="/path/to/js/id5-api.js"></script>
<script>
  var id5Status = ID5.init({partnerId: 173}); // modify with your own partnerId

  var id5Id = id5Status.getUserId();
</script>
```

Setting some configuration options at initialization

```html
<script src="/path/to/js/id5-api.js"></script>
<script>
  var id5Status = ID5.init({
    partnerId: 173, // modify with your own partnerId
    refreshInSeconds: 3600,
  });

  var id5Id = id5Status.getUserId();
</script>
```

Setting an `onAvailable` event listener to retrieve the ID5 ID

```html
<script src="/path/to/js/id5-api.js"></script>
<script>
  var id5Callback = function (id5Status) {
    var id5Id = id5Status.getUserId();

    // do something with the ID5 ID
    if(id5Id) {
      fireMyPixel(`https://pixel.url.com?id5id=${id5Id}`);
    }
  };

  ID5.init({
    partnerId: 173 // modify with your own partnerId
  }).onAvailable(id5Callback, 200); // fire after 200ms even if no user id available
</script>
```

Setting an `onAvailable` and `onUpdate` event listeners to retrieve the ID5 ID using a call chain

```html
<script src="/path/to/js/id5-api.js"></script>
<script>
  var id5Callback = function (id5Status) {
    var id5Id = id5Status.getUserId();

    // do something with the ID5 ID
    fireMyPixel(`https://pixel.url.com?id5id=${id5Id}`);
  };

  ID5.init({ partnerId: 173 }).onAvailable(id5Callback).onUpdate(id5Callback);
</script>
```

#### Enabling Debug Output
To enable debug output in the browser console, set `ID5.debug` to true before any call, or add a `id5_debug=true` to the query string of the page url.
```javascript
ID5.debug = true;
var id5Status = ID5.init({ ... });
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

This runs `lint` and `test`, then starts a web server at `http://localhost:9999` serving from the project root. Navigate to your example implementation to test, and if your `id5-api.js` file is sourced from the `./build/dev` directory you will have sourcemaps available in your browser's developer tools.

As you make code changes, the bundles will be rebuilt and the page reloaded automatically.

## Prebid.js

The ID5 API can be used alongside the [User ID module in Prebid.js](http://prebid.org/dev-docs/modules/userId.html#id5-id), allowing publishers to centrally manage the Universal ID while still leveraging Prebid to push the Universal ID to its demand partners.

When deploying the ID5 API alongside Prebid on a webpage, ensure that the following order is maintained when including the code:

1. CMP
1. ID5 API
1. Prebid.js

Within the [Prebid.js configuration for the ID5 ID](http://prebid.org/dev-docs/modules/userId.html#id5-id-configuration), ensure the Prebid storage name (set in `storage.name`) is `id5id`, the storage type (set in `storage.type`) is `html5`, and the two codebases will work together seamlessly.

```javascript
pbjs.setConfig({
    usersync: {
        userIds: [{
            name: "id5Id",
            params: {
                partner: 173            // same value as in the API config
            },
            storage: {
                type: "html5",
                name: "id5id",
                expires: 90,
                refreshInSeconds: 2*3600
            }
        }]
    }
});
```

Note that both the User ID module and ID5 submodule must still be included in the Prebid build, even when using the ID5 API to manage the ID5 Universal ID. For more detailed instructions on how to use the ID5 Universal ID in Prebid, refer to [our documentation](https://console.id5.io/docs/public/prebid).

# API Process Flow
Below is an example flow diagram of how the ID5 API interacts with your CMP and other vendor tags.

![Universal ID Diagram](universal-id-flow.png)

1. Publisher first loads its CMP and captures the user’s consent preferences (where applicable). This is essential before any IDs or ads are requested or delivered
2. The ID5 API checks in cache for an ID5 ID and ensures it is still fresh. If necessary, a request to ID5 is made for a new/refreshed ID, which is then placed in cache to avoid unnecessary http requests on future page views.
3. The Vendor’s tag on the publisher’s page retrieves the ID5 ID via the API and passes it, along with any other information they normally send, to their servers for processing. Examples of Vendor Tags are Prebid.js (or other header bidding solutions), ad tags, attribution or segment pixels, etc.
4. The Vendor’s servers makes requests to other platforms, including the ID5 ID in addition to, or instead of, the normal user IDs they pass

# Benefits of Using the ID5 API

There are a number of reasons for publishers to use the ID5 API.

* Any platform with tags on the publisher’s page can access the ID5 ID directly without calling ID5’s servers, which reduces the number of HTTP requests required to retrieve the ID5 Universal ID for all platforms, ultimately decreasing page loading time
* The API centrally manages user consent, caching, and ID storage for any platform that needs access to the ID on the page
* Allows for 1st Party storage of the user ID, enabling user identification in browsers that block 3rd Party cookies (like Safari or Firefox) without the need for workarounds that could be blocked with a new release
* With the ID5 Universal ID being consistent and persistent, publishers will earn more revenue from their ad tech platforms through near 100% match rates and advertisers will be able to reach more of their audiences
* A shared ID eliminates the need for cookie syncing on publisher pages, decreasing page latency
* The API’s code is open-source and available for your review (and contribution) here on Github: [https://github.com/id5io/id5-api.js](https://github.com/id5io/id5-api.js) - this means we don’t have any sneaky code doing something you don’t know about

# The GDPR and Privacy

## GDPR

ID5 has built a privacy-by-design and GDPR-compliant universal ID service for publishers, advertisers, and ad tech vendors. The service leverages the IAB’s Transparency and Consent Framework (TCF) to capture user consent signals.

As an identity provider, ID5 acts as a controller of the Universal ID, and thus, we must receive consent to process requests. When we receive a request for the ID5 ID, we check that we have consent to store our user ID in a user's browser before proceeding; if we don’t have consent we inform the calling page (through our API) that consent was not received and we do not write a 3rd party cookie as part of the HTTP response.

## Privacy Policy

For our Platform Privacy Policy, please visit [https://id5.io/platform-privacy-policy](https://id5.io/platform-privacy-policy).
