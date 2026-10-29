/*
 * csvParser.js
 * Turns CSV text into an array of records:
 *   { junction: "Central Square", hour: 9, counts: { cars: 700, bikes: 650, ... } }
 *
 * Expected CSV header:  junction,hour,<one or more vehicle columns>
 * Example:              junction,hour,cars,bikes,buses,trucks
 */

// Splits one CSV line into fields. Handles "quoted, values" too.
function splitCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;           // start/end of a quoted section
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());    // end of a field
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// Accepts "8", "08", "8:00", "08:30" -> 8. Returns NaN if it is not a valid hour.
function parseHour(text) {
  const hour = parseInt(String(text).split(":")[0], 10);
  return hour >= 0 && hour <= 23 ? hour : NaN;
}

/*
 * Main function. Returns { records, errors }.
 * Bad rows are skipped and described in `errors` so the user can fix the file.
 * If the header itself is wrong, records is empty and errors explains why.
 */
function parseTrafficCsv(text) {
  const records = [];
  const errors = [];

  // Remove BOM (added by Excel) and split into non-empty lines
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length < 2) {
    return { records, errors: ["The file needs a header row and at least one data row."] };
  }

  const header = splitCsvLine(lines[0]).map(h => h.toLowerCase());
  const junctionCol = header.indexOf("junction");
  const hourCol = header.indexOf("hour");
  if (junctionCol === -1 || hourCol === -1) {
    return { records, errors: ['Header must contain the columns "junction" and "hour".'] };
  }

  // Every other column is treated as a vehicle type (cars, bikes, ...)
  const vehicleCols = [];
  header.forEach((name, index) => {
    if (index !== junctionCol && index !== hourCol && name !== "") {
      vehicleCols.push({ name, index });
    }
  });
  if (vehicleCols.length === 0) {
    return { records, errors: ["Add at least one vehicle count column (e.g. cars, bikes)."] };
  }

  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i]);
    const rowNumber = i + 1; // line number in the file (header is line 1)

    const junction = fields[junctionCol];
    const hour = parseHour(fields[hourCol]);
    if (!junction) {
      errors.push(`Row ${rowNumber}: junction name is missing.`);
      continue;
    }
    if (Number.isNaN(hour)) {
      errors.push(`Row ${rowNumber}: hour "${fields[hourCol]}" must be 0-23.`);
      continue;
    }

    const counts = {};
    let valid = true;
    for (const col of vehicleCols) {
      const value = Number(fields[col.index]);
      if (fields[col.index] === undefined || fields[col.index] === "" ||
          Number.isNaN(value) || value < 0) {
        errors.push(`Row ${rowNumber}: "${col.name}" must be a non-negative number.`);
        valid = false;
        break;
      }
      counts[col.name] = value;
    }
    if (valid) {
      records.push({ junction, hour, counts });
    }
  }

  return { records, errors };
}

// Lets us test this file with Node (ignored in the browser)
if (typeof module !== "undefined") {
  module.exports = { parseTrafficCsv, splitCsvLine, parseHour };
}
