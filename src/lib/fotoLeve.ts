// src/lib/fotoLeve.ts
// AIMÊ — Reduz a foto da câmera SEM carregá-la inteira na memória.
//
// PROBLEMA (08/10/2026, vistoria do serviço 39): em aparelhos com pouca memória, a aba caía logo depois de tirar a foto
// em cerca de metade das vezes. A tela decodificava a foto em RESOLUÇÃO TOTAL (uma câmera de 12 a 50 megapixels vira
// 50 a 200 MB de bitmap) apenas para desenhá-la em 900 x 675. Esse pico de memória derruba a aba.
//
// SOLUÇÃO: createImageBitmap(arquivo, { resizeWidth }) faz o navegador decodificar JÁ REDUZIDA, e o bitmap é liberado
// (close) assim que desenhado. Usa imageOrientation "from-image" para respeitar a rotação do celular; se o navegador não
// aceitar essa opção (ou não tiver createImageBitmap), usa o método antigo, que mantém a orientação correta.

export const FOTO_MAX_W = 900
export const FOTO_MAX_H = 675
export const FOTO_QUALIDADE = 0.65

function desenhar(origem: CanvasImageSource, largura: number, altura: number, maxW: number, maxH: number, qualidade: number): string {
  const escala = Math.min(1, maxW / largura, maxH / altura)
  const w = Math.max(1, Math.round(largura * escala)), h = Math.max(1, Math.round(altura * escala))
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas indisponível')
  ctx.drawImage(origem, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', qualidade)
}

/** Método antigo: carrega a imagem inteira e a reduz. Mantém a orientação EXIF. */
function reduzirPeloMetodoAntigo(file: Blob, maxW: number, maxH: number, qualidade: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      try { resolve(desenhar(img, img.width, img.height, maxW, maxH, qualidade)) }
      catch (e) { reject(e) }
      finally { URL.revokeObjectURL(url) }
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem inválida')) }
    img.src = url
  })
}

export async function reduzirFoto(file: Blob, maxW = FOTO_MAX_W, maxH = FOTO_MAX_H, qualidade = FOTO_QUALIDADE): Promise<string> {
  if (typeof createImageBitmap === 'function') {
    let bitmap: ImageBitmap | null = null
    try {
      bitmap = await createImageBitmap(file, { resizeWidth: maxW, resizeQuality: 'medium', imageOrientation: 'from-image' } as ImageBitmapOptions)
    } catch { bitmap = null }   // opção não aceita neste navegador: cai no método antigo, que respeita a orientação
    if (bitmap) {
      try { return desenhar(bitmap, bitmap.width, bitmap.height, maxW, maxH, qualidade) }
      finally { try { bitmap.close() } catch { /* */ } }   // libera a memória do bitmap na hora
    }
  }
  return reduzirPeloMetodoAntigo(file, maxW, maxH, qualidade)
}
