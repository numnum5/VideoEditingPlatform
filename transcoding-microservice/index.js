const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const ffmpeg = require('fluent-ffmpeg'); 
const fs = require('fs');
const mime = require('mime-types');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const path = require('path');
require('dotenv').config();

const snsClient = new SNSClient({ region: "ap-southeast-2" });
const s3Client = new S3Client({ region: "ap-southeast-2" }); 
const sqsClient = new SQSClient({ region: "ap-southeast-2" });
const bucketName = "n11736062-test";
const QUEUE_URL = "https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11736062-transcoding-at3";
const SNS_TOPIC = "arn:aws:sns:ap-southeast-2:901444280953:n11736062-transocoding-progress.fifo";
const tempDir = path.join(__dirname, "./temp");


// Function for publish progress update
/*
When this program is used on ec2 instances as part of auto scaling group
which utilises IAM profile, the publish SNS action is blocked; however, this functionality
works 100% fine with using credentials from aws login
*/
async function publishProgressUpdate(socketId, progress) {
    const command = new PublishCommand({
        TopicArn: SNS_TOPIC,
        Message: JSON.stringify(progress), // Send the provided JSON object as the message
        MessageGroupId: socketId, // Group messages by the socket ID (or another relevant identifier)
        MessageDeduplicationId: `${socketId}-${Date.now()}` // Create a unique deduplication ID
    });
    try {
        await snsClient.send(command);
        console.log("Progress update published successfully:", progress);
    } catch (error) {
        console.error("Error publishing progress update:", error);
    }
}


// Function for generating presigned url
const generateDownloadURL = async (key) => { 
  const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
  });
  try{
      const presignedUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 3600, // URL expires in 1 hour
        });

        console.log(presignedUrl);
      return presignedUrl;
  }catch(error){
      throw error;
  }
};

// Function to receive SQS message,
async function receiveMessage() {
  try {
    const command = new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 1, // Retrieve up to 1 messages at a time
      WaitTimeSeconds: 10, // Long polling for up to 10 seconds
      VisibilityTimeout: 30, 
    });
    // Send the comment and wait for response
    const data = await sqsClient.send(command);
    
    return data.Messages || []; 
    // Return messages or an empty array
  } catch (error) {
    // If error occurs
    console.error('Error receiving message:', error);
    return []; // Return empty array on error
  }
}

// Function for downloading video from S3 bucket
async function downloadVideoBucket(key, downloadPath) {
  try {
      const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: `videos/${key}`, 
      });
      const data = await s3Client.send(command);
      const writeStream = fs.createWriteStream(downloadPath);
      // Pipe the S3 stream into the file write stream
      await new Promise((resolve, reject) => {
          data.Body.pipe(writeStream)
            .on('finish', resolve)
            .on('error', reject);
      });
      console.log("Download completed successfully!");
  } catch (error) {
      console.error("Error downloading video:", error);
  }
}

// Function for deleting message in SQS 
async function deleteMessage(receiptHandle) {
  try {
    const command = new DeleteMessageCommand({
      QueueUrl: QUEUE_URL,
      ReceiptHandle: receiptHandle,
    });
    await sqsClient.send(command);
    console.log('Message deleted');
  } catch (error) {
    console.error('Error deleting message:', error);
  }
}

// Funcction for processing a video given task specfication
async function processVideo(taskSpec) {

  // const socket = io(process.env.PROGRESS_SERVICE_URL); 
  const { inputKey, outputKey, codec, videoFilters, id, socketId } = taskSpec;
  const inputPath = path.join(tempDir, inputKey);
  const outputPath = path.join(tempDir, outputKey);
  try {
    await downloadVideoBucket(inputKey, inputPath);

    // Apply any video filters
    let ffmpegCommand = ffmpeg(inputPath).output(outputPath);
    if (codec != '') {
      ffmpegCommand.videoCodec(codec);
    }
    if (videoFilters && videoFilters.length) {
      ffmpegCommand.outputOptions(['-vf', videoFilters.join(',')]);
    }
    // Start FFmpeg process
    await new Promise((resolve, reject) => {
      ffmpegCommand
        .on('start', () => {
          console.log('FFmpeg process started');
        })
        .on('progress', (progress) => {
          publishProgressUpdate(socketId, { socketId : socketId, percent: progress.percent, status : "Pending" })
        })
        .on('end', async () => {
          try {
            // Get video file type
            const contentType = mime.lookup(outputPath) || 'application/octet-stream';
            const fileStream = fs.createReadStream(outputPath);

            // Store video on S3
            await s3Client.send(new PutObjectCommand({
              Bucket: process.env.BUCKETNAME,
              Key: outputKey,
              Body: fileStream,
              ContentType: contentType,
            }));

            // Generate presigned url
            const presignedUrl = await generateDownloadURL(`${outputKey}`);
            // Publish completed message along with presigned url
            publishProgressUpdate(socketId, { socketId : socketId, percent: 100, presignedUrl : presignedUrl, status : "Finished", key : outputKey})
            // Cleanup local files
            await fs.promises.unlink(outputPath);
            await fs.promises.unlink(inputPath);
            resolve(); // Resolve the promise on successful completion
          } catch (error) {
            console.error('Error during S3 upload or file cleanup:', error);
            reject(error); // Reject the promise if an error occurs
          }
        })
        .on('error', (error) => {
          console.error('FFmpeg error:', error);
          reject(error); // Reject the promise if an FFmpeg error occurs
        })
        .run();
    });
  } catch (error) {
    // Delete any temp files if error occurs
    console.error('Error processing video:', error);
    await fs.promises.unlink(outputPath);
    await fs.promises.unlink(inputPath);
  }
}

// Function for polling SQS continously
async function pollSQSQueue() {
  while (true) {
    try {
      const messages = await receiveMessage();
      for (const message of messages) {
        const taskSpec = JSON.parse(message.Body); 
          await processVideo(taskSpec); // Process the video
          await deleteMessage(message.ReceiptHandle); // Delete the message only if processing is successful
          console.log("Message processed and deleted successfully.");
      }
    } catch (queueError) {
      console.error("Error receiving messages:", queueError);
    }

    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait one second before polling again
  }
}
// Start polling queue for messages
pollSQSQueue();



