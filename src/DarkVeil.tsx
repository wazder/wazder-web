import { useEffect, useRef } from 'react';

interface DarkVeilProps {
  hueShift?: number;
  noiseIntensity?: number;
  scanlineIntensity?: number;
  speed?: number;
  scanlineFrequency?: number;
  warpAmount?: number;
  resolutionScale?: number;
}

const vertexShader = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_hueShift;
  uniform float u_noiseIntensity;
  uniform float u_scanlineIntensity;
  uniform float u_speed;
  uniform float u_scanlineFrequency;
  uniform float u_warpAmount;
  varying vec2 v_uv;
  
  vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }
  
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 6; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  
  void main() {
    vec2 uv = v_uv;
    float time = u_time * u_speed;
    vec2 warpedUv = uv;
    float warpNoise = fbm(uv * 3.0 + time * 0.2);
    warpedUv += (warpNoise - 0.5) * u_warpAmount * 0.3;
    float wave1 = sin(warpedUv.x * 3.0 + time * 0.5 + warpedUv.y * 2.0) * 0.5 + 0.5;
    float wave2 = sin(warpedUv.y * 4.0 - time * 0.3 + warpedUv.x * 1.5) * 0.5 + 0.5;
    float wave3 = fbm(warpedUv * 2.0 + time * 0.1);
    float waves = wave1 * wave2 * wave3;
    float hue = (u_hueShift / 360.0) + waves * 0.15 + time * 0.02;
    float saturation = 0.6 + waves * 0.2;
    float lightness = 0.08 + waves * 0.12;
    vec3 color = hsl2rgb(vec3(hue, saturation, lightness));
    if (u_noiseIntensity > 0.0) {
      float n = hash(uv * u_resolution + time * 100.0);
      color += (n - 0.5) * u_noiseIntensity;
    }
    if (u_scanlineIntensity > 0.0) {
      float scanline = sin(uv.y * u_resolution.y * u_scanlineFrequency) * 0.5 + 0.5;
      color -= scanline * u_scanlineIntensity * 0.1;
    }
    float vignette = 1.0 - length((uv - 0.5) * 1.2);
    vignette = smoothstep(0.0, 1.0, vignette);
    color *= vignette * 0.8 + 0.2;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function link(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader) {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export default function DarkVeil({
  hueShift = 120,
  noiseIntensity = 0,
  scanlineIntensity = 0,
  speed = 1.1,
  scanlineFrequency = 0,
  warpAmount = 0.35,
  resolutionScale = 1,
}: DarkVeilProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) return;
    
    const vs = compile(gl, gl.VERTEX_SHADER, vertexShader);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentShader);
    if (!vs || !fs) return;
    
    const program = link(gl, vs, fs);
    if (!program) return;
    
    gl.useProgram(program);
    
    const uniforms = {
      time: gl.getUniformLocation(program, 'u_time'),
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      hueShift: gl.getUniformLocation(program, 'u_hueShift'),
      noiseIntensity: gl.getUniformLocation(program, 'u_noiseIntensity'),
      scanlineIntensity: gl.getUniformLocation(program, 'u_scanlineIntensity'),
      speed: gl.getUniformLocation(program, 'u_speed'),
      scanlineFrequency: gl.getUniformLocation(program, 'u_scanlineFrequency'),
      warpAmount: gl.getUniformLocation(program, 'u_warpAmount'),
    };
    
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    
    const pos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    
    const resize = () => {
      const dpr = devicePixelRatio * resolutionScale;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    
    resize();
    addEventListener('resize', resize);
    
    const start = performance.now();
    let frame: number;
    
    const render = () => {
      const t = (performance.now() - start) / 1000;
      gl.uniform1f(uniforms.time, t);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.hueShift, hueShift);
      gl.uniform1f(uniforms.noiseIntensity, noiseIntensity);
      gl.uniform1f(uniforms.scanlineIntensity, scanlineIntensity);
      gl.uniform1f(uniforms.speed, speed);
      gl.uniform1f(uniforms.scanlineFrequency, scanlineFrequency);
      gl.uniform1f(uniforms.warpAmount, warpAmount);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      frame = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      removeEventListener('resize', resize);
      cancelAnimationFrame(frame);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [hueShift, noiseIntensity, scanlineIntensity, speed, scanlineFrequency, warpAmount, resolutionScale]);

  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}
