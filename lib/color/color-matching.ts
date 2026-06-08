// Serviço de matching de cores
// Compara cor detectada com banco de amostras sublimadas

import { LAB, rgbToLab } from './color-conversion';
import { calculateDeltaE, DeltaEResult } from './delta-e';
import { DetectedColor } from './color-extraction';

export interface SublimatedSample {
  id: string;
  originalColorId: string;
  fabricTypeId: string;
  measuredLab: LAB;
  corelCode?: string;
  pantoneCode?: string;
  originalRgb: { r: number; g: number; b: number };
  originalHex: string;
}

export interface ColorMatch {
  detectedColor: DetectedColor;
  fabricType: string;
  recommendedOriginalColorId: string;
  recommendedSublimatedSampleId: string;
  corelCode?: string;
  pantoneCode?: string;
  originalRgb: { r: number; g: number; b: number };
  originalHex: string;
  sublimatedLab: LAB;
  deltaE: number;
  matchPercentage: number;
  quality: 'excellent' | 'good' | 'medium' | 'poor';
}

export interface ColorMatchResult {
  detectedColor: DetectedColor;
  dryFitMatch?: ColorMatch | null;
  helancaMatch?: ColorMatch | null;
}

// Encontrar melhor correspondência para uma cor detectada
export function findBestMatch(
  detectedColor: DetectedColor,
  samples: SublimatedSample[],
  fabricType: 'dry-fit' | 'helanca'
): ColorMatch | null {
  if (samples.length === 0) {
    return null;
  }
  
  // Filtrar amostras pelo tipo de tecido
  const fabricSamples = samples.filter(s => 
    fabricType === 'dry-fit' 
      ? s.fabricTypeId === 'dry-fit'
      : s.fabricTypeId === 'helanca'
  );
  
  if (fabricSamples.length === 0) {
    return null;
  }
  
  // Encontrar a amostra com menor Delta E
  let bestMatch: SublimatedSample | null = null;
  let minDeltaE = Infinity;
  
  for (const sample of fabricSamples) {
    const deltaE = calculateDeltaE(detectedColor.lab, sample.measuredLab, '2000');
    if (deltaE.deltaE < minDeltaE) {
      minDeltaE = deltaE.deltaE;
      bestMatch = sample;
    }
  }
  
  if (!bestMatch) {
    return null;
  }
  
  const deltaEResult = calculateDeltaE(detectedColor.lab, bestMatch.measuredLab, '2000');
  
  return {
    detectedColor,
    fabricType,
    recommendedOriginalColorId: bestMatch.originalColorId,
    recommendedSublimatedSampleId: bestMatch.id,
    corelCode: bestMatch.corelCode,
    pantoneCode: bestMatch.pantoneCode,
    originalRgb: bestMatch.originalRgb,
    originalHex: bestMatch.originalHex,
    sublimatedLab: bestMatch.measuredLab,
    deltaE: deltaEResult.deltaE,
    matchPercentage: deltaEResult.matchPercentage,
    quality: deltaEResult.quality
  };
}

// Encontrar melhores correspondências para todas as cores detectadas
export function findBestMatchesForPalette(
  detectedColors: DetectedColor[],
  samples: SublimatedSample[],
  fabricMode: 'dry-fit' | 'helanca' | 'both'
): ColorMatchResult[] {
  return detectedColors.map(detectedColor => {
    const result: ColorMatchResult = {
      detectedColor
    };
    
    if (fabricMode === 'dry-fit' || fabricMode === 'both') {
      result.dryFitMatch = findBestMatch(detectedColor, samples, 'dry-fit');
    }
    
    if (fabricMode === 'helanca' || fabricMode === 'both') {
      result.helancaMatch = findBestMatch(detectedColor, samples, 'helanca');
    }
    
    return result;
  });
}

