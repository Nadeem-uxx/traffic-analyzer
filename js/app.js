/*
 * app.js
 * Connects the HTML page, the CSV parser, the analysis functions and the charts.
 * Flow: load data -> store in `state` -> render() draws everything.
 */

// Everything the page needs to remember
const state = {
  records: [],                      // parsed rows
  thresholds: { ...DEFAULT_THRESHOLDS }
};

// Shortcut for document.getElementById
const $ = id => document.getElementById(id);

// ---------- Loading data ----------

function loadCsvText(text, sourceName) {
  const { records, errors } = parseTrafficCsv(text);

  if (records.length === 0) {
    showMessage("Could not use " + sourceName + ": " + errors.join(" "), "error");
    return;
  }

  state.records = records;
  fillJunctionSelect();

  if (errors.length > 0) {
    // Some rows were bad but the rest is usable
    const shown = errors.slice(0, 3).join(" ");
    const more = errors.length > 3 ? ` (+${errors.length - 3} more)` : "";
    showMessage(`Loaded ${records.length} rows from ${sourceName}. Skipped ${errors.length} bad row(s): ${shown}${more}`, "warning");
  } else {
    showMessage(`Loaded ${records.length} rows from ${sourceName}.`, "info");
  }
  render();
}

function onFileChosen(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => loadCsvText(reader.result, file.name);
  reader.onerror = () => showMessage("Could not read the file.", "error");
  reader.readAsText(file);
  event.target.value = ""; // allows choosing the same file again later
}

function fillJunctionSelect() {
  const { junctions } = buildMatrix(state.records);
  const select = $("junctionSelect");
  select.innerHTML = '<option value="all">All junctions</option>';
  for (const name of junctions) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
}

// ---------- Settings ----------

function onThresholdChange() {
  const medium = Number($("mediumInput").value);
  const high = Number($("highInput").value);

  if (!(medium > 0) || !(high > medium)) {
    showMessage("High level must be greater than the Medium level (both above 0).", "error");
    return;
  }
  state.thresholds = { medium, high };
  hideMessage();
  if (state.records.length > 0) render();
}

// ---------- Drawing ----------

function render() {
  const { junctions, matrix } = buildMatrix(state.records);
  const selected = $("junctionSelect").value;
  // Junctions included in the hourly chart / summary
  const chosen = selected === "all" ? junctions : [selected];

  const hourly = hourlyTotals(matrix, chosen);
  const ranking = busiestJunctions(matrix, junctions);          // all junctions (for the bar chart)
  const chosenRanking = busiestJunctions(matrix, chosen);       // only the selected ones (for the summary)

  $("results").hidden = false;
  renderSummary(hourly, chosenRanking, chosen);

  $("hourlyTitle").textContent =
    "Traffic by hour - " + (selected === "all" ? "all junctions combined" : selected);
  drawHourlyChart(hourly, state.thresholds, chosen.length);
  drawJunctionChart(ranking);
  drawTypeChart(vehicleTypeTotals(state.records, chosen));

  renderHeatmap(junctions, matrix);
  renderPeakTable(junctions, matrix);
}

function renderSummary(hourly, ranking, chosen) {
  const total = hourly.reduce((a, b) => a + b, 0);
  const peakHour = indexOfMax(hourly);
  const quietHour = hourly.indexOf(Math.min(...hourly));

  const cards = [
    ["Total vehicles", total.toLocaleString()],
    ["Junctions", chosen.length],
    ["Peak hour", formatHour(peakHour) + " (" + hourly[peakHour].toLocaleString() + ")"],
    ["Quietest hour", formatHour(quietHour) + " (" + hourly[quietHour].toLocaleString() + ")"],
    ["Busiest junction", ranking[0].name]
  ];
  $("summary").innerHTML = cards
    .map(([label, value]) => `<div class="stat"><span class="stat-label">${label}</span><span class="stat-value">${escapeHtml(String(value))}</span></div>`)
    .join("");
}

// Table with one row per junction and one coloured cell per hour
function renderHeatmap(junctions, matrix) {
  let html = "<thead><tr><th>Junction</th>";
  for (let h = 0; h < 24; h++) {
    html += `<th>${String(h).padStart(2, "0")}</th>`;
  }
  html += "</tr></thead><tbody>";

  for (const name of junctions) {
    html += `<tr><th scope="row">${escapeHtml(name)}</th>`;
    matrix[name].forEach((count, hour) => {
      const level = congestionLevel(count, state.thresholds);
      html += `<td class="${level}" title="${escapeHtml(name)} at ${formatHour(hour)}: ${count} vehicles (${level})">${level[0].toUpperCase()}</td>`;
    });
    html += "</tr>";
  }
  $("heatmap").innerHTML = html + "</tbody>";
}

function renderPeakTable(junctions, matrix) {
  const peaks = peakHoursByJunction(matrix, junctions)
    .sort((a, b) => b.count - a.count);

  let html = "<thead><tr><th>Junction</th><th>Peak hour</th><th>Vehicles</th><th>Congestion</th></tr></thead><tbody>";
  for (const p of peaks) {
    const level = congestionLevel(p.count, state.thresholds);
    html += `<tr><td>${escapeHtml(p.name)}</td><td>${formatHour(p.hour)}</td>` +
            `<td>${p.count.toLocaleString()}</td><td><span class="chip ${level}">${level}</span></td></tr>`;
  }
  $("peakTable").innerHTML = html + "</tbody>";
}

// ---------- Small helpers ----------

// Junction names come from user files, so make them safe before putting into HTML
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function showMessage(text, type) {
  const box = $("message");
  box.textContent = text;
  box.className = "message " + type;
  box.hidden = false;
}

function hideMessage() {
  $("message").hidden = true;
}

// ---------- Start ----------

$("loadSampleBtn").addEventListener("click", () => loadCsvText(SAMPLE_CSV, "sample data"));
$("csvFile").addEventListener("change", onFileChosen);
$("mediumInput").addEventListener("change", onThresholdChange);
$("highInput").addEventListener("change", onThresholdChange);
$("junctionSelect").addEventListener("change", () => { if (state.records.length) render(); });

// Show the sample data straight away so the page is never empty
loadCsvText(SAMPLE_CSV, "sample data");
