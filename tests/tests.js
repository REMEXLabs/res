QUnit.test( "hello test", function( assert ) {
  assert.ok( 1 == "1", "Passed!" );
});

// Query({start:1, count:2}).addUsercontext('uc1','vc1').addUsercontext('uc2','vc2').addControllercontext('cc1','vc1').addControllercontext('cc2','vc2').addProp('prop1','prv1').addProp('prop2','prv2', [{name:'desc1',value:'desv1'},{name:'desc2',value:'desv2'}]).toXMLString()
// <query xmlns="http://www.w3.org/1999/xhtml" start="1" count="2"><usercontext><prop name="uc1" val="vc1"></prop><prop name="uc2" val="vc2"></prop></usercontext><controllercontext><prop name="cc1" val="vc1"></prop><prop name="cc2" val="vc2"></prop></controllercontext><prop name="prop1" val="prv1"></prop><prop name="prop2" val="prv2"><descriptor name="desc1" val="desv1"></descriptor><descriptor name="desc2" val="desv2"></descriptor></prop></query>

// Query({}).addProp('http://openurc.org/ns/res#type', 'http://openurc.org/restypes#video').addProp('http://openurc.org/ns/res#subtype', 'http://openurc.org/restypes#signLanguageVideo').addProp('http://purl.org/dc/elements/1.1/title', 'GSG video explaining the account number input field (human Feldmann)').toXMLString()
// <query xmlns="http://www.w3.org/1999/xhtml"><prop name="http://openurc.org/ns/res#type" val="http://openurc.org/restypes#video"></prop><prop name="http://openurc.org/ns/res#subtype" val="http://openurc.org/restypes#signLanguageVideo"></prop><prop name="http://purl.org/dc/elements/1.1/title" val="GSG video explaining the account number input field (human Feldmann)"></prop></query>
