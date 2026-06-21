const canvas = document.getElementById("csg-canvas");
const statusEl = document.getElementById("status");
const buttons = Array.from(document.querySelectorAll("[data-mode]"));
const gapInput = document.getElementById("shape-gap");
const rotationInput = document.getElementById("rotation-angle");
const blendInput = document.getElementById("blend-amount");
const addObjectButton = document.getElementById("add-object");
const objectListEl = document.getElementById("object-list");
const formulaEl = document.getElementById("formula");
const descriptionEl = document.getElementById("mode-description");
const primitiveFunctionsEl = document.getElementById("primitive-functions");
const functionCombineEl = document.getElementById("function-combine");

const modeText = [
  {
    formula: "min(d, dNext)",
    description: "Vereinigung: Die jeweils kleinere Distanz gewinnt.",
    hardFunction: "d = min(d, dNext);",
    smoothFunction: "d = smoothUnion(d, dNext, k);"
  },
  {
    formula: "max(d, dNext)",
    description: "Schnittmenge: Nur der gemeinsame Innenbereich bleibt sichtbar.",
    hardFunction: "d = max(d, dNext);",
    smoothFunction: "d = smoothIntersection(d, dNext, k);"
  },
  {
    formula: "max(d, -dNext)",
    description: "Differenz: Objekt 1 bleibt die Basis, alle weiteren Objekte werden abgezogen.",
    hardFunction: "d = max(d, -dNext);",
    smoothFunction: "d = smoothDifference(d, dNext, k);"
  }
];

const shapeText = [
  {
    name: "Kugel",
    call: "sdSphere(pA, 0.88)",
    code: `float sdSphere(vec3 p, float r) {
  return length(p) - r;
}`
  },
  {
    name: "Box",
    call: "sdBox(pA, vec3(0.66))",
    code: `float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) +
    min(max(q.x, max(q.y, q.z)), 0.0);
}`
  },
  {
    name: "Torus",
    call: "sdTorus(pA, vec2(0.56, 0.22))",
    code: `float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}`
  },
  {
    name: "Zylinder",
    call: "sdCylinder(pA, vec2(0.58, 0.82))",
    code: `float sdCylinder(vec3 p, vec2 h) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - h;
  return min(max(d.x, d.y), 0.0) +
    length(max(d, 0.0));
}`
  }
];

let mode = 0;
let mouseX = 0.35;
let mouseY = 0.18;
let dragging = false;
let lastX = 0;
let lastY = 0;
let shapeInputs = [];
let objectRows = [];
const minimumObjectCount = 2;
let activeObjectCount = 2;

const gl = canvas.getContext("webgl2", { antialias: false });

if (!gl) {
  statusEl.textContent = "WebGL2 wird von diesem Browser nicht unterstuetzt.";
  throw new Error("WebGL2 unavailable");
}

const vertexSource = `#version 300 es
precision highp float;

const vec2 positions[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2( 3.0, -1.0),
  vec2(-1.0,  3.0)
);

void main() {
  gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}`;

