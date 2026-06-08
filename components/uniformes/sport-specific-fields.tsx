import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import type { SportType, FutebolData, BasqueteData, VoleiData, HandebolData, CorridaData, CiclismoData } from "@/lib/types"

interface SportSpecificFieldsProps {
  sportType: SportType
  sportData: any
  onDataChange: (data: any) => void
}

export function SportSpecificFields({ sportType, sportData, onDataChange }: SportSpecificFieldsProps) {
  const updateData = (field: string, value: any) => {
    onDataChange({
      ...sportData,
      [field]: value,
    })
  }

  switch (sportType) {
    case "futebol":
    case "futsal":
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="posicao">Posição em Campo</Label>
            <Select
              value={sportData?.posicao_em_campo || ""}
              onValueChange={(value) => updateData("posicao_em_campo", value)}
            >
              <SelectTrigger id="posicao">
                <SelectValue placeholder="Selecione a posição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="goleiro">Goleiro</SelectItem>
                <SelectItem value="zagueiro">Zagueiro</SelectItem>
                <SelectItem value="lateral">Lateral</SelectItem>
                <SelectItem value="volante">Volante</SelectItem>
                <SelectItem value="meia">Meia</SelectItem>
                <SelectItem value="atacante">Atacante</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="numero_fixo"
              checked={sportData?.numero_fixo || false}
              onCheckedChange={(checked) => updateData("numero_fixo", checked)}
            />
            <Label htmlFor="numero_fixo">Número Fixo</Label>
          </div>

          <div>
            <Label htmlFor="perna">Perna Dominante</Label>
            <Select
              value={sportData?.perna_dominante || ""}
              onValueChange={(value) => updateData("perna_dominante", value)}
            >
              <SelectTrigger id="perna">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direita">Direita</SelectItem>
                <SelectItem value="esquerda">Esquerda</SelectItem>
                <SelectItem value="ambidestra">Ambidestra</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )

    case "basquete":
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="altura">Altura (cm)</Label>
            <Input
              id="altura"
              type="number"
              value={sportData?.altura || ""}
              onChange={(e) => updateData("altura", e.target.value)}
              placeholder="Ex: 180"
            />
          </div>

          <div>
            <Label htmlFor="posicao_basquete">Posição</Label>
            <Select
              value={sportData?.posicao || ""}
              onValueChange={(value) => updateData("posicao", value)}
            >
              <SelectTrigger id="posicao_basquete">
                <SelectValue placeholder="Selecione a posição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="armador">Armador</SelectItem>
                <SelectItem value="ala">Ala</SelectItem>
                <SelectItem value="ala_pivo">Ala-pivô</SelectItem>
                <SelectItem value="pivo">Pivô</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="numero_fixo_basquete"
              checked={sportData?.numero_fixo || false}
              onCheckedChange={(checked) => updateData("numero_fixo", checked)}
            />
            <Label htmlFor="numero_fixo_basquete">Número Fixo</Label>
          </div>
        </div>
      )

    case "volei":
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="funcao">Função</Label>
            <Select
              value={sportData?.funcao || ""}
              onValueChange={(value) => updateData("funcao", value)}
            >
              <SelectTrigger id="funcao">
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="levantador">Levantador</SelectItem>
                <SelectItem value="oposto">Oposto</SelectItem>
                <SelectItem value="ponteiro">Ponteiro</SelectItem>
                <SelectItem value="libero">Líbero</SelectItem>
                <SelectItem value="central">Central</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="numero_fixo_volei"
              checked={sportData?.numero_fixo || false}
              onCheckedChange={(checked) => updateData("numero_fixo", checked)}
            />
            <Label htmlFor="numero_fixo_volei">Número Fixo</Label>
          </div>
        </div>
      )

    case "handebol":
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="posicao_handebol">Posição</Label>
            <Select
              value={sportData?.posicao || ""}
              onValueChange={(value) => updateData("posicao", value)}
            >
              <SelectTrigger id="posicao_handebol">
                <SelectValue placeholder="Selecione a posição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="goleiro">Goleiro</SelectItem>
                <SelectItem value="ponta">Ponta</SelectItem>
                <SelectItem value="lateral">Lateral</SelectItem>
                <SelectItem value="pivo">Pivô</SelectItem>
                <SelectItem value="armador">Armador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="numero_fixo_handebol"
              checked={sportData?.numero_fixo || false}
              onCheckedChange={(checked) => updateData("numero_fixo", checked)}
            />
            <Label htmlFor="numero_fixo_handebol">Número Fixo</Label>
          </div>
        </div>
      )

    case "corrida":
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="numero_peito">Número de Peito</Label>
            <Input
              id="numero_peito"
              value={sportData?.numero_peito || ""}
              onChange={(e) => updateData("numero_peito", e.target.value)}
              placeholder="Ex: 1234"
            />
          </div>

          <div>
            <Label htmlFor="categoria_corrida">Categoria</Label>
            <Select
              value={sportData?.categoria || ""}
              onValueChange={(value) => updateData("categoria", value)}
            >
              <SelectTrigger id="categoria_corrida">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5k">5K</SelectItem>
                <SelectItem value="10k">10K</SelectItem>
                <SelectItem value="meia_maratona">Meia Maratona</SelectItem>
                <SelectItem value="maratona">Maratona</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )

    case "ciclismo":
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="numero_peito_ciclismo">Número de Peito</Label>
            <Input
              id="numero_peito_ciclismo"
              value={sportData?.numero_peito || ""}
              onChange={(e) => updateData("numero_peito", e.target.value)}
              placeholder="Ex: 1234"
            />
          </div>

          <div>
            <Label htmlFor="categoria_ciclismo">Categoria</Label>
            <Select
              value={sportData?.categoria || ""}
              onValueChange={(value) => updateData("categoria", value)}
            >
              <SelectTrigger id="categoria_ciclismo">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="estrada">Estrada</SelectItem>
                <SelectItem value="mtb">MTB</SelectItem>
                <SelectItem value="bmx">BMX</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )

    default:
      return null
  }
}
