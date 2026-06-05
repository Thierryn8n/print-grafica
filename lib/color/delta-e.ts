// Cálculo de Delta E (diferença de cor)
// Implementação do CIEDE2000 para comparação perceptual de cores

import { LAB } from './color-conversion';

export interface DeltaEResult {
  deltaE: number;
  matchPercentage: number;
  quality: 'excellent' | 'good' | 'medium' | 'poor';
}

// Cálculo Delta E 1976 (distância Euclidiana simples em LAB)
export function deltaE1976(lab1: LAB, lab2: LAB): number {
  const dl = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  
  return Math.sqrt(dl * dl + da * da + db * db);
}

// Cálculo Delta E 1994 (melhor que 1976 para cores perceptuais)
export function deltaE1994(lab1: LAB, lab2: LAB): number {
  const dl = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  
  const c1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
  const c2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
  
  const cMean = (c1 + c2) / 2;
  
  const g = 0.5 * (1 - Math.sqrt(Math.pow(cMean, 7) / (Math.pow(cMean, 7) + Math.pow(25, 7))));
  
  const a1Prime = lab1.a * (1 + g);
  const a2Prime = lab2.a * (1 + g);
  
  const c1Prime = Math.sqrt(a1Prime * a1Prime + lab1.b * lab1.b);
  const c2Prime = Math.sqrt(a2Prime * a2Prime + lab2.b * lab2.b);
  
  const dcPrime = c1Prime - c2Prime;
  
  const h1Prime = Math.atan2(lab1.b, a1Prime);
  const h2Prime = Math.atan2(lab2.b, a2Prime);
  
  let dhPrime = h2Prime - h1Prime;
  
  if (Math.abs(dhPrime) > Math.PI) {
    if (dhPrime > 0) {
      dhPrime -= 2 * Math.PI;
    } else {
      dhPrime += 2 * Math.PI;
    }
  }
  
  const dHPrime = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(dhPrime / 2);
  
  const sl = 1;
  const sc = 1 + 0.045 * cMean;
  const sh = 1 + 0.015 * cMean;
  
  const deltaE = Math.sqrt(
    Math.pow(dl / sl, 2) +
    Math.pow(dcPrime / sc, 2) +
    Math.pow(dHPrime / sh, 2)
  );
  
  return deltaE;
}

// Cálculo Delta E CIEDE2000 (mais preciso para comparação perceptual)
export function deltaE2000(lab1: LAB, lab2: LAB): number {
  const l1 = lab1.l;
  const a1 = lab1.a;
  const b1 = lab1.b;
  
  const l2 = lab2.l;
  const a2 = lab2.a;
  const b2 = lab2.b;
  
  const c1 = Math.sqrt(a1 * a1 + b1 * b1);
  const c2 = Math.sqrt(a2 * a2 + b2 * b2);
  
  const cMean = (c1 + c2) / 2;
  
  const g = 0.5 * (1 - Math.sqrt(Math.pow(cMean, 7) / (Math.pow(cMean, 7) + Math.pow(25, 7))));
  
  const a1Prime = a1 * (1 + g);
  const a2Prime = a2 * (1 + g);
  
  const c1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
  const c2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);
  
  const h1Prime = Math.atan2(b1, a1Prime);
  const h2Prime = Math.atan2(b2, a2Prime);
  
  let h1PrimeDeg = h1Prime * (180 / Math.PI);
  let h2PrimeDeg = h2Prime * (180 / Math.PI);
  
  if (h1PrimeDeg < 0) h1PrimeDeg += 360;
  if (h2PrimeDeg < 0) h2PrimeDeg += 360;
  
  let dhPrime;
  
  if (Math.abs(h1PrimeDeg - h2PrimeDeg) <= 180) {
    dhPrime = h2PrimeDeg - h1PrimeDeg;
  } else if (h2PrimeDeg - h1PrimeDeg > 180) {
    dhPrime = h2PrimeDeg - h1PrimeDeg - 360;
  } else {
    dhPrime = h2PrimeDeg - h1PrimeDeg + 360;
  }
  
  const dLPrime = l2 - l1;
  const dCPrime = c2Prime - c1Prime;
  const dHPrime = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(dhPrime * (Math.PI / 360) / 2);
  
  const lMean = (l1 + l2) / 2;
  const cMeanPrime = (c1Prime + c2Prime) / 2;
  
  let hMeanPrime;
  
  if (c1Prime === 0 && c2Prime === 0) {
    hMeanPrime = 0;
  } else if (Math.abs(h1PrimeDeg - h2PrimeDeg) <= 180) {
    hMeanPrime = (h1PrimeDeg + h2PrimeDeg) / 2;
  } else if (h1PrimeDeg + h2PrimeDeg < 360) {
    hMeanPrime = (h1PrimeDeg + h2PrimeDeg + 360) / 2;
  } else {
    hMeanPrime = (h1PrimeDeg + h2PrimeDeg - 360) / 2;
  }
  
  const t = 1 -
    0.17 * Math.cos((hMeanPrime - 30) * (Math.PI / 180)) +
    0.24 * Math.cos(2 * hMeanPrime * (Math.PI / 180)) +
    0.32 * Math.cos((3 * hMeanPrime + 6) * (Math.PI / 180)) -
    0.20 * Math.cos((4 * hMeanPrime - 63) * (Math.PI / 180));
  
  const sl = 1 + (0.015 * Math.pow(lMean - 50, 2)) / Math.sqrt(20 + Math.pow(lMean - 50, 2));
  const sc = 1 + 0.045 * cMeanPrime;
  const sh = 1 + 0.015 * cMeanPrime * t;
  
  const rt = -2 * Math.sqrt(Math.pow(cMeanPrime, 7) / (Math.pow(cMeanPrime, 7) + Math.pow(25, 7))) *
    Math.sin(60 * Math.exp(-Math.pow((hMeanPrime - 275) / 25, 2)) * (Math.PI / 180));
  
  const deltaE = Math.sqrt(
    Math.pow(dLPrime / sl, 2) +
    Math.pow(dCPrime / sc, 2) +
    Math.pow(dHPrime / sh, 2) +
    rt * (dCPrime / sc) * (dHPrime / sh)
  );
  
  return deltaE;
}

