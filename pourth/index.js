// import { html, svg, render } from "https://unpkg.com/lit-html@2.6.1/lit-html.js";
import { html, svg, render } from "./lit-html.js";
import { createListener } from "./createListener.js"
import { runProgram } from "./runProgram.js"
import { downloadGCode } from "./downloadGCode.js"
import { addProgramEditting } from "./addProgramEditting.js"
import { addBezHandle } from "./addBezHandle.js"
import { addPtHandle } from "./addPtHandle.js"

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { elsAtLoc } from "./elsAtLoc.js"

const STATE = {
  boxes: [ 
    { 
      color: "blue", 
      type: "shape",
      sides: 32,
      icon: "shape",
      opera: "nd"
    },
    { 
      color: "blue", 
      type: "number",
      value: 1,
      icon: "N",
      opera: "nd"
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
      opera: "nd"
    },
    { 
      color: "blue", 
      type: "difference",
      icon: "D",
      opera: "tor"
      
    },
    { 
      color: "blue", 
      type: "union",
      icon: "U",
      opera: "tor"
    },
    { 
      color: "blue", 
      type: "intersection",
      icon: "I",
      opera: "tor",
    },
    { 
      color: "blue", 
      type: "warp",
      icon: "W",
      opera: "tor"
    },
    { 
      color: "blue", 
      type: "point",
      value: [0, 0],
      icon: "Pt",
      opera: "nd"
    },
    { 
      color: "pink", 
      type: "bezier",
      start: 0,
      handle0: [.5, 0],
      handle1: [.5, 1],
      end: 1,
      icon: "bezier",
      opera: "nd"
    },
    { 
      color: "yellow", 
      type: "translateX",
      icon: "TX",
      opera: "tor"
       
    }, 
    { 
      color: "green", 
      type: "translateY",
      icon: "TY",
      opera: "tor"
    }, 
    { 
      color: "orange", 
      type: "scaleX",
      icon: "SX",
      opera: "tor",
    },
    { 
      color: "purple",
      type: "scaleY",
      icon: "SY",
      opera: "tor"
    },
    { 
      color: "grey",
      type: "rotate",
      icon: "R",
      opera: "tor"
    },
    { 
      color: "red", 
      type: "code",
      icon: "C",
      opera: "tor"
    },
    { 
      color: "red", 
      type: "multiply",
      icon: "x",
      opera: "tor"
    },
    { 
      color: "red", 
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
  shape: 0,
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
      max="10"
      step="0.00001" 
      .value=${value.frequency} 
      @input=${e => value.frequency = Number(e.target.value)}>

    <div>Amplitude: ${value.amplitude.toFixed(3)}</div>
    <input 
      type="range" 
      min="0" 
      max="2"
      step="0.001"  
      .value=${value.amplitude} 
      @input=${e => value.amplitude = Number(e.target.value)}>

    <div>Phase: ${value.phase.toFixed(3)}</div>
    <input 
      type="range" 
      min="-2" 
      max="2"
      step="0.0001"  
      .value=${value.phase} 
      @input=${e => value.phase = Number(e.target.value)}>

    <div>Shift: ${value.shift.toFixed(3)}</div>
    <input 
      type="range" 
      min="-2" 
      max="2"
      step="0.0001"  
      .value=${value.shift} 
      @input=${e => value.shift = Number(e.target.value)}>

    <style>
      .sin-viz {
        background: white;
        transform: scale(1, -1);
        border: 1px solid black;
        border-radius: 3px;
      }
    </style>
    <svg class="sin-viz" width="250" height="250" viewBox="-1.05 -1.05 2.1 2.1" xmlns="http://www.w3.org/2000/svg">
      ${drawGrid({
        xMin: -1,
        xMax: 1,
        xStep: 0.1,
        yMin: -1,
        yMax: 1,
        yStep: 0.1,
      })}

      ${drawSine(value)}
    </svg>
  `,
  "bezier": (value) => svg`
  <style>
    .bez-ctrl {
      background: white;
      transform: scale(1, -1);
      border: 1px solid black;
      border-radius: 3px;
    }
  </style>
  <svg class="bez-ctrl" width="250" height="250" viewBox="0.05 -1.05 1.1 2.1" xmlns="http://www.w3.org/2000/svg">
    ${drawGrid({
      xMin: 0,
      xMax: 1,
      xStep: 0.1,
      yMin: -1,
      yMax: 1,
      yStep: 0.1,
    })}
   <path d="M0,${value.start} C ${value.handle0[0]},${value.handle0[1]} ${value.handle1[0]},${value.handle1[1]} 1,${value.end}" stroke-width=".05px" stroke="black" fill="none"/>
    <line x1="0" y1=${value.start} x2=${value.handle0[0]} y2=${value.handle0[1]} stroke="black" stroke-width="0.01" stroke-dasharray="0.02,0.02" />
    <line x1=${value.handle1[0]} y1=${value.handle1[1]} x2="1" y2=${value.end} stroke="black" stroke-width="0.01" stroke-dasharray="0.02,0.02" />
    
    <circle class="bez-handle" .value=${{ idx: "start", value }} cx="0" cy=${value.start} r=".05" fill="red"/>
    <circle class="bez-handle" .value=${{ idx: "handle0", value }} cx=${value.handle0[0]} cy=${value.handle0[1]} r=".05" fill="red"/>
    <circle class="bez-handle" .value=${{ idx: "handle1", value }} cx=${value.handle1[0]} cy=${value.handle1[1]} r=".05" fill="red"/>
    <circle class="bez-handle" .value=${{ idx: "end", value }} cx="1" cy=${value.end} r=".05" fill="red"/>

</svg>
      start: ${value.start.toFixed(2)},
      handle0: [${value.handle0[0].toFixed(1)}, ${value.handle0[1].toFixed(1)}],
      handle1: [${value.handle1[0].toFixed(1)}, ${value.handle1[1].toFixed(1)}],
      end: ${value.end.toFixed(2)}
  `,
  "point": (value) => svg`
    <style>
      .pt-ctrl {
        background: white;
        transform: scale(1, -1);
        border: 1px solid black;
        border-radius: 3px;
      }
    </style>
    <svg class="pt-ctrl" width="250" height="250" viewBox="-1.05 -1.05 2.1 2.1" xmlns="http://www.w3.org/2000/svg">
      ${drawGrid({
        xMin: -1,
        xMax: 1,
        xStep: 0.1,
        yMin: -1,
        yMax: 1,
        yStep: 0.1,
      })}
      <circle class="pt-handle" cx=${value.value[0]} cy=${value.value[1]} r=".05" fill="red" .value=${{ value }}/>
    </svg>
    pt: ${value.value[0].toFixed(1)}, ${value.value[1].toFixed(1)}
  `,
  "macro": (value) => html`
    <div>macro name: ${value.value}</div>
    <input @input=${e => value.value = e.target.value} .value=${value.value}/>
  `,
  "number": (value) => html`
    <div>number value: ${value.value}</div>
    <input @input=${e => value.value = Number(e.target.value)} .value=${value.value}/>
  `,
}

const drawGrid = ({ xMin, xMax, xStep, yMin, yMax, yStep }) => {
  const xLines = [];
  for (let i = xMin; i <= xMax; i += xStep) {
    xLines.push(svg`<line x1=${i} y1=${yMin} x2=${i} y2=${yMax} />`)
  }

  const yLines = [];
  for (let i = yMin; i <= yMax; i += yStep) {
    yLines.push(svg`<line x1=${xMin} y1=${i} x2=${xMax} y2=${i} />`)
  }


  return svg`
    <!-- Draw vertical grid lines -->
    <g stroke="lightgray" stroke-width="0.005">
      ${xLines}
    </g>

    <!-- Draw horizontal grid lines -->
    <g stroke="lightgray" stroke-width="0.005">
      ${yLines}
    </g>

  `
}

function drawSine({ frequency, amplitude, phase, shift}) {
  const pts = [];

  for (let i = -1; i <= 1; i += 0.001) {
    let x = i;
    let y = Math.sin((x+phase) * frequency * Math.PI * 2)*amplitude + shift;
    pts.push([x, y]);
  }

  return svg`<path d=${pointsToPath(pts)} stroke-width="0.02" stroke="black" fill="none">`
}

function pointsToPath(points) {
    if (points.length === 0) {
        return "";
    }
    
    const [firstPoint, ...restOfPoints] = points;
    const moveTo = `M ${firstPoint[0]},${firstPoint[1]}`;
    const lineTos = restOfPoints.map(pt => `L ${pt[0]},${pt[1]}`).join(" ");
    return `${moveTo} ${lineTos}`;
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
        <button style="width: 150px; height: 30px;">save</button>
        <button style="width: 150px; height: 30px;">upload</button>
        <button style="width: 150px; height: 30px;" @click=${() => { 
          const fn = runProgram(state);

          const { height, layers } = state;
          const shape = [];

          for (let i = 0; i < layers; i += 1) { 
            const t = i/(layers-1);
            const z = t*height;
            const pls = fn(t).map(pl => pl.map(pt => [...pt, z]));
            shape.push(pls);
          }

          console.log(shape);

          state.shape = shape;

          if (state.animId) cancelAnimationFrame(state.animId);

          document.querySelector(".render-target").innerHTML = "";

          renderLines(shape.flat(), document.querySelector(".render-target"));

        }}>run</button>
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
addBezHandle(STATE);
addPtHandle(STATE);

window.STATE = STATE;


function renderLines(lines, domElement, lineThickness = 0.1) {
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

  // Create a material
  const material = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    linewidth: lineThickness,
  });

  lines.forEach(polyline => {
    const geometry = new THREE.BufferGeometry().setFromPoints(polyline.map(pt => new THREE.Vector3(pt[0], pt[2], pt[1])));
    const line = new THREE.Line(geometry, material);
    scene.add(line);
  });

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

 STATE.animId = animate();
}

