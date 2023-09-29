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
  let data = DotObject.dot(span.data);
  data["id"] = span.id;
  data["name"] = span.name;
  data["label"] = span.label;
  data["duration"] = span.duration + "ms";
  data["duration_self"] = span.calculatedSelfTime + "ms";
  data["parentid"] = span.parentId;
  data["childids"] = span.childSpans.map((s) => s.id);

  items.add({
    id: span.id,
    group: level,
    content: `${span.label} (${span.name})`,
    title: JSON.stringify(data, null, 2).replace(/\n/g, "<br>"),
    start: span.start,
    end: span.start+span.duration
  });
  for (let childSpan of span.childSpans) {
    createDataSetForSpan(childSpan, level+1, items, groups, parents, childs);
  }
}

function createDataSet(trace) {
  let items = new vis.DataSet();
  let groups = new vis.DataSet();
  let parents = {};
  let childs = {};

  createDataSetForSpan(trace.rootSpan, 0, items, groups, parents, childs);

  return {items, groups, parents, childs};
}

function getParents(spanid, dataset) {
  let result = [];
  for (;;) {
    if (spanid in dataset.parents) {
      let parentid = dataset.parents[spanid];
      result.push(dataset.items.get(parentid));
      spanid = parentid;
    } else {
      break;
    }
  }
  return result;
}

function getChilds(spanid, dataset, childs) {
  for (let cid of dataset.childs[spanid]) {
    childs.push(dataset.items.get(cid));
    getChilds(cid, dataset, childs);
  }
}

var timeline;
var dataset;

const timelineContainer = document.getElementById("timeline");
const fileSelector = document.getElementById("fileselector");
const spanData = document.getElementById("spandata");

// timeline element clicked
timelineContainer.addEventListener("click", (event) => {
  let props = timeline.getEventProperties(event);

  // remove all parent highlights
  dataset.items.forEach((item) => {
    dataset.items.updateOnly({id: item.id, className: null});
  });

  if (props.item != null) {
    // display span data
    let item = dataset.items.get(props.item);
    spanData.innerHTML = item.title;

    // highlight parents and childs
    let parents = getParents(item.id, dataset);
    for (let parent of parents) {
      dataset.items.updateOnly({id: parent.id, className: "hi"});
    }
    let childs = [];
    getChilds(item.id, dataset, childs);
    for (let child of childs) {
      dataset.items.updateOnly({id: child.id, className: "hi"});
      dataset.items.updateOnly({id: child.id, style: "color: red;"});
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
    let dataJson = JSON.parse(event.target.result);
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
