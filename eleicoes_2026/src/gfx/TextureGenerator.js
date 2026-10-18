import * as THREE from 'three';

/**
 * TextureGenerator - Gera texturas em Canvas 2D proceduralmente
 * Não depende de nenhum download externo! Rápido, leve e com estilo cartunesco autêntico.
 */
export class TextureGenerator {
  /**
   * Gera textura de rosto caricaturado estilo charge para o candidato
   */
  static createFaceTexture(characterId) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Fundo base de pele
    ctx.fillStyle = '#ffdfbf';
    ctx.fillRect(0, 0, 512, 512);

    switch (characterId) {
      case 'lula':
        this.drawLulaFace(ctx);
        break;
      case 'flavio':
        this.drawFlavioFace(ctx);
        break;
      case 'renan':
        this.drawRenanFace(ctx);
        break;
      case 'caiado':
        this.drawCaiadoFace(ctx);
        break;
      case 'curry':
        this.drawCurryFace(ctx);
        break;
      default:
        this.drawDefaultFace(ctx);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // --- Desenho Lula ---
  static drawLulaFace(ctx) {
    // Tom de pele caloroso com bochechas avermelhadas de palanque
    ctx.fillStyle = '#f7c59f';
    ctx.fillRect(0, 0, 512, 512);

    // Bochechas rosadas
    ctx.fillStyle = 'rgba(235, 90, 90, 0.28)';
    ctx.beginPath();
    ctx.arc(140, 310, 60, 0, Math.PI * 2);
    ctx.arc(372, 310, 60, 0, Math.PI * 2);
    ctx.fill();

    // Barba e Bigode brancos/grisalhos fartos
    ctx.fillStyle = '#e8ecf0';
    ctx.strokeStyle = '#c0c7cf';
    ctx.lineWidth = 4;

    ctx.beginPath();
    // Contorno da barba volumosa
    ctx.moveTo(80, 260);
    ctx.quadraticCurveTo(60, 480, 256, 495);
    ctx.quadraticCurveTo(452, 480, 432, 260);
    ctx.quadraticCurveTo(390, 330, 256, 340);
    ctx.quadraticCurveTo(120, 330, 80, 260);
    ctx.fill();
    ctx.stroke();

    // Detalhes de fios da barba
    ctx.strokeStyle = '#a6b0bc';
    ctx.lineWidth = 2.5;
    for (let x = 120; x <= 390; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, 340);
      ctx.quadraticCurveTo(x + (x < 256 ? -15 : 15), 410, x + (x < 256 ? -8 : 8), 470);
      ctx.stroke();
    }

    // Bigode volumoso
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(256, 325, 110, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b0b8c2';
    ctx.stroke();

    // Boca sob o bigode sorridente de comício
    ctx.fillStyle = '#a82424';
    ctx.beginPath();
    ctx.arc(256, 355, 32, 0, Math.PI);
    ctx.fill();
    // Dentes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(238, 355, 36, 9);

    // Nariz batatudo de charge
    ctx.fillStyle = '#f0a880';
    ctx.beginPath();
    ctx.arc(256, 270, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d68356';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Olhos simpáticos e expressivos
    this.drawCartoonEyes(ctx, 160, 210, 352, 210, '#3d2516', true);

    // Sobrancelhas grisalhas grossas e expressivas
    ctx.fillStyle = '#dfe4ea';
    ctx.strokeStyle = '#a4b0be';
    ctx.lineWidth = 3;
    // Esquerda
    ctx.beginPath();
    ctx.roundRect(110, 150, 95, 26, 12);
    ctx.fill();
    ctx.stroke();
    // Direita
    ctx.beginPath();
    ctx.roundRect(307, 150, 95, 26, 12);
    ctx.fill();
    ctx.stroke();

    // Cabelo grisalho volumoso nas têmporas
    ctx.fillStyle = '#f0f3f6';
    ctx.beginPath();
    ctx.arc(80, 160, 65, 0, Math.PI * 2);
    ctx.arc(432, 160, 65, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Desenho Flávio ---
  static drawFlavioFace(ctx) {
    ctx.fillStyle = '#fce2c8';
    ctx.fillRect(0, 0, 512, 512);

    // Topete penteado castanho alinhado
    ctx.fillStyle = '#4a3321';
    ctx.beginPath();
    ctx.moveTo(110, 160);
    ctx.quadraticCurveTo(150, 60, 260, 70);
    ctx.quadraticCurveTo(380, 80, 400, 160);
    ctx.quadraticCurveTo(256, 110, 110, 160);
    ctx.fill();

    // Sobrancelhas escuras arqueadas em tom de questionamento
    ctx.strokeStyle = '#2b1d12';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(130, 175);
    ctx.quadraticCurveTo(180, 155, 225, 178);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(285, 178);
    ctx.quadraticCurveTo(330, 150, 380, 175);
    ctx.stroke();

    // Olhos atentos
    this.drawCartoonEyes(ctx, 175, 220, 335, 220, '#422817', false);

    // Nariz afilado com traço de charge
    ctx.strokeStyle = '#c48962';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(256, 215);
    ctx.lineTo(265, 280);
    ctx.lineTo(245, 290);
    ctx.stroke();

    // Sorriso contido / ironia de debate
    ctx.strokeStyle = '#993d3d';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(256, 345, 45, 0.15 * Math.PI, 0.85 * Math.PI, false);
    ctx.stroke();

    // Queixo marcado
    ctx.strokeStyle = '#d49b78';
    ctx.beginPath();
    ctx.arc(256, 420, 25, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }

  // --- Desenho Renan ---
  static drawRenanFace(ctx) {
    ctx.fillStyle = '#ffdcb5';
    ctx.fillRect(0, 0, 512, 512);

    // Topete moderno e lateral raspada degradê
    ctx.fillStyle = '#221e1a';
    ctx.beginPath();
    ctx.moveTo(110, 160);
    ctx.quadraticCurveTo(240, 45, 330, 55);
    ctx.quadraticCurveTo(390, 65, 400, 170);
    ctx.quadraticCurveTo(256, 120, 110, 160);
    ctx.fill();

    // Barba desenhada / alinhada típica (estilo hipster/política moderna)
    ctx.fillStyle = '#26211c';
    ctx.beginPath();
    ctx.moveTo(110, 270);
    ctx.quadraticCurveTo(100, 440, 256, 475);
    ctx.quadraticCurveTo(412, 440, 402, 270);
    ctx.lineTo(370, 280);
    ctx.quadraticCurveTo(370, 405, 256, 435);
    ctx.quadraticCurveTo(140, 405, 140, 280);
    ctx.closePath();
    ctx.fill();

    // Cavanhaque e bigode desenhado
    ctx.beginPath();
    ctx.ellipse(256, 350, 48, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(256, 410, 20, 0, Math.PI * 2);
    ctx.fill();

    // Sobrancelhas expressivas e desafiadoras de debate
    ctx.strokeStyle = '#1b1713';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(130, 165);
    ctx.lineTo(225, 185);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(285, 185);
    ctx.lineTo(380, 165);
    ctx.stroke();

    // Olhos intensos de live
    this.drawCartoonEyes(ctx, 175, 220, 335, 220, '#2e1c11', false);

    // Nariz reto
    ctx.strokeStyle = '#b8815f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(256, 215);
    ctx.lineTo(250, 290);
    ctx.lineTo(265, 295);
    ctx.stroke();

    // Boca aberta falando firme
    ctx.fillStyle = '#6b1818';
    ctx.beginPath();
    ctx.ellipse(256, 365, 30, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Desenho Caiado ---
  static drawCaiadoFace(ctx) {
    ctx.fillStyle = '#fcdbb6';
    ctx.fillRect(0, 0, 512, 512);

    // Rosto maduro com marcas de expressão firmes do sertão
    ctx.strokeStyle = '#cc9068';
    ctx.lineWidth = 3;
    // Rugas na testa
    ctx.beginPath();
    ctx.moveTo(160, 135);
    ctx.lineTo(352, 135);
    ctx.moveTo(180, 150);
    ctx.lineTo(332, 150);
    ctx.stroke();

    // Linhas de expressão ao redor dos olhos e boca (sorriso firme/sério)
    ctx.beginPath();
    ctx.arc(120, 225, 25, 0.4 * Math.PI, 0.9 * Math.PI);
    ctx.arc(392, 225, 25, 0.1 * Math.PI, 0.6 * Math.PI);
    ctx.stroke();

    // Cabelos grisalhos bem penteados nas laterais
    ctx.fillStyle = '#ccd4dc';
    ctx.beginPath();
    ctx.arc(105, 190, 45, 0, Math.PI * 2);
    ctx.arc(407, 190, 45, 0, Math.PI * 2);
    ctx.fill();

    // Sobrancelhas grisalhas grossas e severas
    ctx.fillStyle = '#b0bec5';
    ctx.beginPath();
    ctx.roundRect(135, 165, 85, 20, 8);
    ctx.roundRect(292, 165, 85, 20, 8);
    ctx.fill();

    // Olhos penetrantes azuis/acinzentados
    this.drawCartoonEyes(ctx, 175, 220, 335, 220, '#37474f', false);

    // Nariz forte
    ctx.strokeStyle = '#b07954';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(256, 205);
    ctx.lineTo(260, 285);
    ctx.lineTo(240, 295);
    ctx.lineTo(270, 295);
    ctx.stroke();

    // Bigodinho clássico grisalho ralo
    ctx.fillStyle = '#cfd8dc';
    ctx.beginPath();
    ctx.ellipse(256, 335, 60, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boca firme e decidida
    ctx.strokeStyle = '#822e2e';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(215, 365);
    ctx.lineTo(297, 365);
    ctx.stroke();

    // Queixo quadrado proeminente
    ctx.strokeStyle = '#b07954';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(256, 430, 35, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }

  // --- Desenho Curry ---
  static drawCurryFace(ctx) {
    ctx.fillStyle = '#d49b6a'; // Tom de pele bronzeado/dourado
    ctx.fillRect(0, 0, 512, 512);

    // Cabelo estilo fade moderno com corte desenhado
    ctx.fillStyle = '#1c130d';
    ctx.beginPath();
    ctx.arc(256, 120, 150, Math.PI, 0);
    ctx.fill();

    // Faixa de cabeça esportiva / headband estilizada nas cores de campanha
    ctx.fillStyle = '#0d47a1'; // Azul Royal
    ctx.fillRect(80, 110, 352, 42);
    ctx.fillStyle = '#ffca28'; // Linha dourada
    ctx.fillRect(80, 128, 352, 7);

    // Sobrancelhas finas e arqueadas confiantes
    ctx.strokeStyle = '#1c130d';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(140, 180);
    ctx.quadraticCurveTo(185, 160, 225, 175);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(285, 175);
    ctx.quadraticCurveTo(325, 160, 370, 180);
    ctx.stroke();

    // Olhos castanho-claros brilhantes de cestinha
    this.drawCartoonEyes(ctx, 180, 220, 330, 220, '#5d4037', false);

    // Cavanhaque esportivo bem alinhado
    ctx.fillStyle = '#1c130d';
    ctx.beginPath();
    ctx.ellipse(256, 345, 38, 10, 0, 0, Math.PI * 2); // Bigode
    ctx.fill();
    ctx.beginPath();
    ctx.arc(256, 410, 24, 0, Math.PI * 2); // Cavadinha no queixo
    ctx.fill();

    // Nariz simpático
    ctx.strokeStyle = '#9c653d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(256, 215);
    ctx.lineTo(256, 285);
    ctx.arc(256, 290, 16, 0, Math.PI);
    ctx.stroke();

    // Sorriso campeão com dentes brilhantes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(256, 350, 42, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#1c130d';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Separação dos dentes
    ctx.beginPath();
    ctx.moveTo(256, 350);
    ctx.lineTo(256, 375);
    ctx.stroke();
  }

  static drawDefaultFace(ctx) {
    this.drawCartoonEyes(ctx, 175, 220, 335, 220, '#222222', false);
  }

  /**
   * Auxiliar para desenhar olhos cartunescos e expressivos
   */
  static drawCartoonEyes(ctx, lx, ly, rx, ry, irisColor, isLula = false) {
    [ { x: lx, y: ly }, { x: rx, y: ry } ].forEach((eye, idx) => {
      // Globo ocular grande
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(eye.x, eye.y, 45, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Íris
      ctx.fillStyle = irisColor;
      ctx.beginPath();
      ctx.arc(eye.x + (idx === 0 ? 5 : -5), eye.y, 22, 0, Math.PI * 2);
      ctx.fill();

      // Pupila
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(eye.x + (idx === 0 ? 5 : -5), eye.y, 12, 0, Math.PI * 2);
      ctx.fill();

      // Brilho no olhar (estilo anime/cartoon)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eye.x - 4, eye.y - 8, 7, 0, Math.PI * 2);
      ctx.arc(eye.x + 8, eye.y + 4, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /**
   * Textura do Terno com Gravata e Acessório Temático
   */
  static createSuitTexture(characterId) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    switch (characterId) {
      case 'lula':
        // Terno cinza chumbo escuro
        ctx.fillStyle = '#1c2128';
        ctx.fillRect(0, 0, 512, 512);

        // Camisa branca no centro
        ctx.fillStyle = '#f0f3f6';
        ctx.beginPath();
        ctx.moveTo(180, 0);
        ctx.lineTo(332, 0);
        ctx.lineTo(256, 320);
        ctx.closePath();
        ctx.fill();

        // Gravata Vermelha Vibrante
        ctx.fillStyle = '#d32f2f';
        ctx.beginPath();
        ctx.moveTo(236, 0);
        ctx.lineTo(276, 0);
        ctx.lineTo(290, 360);
        ctx.lineTo(256, 420);
        ctx.lineTo(222, 360);
        ctx.closePath();
        ctx.fill();

        // Listras sutis na gravata
        ctx.strokeStyle = '#b71c1c';
        ctx.lineWidth = 4;
        for (let y = 50; y < 380; y += 30) {
          ctx.beginPath();
          ctx.moveTo(225, y);
          ctx.lineTo(285, y + 25);
          ctx.stroke();
        }

        // Lapela do Paletó
        ctx.strokeStyle = '#11151a';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(130, 0);
        ctx.lineTo(200, 260);
        ctx.lineTo(130, 380);
        ctx.moveTo(382, 0);
        ctx.lineTo(312, 260);
        ctx.lineTo(382, 380);
        ctx.stroke();

        // Estrela Vermelha no paletó (Lapela esquerda)
        this.drawStar(ctx, 160, 240, 5, 24, 11, '#ff1744', '#ffd600');
        break;

      case 'flavio':
        // Terno Azul Marinho Nobre
        ctx.fillStyle = '#0d223a';
        ctx.fillRect(0, 0, 512, 512);

        // Camisa branca
        ctx.fillStyle = '#f8fafd';
        ctx.beginPath();
        ctx.moveTo(180, 0);
        ctx.lineTo(332, 0);
        ctx.lineTo(256, 310);
        ctx.closePath();
        ctx.fill();

        // Gravata Patriota Verde e Amarela
        ctx.fillStyle = '#2e7d32'; // Verde
        ctx.beginPath();
        ctx.moveTo(236, 0);
        ctx.lineTo(276, 0);
        ctx.lineTo(290, 360);
        ctx.lineTo(256, 420);
        ctx.lineTo(222, 360);
        ctx.closePath();
        ctx.fill();

        // Listras Amarelas diagonais
        ctx.strokeStyle = '#fbc02d';
        ctx.lineWidth = 12;
        for (let y = 40; y < 380; y += 45) {
          ctx.beginPath();
          ctx.moveTo(225, y);
          ctx.lineTo(285, y + 35);
          ctx.stroke();
        }

        // Lapela
        ctx.strokeStyle = '#071320';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(130, 0);
        ctx.lineTo(200, 260);
        ctx.lineTo(130, 380);
        ctx.moveTo(382, 0);
        ctx.lineTo(312, 260);
        ctx.lineTo(382, 380);
        ctx.stroke();

        // Broche da Bandeira do Brasil na lapela
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(145, 230, 36, 24);
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.moveTo(163, 230);
        ctx.lineTo(178, 242);
        ctx.lineTo(163, 254);
        ctx.lineTo(148, 242);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#1565c0';
        ctx.beginPath();
        ctx.arc(163, 242, 6, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'renan':
        // Terno Slim Moderno Preto grafite
        ctx.fillStyle = '#14171a';
        ctx.fillRect(0, 0, 512, 512);

        // Camisa preta com detalhe amarelo do MBL/Missão
        ctx.fillStyle = '#22272c';
        ctx.beginPath();
        ctx.moveTo(180, 0);
        ctx.lineTo(332, 0);
        ctx.lineTo(256, 320);
        ctx.closePath();
        ctx.fill();

        // Faixa/gravata slim amarela e preta
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(242, 0);
        ctx.lineTo(270, 0);
        ctx.lineTo(280, 360);
        ctx.lineTo(256, 410);
        ctx.lineTo(232, 360);
        ctx.closePath();
        ctx.fill();

        // Logo "M" ou raio na lapela
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('⚡LIVE', 135, 250);
        break;

      case 'caiado':
        // Terno Clássico Cinza Médio / Bege de campo
        ctx.fillStyle = '#3e444a';
        ctx.fillRect(0, 0, 512, 512);

        // Camisa branca de colarinho alto
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(180, 0);
        ctx.lineTo(332, 0);
        ctx.lineTo(256, 310);
        ctx.closePath();
        ctx.fill();

        // Gravata Azul Real Clássica
        ctx.fillStyle = '#1565c0';
        ctx.beginPath();
        ctx.moveTo(234, 0);
        ctx.lineTo(278, 0);
        ctx.lineTo(292, 360);
        ctx.lineTo(256, 420);
        ctx.lineTo(220, 360);
        ctx.closePath();
        ctx.fill();

        // Fivela goiana no cinto (na base do paletó)
        ctx.fillStyle = '#d4af37'; // Ouro envelhecido
        ctx.fillRect(216, 460, 80, 42);
        ctx.fillStyle = '#2b1d0c';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('GOIÁS', 232, 486);
        break;

      case 'curry':
        // Terno Azul Royal esportivo com detalhes de time
        ctx.fillStyle = '#1a3b8b';
        ctx.fillRect(0, 0, 512, 512);

        // Camisa branca/dourada
        ctx.fillStyle = '#fffdf0';
        ctx.beginPath();
        ctx.moveTo(180, 0);
        ctx.lineTo(332, 0);
        ctx.lineTo(256, 310);
        ctx.closePath();
        ctx.fill();

        // Gravata Dourada Vibrante
        ctx.fillStyle = '#ffc107';
        ctx.beginPath();
        ctx.moveTo(236, 0);
        ctx.lineTo(276, 0);
        ctx.lineTo(290, 360);
        ctx.lineTo(256, 420);
        ctx.lineTo(222, 360);
        ctx.closePath();
        ctx.fill();

        // Número '30' ou '3PTS' estilizado no peito
        ctx.fillStyle = '#ffc107';
        ctx.font = 'bold 36px impact, sans-serif';
        ctx.fillText('3 PTS', 140, 245);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeText('3 PTS', 140, 245);
        break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Textura de Santinho Eleitoral (papeizinhos que voam em pancadas)
   */
  static createSantinhoTexture(characterId, numberStr) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');

    // Papel branco com borda colorida
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 180);

    // Borda superior colorida
    const colors = {
      lula: '#d32f2f',
      flavio: '#2e7d32',
      renan: '#fbc02d',
      caiado: '#1565c0',
      curry: '#0288d1'
    };
    ctx.fillStyle = colors[characterId] || '#333333';
    ctx.fillRect(0, 0, 128, 25);

    // Texto de eleição
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('VOTE 2026', 28, 17);

    // Retângulo da "foto"
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(24, 35, 80, 75);
    ctx.fillStyle = '#757575';
    ctx.beginPath();
    ctx.arc(64, 65, 20, 0, Math.PI * 2);
    ctx.fill();

    // Número grande
    ctx.fillStyle = colors[characterId] || '#000000';
    ctx.font = 'bold 32px impact, sans-serif';
    ctx.fillText(numberStr || '99', 42, 145);

    // Rodapé
    ctx.fillStyle = '#424242';
    ctx.font = '9px sans-serif';
    ctx.fillText('DEBATE MORTAL', 24, 168);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Textura do frontal da URNA ELETRÔNICA
   */
  static createUrnaTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');

    // Chassi cinza claro de plástico da urna
    ctx.fillStyle = '#d0d5dd';
    ctx.fillRect(0, 0, 512, 384);
    ctx.strokeStyle = '#98a2b3';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 376);

    // Tela LCD da urna à esquerda
    ctx.fillStyle = '#b7e4c7';
    ctx.fillRect(25, 30, 250, 320);
    ctx.strokeStyle = '#2d6a4f';
    ctx.lineWidth = 4;
    ctx.strokeRect(25, 30, 250, 320);

    // Texto na tela LCD
    ctx.fillStyle = '#1b4332';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('JUSTIÇA ELEITORAL', 40, 65);
    ctx.font = '14px monospace';
    ctx.fillText('SEU VOTO PARA:', 40, 105);
    ctx.font = 'bold 20px monospace';
    ctx.fillText('PRESIDENTE', 40, 135);
    ctx.fillText('NÚMERO: [   ]', 40, 175);
    ctx.font = '12px monospace';
    ctx.fillText('CONFIRMA PARA GRAVAR', 40, 270);
    ctx.fillText('FIM - DEBATE 2026', 40, 310);

    // Teclado numérico à direita
    ctx.fillStyle = '#1f242d';
    ctx.fillRect(300, 30, 185, 230);

    // Teclas 1 a 9 e 0
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    const keys = ['1','2','3','4','5','6','7','8','9','0'];
    keys.forEach((k, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = 320 + col * 50;
      const y = 50 + row * 45;
      ctx.fillStyle = '#343a40';
      ctx.fillRect(x, y, 40, 35);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(k, x + 14, y + 24);
    });

    // Teclas BRANCO, CORRIGE, CONFIRMA
    // BRANCO
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(305, 280, 52, 45);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('BRANCO', 310, 305);

    // CORRIGE
    ctx.fillStyle = '#d90429';
    ctx.fillRect(365, 280, 54, 45);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('CORRIGE', 368, 305);

    // CONFIRMA (Maior e verde)
    ctx.fillStyle = '#2b9348';
    ctx.fillRect(427, 265, 62, 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('CONFIRMA', 430, 300);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Textura de Picanha Grelhada Suculenta (Projétil Especial do Lula)
   */
  static createPicanhaTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Fundo transparente
    ctx.clearRect(0, 0, 256, 256);

    // Carne suculenta avermelhada/dourada
    ctx.fillStyle = '#8d1b1b';
    ctx.beginPath();
    ctx.ellipse(128, 128, 110, 75, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Capa de gordura dourada crocante no topo
    ctx.fillStyle = '#f6d365';
    ctx.strokeStyle = '#fda085';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(128, 70, 105, 25, -0.1, Math.PI, 0, false);
    ctx.fill();
    ctx.stroke();

    // Marcas de grelha tostadas (linhas diagonais pretas esfumaçadas)
    ctx.strokeStyle = '#3e1010';
    ctx.lineWidth = 8;
    for (let x = 40; x < 230; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 70);
      ctx.lineTo(x + 50, 180);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Textura de Caixa de Bombom dourada (Projétil Especial do Flávio)
   */
  static createBombomTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Caixa de bombom dourada brilhante
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#ffe066');
    grad.addColorStop(0.5, '#f59f00');
    grad.addColorStop(1, '#d9480f');
    ctx.fillStyle = grad;
    ctx.fillRect(20, 40, 216, 176);

    // Laço de fita verde e amarelo
    ctx.fillStyle = '#2b8a3e';
    ctx.fillRect(116, 40, 24, 176);
    ctx.fillStyle = '#ffd43b';
    ctx.fillRect(20, 116, 216, 24);

    // Texto "CHOCOLATES DO PLANALTO"
    ctx.fillStyle = '#343a40';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('CHOCOLATE', 75, 105);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('PATRIOTA', 85, 160);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Auxiliar: desenha estrela de N pontas
   */
  static drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, fillCol, strokeCol) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = fillCol;
    ctx.fill();
    if (strokeCol) {
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}
