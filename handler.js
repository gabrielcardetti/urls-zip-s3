const AWS = require('aws-sdk');
var lambda = new AWS.Lambda();

const formatResponse = () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Success' }),
  };
};

const formatErrorResponse = (error, statusCode = 500) => {
  return {
    statusCode,
    body: JSON.stringify({
      error,
    }),
  };
};

const isValidEmail = (email) => {
  const re =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

const isValidEmailList = (emails) => {
  let valid = true;
  for (const email of emails) {
    if (!isValidEmail(email)) {
      valid = false;
      break;
    }
  }
  return valid;
};

exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const attachments = body.attachments;
  const emails = body.emails;

  const isValid = isValidEmailList(emails);
  if (!isValid) {
    return formatErrorResponse('Invalid emails', 400);
  }

  console.log('Start to zip');

  // invoke lambda function to zip file and send email to recipients
  const params = {
    FunctionName: 'lambda-zip-file-and-send-email',
    InvocationType: 'Event',
    Payload: JSON.stringify({
      attachments,
      emails,
    }),
  };

  const lambdaResponse = await lambda.invoke(params).promise();
  console.log('lambda response', lambdaResponse);
  return formatResponse();
};
