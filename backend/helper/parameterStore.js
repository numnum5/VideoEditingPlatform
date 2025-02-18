const SSM = require("@aws-sdk/client-ssm");
const client = new SSM.SSMClient({ region: "ap-southeast-2" });

// Function for getting parameter given the parameter name
async function getParameter(parameter_name) {
   try {
      const response = await client.send(
         new SSM.GetParameterCommand({
            Name: parameter_name
         })
      );
      return response.Parameter.Value;
   } catch (error) {
      throw error;
   }
}


module.exports = getParameter;