const fragmentSource = `#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec2 uResolution;
uniform float uTime;
uniform int uMode;
uniform float uGap;
uniform float uMouseX;
uniform float uMouseY;
uniform float uRotationAngle;
uniform float uBlend;
uniform int uObjectCount;
uniform int uShapes[5];

mat2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

float sdSphere(vec3 p, float radius) {
  return length(p) - radius;
}

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

float sdCylinder(vec3 p, vec2 h) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - h;
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float primitiveSdf(int shape, vec3 p) {
  if (shape == 0) {
    return sdSphere(p, 0.88);
  }

  if (shape == 1) {
    return sdBox(p, vec3(0.66));
  }

  if (shape == 2) {
    return sdTorus(p, vec2(0.56, 0.22));
  }

  return sdCylinder(p, vec2(0.58, 0.82));
}

float smoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

float smoothIntersection(float d1, float d2, float k) {
  float h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) + k * h * (1.0 - h);
}

float smoothDifference(float d1, float d2, float k) {
  return smoothIntersection(d1, -d2, k);
}

float combine(float d1, float d2) {
  float k = max(uBlend, 0.0001);

  if (uMode == 0) {
    return uBlend <= 0.001 ? min(d1, d2) : smoothUnion(d1, d2, k);
  }

  if (uMode == 1) {
    return uBlend <= 0.001 ? max(d1, d2) : smoothIntersection(d1, d2, k);
  }

  return uBlend <= 0.001 ? max(d1, -d2) : smoothDifference(d1, d2, k);
}

vec3 objectPoint(int index, vec3 p) {
  float count = float(uObjectCount);
  float x = (float(index) - (count - 1.0) * 0.5) * uGap;
  vec3 q = p - vec3(x, 0.0, 0.0);

  if (index == 0) {
    q.xy *= rot(-0.28);
    q.yz *= rot(0.22);
  } else if (index == 1) {
    q.xy *= rot(0.62);
    q.yz *= rot(0.35);
  } else if (index == 2) {
    q.xz *= rot(-0.42);
    q.xy *= rot(0.18);
  } else if (index == 3) {
    q.yz *= rot(0.78);
  } else {
    q.xy *= rot(-0.72);
    q.xz *= rot(0.31);
  }

  return q;
}

float objectDistance(int index, vec3 p) {
  if (index == 0) {
    return primitiveSdf(uShapes[0], objectPoint(0, p));
  }

  if (index == 1) {
    return primitiveSdf(uShapes[1], objectPoint(1, p));
  }

  if (index == 2) {
    return primitiveSdf(uShapes[2], objectPoint(2, p));
  }

  if (index == 3) {
    return primitiveSdf(uShapes[3], objectPoint(3, p));
  }

  return primitiveSdf(uShapes[4], objectPoint(4, p));
}

float scene(vec3 p) {
  p.xz *= rot(uMouseX + uRotationAngle);
  p.yz *= rot(uMouseY);

  float d = objectDistance(0, p);

  for (int i = 1; i < 5; i++) {
    if (i < uObjectCount) {
      d = combine(d, objectDistance(i, p));
    }
  }

  return d;
}

vec3 normalAt(vec3 p) {
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    scene(p + e.xyy) - scene(p - e.xyy),
    scene(p + e.yxy) - scene(p - e.yxy),
    scene(p + e.yyx) - scene(p - e.yyx)
  ));
}

float rayMarch(vec3 ro, vec3 rd, out vec3 p, out int steps) {
  float depth = 0.0;

  for (int i = 0; i < 110; i++) {
    p = ro + rd * depth;
    float d = scene(p);
    steps = i;

    if (d < 0.001) {
      return depth;
    }

    depth += d * 0.86;

    if (depth > 24.0) {
      break;
    }
  }

  return -1.0;
}

float softShadow(vec3 ro, vec3 rd) {
  float res = 1.0;
  float t = 0.04;

  for (int i = 0; i < 48; i++) {
    float h = scene(ro + rd * t);
    res = min(res, 12.0 * h / t);
    t += clamp(h, 0.025, 0.22);

    if (res < 0.02 || t > 7.0) {
      break;
    }
  }

  return clamp(res, 0.0, 1.0);
}

vec3 shade(vec3 p, vec3 rd, int steps) {
  vec3 n = normalAt(p);
  vec3 lightDir = normalize(vec3(-0.55, 0.85, 0.7));
  vec3 viewDir = normalize(-rd);
  vec3 halfDir = normalize(lightDir + viewDir);

  float diffuse = max(dot(n, lightDir), 0.0);
  float specular = pow(max(dot(n, halfDir), 0.0), 42.0);
  float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
  float shadow = softShadow(p + n * 0.02, lightDir);
  float stepTint = 1.0 - float(steps) / 120.0;

  vec3 baseA = vec3(0.18, 0.42, 0.88);
  vec3 baseB = vec3(0.95, 0.42, 0.18);
  vec3 base = mix(baseA, baseB, smoothstep(-0.8, 0.8, p.x));
  vec3 color = base * (0.22 + diffuse * shadow * 0.92);
  color += specular * shadow * vec3(0.95);
  color += fresnel * vec3(0.22, 0.34, 0.52);
  color *= 0.82 + stepTint * 0.18;
  return color;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;
  float count = float(uObjectCount);
  float cameraDistance = 3.75 + count * 0.36 + uGap * 0.56;
  float focalLength = 1.68 + count * 0.08;
  vec3 ro = vec3(0.0, 0.0, cameraDistance);
  vec3 rd = normalize(vec3(uv, -focalLength));

  vec3 p;
  int steps = 0;
  float hit = rayMarch(ro, rd, p, steps);

  vec3 top = vec3(0.08, 0.10, 0.15);
  vec3 bottom = vec3(0.80, 0.84, 0.88);
  vec3 color = mix(bottom, top, smoothstep(-0.55, 0.85, uv.y));

  if (hit > 0.0) {
    color = shade(p, rd, steps);
  }

  color = pow(color, vec3(0.4545));
  fragColor = vec4(color, 1.0);
}`;

