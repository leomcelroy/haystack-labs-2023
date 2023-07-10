// import { html, svg, render } from "https://unpkg.com/lit-html@2.6.1/lit-html.js";
import { html, svg, render } from "./lit-html.js";
import { createListener } from "./createListener.js"
import { runProgram } from "./runProgram.js"
import { downloadGCode } from "./downloadGCode.js"
import { addProgramEditting } from "./addProgramEditting.js"
import { addBezHandle } from "./addBezHandle.js"
import { addPtHandle } from "./addPtHandle.js"
import { download } from "./download.js";
import { addUpload } from "./addUpload.js";
import * as THREE from 'three';
import { OrbitControls } from 'orbitControls';
import { editors } from "./editors.js";
import { elsAtLoc } from "./elsAtLoc.js"

const STATE = {
  boxes: [ 
    { 
      type: "shape",
      sides: 32,
      icon: "shape",
      opera: "nd"
    },
    { 
      type: "sine",
      frequency: Math.PI,
      amplitude: 1,
      phase: 0,
      shift: 0,
      icon: "sine",
      opera: "nd"
    },
    { 
      type: "bezier",
      start: 0,
      handle0: [.5, 0],
      handle1: [.5, 1],
      end: 1,
      scale: 1,
      icon: "bezier",
      opera: "nd"
    },
    { 
      type: "scale",
      direction: "xy", // "x" "y"
      opera: "tor",
      text: "S"
    },
    { 
      type: "number",
      value: 1,
      icon: "N",
      opera: "nd"
    },
    { 
      type: "macro",
      value: "",
      sides: 32,
      icon: "M",
    },
    { 
      type: "difference",
      icon: "D",
      opera: "tor"
      
    },
    { 
      type: "union",
      icon: "U",
      opera: "tor"
    },
    { 
      type: "intersection",
      icon: "I",
      opera: "tor",
    },
    { 
      type: "warp",
      icon: "W",
      opera: "tor"
    },
    { 
      type: "point",
      value: [0, 0],
      // icon: "Pt",
      text: "Pt",
      opera: "nd"
    },
    { 
      type: "translateX",
      icon: "TX",
      opera: "tor"
       
    }, 
    { 
      type: "translateY",
      icon: "TY",
      opera: "tor"
    }, 
    { 
      type: "scaleX",
      icon: "SX",
      opera: "tor",
    },
    { 
      type: "scaleY",
      icon: "SY",
      opera: "tor"
    },
    { 
      type: "rotate",
      icon: "R",
      opera: "tor"
    },
    { 
      type: "code",
      icon: "C",
      opera: "tor"
    },
    { 
      type: "multiply",
      icon: "x",
      opera: "tor"
    },
    { 
      type: "plus",
      icon: "plus",
      opera: "tor"
    },
  ],
  programs: {
    "main": [ ]
  },
  dragId: null,
  mouse: {x: 0, y: 0},
  result: null,
  height: 10,
  layers: 50,
  threeLines: [],
  editor: null,
  editValue: null
}


