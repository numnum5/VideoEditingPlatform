const SecretsManager = require("@aws-sdk/client-secrets-manager");
const client = new SecretsManager.SecretsManagerClient({ region: "ap-southeast-2" });
// Retrieve secret from secretes manager
async function getSecret(secret_name){
    try {
        const response = await client.send(
            new SecretsManager.GetSecretValueCommand({
                SecretId: secret_name
            })
        );
        const secret = response.SecretString;
        return secret;
    } catch (error) {
        throw error;
    }
}
module.exports = getSecret;