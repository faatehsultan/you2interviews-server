const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const https = require("https");

const AWS = require("aws-sdk");

// Configure AWS SDK with your environment variables
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

const downloadFile = (url, downloadPath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(downloadPath);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", (err) => {
        fs.unlink(downloadPath);
        reject(err);
      });
  });
};

const uploadToS3 = async (bucket, key, filePath) => {
  const fileContent = fs.readFileSync(filePath);
  const params = {
    Bucket: bucket,
    Key: key,
    Body: fileContent,
    ContentType: "audio/mpeg",
  };
  return s3.upload(params).promise();
};

const convertTsToMp3 = (tsFiles, outputFilePath) => {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();
    tsFiles.forEach((file) => command.input(file));
    command
      .outputOptions("-c copy")
      .save(outputFilePath)
      .on("end", () => resolve(outputFilePath))
      .on("error", reject);
  });
};

const convertM3U8ToMp3 = (m3u8FilePath, outputFilePath) => {
  return new Promise((resolve, reject) => {
    if (!path.isAbsolute(m3u8FilePath) || !path.isAbsolute(outputFilePath)) {
      return reject(new Error("Paths must be absolute"));
    }

    ffmpeg(m3u8FilePath)
      .outputOptions([
        "-c:a libmp3lame", // Use MP3 codec
        "-b:a 192k", // Bitrate
        "-q:a 2", // Quality
      ])
      .on("end", () => {
        console.log("Conversion finished");
        resolve(outputFilePath);
      })
      .on("error", (err) => {
        console.error("Error during conversion:", err);
        reject(err);
      })
      .save(outputFilePath);
  });
};

const processRecordingConversion = async (channelFileUrls, channelName) => {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  const outputMp3 = "/tmp/" + channelName + ".mp3";
  const localTsFiles = [];

  try {
    // Download .ts files from URLs
    for (const tsUrl of channelFileUrls) {
      const localPath = path.join("/tmp", path.basename(tsUrl));
      await downloadFile(tsUrl, localPath);
      localTsFiles.push(localPath);
    }

    // Convert .m3u8 to .mp3
    await convertM3U8ToMp3(
      localTsFiles.find((tsFile) => tsFile.endsWith(".m3u8")),
      outputMp3
    );

    // Upload the .mp3 file to S3
    await uploadToS3(bucketName, channelName + ".mp3", outputMp3);

    console.log("MP3 file uploaded successfully!");
  } catch (error) {
    console.error("An error occurred:", error);
    return false;
  } finally {
    // Clean up temporary files
    localTsFiles.forEach((file) => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });

    if (fs.existsSync(outputMp3)) {
      fs.unlinkSync(outputMp3);
    }
    console.log("Temporary files cleaned up successfully!");

    return true;
  }
};

module.exports = {
  processRecordingConversion,
};
