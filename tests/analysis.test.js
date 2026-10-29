// Simple tests without any library. Run with:  node tests/analysis.test.js
const assert = require("assert");
const { parseTrafficCsv, parseHour } = require("../js/csvParser.js");
const A = require("../js/analysis.js");

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("PASS  " + name);
}

const csv = [
  "junction,hour,cars,bikes",
  "A,8,300,200",
  "A,9,600,500",
  "B,9,100,50",
  "B,10,abc,5",      // bad row
  "C,25,1,1"         // bad hour
].join("\n");

const { records, errors } = parseTrafficCsv(csv);

test("parses valid rows and reports bad ones", () => {
  assert.strictEqual(records.length, 3);
  assert.strictEqual(errors.length, 2);
});
test("hour formats are understood", () => {
  assert.strictEqual(parseHour("08:30"), 8);
  assert.ok(Number.isNaN(parseHour("24")));
});
test("missing header columns give an error", () => {
  assert.strictEqual(parseTrafficCsv("a,b\n1,2").records.length, 0);
});

const { junctions, matrix } = A.buildMatrix(records);
test("matrix sums vehicle types", () => {
  assert.strictEqual(matrix.A[9], 1100);
});
test("peak hour per junction", () => {
  const peaks = A.peakHoursByJunction(matrix, junctions);
  assert.strictEqual(peaks[0].hour, 9);
});
test("busiest junction is A", () => {
  assert.strictEqual(A.busiestJunctions(matrix, junctions)[0].name, "A");
});
test("citywide peak hour is 9", () => {
  assert.strictEqual(A.indexOfMax(A.hourlyTotals(matrix, junctions)), 9);
});
test("congestion levels use thresholds", () => {
  const t = A.DEFAULT_THRESHOLDS;
  assert.strictEqual(A.congestionLevel(100, t), "low");
  assert.strictEqual(A.congestionLevel(500, t), "medium");
  assert.strictEqual(A.congestionLevel(1000, t), "high");
});
test("vehicle type totals", () => {
  assert.deepStrictEqual(A.vehicleTypeTotals(records, junctions), { cars: 1000, bikes: 750 });
});

console.log("\nAll " + passed + " tests passed");