function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }

  return shader;
}

function createProgram() {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }

  return program;
}

const program = createProgram();
const uniforms = {
  resolution: gl.getUniformLocation(program, "uResolution"),
  time: gl.getUniformLocation(program, "uTime"),
  mode: gl.getUniformLocation(program, "uMode"),
  gap: gl.getUniformLocation(program, "uGap"),
  mouseX: gl.getUniformLocation(program, "uMouseX"),
  mouseY: gl.getUniformLocation(program, "uMouseY"),
  rotationAngle: gl.getUniformLocation(program, "uRotationAngle"),
  blend: gl.getUniformLocation(program, "uBlend"),
  objectCount: gl.getUniformLocation(program, "uObjectCount"),
  shapes: gl.getUniformLocation(program, "uShapes[0]")
};

gl.useProgram(program);
gl.createVertexArray();
gl.bindVertexArray(gl.createVertexArray());
statusEl.classList.add("hidden");

function resize() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
  const height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
}

function render() {
  resize();

  gl.useProgram(program);
  gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
  gl.uniform1f(uniforms.time, 0);
  gl.uniform1i(uniforms.mode, mode);
  gl.uniform1f(uniforms.gap, Number(gapInput.value));
  gl.uniform1f(uniforms.mouseX, mouseX);
  gl.uniform1f(uniforms.mouseY, mouseY);
  gl.uniform1f(uniforms.rotationAngle, Number(rotationInput.value));
  gl.uniform1f(uniforms.blend, Number(blendInput.value));
  gl.uniform1i(uniforms.objectCount, getObjectCount());
  gl.uniform1iv(uniforms.shapes, getShapeValues());
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  requestAnimationFrame(render);
}

function setMode(nextMode) {
  mode = nextMode;
  buttons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.mode) === mode);
  });
  formulaEl.textContent = modeText[mode].formula;
  descriptionEl.textContent = modeText[mode].description;
  updateFunctionOutput();
}

buttons.forEach((button) => {
  button.addEventListener("click", () => setMode(Number(button.dataset.mode)));
});

blendInput.addEventListener("input", updateFunctionOutput);
addObjectButton.addEventListener("click", () => {
  if (activeObjectCount >= 5) {
    return;
  }

  activeObjectCount += 1;
  updateObjectRows();
  updateFunctionOutput();
});

