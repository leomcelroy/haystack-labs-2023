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
import { bezierEasing } from "./bezierEasing.js";

import { elsAtLoc } from "./elsAtLoc.js"


function svg2url(s){
  let ss = `
  <svg width="40" height="40" viewBox="-10 -10 120 120" xmlns="http://www.w3.org/2000/svg">
    <path d="M-20 -20 120 -20 120 120 -20 120" fill="white"/>
    ${s};
  </svg>
  `
  return "data:image/svg+xml,"+encodeURIComponent(ss);
}

function makeIcon(box){
  if (box.opera == 'tor'){
    return 'icons/'+box.type+".png";
  }else{
    if (box.type == 'sine'){
      let {frequency,phase,amplitude,shift} = box;
      let s = `<path d="M `;
      for (let i = 0; i < 100; i++){
        let t = i/100;
        let y = Math.sin((t+phase) * frequency * Math.PI * 2)*amplitude + shift;
        s += i+" ";
        s += (50-y*50)+" "
      }
      s += `" fill="none" stroke="black" stroke-width="3"/>`
      return svg2url(s);
    }else if (box.type == 'bezier'){
      let {start,end,handle0,handle1} = box;
      let s = `<path d="M `;
      for (let i = 0; i < 100; i++){
        let t = i/100;
        let y = bezierEasing(start,handle0,handle1,end)(t);
        s += i+" ";
        s += (50-y*50)+" "
      };
      s += `" fill="none" stroke="black" stroke-width="3"/>`
      return svg2url(s);
    }else if (box.type == 'shape'){
      let {sides} = box;
      let s = `<path d="M `;
      for (let j = 0; j <= sides; j++){
        let a = j/sides * Math.PI*2;
        let x = Math.cos(a);
        let y = Math.sin(a);
        s += (50+x*45)+" ";
        s += (50+y*45)+" ";
      }
      s += `" fill="none" stroke="black" stroke-width="3"/>`
      return svg2url(s);
    }else if (box.type == 'number'){
      let {value} = box;
      let s = `<path d="M ${0} ${50-value*50} 100 ${50-value*50}" fill="none" stroke="black" stroke-width="3"/>`
      s += `<text x="50" y="50" font-family="monospace" font-size="40" text-anchor="middle" alignment-baseline="central">${~~(value*100)/100}</text>`
      return svg2url(s);
    }else if (box.type == 'macro'){
      let {value} = box;
      let s = ``;
      s += `<path d="M0 40 100 40 100 90 0 90 z" fill="none" stroke="black" stroke-width="3"/>`;
      s += `<text x="50" y="18" font-family="monospace" font-size="45" text-anchor="middle" alignment-baseline="central">#</text>`
      s += `<text x="50" y="65" font-family="monospace" font-size="30" text-anchor="middle" alignment-baseline="central">${value}</text>`
      
      return svg2url(s);
    }else{
      return 'icons/warp.png';
    }
  }
}

const STATE = {
  boxes: [ 
    { 
      type: "shape",
      sides: 32,
      opera: "nd"
    },
    { 
      type: "sine",
      frequency: Math.PI,
      amplitude: 1,
      phase: 0,
      shift: 0,
      opera: "nd"
    },
    { 
      type: "bezier",
      start: 0,
      handle0: [.5, 0],
      handle1: [.5, 1],
      end: 1,
      opera: "nd"
    },
    { 
      type: "scale",
      direction: "xy", // "x" "y"
      opera: "tor",
    },
    { 
      type: "number",
      value: 1,
      opera: "nd",
    },
    { 
      type: "macro",
      value: "",
      sides: 32,
    },
    { 
      type: "difference",
      opera: "tor"
      
    },
    { 
      type: "union",
      opera: "tor"
    },
    { 
      type: "intersection",
      opera: "tor",
    },
    { 
      type: "warp",
      opera: "tor"
    },
    // { 
    //   type: "point",
    //   value: [0, 0],
    //   // icon: "Pt",
    //   text: "Pt",
    //   opera: "nd"
    // },
    { 
      type: "translateX",
      opera: "tor"
       
    }, 
    { 
      type: "translateY",
      opera: "tor"
    }, 
    { 
      type: "scaleX",
      opera: "tor",
    },
    { 
      type: "scaleY",
      opera: "tor"
    },
    { 
      type: "rotate",
      opera: "tor"
    },
    // { 
    //   type: "code",
    //   icon: "C",
    //   opera: "tor"
    // },
    { 
      type: "multiply",
      opera: "tor"
    },
    { 
      type: "plus",
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


const EDITORS = {
  "shape": (value) => html`
    <div>Number of Sides: ${value.sides.toFixed(0)}</div>
    <input 
      type="range" 
      min="3" 
      max="100" 
      step="1"
      .value=${value.sides} 
      @input=${e => {
        value.sides = Number(e.target.value);
        evalProgram();
      }}>
  `,
  "sine": (value) => html`
    <div>Frequency: ${value.frequency.toFixed(3)}</div>
    <input 
      type="range" 
      min="0" 
      max="10"
      step="0.00001" 
      .value=${value.frequency} 
      @input=${e => {
        value.frequency = Number(e.target.value);
        evalProgram();
      }}>

    <div>Amplitude: ${value.amplitude.toFixed(3)}</div>
    <input 
      type="range" 
      min="0" 
      max="2"
      step="0.001"  
      .value=${value.amplitude} 
      @input=${e => {
        value.amplitude = Number(e.target.value);
        evalProgram();
      }}>

    <div>Phase: ${value.phase.toFixed(3)}</div>
    <input 
      type="range" 
      min="-2" 
      max="2"
      step="0.0001"  
      .value=${value.phase} 
      @input=${e => {
        value.phase = Number(e.target.value);
        evalProgram();
      }}>

    <div>Shift: ${value.shift.toFixed(3)}</div>
    <input 
      type="range" 
      min="-2" 
      max="2"
      step="0.0001"  
      .value=${value.shift} 
      @input=${e => { 
        value.shift = Number(e.target.value); 
        evalProgram();
      }}>

    <style>
      .sin-viz {
        background: white;
        transform: scale(1, -1);
        border: 1px solid black;
        border-radius: 3px;
      }
    </style>
    <svg class="sin-viz" width="250" height="250" viewBox="-5 -5 10 10" xmlns="http://www.w3.org/2000/svg">
      ${drawGrid({
        xMin: -5,
        xMax: 5,
        xStep: 1,
        yMin: -5,
        yMax: 5,
        yStep: 1,
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

  for (let i = -5; i <= 5; i += 0.001) {
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
        <button style="width: 150px; height: 30px;" @click=${() => {
          const json = JSON.stringify(state.programs);
          download("pot.json", json);
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
      background-image: url("${makeIcon(box)}"); 
      background-size: cover; 
      background-position: center;
      border: 1px solid black;
      border-radius: 3px; 
      display: "flex";
      align-items: "center";
      font-size: "xx-large";
      justify-content: "center";
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
        background-image: url("${makeIcon(box)}"); 
        background-size: cover; 
        background-position: center;
        border: 1px solid black;
        border-radius: 3px; 
        display: "flex";
        align-items: "center";
        font-size: "xx-large";
        justify-content: "center";
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
      background-image: url("${makeIcon(box.data)}"); 
      background-size: cover; 
      background-position: center;
      border: 1px solid black;
      border-radius: 3px;
      left:${mouse.x-box.shiftX}px; 
      top:${mouse.y-box.shiftY}px;
      display: "flex";
      align-items: "center";
      font-size: "xx-large";
      justify-content: "center";
      `}>
      
      ${!box.data.icon ? box.data.text : ""}
      
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

