const express = require('express');
const http = require('http');
const cors = require('cors');
const app = express();
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const server = http.createServer(app);
const QUEUE_URL = "https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11736062-progress-report.fifo";
const sqsClient = new SQSClient({ region: process.env.REGION });

// Function to receive SQS message,
async function receiveMessage() {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 10, // Retrieve up to 10 messages at a time
        WaitTimeSeconds: 20, // Set visibility, the time the messages are hidden after being recieved
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

// Function for deleting message in SQS
async function deleteMessage(receiptHandle) {
    try {
        const command = new DeleteMessageCommand({
        QueueUrl: QUEUE_URL,
        ReceiptHandle: receiptHandle,
        });
        await sqsClient.send(command);
    } catch (error) {
        console.error('Error deleting message:', error);
    }
}

// Used for storing client IDs
const clients = {};

app.use(cors({
	origin: "*",
	methods: 'GET,POST,PUT,DELETE',
	credentials: true, // Allow cookies to be sent and received
	allowedHeaders: 'Content-Type,Authorization'
}));
// SSE Endpoint to send progress updates to clients
app.get('/progress/:id', (req, res) => {
    const id = req.params.id;
    console.log(id);

    console.log("connecting!");
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Add the response object to clients array
    clients[id] = res;

    // Remove client from clients objects on disconnect
    req.on('close', () => {
        console.log('Client disconnected');
        delete clients[id];
    });
});


// Function to send progress to specific client by ID
async function pollSQSQueue() {
    while (true) {
        try {
            const messages = await receiveMessage();
            for (const message of messages) {
                const progress = JSON.parse(message.Body);
                const parsedMessage = JSON.parse(progress.Message);
                sendProgressToClient(parsedMessage.socketId, progress.Message); // Send the data to the client
                await deleteMessage(message.ReceiptHandle); // Delete the message only if processing is successful
                console.log("Message processed and deleted successfully.");
            }
        } catch (queueError) {
            console.error("Error receiving messages:", queueError);
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before polling again
    }
}

// Function to send progress to specific client by ID
function sendProgressToClient(id, progressData) {
    const client = clients[id];
    if (client) {
        client.write(`data: ${JSON.stringify(progressData)}\n\n`);
    } else {
        console.log(`Client with ID ${id} not found`);
    }
}

// Start polling
pollSQSQueue();

server.listen("8080", () => {
    console.log('listening on *:3000');
});


