
import { createListener } from "./createListener.js"

export function addProgramEditting(state) {
  const listener = createListener(document.body);

  let removed = false;
  let fromToolbox = false;
  let dragged = false;

  listener("mousedown", ".box", (e, trigger) => {
    const index = Number(trigger.dataset.index);
    const data = state.boxes[index];
    const shiftX = event.clientX - trigger.getBoundingClientRect().left;
    const shiftY = event.clientY - trigger.getBoundingClientRect().top;

    state.dragId = {
      name: "",
      index,
      data,
      shiftX,
      shiftY
    };

    fromToolbox = true;
  })

  listener("mousedown", ".draggable-box", (e, trigger) => {
    const index = Number(trigger.dataset.index);
    const name = trigger.dataset.programName;
    const data = state.programs[name][index];
    const shiftX = event.clientX - trigger.getBoundingClientRect().left;
    const shiftY = event.clientY - trigger.getBoundingClientRect().top;

    state.dragId = {
      name,
      index,
      data,
      shiftX,
      shiftY
    };


  });

  listener("mousemove", "", e => {
    if (removed) return;
    if (fromToolbox) return;
    if (state.dragId === null) return;

    const { name, index } = state.dragId;

    const targetArr = state.programs[name];
    targetArr.splice(index, 1);

    removed = true;
    dragged = true;
  })

  listener("mouseup", "", e => {

    if (!removed && !fromToolbox) return;
    if (state.dragId === null) return;

    const els = elsAtLoc(e.clientX, e.clientY, ".draggable-box, .program-spacer-start, .program-spacer-end");

    if (els.length === 0) return;

    const el = els[0];

    const hoverId = {
      name: el.dataset.programName,
      index: Number(el.dataset.index)
    }

    const targetArr = state.programs[hoverId.name];

    insertAtIndex(targetArr, state.dragId.data, Number(el.dataset.index));
  
  })

  listener("mouseup", "", (e) => {
    if (dragged || fromToolbox) return;

    const els = elsAtLoc(e.clientX, e.clientY, ".draggable-box");
    if (els.length !== 1) return;
    const [ box ] = els;
    const { programName, index} = box.dataset;

    const value = state.programs[programName][index];

    state.editor = value;
  })

  listener("mouseup", "", e => {
    for (const prog in state.programs) {
      if (prog === "main") continue;

      if (state.programs[prog].length === 0) delete state.programs[prog];
    }

    removed = false;
    fromToolbox = false;
    dragged = false;
    state.dragId = null;
  })
}

function elsAtLoc(x, y, selector) {
  const matchedElements = [];
  const elements = document.querySelectorAll(selector);

  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      matchedElements.push(element);
    }
  }

  return matchedElements;
}

function insertAtIndex(array, value, index) {
  // Check if index is valid
  if (index < 0 || index > array.length) {
    console.error("Invalid index");
    return;
  }

  array.splice(index, 0, value);
}


function moveArrayElement(arr, sourceIndex, targetIndex) {
  // Check if sourceIndex and targetIndex are valid
  if (sourceIndex < 0 || sourceIndex >= arr.length || targetIndex < 0 || targetIndex >= arr.length) {
    console.error("Invalid sourceIndex or targetIndex");
    return;
  }

  // Remove the element from sourceIndex
  const element = arr.splice(sourceIndex, 1)[0];

  // Insert it back to the array at targetIndex
  arr.splice(targetIndex, 0, element);
}