function createObjectRows() {
  objectListEl.innerHTML = "";
  shapeInputs = [];
  objectRows = [];

  const defaults = [0, 1, 2, 3, 0];

  for (let i = 0; i < 5; i++) {
    const row = document.createElement("div");
    row.className = "object-row";

    const label = document.createElement("span");
    label.textContent = `Objekt ${i + 1}`;

    const select = document.createElement("select");
    select.dataset.objectIndex = String(i);

    shapeText.forEach((shape, shapeIndex) => {
      const option = document.createElement("option");
      option.value = String(shapeIndex);
      option.textContent = shape.name;
      option.selected = defaults[i] === shapeIndex;
      select.appendChild(option);
    });

    select.addEventListener("change", updateFunctionOutput);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-object";
    removeButton.textContent = "-";
    removeButton.setAttribute("aria-label", `Objekt ${i + 1} entfernen`);
    removeButton.addEventListener("click", () => removeObject(i));

    row.append(label, select, removeButton);
    objectListEl.appendChild(row);
    shapeInputs.push(select);
    objectRows.push(row);
  }
}

function updateObjectRows() {
  const count = getObjectCount();
  objectRows.forEach((row, index) => {
    row.hidden = index >= count;
    const removeButton = row.querySelector(".remove-object");
    removeButton.hidden = index < minimumObjectCount;
    removeButton.disabled = count <= minimumObjectCount;
  });
  addObjectButton.disabled = count >= 5;
}

function getObjectCount() {
  return activeObjectCount;
}

function getShapeValues() {
  return new Int32Array(shapeInputs.map((select) => Number(select.value)));
}

function removeObject(index) {
  if (
    activeObjectCount <= minimumObjectCount ||
    index < minimumObjectCount ||
    index >= activeObjectCount
  ) {
    return;
  }

  for (let i = index; i < activeObjectCount - 1; i++) {
    shapeInputs[i].value = shapeInputs[i + 1].value;
  }

  activeObjectCount -= 1;
  updateObjectRows();
  updateFunctionOutput();
}

function updateFunctionOutput() {
  const blend = Number(blendInput.value);
  const activeMode = modeText[mode];
  const count = getObjectCount();
  const activeShapes = shapeInputs
    .slice(0, count)
    .map((select) => shapeText[Number(select.value)]);
  const combineLine = blend <= 0.001
    ? activeMode.hardFunction
    : activeMode.smoothFunction;

  primitiveFunctionsEl.innerHTML = "";
  activeShapes.forEach((shape, index) => {
    const card = document.createElement("article");
    card.className = "function-card";

    const title = document.createElement("h3");
    title.textContent = `Objekt ${index + 1}: ${shape.name}`;

    const pre = document.createElement("pre");
    pre.textContent = shape.code;

    card.append(title, pre);
    primitiveFunctionsEl.appendChild(card);
  });

  const pointLines = activeShapes
    .map((_, index) => `  vec3 p${index + 1} = objectPoint(${index}, p);`)
    .join("\n");

  const distanceLines = activeShapes
    .map((shape, index) => {
      const pointName = `p${index + 1}`;
      const call = shape.call.replaceAll("pA", pointName);
      return `  float d${index + 1} = ${call};`;
    })
    .join("\n");

  const combineLines = activeShapes
    .slice(1)
    .map((_, index) => `  dNext = d${index + 2};
  ${combineLine}`)
    .join("\n");

  functionCombineEl.textContent = `float scene(vec3 p) {
  float k = ${blend.toFixed(2)};
  float dNext;
${pointLines}
${distanceLines}
  float d = d1;
${combineLines || "  // Nur ein Objekt: keine CSG-Kombination."}
  return d;
}`;
}

canvas.addEventListener("pointerdown", (event) => {
  dragging = true;
  lastX = event.clientX;
  lastY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!dragging) {
    return;
  }

  mouseX += (event.clientX - lastX) * 0.01;
  mouseY += (event.clientY - lastY) * 0.01;
  lastX = event.clientX;
  lastY = event.clientY;
});

canvas.addEventListener("pointerup", () => {
  dragging = false;
});

canvas.addEventListener("pointercancel", () => {
  dragging = false;
});

createObjectRows();
updateObjectRows();
setMode(0);
requestAnimationFrame(render);
