# MEMORY.md - Estado e Contexto do Projeto Terra Interativa 3D

## 📌 Visão Geral
Este documento serve como memória persistente e registro de estado para o desenvolvimento da aplicação **Terra 3D Interativa** construída com **Three.js** e **Vite**.

---

## 🛠️ Pilha Tecnológica
- **Linguagem / Runtime:** JavaScript (ES6+ Modules), Node.js (v22+)
- **Build Tool:** Vite 6.x
- **Renderização 3D:** Three.js (v0.170+)
- **Controles de Câmera:** `OrbitControls` (`three/addons/controls/OrbitControls.js`)

---

## 📂 Estrutura de Diretórios e Arquivos
```
terra_3d/
├── AGENTS.md            # Regras e convenções para agentes de IA
├── MEMORY.md            # Memória de estado, decisões e roadmap do projeto
├── index.html           # Ponto de entrada HTML com overlay de UI
├── package.json         # Dependências (three, vite) e scripts de execução
├── package-lock.json    # Trava de versões do npm
├── public/              # Assets estáticos servidos pelo Vite
│   ├── clouds.png       # Textura de nuvens com canal alfa (~255 KB)
│   ├── earth_bump.jpg   # Mapa de relevo/normal da Terra (~329 KB)
│   ├── earth_color.jpg  # Textura de cor difusa/albedo da Terra (~501 KB)
│   └── earth_specular.jpg # Mapa especular dos oceanos (~219 KB)
└── src/
    ├── main.js          # Lógica da aplicação, classe EarthApp, shaders e loop
    └── style.css        # Reset CSS, estilos globais e UI overlay
```

---

## 🧠 Arquitetura e Decisões de Implementação

### 1. Classe `EarthApp` (`src/main.js`)
- **Separação de Camadas:**
  1. **Terra Base (`earthMesh`):** `SphereGeometry(1, 64, 64)` com `MeshPhongMaterial` combinando `map`, `bumpMap` (escala 0.04) e `specularMap` para brilho nos oceanos.
  2. **Camada de Nuvens (`cloudsMesh`):** `SphereGeometry(1.015, 64, 64)` com `MeshStandardMaterial`, transparência e `AdditiveBlending`. Gira em velocidade ligeiramente superior (`delta * 0.07`) à superfície da Terra (`delta * 0.05`).
  3. **Brilho Atmosférico (`atmosphereMesh`):** `SphereGeometry(1.15, 64, 64)` com `ShaderMaterial` customizado baseado em Fresnel Rim Lighting (efeito de borda difusa azulada).
  4. **Campo Estelar (`starsMesh`):** `Points` com 3.000 partículas em distribuição esférica radial com variação de cores espectrais (branca, azul e amarela).
- **Iluminação:**
  - `DirectionalLight` posicionado em `(5, 3, 5)` com intensidade 2.5 simulando o Sol.
  - `AmbientLight` suave (`0x112233`, 0.6) para iluminação de preenchimento do lado escuro da Terra.
- **Controles e Câmera:**
  - `OrbitControls` com `enableDamping = true`, amortecimento suave (`0.05`), limites de zoom (`minDistance = 1.3`, `maxDistance = 10.0`).
- **Gerenciamento de Ciclo de Vida e Memória:**
  - Método `destroy()` implementado para liberar buffers e materiais da GPU.

---

## 📋 Status Atual de Funcionalidades
- [x] Configuração inicial do Vite e Three.js
- [x] Texturas otimizadas (< 500 KB cada) baixadas em `public/`
- [x] Esfera da Terra com relevo (Bump map) e brilho oceânico (Specular map)
- [x] Inclinação axial real da Terra (~23.44°)
- [x] Camada de nuvens com rotação independente
- [x] Atmosfera com shader GLSL customizado
- [x] Campo estelar (Starfield) 3D em partículas
- [x] Responsividade no evento `resize`
- [x] Inércia e limites nos controles `OrbitControls`
- [x] Build de produção verificado com sucesso

---

## 🚀 Próximos Passos / Roadmap Sugerido
1. **Marcadores Geográficos Interativos:**
   - Adicionar pinos/marcadores em coordenadas de latitude e longitude usando conversão esférica -> cartesiana.
   - Implementar `Raycaster` para clique e exibição de tooltip com informações de cidades/países.
2. **Textura de Luzes Noturnas (City Lights):**
   - Shader que combina a textura diurna e noturna dependendo da direção da luz do Sol.
3. **Painel de Controle (GUI / Alternadores):**
   - Controle de velocidade de rotação, alternância de nuvens, atmosfera e órbita automática.
