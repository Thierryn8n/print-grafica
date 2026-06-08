// Serviço Supabase para operações de cores
// Upload, salvar análise, buscar amostras, etc

import { createClient } from '@/lib/supabase/client';
import { DetectedColor } from './color-extraction';
import { ColorMatchResult, SublimatedSample } from './color-matching';
import { LAB } from './color-conversion';

export interface ColorLibrary {
  id: string;
  name: string;
  description: string | null;
  source: string | null;
  created_at: string;
}

export interface OriginalColor {
  id: string;
  library_id: string;
  code: string;
  name: string | null;
  pantone_code: string | null;
  corel_code: string | null;
  rgb_r: number;
  rgb_g: number;
  rgb_b: number;
  hex: string;
  lab_l: number | null;
  lab_a: number | null;
  lab_b: number | null;
  page_number: number | null;
}

export interface FabricType {
  id: string;
  name: string;
  description: string | null;
}

export interface SublimatedColorSample {
  id: string;
  original_color_id: string;
  fabric_type_id: string;
  scanned_image_url: string | null;
  sample_crop_url: string | null;
  measured_rgb_r: number | null;
  measured_rgb_g: number | null;
  measured_rgb_b: number | null;
  measured_hex: string | null;
  measured_lab_l: number | null;
  measured_lab_a: number | null;
  measured_lab_b: number | null;
  printer_model: string | null;
  ink_type: string | null;
  paper_type: string | null;
  temperature: number | null;
  press_time_seconds: number | null;
  pressure_level: string | null;
  scan_device: string | null;
  scan_dpi: number | null;
  lighting_condition: string | null;
  notes: string | null;
  calibration_date: string | null;
  created_at?: string;
  updated_at?: string;
  // Relações populadas via join
  original_colors?: Partial<OriginalColor> | null;
  fabric_types?: Partial<FabricType> | null;
}

export interface CustomerColorAnalysis {
  id: string;
  order_id: string | null;
  uploaded_image_url: string;
  selected_fabric_mode: 'dry-fit' | 'helanca' | 'both';
  number_of_colors: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error_message: string | null;
  created_at: string;
}

export interface DetectedImageColor {
  id: string;
  analysis_id: string;
  color_index: number;
  detected_rgb_r: number;
  detected_rgb_g: number;
  detected_rgb_b: number;
  detected_hex: string;
  detected_lab_l: number | null;
  detected_lab_a: number | null;
  detected_lab_b: number | null;
  percentage_in_image: number | null;
}

export interface ColorRecommendation {
  id: string;
  analysis_id: string;
  detected_color_id: string;
  fabric_type_id: string;
  recommended_original_color_id: string | null;
  recommended_sublimated_sample_id: string | null;
  delta_e: number | null;
  match_percentage: number | null;
  // Relações populadas via join
  fabric_types?: Partial<FabricType> | null;
  original_colors?: Partial<OriginalColor> | null;
  sublimated_color_samples?: Partial<SublimatedColorSample> | null;
}

const supabase = createClient();

// Buscar todas as bibliotecas de cores
export async function getColorLibraries(): Promise<ColorLibrary[]> {
  const { data, error } = await supabase
    .from('color_libraries')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
}

// Buscar tipos de tecido
export async function getFabricTypes(): Promise<FabricType[]> {
  const { data, error } = await supabase
    .from('fabric_types')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
}

// Buscar cores originais de uma biblioteca
export async function getOriginalColors(libraryId?: string): Promise<OriginalColor[]> {
  let query = supabase
    .from('original_colors')
    .select('*');
  
  if (libraryId) {
    query = query.eq('library_id', libraryId);
  }
  
  const { data, error } = await query.order('code');
  
  if (error) throw error;
  return data || [];
}

