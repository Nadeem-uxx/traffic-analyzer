/*
 * analysis.js
 * Pure calculation functions (no DOM code here), so they are easy to test.
 * Input is the array of records produced by csvParser.js.
 */

const DEFAULT_THRESHOLDS = { medium: 500, high: 1000 }; // vehicles per hour

// Sum of all vehicle types in one record
function totalOf(counts) {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

/*
 * Groups the data into a table: matrix[junction][hour] = total vehicles.
 * If a junction/hour appears more than once, the counts are added together.
 * Returns { junctions: [names], matrix: { name: [24 numbers] } }
 */
function buildMatrix(records) {
  const matrix = {};
  for (const r of records) {
    if (!matrix[r.junction]) {
      matrix[r.junction] = new Array(24).fill(0);
    }
    matrix[r.junction][r.hour] += totalOf(r.counts);
  }
  return { junctions: Object.keys(matrix), matrix };
}

// Total vehicles per hour across the chosen junctions (all if none given)
function hourlyTotals(matrix, junctions) {
  const totals = new Array(24).fill(0);
  for (const name of junctions) {
    matrix[name].forEach((count, hour) => { totals[hour] += count; });
  }
  return totals;
}

// Index of the biggest number in an array (the first one if there is a tie)
function indexOfMax(values) {
  let best = 0;
  values.forEach((v, i) => { if (v > values[best]) best = i; });
  return best;
}

// Junctions sorted from busiest to quietest: [{ name, total }]
function busiestJunctions(matrix, junctions) {
  return junctions
    .map(name => ({ name, total: matrix[name].reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);
}

// Peak hour of each junction: [{ name, hour, count }]
function peakHoursByJunction(matrix, junctions) {
  return junctions.map(name => {
    const hour = indexOfMax(matrix[name]);
    return { name, hour, count: matrix[name][hour] };
  });
}

// Total of every vehicle type, e.g. { cars: 5000, bikes: 4000, ... }
function vehicleTypeTotals(records, junctions) {
  const totals = {};
  for (const r of records) {
    if (!junctions.includes(r.junction)) continue;
    for (const [type, n] of Object.entries(r.counts)) {
      totals[type] = (totals[type] || 0) + n;
    }
  }
  return totals;
}

// "low" / "medium" / "high" for one hourly count
function congestionLevel(count, thresholds) {
  if (count >= thresholds.high) return "high";
  if (count >= thresholds.medium) return "medium";
  return "low";
}

// "9" -> "09:00"
function formatHour(hour) {
  return String(hour).padStart(2, "0") + ":00";
}

if (typeof module !== "undefined") {
  module.exports = {
    DEFAULT_THRESHOLDS, totalOf, buildMatrix, hourlyTotals, indexOfMax,
    busiestJunctions, peakHoursByJunction, vehicleTypeTotals, congestionLevel, formatHour
  };
}
