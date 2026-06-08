// Utilitários de conversão de cores
// RGB ↔ LAB, HEX ↔ RGB, etc

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface LAB {
  l: number;
  a: number;
  b: number;
}

export interface XYZ {
  x: number;
  y: number;
  z: number;
}

// HEX para RGB
export function hexToRgb(hex: string): RGB {
  hex = hex.replace('#', '');
  
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
}

// RGB para HEX
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// RGB para XYZ (usando sRGB D65)
export function rgbToXyz(rgb: RGB): XYZ {
  let { r, g, b } = rgb;
  
  // Normalizar RGB para 0-1
  r = r / 255;
  g = g / 255;
  b = b / 255;
  
  // Aplicar correção gamma (sRGB)
  const gammaCorrect = (c: number) => {
    return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
  };
  
  r = gammaCorrect(r);
  g = gammaCorrect(g);
  b = gammaCorrect(b);
  
  // Matriz de transformação sRGB → XYZ (D65)
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
  
  return { x, y, z };
}

// XYZ para RGB (usando sRGB D65)
export function xyzToRgb(xyz: XYZ): RGB {
  let { x, y, z } = xyz;
  
  // Matriz de transformação XYZ → sRGB (D65)
  let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
  let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
  let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;
  
  // Aplicar correção gamma inversa (sRGB)
  const gammaInverse = (c: number) => {
    return c > 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c;
  };
  
  r = gammaInverse(r);
  g = gammaInverse(g);
  b = gammaInverse(b);
  
  // Converter para 0-255 e clamping
  r = Math.max(0, Math.min(255, r * 255));
  g = Math.max(0, Math.min(255, g * 255));
  b = Math.max(0, Math.min(255, b * 255));
  
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

// XYZ para LAB (D65)
export function xyzToLab(xyz: XYZ): LAB {
  let { x, y, z } = xyz;
  
  // Ponto branco de referência D65
  const whiteX = 95.047;
  const whiteY = 100.000;
  const whiteZ = 108.883;
  
  x = x / whiteX;
  y = y / whiteY;
  z = z / whiteZ;
  
  const f = (t: number) => {
    return t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116;
  };
  
  x = f(x);
  y = f(y);
  z = f(z);
  
  const l = 116 * y - 16;
  const a = 500 * (x - y);
  const b = 200 * (y - z);
  
  return { l, a, b };
}

// LAB para XYZ (D65)
export function labToXyz(lab: LAB): XYZ {
  let { l, a, b } = lab;
  
  const y = (l + 16) / 116;
  const x = a / 500 + y;
  const z = y - b / 200;
  
  const fInverse = (t: number) => {
    return Math.pow(t, 3) > 0.008856 ? Math.pow(t, 3) : (t - 16 / 116) / 7.787;
  };
  
  const x3 = fInverse(x);
  const y3 = fInverse(y);
  const z3 = fInverse(z);
  
  // Ponto branco de referência D65
  const whiteX = 95.047;
  const whiteY = 100.000;
  const whiteZ = 108.883;
  
  return {
    x: x3 * whiteX,
    y: y3 * whiteY,
    z: z3 * whiteZ
  };
}

// RGB para LAB (combinando as funções)
export function rgbToLab(rgb: RGB): LAB {
  const xyz = rgbToXyz(rgb);
  return xyzToLab(xyz);
}

// LAB para RGB (combinando as funções)
export function labToRgb(lab: LAB): RGB {
  const xyz = labToXyz(lab);
  return xyzToRgb(xyz);
}

// HEX para LAB
export function hexToLab(hex: string): LAB {
  const rgb = hexToRgb(hex);
  return rgbToLab(rgb);
}

// LAB para HEX
export function labToHex(lab: LAB): string {
  const rgb = labToRgb(lab);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

// Validar HEX
export function isValidHex(hex: string): boolean {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}

// Validar RGB
export function isValidRgb(rgb: RGB): boolean {
  return (
    rgb.r >= 0 && rgb.r <= 255 &&
    rgb.g >= 0 && rgb.g <= 255 &&
    rgb.b >= 0 && rgb.b <= 255
  );
}
