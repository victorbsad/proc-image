  import { Component, signal } from '@angular/core';
  import { RouterOutlet } from '@angular/router';
  import { CommonModule } from '@angular/common';
  import { FormsModule } from '@angular/forms';

  @Component({
    selector: 'app-root',
    imports: [RouterOutlet, CommonModule, FormsModule],
    templateUrl: './app.html',
    styleUrl: './app.css'
  })
  export class App {
    protected readonly title = signal('procImg');

    // Controle de abas
    abaAtiva: 'principal' | 'operacoes' = 'principal';
    mudarAba(aba: 'principal' | 'operacoes') {
      this.abaAtiva = aba;
    }

    // Matriz para armazenar os pixels da imagem
    public imageMatrix: number[][][] = [];
    public destinoDataUrl = '';
    public resultadoOperacaoUrl = '';
    public constanteBrilho = 0;

    constructor() {}

    loadImage(event?: Event) {
      let input: HTMLInputElement;
      if (event && event.target instanceof HTMLInputElement) {
        input = event.target;
      } else {
        input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => this.loadImage(e);
        input.click();
        return;
      }

      if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            const img = new window.Image();
            img.onload = () => {
              // Cria um canvas temporário para extrair os pixels
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                const data = imageData.data;
                // Monta a matriz [altura][largura][RGBA]
                const matrix: number[][][] = [];
                // Também cria uma cópia para tons de cinza
                const grayData = new Uint8ClampedArray(data);
                for (let y = 0; y < img.height; y++) {
                  const row: number[][] = [];
                  for (let x = 0; x < img.width; x++) {
                    const idx = (y * img.width + x) * 4;
                    row.push([
                      data[idx],     // R
                      data[idx + 1], // G
                      data[idx + 2], // B
                      data[idx + 3]  // A
                    ]);
                    // Conversão para tons de cinza
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const avg = Math.round((r + g + b) / 3);
                    grayData[idx] = grayData[idx + 1] = grayData[idx + 2] = avg;
                    // Mantém alpha
                  }
                  matrix.push(row);
                }
                this.imageMatrix = matrix;
                // Exibe a imagem original
                const previewImg = document.getElementById('preview-img') as HTMLImageElement;
                if (previewImg) {
                  previewImg.src = result;
                }
                // Exibe a imagem destino (tons de cinza)
                const grayCanvas = document.createElement('canvas');
                grayCanvas.width = img.width;
                grayCanvas.height = img.height;
                const grayCtx = grayCanvas.getContext('2d');
                if (grayCtx) {
                  const grayImageData = new ImageData(grayData, img.width, img.height);
                  grayCtx.putImageData(grayImageData, 0, 0);
                  const grayUrl = grayCanvas.toDataURL();
                  this.destinoDataUrl = grayUrl;
                  const destinoImg = document.getElementById('imagem-destino') as HTMLImageElement;
                  if (destinoImg) {
                    destinoImg.src = grayUrl;
                  }
                }
              }
            };
            img.src = result;
          }
        };
        reader.readAsDataURL(file);
      }
    }

    downloadDestino(): void {
      if (!this.destinoDataUrl) return;
      const a = document.createElement('a');
      a.href = this.destinoDataUrl;
      a.download = 'imagem-destino.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    somarImagens() {
      // Exemplo: soma pixel a pixel das duas imagens (original e destino)
      // Aqui, para simplificação, soma a matriz imageMatrix e a imagem destino (tons de cinza)
      // O resultado é exibido em imagem-operacao
      // Se não houver imagens, não faz nada
      const img1 = this.imageMatrix;
      const destinoImg = document.getElementById('imagem-destino') as HTMLImageElement;
      if (!img1.length || !destinoImg?.src) return;

      const img = new window.Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        // Soma pixel a pixel (clamp em 255)
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            // Soma canal a canal, clampando em 255
            data[idx] = Math.min(255, data[idx] + (img1[y]?.[x]?.[0] ?? 0));
            data[idx + 1] = Math.min(255, data[idx + 1] + (img1[y]?.[x]?.[1] ?? 0));
            data[idx + 2] = Math.min(255, data[idx + 2] + (img1[y]?.[x]?.[2] ?? 0));
          }
        }
        ctx.putImageData(imageData, 0, 0);
        this.resultadoOperacaoUrl = canvas.toDataURL();
        const opImg = document.getElementById('imagem-operacao') as HTMLImageElement;
        if (opImg) opImg.src = this.resultadoOperacaoUrl;
      };
      img.src = destinoImg.src;
    }

    somarConstante() {
      // Soma constante a cada pixel da imagem original (brilho)
      const img1 = this.imageMatrix;
      if (!img1.length) return;
      const h = img1.length;
      const w = img1[0].length;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const imageData = ctx.createImageData(w, h);
      const data = imageData.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          data[idx] = Math.min(255, img1[y][x][0] + this.constanteBrilho);
          data[idx + 1] = Math.min(255, img1[y][x][1] + this.constanteBrilho);
          data[idx + 2] = Math.min(255, img1[y][x][2] + this.constanteBrilho);
          data[idx + 3] = img1[y][x][3];
        }
      }
      ctx.putImageData(imageData, 0, 0);
      this.resultadoOperacaoUrl = canvas.toDataURL();
      const opImg = document.getElementById('imagem-operacao') as HTMLImageElement;
      if (opImg) opImg.src = this.resultadoOperacaoUrl;
    }

    downloadOperacao() {
      if (!this.resultadoOperacaoUrl) return;
      const a = document.createElement('a');
      a.href = this.resultadoOperacaoUrl;
      a.download = 'resultado-operacao.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
