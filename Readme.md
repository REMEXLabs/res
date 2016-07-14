# res

An ajax client to query and retrieve data from an OpenURC resource server.

## Getting started

Be sure to be familiar with the [resource server specification](http://www.openurc.org/TR/res-serv-http1.0-20140304/).

Include at least jQuery 2 before the res library:

```html
<script src="https://code.jquery.com/jquery-2.1.4.min.js"></script>
<script src="jquery.res.js"></script>
```

Create a res instance:

```js
var baseurl = 'https://res.openurc.org/';
var options = {
    username: 'asdf',
    password: 'asdf'
};

var $res = $.res(baseurl, options);
```

where options is only needed for non-public resources or uploads.

To query the resource server:

```js
$res.queries()
    .addQuery()
        .setStart('1')
        .setCount('1')
        .addProp('http://openurc.org/ns/res#type', 'http://openurc.org/restypes#video')
        .addProp('http://openurc.org/ns/res#subtype', 'http://openurc.org/restypes#signLanguageVideo')
        .addProp('http://purl.org/dc/elements/1.1/title', 'GSG video explaining the account number input field (human Feldmann)')
        .complete()
    .addQuery()
        .addProp('http://openurc.org/ns/res#type', 'http://openurc.org/restypes#pictogram')
        .addProp('http://openurc.org/ns/res#pictogramSet', 'Wahlpiktogramme')
        .addPropWithDescs('http://purl.org/dc/elements/1.1/title', 'Log')
            .addDesc('lang', 'en')
            .complete()
        .complete()
    .addRef('2ede6a3b-0e3d-11e5-b4d2-00075c51ac83', 2, 2)
    .send()
    .done(function(responses){
        console.log(responses);
        console.log(responses.getVeryFirstGlobalAt());
    }).fail(function(response){
        console.log(response.error);
        console.log(response.status);
    });
```

This fires 3 queries bundled in one request.

For a complete reference see `docs/index.html`.

## Licence

Copyright 2016 Hochschule der Medien (HdM) / Stuttgart Media University

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

