# ID5 API LITE

**ID5 JS API Lite** is a reduced-functionality version of the standard ID5 JS API. Unlike the full API, 
which facilitates a comprehensive set of identity-related functions, the Lite version is purposefully 
built to perform a single operation - retrieving an encrypted ID5 ID that has been previously generated 
by another ID5 integration present on the same page. Compatible ID5 integrations include the standard ID5 JS API, 
ID5 Prebid module, Amazon Publisher Services (APS), and Google ESP.

ID5 JS API Lite does not perform ID generation, user consent handling, or any additional identity-related processes. 
It is intended solely for scenarios where ID retrieval is required without the need for full-featured API capabilities.

> [!WARNING]
>If no other qualifying ID5 integration has been executed on the page, ID5 JS API Lite will not be able to retrieve an ID5 ID.

**Requirements for integrating via ID5 JS API Lite:**
- You require minimal integration footprint, for example, when deploying from within a creative.
- You are unable or prefer not to manage user consent due to technical or legal constraints and need to access an existing encrypted ID5 ID on the page.

# Table of Contents

- [ID5 API Overview](#id5-api-lite)
- [Table of Contents](#table-of-contents)
- [Setup and Installation](#setup-and-installation)
  - [Quick Start](#quick-start)
  - [Integration options](#integration)
    - [ID5 CDN](#id5-cdn)
  - [Usage](#usage)
    - [Load the API javascript file](#load-the-api-javascript-file-)
    - [Initialize the API](#initialize-the-api)
    - [Access the ID5 ID](#access-the-id5-id)
    - [Available Configuration Options](#available-configuration-options)
      - [A/B Testing](#ab-testing)
      - [Segments](#segments)
    - [Available Methods and Variables](#available-methods-and-variables) 
      - [Consents Object](#consents-object)
    - [Enabling Debug Output](#enabling-debug-output)

# Setup and Installation

## Quick Start

Install the ID5 API after your CMP (if applicable), but as high in the `<head>` as possible.

```html
<script src="https://cdn.id5-sync.com/api/1.0/id5-api-lite.js"></script>
<script>
  (function() {
    // TODO: modify with your own partnerId
    // beware of scope of id5Instance and myId5
    var myId5;
    var id5Instance = ID5.initLite({partnerId: 173}).onUpdate(function(status) {;
      // ... do something ...
      myId5 = status.getUserId();
    });
  })();
</script>
```

## Integration

### ID5 CDN
To use the ID5 CDN version of the API, you may source the library as follows:

```html
<script src="https://cdn.id5-sync.com/api/1.0/id5-api-lite.js"></script>
```

Using our CDN has the advantage of patch updates being automatically deployed without any intervention your end.

## Usage

There are three main parts to using the ID5 API:

1. Load the javascript file
1. Initialize the API with the partner ID you received from ID5, as well as any other configuration options you’d like to set
2. Access the ID5 ID

### Load the API javascript file  

The ID5 API script should be placed as high in the page as possible. By placing this script early in the page, all subsequent scripts on page (including Prebid.js, ad tags, attribution or segment pixels, etc.) can leverage the ID5 ID. You should load the script *synchronously* to ensure that the API is loaded before attempting to call it.

```html
<script src="https://cdn.id5-sync.com/api/1.0/id5-api-lite.js"></script>
```

### Initialize the API

After loading the script, you must initialize the API with the `ID5.initLite()` method. You may pass configuration options directly into the init method. The result of the `initLite()` method is a variable that you will use to access the ID5 ID or perform other actions. This variable must be unique to the page (or scoped appropriately) in order not avoid collisions with other instances of the API on the same page.

```javascript
// TODO modify with your own partnerId
// beware to scope the id5Instance variable or uniquely name it to avoid collisions
var id5Instance = ID5.initLite({partnerId: 173});
```

### Access the ID5 ID

Once the API has been loaded and initialized, the ID5 ID can be accessed by any javascript on the page (provided your variable is scoped appropriately) including Prebid.js, your ad tags, or pixels and scripts from third party vendors, with the `getUserId()` method on your status variable.

```javascript
var id5Id = id5Instance.getUserId();
```

The `getUserId()` method always answers (once the API is loaded) and will return immediately with a value. If there is no ID available yet, the `getUserId()` will return a value of `undefined`.

There are a few cases in which `getUserId()` may not be ready or have a value yet:

* There is no locally cached version of the ID and no response has been received yet from the ID5 servers (where the ID is generated)
* The CMP has not finished loading or gathering consent from the user, so no ID can be retrieved
* The user has not consented to allowing local storage

### Available Configuration Options

| Option Name                           | Scope                                        | Type    | Default Value                            | Description                                                                                                                                                                                                              |
|---------------------------------------|----------------------------------------------|---------|------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| partnerId                             | Required                                     | integer |                                          | ID5 Partner ID, received after registration with ID5                                                                                                                                                                     |
| refreshInSeconds                      | Optional                                     | integer | `7200`<br>(2 hours)                      | Refresh period of first-party local storage                                                                                                                                                                              |
| abTesting                             | Optional                                     | object  | `{ enabled: false, controlGroupPct: 0 }` | Enables A/B testing of the ID5 ID. See [A/B Testing](#ab-testing) below for more details                                                                                                                                 |
| provider                              | Optional                                     | string  | `pubmatic-identity-hub`                  | An identifier provided by ID5 to technology partners who manage API deployments on behalf of their clients. Reach out to [ID5](mailto:support@id5.io) if you have questions about this parameter                         |
| segments                              | Optional                                     | array   |                                          | Used with platforms that don't support ingesting ID5 IDs in their client-side segment pixels. See below for details                                                                                                      |

#### A/B Testing

You may want to test the value of the ID5 ID with their downstream partners. While there are various ways to do this, A/B testing is a standard approach. Instead of manually enabling or disabling the ID5 API based on their control group settings (which leads to fewer calls to ID5, reducing our ability to recognize the user), we have baked this in to the API itself.

To turn on A/B Testing, simply edit the configuration (see below) to enable it and set what percentage of users you would like to set for the control group. The control group is the set of users where an ID5 ID will not be exposed in `id5Instance.getUserId()` - this method will return `0` for the control group. It's important to note that the control group is user based, and not request based. In other words, from one page view to another, a given user may will *always* be in or out of the control group.

The configuration object for `abTesting` contains two variables:

| Name            | Type    | Default | Description                                                                                                                                                                                                                                                         |
|-----------------|---------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| enabled         | boolean | `false` | Set this to `true` to turn on this feature                                                                                                                                                                                                                          |
| controlGroupPct | number  | `0`     | Must be a number between 0 and 1 (inclusive) and is used to determine the percentage of users that fall into the control group (and thus not exposing the ID5 ID). For example, a value of `0.20` will result in 20% of users without an ID5 ID and 80% with an ID. |

#### Segments

> **Note:** ID5 does not build segments or profile users. This feature enables brands or publishers to put users into segments they have already created in their platform of choice, when that platform does not support ingesting ID5 IDs in standard segment pixels yet.

The Segments feature facilitates (re)targeting use cases for brands and publishers until their platforms complete their integration with ID5. Only certain destination platforms are supported and there are backend configurations that need to be made on both ID5's and the destination platform's systems before this feature can be used. Please reach out to your ID5 representative for more information and to get started.

The `segments` array is a list of objects containing a `destination` and list of segment `ids` to add the user to.

| Option Name | Scope    | Type             | Description                                                                                                                       |
|-------------|----------|------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| destination | Required | string           | The [IAB GVL](https://iabeurope.eu/vendor-list-tcf/) ID of the destination platform where the segments should be uploaded to |
| ids         | Required | array of strings | A list of segment ids/codes to add the user to in the destination platform                                                        |

```javascript
var id5Instance = ID5.initLite({
  partnerId: 173, // modify with your own partnerId
  segments: [{
    destination: '999',
    ids: [ '12345', '67890' ]
  }]
});
```

### Available Methods and Variables

The ID5 API provides several methods and variables for you to use. See below for a complete list.

| Name                                                 | Type     | Return Type                                                                                                                     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
|------------------------------------------------------|----------|---------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ID5.initLite({})                                     | method   | n/a                                                                                                                             | Takes a config object as the only parameter and initializes the API with these configuration options, returns an `Id5Instance` object                                                                                                                                                                                                                                                                                                                                                                     |
| ID5.loaded                                           | variable | boolean                                                                                                                         | This variable will be set to `true` once the API is loaded and ready for use                                                                                                                                                                                                                                                                                                                                                                                                                              |
| id5Instance.getUserId()                              | method   | string                                                                                                                          | The ID5 ID value. If not set yet, returns `undefined`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |                                                                                                                                                                                                                                                                                                                                                                                                                           |
| id5Instance.isFromCache()                            | method   | boolean                                                                                                                         | Indicates whether the `userId` value is from cache (when set to `true`) or from a server response (when set to `false`). If `userId` is not set yet, returns `undefined`                                                                                                                                                                                                                                                                                                                                  |
| id5Instance.exposeUserId()                           | method   | boolean                                                                                                                         | Applicable when [A/B Testing](#ab-testing) is turned on; when this method returns `true`, the user is not in the control group and `id5Instance.getUserId()` is populated with the ID5 ID; when `false`, the user is considered as part of the control group and `id5Instance.getUserId()` will be `0`. This method can be used to inform your reporting systems that an ID was available or not, instead of relying on the value of `id5Instance.getUserId()` directly.                                  |
| id5Instance.onAvailable(fn, timeout)                 | method   | id5Instance                                                                                                                     | Set an event to be called when the ID5 ID is available. Will be called only once per `ID5.initLite()`. The first parameter is a function to call, which will receive as its only parameter the `id5Instance` object. The second, optional, parameter, is a timeout in ms; if the `fn` has not been called when the timeout is hit, then it will force a call to `fn` even if the ID5 ID is not available yet. If not provided, then it will wait indefinitely until the ID5 ID is available to call `fn`. |
| id5Instance.onUpdate(fn)                             | method   | id5Instance                                                                                                                     | Set an event listener to be called any time the ID5 ID is updated. For example, if the ID was found in cache, then the `onAvailable` event would immediately fire; but there may be a need to call the ID5 servers for an updated ID. When the call to ID5 returns, the `onUpdate` event will fire. The first and only parameter is a function to call, which will receive as its only parameter the `id5Instance` object.                                                                                |
| id5Instance.unregister()                             | method   | void                                                                                                                            | Unregisters id5Instance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| id5Instance.getConsents()                            | method   | Consents object [see](#consents-object)                                                                                                          | Collected user consents used during id generation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

#### Consents Object
| Property name | Type                | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
|---------------|---------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| gdpr          | boolean (Optional)  | Whether or not GDPR applies to this request.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| gdpr_consent  | string  (Optional)  | A valid [IAB TCF](https://iabtechlab.com/standards/gdpr-transparency-and-consent-framework/) consent string. If the string is missing, misconstructed, or otherwise invalid, we will treat the request as if it has no consent string and process accordingly.                                                                                                                                                                                                                                                                |
| gpp           | string (Optional)   | A valid [IAB Global Privacy Platform](https://dev.iabtechlab.com/global-privacy-platform/) consent string. If the string is missing, misconstructed, or otherwise invalid, we will treat the request as if it has no consent string and process accordingly.                                                                                                                                                                                                                                                                  |
| gpp_sid       | string (Optional)   | The GPP section ID(s) (integers) in force for the current transaction. In most cases, this field should have a single section ID. In rare occasions where such a single section ID can not be determined, the field may contain up to 2 values, separated by a comma. More information in [GPP documentation](https://github.com/InteractiveAdvertisingBureau/Global-Privacy-Platform/blob/main/Core/Consent%20String%20Specification.md#how-does-a-url-based-service-process-the-gpp-string-when-it-cant-execute-javascript) |
| us_privacy    | string (Optional)   | A valid [IAB US Privacy](https://github.com/InteractiveAdvertisingBureau/USPrivacy/blob/master/CCPA/US%20Privacy%20String.md) string. If the string is missing, misconstructed, or otherwise invalid, we will treat the request as if it has no US Privacy string and process accordingly.                                                                                                                                                                                                                                    |


**Note:** setting an event listener from within another event listener onto the ID5 API Instance can lead to unpredictable results.

### Enabling Debug Output
To enable debug output in the browser console, set `ID5.debug` to true before any call, or add a `id5_debug=true` to the query string of the page url.
```javascript
ID5.debug = true;
var id5Instance = ID5.initLite({ ... });
```