let macroCount = 0;
function view(state) {
  return html`
    <div class="root">
      <div class="view-window" style="position: relative;">
        <div class="render-target" style="height: 100%;"></div>
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
        <button style="width: 150px; height: 30px;" @click=${() => {
          const json = JSON.stringify(state.programs);
          download("pot", "json", json);
        }}>save</button>
        <button style="width: 150px; height: 30px;" @click=${evalProgram}>run</button>
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
      background-image: ${box.icon ? `url('./icons/${box.icon}.png')` : ""}; 
      background-size: cover; 
      background-position: center;
      border: 1px solid black;
      border-radius: 3px; 
      background: ${!box.icon ? "white" : ""};
      display: ${!box.icon ? "flex" : ""};
      align-items: ${!box.icon ? "center" : ""};
      font-size: ${!box.icon ? "xx-large" : ""};
      justify-content: ${!box.icon ? "center" : ""};
    `}>
    ${!box.icon ? box.text : ""}
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
        background-image: ${box.icon ? `url('./icons/${box.icon}.png')` : ""}; 
        background-size: cover; 
        background-position: center;
        border: 1px solid black;
        border-radius: 3px; 
        background: ${!box.icon ? "white" : ""};
        display: ${!box.icon ? "flex" : ""};
        align-items: ${!box.icon ? "center" : ""};
        font-size: ${!box.icon ? "xx-large" : ""};
        justify-content: ${!box.icon ? "center" : ""};
      `}>
      ${!box.icon ? box.text : ""}
    </div>
        
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

const drawDragged = (box, mouse) => box === null ? "" : html`
  <div 
    style=${`
      position: absolute; 
      width: 50px;
      height: 50px;
      background-image: ${box.data.icon ? `url('./icons/${box.data.icon}.png')` : ""}; 
      background-size: cover; 
      background-position: center;
      border: 1px solid black;
      border-radius: 3px;
      left:${mouse.x-box.shiftX}px; 
      top:${mouse.y-box.shiftY}px;
      background: ${!box.data.icon ? "white" : ""};
      display: ${!box.data.icon ? "flex" : ""};
      align-items: ${!box.data.icon ? "center" : ""};
      font-size: ${!box.data.icon ? "xx-large" : ""};
      justify-content: ${!box.data.icon ? "center" : ""};`}>
      
      ${!box.data.icon ? box.data.text : ""}
      
  </div>
`

function drawEditor(editor) {
  if (editor === null) return "";

  const editorView = editors[editor.type];

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
addBezHandle(STATE);
addPtHandle(STATE);

window.STATE = STATE;


function renderLines(domElement) {
  // Get the dimensions of the DOM element
  const width = domElement.clientWidth;
  const height = domElement.clientHeight;

  // Create a scene
  const scene = new THREE.Scene();

  // Add a base plane (GridHelper)
  const size = 10;
  const divisions = 10;
  const gridHelper = new THREE.GridHelper(size, divisions);
  scene.add(gridHelper);

  // Create a camera with the aspect ratio of the DOM element
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.z = 5;

  // Create a renderer and set its size to the dimensions of the DOM element
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);
  domElement.appendChild(renderer.domElement);


  // Add OrbitControls for panning and zooming
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // required if controls.enableDamping or controls.autoRotate are set to true
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 1;
  controls.maxDistance = 50;
  controls.maxPolarAngle = Math.PI / 2;

  // Animation
  function animate() {
    const id = requestAnimationFrame(animate);
    controls.update(); // required if controls.enableDamping or controls.autoRotate are set to true
    renderer.render(scene, camera);

    return id;
  }

 animate();

 return scene;
}

addUpload(document.body, STATE);

STATE.scene = renderLines(document.querySelector(".render-target"));

function addLines(scene, lines, lineThickness = 0.015) {
  while (STATE.threeLines.length) {
    const threeLine = STATE.threeLines.pop();
    STATE.scene.remove(threeLine);
  }

  // Create a material
  const material = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    linewidth: lineThickness,
  });

  const threeLines = [];
  lines.forEach(polyline => {
    const geometry = new THREE.BufferGeometry().setFromPoints(polyline.map(pt => new THREE.Vector3(pt[0], pt[2], pt[1])));
    const line = new THREE.Line(geometry, material);
    threeLines.push(line);
    scene.add(line);
  });

  STATE.threeLines = threeLines;

}

function evalProgram() {

  const fn = runProgram(STATE);

  const { height, layers } = STATE;
  const shape = [];

  for (let i = 0; i < layers; i += 1) { 
    const t = i/(layers-1);
    const z = t*height;
    const pls = fn(t).map(pl => pl.map(pt => [...pt, z]));
    shape.push(pls);
  }




  addLines(STATE.scene, shape.flat());

  return shape;
     
}

window.evalProgram = evalProgram;

