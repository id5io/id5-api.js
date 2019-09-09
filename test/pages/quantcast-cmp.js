var elem = document.createElement('script');
elem.src = 'https://quantcast.mgr.consensu.org/cmp.js';
elem.async = true;
elem.type = "text/javascript";
var scpt = document.getElementsByTagName('script')[0];
scpt.parentNode.insertBefore(elem, scpt);
(function() {
    var gdprAppliesGlobally = false;
    function addFrame() {
        if (!window.frames['__cmpLocator']) {
            if (document.body) {
                var body = document.body,
                iframe = document.createElement('iframe');
                iframe.style = 'display:none';
                iframe.name = '__cmpLocator';
                body.appendChild(iframe);
            } else {
            // In the case where this stub is located in the head,
            // this allows us to inject the iframe more quickly than
            // relying on DOMContentLoaded or other events.
            setTimeout(addFrame, 5);
        }
    }
}
addFrame();
function cmpMsgHandler(event) {
    var msgIsString = typeof event.data === "string";
    var json;
    if(msgIsString) {
        json = event.data.indexOf("__cmpCall") != -1 ? JSON.parse(event.data) : {};
    } else {
        json = event.data;
    }
    if (json.__cmpCall) {
        var i = json.__cmpCall;
        window.__cmp(i.command, i.parameter, function(retValue, success) {
            var returnMsg = {"__cmpReturn": {
                "returnValue": retValue,
                "success": success,
                "callId": i.callId
            }};
            event.source.postMessage(msgIsString ?
                JSON.stringify(returnMsg) : returnMsg, '*');
        });
    }
}
window.__cmp = function (c) {
    var b = arguments;
    if (!b.length) {
        return __cmp.a;
    }
    else if (b[0] === 'ping') {
        b[2]({"gdprAppliesGlobally": gdprAppliesGlobally,
            "cmpLoaded": false}, true);
    } else if (c == '__cmp')
    return false;
    else {
        if (typeof __cmp.a === 'undefined') {
            __cmp.a = [];
        }
        __cmp.a.push([].slice.apply(b));
    }
}
window.__cmp.gdprAppliesGlobally = gdprAppliesGlobally;
window.__cmp.msgHandler = cmpMsgHandler;
if (window.addEventListener) {
    window.addEventListener('message', cmpMsgHandler, false);
}
else {
    window.attachEvent('onmessage', cmpMsgHandler);
}
})();
window.__cmp('init', {
    'Language': 'en',
    'Initial Screen Reject Button Text': 'I do not accept',
    'Initial Screen Accept Button Text': 'I accept',
    'Purpose Screen Body Text': 'You can set your consent preferences and determine how you want your data to be used based on the purposes below. You may set your preferences for us independently from those of third-party partners. Each purpose has a description so that you know how we and partners use your data.',
    'Vendor Screen Body Text': 'You can set consent preferences for each individual third-party company below. Expand each company list item to see what purposes they use data for to help make your choices. In some cases, companies may disclose that they use your data without asking for your consent, based on their legitimate interests. You can click on their privacy policies for more information and to opt out.',
    'Vendor Screen Accept All Button Text': 'Accept all',
    'Vendor Screen Reject All Button Text': 'Reject all',
    'Initial Screen Body Text': 'We and our partners use technology such as cookies on our site to personalise content and ads, provide social media features, and analyse our traffic. Click below to consent to the use of this technology across the web. You can change your mind and change your consent choices at anytime by returning to this site.',
    'Initial Screen Body Text Option': 1,
    'Publisher Name': 'ID5',
    'Publisher Logo': 'https://id5.io/assets/images/logos/id5-logo-horizontal.png',
    'Publisher Purpose IDs': [1,2,4,5],
    'Publisher Purpose Legitimate Interest IDs': [2,4,5],
    'Consent Scope': 'service',
});