import { download } from "./download.js";

export function downloadGCode() {
   const layers = evalProgram();

   console.log(layers);


   const lines = [];

   layers.forEach(pls => {
      pls.forEach((pl) => {
         pl.forEach((pt, i) => {
            let [ x, y, z ] = pt.map(x => x*10);
            z += 0.8;
            if (i === 0) {
               lines.push(`G1 X${x} Y${y} Z${z} F1998 E0`);
            } 
         
            lines.push(`G1 X${x} Y${y} Z${z} F1998 E${.4*i}`);
         })
      })
   })

   const gcode = `
    G90
    M82
    M106 S0
    M104 S0 T0
    G28 ; home all axes
    M92 E400
    G1 Z2.800 F3600
    ; process Process1
    ; layer 1, Z = 0.800
    T0
    ${lines.join("\n")}
    G92 E0
    G1 E0.0000 F4800
    ; layer end
    M104 S0 ; turn off extruder
    M140 S0 ; turn off bed
    G28 ; home all axes
    M84 ; disable motors
   `

   console.log(gcode);
   download("pot-gcode", "gcode", gcode);
}