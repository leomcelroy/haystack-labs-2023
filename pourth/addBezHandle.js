import { createListener } from "./createListener.js"


export function addBezHandle(state) {
  const listener = createListener(document.body);

  // create a reference to the currently dragged element
  let draggedElement = null;
  let svg = null;

  listener("mousedown", ".bez-handle", e => {
    draggedElement = e.target;
    draggedElement.setAttribute('pointer-events', 'none');
    svg = draggedElement.ownerSVGElement;
  })

  listener("mousemove", "", e => {
    if (draggedElement && svg) {
      let pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;

      // Transform the point from screen coordinates to SVG coordinates
      let svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

      let x = svgP.x;
      let y = svgP.y;

      console.log(svgP);
    }
  })

  listener("mouseup", "", e => {
    if (draggedElement) {
      draggedElement.setAttribute('pointer-events', 'all');
      draggedElement = null;
      svg = null;
    }
  })
}