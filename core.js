const archiver = require('archiver');
const AWS = require('aws-sdk');
const async = require('async');
const request = require('request');
const s3 = new AWS.S3();
const fetch = require('node-fetch');

const bucketName = 'zipfiles123456';
const fromEmail = '';

const uploadToS3 = async (buffer, keyName) => {
  const params = {
    Bucket: bucketName,
    Key: keyName,
    Body: buffer,
    ACL: 'public-read',
  };
  const res = await s3.upload(params).promise();
  return res.Location;
};

const sendEmail = async (files, emails) => {
  const to = emails.map((e) => {
    return { email: e };
  });
  const payload = {
    subject: 'Nuevo archivo comprimido',
    from: fromEmail,
    to,
    files,
    bodyHtml: '<h1>Zip file</h1>',
  };
  const rawResponse = await fetch(
    'service',
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  const content = await rawResponse.json();
  return content;
};

const uploadZipAndSendEmail = async (bufferData, emails) => {
  const keyName = `zip-${Date.now()}.zip`;
  const url = await uploadToS3(bufferData, keyName);
  console.log('Finish upload to s3');
  const response = await sendEmail([url], emails);
  console.log(response);
  console.log('Finish send email');
  return url;
};

const zipFileAndTriggerEmail = async (attachments, emails) => {
  console.log('Start zip file');
  return new Promise((resolve, reject) => {
    let zipArchive = archiver('zip');
    async.each(
      attachments,
      (elem, callback) => {
        const options = {
          url: elem.url,
          method: 'get',
          encoding: null,
        };
        request(options, (error, _response, body) => {
          if (error) callback(error);
          else {
            zipArchive.append(body, { name: elem.name });
            callback();
          }
        });
      },
      (err) => {
        if (err) {
          console.log(err.message, err);
          throw new Error('e');
        } else {
          zipArchive.finalize();
        }
      },
    );

    let buffer = [];

    zipArchive.on('data', (data) => buffer.push(data));

    zipArchive.on('end', async () => {
      let data = Buffer.concat(buffer);
      console.log('Finish zip');
      const url = await uploadZipAndSendEmail(data, emails);
      resolve(url);
    });
  });
};

exports.handler = async (event) => {
  const attachments = event.attachments;
  const emails = event.emails;

  console.log('Attachments: ', attachments.length);
  console.log('Emails: ', emails.length);

  const url = await zipFileAndTriggerEmail(attachments, emails);
  console.log(url);
  return;
};
