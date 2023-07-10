import {boolean} from "./boolean.js"
import {bezierEasing} from "./bezierEasing.js"
function expandMacros(programs, name){
  let out = [];
  for (let i = 0; i < programs[name].length; i++){
    let {type, value} = programs[name][i];
    if (type == "macro"){
      let o = expandMacros(programs,value);
      o.forEach(x=>out.push(x));
    }else{
      out.push(programs[name][i])
    }
  }
  return out;
}

let funcMap = {
  'union':(f,g)=>(t)=>{
    let a = f(t);
    let b = g(t);
    return boolean('union',a,b);
  },
  'difference':(f,g)=>(t)=>{
    let a = f(t);
    let b = g(t);
    return boolean('difference',a,b);
  },
  'intersection':(f,g)=>(t)=>{
    let a = f(t);
    let b = g(t);
    return boolean('intersection',a,b);
  },
  'translateX':(f,g)=>(t)=>{
    let a = f(t);
    let b = g(t);
    for (let i = 0; i < a.length; a++){
      for (let j = 0; j < a[i].length; j++){
        a[i][j][1] += b;
      }
    }
  },
  'translateY':(f,g)=>(t)=>{
    let a = f(t);
    let b = g(t);
    for (let i = 0; i < a.length; a++){
      for (let j = 0; j < a[i].length; j++){
        a[i][j][0] += b;
      }
    }
  },
  'scaleX':(f,g)=>(t)=>{
    let a = f(t);
    let b = g(t);
    for (let i = 0; i < a.length; a++){
      for (let j = 0; j < a[i].length; j++){
        a[i][j][0] *= b;
      }
    }
  },
  'scaleY':(f,g)=>(t)=>{
    let a = f(t);
    let b = g(t);
    for (let i = 0; i < a.length; a++){
      for (let j = 0; j < a[i].length; j++){
        a[i][j][1] *= b;
      }
    }
  },
  'rotation':(f,g)=>(t)=>{
    let a = f(t);
    let b = g(t);
    let costh = Math.cos(b);
    let sinth = Math.sin(b);
    for (let i = 0; i < a.length; a++){
      for (let j = 0; j < a[i].length; j++){
        let [x0,y0] = a[i][j];
        let x = x0* costh-y0*sinth;
        let y = x0* sinth+y0*costh;
        a[i][j][0] = x;
        a[i][j][1] = y;
      }
    }
  },
  'multiply':(f,g)=>(t)=>{
    return f(t)*g(t);
  },
  'plus':(f,g)=>(t)=>{
    return f(t)+g(t);
  },
  'warp':(f,g,h,q)=>(t)=>{
    let a = f(t);
    let b = g(t);
    for (let i = 0; i < a.length; i++){
      let n = a[i].length;
      for (let j = 0; j < n; j++){
        let [x0,y0] = a[i][(j-1+n)%n];
        let [x1,y1] = a[i][j];
        let [x2,y2] = a[i][(j+1)%n];
        let dx = x2-x0;
        let dy = y2-y0;
        let ex = -dy;
        let ey = dx;
        let l = Math.hypot(ex,ey);
        ex/=l;
        ey/=l;
        let m = b;
        if (q == '+'){
          m += h(i/a.length);
        }else if (q == '*'){
          m *= h(i/a.length);
        }
        ex *= m;
        ey *= m;
        a[i][j][0] = x1+ex;
        a[i][j][1] = y1+ey;
      }
    }
  }
}


export function runProgram({ programs }) {
  console.log(programs)

  let prgm = expandMacros(programs,"main");
  console.log(prgm);

  let stack = [];

  for (let i = 0; i < prgm.length; i++){
    let {opera,type} = prgm[i];
    console.log(prgm[i])
    if (opera == 'nd'){
      if (type == 'shape'){
        let o = [];
        for (let j = 0; j < prgm[i].sides; j++){
          let a = j/prgm[i].sides * Math.PI*2;
          let x = Math.cos(a);
          let y = Math.sin(a);
          o.push([x,y]);
        }
        stack.push([[o]]);
      }else if (type == 'sine'){
        stack.push(function(t){
          let {frequency,phase,amplitude,shift} = prgm[i];
          return Math.sin((t+phase) / frequency * Math.PI * 2)*amplitude + shift;
        });
      }else if (type == 'bezier'){
        stack.push(function(t){
          let {start,end,handle0,handle1} = prgm[i];
          return bezierEasing(start,handle0,handle1,end);
        });
      }
    }else if (opera == 'tor'){
      let a = stack.pop();
      let b = stack.pop();
      stack.push(funcMap[type](a,b))
    }
  }
  console.log(stack);
  return stack.pop();
}
