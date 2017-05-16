// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

require('./failure_to_ship_data.es6.js');

foam.CLASS({
  package: 'org.chromium.apis.web',
  name: 'FailureToShip',
  extends: 'org.chromium.apis.web.MetricComputer',
  implements: ['org.chromium.mlang.Expressions'],

  documentation: `Metric computer for count of APIs that have been shipping
      in all other browsers for a one-year grace period, but have never been
      shipped in this browser.`,

  requires: [
    'foam.dao.AnonymousSink',
    'foam.dao.EasyDAO',
    'org.chromium.apis.web.FailureToShipData',
    'org.chromium.apis.web.Release',
  ],
  imports: ['releaseDAO'],

  properties: [
    {
      name: 'failureToShipDAO',
      documentation: `This is a DAO that contains failureToShipData.`,
      final: true,
      factory: function() {
        return this.EasyDAO.create({
          name: 'failureToShipDAO',
          of: this.FailureToShipData,
          daoType: 'MDAO',
        });
      },
    },
  ],
  methods: [
    {
      name: 'compute',
      documentation: `Compute failure to ship value for each release in
          "releases", given "date".`,
      code: function(releases, date) {
        return Promise.all(releases.map(
            release => this.computeForRelease(releases, date, release)));
      },
    },
    {
      name: 'computeForRelease',
      documentation: 'Compute browser-specific value for a single release.',
      code: function(releases, date, release) {
        let otherReleases = releases
            .filter(rls => !foam.util.equals(rls.id, release.id));
        const gracePeriodStart = new Date(date.getFullYear() - 1,
                                          date.getMonth(),
                                          date.getDate());
        // Compared releases: Releases of browsers other than "release"'s
        // browser, that were released during the grace period.
        const comparedReleases = this.releaseDAO.where(
            this.AND(
                // LTE: Include other releases on the same date as "release".
                this.LTE(this.Release.RELEASE_DATE, date),
                this.GTE(this.Release.RELEASE_DATE, gracePeriodStart),
                this.OR.apply(
                    this,
                    otherReleases.map(rls => this.AND(
                        this.EQ(this.Release.BROWSER_NAME, rls.browserName),
                        this.EQ(this.Release.OS_NAME, rls.osName))))));
        // Previous releases: Releases of "release"'s browser on or prior to
        // "date".
        const prevReleases = this.releaseDAO.where(
            this.AND(
                // LT: Exclude "release".
                this.LT(this.Release.RELEASE_DATE, date),
                this.EQ(this.Release.BROWSER_NAME, release.browserName),
                this.EQ(this.Release.OS_NAME, release.osName)));
        return Promise.all([comparedReleases.select(), prevReleases.select()])
            .then(results => this.computeFromGracePeriodReleases(
                results[0].a, results[1].a, date, release));
      },
    },
    {
      name: 'computeFromGracePeriodReleases',
      documentation: `Compute browser-specific value based on browsers released
          during grace period.`,
      code: function(comparedReleases, prevReleases, date, release) {
        // Compute:
        // "APIs never shipped in browser-of-interest shipped, but shipped by
        //     all other browsers throughout grace period".
        //
        // i.e.,
        //
        // INTERSECT(<interfaces of other browsers from grace period>)
        //     \ UNION(<interfaces in past browser-of-interest releases>).
        var comparedReleasesLessOne = Array.from(comparedReleases);
        var first = comparedReleasesLessOne.shift();
        return first.interfaces.dao.select(this.INTERSECT(
            comparedReleasesLessOne.map(rls => rls.interfaces.dao),
            this.SET_MINUS(
                this.UNION.apply(
                    this,
                    prevReleases.concat([release])
                        .map(rls => rls.interfaces.dao)),
                this.COUNT())))
            .then(count => this.failureToShipDAO.put(
                this.FailureToShipData.create({
                  browserName: release.browserName,
                  numFailureToShip: count.value,
                  release,
                  date,
                  prevReleases,
                  comparedReleases,
                })));
      },
    },
  ],
});
