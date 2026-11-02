const cache = new Map<string, string>()

/**
 * Wii part sprites store shape in color keys: blue irises, green and red
 * mouth masks, and black line art. Those keys are redrawn as white so the
 * dark category chips show the shape instead of the raw key colors.
 */
export function maskedSprite(src: string) {
  const cached = cache.get(src)
  if (cached) return Promise.resolve(cached)
  return new Promise<string>((resolve) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = image.naturalWidth || image.width
      canvas.height = image.naturalHeight || image.height
      const context = canvas.getContext("2d")
      if (!context || canvas.width === 0) {
        cache.set(src, src)
        resolve(src)
        return
      }
      context.drawImage(image, 0, 0)
      const frame = context.getImageData(0, 0, canvas.width, canvas.height)
      const pixels = frame.data
      for (let index = 0; index < pixels.length; index += 4) {
        const red = pixels[index]
        const green = pixels[index + 1]
        const blue = pixels[index + 2]
        const alpha = pixels[index + 3]
        if (alpha < 8) continue
        const keyed =
          isKey(red, green, blue, 0, 0, 255) ||
          isKey(red, green, blue, 0, 255, 0) ||
          isKey(red, green, blue, 255, 0, 0) ||
          (red < 28 && green < 28 && blue < 28)
        if (!keyed) continue
        pixels[index] = 255
        pixels[index + 1] = 255
        pixels[index + 2] = 255
      }
      context.putImageData(frame, 0, 0)
      const url = canvas.toDataURL("image/png")
      cache.set(src, url)
      resolve(url)
    }
    image.onerror = () => {
      cache.set(src, src)
      resolve(src)
    }
    image.src = src
  })
}

function isKey(
  red: number,
  green: number,
  blue: number,
  targetRed: number,
  targetGreen: number,
  targetBlue: number,
) {
  return (
    Math.abs(red - targetRed) < 24 &&
    Math.abs(green - targetGreen) < 24 &&
    Math.abs(blue - targetBlue) < 24
  )
}
