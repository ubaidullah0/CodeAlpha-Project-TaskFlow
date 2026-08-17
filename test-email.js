const nodemailer = require('nodemailer');

async function testEmail() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'obaidkhan13542@gmail.com',
      pass: 'befm wcwn bwqz lmsk'.replace(/\s/g, ''), // removing spaces just in case
    },
  });

  try {
    const info = await transporter.sendMail({
      from: '"Test" <obaidkhan13542@gmail.com>',
      to: 'obaidkhan13542@gmail.com',
      subject: 'Test Email',
      text: 'This is a test email.',
    });
    console.log('Success:', info.messageId);
  } catch (error) {
    console.error('Error:', error);
  }
}

testEmail();
