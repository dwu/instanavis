function createDataSet(dataJson) {
  const items = new vis.DataSet();
  const groups = new vis.DataSet();

  // index by id
  for (const t of dataJson.items) {
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

  // iterate levels
  let level = 0;
  for (; ;) {
    // create group for level
    groups.add({
      id: level,
      content: level
    });

    // iterate element of current level
    for (let item of currentLevel) {
      let data = {};
      data["id"] = item.id;
      data["parentid"] = item.parentId;
      data["name"] = item.name;
      data["timestamp"] = item.timestamp;
      data["service"] = item.destination.service.label;
      data["endpoint"] = item.destination.endpoint.label != "" ? `[${item.destination.endpoint.type}] ${item.destination.endpoint.label}` : `[${item.destination.endpoint.type}]`;
      data["duration"] = `${item.duration} ms`;
      data["minSelfTime"] = `${item.minSelfTime} ms`;
      data["networkTime"] = item.networkTime == null ? `-` : `${item.networkTime} ms`;

      items.add({
        id: item.id,
        group: level,
        content: item.name != null ? `[${item.destination.service.label}] ${item.name}` : `[${item.destination.service.label}]`,
        title: dataToTitle(data),
        start: item.timestamp,
        end: item.timestamp + item.duration
      });

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

  return { items, groups };
}


function dataToTitle(data) {
  return JSON.stringify(data, null, 2).replace(/\n/g, "<br>");
}

function getParents(itemid) {
  const result = [];
  for (; ;) {
    const item = spansById.get(itemid);
    if (item !== undefined && item.parent !== undefined) {
      result.push(item.parent);
      itemid = item.parent.id;
    } else {
      break;
    }
  }
  return result;
}

function getChilds(itemid, childs) {
  const item = spansById.get(itemid);
  if (item !== undefined && item.children.length > 0) {
    for (const c of item.children) {
      childs.push(c);
    }
    for (const c of item.children) {
      getChilds(c.id, childs);
    }
  }
}

const spansById = new Map();
var timeline;
var dataset;

const timelineContainer = document.getElementById("timeline");
const fileSelector = document.getElementById("fileselector");
const spanData = document.getElementById("spandata");

// timeline element clicked
timelineContainer.addEventListener("click", (event) => {
  const props = timeline.getEventProperties(event);

  // remove all highlights
  dataset.items.forEach((item) => {
    dataset.items.updateOnly({ id: item.id, className: null });
  });

  if (props.item != null) {
    // display span data
    const item = dataset.items.get(props.item);
    spanData.innerHTML = item.title;

    // highlight parents and childs
    const parents = getParents(item.id);
    for (const parent of parents) {
      dataset.items.updateOnly({ id: parent.id, className: "hi" });
    }
    console.log(parents);
    const childs = [];
    getChilds(item.id, childs);
    for (const child of childs) {
      dataset.items.updateOnly({ id: child.id, className: "hi" });
    }
  } else {
    spanData.innerHTML = "";
  }
});


// file uploaded
fileSelector.value = null;
fileSelector.addEventListener("change", (event) => {
  const reader = new FileReader();
  reader.addEventListener("load", (event) => {
    timelineContainer.innerHTML = "";
    const dataJson = JSON.parse(event.target.result);

    dataset = createDataSet(dataJson);
    timeline = new vis.Timeline(
      timelineContainer,
      dataset.items,
      {
        "orientation": "top",
        "xss": { "disabled": true }
      });
    timeline.setGroups(dataset.groups);
  });
  reader.readAsText(event.target.files[0]);
});
