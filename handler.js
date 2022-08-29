const archiver = require('archiver');
const AWS = require('aws-sdk');
const async = require('async');
const request = require('request');
const s3 = new AWS.S3();

const bucketName = 'zipfiles123456';

const formatResponse = (url) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      url,
    }),
  };
};

const uploadToS3 = async (buffer, keyName) => {
  const params = {
    Bucket: bucketName,
    Key: keyName,
    Body: buffer,
    ACL: 'public-read',
  };
  const res = await s3.upload(params).promise();
  console.log(res);
  return res.Location;
};

const getExtension = (url) => {
  const split = url.split('.'); // split the url into an array
  return `.${split[split.length - 1].replace('\\', '')}`;
};

/*
* 
*/
exports.handler = async (event) => {
  const body = JSON.parse(event.body).attachments;
  const keyName = `zip-${Date.now()}.zip`;
  console.log("keyName", keyName);
  return (promise = new Promise((resolve, reject) => {
    let zipArchive = archiver('zip');
    async.each(
      body,
      (elem, callback) => {
        const options = {
          url: elem.url,
          method: 'get',
          encoding: null,
        };
        const extension = getExtension(elem.url);
        request(options, (error, _response, body) => {
          if (error) callback(error);
          else {
            zipArchive.append(body, { name: elem.name + extension });
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
      const url = await uploadToS3(data, keyName);
      resolve(formatResponse(url));
    });
  }));
};
