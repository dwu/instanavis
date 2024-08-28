function createCsv(spanItems) {
  const rows = new Array();

  // index by id
  for (const t of spanItems) {
    spansById.set(t.id, t);
  }

  // link parent object
  for (const [_, t] of spansById.entries()) {
    t.parent = spansById.get(t.parentId);
  }

  // link child items
  for (const [_, t] of spansById.entries()) {
    t.children = new Array();
    for (const [_, tc] of spansById.entries()) {
      if (tc.parentId == t.id && tc.id != t.id) {
        t.children.push(tc);
      }
    }
    t.children = t.children.sort((a, b) => a - b);
  };

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
    "endpointtype",
    "duration",
    "minSelfTime",
    "networkTime",
    "technologies"
  ].join(";"));

  // iterate levels
  let level = 0;
  for (;;) {
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

const timelineContainer = document.getElementById("timeline");
const fileSelector = document.getElementById("fileselector");
const csvData = document.getElementById("csvdata");

function readFileAsString(file) {
  const temporaryFileReader = new FileReader();

  return new Promise((resolve, reject) => {
    temporaryFileReader.onerror = () => {
      temporaryFileReader.abort();
      reject(new DOMException("Problem parsing input file."));
    };

    temporaryFileReader.onload = () => {
      resolve(temporaryFileReader.result);
    };
    temporaryFileReader.readAsText(file);
  });
}

async function readFiles(files) {
  spansById.clear();
  spanItems.length = 0;
  data.length = 0;

  // process file contents
  for (const file of files) {
    let content = await readFileAsString(file);
    const spans = JSON.parse(content);
    spanItems = spanItems.concat(spans.items)
    data = createCsv(spanItems);
  }

  // create download link
  const downloadLink = document.createElement("a");
  downloadLink.setAttribute("id", "download");
  var blob = new Blob([data.join("\n")], { type: "text/csv" });
  var url = URL.createObjectURL(blob)
  downloadLink.textContent = "Download CSV";
  downloadLink.setAttribute("href", url)
  downloadLink.setAttribute("download", `${files[0].name}.csv`)
  csvData.parentNode.insertBefore(downloadLink, csvData);
}

// file uploaded
fileSelector.value = null;
fileSelector.addEventListener("change", (event) => {
  csvData.innerHTML = "";
  const downloadLink = document.getElementById("download");
  if (downloadLink != null) {
    downloadLink.remove();
  }

  readFiles(event.target.files);
});
