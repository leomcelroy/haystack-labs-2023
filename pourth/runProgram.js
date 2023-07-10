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
    let a = f(t)
    let b = g(t)
    return boolean(a,b,'union');
  },
  'difference':(f,g)=>(t)=>{
    let a = f(t)
    let b = g(t)
    return boolean(a,b,'difference');
  },
  'intersection':(f,g)=>(t)=>{
    let a = f(t)
    let b = g(t)
    return boolean(a,b,'intersection');
  },
  'translateX':(f,g)=>(t)=>{
    let a = f(t);
    let b = g(t);
    
    for (let i = 0; i < a.length; i++){
      for (let j = 0; j < a[i].length; j++){
        a[i][j][0] += b;
      }
    }
    return a;
  },
  'translateY':(f,g)=>(t)=>{
    let a = f(t);
    let b = g(t);
    for (let i = 0; i < a.length; i++){
      for (let j = 0; j < a[i].length; j++){
        a[i][j][1] += b;
      }
    }
    return a;
  },
  'scaleX':(f,g)=>(t)=>{
    let a = f(t);
    let b = g(t);
    for (let i = 0; i < a.length; i++){
      for (let j = 0; j < a[i].length; j++){
        a[i][j][0] *= b;
      }
    }
    return a;
  },
  'scaleY':(f,g)=>(t)=>{
    let a = f(t);
    let b = g(t);
    for (let i = 0; i < a.length; i++){
      for (let j = 0; j < a[i].length; j++){
        a[i][j][1] *= b;
      }
    }
    return a;
  },
  'rotation':(f,g)=>(t)=>{
    let a = f(t);
    let b = g(t);
    let costh = Math.cos(b);
    let sinth = Math.sin(b);
    for (let i = 0; i < a.length; i++){
      for (let j = 0; j < a[i].length; j++){
        let [x0,y0] = a[i][j];
        let x = x0* costh-y0*sinth;
        let y = x0* sinth+y0*costh;
        a[i][j][0] = x;
        a[i][j][1] = y;
      }
    }
    return a;
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
          m += h(j/n);
        }else{
          m *= h(j/n);
        }
        ex *= m;
        ey *= m;
        
        a[i][j][0] = x1+ex;
        a[i][j][1] = y1+ey;
      }
    }
    return a;
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
        stack.push(t=>[JSON.parse(JSON.stringify(o))]);
      }else if (type == 'number'){
        let n = Number(prgm[i].value);
        stack.push(t=>n);
      }else if (type == 'sine'){
        stack.push(function(t){
          let {frequency,phase,amplitude,shift} = prgm[i];
          // console.log({frequency,phase,amplitude,shift},t)
          // console.log(Math.sin((t+phase) / frequency * Math.PI * 2)*amplitude + shift)
          return Math.sin((t+phase) / frequency * Math.PI * 2)*amplitude + shift;
        });
      }else if (type == 'bezier'){
        stack.push(function(t){
          let {start,end,handle0,handle1} = prgm[i];
          return bezierEasing(start,handle0,handle1,end)(t);
        });
      }
    }else if (opera == 'tor'){
      if (type == 'warp'){
        let a = stack.pop();
        let b = stack.pop();
        let c = stack.pop();
        stack.push(funcMap[type](c,b,a))
      }else{
        let a = stack.pop();
        let b = stack.pop();
        stack.push(funcMap[type](b,a))
      }
    }
  }
  let fun = stack.pop();

  let svg = visSvg(fun);
  let div = document.createElement('div');
  div.style="background:white;width:512px;height:512px;position:absolute;left:0px;top:0px;z-index:1000"
  div.innerHTML = svg;
  document.body.appendChild(div)

  return fun;
}


function visSvg(fun){
  let o = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">`;
  
  for (let i = 0; i < 50; i++){
    let ps = fun(i);
    console.log(JSON.stringify(ps));
    for (let j = 0; j < ps.length; j++){
      o += `<path d="M`;
      for (let k = 0; k < ps[j].length; k++){
        let [x,y] = ps[j][k];
        o += `${x*100+256},${y*100+i*10} `
      }
      o += `z" stroke="black" fill="none"/>`
    }
  }
  return o;
}