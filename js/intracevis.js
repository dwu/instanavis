function createDataSetForSpan(span, level, items, groups, parents, childs) {
  // create group for current level
  if (groups.get(level) == null) {
    groups.add({
      id: level,
      content: level
    });
  }

  // store parent information
  if (span.parentId != "") {
    parents[span.id] = span.parentId;
  }

  // store child information
  childs[span.id] = span.childSpans.map((s) => s.id);

  // format properties in dotted notation
  const data = DotObject.dot(span.data);
  data["id"] = span.id;
  data["name"] = span.name;
  data["label"] = span.label;
  data["duration"] = span.duration + "ms";
  data["duration_self"] = span.calculatedSelfTime + "ms";

  items.add({
    id: span.id,
    group: level,
    content: `${span.label} (${span.name})`,
    title: dataToTitle(data),
    start: span.start,
    end: span.start+span.duration
  });
  for (const childSpan of span.childSpans) {
    createDataSetForSpan(childSpan, level+1, items, groups, parents, childs);
  }
}

function dataToTitle(data) {
  return JSON.stringify(data, null, 2).replace(/\n/g, "<br>");
}

function createDataSet(trace) {
  const items = new vis.DataSet();
  const groups = new vis.DataSet();
  const parents = {};
  const childs = {};

  createDataSetForSpan(trace.rootSpan, 0, items, groups, parents, childs);

  return {items, groups, parents, childs};
}

function getParents(dataset, spanid) {
  const result = [];
  for (;;) {
    if (spanid in dataset.parents) {
      const parentid = dataset.parents[spanid];
      result.push(dataset.items.get(parentid));
      spanid = parentid;
    } else {
      break;
    }
  }
  return result;
}

function getChilds(dataset, spanid, childs) {
  for (const cid of dataset.childs[spanid]) {
    childs.push(dataset.items.get(cid));
    getChilds(dataset, cid, childs);
  }
}

var timeline;
var dataset;

const timelineContainer = document.getElementById("timeline");
const fileSelector = document.getElementById("fileselector");
const spanData = document.getElementById("spandata");

// timeline element clicked
timelineContainer.addEventListener("click", (event) => {
  const props = timeline.getEventProperties(event);

  // remove all parent highlights
  dataset.items.forEach((item) => {
    dataset.items.updateOnly({id: item.id, className: null});
  });

  if (props.item != null) {
    // display span data
    const item = dataset.items.get(props.item);
    spanData.innerHTML = item.title;

    // highlight parents and childs
    const parents = getParents(dataset, item.id);
    for (const parent of parents) {
      dataset.items.updateOnly({id: parent.id, className: "hi"});
    }
    const childs = [];
    getChilds(dataset, item.id, childs);
    for (const child of childs) {
      dataset.items.updateOnly({id: child.id, className: "hi"});
    }
  } else {
    spanData.innerHTML = "";
  }
});

// file uploaded
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
