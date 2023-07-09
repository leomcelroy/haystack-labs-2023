import { html, svg, render } from "https://unpkg.com/lit-html@2.6.1/lit-html.js";
import { createListener } from "./createListener.js"
import { runProgram } from "./runProgram.js"
import { downloadGCode } from "./downloadGCode.js"
import { addProgramEditting } from "./addProgramEditting.js"
import { elsAtLoc } from "./elsAtLoc.js"

const STATE = {
  boxes: [ 
    { 
      color: "blue", 
      type: "shape",
      sides: 32,
      icon: "shape",
    },
    { 
      color: "blue", 
      type: "macro",
      value: "",
      sides: 32,
      icon: "M",
    },
    { 
      color: "auburn", 
      type: "sine",
      frequency: Math.PI,
      amplitude: 1,
      phase: 0,
      shift: 0,
      icon: "sine",
    },
    { 
      color: "blue", 
      type: "difference",
      icon: "D"
      
    },
    { 
      color: "blue", 
      type: "union",
      icon: "U"
    },
    { 
      color: "blue", 
      type: "warp",
      icon: "W"
    },
    { 
      color: "blue", 
      type: "point",
      icon: "Pt"
    },
    { 
      color: "pink", 
      type: "bezier",
      start: 0,
      handle0: [.5, .5],
      handle1: [.5, .5],
      end: 1,
      icon: "bezier",
    },
    { 
      color: "yellow", 
      type: "translateX",
      icon: "TX"
       
    }, 
    { 
      color: "green", 
      type: "translateY",
      icon: "TY"
    }, 
    { 
      color: "orange", 
      type: "scaleX",
      icon: "SX"
    },
    { 
      color: "purple",
      type: "scaleY",
      icon: "SY"
    },
    { 
      color: "grey",
      type: "rotate",
      icon: "R"
    },
    { 
      color: "red", 
      type: "compose",
      icon: "C"
    },
    { 
      color: "red", 
      type: "multiply",
      icon: "x"
    },
    { 
      color: "red", 
      type: "plus",
      icon: "plus"
    },
  ],
  programs: {
    "main": [ 
      { 
        color: "blue", 
        type: "shape",
        sides: 32,
        icon: "shape"
      },
    ]
  },
  dragId: null,
  mouse: {x: 0, y: 0},
  result: null,
  height: 10,
  layers: 50,
  editor: null,
  editValue: null
}

const EDITORS = {
  "shape": (value) => html`
    <div>Number of Sides: ${value.sides.toFixed(0)}</div>
    <input 
      type="range" 
      min="3" 
      max="100" 
      step="1"
      .value=${value.sides} 
      @input=${e => value.sides = Number(e.target.value)}>
  `,
  "sine": (value) => html`
    <div>Frequency: ${value.frequency.toFixed(3)}</div>
    <input 
      type="range" 
      min="0" 
      max="100" 
      .value=${value.frequency} 
      @input=${e => value.frequency = Number(e.target.value)}>

    <div>Amplitude: ${value.amplitude.toFixed(3)}</div>
    <input 
      type="range" 
      min="0" 
      max="100" 
      .value=${value.amplitude} 
      @input=${e => value.amplitude = Number(e.target.value)}>

    <div>Phase: ${value.phase.toFixed(3)}</div>
    <input 
      type="range" 
      min="0" 
      max="100" 
      .value=${value.phase} 
      @input=${e => value.phase = Number(e.target.value)}>

    <div>Shift: ${value.shift.toFixed(3)}</div>
    <input 
      type="range" 
      min="0" 
      max="100" 
      .value=${value.shift} 
      @input=${e => value.shift = Number(e.target.value)}>
  `,
  "bezier": (value) => html`
  `,
  "pt": (value) => html`
  `,
  "macro": (value) => html`
    <div>macro name: ${value.value}</div>
  `,
}

