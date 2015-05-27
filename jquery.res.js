/* global jQuery, console */
/*jshint -W004 */

(function($) {
  'use strict';

  /**
   * Initiate a connection to a resource server
   * @param  {string} url     The server's URL. https recommended.
   * @param  {object} options The connection's options
   * @return {TODO} TODOblabla
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
    * Describes a query that can be sent to a resserver
    *
    * @param {object} options Options, contains start and/or count of a query
    * (optional)
    * ```javascript
    * { start: null, count: null }
    * ```
    *
    * @constructor
    */
    function Query(options) {
      this.start = options.start || null;
      this.count = options.count || null;
      this.usercontext = [];
      this.controllercontext = [];
      this.props = [];
    }

    /**
     * Add a user preference
     *
     * @param {string} name  Property name as full URL or without namespace
     * @param {string} value Desired value for the property
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
     * @param {object} descs Descriptors describing this property (optional)
     * ```javascript
     * [
     *   { name: "desc1", value: "dvalue1" },
     *   { name: "desc2", value: "dvalue2" }
     * ]
     * ```
     */
    Query.prototype.addProp = function(name, value, descs) {
      this.props.push({
        name: name,
        value: value,
        descs: descs || []
      });
      return this;
    };

    /**
     * Creates a XML-Document representing this query
     * @return {string} The XML-Document as a string
     */
    Query.prototype.toXMLString = function() {
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
          var $prop = $('<prop />')
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
      if (this.props.length > 0) {
        for (var i = 0; i < this.props.length; i++) {
          var $prop = $('<prop>')
            .attr('name', this.props[i].name)
            .attr('val', this.props[i].value);
          for (var j = 0; j < this.props[i].descs.length; j++) {
            var $desc = $('<descriptor>')
              .attr('name', this.props[i].descs[j].name)
              .attr('val', this.props[i].descs[j].value);
            $prop.append($desc);
          }
          $query.append($prop);
        }
      }

      return (new XMLSerializer()).serializeToString($query[0]);
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

    Ref.prototype.toXMLString = function() {
      var $ref = $('<query>').attr('ref', this.ref);
      return (new XMLSerializer()).serializeToString($ref[0]);
    };

    return {
      query: function(params) {
        var $deferred = $.Deferred();
        console.log(params);

        $.ajax({
          url: url + 'query',
          contentType: 'text/xml', // datatype of data sent
          crossDomain: true, // tell jQuery CORS is ok
          data: params, // send plain xml data
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
      },
      Query: function (opts) {
        return new Query(opts);
      },
      Ref: function (ref) {
        return new Ref(ref);
      }
    };
  };

}(jQuery));
