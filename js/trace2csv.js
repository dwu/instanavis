import { readFileAsString } from "./utils.js";

function createCsv(spanItems) {
  const rows = new Array();

  // index by id
  for (const t of spanItems) {
    spansById.set(t.id, t);
  }

  // link parent and child objects
  for (const [_, t] of spansById.entries()) {
    t.children = new Array();
    t.parent = spansById.get(t.parentId);
  }

  for (const [_, t] of spansById.entries()) {
    const parent = spansById.get(t.parentId);
    if (parent != null) {
      parent.children.push(t);
    }
  }

  for (const [_, t] of spansById.entries()) {
    t.children = t.children.sort((a, b) => a - b);
  }

  // fill root level
  let nextLevel = new Array();
  let currentLevel = new Array();
  for (const [_, t] of spansById.entries()) {
    if (t.parent === undefined) {
      currentLevel.push(t);
    }
  }

  rows.push([
    "id",
    "level",
    "parentid",
    "parentisintrace",
    "numchildren",
    "numerrors",
    "name",
    "timestamp",
    "serviceid",
    "servicelabel",
    "endpointid",
    "endpointlabel",
    "endpoint",
    "duration",
    "minSelfTime",
    "networkTime",
    "technologies"
  ].join(";"));

  // iterate levels
  let level = 0;
  while (true) {
    // iterate element of current level
    for (let item of currentLevel) {
      rows.push([
        item.id,
        level,
        item.parentId,
        spansById.has(item.parentId),
        item.children.length,
        item.errorCount,
        item.name,
        item.timestamp,
        item.destination.service.id,
        item.destination.service.label,
        item.destination.endpoint.id,
        item.destination.endpoint.label,
        item.destination.endpoint.type,
        item.duration,
        item.minSelfTime,
        item.networkTime == null ? "" : item.networkTime,
        item.destination.technologies.join("|")
      ].join(";"));
      nextLevel = nextLevel.concat(item.children);
    }

    if (nextLevel.length == 0) {
      break;
    }

    currentLevel.length = 0;
    currentLevel = currentLevel.concat(nextLevel);
    nextLevel.length = 0;

    level += 1;
  }
  return rows;
}

let data = [];
let spanItems = [];
const spansById = new Map();

const fileSelector = document.getElementById("fileselector");

async function readFiles(files) {
  spansById.clear();
  spanItems.length = 0;
  data.length = 0;

  // process file contents
  for (const file of files) {
    let content = await readFileAsString(file);
    const spans = JSON.parse(content);
    spanItems = spanItems.concat(spans.items)
  }

  data = createCsv(spanItems);

  // create download link
  const downloadLink = document.createElement("a");
  var blob = new Blob([data.join("\n")], { type: "text/csv" });
  var url = URL.createObjectURL(blob)
  downloadLink.textContent = "Download CSV";
  downloadLink.setAttribute("href", url)
  downloadLink.setAttribute("download", `${files[0].name}.csv`)
  document.getElementById("download").appendChild(downloadLink);
}

// file uploaded
fileSelector.value = null;
fileSelector.addEventListener("change", (event) => {
  document.getElementById("download").innerHTML = "";
  readFiles(event.target.files);
});