let macroCount = 0;
function view(state) {
  return html`
    <div class="root">
      <div class="view-window" style="display: relative;">
        <div class="render-target"></div>
        <div class="height-layers">
          <div style="padding: 5px; display: flex; justify-content: space-between;">
            <span style="padding-right: 5px;">height</span><input style="width: 70px;" .value=${state.height} @input=${e => { state.height = Number(e.target.value)}}/>
          </div>
          <div style="padding: 5px; display: flex; justify-content: space-between;">
            <span style="padding-right: 5px;">layers</span><input style="width: 70px;" .value=${state.layers} @input=${e => { state.layers = Number(e.target.value)}}/>
          </div>
        </div>
      </div>

      <div class="box-container">${state.boxes.map(box)}</div>

      <div class="dictionary">
        ${prioritizeKey(Object.entries(state.programs), "main").map(drawProgram)}
      </div>
      <div style="display: flex; justify-content: space-evenly; padding: 5px">
        <button style="width: 150px; height: 30px;">save</button>
        <button style="width: 150px; height: 30px;">upload</button>
        <button style="width: 150px; height: 30px;" @click=${() => runProgram(state)}>run</button>
        <button style="width: 150px; height: 30px;" @click=${() => downloadGCode(state)}>download gcode</button>
        <button style="width: 150px; height: 30px;" @click=${() => {
          state.programs[`macro_${macroCount}`] = [];
          macroCount++;
        }}>new macro</button>
      </div>
      ${drawDragged(state.dragId, state.mouse)}
      ${drawEditor(state.editor, state.editValue)}
    </div>
  `
}

function prioritizeKey(entries, key) {
  return entries.sort((a, b) => (b[0] === key) - (a[0] === key));
}

const box = (box, index) => html`
  <div 
    class="box" 
    data-index=${index}
    style=${`
      background: ${box.color};
      background-image: url('./icons/${box.icon ?? "default"}.png'); 
      background-size: cover; 
      background-position: center;
      border: 1px solid black;
      border-radius: 3px; 
    `}>
  </div>
`

const draggableBox = (box, index, name) => {
  if (!box) return "";

  return html`
    <div 
      class="draggable-box" 
      data-index=${index}
      data-program-name=${name}
      style=${`
        background: ${box.color};
        background-image: url('./icons/${box.icon ?? "default"}.png'); 
        background-size: cover; 
        background-position: center;
        border: 1px solid black;
        border-radius: 3px;
      `}>
        
      </div>
  `
}

const drawProgram = ([programName, programData]) => html`
  <div class="program">
    <div class="program-name" @click=${e => {
      if (programName === "main") return;
      let newName = prompt("Change name of program.")
      newName = newName.replaceAll(/\s/g, "_");
      if (newName === programName) return;

      STATE.programs[newName] = STATE.programs[programName];
      delete STATE.programs[programName];
      console.log(STATE);
    }}>${programName}</div>
    <div class="program-boxes">
      ${programData.map( (box, index) => draggableBox(box, index, programName) )}
      <div 
        class="program-spacer-end" 
        data-program-name=${programName}
        data-index=${programData.length}
        style="aspect-ratio: 1; padding: 5px; margin: 5px; height: 40px;"></div>
    </div>
  </div>
`

const drawDragged = (dragged, mouse) => dragged === null ? "" : html`
  <div 
    style=${`
      position: absolute; 
      width: 50px;
      height: 50px;
      background: ${dragged.data.color};
      background-image: url('./icons/${dragged.data.icon ?? "default"}.png'); 
      background-size: cover; 
      background-position: center;
      border: 1px solid black;
      border-radius: 3px;
      left:${mouse.x-dragged.shiftX}px; 
      top:${mouse.y-dragged.shiftY}px;`}>
      
  </div>
`

function drawEditor(editor) {
  if (editor === null) return "";

  const editorView = EDITORS[editor.type];

  return html`
    <div class="editor-modal">
      <div style="font-size: large; font-weight: 900;">${editor.type}</div>
      ${editorView ? editorView(editor) : ""}
      <button @click=${e => {
        STATE.editor = null;
      }}>close editor</button>
    </div>
  `
}

const renderLoop = () => {
  render(view(STATE), document.body);
  requestAnimationFrame(renderLoop);
}

renderLoop();

window.addEventListener("mousemove", e => {
  // STATE.domPath = e.composedPath();
  // console.log(STATE.domPath);
  STATE.mouse.x = e.clientX;
  STATE.mouse.y = e.clientY;
})

addProgramEditting(STATE);



window.STATE = STATE;

