// Extração de paleta de cores de imagens
// Implementação usando K-means clustering

import { RGB, rgbToLab, rgbToHex } from './color-conversion';

export interface DetectedColor {
  rgb: RGB;
  hex: string;
  lab: { l: number; a: number; b: number };
  percentage: number;
}

// Converter ImageData para array de cores RGB
export function imageDataToRgbArray(imageData: ImageData): RGB[] {
  const pixels: RGB[] = [];
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    // Ignorar pixels muito transparentes
    if (a > 128) {
      pixels.push({ r, g, b });
    }
  }
  
  return pixels;
}

// K-means clustering para extrair cores dominantes
export function kMeansClustering(pixels: RGB[], k: number, maxIterations: number = 20): RGB[] {
  if (pixels.length === 0) return [];
  if (k <= 0) return [];
  if (k >= pixels.length) return pixels;
  
  // Inicializar centroides aleatoriamente
  const centroids: RGB[] = [];
  const usedIndices = new Set<number>();
  
  while (centroids.length < k) {
    const index = Math.floor(Math.random() * pixels.length);
    if (!usedIndices.has(index)) {
      centroids.push({ ...pixels[index] });
      usedIndices.add(index);
    }
  }
  
  // Iterar até convergir ou maxIterations
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Atribuir cada pixel ao centroide mais próximo
    const clusters: RGB[][] = Array.from({ length: k }, () => []);
    
    for (const pixel of pixels) {
      let minDistance = Infinity;
      let closestCentroidIndex = 0;
      
      for (let i = 0; i < centroids.length; i++) {
        const distance = colorDistance(pixel, centroids[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestCentroidIndex = i;
        }
      }
      
      clusters[closestCentroidIndex].push(pixel);
    }
    
    // Recalcular centroides
    let converged = true;
    
    for (let i = 0; i < k; i++) {
      const cluster = clusters[i];
      
      if (cluster.length === 0) {
        // Se cluster vazio, reinicializar centroide aleatoriamente
        const index = Math.floor(Math.random() * pixels.length);
        centroids[i] = { ...pixels[index] };
        converged = false;
        continue;
      }
      
      const sumR = cluster.reduce((sum, p) => sum + p.r, 0);
      const sumG = cluster.reduce((sum, p) => sum + p.g, 0);
      const sumB = cluster.reduce((sum, p) => sum + p.b, 0);
      
      const newCentroid: RGB = {
        r: Math.round(sumR / cluster.length),
        g: Math.round(sumG / cluster.length),
        b: Math.round(sumB / cluster.length)
      };
      
      if (colorDistance(centroids[i], newCentroid) > 1) {
        converged = false;
      }
      
      centroids[i] = newCentroid;
    }
    
    if (converged) {
      break;
    }
  }
  
  return centroids;
}

// Distância Euclidiana entre duas cores RGB
function colorDistance(c1: RGB, c2: RGB): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Median Cut algorithm (alternativa ao K-means)
export function medianCut(pixels: RGB[], maxColors: number): RGB[] {
  if (pixels.length === 0) return [];
  if (maxColors <= 0) return [];
  if (maxColors >= pixels.length) return pixels;
  
  const colorBuckets: RGB[][] = [pixels];
  
  while (colorBuckets.length < maxColors) {
    // Encontrar o bucket com mais pixels
    let maxBucketIndex = 0;
    let maxBucketSize = 0;
    
    for (let i = 0; i < colorBuckets.length; i++) {
      if (colorBuckets[i].length > maxBucketSize) {
        maxBucketSize = colorBuckets[i].length;
        maxBucketIndex = i;
      }
    }
    
    if (maxBucketSize < 2) break;
    
    // Dividir o bucket
    const bucket = colorBuckets[maxBucketIndex];
    const { bucket1, bucket2 } = splitBucket(bucket);
    
    // Remover o bucket original e adicionar os novos
    colorBuckets.splice(maxBucketIndex, 1);
    colorBuckets.push(bucket1, bucket2);
  }
  
  // Calcular a média de cada bucket
  return colorBuckets.map(bucket => {
    if (bucket.length === 0) return { r: 0, g: 0, b: 0 };
    
    const sumR = bucket.reduce((sum, p) => sum + p.r, 0);
    const sumG = bucket.reduce((sum, p) => sum + p.g, 0);
    const sumB = bucket.reduce((sum, p) => sum + p.b, 0);
    
    return {
      r: Math.round(sumR / bucket.length),
      g: Math.round(sumG / bucket.length),
      b: Math.round(sumB / bucket.length)
    };
  });
}

