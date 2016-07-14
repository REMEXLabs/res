/*!
 * Copyright 2016 Hochschule der Medien (HdM) / Stuttgart Media University
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global jQuery, console */

(function($) {
  'use strict';

  /**
   * Initiate a connection to a resource server
   * @param  {string} url     The server's URL. https recommended.
   * @param  {object} options The connection's options
   * @returns {RES} A Resource Server Object
   * @constructor
   */
  $.res = function(url, options) {

    // Make sure the url ends with a /
    url = /\/$/.exec(url) ? url : url + '/';
    // HTTPS only! (Because uploads and security in general)
    if (!/^https/i.test(url)) {
      throw 'HTTPS only! The url ' + url + ' is not secure!';
    }

    // Defaults to be used, if no options are given
    var defaults = {
      password: null,
      username: null
    };

    // Merge the options with the defaults
    var settings = $.extend({}, defaults, options);

    /**
     * Queries factory, able to generate child {@link $.res~Query}s and
     * {@link $.res~Ref}s
     * @constructor
     */
    function Queries() {
      this.queries = [];
    }

    /**
     * Adds a {@link $.res~Query} to this batch of queries
     * @returns {$.res~Query} The {@link $.res~Query} that can be modified. Use
     * {@link $.res~Query#complete} to return the parent {@link $.res~Queries}
     */
    Queries.prototype.addQuery = function() {
      var q = new Query(this);
      this.queries.push(q);
      return q;
    };

    /**
     * Adds a {@link $.res~Ref} to this batch of queries
     * @param {string} ref See {@link $.res~Ref}
     * @param {int} start See {@link $.res~Ref}
     * @param {int} count See {@link $.res~Ref}
     * @returns {$.res~Queries} Returns this {@link $.res~Queries}
     */
    Queries.prototype.addRef = function(ref, start, count) {
      this.queries.push(new Ref(ref, start, count));
      return this;
    };

    /**
     * Creates a XML-Document representing these queries
     * @returns {string} The XML-Document as string
     */
    Queries.prototype.toXMLString = function() {
      var $queries = $('<queries>');
      for (var i = 0; i < this.queries.length; i++) {
        $queries.append(this.queries[i].toXML());
      }
      return _serializeXML($queries);
    };

    /**
     * Send the queries to the resource server
     * @returns {jQuery.Deferred} A Promise
     * (see {@link https://api.jquery.com/category/deferred-object/})
     */
    Queries.prototype.send = function() {
      var $deferred = $.Deferred();
      var data = this.toXMLString();
      console.log(data);

      $.ajax({
        url: url + 'query',
        contentType: 'text/xml', // datatype of data sent
        crossDomain: true, // tell jQuery CORS is ok
        data: data, // send plain xml data
        dataType: 'xml', // expected datatype of the response
        /*
         * Since GET is 'a simplified request type' and would not support:
         * - specifing a property descriptor,
         * - specifing the first index or
         * - specifing the number of returned elements in the resource list,
         * this library supports only POST requests.
         */
        method: 'POST',
        password: settings.password,
        processData: false, // dont convert the xml data sent
        username: settings.username
      }).done(function(data){
        $deferred.resolve(new Responses($(data)));
      }).fail(function(xhr, status, error){
        $deferred.reject({
          error: error,
          status: xhr.status
        });
      });

      return $deferred.promise();
    };

    /**
    * Describes a query that can be sent to a resserver
    *
    * @param {$.res~Queries} parent Parent {@link $.res~Queries}
    * @constructor
    */
    function Query(parent) {
      this._parent = parent || null;
      this.start = null;
      this.count = null;
      this.usercontext = [];
      this.controllercontext = [];
      this.props = [];
    }

    /**
     * Return to the parent {@link $.res~Queries} object, i.e. in order to add
     * another {@link $.res~Query}.
     * @returns {$.res~Queries} The parent {@link $.res~Queries}
     */
    Query.prototype.complete = function() {
      return this._parent;
    };

    /**
     * Specify the index of the first element in the matching resources list
     * (index starting with 1). Default is 1.
     * @param {int} start Index of the first element
     * @return {$.res~Query} The active {@link $.res~Query}
     */
    Query.prototype.setStart = function(start) {
      this.start = start;
      return this;
    };

    /**
     * Specify the requested number of matching resources. The special value of
     * "all" indicates that all resources are requested. Default is 1.
     * @param {int|string} count Number of requested resources
     * @return {$.res~Query} The active {@link $.res~Query}
     */
    Query.prototype.setCount = function(count) {
      this.count = count;
      return this;
    };


    /**
     * Add a user preference
     *
     * @param {string} name  Property name as full URL or without namespace
     * @param {string} value Desired value for the property
     * @return {$.res~Query} The active {@link $.res~Query}
     */
    Query.prototype.addUsercontext = function(name, value) {
      this.usercontext.push({
        name: name,
        value: value
      });
      return this;
    };

    /**
     * Add a controller preference
     *
     * @param {string} name  Property name as full URL or without namespace
     * @param {string} value Desired value for the property
     * @return {$.res~Query} The active {@link $.res~Query}
     */
    Query.prototype.addControllercontext = function(name, value) {
      this.controllercontext.push({
        name: name,
        value: value
      });
      return this;
    };

    /**
     * Add a query property describing the desired resource
     * @param {string} name  Property name as full URL or without namespace
     * @param {string} value Desired value for the property
     * @param {list}   descs Descriptors describing this property (optional)
     * ```javascript
     * [
     *   { name: "desc1", value: "dvalue1" },
     *   { name: "desc2", value: "dvalue2" }
     * ]
     * ```
     * @return {$.res~Query} The active {@link $.res~Query}
     */
    Query.prototype.addProp = function(name, value, descs) {
      this.props.push(new Prop(this, name, value, descs));
      return this;
    };

    /**
     * Add a query property describing the desired resource and switch to the
     * property in order to add descriptors.
     * @param {string} name  Property name as full URL or without namespace
     * @param {string} value Desired value for the property
     * @return {$.res~Prop} The active {@link $.res~Prop} in order to add
     * descriptors. Return with {@link $.res~Prop#complete} to the parent
     * {@link $.res~Query}.
     */
    Query.prototype.addPropWithDescs = function(name, value) {
      var prop = new Prop(this, name, value);
      this.props.push(prop);
      return prop;
    };

    /**
     * Creates a XML-Document representing this query
     * @returns {XMLDoc} The XML-Document
     */
    Query.prototype.toXML = function() {
      var $query = $('<query></query>');

      if (this.start !== null) {
        $query.attr('start', this.start);
      }

      if (this.count !== null) {
        $query.attr('count', this.count);
      }

      // add all usercontext properties
      if (this.usercontext.length > 0) {
        var $uctx = $('<usercontext></usercontext>');
        for (var i = 0; i < this.usercontext.length; i++) {
          var $prop = $('<prop>')
            .attr('name', this.usercontext[i].name)
            .attr('val', this.usercontext[i].value);
          $uctx.append($prop);
        }
        $query.append($uctx);
      }

      // add all controllercontext properties
      if (this.controllercontext.length > 0) {
        var $cctx = $('<controllercontext></controllercontext>');
        for (var j = 0; j < this.controllercontext.length; j++) {
          $cctx.append($('<prop>')
            .attr('name', this.controllercontext[j].name)
            .attr('val', this.controllercontext[j].value));
        }
        $query.append($cctx);
      }

      // add all properties containing all descriptors
      for (var k = 0; k < this.props.length; k++) {
        $query.append(this.props[k].toXML());
      }

      return $query;
    };

    /**
     * A property of q {@link $.res~Query}.
     * @param {$.res~Query} parent The parent {@link $.res~Query}
     * @param {string} name   Name of the descriptor
     * @param {string} value  Value of the descriptor
     * @param {list} descs    List of descriptor objects (optional)
     * ```javascript
     * [
     *   { name: "desc1", value: "dvalue1" },
     *   { name: "desc2", value: "dvalue2" }
     * ]
     * ```
     * @property {string} name Name of this property
     * @property {string} value Value of this property
     * @property {list} descs List of all descriptors of this property, a
     * descriptor has the form `{ name: "desc1", value: "dvalue1" }`
     * @constructor
     */
    function Prop(parent, name, value, descs) {
      this._parent = parent || null;
      this.name = name || null;
      this.value = value || null;
      this.descs = descs || [];
    }

    /**
     * Return to the parent {@link $.res~Query} object, i.e. in order to add
     * another {@link $.res~Prop}.
     * @returns {$.res~Query} The Parent {@link $.res~Query}
     */
    Prop.prototype.complete = function() {
      return this._parent;
    };

    /**
     * Add a descriptor to this property
     * @param {string} name  Name of the descriptor
     * @param {string} value Value of the descriptor
     */
    Prop.prototype.addDesc = function(name, value) {
      this.descs.push({
        name: name,
        value: value
      });
      return this;
    };

    /**
     * Creates a XML-Document representing this property
     * @returns {XMLDoc} The XML-Document
     */
    Prop.prototype.toXML = function() {
      var $prop = $('<prop>')
        .attr('name', this.name)
        .attr('val', this.value);
      for (var i = 0; i < this.descs.length; i++) {
        var $desc = $('<descriptor>')
          .attr('name', this.descs[i].name)
          .attr('val', this.descs[i].value);
        $prop.append($desc);
      }
      return $prop;
    };

    /**
     * A Query that is a reference to an earlier query
     * @param {string} ref Query reference identifier that had been assigned by
     * the server in a previous response
     * @param {int} start Start index
     * @param {int} count Number of requested resources
     *
     * @constructor
     */
    function Ref(ref, start, count) {
      this.ref = ref;
      this.start = start || undefined;
      this.count = count || undefined;
    }

    /**
     * Creates a XML-Document representing this query
     * @returns {XMLDoc} The XML-Document
     */
    Ref.prototype.toXML = function() {
      return $('<query>').attr('ref', this.ref)
        .attr('start', this.start)
        .attr('count', this.count);
    };

    /**
     * Represents all responses received from the resserver
     * @param {XMLDocument} $xml The XMLDocument received from the resserver
     * @property {list} responses List of {@link $.res~Response}s
     * @constructor
     */
    function Responses($xml) {
      this._nextIndex = 0;
      this.responses = [];
      var that = this;
      $xml.find('response').each(function(idx, response){
        that.responses.push(new Response($(response)));
      });
    }

    /**
     * Returns the number of responses received from the resserver
     * @return {int} The number of responses
     */
    Responses.prototype.numberOfResponses = function() {
      return this.responses.length;
    };

    /**
     * Return the first response from the server
     * @return {$.res~Response} The first response
     */
    Responses.prototype.firstResponse = function() {
      return this.responses[0];
    };

    /**
     * Checks if there are more responses received from the resserver
     * @return {Boolean} True, if there are more responses
     */
    Responses.prototype.hasNextResponse = function() {
      return this._nextIndex < this.responses.length;
    };

    /**
     * Returns the next response, beginning at the first one. Check if there are
     * responses left via {@link $.res~Responses#hasNext}
     * @return {$.res~Response} The next response
     */
    Responses.prototype.nextResponse = function() {
      return this.responses[this._nextIndex++];
    };

    /**
     * Reset the {@link $.res~Responses#next} function
     * @return {$.res~Responses} Return this Responses element (for chaining)
     */
    Responses.prototype.resetResponse = function() {
      this._nextIndex = 0;
      return this;
    };

    /**
     * Shortcut to get the first global URI of the first resource of the first
     * response
     * @return {string|null} The very first global URI in these responses. Null
     * if there are no global URIs available (e.g. reference expired)
     */
    Responses.prototype.getVeryFirstGlobalAt = function() {
      return this.firstResponse().firstResource().getFirstGlobalAt();
    };

    /**
     * Represents a single response received from the resserver
     * @param {XMLDocument} $xml The subtree of the XMLDocument received from
     * the resserver that represents this single response
     * @property {string|null} ref The reference key for further equal queries
     * @property {Boolean} expired When a ref was queried, if this ref expired
     * @property {int|null} start Index of the first resource contained in this
     * response
     * @property {int|null} count Number of resources contained in this response
     * @property {int|null} total Number of total matching resources available
     * on the resserver
     * @property {list} resources List of all {@link $.res~Resource}s contained
     * in this Response
     * @constructor
     */
    function Response($xml) {
      this._nextIndex = 0;
      this.ref = $xml.attr('ref') || null;
      this.expired = $xml.attr('expired') === 'true';
      this.start = $xml.attr('start') === undefined ?
        null : parseInt($xml.attr('start'));
      this.count = $xml.attr('count') === undefined ?
        null : parseInt($xml.attr('count'));
      this.total = $xml.attr('total') === undefined ?
        null : parseInt($xml.attr('count'));
      this.resources = [];
      var that = this;

      $xml.find('resource').each(function(idx, resource){
        that.resources.push(new Resource($(resource)));
      });
    }

    Response.prototype.hasRef = function() {
      return this.ref !== null;
    };

    Response.prototype.hasMoreOnServer = function() {
      return undefined;
    };

    /**
     * Returns the number of resources in this response
     * @return {int} The number of resources
     */
    Response.prototype.numberOfResources = function() {
      return this.resources.length;
    };

    /**
     * Return the first resource in this response
     * @return {$.res~Resource} The first resource
     */
    Response.prototype.firstResource = function() {
      return this.resources[0];
    };

    /**
     * Checks if there are more resorces in this response
     * @return {Boolean} True, if there are more resorces
     */
    Response.prototype.hasNextResource = function() {
      return this._nextIndex < this.resources.length;
    };

    /**
     * Returns the next resource, beginning at the first one. Check if there are
     * resources left via {@link $.res~Response#hasNext}
     * @return {$.res~Resource} The next resource
     */
    Response.prototype.nextResource = function() {
      return this.resources[this._nextIndex++];
    };

    /**
     * Reset the {@link $.res~Respone#next} function
     * @return {$.res~Respone} Return this Respone element (for chaining)
     */
    Response.prototype.resetResource = function() {
      this._nextIndex = 0;
      return this;
    };

    /**
     * Represents a single resource received from the resserver
     * @param {XMLDocument} $xml The subtree of the XMLDocument received from
     * the resserver that represents this single resource
     * @property {string} about Specifying a resource's globally unique
     * identifier
     * @property {list} globalAts List of all global download URIs
     * @property {list} props List of all {@link $.res~Prop}s that describe this
     * resource
     * @constructor
     */
    function Resource($xml) {
      this.about = $xml.attr('about');
      this.globalAts = [];
      this.props = [];
      var that = this;

      $xml.find('globalAt').each(function(idx, globalAt){
        that.globalAts.push($(globalAt).text());
      });

      $xml.find('prop').each(function(idx, prop){
        var newProp = new Prop(null, $(prop).attr('name'), $(prop).attr('val'));
        $(prop).find('descriptor').each(function(idx, descriptor){
          newProp.addDesc($(descriptor).attr('name'), $(descriptor).attr('val'));
        });
        that.props.push(newProp);
      });
    }

    /**
     * Get the first global URI for this resource
     * @return {string|null} The first global URI for this Resource. Null if
     * there are no global URIs available (e.g. reference expired)
     */
    Resource.prototype.getFirstGlobalAt = function() {
      return this.globalAts.length > 0 ? this.globalAts[0] : null;
    };

    /**
     * Upload factory, able to generate child {@link $.res~UploadResource}s
     * @property {list} resources List of all {@link $.res~UploadResource}s
     * @constructor
     */
    function Upload() {
      this.resources = [];
      this._dataReadyCounter = 0;
      this._tmpXML = null;
      this._$deferred = null;
    }

    /**
     * Adds a {@link $.res~UploadResource} to this upload
     * @returns {$.res~UploadResource} The {@link $.res~UploadResource}
     * that can be modified. Use {@link $.res~UploadResource#complete} to
     * return the parent {@link $.res~Upload}
     */
    Upload.prototype.addResource = function() {
      var r = new UploadResource(this);
      this.resources.push(r);
      return r;
    };

    /**
     * This gets called if an asynchronous FileReader.readAsDataUrl-call is done
     * @private
     */
    Upload.prototype._dataReady = function() {
      if (++this._dataReadyCounter === this.resources.length) {
        this._realSend();
      }
    };

    /**
     * Send the upload resources to the resource server
     * @returns {jQuery.Deferred} A Promise
     * (see {@link https://api.jquery.com/category/deferred-object/})
     */
    Upload.prototype.send = function() {
      this._tmpXML = $('<upload></upload>');
      for (var i = 0; i < this.resources.length; i++) {
        this._tmpXML.append(this.resources[i].toXML());
      }
      this._$deferred = $.Deferred();
      return this._$deferred.promise();
    };

    /**
     * Gets called, if all FileReaders are done, sends the data to the server
     * for real
     * @private
     */
    Upload.prototype._realSend = function() {
      var data = _serializeXML(this._tmpXML);
      var that = this;
      this._tmpXML = null; // Avoid memory hogging
      this._dataReadyCounter = 0;

      $.ajax({
        url: url + 'upload',
        contentType: 'text/xml', // datatype of data sent
        crossDomain: true, // tell jQuery CORS is ok
        data: data, // send plain xml data
        dataType: 'xml', // expected datatype of the response
        method: 'POST',
        password: settings.password,
        processData: false, // dont convert the xml data sent
        username: settings.username,
        xhrFields: {
          withCredentials: true
        },
      }).done(function(data){
        var responses = [];
        $(data).find('resource').each(function() {
          responses.push({
            status: $(this).attr('status'),
            name: $(this).attr('name'),
            message: $(this).find('message').text()
          });
        });
        that._$deferred.resolve(responses);
      }).fail(function(xhr, status, error){
        that._$deferred.reject({
          error: error,
          status: xhr.status
        });
      });
    };

    /**
    * Describes a resource that can be sent to a resserver
    *
    * @param {$.res~Upload} parent Parent {@link $.res~Upload}
    * @property {String} name The name of the resource
    * @constructor
    */
    function UploadResource(parent) {
      this._parent = parent;
      this.name = null;
      this.file = null;
      this.inherit = undefined;
      this.props = [];
    }

    /**
     * Return to the parent {@link $.res~Upload} object, i.e. in order to add
     * another {@link $.res~UploadResource}.
     * @returns {$.res~Upload} The parent {@link $.res~Upload}
     */
    UploadResource.prototype.complete = function() {
      return this._parent;
    };

    /**
     * Set the resources name (which is referenced in the response)
     * @param {String} name Name of the resource
     * @return {$.res~UploadResource} The active {@link $.res~UploadResource}
     */
    UploadResource.prototype.setName = function(name) {
      this.name = name;
      return this;
    };

    /**
     * Set if the properties should be inherited from the current version of
     * the resource
     * @param {Boolean} name Whether or not the properties should be inherited
     * @return {$.res~UploadResource} The active {@link $.res~UploadResource}
     */
    UploadResource.prototype.setInherit = function(inherit) {
      this.inherit = inherit;
      return this;
    };

    /**
     * Set the jQuery-object for the html file input element
     * (like `$('#fileInput')`)
     * @param {jQuery-object} $fileInnput The file input element
     * @return {$.res~UploadResource} The active {@link $.res~UploadResource}
     */
    UploadResource.prototype.setFileInput = function($fileInput) {
      if (!window.File || !window.FileReader ||
        !window.FileList || !window.Blob) {
        console.log('The File APIs are not fully supported in this browser.');
        return this;
      }
      if ($fileInput.length === 0) {
        console.log('Could not find file input.');
        return this;
      }
      if (!$fileInput[0].files[0]) {
        console.log('No file selected');
        return this;
      }
      this.file = $fileInput[0].files[0];
      return this;
    };

    /**
     * Add a query property describing the uploaded resource
     * @param {string} name  Property name as full URL or without namespace
     * @param {string} value Desired value for the property
     * @param {list}   descs Descriptors describing this property (optional)
     * ```javascript
     * [
     *   { name: "desc1", value: "dvalue1" },
     *   { name: "desc2", value: "dvalue2" }
     * ]
     * ```
     * @return {$.res~UploadResource} The active {@link $.res~UploadResource}
     */
    UploadResource.prototype.addProp = function(name, value, descs) {
      this.props.push(new Prop(this, name, value, descs));
      return this;
    };

    /**
     * Add a query property describing the uploaded resource and switch to the
     * property in order to add descriptors.
     * @param {string} name  Property name as full URL or without namespace
     * @param {string} value Desired value for the property
     * @return {$.res~Prop} The active {@link $.res~Prop} in order to add
     * descriptors. Return with {@link $.res~Prop#complete} to the parent
     * {@link $.res~UploadResource}.
     */
    UploadResource.prototype.addPropWithDescs = function(name, value) {
      var prop = new Prop(this, name, value);
      this.props.push(prop);
      return prop;
    };

    /**
     * Creates a XML-Document representing this upload resource
     * @returns {XMLDoc} The XML-Document
     */
    UploadResource.prototype.toXML = function() {
      var that = this;
      var $resource = $('<resource></resource>');

      var $props = $('<props></props>')
        .attr('inherit', this.inherit);

      for (var i = 0; i < this.props.length; i++) {
        $props.append(this.props[i].toXML());
      }

      $resource.append($props);

      var resData = $('<resourceData></resourceData>')
        .append($('<name></name>').text(this.name));

      var reader  = new FileReader();
      reader.onloadend = function () {
        var dataRegex = /^data:([^\/,]+\/[^,;]+)?(;[^,]+)?,(.*)$/g;
        var dataArray = dataRegex.exec(reader.result);
        resData.append($('<data></data>').text(dataArray[3]));
        that._parent._dataReady();
      };
      reader.readAsDataURL(this.file);

      $resource.append(resData);

      return $resource;
    };

    /**
     * Serialize an jQuery-XMLDocument
     * @param  {XMLDoc} $xml The jQuery-XMLDocument
     * @return {String}      The String representation of the given
     * jQuery-XMLDocument
     * @private
     */
    function _serializeXML($xml) {
      var xmlString = (new XMLSerializer()).serializeToString($xml[0]);
      // Workaround, the server allows only exactly '<queries>'
      return xmlString.replace(/^<(queries|upload)([^>]*)>/g, '<$1>');
    }

    return {
      queries: function () {
        return new Queries();
      },
      upload: function() {
        return new Upload();
      }
    };
  };

}(jQuery));
