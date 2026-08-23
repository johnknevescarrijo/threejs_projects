# AGENTS.md - Projeto Terra Interativa (Three.js)

## Visão Geral do Projeto
Este é um projeto frontend simples que renderiza um planeta Terra 3D interativo usando Three.js. O foco é aprendizado de shaders básicos, texturas e controles de órbita. Não há backend ou build steps complexos (Vite puro).

## Comandos Principais
- **Instalar:** `npm install`
- **Rodar (Dev):** `npm run dev`
- **Build:** `npm run build`
- **Preview:** `npm run preview`

## Estrutura de Arquivos
- `src/main.js` - Ponto de entrada e inicialização da cena Three.js.
- `src/style.css` - Estilos globais (reset de margem, canvas full-screen).
- `index.html` - HTML mínimo que importa o script como módulo.
- `public/` - Pasta para assets estáticos (texturas da Terra, nuvens, estrelas).
  - `earth_color.jpg` - Textura base (albedo).
  - `earth_bump.jpg` - Mapa de relevo.
  - `earth_specular.jpg` - Mapa de brilho dos oceanos.
  - `clouds.png` - Textura das nuvens com canal alpha.

## Convenções de Código
- **Módulos ES6:** Use `import`/`export` exclusivamente.
- **Three.js Imports:** Importe addons (como `OrbitControls`) via `three/addons/...`.
- **Nomenclatura:** Variáveis em `camelCase`, Classes/Construtores em `PascalCase`. 
- **Gerenciamento de Memória:** Sempre dispose geometrias e materiais não utilizados se houver troca de texturas dinâmica.
- **Loop de Renderização:** Use `requestAnimationFrame`. A lógica de rotação automática deve estar separada dos controles do usuário.

## Regras de Implementação
1. **Texturas:** Nunca faça hardcode de URLs externas para texturas em produção. Use paths relativos da pasta `public/`.
2. **Responsividade:** O evento `resize` deve atualizar a proporção da câmera (`aspect`) e o tamanho do renderizador imediatamente.
3. **Controles:** `OrbitControls` deve ter `enableDamping = true` para inércia suave.
4. **Performance:** Mantenha o número de segmentos da esfera (`SphereGeometry`) equilibrado (ex: 64x64) para não travar dispositivos móveis.

## Limites e Segurança
- ✅ **Permitido:** Adicionar shaders personalizados, partículas de estrelas, marcadores interativos (Raycaster).
- ⚠️ **Perguntar antes:** Instalar novos pacotes npm além do three/vite, mudar a estrutura de pastas `public`.
- 🚫 **Nunca:** Commitar arquivos de texturas pesadas (>5MB) diretamente no git sem compressão ou aviso. Usar links externos para assets de exemplo se necessário.

## Dicas de Contexto
- Para realismo, a camada de nuvens deve ser uma esfera ligeiramente maior que a terra e girar em velocidade diferente.
- A luz direcional (`DirectionalLight`) simula o Sol e deve estar posicionada fora da cena (ex: `x=5, y=3, z=5`).   

