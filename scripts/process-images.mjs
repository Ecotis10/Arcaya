import sharp from 'sharp';

const SRC = 'C:/Users/User/Downloads/';
const OUT = './public/img/';

// crop = fracción a recortar por abajo (para borrar la marca de agua de Gemini,
// que está en la esquina inferior derecha)
const jobs = [
  { in: 'Dulce.png',                  out: 'dulce.webp',      w: 1200, crop: 0 },
  { in: 'Salon.jpeg',                 out: 'amb-salon.webp',  w: 1000, crop: 0.07 },
  { in: 'Noche chat gpt (Mejor).png', out: 'amb-noche.webp',  w: 1000, crop: 0 },
  { in: 'Mesa.png',                   out: 'amb-mesa.webp',   w: 1000, crop: 0 },
  { in: 'Cocina.jpeg',                out: 'amb-cocina.webp', w: 1000, crop: 0.07 },
  { in: 'Barro.jpeg',                 out: 'amb-barro.webp',  w: 1000, crop: 0.07 },
];

for (const j of jobs) {
  const meta = await sharp(SRC + j.in).metadata();
  let img = sharp(SRC + j.in);
  if (j.crop > 0) {
    const h = Math.round(meta.height * (1 - j.crop));
    img = img.extract({ left: 0, top: 0, width: meta.width, height: h });
  }
  const info = await img
    .resize({ width: j.w, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(OUT + j.out);
  console.log(`${j.out.padEnd(16)} ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB`);
}
