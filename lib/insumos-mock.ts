export const UNITS = [
  "Saca", "kg", "m²", "m³", "Metro", "Litro", "Unidade",
  "Milheiro", "Peça", "Rolo", "Galão", "Balde", "Tubo", "Barra", "Folha",
]

export const CATEGORIES = [
  "Alvenaria", "Cimento", "Elétrico", "Hidráulico", "Pintura",
  "Acabamento", "Madeira", "Ferragem", "Cobertura", "Impermeabilização",
  "Fundação", "Estrutura", "Esquadria", "Gesso", "Piso", "Revestimento",
]

export interface InsumoMock {
  id: string
  name: string
  unit: string
  category: string
  origin: "Sistema"
  description?: string
}

export const INSUMOS_SISTEMA: InsumoMock[] = [
  { id: "s001", name: "Cimento CP-II 50kg", unit: "Saca", category: "Cimento", origin: "Sistema", description: "Cimento Portland Composto" },
  { id: "s002", name: "Cimento CP-V ARI 50kg", unit: "Saca", category: "Cimento", origin: "Sistema", description: "Alta resistência inicial" },
  { id: "s003", name: "Areia média lavada", unit: "m³", category: "Alvenaria", origin: "Sistema" },
  { id: "s004", name: "Areia grossa lavada", unit: "m³", category: "Alvenaria", origin: "Sistema" },
  { id: "s005", name: "Brita 0 (pedrisco)", unit: "m³", category: "Alvenaria", origin: "Sistema" },
  { id: "s006", name: "Brita 1", unit: "m³", category: "Alvenaria", origin: "Sistema" },
  { id: "s007", name: "Tijolo cerâmico 6 furos (9x14x19)", unit: "Milheiro", category: "Alvenaria", origin: "Sistema" },
  { id: "s008", name: "Tijolo cerâmico 8 furos (9x19x19)", unit: "Milheiro", category: "Alvenaria", origin: "Sistema" },
  { id: "s009", name: "Bloco de concreto 14x19x39", unit: "Unidade", category: "Alvenaria", origin: "Sistema" },
  { id: "s010", name: "Argamassa colante AC-I 20kg", unit: "Saca", category: "Revestimento", origin: "Sistema" },
  { id: "s011", name: "Argamassa colante AC-II 20kg", unit: "Saca", category: "Revestimento", origin: "Sistema" },
  { id: "s012", name: "Argamassa colante AC-III 20kg", unit: "Saca", category: "Revestimento", origin: "Sistema" },
  { id: "s013", name: "Rejunte cimentício branco 1kg", unit: "Unidade", category: "Revestimento", origin: "Sistema" },
  { id: "s014", name: "Rejunte epóxi 1kg", unit: "Unidade", category: "Revestimento", origin: "Sistema" },
  { id: "s015", name: "Cal hidratada CH-III 20kg", unit: "Saca", category: "Alvenaria", origin: "Sistema" },
  { id: "s016", name: "Tela metálica galvanizada malha 15x15", unit: "m²", category: "Estrutura", origin: "Sistema" },
  { id: "s017", name: "Ferro CA-50 6,3mm (barra 12m)", unit: "Barra", category: "Ferragem", origin: "Sistema" },
  { id: "s018", name: "Ferro CA-50 8mm (barra 12m)", unit: "Barra", category: "Ferragem", origin: "Sistema" },
  { id: "s019", name: "Ferro CA-50 10mm (barra 12m)", unit: "Barra", category: "Ferragem", origin: "Sistema" },
  { id: "s020", name: "Ferro CA-50 12,5mm (barra 12m)", unit: "Barra", category: "Ferragem", origin: "Sistema" },
  { id: "s021", name: "Ferro CA-60 4,2mm (barra 12m)", unit: "Barra", category: "Ferragem", origin: "Sistema" },
  { id: "s022", name: "Arame recozido 1kg", unit: "kg", category: "Ferragem", origin: "Sistema" },
  { id: "s023", name: "Prego 17x27 com cabeça 1kg", unit: "kg", category: "Ferragem", origin: "Sistema" },
  { id: "s024", name: "Parafuso auto-atarraxante zincado", unit: "Peça", category: "Ferragem", origin: "Sistema" },
  { id: "s025", name: "Madeira pinus 1x6 (metro)", unit: "Metro", category: "Madeira", origin: "Sistema" },
  { id: "s026", name: "Madeira pinus 2x4 (metro)", unit: "Metro", category: "Madeira", origin: "Sistema" },
  { id: "s027", name: "Caibro 5x5cm", unit: "Metro", category: "Madeira", origin: "Sistema" },
  { id: "s028", name: "Ripa 2x5cm", unit: "Metro", category: "Madeira", origin: "Sistema" },
  { id: "s029", name: "Compensado 18mm (chapa 2,44x1,22)", unit: "Folha", category: "Madeira", origin: "Sistema" },
  { id: "s030", name: "OSB 11,1mm (chapa 2,44x1,22)", unit: "Folha", category: "Madeira", origin: "Sistema" },
  { id: "s031", name: "Telha cerâmica colonial", unit: "Milheiro", category: "Cobertura", origin: "Sistema" },
  { id: "s032", name: "Telha fibrocimento 6mm (2,44x1,10)", unit: "Peça", category: "Cobertura", origin: "Sistema" },
  { id: "s033", name: "Telha galvanizada trapezoidal", unit: "m²", category: "Cobertura", origin: "Sistema" },
  { id: "s034", name: "Calha PVC 3m", unit: "Peça", category: "Cobertura", origin: "Sistema" },
  { id: "s035", name: "Manta impermeabilizante 4mm", unit: "m²", category: "Impermeabilização", origin: "Sistema" },
  { id: "s036", name: "Impermeabilizante acrílico 18L", unit: "Balde", category: "Impermeabilização", origin: "Sistema" },
  { id: "s037", name: "Tubo PVC esgoto 100mm (6m)", unit: "Tubo", category: "Hidráulico", origin: "Sistema" },
  { id: "s038", name: "Tubo PVC esgoto 75mm (6m)", unit: "Tubo", category: "Hidráulico", origin: "Sistema" },
  { id: "s039", name: "Tubo PVC pressão 25mm (6m)", unit: "Tubo", category: "Hidráulico", origin: "Sistema" },
  { id: "s040", name: "Tubo CPVC 22mm (3m)", unit: "Tubo", category: "Hidráulico", origin: "Sistema" },
  { id: "s041", name: "Registro de gaveta 3/4\"", unit: "Peça", category: "Hidráulico", origin: "Sistema" },
  { id: "s042", name: "Joelho 90° PVC 25mm", unit: "Peça", category: "Hidráulico", origin: "Sistema" },
  { id: "s043", name: "Caixa d'água 500L polietileno", unit: "Unidade", category: "Hidráulico", origin: "Sistema" },
  { id: "s044", name: "Fio elétrico 2,5mm² (rolo 100m)", unit: "Rolo", category: "Elétrico", origin: "Sistema" },
  { id: "s045", name: "Fio elétrico 4mm² (rolo 100m)", unit: "Rolo", category: "Elétrico", origin: "Sistema" },
  { id: "s046", name: "Fio elétrico 6mm² (rolo 100m)", unit: "Rolo", category: "Elétrico", origin: "Sistema" },
  { id: "s047", name: "Eletroduto rígido PVC 3/4\" (3m)", unit: "Tubo", category: "Elétrico", origin: "Sistema" },
  { id: "s048", name: "Disjuntor monopolar 20A", unit: "Peça", category: "Elétrico", origin: "Sistema" },
  { id: "s049", name: "Quadro de distribuição 12 disjuntores", unit: "Unidade", category: "Elétrico", origin: "Sistema" },
  { id: "s050", name: "Tomada 2P+T 20A", unit: "Peça", category: "Elétrico", origin: "Sistema" },
  { id: "s051", name: "Interruptor simples", unit: "Peça", category: "Elétrico", origin: "Sistema" },
  { id: "s052", name: "Tinta acrílica branca 18L", unit: "Balde", category: "Pintura", origin: "Sistema" },
  { id: "s053", name: "Massa corrida PVA 25kg", unit: "Saca", category: "Pintura", origin: "Sistema" },
  { id: "s054", name: "Selador acrílico 18L", unit: "Balde", category: "Pintura", origin: "Sistema" },
  { id: "s055", name: "Lixa grão 80 (folha)", unit: "Folha", category: "Pintura", origin: "Sistema" },
  { id: "s056", name: "Rolo de lã de carneiro 23cm", unit: "Peça", category: "Pintura", origin: "Sistema" },
  { id: "s057", name: "Gesso em pó 20kg", unit: "Saca", category: "Gesso", origin: "Sistema" },
  { id: "s058", name: "Forro de gesso (placa 60x60)", unit: "m²", category: "Gesso", origin: "Sistema" },
  { id: "s059", name: "Porta interna 0,80x2,10 (laminada)", unit: "Unidade", category: "Esquadria", origin: "Sistema" },
  { id: "s060", name: "Janela veneziana alumínio 1,20x1,20", unit: "Unidade", category: "Esquadria", origin: "Sistema" },
]