// Calcular porcentagem de aproximação baseada no Delta E
export function calculateMatchPercentage(deltaE: number): number {
  // Fórmula simples: quanto menor o Delta E, maior a porcentagem
  // Delta E 0 = 100%, Delta E 20 = 0%
  const maxDeltaE = 20;
  const percentage = Math.max(0, 100 - (deltaE / maxDeltaE) * 100);
  return Math.round(percentage * 100) / 100;
}

// Classificar qualidade baseada no Delta E
export function classifyQuality(deltaE: number): 'excellent' | 'good' | 'medium' | 'poor' {
  if (deltaE <= 2) {
    return 'excellent';
  } else if (deltaE <= 5) {
    return 'good';
  } else if (deltaE <= 10) {
    return 'medium';
  } else {
    return 'poor';
  }
}

// Função completa que retorna Delta E, porcentagem e qualidade
export function calculateDeltaE(lab1: LAB, lab2: LAB, method: '1976' | '1994' | '2000' = '2000'): DeltaEResult {
  let deltaE: number;
  
  switch (method) {
    case '1976':
      deltaE = deltaE1976(lab1, lab2);
      break;
    case '1994':
      deltaE = deltaE1994(lab1, lab2);
      break;
    case '2000':
    default:
      deltaE = deltaE2000(lab1, lab2);
      break;
  }
  
  const matchPercentage = calculateMatchPercentage(deltaE);
  const quality = classifyQuality(deltaE);
  
  return {
    deltaE: Math.round(deltaE * 100) / 100,
    matchPercentage,
    quality
  };
}

// Encontrar a cor mais próxima em uma lista de cores
export function findClosestColor(
  targetLab: LAB,
  colorList: LAB[],
  method: '1976' | '1994' | '2000' = '2000'
): { index: number; deltaE: number; matchPercentage: number; quality: 'excellent' | 'good' | 'medium' | 'poor' } {
  let minDeltaE = Infinity;
  let closestIndex = 0;
  
  colorList.forEach((color, index) => {
    const result = calculateDeltaE(targetLab, color, method);
    if (result.deltaE < minDeltaE) {
      minDeltaE = result.deltaE;
      closestIndex = index;
    }
  });
  
  const result = calculateDeltaE(targetLab, colorList[closestIndex], method);
  
  return {
    index: closestIndex,
    deltaE: result.deltaE,
    matchPercentage: result.matchPercentage,
    quality: result.quality
  };
}