// Gerar aviso se a correspondência não for boa
export function generateQualityWarning(match: ColorMatch): string | null {
  if (match.quality === 'poor') {
    return `A cor ${match.detectedColor.hex} não possui correspondência muito próxima no banco ${match.fabricType}. Melhor resultado encontrado: Delta E ${match.deltaE}. Recomenda-se fazer teste físico antes da produção.`;
  } else if (match.quality === 'medium') {
    return `A cor ${match.detectedColor.hex} tem correspondência média no banco ${match.fabricType}. Delta E: ${match.deltaE}. Recomenda-se verificar antes da produção.`;
  }
  
  return null;
}

// Calcular média de qualidade das correspondências
export function calculateAverageQuality(matches: ColorMatchResult[]): {
  dryFitAverage: number;
  helancaAverage: number;
  overallAverage: number;
} {
  let dryFitSum = 0;
  let dryFitCount = 0;
  let helancaSum = 0;
  let helancaCount = 0;
  
  for (const match of matches) {
    if (match.dryFitMatch) {
      dryFitSum += match.dryFitMatch.matchPercentage;
      dryFitCount++;
    }
    
    if (match.helancaMatch) {
      helancaSum += match.helancaMatch.matchPercentage;
      helancaCount++;
    }
  }
  
  const dryFitAverage = dryFitCount > 0 ? dryFitSum / dryFitCount : 0;
  const helancaAverage = helancaCount > 0 ? helancaSum / helancaCount : 0;
  const overallAverage = (dryFitSum + helancaSum) / (dryFitCount + helancaCount) || 0;
  
  return {
    dryFitAverage: Math.round(dryFitAverage * 100) / 100,
    helancaAverage: Math.round(helancaAverage * 100) / 100,
    overallAverage: Math.round(overallAverage * 100) / 100
  };
}

// Ordenar correspondências por qualidade
export function sortMatchesByQuality(matches: ColorMatchResult[], fabricType: 'dry-fit' | 'helanca'): ColorMatchResult[] {
  return [...matches].sort((a, b) => {
    const matchA = fabricType === 'dry-fit' ? a.dryFitMatch : a.helancaMatch;
    const matchB = fabricType === 'dry-fit' ? b.dryFitMatch : b.helancaMatch;
    
    if (!matchA && !matchB) return 0;
    if (!matchA) return 1;
    if (!matchB) return -1;
    
    return matchB.matchPercentage - matchA.matchPercentage;
  });
}

// Filtrar cores com baixa qualidade
export function filterLowQualityMatches(
  matches: ColorMatchResult[],
  minQuality: 'excellent' | 'good' | 'medium' = 'medium'
): ColorMatchResult[] {
  const qualityThreshold = {
    excellent: 2,
    good: 5,
    medium: 10
  };
  
  const threshold = qualityThreshold[minQuality];
  
  return matches.filter(match => {
    const dryFitDelta = match.dryFitMatch?.deltaE || Infinity;
    const helancaDelta = match.helancaMatch?.deltaE || Infinity;
    
    return dryFitDelta <= threshold || helancaDelta <= threshold;
  });
}

// Gerar resumo das correspondências
export function generateMatchSummary(matches: ColorMatchResult[]): {
  totalColors: number;
  dryFitMatches: number;
  helancaMatches: number;
  excellentCount: number;
  goodCount: number;
  mediumCount: number;
  poorCount: number;
} {
  let dryFitMatches = 0;
  let helancaMatches = 0;
  let excellentCount = 0;
  let goodCount = 0;
  let mediumCount = 0;
  let poorCount = 0;
  
  for (const match of matches) {
    if (match.dryFitMatch) {
      dryFitMatches++;
      switch (match.dryFitMatch.quality) {
        case 'excellent': excellentCount++; break;
        case 'good': goodCount++; break;
        case 'medium': mediumCount++; break;
        case 'poor': poorCount++; break;
      }
    }
    
    if (match.helancaMatch) {
      helancaMatches++;
      switch (match.helancaMatch.quality) {
        case 'excellent': excellentCount++; break;
        case 'good': goodCount++; break;
        case 'medium': mediumCount++; break;
        case 'poor': poorCount++; break;
      }
    }
  }
  
  return {
    totalColors: matches.length,
    dryFitMatches,
    helancaMatches,
    excellentCount,
    goodCount,
    mediumCount,
    poorCount
  };
}