// Buscar amostras sublimadas
export async function getSublimatedSamples(fabricTypeId?: string): Promise<SublimatedColorSample[]> {
  let query = supabase
    .from('sublimated_color_samples')
    .select(`
      *,
      original_colors (
        id,
        code,
        name,
        pantone_code,
        corel_code,
        rgb_r,
        rgb_g,
        rgb_b,
        hex
      ),
      fabric_types (
        id,
        name
      )
    `);
  
  if (fabricTypeId) {
    query = query.eq('fabric_type_id', fabricTypeId);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Converter amostras do Supabase para formato usado pelo matching
export async function getSublimatedSamplesForMatching(): Promise<SublimatedSample[]> {
  const samples = await getSublimatedSamples();
  
  return samples
    .filter(s => 
      s.measured_lab_l !== null && 
      s.measured_lab_a !== null && 
      s.measured_lab_b !== null &&
      s.original_colors
    )
    .map(s => ({
      id: s.id,
      originalColorId: s.original_color_id,
      fabricTypeId: s.fabric_type_id,
      measuredLab: {
        l: s.measured_lab_l!,
        a: s.measured_lab_a!,
        b: s.measured_lab_b!
      },
      corelCode: s.original_colors?.corel_code || undefined,
      pantoneCode: s.original_colors?.pantone_code || undefined,
      originalRgb: {
        r: s.original_colors?.rgb_r || 0,
        g: s.original_colors?.rgb_g || 0,
        b: s.original_colors?.rgb_b || 0
      },
      originalHex: s.original_colors?.hex || ''
    }));
}

// Criar nova biblioteca de cores
export async function createColorLibrary(library: Omit<ColorLibrary, 'id' | 'created_at'>): Promise<ColorLibrary> {
  const { data, error } = await supabase
    .from('color_libraries')
    .insert(library)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Criar nova cor original
export async function createOriginalColor(color: Omit<OriginalColor, 'id'>): Promise<OriginalColor> {
  const { data, error } = await supabase
    .from('original_colors')
    .insert(color)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Criar nova amostra sublimada
export async function createSublimatedSample(sample: Partial<Omit<SublimatedColorSample, 'id' | 'created_at' | 'updated_at'>>): Promise<SublimatedColorSample> {
  const { data, error } = await supabase
    .from('sublimated_color_samples')
    .insert(sample)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Atualizar amostra sublimada
export async function updateSublimatedSample(id: string, sample: Partial<SublimatedColorSample>): Promise<SublimatedColorSample> {
  const { data, error } = await supabase
    .from('sublimated_color_samples')
    .update(sample)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Deletar amostra sublimada
export async function deleteSublimatedSample(id: string): Promise<void> {
  const { error } = await supabase
    .from('sublimated_color_samples')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Upload de imagem para análise
export async function uploadReferenceImage(file: File, orderId?: string): Promise<string> {
  const fileName = `${orderId || 'temp'}_${Date.now()}_${file.name}`;
  const filePath = `customer-reference-images/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('customer-reference-images')
    .upload(filePath, file);
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('customer-reference-images')
    .getPublicUrl(filePath);
  
  return publicUrl;
}

// Upload de tabela de cores escaneada
export async function uploadScannedChart(file: File): Promise<string> {
  const fileName = `${Date.now()}_${file.name}`;
  const filePath = `scanned-color-charts/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('scanned-color-charts')
    .upload(filePath, file);
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('scanned-color-charts')
    .getPublicUrl(filePath);
  
  return publicUrl;
}

// Upload de recorte de amostra
export async function uploadSampleCrop(file: File): Promise<string> {
  const fileName = `${Date.now()}_${file.name}`;
  const filePath = `color-sample-crops/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('color-sample-crops')
    .upload(filePath, file);
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('color-sample-crops')
    .getPublicUrl(filePath);
  
  return publicUrl;
}

// Criar análise de cores
export async function createColorAnalysis(analysis: Omit<CustomerColorAnalysis, 'id' | 'created_at' | 'updated_at'>): Promise<CustomerColorAnalysis> {
  const { data, error } = await supabase
    .from('customer_color_analyses')
    .insert(analysis)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Salvar cores detectadas
export async function saveDetectedColors(analysisId: string, colors: DetectedColor[]): Promise<void> {
  const colorsToInsert = colors.map((color, index) => ({
    analysis_id: analysisId,
    color_index: index,
    detected_rgb_r: color.rgb.r,
    detected_rgb_g: color.rgb.g,
    detected_rgb_b: color.rgb.b,
    detected_hex: color.hex,
    detected_lab_l: color.lab.l,
    detected_lab_a: color.lab.a,
    detected_lab_b: color.lab.b,
    percentage_in_image: color.percentage
  }));
  
  const { error } = await supabase
    .from('detected_image_colors')
    .insert(colorsToInsert);
  
  if (error) throw error;
}

// Salvar recomendações de cores
export async function saveColorRecommendations(analysisId: string, matches: ColorMatchResult[]): Promise<void> {
  const recommendations: any[] = [];
  
  for (const match of matches) {
    if (match.dryFitMatch) {
      recommendations.push({
        analysis_id: analysisId,
        fabric_type_id: 'dry-fit',
        recommended_original_color_id: match.dryFitMatch.recommendedOriginalColorId,
        recommended_sublimated_sample_id: match.dryFitMatch.recommendedSublimatedSampleId,
        delta_e: match.dryFitMatch.deltaE,
        match_percentage: match.dryFitMatch.matchPercentage
      });
    }
    
    if (match.helancaMatch) {
      recommendations.push({
        analysis_id: analysisId,
        fabric_type_id: 'helanca',
        recommended_original_color_id: match.helancaMatch.recommendedOriginalColorId,
        recommended_sublimated_sample_id: match.helancaMatch.recommendedSublimatedSampleId,
        delta_e: match.helancaMatch.deltaE,
        match_percentage: match.helancaMatch.matchPercentage
      });
    }
  }
  
  if (recommendations.length > 0) {
    const { error } = await supabase
      .from('color_recommendations')
      .insert(recommendations);
    
    if (error) throw error;
  }
}

// Buscar análise de cores por pedido
export async function getColorAnalysisByOrderId(orderId: string): Promise<CustomerColorAnalysis | null> {
  const { data, error } = await supabase
    .from('customer_color_analyses')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  return data;
}

// Buscar cores detectadas de uma análise
export async function getDetectedColors(analysisId: string): Promise<DetectedImageColor[]> {
  const { data, error } = await supabase
    .from('detected_image_colors')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('color_index');
  
  if (error) throw error;
  return data || [];
}

// Buscar recomendações de cores de uma análise
export async function getColorRecommendations(analysisId: string): Promise<ColorRecommendation[]> {
  const { data, error } = await supabase
    .from('color_recommendations')
    .select(`
      *,
      fabric_types (
        name
      ),
      original_colors (
        code,
        name,
        pantone_code,
        corel_code,
        hex
      ),
      sublimated_color_samples (
        measured_hex
      )
    `)
    .eq('analysis_id', analysisId);
  
  if (error) throw error;
  return data || [];
}

// Atualizar status da análise
export async function updateAnalysisStatus(analysisId: string, status: 'pending' | 'processing' | 'completed' | 'error', errorMessage?: string): Promise<void> {
  const updateData: any = { status };
  if (errorMessage) updateData.error_message = errorMessage;
  
  const { error } = await supabase
    .from('customer_color_analyses')
    .update(updateData)
    .eq('id', analysisId);
  
  if (error) throw error;
}
