/**
 *
 * This call sends a message based on a template.
 *
 */
const mailjet = require('node-mailjet').connect(
  "2a18fc2e43b3c7899fe7c20894466479",
  "9661d383aeca370a9d59e2e79e838a0a"
)
const request = mailjet.post('send', { version: 'v3.1' }).request({
  Messages: [
    {
      From: {
        Email: 'officemahadipm@gmail.com',
        Name: 'Mailjet Pilot',
      },
      To: [
        {
          Email: 'mahadihasanpm@gmail.com',
          Name: 'passenger 1',
        },
      ],
      TemplateID: 1,
      TemplateLanguage: true,
      Subject: 'Your email flight plan!',
    },
  ],
})
request
  .then(result => {
    console.log(result.body)
  })
  .catch(err => {
    console.log(err.statusCode)
  })