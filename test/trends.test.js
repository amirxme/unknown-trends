import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTitleKey, parseGoogleTrendsRss } from "../lib/trends/source-google.js";
import { scoreTrend } from "../lib/trends/scoring.js";

test("normalizes non-Latin titles without producing an empty key", () => {
  assert.equal(normalizeTitleKey("プルデンシャル 業務停止命令"), "プルデンシャル 業務停止命令");
  assert.equal(normalizeTitleKey("Café & AI"), "café and ai");
});

test("parses an RSS item with its regional rank", () => {
  const xml = `<rss><channel><item><title><![CDATA[AI agents]]></title><ht:approx_traffic><![CDATA[20K+]]></ht:approx_traffic></item></channel></rss>`;
  const [item] = parseGoogleTrendsRss(xml, { code: "US", name: "United States" });
  assert.deepEqual(item, {
    title: "AI agents",
    titleKey: "ai agents",
    traffic: 20000,
    trafficLabel: "20K+",
    rank: 1,
    region: { code: "US", name: "United States" },
    publishedAt: null
  });
});

test("does not invent growth or confidence for a new signal", () => {
  const trend = scoreTrend({
    title: "AI agents",
    titleKey: "ai agents",
    regions: new Map([["US", { code: "US", name: "United States" }]]),
    ranks: new Map([["US", 1]]),
    maxTraffic: 20000,
    regionsTracked: 10
  }, []);

  assert.equal(trend.status, "NEW");
  assert.equal(trend.growth, null);
  assert.equal(trend.velocity, null);
  assert.equal(trend.momentumScore, null);
  assert.equal(trend.confidenceScore, null);
  assert.equal(trend.emergingScore, 0);
});

test("calculates movement only from historical snapshots", () => {
  const trend = scoreTrend({
    title: "AI agents",
    titleKey: "ai agents",
    regions: new Map([
      ["US", { code: "US", name: "United States" }],
      ["GB", { code: "GB", name: "United Kingdom" }]
    ]),
    ranks: new Map([["US", 1], ["GB", 3]]),
    maxTraffic: 20000,
    regionsTracked: 10
  }, [{ global_score: 40 }, { global_score: 35 }]);

  assert.equal(trend.momentum, trend.globalScore - 40);
  assert.equal(trend.acceleration, (trend.globalScore - 40) - 5);
  assert.ok(trend.growth.endsWith("%"));
  assert.ok(trend.confidenceScore > 0);
});

test("ignores invalid history rows and clamps impossible coverage", () => {
  const trend = scoreTrend({
    title: "Signal",
    titleKey: "signal",
    regions: new Map([["US", { code: "US", name: "United States" }]]),
    ranks: new Map([["US", 1]]),
    maxTraffic: 1000,
    regionsTracked: 0
  }, [{ global_score: "not-a-score" }, { global_score: 20 }]);

  assert.equal(trend.coverageScore, 0);
  assert.equal(trend.historyCount, 1);
  assert.equal(trend.momentum, trend.globalScore - 20);
  assert.equal(trend.history.length, 1);
});

test("marks a strong positive historical movement as breakout", () => {
  const trend = scoreTrend({
    title: "Breakout",
    titleKey: "breakout",
    regions: new Map([
      ["US", { code: "US", name: "United States" }],
      ["GB", { code: "GB", name: "United Kingdom" }],
      ["DE", { code: "DE", name: "Germany" }],
      ["FR", { code: "FR", name: "France" }],
      ["JP", { code: "JP", name: "Japan" }]
    ]),
    ranks: new Map([["US", 1], ["GB", 1], ["DE", 1], ["FR", 1], ["JP", 1]]),
    maxTraffic: 1000000,
    regionsTracked: 5
  }, [{ global_score: 20 }]);

  assert.equal(trend.status, "BREAKOUT");
});
