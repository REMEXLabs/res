/* global jQuery, console */
/*jshint -W004 */

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
     * @param {object} options See {@link $.res~Ref}
     * @returns {$.res~Queries} Returns this {@link $.res~Queries}
     */
    Queries.prototype.addRef = function(ref) {
      this.queries.push(new Ref(ref));
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
      var xmlString = (new XMLSerializer()).serializeToString($queries[0]);
      // Workaround, the server allows only exactly '<queries>'...
      return xmlString.replace(' xmlns="http://www.w3.org/1999/xhtml"', '');
    };

    /**
     * Send the queries to the resource server
     * @returns {jQuery.Deferred} A Promise (see {@link https://api.jquery.com/category/deferred-object/})
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
        $deferred.resolve($(data));
      }).fail(function(xhr, status, error){
        $deferred.reject(xhr, status, error);
      });

      return $deferred;
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
        var $ctx = $('<usercontext></usercontext>');
        for (var i = 0; i < this.usercontext.length; i++) {
          var $prop = $('<prop>')
            .attr('name', this.usercontext[i].name)
            .attr('val', this.usercontext[i].value);
          $ctx.append($prop);
        }
        $query.append($ctx);
      }

      // add all controllercontext properties
      if (this.controllercontext.length > 0) {
        var $ctx = $('<controllercontext></controllercontext>');
        for (var i = 0; i < this.controllercontext.length; i++) {
          var $prop = $('<prop>')
            .attr('name', this.controllercontext[i].name)
            .attr('val', this.controllercontext[i].value);
          $ctx.append($prop);
        }
        $query.append($ctx);
      }

      // add all properties containing all descriptors
      for (var i = 0; i < this.props.length; i++) {
        $query.append(this.props[i].toXML());
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
     *
     * @constructor
     */
    function Ref(ref) {
      this.ref = ref;
    }

    /**
     * Creates a XML-Document representing this query
     * @returns {XMLDoc} The XML-Document
     */
    Ref.prototype.toXML = function() {
      return  $('<query>').attr('ref', this.ref);
    };

    return {
      queries: function () {
        return new Queries();
      }
    };
  };

}(jQuery));