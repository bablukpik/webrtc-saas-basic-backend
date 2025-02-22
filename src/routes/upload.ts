import { Router } from 'express';
import multer from 'multer';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';

config();

const router = Router();
const s3 = new S3();

const storage = multer.memoryStorage();
const upload = multer({ storage });

interface MulterRequest extends Request {
  file: Express.Multer.File;
}

router.post('/', upload.single('file'), async (req, res) => {
  const file = (req as unknown as MulterRequest).file;
  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  const fileName = `${uuidv4()}.webm`;
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    const data = await s3.upload(params).promise();
    res.json({ fileUrl: data.Location });
  } catch (error) {
    res.status(500).send('Error uploading file.');
  }
});

export { router as uploadRouter };
