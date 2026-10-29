/*
 * charts.js
 * Draws the three Chart.js charts. Each function destroys the old chart
 * first, because Chart.js can't reuse a canvas that already has a chart.
 */

const charts = {}; // keeps references so we can destroy them later

const LEVEL_COLORS = { low: "#4caf50", medium: "#ffb300", high: "#e53935" };

function replaceChart(key, canvasId, config) {
  if (charts[key]) {
    charts[key].destroy();
  }
  charts[key] = new Chart(document.getElementById(canvasId), config);
}

// Line chart: vehicles per hour. Points are coloured by congestion level.
function drawHourlyChart(hourlyTotalsArray, thresholds, perJunctionCount) {
  // When several junctions are added together, compare against the combined limits
  const scaledThresholds = {
    medium: thresholds.medium * perJunctionCount,
    high: thresholds.high * perJunctionCount
  };
  const pointColors = hourlyTotalsArray.map(n => LEVEL_COLORS[congestionLevel(n, scaledThresholds)]);

  replaceChart("hourly", "hourlyChart", {
    type: "line",
    data: {
      labels: hourlyTotalsArray.map((_, h) => formatHour(h)),
      datasets: [{
        label: "Vehicles",
        data: hourlyTotalsArray,
        borderColor: "#1e88e5",
        backgroundColor: "rgba(30, 136, 229, 0.15)",
        pointBackgroundColor: pointColors,
        pointRadius: 5,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, title: { display: true, text: "Vehicles per hour" } } }
    }
  });
}

// Horizontal bar chart: total vehicles per junction (busiest first)
function drawJunctionChart(ranking) {
  replaceChart("junction", "junctionChart", {
    type: "bar",
    data: {
      labels: ranking.map(j => j.name),
      datasets: [{ label: "Total vehicles", data: ranking.map(j => j.total), backgroundColor: "#5c6bc0" }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}

// Doughnut chart: share of each vehicle type
function drawTypeChart(typeTotals) {
  const colors = ["#42a5f5", "#ffa726", "#66bb6a", "#ab47bc", "#ef5350", "#26c6da"];
  replaceChart("type", "typeChart", {
    type: "doughnut",
    data: {
      labels: Object.keys(typeTotals),
      datasets: [{ data: Object.values(typeTotals), backgroundColor: colors }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
    }
  });
}
