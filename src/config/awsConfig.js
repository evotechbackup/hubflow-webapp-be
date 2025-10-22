const router = require('express').Router();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');

const bucketname = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const accessKey = process.env.ACCESS_KEY;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;

const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey,
  },
  region: bucketRegion,
});

//image upload
const storage = multer.memoryStorage();

const upload = multer({ storage });

router.post('/images', upload.single('image'), async (req, res) => {
  try {
    const params = {
      Bucket: bucketname,
      Key: req.body.name,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const command = new PutObjectCommand(params);

    await s3.send(command);

    res.send('uploaded');
  } catch (error) {
    console.error(error);
    res.send({});
  }
});

router.post('/multi-images', upload.array('image'), async (req, res) => {
  try {
    const { timestamp } = req.body;
    const uploadResults = await Promise.all(
      req.files.map(async (file) => {
        const key = `${timestamp}_${file.originalname}`;
        const params = {
          Bucket: bucketname,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        };

        const command = new PutObjectCommand(params);
        await s3.send(command);
      })
    );

    res.send(uploadResults);
  } catch (error) {
    console.error(error);
    res.send({});
  }
});

module.exports = router;
