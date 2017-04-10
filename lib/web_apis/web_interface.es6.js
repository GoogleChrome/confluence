// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

foam.CLASS({
  name: 'WebInterface',
  package: 'org.chromium.apis.web',
  ids: ['interfaceKey'],
  properties: [
    {
      class: 'String',
      name: 'interfaceName',
      documentation: `The name of a web interface, extracted from
        ApiExtractor.`,
      required: true,
      final: true,
    },
    {
      class: 'String',
      name: 'apiName',
      // TODO: add public documentation on how we define and gather "meaningful"
      // properties.
      documentation: `The name of an API. APIs are identified as meaningful
        properties of an interface.`,
      required: true,
      final: true,
    },
    {
      class: 'String',
      name: 'interfaceKey',
      documentation: `An unique key for this pair of interface/API.
      	Avoid the need for CONCAT mLang or similar to be able to
      	groupBy interfaceName, apiName.`,
      expression: function(interfaceName, apiName) {
        return`${interfaceName}#${apiName}`;
      },
      final: true,
    },
  ],
});