// Dividir bucket em dois baseado no canal com maior range
function splitBucket(pixels: RGB[]): { bucket1: RGB[]; bucket2: RGB[] } {
  if (pixels.length === 0) {
    return { bucket1: [], bucket2: [] };
  }
  
  // Encontrar o canal com maior range
  const rRange = Math.max(...pixels.map(p => p.r)) - Math.min(...pixels.map(p => p.r));
  const gRange = Math.max(...pixels.map(p => p.g)) - Math.min(...pixels.map(p => p.g));
  const bRange = Math.max(...pixels.map(p => p.b)) - Math.min(...pixels.map(p => p.b));
  
  let channel: 'r' | 'g' | 'b';
  if (rRange >= gRange && rRange >= bRange) {
    channel = 'r';
  } else if (gRange >= rRange && gRange >= bRange) {
    channel = 'g';
  } else {
    channel = 'b';
  }
  
  // Ordenar pixels pelo canal escolhido
  const sorted = [...pixels].sort((a, b) => a[channel] - b[channel]);
  
  // Dividir no meio
  const mid = Math.floor(sorted.length / 2);
  
  return {
    bucket1: sorted.slice(0, mid),
    bucket2: sorted.slice(mid)
  };
}

// Extrair paleta de cores de uma imagem
export async function extractColorPalette(
  image: HTMLImageElement | HTMLCanvasElement,
  colorCount: number = 8,
  method: 'kmeans' | 'median' = 'kmeans'
): Promise<DetectedColor[]> {
  // Criar canvas para processar a imagem
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Não foi possível obter contexto do canvas');
  }
  
  // Reduzir tamanho para processamento mais rápido
  const maxSize = 200;
  let width = image.width || image.clientWidth;
  let height = image.height || image.clientHeight;
  
  if (width > maxSize || height > maxSize) {
    const ratio = Math.min(maxSize / width, maxSize / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  
  canvas.width = width;
  canvas.height = height;
  
  // Desenhar imagem no canvas
  if (image instanceof HTMLImageElement) {
    ctx.drawImage(image, 0, 0, width, height);
  } else {
    ctx.drawImage(image, 0, 0, width, height);
  }
  
  // Obter dados dos pixels
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageDataToRgbArray(imageData);
  
  if (pixels.length === 0) {
    return [];
  }
  
  // Extrair cores usando o método escolhido
  let dominantColors: RGB[];
  
  if (method === 'kmeans') {
    dominantColors = kMeansClustering(pixels, colorCount);
  } else {
    dominantColors = medianCut(pixels, colorCount);
  }
  
  // Calcular porcentagem de cada cor
  const colorCounts = new Map<string, number>();
  
  for (const pixel of pixels) {
    // Encontrar a cor dominante mais próxima
    let minDistance = Infinity;
    let closestColor: RGB = dominantColors[0];
    
    for (const color of dominantColors) {
      const distance = colorDistance(pixel, color);
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = color;
      }
    }
    
    const hex = rgbToHex(closestColor.r, closestColor.g, closestColor.b);
    colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
  }
  
  // Criar resultado com porcentagens
  const result: DetectedColor[] = dominantColors.map(color => {
    const hex = rgbToHex(color.r, color.g, color.b);
    const count = colorCounts.get(hex) || 0;
    const percentage = (count / pixels.length) * 100;
    const lab = rgbToLab(color);
    
    return {
      rgb: color,
      hex,
      lab,
      percentage: Math.round(percentage * 100) / 100
    };
  });
  
  // Ordenar por porcentagem (decrescente)
  result.sort((a, b) => b.percentage - a.percentage);
  
  return result;
}

// Extrair paleta de uma URL de imagem
export async function extractColorPaletteFromUrl(
  imageUrl: string,
  colorCount: number = 8,
  method: 'kmeans' | 'median' = 'kmeans'
): Promise<DetectedColor[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = async () => {
      try {
        const palette = await extractColorPalette(img, colorCount, method);
        resolve(palette);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Erro ao carregar imagem'));
    };
    
    img.src = imageUrl;
  });
}

// Extrair paleta de um File
export async function extractColorPaletteFromFile(
  file: File,
  colorCount: number = 8,
  method: 'kmeans' | 'median' = 'kmeans'
): Promise<DetectedColor[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const imageUrl = e.target?.result as string;
        const palette = await extractColorPaletteFromUrl(imageUrl, colorCount, method);
        resolve(palette);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };
    
    reader.readAsDataURL(file);
  });
}
