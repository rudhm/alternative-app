import multer from 'multer';
import fs from 'fs';
import path from 'path';
// Dynamic import used for file-type

export const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();
export const uploadMiddleware = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

export const processMedia = async (file: Express.Multer.File): Promise<{ url: string, type: string }> => {
  const { fromBuffer } = await import('file-type');
  const typeInfo = await fromBuffer(file.buffer);
  if (!typeInfo) throw new Error('Unsupported file type');
  
  const ext = `.${typeInfo.ext}`.toLowerCase();
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const videoExts = ['.mp4', '.mov', '.webm', '.mkv'];
  const audioExts = ['.mp3', '.ogg', '.wav', '.m4a'];
  
  let type = 'archive';
  if (imageExts.includes(ext)) type = 'image';
  else if (videoExts.includes(ext)) type = 'video';
  else if (audioExts.includes(ext)) type = 'audio';
  else if (ext === '.pdf') type = 'pdf';
  else throw new Error('File type not allowed');

  const outFilename = `${filename}${ext}`;
  const outPath = path.join(uploadDir, outFilename);

  try {
    fs.writeFileSync(outPath, file.buffer);
    return { url: `/uploads/${outFilename}`, type };
  } catch (err) {
    if (fs.existsSync(outPath)) {
      fs.unlinkSync(outPath);
    }
    throw err;
  }
};
